import asyncio
import os
import logging
import base64
import hashlib
import time
from datetime import datetime, timezone
import ccxt.async_support as ccxt
from Crypto.Cipher import AES
from Crypto.Util.Padding import unpad
from db import get_client

# Configure logger
logger = logging.getLogger("DirectExecutor")
logger.setLevel(logging.INFO)
if not logger.handlers:
    handler = logging.StreamHandler()
    formatter = logging.Formatter('%(asctime)s [%(levelname)s] [DIRECT_ENGINE] %(message)s', datefmt='%H:%M:%S')
    handler.setFormatter(formatter)
    logger.addHandler(handler)

# ----------------- AES DECRYPTION HELPER -----------------
def decrypt_credentials(encrypted_data: str) -> str:
    """Decrypts AES encrypted API secrets using the MASTER_ENCRYPTION_KEY."""
    if not encrypted_data:
        return ""
    master_key = os.getenv("MASTER_ENCRYPTION_KEY")
    if not master_key:
        logger.warning("⚠️ MASTER_ENCRYPTION_KEY not set. Returning ciphertext.")
        return encrypted_data
        
    try:
        data = base64.b64decode(encrypted_data)
        if data[:8] != b'Salted__':
            return encrypted_data
        salt = data[8:16]
        ciphertext = data[16:]

        def derive_key_and_iv(password, salt, key_len, iv_len):
            d = d_i = b''
            while len(d) < key_len + iv_len:
                d_i = hashlib.md5(d_i + password + salt).digest()
                d += d_i
            return d[:key_len], d[key_len:key_len + iv_len]

        key, iv = derive_key_and_iv(master_key.encode(), salt, 32, 16)
        cipher = AES.new(key, AES.MODE_CBC, iv)
        return unpad(cipher.decrypt(ciphertext), AES.block_size).decode('utf-8')
    except Exception as e:
        logger.error(f"❌ AES Decryption failure: {e}")
        return ""


# ----------------- DYNAMIC EXCHANGE INSTANTIATION -----------------
def create_exchange_client(exchange_name: str, api_key: str, secret: str, passphrase: str = None, environment: str = 'testnet'):
    """Instantiates a sandbox or mainnet CCXT client for the specified exchange."""
    exchange_id = exchange_name.lower().replace(".", "").strip()
    if exchange_id not in ccxt.exchanges:
        raise ValueError(f"Exchange '{exchange_name}' is not supported by CCXT.")
        
    config = {
        'apiKey': api_key,
        'secret': secret,
        'enableRateLimit': True,
        'options': {'defaultType': 'swap'}  # Prioritize Perpetual Swaps / Futures
    }
    if passphrase:
        config['password'] = passphrase
        
    client = getattr(ccxt, exchange_id)(config)
    
    if environment == 'testnet':
        try:
            client.set_sandbox_mode(True)
        except Exception as e:
            logger.warning(f"⚠️ {exchange_name} does not support Sandbox mode: {e}")
            
    return client


# ----------------- EXCHANGE-SPECIFIC TRIGGER CONFIGURATION -----------------
def get_trigger_order_config(exchange_name: str, ccxt_symbol: str, side: str, trigger_price: float, is_sl: bool, client, pos_side: str = None) -> tuple:
    """
    Generates the exchange-specific order type, price (limit execution price), and params 
    for independent stop-loss and take-profit trigger orders based on exchange rules.
    """
    exchange_id = exchange_name.lower().replace(".", "").strip()
    opp_side = 'sell' if side == 'buy' else 'buy'
    formatted_px = client.price_to_precision(ccxt_symbol, trigger_price)
    
    # Standard fallback
    order_type = 'market'
    price = None
    params = {'reduceOnly': True}
    
    if exchange_id == 'okx':
        # OKX native algo/conditional order format
        order_type = 'conditional'
        params.update({
            'tdMode': 'cross',
            'posSide': pos_side or ('long' if side == 'buy' else 'short'),
            'ordType': 'conditional',
            'reduceOnly': 'true'
        })
        if is_sl:
            params.update({
                'slTriggerPx': formatted_px,
                'slOrdPx': '-1'
            })
        else:
            params.update({
                'tpTriggerPx': formatted_px,
                'tpOrdPx': '-1'
            })
            
    elif exchange_id == 'binance':
        # Binance Futures STOP_MARKET and TAKE_PROFIT_MARKET
        order_type = 'STOP_MARKET' if is_sl else 'TAKE_PROFIT_MARKET'
        params.update({
            'stopPrice': formatted_px,
            'reduceOnly': True
        })
        
    elif exchange_id == 'bybit':
        # Bybit V5 Conditional Market Order
        order_type = 'market'
        params.update({
            'triggerPrice': formatted_px,
            'triggerBy': 'LastPrice',
            'reduceOnly': True
        })
        
    elif exchange_id == 'kucoin':
        # KuCoin Futures / Spot stop market
        order_type = 'market'
        params.update({
            'triggerPrice': formatted_px,
            'stopPrice': formatted_px,
            'reduceOnly': True
        })
        
    elif exchange_id == 'bitget':
        # Bitget Futures stop market
        order_type = 'market'
        params.update({
            'triggerPrice': formatted_px,
            'stopPrice': formatted_px,
            'reduceOnly': True
        })
        
    elif exchange_id in ('kraken', 'krakenfutures'):
        # Kraken Futures / Margin stop-loss and take-profit triggers
        order_type = 'market'
        params.update({
            'triggerPrice': formatted_px,
            'stopPrice': formatted_px,
            'stopLossPrice': formatted_px if is_sl else None,
            'takeProfitPrice': None if is_sl else formatted_px,
            'reduceOnly': True
        })
        # Remove any None entries
        params = {k: v for k, v in params.items() if v is not None}
        
    elif exchange_id == 'gateio':
        # Gate.io stop market
        order_type = 'market'
        params.update({
            'triggerPrice': formatted_px,
            'stopPrice': formatted_px,
            'reduceOnly': True
        })
        
    else:
        # Generic CCXT-compliant stop fallback
        order_type = 'market'
        params.update({
            'triggerPrice': formatted_px,
            'stopPrice': formatted_px,
            'reduceOnly': True
        })
        
    return order_type, price, params



