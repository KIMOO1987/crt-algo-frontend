import time
import os
import json
import re
import logging

import requests
import uvicorn
import traceback
from fastapi import FastAPI, Request, HTTPException, BackgroundTasks, Query
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from datetime import datetime, timedelta, timezone
from pydantic import BaseModel

load_dotenv()

import asyncio
import httpx
from direct_executor import DirectExecutor

# 1. IMPORT THE UNIFIED DISPATCHER LOGIC
from db import get_client, get_supabase_url, get_supabase_anon_key

async def safe_db_execute(func, max_retries=3, backoff_factor=0.5):
    """
    Safely execute a database query using asyncio.to_thread and retries
    on read/write timeout exceptions to guarantee high-availability.
    """
    for attempt in range(max_retries):
        try:
            return await asyncio.to_thread(func)
        except (httpx.ReadTimeout, httpx.WriteTimeout, httpx.ConnectTimeout, TimeoutError) as e:
            if attempt == max_retries - 1:
                raise e
            sleep_time = backoff_factor * (2 ** attempt)
            logger.warning(f"⚠️ Database query timed out (attempt {attempt + 1}/{max_retries}). Retrying in {sleep_time:.2f}s...")
            await asyncio.sleep(sleep_time)


# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s [%(levelname)s] %(message)s')
logger = logging.getLogger(__name__)

app = FastAPI(
    title="CRT-ALGO OKX API",
    description="Signal Dispatcher for OKX Exchange",
    version="4.0.0"
)

# REGISTER THE ROUTERS
# (Legacy routers exchange_routes and three_commas have been completely removed)

# ADD CORS MIDDLEWARE
# In production, replace with your actual frontend URL
allowed_origins = os.getenv("ALLOWED_ORIGINS", "*").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins if allowed_origins != ["*"] else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class TrialRequest(BaseModel):
    userId: str

# --- CONFIGURATION ---
# Use db.py singleton instead of creating new client
supabase = get_client()

# Webhook security - move to environment variable
WEBHOOK_PASSPHRASE = os.getenv("WEBHOOK_PASSPHRASE", "").strip().replace('"', '').replace("'", "")

if not WEBHOOK_PASSPHRASE:
    logger.warning("⚠️ WEBHOOK_PASSPHRASE not set - webhook security disabled!")

# --- Load Matrix Webhooks ---
WEBHOOKS = {
    "CRYPTO": {
        "LTF": os.getenv("DISCORD_WEBHOOK_CRYPTO_LTF"),
        "HTF": os.getenv("DISCORD_WEBHOOK_CRYPTO_HTF"),
        "MHTF": os.getenv("DISCORD_WEBHOOK_CRYPTO_MHTF"),
        "HHTF": os.getenv("DISCORD_WEBHOOK_CRYPTO_HHTF")
    },
    "FOREX": {
        "LTF": os.getenv("DISCORD_WEBHOOK_FOREX_LTF"),
        "HTF": os.getenv("DISCORD_WEBHOOK_FOREX_HTF"),
        "MHTF": os.getenv("DISCORD_WEBHOOK_FOREX_MHTF"),
        "HHTF": os.getenv("DISCORD_WEBHOOK_FOREX_HHTF")
    },
    "INDICES": {
        "LTF": os.getenv("DISCORD_WEBHOOK_INDICES_LTF"),
        "HTF": os.getenv("DISCORD_WEBHOOK_INDICES_HTF"),
        "MHTF": os.getenv("DISCORD_WEBHOOK_INDICES_MHTF"),
        "HHTF": os.getenv("DISCORD_WEBHOOK_INDICES_HHTF")
    },
    "METALS": {
        "LTF": os.getenv("DISCORD_WEBHOOK_METALS_LTF"),
        "HTF": os.getenv("DISCORD_WEBHOOK_METALS_HTF"),
        "MHTF": os.getenv("DISCORD_WEBHOOK_METALS_MHTF"),
        "HHTF": os.getenv("DISCORD_WEBHOOK_METALS_HHTF")
    }
}


