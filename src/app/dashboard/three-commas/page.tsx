'use client';

import React, { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import CryptoJS from 'crypto-js';
import { 
  ShieldAlert, Settings2, ShieldCheck, Lock, Save, 
  Zap, Info, Eye, EyeOff, CheckCircle2, AlertTriangle, Play, RefreshCw
} from 'lucide-react';

const MASTER_ENCRYPTION_KEY = process.env.NEXT_PUBLIC_ENCRYPTION_KEY;

export default function ThreeCommasWebhookDashboard() {
  const [supabase] = useState(() => createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  ));

  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [userTier, setUserTier] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Webhook State
  const [isEnabled, setIsEnabled] = useState(true);
  
  // Binance Bot Configuration
  const [binanceUuid, setBinanceUuid] = useState('');
  const [binanceSecret, setBinanceSecret] = useState('');
  const [showBinanceSecret, setShowBinanceSecret] = useState(false);

  // Bybit Bot Configuration
  const [bybitUuid, setBybitUuid] = useState('');
  const [bybitSecret, setBybitSecret] = useState('');
  const [showBybitSecret, setShowBybitSecret] = useState(false);

  // OKX Bot Configuration
  const [okxUuid, setOkxUuid] = useState('');
  const [okxSecret, setOkxSecret] = useState('');
  const [showOkxSecret, setShowOkxSecret] = useState(false);

  // Bitget Bot Configuration
  const [bitgetUuid, setBitgetUuid] = useState('');
  const [bitgetSecret, setBitgetSecret] = useState('');
  const [showBitgetSecret, setShowBitgetSecret] = useState(false);

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const fetchData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        setError("Authentication required.");
        setLoading(false);
        return;
      }

      const user = session.user;
      setUserId(user.id);

      // Check Profile & Tier
      const { data: profile } = await supabase.from('profiles').select('tier, is_pro, expiry_date').eq('id', user.id).single();
      
      if (!profile) {
        setError("User profile not found.");
        setLoading(false);
        return;
      }

      const isPro = profile.is_pro;
      const expiryDate = profile.expiry_date ? new Date(profile.expiry_date) : null;
      const isExpired = expiryDate ? new Date() > expiryDate : true;

      // Minimum Tier 2 is required for Webhook Signal bots
      if (!isPro || isExpired || profile.tier < 2) {
        setUserTier(profile.tier);
        setLoading(false);
        return;
      }

      setUserTier(profile.tier);

      // Fetch 3Commas Webhook Auth
      const baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL || '';
      const url = `${baseUrl}/signals/3commas/webhook-auth?user_id=${user.id}`;
      const res = await fetch(url);
      
      if (res.ok) {
        const authData = await res.json();
        setIsEnabled(authData.is_enabled !== false);
        setBinanceUuid(authData.binance_uuid || '');
        setBinanceSecret(authData.binance_secret || '');
        setBybitUuid(authData.bybit_uuid || '');
        setBybitSecret(authData.bybit_secret || '');
        setOkxUuid(authData.okx_uuid || '');
        setOkxSecret(authData.okx_secret || '');
        setBitgetUuid(authData.bitget_uuid || '');
        setBitgetSecret(authData.bitget_secret || '');
      }
    } catch (e: any) {
      console.error("Failed to fetch 3Commas webhook credentials", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [supabase]);

  const saveAuth = async () => {
    if (!userId) return;
    setIsSaving(true);
    setSaveSuccess(false);

    try {
      // Helper to encrypt secret if modified
      const encryptSecret = (secret: string) => {
        if (!secret) return "";
        if (secret === "••••••••••••") return "••••••••••••"; // Backend resolves this to existing value
        return CryptoJS.AES.encrypt(secret, MASTER_ENCRYPTION_KEY!).toString();
      };

      const payload = {
        is_enabled: isEnabled,
        binance_uuid: binanceUuid,
        binance_secret: encryptSecret(binanceSecret),
        bybit_uuid: bybitUuid,
        bybit_secret: encryptSecret(bybitSecret),
        okx_uuid: okxUuid,
        okx_secret: encryptSecret(okxSecret),
        bitget_uuid: bitgetUuid,
        bitget_secret: encryptSecret(bitgetSecret)
      };

      const baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL || '';
      const url = `${baseUrl}/signals/3commas/webhook-auth?user_id=${userId}`;
      
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setSaveSuccess(true);
        // Clean temporary plaintext secrets that were typed in
        if (binanceSecret !== "••••••••••••" && binanceSecret !== "") setBinanceSecret("••••••••••••");
        if (bybitSecret !== "••••••••••••" && bybitSecret !== "") setBybitSecret("••••••••••••");
        if (okxSecret !== "••••••••••••" && okxSecret !== "") setOkxSecret("••••••••••••");
        if (bitgetSecret !== "••••••••••••" && bitgetSecret !== "") setBitgetSecret("••••••••••••");
        
        setTimeout(() => setSaveSuccess(false), 4000);
      } else {
        alert("Failed to secure credentials. Please try again.");
      }
    } catch (e: any) {
      console.error("Error securing credentials", e);
      alert("Error: " + e.message);
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a]">
      <div className="flex flex-col items-center animate-pulse">
        <Zap size={40} className="text-orange-500 mb-4 animate-bounce" />
        <p className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-500">Initializing Signal Tunnel...</p>
      </div>
    </div>
  );

  if (userTier !== null && userTier < 2) {
    return (
      <div className="relative p-6 md:p-12 lg:p-16 lg:ml-72 min-h-screen flex flex-col items-center justify-center text-center bg-[#0a0a0a]">
        {/* Glow */}
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-red-500/10 blur-[150px] rounded-full pointer-events-none" />
        
        <ShieldAlert className="text-red-500 mb-6" size={56} />
        <h2 className="text-3xl font-black text-white uppercase italic tracking-tighter">Access Locked</h2>
        <p className="text-zinc-500 text-sm mt-3 max-w-md uppercase tracking-widest leading-relaxed">
          The 3Commas Webhook Execution pipeline is reserved exclusively for Tier 2 (Ultimate / Enterprise) subscribers.
        </p>
        <div className="mt-8 px-6 py-3.5 bg-red-500/10 border border-red-500/20 rounded-full text-[10px] font-black text-red-400 uppercase tracking-widest">
          Your tier: Tier {userTier} • Premium Upgrade Required
        </div>
      </div>
    );
  }

  return (
    <div className="relative p-4 md:p-12 lg:p-16 lg:ml-72 min-h-screen text-white font-sans overflow-x-hidden bg-[#0a0a0a]">
      
      {/* Ambient Glow */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-orange-500/10 blur-[150px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/5 blur-[120px] rounded-full" />
      </div>

      <div className="max-w-[1500px] mx-auto relative z-10 space-y-8">
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 pb-6 border-b border-white/5">
          <div>
            <h1 className="text-2xl md:text-4xl font-black tracking-tighter italic flex items-center gap-3 uppercase">
              <Zap size={32} className="text-orange-500 fill-orange-500" />
              3Commas<span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-orange-600">Webhooks</span>
            </h1>
            <p className="text-[10px] uppercase tracking-[0.4em] text-zinc-500 font-black mt-3 flex items-center gap-2">
              • Secure Multi-Exchange Signal Bridge • 
              <span className="flex items-center gap-1 text-emerald-500">
                <ShieldCheck size={12} /> AES-256 Enabled
              </span>
            </p>
          </div>
          
          <div className="flex items-center gap-4 bg-white/[0.03] border border-white/10 px-5 py-3 rounded-2xl">
            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Signal Tunnel Status</span>
            <button
              onClick={() => setIsEnabled(!isEnabled)}
              className={`px-4 py-1.5 text-[9px] font-black uppercase tracking-widest rounded-full transition-all duration-300 ${
                isEnabled 
                ? 'bg-emerald-500/20 border border-emerald-500/50 text-emerald-400' 
                : 'bg-zinc-800 border border-zinc-700 text-zinc-500'
              }`}
            >
              {isEnabled ? 'ACTIVE & STREAMING' : 'DISABLED'}
            </button>
          </div>
        </div>

        {/* INFO NOTICE */}
        <div className="bg-orange-500/10 border border-orange-500/20 p-6 rounded-3xl flex items-start gap-4">
          <Info className="text-orange-500 shrink-0 mt-0.5" size={20} />
          <div className="space-y-1 text-xs text-orange-200 font-medium">
            <p className="font-bold text-white uppercase tracking-wider text-[10px]">How does the 3Commas Webhook bridge work?</p>
            <p className="text-zinc-400 leading-relaxed mt-1">
              Configure your 3Commas **Signal Bots** on each exchange and paste their corresponding **Bot UUID** and **Signal Secret** below. When KIMOO PRO generates high-probability signals, our engine immediately relays identical payloads to all your configured bots in real-time, executing entry trades automatically.
            </p>
          </div>
        </div>

        {/* EXCHANGE GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* BINANCE CARD */}
          <div className="bg-white/[0.03] border border-white/10 hover:border-orange-500/30 p-8 rounded-[2rem] backdrop-blur-xl transition-all duration-300 group relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-yellow-500/5 blur-xl group-hover:bg-yellow-500/10 rounded-full transition-all duration-500 pointer-events-none" />
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-3">
                <img src="/binance.png" alt="Binance" className="w-6 h-6 object-contain" onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }} />
                <h3 className="text-lg font-black tracking-wider uppercase">Binance</h3>
              </div>
              <span className="text-[8px] font-black uppercase bg-yellow-500/10 text-yellow-500 px-3 py-1 rounded-full border border-yellow-500/20">SPOT & FUTURES</span>
            </div>
            
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-2"><Settings2 size={10}/> Bot UUID</label>
                <input 
                  type="text" 
                  value={binanceUuid} 
                  onChange={(e) => setBinanceUuid(e.target.value)} 
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-xs font-mono outline-none focus:border-orange-500/50"
                  placeholder="3Commas Bot UUID..."
                />
              </div>
              <div className="space-y-2">
                <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-2"><Lock size={10}/> Signal Secret</label>
                <div className="relative">
                  <input 
                    type={showBinanceSecret ? "text" : "password"} 
                    value={binanceSecret} 
                    onChange={(e) => setBinanceSecret(e.target.value)} 
                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-4 pr-12 py-3.5 text-xs font-mono outline-none focus:border-orange-500/50"
                    placeholder={binanceSecret === "••••••••••••" ? "••••••••••••" : "Paste Signal Secret..."}
                  />
                  <button 
                    onClick={() => setShowBinanceSecret(!showBinanceSecret)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"
                  >
                    {showBinanceSecret ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* BYBIT CARD */}
          <div className="bg-white/[0.03] border border-white/10 hover:border-orange-500/30 p-8 rounded-[2rem] backdrop-blur-xl transition-all duration-300 group relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-orange-500/5 blur-xl group-hover:bg-orange-500/10 rounded-full transition-all duration-500 pointer-events-none" />
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-amber-500/10 flex items-center justify-center font-bold text-xs text-amber-500">BY</div>
                <h3 className="text-lg font-black tracking-wider uppercase">Bybit</h3>
              </div>
              <span className="text-[8px] font-black uppercase bg-amber-500/10 text-amber-500 px-3 py-1 rounded-full border border-amber-500/20">SPOT & DERIVATIVES</span>
            </div>
            
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-2"><Settings2 size={10}/> Bot UUID</label>
                <input 
                  type="text" 
                  value={bybitUuid} 
                  onChange={(e) => setBybitUuid(e.target.value)} 
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-xs font-mono outline-none focus:border-orange-500/50"
                  placeholder="3Commas Bot UUID..."
                />
              </div>
              <div className="space-y-2">
                <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-2"><Lock size={10}/> Signal Secret</label>
                <div className="relative">
                  <input 
                    type={showBybitSecret ? "text" : "password"} 
                    value={bybitSecret} 
                    onChange={(e) => setBybitSecret(e.target.value)} 
                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-4 pr-12 py-3.5 text-xs font-mono outline-none focus:border-orange-500/50"
                    placeholder={bybitSecret === "••••••••••••" ? "••••••••••••" : "Paste Signal Secret..."}
                  />
                  <button 
                    onClick={() => setShowBybitSecret(!showBybitSecret)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"
                  >
                    {showBybitSecret ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* OKX CARD */}
          <div className="bg-white/[0.03] border border-white/10 hover:border-orange-500/30 p-8 rounded-[2rem] backdrop-blur-xl transition-all duration-300 group relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 blur-xl group-hover:bg-blue-500/10 rounded-full transition-all duration-500 pointer-events-none" />
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-3">
                <img src="/okx.png" alt="OKX" className="w-6 h-6 object-contain" onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }} />
                <h3 className="text-lg font-black tracking-wider uppercase">OKX</h3>
              </div>
              <span className="text-[8px] font-black uppercase bg-blue-500/10 text-blue-500 px-3 py-1 rounded-full border border-blue-500/20">SPOT & FUTURES</span>
            </div>
            
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-2"><Settings2 size={10}/> Bot UUID</label>
                <input 
                  type="text" 
                  value={okxUuid} 
                  onChange={(e) => setOkxUuid(e.target.value)} 
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-xs font-mono outline-none focus:border-orange-500/50"
                  placeholder="3Commas Bot UUID..."
                />
              </div>
              <div className="space-y-2">
                <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-2"><Lock size={10}/> Signal Secret</label>
                <div className="relative">
                  <input 
                    type={showOkxSecret ? "text" : "password"} 
                    value={okxSecret} 
                    onChange={(e) => setOkxSecret(e.target.value)} 
                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-4 pr-12 py-3.5 text-xs font-mono outline-none focus:border-orange-500/50"
                    placeholder={okxSecret === "••••••••••••" ? "••••••••••••" : "Paste Signal Secret..."}
                  />
                  <button 
                    onClick={() => setShowOkxSecret(!showOkxSecret)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"
                  >
                    {showOkxSecret ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* BITGET CARD */}
          <div className="bg-white/[0.03] border border-white/10 hover:border-orange-500/30 p-8 rounded-[2rem] backdrop-blur-xl transition-all duration-300 group relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-teal-500/5 blur-xl group-hover:bg-teal-500/10 rounded-full transition-all duration-500 pointer-events-none" />
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-teal-500/10 flex items-center justify-center font-bold text-xs text-teal-400">BG</div>
                <h3 className="text-lg font-black tracking-wider uppercase">Bitget</h3>
              </div>
              <span className="text-[8px] font-black uppercase bg-teal-500/10 text-teal-400 px-3 py-1 rounded-full border border-teal-500/20">SPOT & FUTURES</span>
            </div>
            
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-2"><Settings2 size={10}/> Bot UUID</label>
                <input 
                  type="text" 
                  value={bitgetUuid} 
                  onChange={(e) => setBitgetUuid(e.target.value)} 
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-xs font-mono outline-none focus:border-orange-500/50"
                  placeholder="3Commas Bot UUID..."
                />
              </div>
              <div className="space-y-2">
                <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-2"><Lock size={10}/> Signal Secret</label>
                <div className="relative">
                  <input 
                    type={showBitgetSecret ? "text" : "password"} 
                    value={bitgetSecret} 
                    onChange={(e) => setBitgetSecret(e.target.value)} 
                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-4 pr-12 py-3.5 text-xs font-mono outline-none focus:border-orange-500/50"
                    placeholder={bitgetSecret === "••••••••••••" ? "••••••••••••" : "Paste Signal Secret..."}
                  />
                  <button 
                    onClick={() => setShowBitgetSecret(!showBitgetSecret)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"
                  >
                    {showBitgetSecret ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* SAVE & SECURE ACTION */}
        <div className="flex flex-col items-center justify-center pt-8 gap-4">
          <button 
            onClick={saveAuth}
            disabled={isSaving}
            className="px-12 py-5 rounded-2xl bg-gradient-to-r from-orange-500 to-orange-600 text-black text-xs font-black uppercase tracking-[0.25em] hover:shadow-[0_0_30px_rgba(249,115,22,0.4)] hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
          >
            {isSaving ? (
              <RefreshCw size={18} className="animate-spin" />
            ) : saveSuccess ? (
              <CheckCircle2 size={18} className="text-black" />
            ) : (
              <ShieldCheck size={18} />
            )}
            {isSaving ? 'SECURING VAULT...' : saveSuccess ? 'TUNNEL SYNCHRONIZED!' : 'SAVE & SECURE BOT VAULT'}
          </button>
          
          <p className="text-[9px] text-zinc-500 uppercase tracking-widest font-black text-center max-w-sm leading-relaxed">
            By saving, your credentials are local-encrypted with AES-256 before upload. Only the secure cloud executor can decrypt them at execution time.
          </p>
        </div>

        {/* TECHNICAL DETAILS / TELEGRAM FORMATS */}
        <div className="bg-white/[0.02] border border-white/5 p-8 rounded-[2.5rem] mt-12 space-y-6">
          <h3 className="text-[11px] font-black uppercase tracking-widest flex items-center gap-2 text-zinc-400">
            <Play size={12} className="text-orange-500 fill-orange-500" /> Active Webhook Format Sample
          </h3>
          <p className="text-zinc-500 text-xs leading-relaxed">
            When our master engine registers high-probability entry criteria, a robust fanning pipeline creates and posts payloads that match the standard 3Commas Signal Bot API guidelines directly to your exchanges. Here is a visual structure of the auto-sent webhook payload:
          </p>
          <pre className="p-5 bg-black/60 rounded-2xl border border-white/5 text-[10px] text-orange-500/80 font-mono overflow-x-auto leading-relaxed">
{`{
  "bot_uuid": "your-configured-bot-uuid",
  "secret": "your-secured-signal-secret",
  "action": "enter_long | enter_short",
  "tv_exchange": "BINANCE | BYBIT | OKX | BITGET",
  "tv_instrument": "USDT_BTCUSDT",
  "timestamp": "1774627615",
  "take_profit": {
    "enabled": true,
    "steps": [
      { "order_type": "limit", "price_percent": 1.25, "volume_percent": 50 },
      { "order_type": "limit", "price_percent": 2.50, "volume_percent": 50 }
    ]
  },
  "stop_loss": {
    "enabled": true,
    "order_type": "market",
    "trigger_price_percent": 0.85,
    "breakeven": true
  }
}`}
          </pre>
        </div>

      </div>
    </div>
  );
}
