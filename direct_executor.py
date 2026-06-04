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
import re
import pandas as pd


# Configure logger
logger = logging.getLogger("DirectExecutor")
logger.setLevel(logging.INFO)
logger.propagate = False  # Prevent logs from propagating to the root logger to eliminate duplicates

if not logger.handlers:
    handler = logging.StreamHandler()
    formatter = logging.Formatter('%(asctime)s [%(levelname)s] [DIRECT_ENGINE] %(message)s', datefmt='%H:%M:%S')
    handler.setFormatter(formatter)
    logger.addHandler(handler)

def should_log(message: str) -> bool:
    """Filters logs to only keep trade-related events, errors, warnings, successes, and system statuses for Supabase."""
    msg_upper = message.upper()
    
    # Always keep errors, warnings, successes, synchronization, licenses, and dispatch/activation statuses
    always_keep_keywords = ["ERROR", "FAILED", "WARNING", "SUCCESS", "SYNC", "VAULT", "ACTIVATED", "ABORTED", "LICENSE", "VERIF", "DISPATCH"]
    if any(keyword in msg_upper for keyword in always_keep_keywords):
        return True
        
    always_keep_emojis = ["❌", "⚠️", "✅", "🎯", "🚀", "ℹ️", "🔒"]
    if any(emoji in message for emoji in always_keep_emojis):
        return True

    keep_patterns = [
        r'\bLIMIT\b',
        r'\bTP1\b',
        r'\bTP2\b',
        r'\bSL\b',
        r'\bSTOP\s+LOSS\b',
        r'\bTAKE\s+PROFIT\b',
        r'\bBREAKEVEN\b',
        r'\bBREAK-EVEN\b',
        r'\bMONITOR\w*\b',
        r'\bBE\b',
        r'\bCLOSED?\b',
        r'\bCLOSING\b',
        r'\bCLEAN(UP|ING)?\b'
    ]
    for pattern in keep_patterns:
        if re.search(pattern, msg_upper):
            return True
    return False

# ----------------- EXCEL SYMBOL CLASSIFIER -----------------
class SymbolClassifier:
    def __init__(self):
        self.major_symbols = set()
        self.alt_symbols = set()
        self.all_symbols = set()
        self.load_lists()
        
    def load_lists(self):
        try:
            frontend_dir = r"d:\Project\Testing\crt-algo-frontend"
            major_path = os.path.join(frontend_dir, "OKX_Major_Coins.xlsx")
            alt_path = os.path.join(frontend_dir, "OKX_Altcoins.xlsx")
            
            if os.path.exists(major_path):
                df = pd.read_excel(major_path)
                df.columns = df.iloc[0]
                symbols = df[1:]['Symbol'].dropna().tolist()
                self.major_symbols = {str(s).upper().replace("/", "").replace(".P", "").strip() for s in symbols}
                
            if os.path.exists(alt_path):
                df = pd.read_excel(alt_path)
                df.columns = df.iloc[0]
                symbols = df[1:]['Symbol'].dropna().tolist()
                self.alt_symbols = {str(s).upper().replace("/", "").replace(".P", "").strip() for s in symbols}
                
            self.all_symbols = self.major_symbols.union(self.alt_symbols)
            logger.info(f"❇️ Symbol lists loaded: {len(self.major_symbols)} Majors, {len(self.alt_symbols)} Alts (Preserving USDT.P lookup).")
        except Exception as e:
            logger.error(f"❌ Error loading Excel symbol lists: {e}. Using safety defaults.")
            self.major_symbols = {
                'XPTUSDT', 'XAGUSDT', 'XAUUSDT', 'BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'XRPUSDT', 
                'DOGEUSDT', 'LTCUSDT', 'ADAUSDT', 'BCHUSDT', 'LINKUSDT', 'BNBUSDT', 'AVAXUSDT', 
                'TRXUSDT', 'DOTUSDT', 'TONUSDT'
            }
            self.all_symbols = self.major_symbols
            
    def is_major(self, symbol: str) -> bool:
        clean_symbol = symbol.upper().replace("/", "").replace("-", "").replace(".P", "").strip()
        return clean_symbol in self.major_symbols
        
    def is_restricted_okx_symbol(self, symbol: str) -> bool:
        clean_symbol = symbol.upper().replace("/", "").replace("-", "").replace(".P", "").strip()
        return clean_symbol in self.all_symbols

symbol_classifier = SymbolClassifier()

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

# ----------------- LIVE PRICE EXTRACTION & CORRECTION HELPER -----------------
def get_live_price(exchange_name: str, environment: str, ticker: dict, fallback_price: float) -> float:
    """Extracts the true live price from a ticker, correcting for distorted/stale testnet prices."""
    last = ticker.get('last')
    mark = ticker.get('markPrice')
    index = ticker.get('indexPrice')
    bid = ticker.get('bid')
    ask = ticker.get('ask')

    # 1. On Testnets, last traded price is notoriously stale/distorted across all exchanges due to lack of trading volume.
    # indexPrice represents the true real-time spot index and is highly accurate.
    if environment == 'testnet':
        # Prioritize real-time indexPrice or markPrice first
        for price in [index, mark]:
            if price is not None and price > 0:
                return float(price)
                
        # If neither index/mark are available, try bid/ask midpoint to capture active book spread
        if bid is not None and ask is not None and bid > 0 and ask > 0:
            return float(bid + ask) / 2.0
        if bid is not None and bid > 0:
            return float(bid)
            
        # Only fall back to last traded price if nothing else is available
        if last is not None and last > 0:
            return float(last)
            
    else:
        # On Mainnet, last traded price is highly accurate and represents real fills.
        for price in [last, mark, index]:
            if price is not None and price > 0:
                return float(price)
                
        if bid is not None and ask is not None and bid > 0 and ask > 0:
            return float(bid + ask) / 2.0
        
    return float(fallback_price)