def get_category_from_symbol(symbol: str) -> str:
    """Instantly maps the symbol to its exact asset class."""
    sym = symbol.upper()
    if sym in ('EURUSD', 'GBPUSD', 'USDJPY', 'GBPJPY', 'AUDUSD', 'EURJPY', 'NZDUSD', 'CHFJPY'):
        return 'FOREX'
    if sym in ('XAUUSD', 'XAGUSD', 'XPTUSD', 'XCUUSD'):
        return 'METALS'
    if sym in ('US100', 'US500', 'US30'):
        return 'INDICES'
    
    # Defaults to Crypto for all other assets
    return 'CRYPTO'

def safe_float(val, default=0.0):
    """Safely convert value to float, preventing NaN/Infinity JSON errors."""
    try:
        f = float(val)
        if f != f or f == float('inf') or f == float('-inf'):
            return default
        return f
    except (ValueError, TypeError):
        return default

def send_discord_background(content: str, target_url: str):
    if not target_url: return
    for attempt in range(3):
        try:
            headers = {"User-Agent": "CRT-ALGO-Bot-1.0"}
            response = requests.post(target_url, json={"content": content}, headers=headers, timeout=5)
            
            if response.status_code == 429:
                retry_after = response.json().get("retry_after", 2)
                time.sleep(retry_after)
                continue 
            
            if response.status_code in [200, 204]:
                logger.info("Discord Log: Success")
                break
        except Exception as e:
            logger.error(f"Discord Error: {e}")
            break

# @app.api_route("/health", methods=["GET", "HEAD"])
# async def health_check():
#     return {"status": "CRT-ALGO Engine Active", "version": "3.0.0"}

# --- 2. DIAGNOSTICS & KEEP-ALIVE (MODIFIED) ---

@app.get("/")
async def root():
    """Main landing page to verify the server is awake."""
    return {"message": "CRT-ALGO Bridge is Online", "status": "active"}

@app.get("/health")
async def health_check():
    """Standard health check endpoint for Render/UptimeRobot."""
    # Test Supabase connection
    db_status = "unknown"
    db_error = None
    try:
        # Test Supabase connection with a short timeout using httpx to prevent blocking Render deployment
        url = f"{get_supabase_url()}/rest/v1/signals?limit=1"
        headers = {
            "apikey": get_supabase_anon_key(),
            "Authorization": f"Bearer {get_supabase_anon_key()}"
        }
        async with httpx.AsyncClient() as client:
            response = await client.get(url, headers=headers, timeout=2.0)
            if response.status_code == 200:
                db_status = "connected"
            else:
                db_status = f"error_status_{response.status_code}"
                db_error = response.text[:200]
    except httpx.TimeoutException:
        db_status = "timeout"
        db_error = "Connection to Supabase timed out (database is likely paused/sleeping)"
    except Exception as e:
        db_status = "error"
        db_error = str(e)[:200]

    return {
        "status": "healthy",
        "version": "4.0.0",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "supabase": db_status,
        "db_error": db_error
    }

# Dynamic Multi-Exchange In-Memory Executor Instance
direct_executor = DirectExecutor()

@app.post("/webhook/direct")
async def direct_multi_exchange_webhook(request: Request, background_tasks: BackgroundTasks):
    """
    Direct in-memory TradingView signal webhook processor.
    Bypasses waiting for signals database queries and dispatches trades instantly.
    """
    try:
        raw_body = await request.body()
        decoded_body = raw_body.decode('utf-8')
        cleaned_body = re.sub(r'[\n\r\t]', ' ', decoded_body)
        
        try:
            data = json.loads(cleaned_body)
        except json.JSONDecodeError:
            raise HTTPException(status_code=400, detail="Invalid JSON payload")
            
        # Webhook Passphrase check
        incoming_passphrase = str(data.get("Copyright") or data.get("passphrase") or "").strip()
        if WEBHOOK_PASSPHRASE and incoming_passphrase != WEBHOOK_PASSPHRASE:
            raise HTTPException(status_code=401, detail="Unauthorized webhook passphrase")
            
        user_id = data.get("user_id")
        if not user_id:
            # Broadcast mode: Execute for all active Pro (Tier >= 2) users
            profiles_res = await asyncio.to_thread(
                supabase.table("profiles").select("id").eq("is_pro", True).gte("tier", 2).execute
            )
            user_ids = [p["id"] for p in (profiles_res.data or [])]
        else:
            user_ids = [user_id]
            
        if not user_ids:
            logger.info("ℹ️ Direct Webhook: No eligible Tier 2+ subscribers found for execution.")
            return {"status": "skipped", "message": "No active Tier 2+ subscribers found"}
            
        # Dispatch in background for <50ms instant response time to TradingView
        for uid in user_ids:
            background_tasks.add_task(direct_executor.verify_user_and_dispatch, uid, data)
            
        return {
            "status": "success",
            "message": f"Signal queued for direct in-memory execution across {len(user_ids)} targets"
        }
        
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"❌ Direct webhook crash: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/signals")
async def signals_alias(request: Request, background_tasks: BackgroundTasks):
    """Backward-compatible alias for legacy TradingView webhook requests."""
    return await crt_algo_signal_manager(request, background_tasks)