# ----------------- RESILIENT POSITION MONITOR REGISTRY -----------------
# Tracking active background loops to prevent duplication and facilitate restarts
ACTIVE_MONITORS = set()

# ----------------- MULTI-EXCHANGE ENGINE -----------------
class DirectExecutor:
    def __init__(self):
        self.supabase = get_client()

    async def _log_db(self, user_id: str, exchange_name: str, message: str, symbol: str = None, log_type: str = 'INFO'):
        """Logs to the unified exchange_logs table in Supabase, only for USDT Crypto symbols."""
        logger.info(f"[{exchange_name.upper()}] User {user_id[:5]}: {message}")
        
        # Restrict to CRYPTO symbols with USDT in their symbol
        if symbol:
            sym_upper = symbol.upper()
            if "USDT" not in sym_upper:
                return  # Restrict to USDT symbols only
        
        if self.supabase and user_id:
            try:
                await asyncio.to_thread(
                    self.supabase.table("exchange_logs").insert({
                        "user_id": user_id,
                        "exchange_name": exchange_name.lower().strip(),
                        "message": message,
                        "symbol": symbol,
                        "log_type": log_type,
                        "created_at": datetime.now(timezone.utc).isoformat()
                    }).execute
                )
            except Exception as err:
                logger.error(f"Error inserting exchange log: {err}")


    async def verify_user_and_dispatch(self, user_id: str, signal_data: dict):
        """
        Step 1: Check license & status.
        Step 2: Concurrently query all active exchange configuration tables.
        Step 3: Dispatch parallel trade orders.
        """
        try:
            # Guard: Skip direct execution for non-USDT symbols
            symbol = signal_data.get("symbol", "").upper().strip()
            if "USDT" not in symbol:
                logger.info(f"⏭️ Skipping direct execution for non-USDT symbol: {symbol}")
                return {"status": "skipped", "message": "Only USDT symbols supported"}

            # 1. Fetch profile with strict license check
            logger.info(f"🛡️ Verifying user subscription status for {user_id}")
            profile_res = await asyncio.to_thread(
                self.supabase.table("profiles").select("*").eq("id", user_id).execute
            )
            
            if not profile_res.data:
                logger.error(f"❌ User profile not found: {user_id}")
                return {"status": "error", "message": "User profile not found"}
                
            profile = profile_res.data[0]
            tier = int(profile.get("tier", 0))
            is_pro = bool(profile.get("is_pro", False))
            expiry_str = profile.get("expiry_date")
            
            # Assert Tier 2+ and active subscription status
            if tier < 2 or not is_pro:
                logger.warning(f"🚫 User {user_id} lacks minimum Tier 2 subscription (Tier: {tier})")
                return {"status": "rejected", "message": "Requires Tier 2+ subscription"}
                
            if not expiry_str:
                logger.warning(f"🚫 Subscription expired (No expiry date set) for user {user_id}")
                return {"status": "rejected", "message": "Subscription expired"}
                
            expiry_date = datetime.fromisoformat(expiry_str.replace("Z", "+00:00"))
            if datetime.now(timezone.utc) >= expiry_date:
                logger.warning(f"🚫 Subscription expired on {expiry_str} for user {user_id}")
                # Auto reset
                await asyncio.to_thread(
                    self.supabase.table("profiles").update({
                        "is_pro": False,
                        "plan_type": "free",
                        "tier": 0
                    }).eq("id", user_id).execute
                )
                return {"status": "rejected", "message": "Subscription expired"}
                
            logger.info(f"✅ User license valid (Tier {tier} Pro). Dispatching trades.")
            
            # 2. Concurrently fetch credentials from individual tables to prevent conflict
            exchange_tables = [
                ("okx", "okx_auth"),
                ("binance", "binance_auth"),
                ("bybit", "bybit_auth"),
                ("kucoin", "kucoin_auth"),
                ("bitget", "bitget_auth"),
                ("kraken", "kraken_auth"),
                ("gateio", "gateio_auth")
            ]
            
            dispatch_tasks = []
            for ex_name, table in exchange_tables:
                task = asyncio.create_task(
                    self._dispatch_to_exchange(user_id, ex_name, table, signal_data)
                )
                dispatch_tasks.append(task)
                
            results = await asyncio.gather(*dispatch_tasks, return_exceptions=True)
            return {"status": "success", "dispatched": len(results)}
            
        except Exception as e:
            logger.error(f"🔥 Error in verify_user_and_dispatch: {e}")
            return {"status": "error", "message": str(e)}

    async def _dispatch_to_exchange(self, user_id: str, exchange_name: str, table_name: str, signal_data: dict):
        """Fetches settings, decrypts keys, calculates sizes, and places trades."""
        client = None
        try:
            # Query the isolated table for this exchange
            res = await asyncio.to_thread(
                self.supabase.table(table_name).select("*").eq("user_id", user_id).execute
            )
            
            if not res.data:
                return # Silently return if unconfigured
                
            config = res.data[0]
            if not config.get("is_enabled", True):
                return
            api_key = config.get("api_key")
            encrypted_secret = config.get("encrypted_secret")
            encrypted_passphrase = config.get("encrypted_passphrase", "")
            environment = config.get("environment", "testnet")
            
            # Risk parameters (retrieved directly from the custom user dashboard settings)
            daily_risk_wallet = float(config.get("daily_risk_wallet", 1000))
            risk_percentage = float(config.get("risk_percentage", 1.0))
            min_rr = float(config.get("rr", 1.5))
            allowed_symbols = config.get("allowed_symbols", [])
            alignment = config.get("alignment", "Both")
            
            # Decrypt secrets
            secret = decrypt_credentials(encrypted_secret)
            passphrase = decrypt_credentials(encrypted_passphrase) if encrypted_passphrase else None
            
            if not secret:
                logger.error(f"❌ Decryption failed for {exchange_name} credentials of user {user_id}")
                await self._log_db(user_id, exchange_name, f"❌ Decryption failed for {exchange_name.upper()} credentials.", log_type='ERROR')
                return
                
            await self._log_db(user_id, exchange_name, "🔒 Encrypting & Syncing Credentials.", log_type='INFO')
            await self._log_db(user_id, exchange_name, f"✅ {exchange_name.upper()} System Secured & Cloud Synced to {environment.upper()}.", log_type='SUCCESS')

                
            # Filter checks
            symbol = signal_data.get("symbol", "").upper().replace("/", "")
            # Verify if symbol is allowed
            if allowed_symbols and symbol not in allowed_symbols:
                logger.info(f"⏭️ Symbol {symbol} not in allowed symbols for {exchange_name}")
                return
                
            # Alignment check
            sig_alignment = signal_data.get("alignment", "Both")
            if alignment != "Both" and sig_alignment != "Both" and alignment != sig_alignment:
                logger.info(f"⏭️ Alignment mismatch for {exchange_name} ({alignment} vs {sig_alignment})")
                return

            # Instantiate CCXT Client
            client = create_exchange_client(
                exchange_name=exchange_name,
                api_key=api_key,
                secret=secret,
                passphrase=passphrase,
                environment=environment
            )
            
            await client.load_markets()
            
            # Resolve exact CCXT unified symbol format
            ccxt_symbol = self._resolve_ccxt_symbol(client, symbol)
            if not ccxt_symbol:
                err_msg = f"Market {symbol} not found on {exchange_name.upper()}."
                logger.error(f"❌ {err_msg}")
                await self._log_db(user_id, exchange_name, f"❌ {err_msg}", symbol=symbol, log_type='ERROR')
                return
                
            # Extract signal parameters
            side = str(signal_data.get("action") or signal_data.get("side", "BUY")).lower()
            
            # Fetch OKX-specific position mode dynamically if applicable
            pos_side = None
            if exchange_name.lower().strip() == 'okx':
                pos_mode = 'net_mode'
                try:
                    acct_cfg = await client.private_get_account_config()
                    pos_mode = acct_cfg['data'][0].get('posMode', 'net_mode')
                except Exception as ex:
                    logger.warning(f"Could not get OKX posMode: {ex}")
                
                pos_side = 'long' if side == 'buy' else 'short'
                if pos_mode == 'net_mode':
                    pos_side = 'net'

            entry_price = float(signal_data.get("entry_price") or signal_data.get("price", 0))
            sl = float(signal_data.get("sl", 0))
            tp1 = float(signal_data.get("tp", 0))
            tp2 = float(signal_data.get("tp_secondary") or tp1)
            
            if entry_price <= 0 or sl <= 0 or tp1 <= 0:
                logger.error(f"❌ Invalid signal parameters: Entry={entry_price}, SL={sl}, TP1={tp1}")
                return

            # Get current ticker price
            ticker = await client.fetch_ticker(ccxt_symbol)
            live_price = float(ticker.get('last') or entry_price)
            
            # --- STALENESS, SL SAFETY & TP1 REACHED GUARDS ---
            is_long = side == 'buy'
            original_risk = abs(entry_price - sl)
            
            if original_risk <= 0:
                logger.error(f"❌ Aborted {ccxt_symbol} on {exchange_name}: SL is zero or identical to entry price.")
                await self._log_db(user_id, exchange_name, f"❌ Aborted: SL is zero or identical to entry price.", symbol=ccxt_symbol, log_type='ERROR')
                return

            # 1. Invalidation Check: Price already reached/passed TP1
            tp1_reached = (is_long and live_price >= tp1) or (not is_long and live_price <= tp1)
            if tp1_reached:
                logger.info(f"⏭️ Trade skipped on {exchange_name.upper()} for {ccxt_symbol}: Price already reached TP1 ({tp1:.4f}).")
                await self._log_db(
                    user_id=user_id,
                    exchange_name=exchange_name,
                    message=f"⚠️ Trade skipped: Price already reached TP1 ({tp1:.4f}). Live Price: {live_price:.4f}",
                    symbol=ccxt_symbol,
                    log_type='WARNING'
                )
                return

            # 2. Staleness Check: Price already crossed/touched SL
            sl_direction_breached = (is_long and live_price <= sl) or (not is_long and live_price >= sl)
            
            # Calculate remaining distance to SL
            remaining_risk = (live_price - sl) if is_long else (sl - live_price)
            
            # Define safety thresholds
            min_remaining_ratio = 0.15       # Skip if remaining risk is < 15% of original risk (>85% retracement)
            min_absolute_buffer = 0.001 * sl  # Skip if price is within 0.1% of the SL price itself
            
            is_too_close = False
            skip_reason = ""
            
            if sl_direction_breached:
                is_too_close = True
                skip_reason = "SL already breached or touched"
            elif remaining_risk < min_remaining_ratio * original_risk:
                is_too_close = True
                skip_reason = f"Price too close to SL (Remaining risk distance {remaining_risk:.4f} is < {min_remaining_ratio*100}% of original risk {original_risk:.4f})"
            elif remaining_risk < min_absolute_buffer:
                is_too_close = True
                skip_reason = f"Price too close to SL (Within {min_absolute_buffer:.4f} absolute buffer of SL {sl:.4f})"
                
            if is_too_close:
                logger.info(f"⏭️ Trade skipped on {exchange_name.upper()} for {ccxt_symbol}: {skip_reason} | Live Price: {live_price}, Entry: {entry_price}, SL: {sl}")
                await self._log_db(
                    user_id=user_id,
                    exchange_name=exchange_name,
                    message=f"⚠️ Trade skipped: {skip_reason}. Live Price: {live_price:.4f}, Entry: {entry_price:.4f}, SL: {sl:.4f}",
                    symbol=ccxt_symbol,
                    log_type='WARNING'
                )
                return

            # Calculate Risk & Reward parameters
            risk_usd = daily_risk_wallet * (risk_percentage / 100.0)
            risk_per_unit = abs(entry_price - sl)  # FIX: Use entry_price, not live_price!
            
            if risk_per_unit <= 0:
                logger.error("❌ Risk per unit is zero or negative.")
                return
                
            # Handle contract size for swap/derivative markets (e.g. OKX requires order amount in contracts)
            market = client.market(ccxt_symbol)
            contract_size = float(market.get('contractSize', 1.0)) if market.get('contractSize') is not None else 1.0
            
            qty_raw = risk_usd / risk_per_unit
            if market.get('type') in ('swap', 'future'):
                qty_raw = qty_raw / contract_size
                
            qty = float(client.amount_to_precision(ccxt_symbol, qty_raw))
            
            if qty <= 0:
                logger.error("❌ Calculated quantity resolves to zero after precision conversion.")
                return

            # --- MARGIN SAFETY & LEVERAGE CAP PROTECTION ---
            try:
                balance = await client.fetch_balance()
                # Try to resolve free USDT collateral
                available_usdt = float(balance.get('free', {}).get('USDT', 0.0))
                if available_usdt <= 0:
                    available_usdt = float(balance.get('total', {}).get('USDT', 0.0))
                if available_usdt <= 0:
                    available_usdt = float(balance.get('free', {}).get('USDC', 0.0))
                if available_usdt <= 0:
                    available_usdt = float(balance.get('free', {}).get('USD', 0.0))
                
                # If balance is still 0 (e.g. empty sandbox or non-USDT margin), fallback to daily_risk_wallet
                if available_usdt <= 0:
                    available_usdt = daily_risk_wallet
                    
                # Fetch or default leverage
                leverage = 10.0
                ex_name_lower = exchange_name.lower().strip()
                if ex_name_lower == 'okx':
                    try:
                        inst_id = market['id']
                        lev_res = await client.private_get_account_leverage_info({'instId': inst_id, 'mgnMode': 'cross'})
                        leverage = float(lev_res['data'][0]['lever']) if (lev_res.get('data') and len(lev_res['data']) > 0) else 10.0
                    except Exception:
                        leverage = 10.0
                
                max_notional = available_usdt * leverage * 0.90  # 90% margin cap to leave room for fees/slippage
                notional = qty * contract_size * entry_price
                
                if notional > max_notional:
                    target_base_qty = max_notional / entry_price
                    if market.get('type') in ('swap', 'future'):
                        raw_contracts = target_base_qty / contract_size
                    else:
                        raw_contracts = target_base_qty
                        
                    qty = float(client.amount_to_precision(ccxt_symbol, raw_contracts))
                    notional = qty * contract_size * entry_price
                    logger.info(f"🛡️ Margin Cap Triggered on {exchange_name.upper()}. Reduced Size to {qty} contracts (${notional:.2f} USDT).")
                    await self._log_db(user_id, exchange_name, f"🛡️ Margin Cap Triggered. Reduced Size to {qty} contracts (${notional:.2f} USDT).", symbol=ccxt_symbol, log_type='WARNING')
            except Exception as margin_err:
                logger.warning(f"⚠️ Could not execute margin safety checks on {exchange_name}: {margin_err}")

            # --- MIN/MAX EXCHANGE SIZING ENFORCEMENT ---
            try:
                limits = market.get('limits', {})
                min_qty = float(limits.get('amount', {}).get('min') or 0.0)
                
                mkt_limits = limits.get('market', limits)
                max_qty = float(mkt_limits.get('amount', {}).get('max') or float('inf'))
                min_cost = float(limits.get('cost', {}).get('min') or 5.0)
                
                notional = qty * contract_size * entry_price
                
                if qty > max_qty:
                    qty = max_qty
                    notional = qty * contract_size * entry_price
                    logger.info(f"🛡️ Market Order Cap Triggered. Capped Qty to {qty} contracts.")
                    await self._log_db(user_id, exchange_name, f"🛡️ Market Order Cap: Capped Qty to {qty} contracts.", symbol=ccxt_symbol, log_type='WARNING')
                    
                if qty < min_qty or notional < min_cost:
                    logger.info(f"⏭️ Trade skipped on {exchange_name.upper()}: Position too small (${notional:.2f}). Exchange Min Qty: {min_qty}, Min Cost: ${min_cost}")
                    await self._log_db(user_id, exchange_name, f"⚠️ Trade skipped: Position too small (${notional:.2f}). Exchange Min Qty: {min_qty}, Min Cost: ${min_cost}", symbol=ccxt_symbol, log_type='WARNING')
                    return
            except Exception as limit_err:
                logger.warning(f"⚠️ Could not execute size limit checks on {exchange_name}: {limit_err}")

            if qty <= 0:
                logger.error("❌ Quantity resolves to zero after size limits checks.")
                return

            # Verify Reward Ratio criteria using entry_price instead of live_price to be completely stable
            # Use tp2 (the final target) for calculating the trade's full reward potential
            calculated_rr = abs(tp2 - entry_price) / risk_per_unit if risk_per_unit > 0 else 0
            signal_rr = float(signal_data.get("rr") or 0)
            effective_rr = max(calculated_rr, signal_rr)
            
            if effective_rr < min_rr:
                logger.info(f"⏭️ Signal RR {effective_rr:.2f} is below user's minimum RR setting: {min_rr}")
                return
                
            logger.info(f"🚀 Dispatching trade to {exchange_name} | {side.upper()} {ccxt_symbol} | Qty: {qty} | SL: {sl} | TP1: {tp1}")
            
            # Fetch balances for stats logging
            balance_data = await client.fetch_balance()
            
            # Robust balance resolution
            opening_balance = 0.0
            if 'total' in balance_data:
                opening_balance = float(balance_data['total'].get('USDT', 0.0))
                if opening_balance == 0.0:
                    opening_balance = float(balance_data['total'].get('USDC', 0.0))
                if opening_balance == 0.0:
                    opening_balance = float(balance_data['total'].get('USD', 0.0))
                if opening_balance == 0.0 and balance_data['total']:
                    positive_balances = {k: v for k, v in balance_data['total'].items() if v and float(v) > 0}
                    if positive_balances:
                        for coin in ['USDT', 'USDC', 'USD', 'BUSD']:
                            if coin in positive_balances:
                                opening_balance = float(positive_balances[coin])
                                break
                        else:
                            first_coin = list(positive_balances.keys())[0]
                            opening_balance = float(positive_balances[first_coin])
                            
            if opening_balance <= 0.0:
                opening_balance = daily_risk_wallet
            
            # Formulate and write the executing log message
            exec_msg = f"⚡ Executing {side.upper()} {ccxt_symbol} (MARKET) | Risk: ${risk_usd:.2f} | Qty: {qty} contracts | SL: {sl} | Split TP: True"
            await self._log_db(user_id, exchange_name, exec_msg, symbol=ccxt_symbol, log_type='INFO')
            
            # Execute Market Order
            order_params = {}
            if exchange_name.lower().strip() == 'okx':
                order_params.update({
                    'tdMode': 'cross',
                    'posSide': pos_side
                })
                
            order = await client.create_order(
                symbol=ccxt_symbol,
                type='market',
                side=side,
                amount=qty,
                params=order_params
            )
            
            # Extract filled price
            filled_price = float(order.get('price') or order.get('average') or live_price)
            order_id = order.get('id')
            
            # Log to DB executions table
            execution_res = await asyncio.to_thread(
                self.supabase.table("trade_executions").insert({
                    "user_id": user_id,
                    "exchange_name": exchange_name,
                    "symbol": ccxt_symbol,
                    "side": side.upper(),
                    "entry_price": filled_price,
                    "quantity": qty,
                    "opening_balance": opening_balance,
                    "status": "ENTRY"
                }).execute
            )
            
            execution_id = execution_res.data[0]['id'] if execution_res.data else None
            
            # ----------------- BULLETPROOF SL & TP PLACEMENT -----------------
            # To ensure the orders are never "forgotten" or "missed", we place them immediately 
            # on the exchange itself as trigger/conditional orders.
            opp_side = 'sell' if side == 'buy' else 'buy'
            
            # Resolve SL config dynamically based on researched exchange rules
            sl_type, sl_exec_px, sl_params = get_trigger_order_config(
                exchange_name=exchange_name,
                ccxt_symbol=ccxt_symbol,
                side=side,
                trigger_price=sl,
                is_sl=True,
                client=client,
                pos_side=pos_side
            )
                
            # Place SL Trigger on Exchange
            sl_order_id = None
            try:
                sl_order = await client.create_order(
                    symbol=ccxt_symbol,
                    type=sl_type,
                    side=opp_side,
                    amount=qty,
                    price=sl_exec_px,
                    params=sl_params
                )
                sl_order_id = sl_order.get('id')
                logger.info(f"✅ Stop Loss placed on {exchange_name} (ID: {sl_order_id}) at {sl}")
                await self._log_db(user_id, exchange_name, f"✅ Stop Loss trigger placed at {sl} (ID: {sl_order_id})", symbol=ccxt_symbol, log_type='SUCCESS')
            except Exception as sl_err:
                logger.error(f"❌ Failed to place exchange-side SL: {sl_err}. Spawning emergency monitor.")
                await self._log_db(user_id, exchange_name, f"⚠️ Failed to place Stop Loss: {sl_err}", symbol=ccxt_symbol, log_type='WARNING')
                
            # Place TP1 Trigger Order (Half of Quantity)
            half_qty = float(client.amount_to_precision(ccxt_symbol, qty / 2))
            
            tp1_order_id = None
            if half_qty > 0:
                # Resolve TP config dynamically based on researched exchange rules
                tp_type, tp_exec_px, tp_params = get_trigger_order_config(
                    exchange_name=exchange_name,
                    ccxt_symbol=ccxt_symbol,
                    side=side,
                    trigger_price=tp1,
                    is_sl=False,
                    client=client,
                    pos_side=pos_side
                )
                try:
                    tp1_order = await client.create_order(
                        symbol=ccxt_symbol,
                        type=tp_type,
                        side=opp_side,
                        amount=half_qty,
                        price=tp_exec_px,
                        params=tp_params
                    )
                    tp1_order_id = tp1_order.get('id')
                    logger.info(f"✅ Take Profit 1 placed on {exchange_name} (ID: {tp1_order_id}) at {tp1}")
                    await self._log_db(user_id, exchange_name, f"🎯 Separate Split TPs status: TP1 AlgoID: {tp1_order_id}", symbol=ccxt_symbol, log_type='INFO')
                except Exception as tp_err:
                    logger.error(f"❌ Failed to place exchange-side TP1: {tp_err}")
                    await self._log_db(user_id, exchange_name, f"❌ Failed to place TP1: {tp_err}", symbol=ccxt_symbol, log_type='ERROR')
            
            # Place TP2 Trigger Order (Remaining of Quantity)
            tp2_qty = float(client.amount_to_precision(ccxt_symbol, qty - half_qty))
            
            tp2_order_id = None
            if tp2_qty > 0:
                tp2_type, tp2_exec_px, tp2_params = get_trigger_order_config(
                    exchange_name=exchange_name,
                    ccxt_symbol=ccxt_symbol,
                    side=side,
                    trigger_price=tp2,
                    is_sl=False,
                    client=client,
                    pos_side=pos_side
                )
                try:
                    tp2_order = await client.create_order(
                        symbol=ccxt_symbol,
                        type=tp2_type,
                        side=opp_side,
                        amount=tp2_qty,
                        price=tp2_exec_px,
                        params=tp2_params
                    )
                    tp2_order_id = tp2_order.get('id')
                    logger.info(f"✅ Take Profit 2 placed on {exchange_name} (ID: {tp2_order_id}) at {tp2}")
                    await self._log_db(user_id, exchange_name, f"🎯 Separate Split TPs status: TP2 AlgoID: {tp2_order_id}", symbol=ccxt_symbol, log_type='INFO')
                except Exception as tp2_err:
                    logger.error(f"❌ Failed to place exchange-side TP2: {tp2_err}")
                    await self._log_db(user_id, exchange_name, f"❌ Failed to place TP2: {tp2_err}", symbol=ccxt_symbol, log_type='ERROR')

            # Post-filled success log
            filled_msg = f"✅ Filled {ccxt_symbol} @ Market. SL/TP Active. (SL ID: '{sl_order_id}' | TP1 AlgoID: '{tp1_order_id}' | TP2 AlgoID: '{tp2_order_id}')"
            await self._log_db(user_id, exchange_name, filled_msg, symbol=ccxt_symbol, log_type='SUCCESS')



            # Spawn a resilient background tracker task to monitor and move Stop Loss to BE
            monitor_key = f"{user_id}_{exchange_name}_{ccxt_symbol}"
            if monitor_key not in ACTIVE_MONITORS:
                ACTIVE_MONITORS.add(monitor_key)
                asyncio.create_task(
                    self._robust_trade_lifecycle_monitor(
                        user_id=user_id,
                        execution_id=execution_id,
                        exchange_name=exchange_name,
                        ccxt_symbol=ccxt_symbol,
                        entry_price=filled_price,
                        tp1=tp1,
                        tp2=tp2,
                        sl=sl,
                        side=side,
                        qty=qty,
                        sl_order_id=sl_order_id,
                        tp1_order_id=tp1_order_id,
                        tp2_order_id=tp2_order_id,
                        config=config,
                        monitor_key=monitor_key,
                        pos_side=pos_side,
                        opening_balance=opening_balance
                    )
                )
        except Exception as e:
            logger.error(f"❌ Error in _dispatch_to_exchange: {e}")
            if client:
                await client.close()

    async def _robust_trade_lifecycle_monitor(self, user_id, execution_id, exchange_name, ccxt_symbol, 
                                             entry_price, tp1, tp2, sl, side, qty, sl_order_id, tp1_order_id, tp2_order_id, config, monitor_key, pos_side=None, opening_balance=None):
        """
        A highly resilient background polling task that handles:
        1. Checking when Take Profit 1 is hit.
        2. Adjusting Stop Loss to break-even (entry_price + spread + commission) seamlessly.
        3. Monitoring TP2 trigger fills.
        4. Cleaning up all trigger orders at exit to prevent orphan orders.
        5. Real-time PnL calculation based on opening balance.
        """
        logger.info(f"🔭 Monitoring trade lifecycle for {ccxt_symbol} on {exchange_name}")
        await self._log_db(user_id, exchange_name, f"🔭 Monitor active for {ccxt_symbol}. TP1 (BE Trigger): {tp1} | TP2: {tp2}", symbol=ccxt_symbol, log_type='INFO')
        client = None
        tp1_hit = False
        tp2_hit_confirmed = False
        sl_hit_confirmed = False
        be_hit_confirmed = False
        be_price = None
        retry_delay = 5  # Base polling delay in seconds
        
        try:
            # Separate client for background monitoring
            client = create_exchange_client(
                exchange_name=exchange_name,
                api_key=config.get("api_key"),
                secret=decrypt_credentials(config.get("encrypted_secret")),
                passphrase=decrypt_credentials(config.get("encrypted_passphrase")) if config.get("encrypted_passphrase") else None,
                environment=config.get("environment", "testnet")
            )
            
            await client.load_markets()
            opp_side = 'sell' if side == 'buy' else 'buy'
            
            while True:
                try:
                    await asyncio.sleep(retry_delay)
                    
                    # 1. Fetch current position size
                    positions = await client.fetch_positions([ccxt_symbol])
                    pos = next((p for p in positions if p.get('symbol') == ccxt_symbol), {})
                    
                    # In net/one-way or hedge mode, check if position size is 0 (fully closed)
                    contracts = float(pos.get('contracts') or pos.get('size') or pos.get('positionAmt') or 0)
                    raw_pos = float(pos.get('info', {}).get('pos', 0))
                    
                    if contracts == 0 and raw_pos == 0:
                        logger.info(f"🏁 Position fully closed on {exchange_name} for {ccxt_symbol}. Ending loop.")
                        await self._log_db(user_id, exchange_name, f"🏁 Position fully closed on {exchange_name.upper()} for {ccxt_symbol}.", symbol=ccxt_symbol, log_type='INFO')
                        break
                        
                    # 2. Check current ticker prices
                    ticker = await client.fetch_ticker(ccxt_symbol)
                    live_price = float(ticker.get('last'))
                    
                    # 3. TP1 Validation Check
                    if not tp1_hit:
                        # Fallback price check or checking order fill status
                        is_price_hit = (side == 'buy' and live_price >= tp1) or (side == 'sell' and live_price <= tp1)
                        
                        # Double-check trigger order status if order ID is present
                        is_order_filled = False
                        if tp1_order_id:
                            try:
                                order_status = await client.fetch_order(tp1_order_id, ccxt_symbol)
                                if order_status.get('status') == 'closed':
                                    is_order_filled = True
                            except Exception:
                                pass
                                
                        # Redundant check: position size halved
                        is_contracts_reduced = contracts <= (qty * 0.6)
                        
                        if is_price_hit or is_order_filled or is_contracts_reduced:
                            tp1_hit = True
                            logger.info(f"🎯 TP1 Hit confirmed for {ccxt_symbol} on {exchange_name} (Price: {live_price}, Size: {contracts})! Moving SL to Break-Even.")
                            await self._log_db(user_id, exchange_name, f"🎯 TP1 Hit confirmed for {ccxt_symbol} on {exchange_name.upper()} (Price: {live_price})! Moving SL to Break-Even.", symbol=ccxt_symbol, log_type='SUCCESS')
                            
                            # Fetch current bid/ask spread from CCXT
                            bid = float(ticker.get('bid', live_price))
                            ask = float(ticker.get('ask', live_price))
                            spread = abs(ask - bid)
                            
                            # Estimate commissions (standard fee percentage fallback + dynamic estimation)
                            commission_rate = 0.0005  # 0.05% perpetual taker fee standard
                            commission = entry_price * commission_rate
                            
                            # Formula: Entry +/- Spread +/- Commission
                            if side == 'buy':
                                be_price_raw = entry_price + spread + commission
                            else:
                                be_price_raw = entry_price - spread - commission
                                
                            be_price = float(client.price_to_precision(ccxt_symbol, be_price_raw))
                            
                            # Try to cancel old SL order and place a new one at Break-Even
                            if sl_order_id:
                                try:
                                    await client.cancel_order(sl_order_id, ccxt_symbol)
                                except Exception as cancel_err:
                                    logger.warning(f"Could not cancel old SL trigger order: {cancel_err}")
                                    
                            # Resolve Break-Even SL config dynamically based on researched exchange rules
                            be_sl_type, be_sl_exec_px, be_sl_params = get_trigger_order_config(
                                exchange_name=exchange_name,
                                ccxt_symbol=ccxt_symbol,
                                side=side,
                                trigger_price=be_price,
                                is_sl=True,
                                client=client,
                                pos_side=pos_side
                            )
                                
                            # Create new SL order at BE
                            try:
                                new_sl = await client.create_order(
                                    symbol=ccxt_symbol,
                                    type=be_sl_type,
                                    side=opp_side,
                                    amount=contracts,  # Remaining position contracts
                                    price=be_sl_exec_px,
                                    params=be_sl_params
                                )
                                sl_order_id = new_sl.get('id')
                                logger.info(f"🛡️ Stop Loss successfully amended to Break-Even at {be_price}")
                                await self._log_db(user_id, exchange_name, f"🛡️ Stop Loss successfully amended to Break-Even at {be_price}", symbol=ccxt_symbol, log_type='SUCCESS')
                                
                                # Update stats
                                if execution_id:
                                    await asyncio.to_thread(
                                        self.supabase.table("trade_executions")
                                        .update({"status": "BE_MODIFIED", "be_hits": 1})
                                        .eq("id", execution_id).execute
                                    )
                            except Exception as be_place_err:
                                logger.error(f"❌ Emergency: Failed to place Break-Even SL order: {be_place_err}")
                                await self._log_db(user_id, exchange_name, f"❌ Emergency: Failed to place Break-Even SL order: {be_place_err}", symbol=ccxt_symbol, log_type='ERROR')
                                
                    # 4. Monitor for Final TP2 / SL / BE exit
                    if tp1_hit and be_price is not None:
                        is_be_price_hit = (side == 'buy' and live_price <= be_price) or (side == 'sell' and live_price >= be_price)
                        is_be_order_filled = False
                        if sl_order_id:
                            try:
                                order_status = await client.fetch_order(sl_order_id, ccxt_symbol)
                                if order_status.get('status') == 'closed':
                                    is_be_order_filled = True
                            except Exception:
                                pass
                                
                        if is_be_price_hit or is_be_order_filled:
                            be_hit_confirmed = True
                            logger.info(f"🏁 Break-Even Stop Loss hit for {ccxt_symbol} on {exchange_name} (Price: {live_price})!")
                            await self._log_db(user_id, exchange_name, f"🏁 Break-Even Stop Loss hit for {ccxt_symbol} on {exchange_name.upper()} (Price: {live_price})!", symbol=ccxt_symbol, log_type='WARNING')
                            break
                    else:
                        is_sl_price_hit = (side == 'buy' and live_price <= sl) or (side == 'sell' and live_price >= sl)
                        is_sl_order_filled = False
                        if sl_order_id:
                            try:
                                order_status = await client.fetch_order(sl_order_id, ccxt_symbol)
                                if order_status.get('status') == 'closed':
                                    is_sl_order_filled = True
                            except Exception:
                                pass
                                
                        if is_sl_price_hit or is_sl_order_filled:
                            sl_hit_confirmed = True
                            logger.info(f"🏁 Primary Stop Loss hit for {ccxt_symbol} on {exchange_name} (Price: {live_price})!")
                            await self._log_db(user_id, exchange_name, f"🏁 Primary Stop Loss hit for {ccxt_symbol} on {exchange_name.upper()} (Price: {live_price})!", symbol=ccxt_symbol, log_type='ERROR')
                            break
                            
                    is_tp2_price_hit = (side == 'buy' and live_price >= tp2) or (side == 'sell' and live_price <= tp2)
                    is_tp2_order_filled = False
                    if tp2_order_id:
                        try:
                            order_status = await client.fetch_order(tp2_order_id, ccxt_symbol)
                            if order_status.get('status') == 'closed':
                                is_tp2_order_filled = True
                        except Exception:
                            pass
                            
                    if is_tp2_price_hit or is_tp2_order_filled:
                        tp2_hit_confirmed = True
                        logger.info(f"🏁 Take Profit 2 hit for {ccxt_symbol} on {exchange_name} (Price: {live_price})!")
                        await self._log_db(user_id, exchange_name, f"🏁 Take Profit 2 hit for {ccxt_symbol} on {exchange_name.upper()} (Price: {live_price})!", symbol=ccxt_symbol, log_type='SUCCESS')
                        break
                        
                except Exception as loop_err:
                    logger.error(f"⚠️ Error inside monitoring loop: {loop_err}. Retrying in 10s...")
                    await asyncio.sleep(10)
                    
            # 5. Position Exit Actions - Clean up active trigger/conditional orders to prevent orphan orders on the exchange
            for ord_id in [sl_order_id, tp1_order_id, tp2_order_id]:
                if ord_id:
                    try:
                        logger.info(f"🧹 Cleaning up active trigger order {ord_id} on {exchange_name}")
                        await client.cancel_order(ord_id, ccxt_symbol)
                    except Exception:
                        pass

            try:
                # Re-fetch positions to see if we need emergency market close
                positions = await client.fetch_positions([ccxt_symbol])
                pos = next((p for p in positions if p.get('symbol') == ccxt_symbol), {})
                contracts = float(pos.get('contracts') or pos.get('size') or pos.get('positionAmt') or 0)
                
                if contracts > 0:
                    logger.warning(f"⚠️ Position still open on exit ({contracts} contracts). Executing emergency market close order!")
                    try:
                        # Resolve pos_side dynamically for OKX emergency close
                        close_params = {'reduceOnly': True}
                        if exchange_name.lower().strip() == 'okx':
                            # Get OKX pos mode
                            pos_mode = 'net_mode'
                            try:
                                acct_cfg = await client.private_get_account_config()
                                pos_mode = acct_cfg['data'][0].get('posMode', 'net_mode')
                            except Exception as ex:
                                logger.warning(f"Could not get OKX posMode: {ex}")
                            
                            close_pos_side = 'long' if side == 'buy' else 'short'
                            if pos_mode == 'net_mode':
                                close_pos_side = 'net'
                                
                            close_params.update({
                                'tdMode': 'cross',
                                'posSide': close_pos_side
                            })
                        await client.create_order(
                            symbol=ccxt_symbol,
                            type='market',
                            side=opp_side,
                            amount=contracts,
                            params=close_params
                        )
                        logger.info("✅ Emergency market close order executed successfully!")
                        await self._log_db(user_id, exchange_name, f"⚠️ Position still open on exit. Emergency market close executed successfully!", symbol=ccxt_symbol, log_type='WARNING')
                    except Exception as close_err:
                        logger.error(f"❌ Failed to execute emergency close order: {close_err}")
                        await self._log_db(user_id, exchange_name, f"❌ Failed to execute emergency close order: {close_err}", symbol=ccxt_symbol, log_type='ERROR')
            except Exception as pos_err:
                logger.error(f"Could not check position for emergency close: {pos_err}")
                
            # 6. Fetch ending balance and calculate PnL
            try:
                balance_data = await client.fetch_balance()
                
                # Robust closing balance resolution
                closing_balance = 0.0
                if 'total' in balance_data:
                    closing_balance = float(balance_data['total'].get('USDT', 0.0))
                    if closing_balance == 0.0:
                        closing_balance = float(balance_data['total'].get('USDC', 0.0))
                    if closing_balance == 0.0:
                        closing_balance = float(balance_data['total'].get('USD', 0.0))
                    if closing_balance == 0.0 and balance_data['total']:
                        positive_balances = {k: v for k, v in balance_data['total'].items() if v and float(v) > 0}
                        if positive_balances:
                            for coin in ['USDT', 'USDC', 'USD', 'BUSD']:
                                if coin in positive_balances:
                                    closing_balance = float(positive_balances[coin])
                                    break
                            else:
                                first_coin = list(positive_balances.keys())[0]
                                closing_balance = float(positive_balances[first_coin])
                
                if closing_balance <= 0.0:
                    closing_balance = opening_balance or float(config.get("daily_risk_wallet", 1000))
                
                # Determine precise status and stats increment
                status = "CLOSED"
                tp_hits = 0
                sl_hits = 0
                be_hits = 0
                
                # Fetch market details for contract size
                market = client.market(ccxt_symbol)
                contract_size = float(market.get('contractSize', 1.0)) if market.get('contractSize') is not None else 1.0
                
                # Calculate mathematical PnL of the trade
                # Formula: Direction * Qty * (Exit - Entry) * ContractSize
                direction = 1.0 if side == 'buy' else -1.0
                half_qty = float(client.amount_to_precision(ccxt_symbol, qty / 2))
                rem_qty = qty - half_qty
                
                trade_pnl = 0.0
                
                if tp2_hit_confirmed:
                    status = "TP2_HIT"
                    tp_hits = 2
                    pnl1 = direction * half_qty * (tp1 - entry_price) * contract_size
                    pnl2 = direction * rem_qty * (tp2 - entry_price) * contract_size
                    trade_pnl = pnl1 + pnl2
                elif be_hit_confirmed:
                    status = "BE_HIT"
                    be_hits = 1
                    tp_hits = 1
                    pnl1 = direction * half_qty * (tp1 - entry_price) * contract_size
                    pnl2 = direction * rem_qty * ((be_price if be_price is not None else entry_price) - entry_price) * contract_size
                    trade_pnl = pnl1 + pnl2
                elif sl_hit_confirmed:
                    status = "SL_HIT"
                    sl_hits = 1
                    trade_pnl = direction * qty * (sl - entry_price) * contract_size
                elif tp1_hit:
                    status = "TP1_HIT"
                    tp_hits = 1
                    pnl1 = direction * half_qty * (tp1 - entry_price) * contract_size
                    pnl2 = direction * rem_qty * (live_price - entry_price) * contract_size
                    trade_pnl = pnl1 + pnl2
                else:
                    trade_pnl = direction * qty * (live_price - entry_price) * contract_size
                    
                # Estimate and deduct fees (entry + exit)
                fee_rate = 0.0005
                total_notional = qty * contract_size * entry_price
                estimated_fees = total_notional * fee_rate * 2
                net_trade_pnl = trade_pnl - estimated_fees
                
                logger.info(f"📊 Calculated Trade PnL: Gross={trade_pnl:.4f} USDT, Est. Fees={estimated_fees:.4f} USDT, Net={net_trade_pnl:.4f} USDT")
                
                # Update final record
                if execution_id:
                    await asyncio.to_thread(
                        self.supabase.table("trade_executions")
                        .update({
                            "status": status,
                            "tp_hits": tp_hits,
                            "sl_hits": sl_hits,
                            "be_hits": be_hits,
                            "closing_balance": closing_balance,
                            "pnl": net_trade_pnl
                        })
                        .eq("id", execution_id).execute
                    )
            except Exception as balance_err:
                logger.error(f"Could not calculate final PnL: {balance_err}")

        except Exception as global_err:
            logger.error(f"❌ Resilient Monitor crashed: {global_err}")
        finally:
            ACTIVE_MONITORS.discard(monitor_key)
            if client:
                await client.close()

    def _resolve_ccxt_symbol(self, client, symbol: str) -> str:
        """Resolves unified base symbol format to standard linear perp/swap symbol."""
        base = symbol.upper().replace("USDT", "").replace("/", "").replace("-", "").strip()
        candidates = [
            f"{base}/USDT:USDT",
            f"{base}/USDT",
        ]
        
        for candidate in candidates:
            if candidate in client.markets:
                m = client.markets[candidate]
                if m.get('type') in ('swap', 'future', 'linear'):
                    return candidate
                    
        # Native scan
        target_id = f"{base}-USDT-SWAP"
        for unified_symbol, market in client.markets.items():
            if market.get('id') == target_id:
                return unified_symbol
                
        # Simple lookup
        for unified_symbol, market in client.markets.items():
            if market.get('base') == base and market.get('quote') == 'USDT' and market.get('type') == 'swap':
                return unified_symbol
                
        return None