# ----------------- DYNAMIC EXCHANGE INSTANTIATION -----------------
def create_exchange_client(exchange_name: str, api_key: str, secret: str, passphrase: str = None, environment: str = 'testnet'):
    """Instantiates a sandbox or mainnet CCXT client for the specified exchange."""
    exchange_id = exchange_name.lower().replace(".", "").strip()
    if exchange_id not in ['okx', 'bybit']:
        raise ValueError(f"Exchange '{exchange_name}' is not supported in the new project.")
        
    config = {
        'apiKey': api_key,
        'secret': secret,
        'enableRateLimit': True,
        'timeout': 30000
    }
    
    # Isolate Bybit specific options to prevent conflicts on OKX
    if exchange_id == 'bybit':
        config['options'] = {
            'defaultType': 'swap',
            'adjustForTimeDifference': True,
            'recvWindow': 10000
        }
    else:
        config['options'] = {
            'defaultType': 'swap'
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
            
    elif exchange_id == 'bybit':
        # Bybit V5 Conditional Market Order
        order_type = 'market'
        params.update({
            'triggerPrice': formatted_px,
            'triggerBy': 'LastPrice',
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
ACTIVE_MONITORS = set()

# ----------------- MULTI-EXCHANGE ENGINE -----------------
class DirectExecutor:
    def __init__(self):
        self.supabase = get_client()

    async def _log_db(self, user_id: str, exchange_name: str, message: str, symbol: str = None, log_type: str = 'INFO'):
        """Logs to the unified exchange_logs table in Supabase, only for USDT Crypto symbols."""
        # Print standard console logs for everything
        logger.info(f"[{exchange_name.upper()}] User {user_id[:5]}: {message}")
        
        # Do not log skipped trades to Supabase
        if "SKIP" in message.upper():
            return
            
        # Clean log screen filter for Supabase: only keep important trade events
        if not should_log(message):
            return
            
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

    def _is_in_funding_blackout_window(self, minutes_before: int = 5, minutes_after: int = 1) -> tuple[bool, str]:
        """
        Checks if the current UTC time falls within a blackout window around
        the 8-hour funding intervals (00:00, 08:00, 16:00 UTC).
        """
        now = datetime.now(timezone.utc)
        minutes_since_midnight = now.hour * 60 + now.minute
        
        # 8-hour funding times in minutes since midnight
        funding_times = [0, 480, 960, 1440]
        
        for ft in funding_times:
            diff = minutes_since_midnight - ft
            if ft == 0 and diff < 0:
                diff += 1440
            if ft == 1440 and diff > 0:
                diff -= 1440
                
            if -minutes_before <= diff <= minutes_after:
                target_hour = ft // 60
                if target_hour == 24:
                    target_hour = 0
                time_str = f"{target_hour:02d}:00 UTC"
                if diff < 0:
                    msg = f"Within funding fee blackout window: {abs(diff)} minutes BEFORE funding clock ({time_str})"
                else:
                    msg = f"Within funding fee blackout window: {diff} minutes AFTER funding clock ({time_str})"
                return True, msg
                
        return False, ""

    async def verify_user_and_dispatch(self, user_id: str, signal_data: dict):
        """
        Step 1: Check license & status.
        Step 2: Concurrently query all active exchange configuration tables.
        Step 3: Dispatch parallel trade orders.
        """
        try:
            # Sanitize symbol: uppercase, preserve perpetual futures .P formatting
            raw_symbol = signal_data.get("symbol", "").upper().strip()
            if ":" in raw_symbol:
                raw_symbol = raw_symbol.split(":")[-1].strip()
            if raw_symbol.endswith("PERP") or raw_symbol.endswith("-P"):
                raw_symbol = re.sub(r'[\.\-](P|PERP)$', '.P', raw_symbol)
            elif not raw_symbol.endswith(".P") and "USDT" in raw_symbol:
                raw_symbol = raw_symbol.replace("USDT", "USDT.P")
            symbol = "".join(c for c in raw_symbol if c.isalnum() or c in [".", "-", "_"])[:20]
            
            # Mutate signal_data in place so that all downstream logic gets the cleaned symbol
            signal_data["symbol"] = symbol

            # Guard: Skip direct execution for non-USDT symbols
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
            
            # Assert Tier 2+ and active subscription status
            # Expiry state is maintained dynamically by the server background loop!
            if tier < 2 or not is_pro:
                logger.warning(f"🚫 User {user_id} lacks minimum Tier 2 subscription (Tier: {tier})")
                return {"status": "rejected", "message": "Requires Tier 2+ subscription"}
                
            logger.info(f"✅ User license valid (Tier {tier} Pro). Dispatching trades.")
            
            # 2. Concurrently fetch credentials from individual tables to prevent conflict
            exchange_tables = [
                ("okx", "okx_auth"),
                ("bybit", "bybit_auth")
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
            
            # Resolve symbol from signal data
            symbol = signal_data.get("symbol", "").upper().replace("/", "")

            # Check allowed symbols list from checklist config
            allowed_symbols = config.get("allowed_symbols")
            
            # 1. OKX-Only Check: If the symbol is loaded from the OKX excel list but trading on Bybit, skip!
            is_restricted_symbol = symbol_classifier.is_restricted_okx_symbol(symbol)
            if is_restricted_symbol and exchange_name.lower().strip() != 'okx':
                skip_msg = f"⏭️ Skipping {exchange_name.upper()} execution: Symbol {symbol} is restricted to OKX execution only."
                await self._log_db(user_id, exchange_name, skip_msg, symbol=symbol, log_type='WARNING')
                return
                
            # 2. Checklist Allowed Symbol Verification and Timeframe-Level Enforcement
            if allowed_symbols is not None:
                # Format 1: New Dictionary format (e.g. {"BTCUSDT.P": ["M5/H1", "M15/H4"]})
                if isinstance(allowed_symbols, dict):
                    # Find matching key (case-insensitive and format-agnostic lookup)
                    clean_target = symbol.upper().replace("/", "").replace("-", "").strip()
                    matched_key = None
                    for key in allowed_symbols.keys():
                        clean_key = str(key).upper().replace("/", "").replace("-", "").strip()
                        if clean_target == clean_key:
                            matched_key = key
                            break
                    
                    if not matched_key:
                        skip_msg = f"⏭️ Trade skipped: Symbol {symbol} is not enabled in your allowed symbols checklist."
                        await self._log_db(user_id, exchange_name, skip_msg, symbol=symbol, log_type='WARNING')
                        return
                        
                    symbol_tfs = allowed_symbols[matched_key]
                    if not isinstance(symbol_tfs, list):
                        symbol_tfs = []
                        
                    # Normalize timeframes for comparison
                    raw_tf = str(signal_data.get("tf_alignment") or signal_data.get("tf_names") or signal_data.get("tf") or "M5/H1").upper().strip()
                    cleaned_tf = re.sub(r'\s+', '', raw_tf)
                    
                    # Map raw timeframe to standardized sig_htf
                    if cleaned_tf in ["5M-1H", "5M/1H", "M5-H1", "M5/H1", "5", "5M"]:
                        sig_htf = "m5/h1"
                    elif cleaned_tf in ["15M-4H", "15M/4H", "M15-H4", "M15/H4", "15", "15M"]:
                        sig_htf = "m15/h4"
                    elif cleaned_tf in ["30M-6H", "30M/6H", "M30-H6", "M30/H6", "30", "30M"]:
                        sig_htf = "m30/h6"
                    elif cleaned_tf in ["1H-1D", "1H/1D", "H1-D1", "H1/D1", "60", "1H", "60M"]:
                        sig_htf = "h1/d1"
                    else:
                        if "30M" in cleaned_tf or "30" == cleaned_tf:
                            sig_htf = "m30/h6"
                        elif "1H" in cleaned_tf or "60" == cleaned_tf or "1D" in cleaned_tf or "D" == cleaned_tf:
                            sig_htf = "h1/d1"
                        elif "15M" in cleaned_tf or "15" == cleaned_tf:
                            sig_htf = "m15/h4"
                        elif "5M" in cleaned_tf or "5" == cleaned_tf:
                            sig_htf = "m5/h1"
                        else:
                            sig_htf = raw_tf.lower()
                            
                    # Check if signal timeframe (lowercase) is in the allowed list for this symbol (lowercase)
                    allowed_tfs_lower = [str(t).lower().strip() for t in symbol_tfs]
                    if sig_htf not in allowed_tfs_lower:
                        enabled_str = ", ".join(symbol_tfs).upper() if symbol_tfs else "NONE"
                        skip_msg = f"⏭️ Trade skipped: Timeframe {sig_htf.upper()} is not enabled for symbol {symbol}. Enabled timeframes: {enabled_str}."
                        await self._log_db(user_id, exchange_name, skip_msg, symbol=symbol, log_type='WARNING')
                        return

                # Format 2: Old List/Array format (e.g. ["BTCUSDT.P", "ETHUSDT.P"])
                elif isinstance(allowed_symbols, list):
                    # Case-insensitive/format-agnostic lookup
                    clean_target = symbol.upper().replace("/", "").replace("-", "").strip()
                    is_enabled = False
                    for key in allowed_symbols:
                        clean_key = str(key).upper().replace("/", "").replace("-", "").strip()
                        if clean_target == clean_key:
                            is_enabled = True
                            break
                            
                    if not is_enabled:
                        skip_msg = f"⏭️ Trade skipped: Symbol {symbol} is not enabled in your allowed symbols checklist."
                        await self._log_db(user_id, exchange_name, skip_msg, symbol=symbol, log_type='WARNING')
                        return
                
            # 3. Dynamic Major vs Alt Risk Config Loading
            is_major = symbol_classifier.is_major(symbol)
            coin_type_label = "MAJOR COIN" if is_major else "ALT COIN"
            
            if is_major:
                daily_risk_wallet = float(config.get("daily_risk_wallet", 1000))
                risk_percentage = float(config.get("risk_percentage", 1.0))
                min_rr = float(config.get("rr", 1.5))
                alignment = config.get("alignment", "Both")
                entry_mode = config.get("entry_mode", "market")
                user_sweep = str(config.get("sweep_quality") or "All").strip().lower()
                user_grade_str = str(config.get("grade") or "All").strip().lower()
                user_htf_str = str(config.get("htf_alignment") or "All").strip().lower()
            else:
                daily_risk_wallet = float(config.get("alt_daily_risk_wallet", 1000))
                risk_percentage = float(config.get("alt_risk_percentage", 1.0))
                min_rr = float(config.get("alt_rr", 1.5))
                alignment = config.get("alt_alignment", "Both")
                entry_mode = config.get("alt_entry_mode", "market")
                user_sweep = str(config.get("alt_sweep_quality") or "All").strip().lower()
                user_grade_str = str(config.get("alt_grade") or "All").strip().lower()
                user_htf_str = str(config.get("alt_htf_alignment") or "All").strip().lower()
                
            logger.info(f"⚡ Loading {coin_type_label} config for {symbol} on {exchange_name.upper()} | Risk: {risk_percentage}% | Wallet: ${daily_risk_wallet}")
            
            # Decrypt secrets
            secret = decrypt_credentials(encrypted_secret)
            passphrase = decrypt_credentials(encrypted_passphrase) if encrypted_passphrase else None
            
            if not secret:
                logger.error(f"❌ Decryption failed for {exchange_name} credentials of user {user_id}")
                await self._log_db(user_id, exchange_name, f"❌ Decryption failed for {exchange_name.upper()} credentials.", log_type='ERROR')
                return
                
            # Clean symbol from signal_data
            symbol = signal_data.get("symbol", "").upper().replace("/", "")
                
            # Alignment check
            sig_alignment = str(signal_data.get("alignment", "Both")).strip().lower()
            user_alignment = str(alignment or "both").strip().lower()
            if not user_alignment or user_alignment == "none":
                user_alignment = "both"
            if user_alignment != "both" and sig_alignment != "both" and user_alignment != sig_alignment:
                skip_msg = f"⏭️ Trade skipped: Alignment mismatch (Signal: {sig_alignment.upper()}, Allowed: {user_alignment.upper()})."
                await self._log_db(user_id, exchange_name, skip_msg, symbol=symbol, log_type='WARNING')
                return

            # Sweep Quality check defaults
            if not user_sweep or user_sweep == "none":
                user_sweep = "all"
            sig_sweep = str(signal_data.get("sweep_quality", "Normal")).strip().lower()
            if user_sweep != "all" and user_sweep != sig_sweep:
                skip_msg = f"⏭️ Trade skipped: Sweep Quality mismatch (Signal: {sig_sweep.upper()}, Allowed: {user_sweep.upper()})."
                await self._log_db(user_id, exchange_name, skip_msg, symbol=symbol, log_type='WARNING')
                return
                
            # Grade check defaults
            if not user_grade_str or user_grade_str == "none":
                user_grade_str = "all"
            user_grades = [g.strip() for g in user_grade_str.split(",") if g.strip()]
            
            sig_grade_raw = str(signal_data.get("grade", "A+")).upper().strip()
            if "A++" in sig_grade_raw:
                sig_grade = "a++"
            elif "A+" in sig_grade_raw:
                sig_grade = "a+"
            elif "GOOD" in sig_grade_raw:
                sig_grade = "good"
            elif "NORMAL" in sig_grade_raw:
                sig_grade = "normal"
            else:
                sig_grade = "a+"
            
            if "all" not in user_grades and sig_grade not in user_grades:
                skip_msg = f"⏭️ Trade skipped: Grade mismatch (Signal: {sig_grade.upper()}, Allowed: {user_grade_str.upper()})."
                await self._log_db(user_id, exchange_name, skip_msg, symbol=symbol, log_type='WARNING')
                return
                
            # HTF Alignment check defaults
            if not user_htf_str or user_htf_str == "none":
                user_htf_str = "all"
            user_htfs = [h.strip() for h in user_htf_str.split(",") if h.strip()]
            
            raw_tf = str(signal_data.get("tf_alignment") or signal_data.get("tf_names") or signal_data.get("tf") or "M5/H1").upper().strip()
            cleaned_tf = re.sub(r'\s+', '', raw_tf)
            
            # Standard alignments mapping
            if cleaned_tf in ["5M-1H", "5M/1H", "M5-H1", "M5/H1"]:
                sig_htf = "m5/h1"
            elif cleaned_tf in ["15M-4H", "15M/4H", "M15-H4", "M15/H4"]:
                sig_htf = "m15/h4"
            elif cleaned_tf in ["30M-6H", "30M/6H", "M30-H6", "M30/H6"]:
                sig_htf = "m30/h6"
            elif cleaned_tf in ["1H-1D", "1H/1D", "H1-D1", "H1/D1"]:
                sig_htf = "h1/d1"
            # Fallbacks for raw chart timeframes if they don't send the alignment name
            elif cleaned_tf in ["5", "5M"]:
                sig_htf = "m5/h1"
            elif cleaned_tf in ["15", "15M"]:
                sig_htf = "m15/h4"
            elif cleaned_tf in ["30", "30M"]:
                sig_htf = "m30/h6"
            elif cleaned_tf in ["60", "1H", "60M"]:
                sig_htf = "h1/d1"
            else:
                # Flexible keyword matching as a fallback
                if "30M" in cleaned_tf or "30" == cleaned_tf:
                    sig_htf = "m30/h6"
                elif "1H" in cleaned_tf or "60" == cleaned_tf or "1D" in cleaned_tf or "D" == cleaned_tf:
                    sig_htf = "h1/d1"
                elif "15M" in cleaned_tf or "15" == cleaned_tf:
                    sig_htf = "m15/h4"
                elif "5M" in cleaned_tf or "5" == cleaned_tf:
                    sig_htf = "m5/h1"
                else:
                    sig_htf = raw_tf.lower()
                    
            if "all" not in user_htfs and sig_htf not in user_htfs:
                skip_msg = f"⏭️ Trade skipped: HTF Alignment mismatch (Signal: {sig_htf.upper()}, Allowed: {user_htf_str.upper()})."
                await self._log_db(user_id, exchange_name, skip_msg, symbol=symbol, log_type='WARNING')
                return

            # Funding fee avoidance blackout check (5 mins before, 1 min after)
            is_blackout, blackout_msg = self._is_in_funding_blackout_window(minutes_before=5, minutes_after=1)
            if is_blackout:
                logger.info(f"⏭️ Trade skipped on {exchange_name.upper()} for {symbol}: {blackout_msg}")
                await self._log_db(
                    user_id=user_id,
                    exchange_name=exchange_name,
                    message=f"⚠️ Trade skipped: {blackout_msg}",
                    symbol=symbol,
                    log_type='WARNING'
                )
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
                if client:
                    await client.close()
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
                if client:
                    await client.close()
                return

            # Get current ticker price
            ticker = await client.fetch_ticker(ccxt_symbol)
            live_price = get_live_price(exchange_name, environment, ticker, entry_price)
            
            # --- STALENESS, SL SAFETY & TP1 REACHED GUARDS ---
            is_long = side == 'buy'
            original_risk = abs(entry_price - sl)
            
            if original_risk <= 0:
                logger.error(f"❌ Aborted {ccxt_symbol} on {exchange_name}: SL is zero or identical to entry price.")
                await self._log_db(user_id, exchange_name, f"❌ Aborted: SL is zero or identical to entry price.", symbol=ccxt_symbol, log_type='ERROR')
                if client:
                    await client.close()
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
                if client:
                    await client.close()
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
                if client:
                    await client.close()
                return

            # Calculate Risk & Reward parameters
            risk_usd = daily_risk_wallet * (risk_percentage / 100.0)
            risk_per_unit = abs(entry_price - sl)  # FIX: Use entry_price, not live_price!
            
            if risk_per_unit <= 0:
                logger.error("❌ Risk per unit is zero or negative.")
                if client:
                    await client.close()
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
                if client:
                    await client.close()
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
                
                # Collateral Cap: Do not exceed the user's daily_risk_wallet settings
                # This prevents a large exchange balance from over-leveraging the positions beyond their risk desk configuration
                effective_collateral = min(available_usdt, daily_risk_wallet)
                max_notional = effective_collateral * leverage * 0.90  # 90% margin cap to leave room for fees/slippage
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
                    if client:
                        await client.close()
                    return
            except Exception as limit_err:
                logger.warning(f"⚠️ Could not execute size limit checks on {exchange_name}: {limit_err}")

            if qty <= 0:
                logger.error("❌ Quantity resolves to zero after size limits checks.")
                if client:
                    await client.close()
                return

            # Verify Reward Ratio criteria using entry_price instead of live_price to be completely stable
            # Use tp2 (the final target) for calculating the trade's full reward potential
            calculated_rr = abs(tp2 - entry_price) / risk_per_unit if risk_per_unit > 0 else 0
            signal_rr = float(signal_data.get("rr") or 0)
            effective_rr = max(calculated_rr, signal_rr)
            
            if effective_rr < min_rr:
                logger.info(f"⏭️ Signal RR {effective_rr:.2f} is below user's minimum RR setting: {min_rr}")
                if client:
                    await client.close()
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
            
            # Execute Order (MARKET ONLY)
            order_params = {}
            if exchange_name.lower().strip() == 'okx':
                order_params.update({
                    'tdMode': 'cross',
                    'posSide': pos_side
                })
                
            exec_msg = f"⚡ Executing {side.upper()} {ccxt_symbol} (MARKET) | Risk: ${risk_usd:.2f} | Qty: {qty} contracts | SL: {sl} | Split TP: True"
            await self._log_db(user_id, exchange_name, exec_msg, symbol=ccxt_symbol, log_type='INFO')
            
            order = await client.create_order(
                symbol=ccxt_symbol,
                type='market',
                side=side,
                amount=qty,
                params=order_params
            )
            
            filled_price = float(order.get('price') or order.get('average') or live_price)
            order_id = order.get('id')
            status_label = "ENTRY"
            
            # Standardize timeframe alignment for stats card
            raw_tf_val = signal_data.get("tf_alignment") or signal_data.get("tf_names") or signal_data.get("tf") or "M5/H1"
            sig_tf_alignment = str(raw_tf_val).upper().replace("-", "/").strip()
            if "5M" in sig_tf_alignment or "M5" in sig_tf_alignment:
                sig_tf_alignment = "M5/H1"
            elif "15M" in sig_tf_alignment or "M15" in sig_tf_alignment:
                sig_tf_alignment = "M15/H4"
            elif "30M" in sig_tf_alignment or "M30" in sig_tf_alignment:
                sig_tf_alignment = "M30/H6"
            elif "1H" in sig_tf_alignment or "H1" in sig_tf_alignment or "1D" in sig_tf_alignment or "D1" in sig_tf_alignment:
                sig_tf_alignment = "H1/D1"
            else:
                sig_tf_alignment = "M5/H1"

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
                    "status": status_label,
                    "tf_alignment": sig_tf_alignment,
                    "signal_id": signal_data.get("id")
                }).execute
            )
            
            execution_id = execution_res.data[0]['id'] if execution_res.data else None
            
            # ----------------- BULLETPROOF SL & TP PLACEMENT -----------------
            # To ensure the orders are never "forgotten" or "missed", we place them immediately 
            # on the exchange itself as trigger/conditional orders.
            opp_side = 'sell' if side == 'buy' else 'buy'
            sl_order_id = None
            tp1_order_id = None
            tp2_order_id = None
            
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
                
            # Place SL Trigger on Exchange with up to 3 retries (500ms delay)
            sl_order_id = None
            max_sl_retries = 3
            for attempt in range(1, max_sl_retries + 1):
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
                    logger.info(f"✅ Stop Loss placed on {exchange_name} (ID: {sl_order_id}) at {sl} (Attempt {attempt})")
                    await self._log_db(user_id, exchange_name, f"✅ Stop Loss trigger placed at {sl} (ID: {sl_order_id}) on attempt {attempt}", symbol=ccxt_symbol, log_type='SUCCESS')
                    break
                except Exception as sl_err:
                    logger.warning(f"⚠️ Attempt {attempt}/{max_sl_retries} failed to place exchange-side SL: {sl_err}")
                    if attempt < max_sl_retries:
                        await asyncio.sleep(0.5)
                    else:
                        # All attempts failed! Fall back to Local Shield Mode instead of immediate panic exit close
                        logger.error(f"❌ All {max_sl_retries} attempts to place exchange-side Stop Loss failed. Activating LOCAL SHIELD MODE fallback.")
                        await self._log_db(user_id, exchange_name, f"🛡️ All exchange-side Stop Loss attempts failed. LOCAL SHIELD MODE is now ACTIVE (virtual SL at {sl}).", symbol=ccxt_symbol, log_type='WARNING')
                
            # Place TP1 Trigger Order (Half of Quantity)
            half_qty = float(client.amount_to_precision(ccxt_symbol, qty / 2))
            
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
            # Include timeframe alignment in the monitor key to prevent different timeframe monitors from blocking each other
            tf_clean = re.sub(r'[^a-zA-Z0-9]', '', raw_tf)
            monitor_key = f"{user_id}_{exchange_name}_{ccxt_symbol}_{tf_clean}"
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
                        opening_balance=opening_balance,
                        tf_alignment=raw_tf,
                        local_shield=(sl_order_id is None)
                    )
                )
            
            # Dispatch complete, close our local exchange client session
            if client:
                await client.close()
        except Exception as e:
            friendly_msg = f"❌ Error in _dispatch_to_exchange: {e}"
            logger.error(friendly_msg)
            await self._log_db(
                user_id=user_id,
                exchange_name=exchange_name,
                message=friendly_msg,
                symbol=signal_data.get("symbol", "").upper().replace("/", ""),
                log_type='ERROR'
            )
            if client:
                await client.close()

    async def _robust_trade_lifecycle_monitor(self, user_id, execution_id, exchange_name, ccxt_symbol, 
                                             entry_price, tp1, tp2, sl, side, qty, sl_order_id, tp1_order_id, tp2_order_id, config, monitor_key, pos_side=None, opening_balance=None, tf_alignment=None, local_shield=False):
        """
        A highly resilient background polling task that handles:
        1. Checking when Take Profit 1 is hit.
        2. Adjusting Stop Loss to break-even (entry_price + spread + commission) seamlessly.
        3. Monitoring TP2 trigger fills.
        4. Cleaning up all trigger orders at exit to prevent orphan orders.
        5. Real-time PnL calculation based on opening balance.
        """
        if local_shield:
            logger.info(f"🔭 Monitoring trade lifecycle for {ccxt_symbol} on {exchange_name} (LOCAL SHIELD MODE ACTIVE at 2s intervals)")
            await self._log_db(user_id, exchange_name, f"🔭 Monitor active for {ccxt_symbol} in LOCAL SHIELD MODE (2s intervals). TP1: {tp1} | TP2: {tp2}", symbol=ccxt_symbol, log_type='INFO')
        else:
            logger.info(f"🔭 Monitoring trade lifecycle for {ccxt_symbol} on {exchange_name}")
            await self._log_db(user_id, exchange_name, f"🔭 Monitor active for {ccxt_symbol}. TP1 (BE Trigger): {tp1} | TP2: {tp2}", symbol=ccxt_symbol, log_type='INFO')
            
        client = None
        tp1_hit = False
        tp2_hit_confirmed = False
        sl_hit_confirmed = False
        be_hit_confirmed = False
        funding_close = False
        be_price = None
        live_price = entry_price
        retry_delay = 2 if local_shield else 10  # 2s polling frequency for Local Shield mode, 10s standard
        
        consecutive_errors = 0
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
            environment = config.get("environment", "testnet")

            # --- STANDARD ACTIVE LIFECYCLE MONITOR ---
            while True:
                try:
                    await asyncio.sleep(retry_delay)
                    
                    # 1. Fetch current position size
                    positions = await client.fetch_positions([ccxt_symbol])
                    # In Hedge Mode, search for the matching position side ('long' or 'short')
                    pos = next((p for p in positions if p.get('symbol') == ccxt_symbol and p.get('side') == ('long' if side.lower() == 'buy' else 'short')), {})
                    if not pos and positions:
                        # Fallback for Net Mode or exchanges that don't unify 'side' in the same way
                        pos = next((p for p in positions if p.get('symbol') == ccxt_symbol), {})
                    
                    # Check position contracts
                    contracts = float(pos.get('contracts') or pos.get('size') or pos.get('positionAmt') or 0)
                    raw_pos = float(pos.get('info', {}).get('pos', 0))
                    
                    if contracts == 0 and raw_pos == 0:
                        # Position is closed. Check why before breaking out.
                        is_tp2_order_filled = False
                        if tp2_order_id:
                            try:
                                order_status = await self._safe_fetch_order(client, tp2_order_id, ccxt_symbol, is_trigger=True)
                                if order_status.get('status') == 'closed':
                                    is_tp2_order_filled = True
                            except Exception as ord_err:
                                logger.warning(f"Could not fetch TP2 order status on close check: {ord_err}")
                        
                        is_sl_order_filled = False
                        if sl_order_id:
                            try:
                                order_status = await self._safe_fetch_order(client, sl_order_id, ccxt_symbol, is_trigger=True)
                                if order_status.get('status') == 'closed':
                                    is_sl_order_filled = True
                            except Exception as ord_err:
                                logger.warning(f"Could not fetch SL order status on close check: {ord_err}")

                        if is_tp2_order_filled:
                            tp2_hit_confirmed = True
                            logger.info(f"🏁 Take Profit 2 hit confirmed via order status for {ccxt_symbol} on {exchange_name}!")
                            await self._log_db(user_id, exchange_name, f"🏁 Take Profit 2 hit confirmed via order status for {ccxt_symbol} on {exchange_name.upper()}!", symbol=ccxt_symbol, log_type='SUCCESS')
                        elif is_sl_order_filled:
                            if tp1_hit and be_price is not None:
                                be_hit_confirmed = True
                                logger.info(f"🏁 Break-Even Stop Loss hit confirmed via order status for {ccxt_symbol} on {exchange_name}!")
                                await self._log_db(user_id, exchange_name, f"🏁 Break-Even Stop Loss hit confirmed via order status for {ccxt_symbol} on {exchange_name.upper()}!", symbol=ccxt_symbol, log_type='WARNING')
                            else:
                                sl_hit_confirmed = True
                                logger.info(f"🏁 Primary Stop Loss hit confirmed via order status for {ccxt_symbol} on {exchange_name}!")
                                await self._log_db(user_id, exchange_name, f"🏁 Primary Stop Loss hit confirmed via order status for {ccxt_symbol} on {exchange_name.upper()}!", symbol=ccxt_symbol, log_type='ERROR')
                        else:
                            # Fallback to price checks in case order fetching failed or it was closed through another route
                            try:
                                ticker = await client.fetch_ticker(ccxt_symbol)
                                live_price = get_live_price(exchange_name, config.get("environment", "testnet"), ticker, entry_price)
                                if tp1_hit and be_price is not None:
                                    is_be_price_hit = (side == 'buy' and live_price <= be_price) or (side == 'sell' and live_price >= be_price)
                                    if is_be_price_hit:
                                        be_hit_confirmed = True
                                else:
                                    is_sl_price_hit = (side == 'buy' and live_price <= sl) or (side == 'sell' and live_price >= sl)
                                    if is_sl_price_hit:
                                        sl_hit_confirmed = True
                                
                                is_tp2_price_hit = (side == 'buy' and live_price >= tp2) or (side == 'sell' and live_price <= tp2)
                                if is_tp2_price_hit:
                                    tp2_hit_confirmed = True
                            except Exception as ticker_err:
                                logger.warning(f"Could not fetch ticker for fallback close check: {ticker_err}")

                        logger.info(f"🏁 Position fully closed on {exchange_name} for {ccxt_symbol}. Ending loop.")
                        await self._log_db(user_id, exchange_name, f"🏁 Position fully closed on {exchange_name.upper()} for {ccxt_symbol}.", symbol=ccxt_symbol, log_type='INFO')
                        break
                        
                    # Funding fee avoidance check (5 mins before standard 8-hour UTC clocks)
                    is_approaching_funding, funding_msg = self._is_in_funding_blackout_window(minutes_before=5, minutes_after=0)
                    if is_approaching_funding:
                        logger.warning(f"⚠️ Funding Fee Avoidance: {funding_msg}. Executing emergency close order now!")
                        await self._log_db(
                            user_id=user_id,
                            exchange_name=exchange_name,
                            message=f"⚠️ Funding Fee Avoidance: {funding_msg}. Executing emergency close now!",
                            symbol=ccxt_symbol,
                            log_type='WARNING'
                        )
                        funding_close = True
                        break
                        
                    # 2. Check current ticker prices
                    ticker = await client.fetch_ticker(ccxt_symbol)
                    live_price = get_live_price(exchange_name, config.get("environment", "testnet"), ticker, entry_price)
                    
                    # 3. TP1 Validation Check
                    if not tp1_hit:
                        # Fallback price check or checking order fill status
                        is_price_hit = (side == 'buy' and live_price >= tp1) or (side == 'sell' and live_price <= tp1)
                        
                        # Double-check trigger order status if order ID is present
                        is_order_filled = False
                        if tp1_order_id:
                            try:
                                order_status = await self._safe_fetch_order(client, tp1_order_id, ccxt_symbol, is_trigger=True)
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
                                    cancel_params = {}
                                    if exchange_name.lower().strip() == 'okx':
                                        cancel_params['trigger'] = True
                                    await client.cancel_order(sl_order_id, ccxt_symbol, params=cancel_params)
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
                                order_status = await self._safe_fetch_order(client, sl_order_id, ccxt_symbol, is_trigger=True)
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
                                order_status = await self._safe_fetch_order(client, sl_order_id, ccxt_symbol, is_trigger=True)
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
                            order_status = await self._safe_fetch_order(client, tp2_order_id, ccxt_symbol, is_trigger=True)
                            if order_status.get('status') == 'closed':
                                is_tp2_order_filled = True
                        except Exception:
                            pass
                            
                    if is_tp2_price_hit or is_tp2_order_filled:
                        tp2_hit_confirmed = True
                        logger.info(f"🏁 Take Profit 2 hit for {ccxt_symbol} on {exchange_name} (Price: {live_price})!")
                        await self._log_db(user_id, exchange_name, f"🏁 Take Profit 2 hit for {ccxt_symbol} on {exchange_name.upper()} (Price: {live_price})!", symbol=ccxt_symbol, log_type='SUCCESS')
                        break
                    
                    # Successfully completed a loop iteration, reset consecutive error counter
                    consecutive_errors = 0
                        
                except Exception as loop_err:
                    consecutive_errors += 1
                    is_auth_error = isinstance(loop_err, (ccxt.AuthenticationError, ccxt.PermissionDenied))
                    
                    # Fallback string matching to be absolutely bulletproof
                    err_str = str(loop_err).lower()
                    if "auth" in err_str or "api key" in err_str or "unauthorized" in err_str or "permission" in err_str:
                        is_auth_error = True
                        
                    if is_auth_error:
                        logger.error(f"❌ Permanent authentication/permission error in monitor for {ccxt_symbol} on {exchange_name}: {loop_err}")
                        if consecutive_errors >= 3:
                            logger.error(f"❌ Consecutive authentication errors reached limit (3). Terminating trade monitor task.")
                            await self._log_db(user_id, exchange_name, f"❌ Terminating trade monitor: Continuous Authentication Error ({loop_err})", symbol=ccxt_symbol, log_type='ERROR')
                            break
                    else:
                        if consecutive_errors >= 30:
                            logger.error(f"❌ Consecutive general errors reached limit (30). Terminating trade monitor task to prevent resource exhaustion/OOM.")
                            await self._log_db(user_id, exchange_name, f"❌ Terminating trade monitor: Too many consecutive errors ({loop_err})", symbol=ccxt_symbol, log_type='ERROR')
                            break
                    
                    logger.error(f"⚠️ Error inside monitoring loop (Attempt {consecutive_errors}): {loop_err}. Retrying in 10s...")
                    await asyncio.sleep(10)
                    
            # 5. Position Exit Actions - Clean up active trigger/conditional orders to prevent orphan orders on the exchange
            for ord_id in [sl_order_id, tp1_order_id, tp2_order_id]:
                if ord_id:
                    try:
                        logger.info(f"🧹 Cleaning up active trigger order {ord_id} on {exchange_name}")
                        cancel_params = {}
                        if exchange_name.lower().strip() == 'okx':
                            cancel_params['trigger'] = True
                        await client.cancel_order(ord_id, ccxt_symbol, params=cancel_params)
                    except Exception:
                        pass

            try:
                # Re-fetch positions to see if we need emergency market close
                positions = await client.fetch_positions([ccxt_symbol])
                pos = next((p for p in positions if p.get('symbol') == ccxt_symbol and p.get('side') == ('long' if side.lower() == 'buy' else 'short')), {})
                if not pos and positions:
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
                elif funding_close:
                    status = "FUNDING_CLOSE_TP1" if tp1_hit else "FUNDING_CLOSE"
                    if tp1_hit:
                        tp_hits = 1
                        pnl1 = direction * half_qty * (tp1 - entry_price) * contract_size
                        pnl2 = direction * rem_qty * (live_price - entry_price) * contract_size
                        trade_pnl = pnl1 + pnl2
                    else:
                        trade_pnl = direction * qty * (live_price - entry_price) * contract_size
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
        base = symbol.upper().replace("USDT", "").replace("/", "").replace("-", "").replace(".P", "").strip()
        
        # Sandbox fallback for Bybit: Use USDC swap perpetuals since Bybit Testnet lacks USDT altcoin swaps
        is_bybit = client.id == 'bybit'
        is_testnet = getattr(client, 'sandboxMode', False) or (hasattr(client, 'urls') and 'testnet' in str(client.urls.get('api', '')))
        
        candidates = []
        if is_bybit and is_testnet:
            candidates = [
                f"{base}/USDC:USDC",
                f"{base}/USDT:USDT",
                f"{base}/USDT.P:USDT.P",
                f"{base}/USDT",
            ]
        else:
            candidates = [
                f"{base}/USDT:USDT",
                f"{base}/USDT.P:USDT.P",
                f"{base}/USDT",
                f"{base}/USDT.P",
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

    async def _safe_fetch_order(self, client, order_id: str, symbol: str, is_trigger: bool = False) -> dict:
        """Safely fetches an order from exchange, suppressing Bybit's fetchOrder warning."""
        params = {}
        if client.id == 'bybit':
            params['acknowledged'] = True
        elif client.id == 'okx' and is_trigger:
            params['trigger'] = True
        return await client.fetch_order(order_id, symbol, params=params)