@app.post("/webhook")
async def crt_algo_signal_manager(request: Request, background_tasks: BackgroundTasks):
    try:
        # 1. Capture and Clean Data
        raw_body = await request.body()
        decoded_body = raw_body.decode('utf-8')
        cleaned_body = re.sub(r'[\n\r\t]', ' ', decoded_body)
        
        try:
            data = json.loads(cleaned_body)
        except json.JSONDecodeError as e:
            return {"status": "error", "message": "Invalid JSON payload"}
            
        # 2. Security Check (Master Webhook Key)
        incoming_passphrase = str(data.get("Copyright") or data.get("passphrase") or "").strip()
        if WEBHOOK_PASSPHRASE and incoming_passphrase != WEBHOOK_PASSPHRASE:
            raise HTTPException(status_code=401, detail="Unauthorized")

        # 3. INITIAL LOGIC SETUP
        msg_type = data.get("type", "ENTRY").upper()
        raw_symbol = str(data.get("symbol", "UNKNOWN")).strip().upper()
        if ":" in raw_symbol:
            raw_symbol = raw_symbol.split(":")[-1].strip()
        
        # Preserve and standardise perpetual futures .P formatting
        if raw_symbol.endswith("PERP") or raw_symbol.endswith("-P"):
            raw_symbol = re.sub(r'[\.\-](P|PERP)$', '.P', raw_symbol)
        elif not raw_symbol.endswith(".P") and "USDT" in raw_symbol:
            raw_symbol = raw_symbol.replace("USDT", "USDT.P")
            
        symbol = "".join(c for c in raw_symbol if c.isalnum() or c in [".", "-", "_"])[:20]
        
        # Update the incoming dictionary in place to keep everything consistent
        data["symbol"] = symbol

        # 🛡️ DUPLICATE ENTRY GUARD - Now handled by DB constraints (idx_unique_tradingview_signal, idx_unique_active_signal_fuzzy)
        if msg_type == "ENTRY":
            side = str(data.get("action", "BUY")).upper()
            entry_price = safe_float(data.get("price", 0))
            sl = safe_float(data.get("sl", 0))
            tp = safe_float(data.get("tp", 0))

            # 🛡️ FIX: Skip broken trades (SL=0 or NaN)
            if sl <= 0 or entry_price <= 0:
                logger.warning(f"[SKIP] Invalid signal: {symbol} SL={sl} Price={entry_price}")
                return {"status": "skipped", "message": "Invalid SL or Price"}

        # 4. TIMEFRAME, CATEGORY & GRADE ROUTING LOGIC
        
        # --- Clean Timeframe ---
        raw_tf = str(data.get("tf_names") or data.get("tf") or data.get("tf_alignment") or "5M-1H").upper().strip()
        # Remove all whitespace to handle variations with spaces (e.g. "30M - 6H")
        cleaned_tf = re.sub(r'\s+', '', raw_tf)
        
        # Standard alignments mapping
        if cleaned_tf in ["5M-1H", "5M/1H", "M5-H1", "M5/H1"]:
            tf = "M5/H1"
        elif cleaned_tf in ["15M-4H", "15M/4H", "M15-H4", "M15/H4"]:
            tf = "M15/H4"
        elif cleaned_tf in ["30M-6H", "30M/6H", "M30-H6", "M30/H6"]:
            tf = "M30/H6"
        elif cleaned_tf in ["1H-1D", "1H/1D", "H1-D1", "H1/D1"]:
            tf = "H1/D1"
        # Fallbacks for raw chart timeframes if they don't send the alignment name
        elif cleaned_tf in ["5", "5M"]:
            tf = "M5/H1"
        elif cleaned_tf in ["15", "15M"]:
            tf = "M15/H4"
        elif cleaned_tf in ["30", "30M"]:
            tf = "M30/H6"
        elif cleaned_tf in ["60", "1H", "60M"]:
            tf = "H1/D1"
        else:
            # Flexible keyword matching as a fallback
            if "30M" in cleaned_tf or "30" == cleaned_tf:
                tf = "M30/H6"
            elif "1H" in cleaned_tf or "60" == cleaned_tf or "1D" in cleaned_tf or "D" == cleaned_tf:
                tf = "H1/D1"
            elif "15M" in cleaned_tf or "15" == cleaned_tf:
                tf = "M15/H4"
            elif "5M" in cleaned_tf or "5" == cleaned_tf:
                tf = "M5/H1"
            else:
                tf = raw_tf
            
        # --- Clean Grade (Strip Emojis) ---
        raw_grade = str(data.get("grade", "A+")).upper()
        if "A++" in raw_grade:
            clean_grade = "A++"
        elif "A+" in raw_grade:
            clean_grade = "A+"
        elif "GOOD" in raw_grade:
            clean_grade = "GOOD"
        elif "NORMAL" in raw_grade:
            clean_grade = "NORMAL"
        else:
            clean_grade = "A+" # Safe fallback

        category = get_category_from_symbol(symbol)

        # 5. DISCORD NOTIFICATION
        if tf == "M5/H1":
            timeframe_key = "LTF"
        elif tf == "M15/H4":
            timeframe_key = "HTF"
        elif tf == "M30/H6":
            timeframe_key = "MHTF"
        elif tf == "H1/D1":
            timeframe_key = "HHTF"
        else:
            timeframe_key = "LTF" # Default fallback
            
        target_webhook = WEBHOOKS.get(category, {}).get(timeframe_key)


        if target_webhook and msg_type == "ENTRY":
            message_content = data.get("content", "New CRT Signal Received")
            background_tasks.add_task(send_discord_background, message_content, target_webhook)

            
        # --- 6. ENTRY LOGIC + DISPATCH TRIGGER ---
        if msg_type == "ENTRY":
            
            # 🛡️ ACTIVE GUARD: Skip if the same symbol, side & timeframe alignment is already ACTIVE
            active_side_check = str(data.get("action", "BUY")).upper()
            active_check = await safe_db_execute(
                supabase.table("signals").select("id")
                .eq("symbol", symbol)
                .eq("side", active_side_check)
                .eq("tf_alignment", tf)
                .eq("is_active", True)
                .execute
            )
            if active_check.data:
                logger.info(f"[GUARD] Active signal already exists for {symbol} ({active_side_check}) on {tf}. Skipping duplicate.")
                return {"status": "skipped", "message": "Active signal already exists"}

            # Add microscopic offset to bypass idx_unique_tradingview_signal for previously CLOSED identical signals
            micro_offset = (time.time() % 1) * 1e-10

            signal_payload = {
                "symbol": symbol,
                "entry_price": safe_float(data.get("price", 0)),
                "side": active_side_check,
                "tp": safe_float(data.get("tp", 0)) + micro_offset,
                "tp_secondary": safe_float(data.get("tp2", 0)),
                "sl": safe_float(data.get("sl", 0)),
                "rr": safe_float(data.get("rr", 0)),
                "regime": data.get("regime", "N/A"),
                "ote_zone": data.get("ote_zone", "N/A"),
                "sweep_quality": data.get("sweep_quality", "Normal"),
                "alignment": data.get("alignment", "Counter"),
                "grade": clean_grade,
                "tf_alignment": tf,
                "timeframe": str(data.get("tf", "1m")),
                "category": category.upper(),
                "phase": data.get("phase", "N/A"),
                "confluences": data.get("confluences", "N/A"),
                "status": "ENTRY",
                "is_active": True,
                "strategy": "CRT_ALGO_PRO"
            }
            
            # Save to Database with Retry logic
            # Note: Duplicates are handled by DB constraints (idx_unique_tradingview_signal, idx_unique_active_signal_fuzzy)
            insert_res = None
            max_retries = 3
            for attempt in range(max_retries):
                try:
                    insert_res = await asyncio.to_thread(
                        supabase.table("signals").insert(signal_payload).execute
                    )
                    # DEBUG: Log successful insert response
                    logger.info(f"💾 DB Insert Success: {symbol}, response_data_count={len(insert_res.data) if insert_res.data else 0}")
                    break
                except Exception as db_err:
                    err_str = str(db_err)
                    # Check for duplicate constraint violation
                    if '23505' in err_str or 'duplicate key' in err_str.lower():
                        logger.info(f"[GUARD] Duplicate signal blocked by DB constraint: {symbol}")
                        return {"status": "skipped", "message": "Duplicate signal"}

                    # Enhanced error logging for debugging
                    logger.error(f"❌ Database insert failed (attempt {attempt + 1}/{max_retries}): {db_err}")
                    logger.error(f"❌ Error type: {type(db_err).__name__}")

                    # Check for JSON parse errors (network/timeout issues)
                    if 'Expecting value' in err_str or 'JSONDecodeError' in str(type(db_err)):
                        logger.error("🔍 DIAGNOSIS: Network timeout or Supabase service issue detected")
                        
                    if attempt < max_retries - 1:
                        await asyncio.sleep(1) # Wait before retrying
                        continue
                        
                    # After all retries failed:
                    logger.error("🔍 Check Supabase dashboard for service status")
                    if hasattr(db_err, 'response'):
                        logger.error(f"🔍 Response status: {db_err.response.status_code}")
                        logger.error(f"🔍 Response text: {db_err.response.text[:500] if db_err.response.text else 'empty'}")

                    return {"status": "error", "message": "Database error"}
            
            # --- THE AUTOMATION FIX: TRIGGER DISPATCHER ---
            if insert_res and insert_res.data:
                signal_data = insert_res.data[0]
                new_signal_id = signal_data['id']
                logger.info(f"Entry Saved. ID: {new_signal_id}. Triggering Broadcast...")
                logger.info(f"Broadcast: signal_id={new_signal_id}, symbol={signal_data.get('symbol')}")


                
                # 🚀 NEW: Dispatch to the new Multi-Exchange Direct Executor
                async def dispatch_direct_multi_exchange():
                    try:
                        user_id = data.get("user_id")
                        if not user_id:
                            # Broadcast mode: Execute for all active Pro (Tier >= 2) users
                            profiles_res = await asyncio.to_thread(
                                supabase.table("profiles").select("id").eq("is_pro", True).gte("tier", 2).execute
                            )
                            user_ids = [p["id"] for p in (profiles_res.data or [])]
                        else:
                            user_ids = [user_id]

                        for uid in user_ids:
                            logger.info(f"🚀 Dispatching new multi-exchange trade to user {uid} for {symbol}")
                            await direct_executor.verify_user_and_dispatch(uid, signal_data)
                    except Exception as e:
                        logger.error(f"❌ Direct multi-exchange dispatch failed: {e}", exc_info=True)

                background_tasks.add_task(dispatch_direct_multi_exchange)
                
                logger.info(f"OKX and Direct Multi-Exchange tasks added for {signal_data.get('symbol')}")

        # --- 7. EXIT / UPDATE LOGIC ---
        elif msg_type in ["EXIT", "END", "UPDATE_WIN", "UPDATE_LOSS", "UPDATE"]:
            raw_status = data.get("status", "CLOSED").upper()

            # Map incoming TV statuses to standard DB statuses for RPC compatibility
            # TradingView sends: SL, TP1, TP2, TP1 + SL (BE)
            status_map = {
                "WIN": "TP2",           # Full win - TP2 hit
                "LOSS": "SL",           # Full loss - SL hit
                "TP1": "TP1",          # First target hit (partial win)
                "TP2": "TP2",          # Second target hit (full win)
                "EXIT": "CLOSED",      # Manual close - treat as CLOSED
                "END": "CLOSED",       # Manual close - treat as CLOSED
                "TP1 + SL (BE)": "TP1 + SL (BE)"  # SL hit after TP1 - breakeven stopped
            }
            alert_status = status_map.get(raw_status, raw_status)

            logger.info(f"🔍 Exit mapping: raw_status={raw_status} -> alert_status={alert_status}")
            
            # Expanded list of final states to ensure "Organic" cleanup
            # TP1 is NOT a final state - trade remains active for TP2 or SL
            FINAL_STATES = ["SL", "TP2", "CLOSED", "TP1 + SL (BE)", "WIN", "LOSS", "EXIT", "END"]
            is_final_state = alert_status in FINAL_STATES or raw_status in FINAL_STATES
            
            # Update Database
            # If it's a final state, is_active becomes False
            try:
                raw_side = str(data.get("side", "")).upper()
                mapped_side = "BUY" if "BULL" in raw_side else "SELL" if "BEAR" in raw_side else None

                # Optimize: Query ONLY active signals for this specific symbol instead of fetching all 1770+ signals
                query = supabase.table("signals").select("id, symbol, side, status, is_active").eq("symbol", symbol).eq("is_active", True)
                if mapped_side:
                    query = query.eq("side", mapped_side)

                active_signals_res = await safe_db_execute(query.execute)
                active_signals = active_signals_res.data or []

                logger.info(f"Exit update: symbol={symbol}, side={mapped_side}, active matches={len(active_signals)}")

                if active_signals:
                    # Update the first active signal by ID
                    signal_id = active_signals[0]['id']
                    logger.info(f"🔧 Exit update: signal_id={signal_id}, status={alert_status}, is_final={is_final_state}")

                    # Use explicit filter format to avoid PostgREST UUID parsing issues
                    # Convert to string explicitly to ensure proper filtering
                    signal_id_str = str(signal_id) if signal_id else None
                    if signal_id_str:
                        update_res = await safe_db_execute(
                            supabase.table("signals").update({
                                "status": alert_status,
                                "is_active": False if is_final_state else True
                            }).eq("id", signal_id_str).execute
                        )
                    else:
                        logger.warning(f"⚠️ Exit update: signal_id is None for {symbol}")
                        # Fallback: find by symbol and update the most recent one
                        update_res = await safe_db_execute(
                            supabase.table("signals").update({
                                "status": alert_status,
                                "is_active": False if is_final_state else True
                            }).eq("symbol", symbol).eq("is_active", True).execute
                        )

                    if update_res and update_res.data:
                        logger.info(f"Trade marked as completed: {symbol} ({alert_status})")
                        

                    else:
                        logger.warning(f"⚠️ Exit update: no rows updated for {symbol}")
            except Exception as update_err:
                logger.warning(f"Exit update failed: {update_err}")

        return {"status": "success"}

    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Global Error: {str(e)}")
        traceback.print_exc() # SaaS Requirement: Log the full error to Render console
        return {"status": "error", "message": "Internal Server Error"}

# ==========================================
# ⚡ EXCHANGE LIVE BALANCE INQUIRY
# ==========================================
@app.get("/api/balance")
async def get_exchange_balance(user_id: str = Query(...), exchange: str = Query(...)):
    exchange_name = exchange.lower().replace(".", "").strip()
    table_name = f"{exchange_name}_auth"
    
    valid_exchanges = ["okx", "bybit"]
    if exchange_name not in valid_exchanges:
        raise HTTPException(status_code=400, detail=f"Unsupported exchange: {exchange}")
        
    try:
        # Query the isolated credentials table for this user & exchange
        res = await asyncio.to_thread(
            supabase.table(table_name).select("*").eq("user_id", user_id).execute
        )
        
        if not res.data:
            return {"status": "unconfigured", "balance": 0.0, "message": "Exchange not configured"}
            
        config = res.data[0]
        api_key = config.get("api_key")
        encrypted_secret = config.get("encrypted_secret")
        encrypted_passphrase = config.get("encrypted_passphrase", "")
        environment = config.get("environment", "testnet")
        
        from direct_executor import decrypt_credentials, create_exchange_client
        
        secret = decrypt_credentials(encrypted_secret)
        passphrase = decrypt_credentials(encrypted_passphrase) if encrypted_passphrase else None
        
        if not secret:
            return {"status": "error", "balance": 0.0, "message": "Decryption failed"}
            
        # Create CCXT client
        client = create_exchange_client(
            exchange_name=exchange_name,
            api_key=api_key,
            secret=secret,
            passphrase=passphrase,
            environment=environment
        )
        
        try:
            balance_data = await client.fetch_balance()
            await client.close()
            
            total_bal = 0.0
            
            if 'total' in balance_data:
                total_bal = float(balance_data['total'].get('USDT', 0.0))
                if total_bal == 0.0:
                    total_bal = float(balance_data['total'].get('USDC', 0.0))
                if total_bal == 0.0:
                    total_bal = float(balance_data['total'].get('USD', 0.0))
                if total_bal == 0.0 and balance_data['total']:
                    positive_balances = {k: v for k, v in balance_data['total'].items() if v and float(v) > 0}
                    if positive_balances:
                        for coin in ['USDT', 'USDC', 'USD', 'BUSD']:
                            if coin in positive_balances:
                                total_bal = float(positive_balances[coin])
                                break
                        else:
                            first_coin = list(positive_balances.keys())[0]
                            total_bal = float(positive_balances[first_coin])
                            
            return {
                "status": "success",
                "balance": total_bal,
                "currency": "USDT",
                "message": "Balance retrieved successfully"
            }
        except Exception as client_err:
            try:
                await client.close()
            except Exception:
                pass
            logger.error(f"❌ Failed to fetch balance from {exchange}: {client_err}")
            return {"status": "error", "balance": 0.0, "message": f"Exchange error: {str(client_err)}"}
            
    except Exception as e:
        logger.error(f"❌ Error in get_exchange_balance for {exchange}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ==========================================
# 🛡️ SAAS: CLIENT BOT VERIFICATION ENDPOINT
# ==========================================
@app.get("/api/verify")
async def verify_license(email: str = Query(...), licenseKey: str = Query(...)):
    try:
        # Search for the user by email - fetch all and filter in Python to avoid @ parsing issues
        response = await asyncio.to_thread(
            supabase.table("profiles").select("*").execute
        )

        # Filter by email in Python
        user = None
        if response.data:
            for u in response.data:
                if u.get('email', '').strip().lower() == email.strip().lower():
                    user = u
                    break

        # LOGGING: This will show up in your Render "Logs" tab
        logger.info(f"[AUTH] Querying: {email} | User Found: {user is not None}")

        if not user:
            logger.info("[AUTH] User not found in database.")
            return {"isActive": False, "tier": "free", "expiry": datetime.now(timezone.utc).isoformat()}

        # Validate UUID (License Key)
        if str(user.get("id")) != licenseKey.strip():
            masked_key = f"{licenseKey[:5]}...{licenseKey[-5:]}" if len(licenseKey) > 10 else "***"
            logger.info(f"[AUTH] ID Mismatch. Provided: {masked_key}")
            return {"isActive": False, "tier": "free", "expiry": datetime.now(timezone.utc).isoformat()}

        # Map the data from your specific table columns
        tier = str(user.get("plan_type", "free")).lower()
        expiry_str = user.get("expiry_date")
        is_pro_db = user.get("is_pro", False)
        
        # --- EXPIRATION CHECK ---
        # The background checker maintains this state. Just return current active status!
        is_active = is_pro_db

        masked_email = f"{email[:3]}***@{email.split('@')[-1]}" if '@' in email else "***"
        logger.info(f"[AUTH] Success: {masked_email} | Tier: {tier} | Active: {is_active}")
        
        return {
            "isActive": is_active,
            "tier": "free" if not is_active else tier,
            "expiry": expiry_str
        }

    except Exception as e:
        logger.error(f"[AUTH] Critical Server Error: {str(e)}")
        return {"isActive": False, "tier": "free", "expiry": datetime.now(timezone.utc).isoformat()}

# ==========================================
# 🛡️ SAAS: START 15-DAY FREE TRIAL
# ==========================================
@app.post("/api/start-trial")
async def start_trial(request: TrialRequest):
    try:
        user_id = request.userId.strip()
        
        # 1. Check if user exists and already has a trial/pro
        response = await asyncio.to_thread(
            supabase.table("profiles").select("*").eq("id", user_id).execute
        )
        if not response.data:
            raise HTTPException(status_code=404, detail="User not found")
        
        user = response.data[0]
        if user.get("subscription_type") == "trial":
            return {"status": "error", "message": "Trial already used"}
        
        if user.get("is_pro"):
            return {"status": "error", "message": "User is already PRO"}

        # 2. Activate 15-Day Trial (Tier 3 Ultimate)
        expiry_date = datetime.now(timezone.utc) + timedelta(days=15)
        
        update_res = await asyncio.to_thread(
            supabase.table("profiles").update({
                "is_pro": True,
                "plan_type": "Ultimate",
                "subscription_type": "trial",
                "subscription_status": "active",
                "tier": 3,
                "expiry_date": expiry_date.isoformat()
            }).eq("id", user_id).execute
        )

        if update_res and update_res.data:
            logger.info(f"[TRIAL] Activated 15-day trial for {user.get('email')}")
            return {"status": "success", "message": "15-day Trial Activated", "expiry": expiry_date.isoformat()}
        else:
            raise HTTPException(status_code=500, detail="Failed to update profile")

    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"[TRIAL] Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# ==========================================
# ⏰ SAAS: BACKGROUND LICENSE EXPIRY AUDIT LOOP
# ==========================================
async def check_and_expire_users():
    """Queries all active Pro users and automatically expires them if past their expiry date."""
    logger.info("🔄 Running Daily License Expiry Check...")
    try:
        profiles_res = await asyncio.to_thread(
            supabase.table("profiles").select("id, email, is_pro, expiry_date").eq("is_pro", True).execute
        )
        profiles = profiles_res.data or []
        now = datetime.now(timezone.utc)
        
        expired_count = 0
        for p in profiles:
            expiry_str = p.get("expiry_date")
            if not expiry_str:
                continue
            try:
                # Standardize UTC formatting and parse
                expiry_date = datetime.fromisoformat(expiry_str.replace("Z", "+00:00"))
                if now >= expiry_date:
                    logger.info(f"🛡️ Expiry Check: Auto-expiring user {p.get('email')} (ID: {p.get('id')})")
                    await asyncio.to_thread(
                        supabase.table("profiles").update({
                            "is_pro": False,
                            "plan_type": "free",
                            "subscription_type": "free",
                            "subscription_status": "free",
                            "tier": 0
                        }).eq("id", p.get("id")).execute
                    )
                    expired_count += 1
            except Exception as parse_err:
                logger.error(f"Error parsing expiry date '{expiry_str}' for user {p.get('id')}: {parse_err}")
        logger.info(f"✅ License Expiry Check Complete. Expired {expired_count} users.")
    except Exception as e:
        logger.error(f"❌ Failed to execute check_and_expire_users: {e}")

async def daily_license_expiry_check_loop():
    """Background task loop executing once every 24 hours."""
    logger.info("⏰ Initializing Daily License Expiry Loop...")
    while True:
        await check_and_expire_users()
        # Sleep for 24 hours
        await asyncio.sleep(24 * 3600)

@app.on_event("startup")
async def startup_event():
    logger.info("🚀 Server startup: Spawning License Expiry Task...")
    asyncio.create_task(daily_license_expiry_check_loop())


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8080))
    uvicorn.run("app:app", host="0.0.0.0", port=port, reload=False, log_level="warning", access_log=False)