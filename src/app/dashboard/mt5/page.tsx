'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import AccessGuard from '@/components/AccessGuard';
import { Power, Settings2, Activity, ShieldCheck, Terminal } from 'lucide-react';

export default function MT5Dashboard() {
  const [status, setStatus] = useState('stopped');
  const [logs, setLogs] = useState<string[]>([]);
  const [botToken, setBotToken] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    const savedStatus = sessionStorage.getItem('mt5_bridge_status');
    if (savedStatus === 'running') {
      setStatus('running');
    }

    async function initializeBridge(isSilentRefresh = false) {
      try {
        if (!isSilentRefresh) {
          const cached = sessionStorage.getItem('mt5_data_cache');
          if (cached) {
            try {
              const parsed = JSON.parse(cached);
              setBotToken(parsed.botToken);
              setLoading(false);
            } catch (e) { }
          } else {
            setLoading(true);
          }
        }

        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
          setLoading(false);
          return;
        }
        if (!isSilentRefresh) setUserId(user.id);

        let { data, error: tokenError } = await supabase
          .from('bot_signals')
          .select('bot_token, is_active')
          .eq('user_id', user.id)
          .eq('platform', 'MT5')
          .maybeSingle();

        if (!data && !tokenError) {
          const { data: newData } = await supabase
            .from('bot_signals')
            .insert([{ user_id: user.id, platform: 'MT5' }])
            .select()
            .single();
          data = newData;
        }

        if (data) {
          if (!isSilentRefresh) setBotToken(data.bot_token);
          if (data.is_active) {
            setStatus('running');
            sessionStorage.setItem('mt5_bridge_status', 'running');
          } else {
            setStatus('stopped');
            sessionStorage.setItem('mt5_bridge_status', 'stopped');
          }
          sessionStorage.setItem('mt5_data_cache', JSON.stringify({
            botToken: data.bot_token
          }));
        }
      } catch (err) {
        console.error("MT5 Bridge Init Error:", err);
      } finally {
        setLoading(false);
      }
    }

    initializeBridge();
    const refreshInterval = setInterval(() => initializeBridge(true), 30000);
    return () => clearInterval(refreshInterval);
  }, [supabase]);

  const addLog = useCallback((msg: string, timestamp?: string, type?: string) => {
    setLogs((prev) => {
      const time = timestamp ? new Date(timestamp) : new Date();
      const prefix = type ? `[${type}] ` : '';
      const newLog = `[${time.toLocaleTimeString()}] ${prefix}${msg}`;
      const uniqueLogs = Array.from(new Set([...prev, newLog]));
      return uniqueLogs.slice(-100);
    });
  }, []);

  useEffect(() => {
    if (!botToken) return;

    const fetchRecentLogs = async () => {
      const { data } = await supabase
        .from('cbot_logs')
        .select('message, created_at, log_type')
        .eq('bot_token', botToken)
        .order('created_at', { ascending: false })
        .limit(30);

      if (data) {
        const history = data.map((log: any) => {
          const typePrefix = log.log_type ? `[${log.log_type}] ` : '';
          return `[${new Date(log.created_at).toLocaleTimeString()}] ${typePrefix}${log.message}`;
        });
        setLogs((prev) => {
          const uniqueLogs = Array.from(new Set([...history.reverse(), ...prev]));
          return uniqueLogs.slice(-100);
        });
      }
    };
    fetchRecentLogs();

    const logChannel = supabase
      .channel(`private-mt5-logs-${botToken}`)
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'cbot_logs', filter: `bot_token=eq.${botToken}` },
        (payload) => { addLog(payload.new.message, payload.new.created_at, payload.new.log_type); }
      )
      .subscribe();

    return () => { supabase.removeChannel(logChannel); }
  }, [botToken, addLog, supabase]);

  const handleControl = async (action: 'start' | 'stop') => {
    addLog(`Sending ${action.toUpperCase()} command to MT5 Cloud Bridge...`);
    try {
      const res = await fetch('/api/terminal/control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform: 'mt5', action }),
      });

      if (res.ok) {
        setStatus(action === 'start' ? 'running' : 'stopped');
        sessionStorage.setItem('mt5_bridge_status', action === 'start' ? 'running' : 'stopped');
        addLog(`MT5 Bridge: ${action === 'start' ? 'ACTIVE & LISTENING' : 'OFFLINE'}.`);

        if (botToken) {
          await supabase.from('bot_signals').update({ is_active: action === 'start' }).eq('bot_token', botToken);
        }
      } else {
        addLog(`Error: Server responded with status ${res.status}`);
      }
    } catch (e) {
      addLog("Connection Error: Check your internet or API route.");
    }
  };

  // Auto-scroll terminal to bottom when new logs arrive

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center ">
        <div className="flex flex-col items-center justify-center py-20 animate-pulse">
          <Activity size={40} className="text-blue-500 mb-4 animate-spin" />
          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-blue-800">Initializing Secure Bridge...</p>
        </div>
      </div>
    );
  }

  const apiBaseUrl = "https://kimoocrt.vercel.app/api/signals";
  const fullUrl = botToken ? `${apiBaseUrl}?botId=${botToken}` : "Generating Token...";

  return (
    <AccessGuard requiredTier={2} tierName="PRO">
      <div className="relative p-4 md:p-12 lg:p-16 lg:ml-72  min-h-screen text-zinc-900 dark:text-white font-sans overflow-x-hidden">

        {/* Ambient Glowing Backgrounds */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
          <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-blue-600/10 blur-[150px] rounded-full mix-blend-screen" />
          <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-indigo-600/10 blur-[150px] rounded-full mix-blend-screen" />
        </div>

        <div className="max-w-[1700px] mx-auto relative z-10 space-y-6 md:space-y-8">

          {/* Header Section */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-8 md:mb-12">
            <div>
              <h1 className="text-2xl md:text-4xl font-black tracking-tighter italic flex items-center gap-3 uppercase text-zinc-900 dark:text-white">
                <img src="/mt5.png" alt="MetaTrader 5" className="w-8 h-8 md:w-10 md:h-10 object-contain drop-shadow-[0_0_15px_rgba(59,130,246,0.5)]" />
                MetaTrader 5<span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-500">Terminal</span>
              </h1>
              <p className="text-[10px] uppercase tracking-[0.4em] text-zinc-600 dark:text-zinc-500 font-bold mt-3 leading-none">
                • HIGH-FREQUENCY EXECUTION BRIDGE •
              </p>
            </div>

            {/* VPS Status Pill */}
            <div className="flex items-center gap-3 px-5 py-2.5 bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-xl backdrop-blur-md shadow-xl">
              <div className={`w-2.5 h-2.5 rounded-full ${status === 'running' ? 'bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.8)]' : 'bg-red-400 shadow-[0_0_10px_rgba(248,113,113,0.8)]'} animate-pulse`} />
              <span className={`text-[10px] font-black uppercase tracking-widest ${status === 'running' ? 'text-emerald-400' : 'text-red-400'}`}>
                {status === 'running' ? 'VPS ONLINE' : 'VPS OFFLINE'}
              </span>
            </div>
          </div>

          <div className="max-w-[800px] mx-auto grid grid-cols-1 gap-6 md:gap-8">
            {/* Controls & Config Column */}
            <div className="space-y-6 md:space-y-8">

              {/* Terminal Control Panel */}
              <div className="bg-gradient-to-br from-white/[0.04] to-white/[0.01] border border-[var(--glass-border)] p-6 md:p-8 rounded-[2.5rem] shadow-2xl backdrop-blur-md">
                <h2 className="text-[11px] font-black text-zinc-900 dark:text-white uppercase tracking-widest mb-6 flex items-center gap-3">
                  <Settings2 size={16} className="text-blue-400" /> Engine Controls
                </h2>
                <button
                  onClick={() => handleControl('start')}
                  className={`w-full py-4 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all duration-300 flex items-center justify-center gap-3 mb-4 active:scale-95 ${status === 'running'
                    ? 'bg-[var(--glass-bg)] border border-[var(--glass-border)] text-zinc-600 cursor-not-allowed shadow-none'
                    : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-zinc-900 dark:text-white shadow-[0_0_30px_rgba(59,130,246,0.3)] hover:shadow-[0_0_40px_rgba(59,130,246,0.5)] border border-blue-500/30'
                    }`}
                  disabled={status === 'running'}
                >
                  <Power size={16} className={status === 'running' ? 'text-zinc-600' : 'text-blue-200'} /> CONNECT ENGINE
                </button>
                <button
                  onClick={() => handleControl('stop')}
                  className={`w-full py-4 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all duration-300 flex items-center justify-center gap-3 active:scale-95 ${status === 'stopped'
                    ? 'bg-[var(--glass-bg)] border border-[var(--glass-border)] text-zinc-600 cursor-not-allowed shadow-none'
                    : 'bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 hover:shadow-[0_0_30px_rgba(239,68,68,0.2)]'
                    }`}
                  disabled={status === 'stopped'}
                >
                  <Power size={16} /> DISCONNECT
                </button>

              </div>
            </div>


          </div>

          {/* User Guide & Tier Comparison Section */}
          <div className="mt-20 md:mt-32 space-y-20 relative">
            <div className="text-center space-y-4">
              <h2 className="text-3xl md:text-5xl font-black tracking-tighter italic uppercase">
                Guardian<span className="text-blue-500">Deployment</span> Guide
              </h2>
              <p className="text-[10px] uppercase tracking-[0.4em] text-zinc-500 font-bold max-w-2xl mx-auto">
                Select your license tier and follow the institutional setup protocol.
              </p>
            </div>

            {/* Tier Comparison Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Pro Tier Card */}
              <div className="group relative bg-gradient-to-br from-zinc-900/50 to-zinc-950/50 border border-white/5 p-8 md:p-12 rounded-[3rem] overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
                  <ShieldCheck size={120} className="text-blue-400" />
                </div>
                <div className="relative z-10 space-y-6">
                  <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-blue-500/10 border border-blue-500/20 rounded-full text-[10px] font-black text-blue-400 uppercase tracking-widest">
                    Standard Access
                  </div>
                  <h3 className="text-3xl font-black italic tracking-tighter uppercase">Kimoo<span className="text-blue-500">Pro</span></h3>
                  <p className="text-zinc-400 text-sm leading-relaxed">
                    Designed for traders who want a simplified, automated experience. Pro tier focuses on trend-following stability.
                  </p>
                  <ul className="space-y-4 pt-4">
                    {[
                      'Direct Market Execution',
                      'Trend-Alignment Auto-Filter',
                      'High-Quality Sweep Priority',
                      'Standard Risk Management',
                      '3 Max Concurrent Setups'
                    ].map((feat, i) => (
                      <li key={i} className="flex items-center gap-3 text-xs font-bold text-zinc-300">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500" /> {feat}
                      </li>
                    ))}
                  </ul>
                  <a
                    href={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/bot-files/KimooGuardian_Pro.ex5`}
                    download
                    className="w-full py-4 bg-zinc-800 hover:bg-zinc-700 border border-white/5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all text-center block"
                  >
                    Download Pro EA
                  </a>
                </div>
              </div>

              {/* Ultimate Tier Card */}
              <div className="group relative bg-gradient-to-br from-blue-600/10 to-indigo-600/5 border border-blue-500/20 p-8 md:p-12 rounded-[3rem] overflow-hidden shadow-[0_0_50px_rgba(59,130,246,0.1)]">
                <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
                  <Terminal size={120} className="text-indigo-400" />
                </div>
                <div className="relative z-10 space-y-6">
                  <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-indigo-500/20 border border-indigo-500/30 rounded-full text-[10px] font-black text-indigo-300 uppercase tracking-widest">
                    Elite Access
                  </div>
                  <h3 className="text-3xl font-black italic tracking-tighter uppercase">Kimoo<span className="text-indigo-400">Ultimate</span></h3>
                  <p className="text-zinc-300 text-sm leading-relaxed">
                    The ultimate institutional toolkit. Take full control of entry precision and confluence matrix filtering.
                  </p>
                  <ul className="space-y-4 pt-4">
                    {[
                      'OTE Zone Limit Entry (Best R:R)',
                      'Full Confluence Control (Regime/Sweep)',
                      'Advanced AI Volume/VWAP Filter',
                      'Dynamic Risk Auto-Scaling',
                      '5+ Max Concurrent Setups'
                    ].map((feat, i) => (
                      <li key={i} className="flex items-center gap-3 text-xs font-bold text-indigo-200">
                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-400" /> {feat}
                      </li>
                    ))}
                  </ul>
                  <a
                    href={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/bot-files/KimooGuardian_Ultimate.ex5`}
                    download
                    className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-xl text-center block"
                  >
                    Download Ultimate EA
                  </a>
                </div>
              </div>
            </div>

            {/* Installation Guide */}
            <div className="bg-zinc-900/30 border border-white/5 rounded-[3rem] p-8 md:p-16">
              <div className="max-w-4xl mx-auto space-y-12">
                <div className="space-y-4">
                  <h3 className="text-2xl md:text-3xl font-black italic tracking-tighter uppercase">Installation <span className="text-blue-500">Protocol</span></h3>
                  <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest">Follow these steps to synchronize your terminal with the Kimoo Cloud.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-16 gap-y-12">
                  {[
                    { title: 'MT5 Configuration', desc: 'Go to Tools > Options > Expert Advisors. Check "Allow WebRequest" and add: https://kimoocrt.vercel.app and https://kimoocrt.onrender.com' },
                    { title: 'Files Deployment', desc: 'Copy your downloaded .ex5 file. In MT5, go to File > Open Data Folder > MQL5 > Experts, and paste the file.' },
                    { title: 'Expert Activation', desc: 'Drag the Kimoo Guardian onto any chart. Ensure "Allow Algorithmic Trading" is enabled in the common tab.' },
                    { title: 'Cloud Sync', desc: 'Copy your Unique UUID (License Key) from your profile settings and paste it into the "License Key" parameter in the EA settings.' },
                    { title: 'Auth Protocol', desc: 'Enter your registered Email and License Key (UserID) into the EA parameters to unlock your tier features.' },
                    { title: 'Engine Start', desc: 'Click the "Connect Engine" button at the top of this page to allow the cloud to start sending signals.' }
                  ].map((step, i) => (
                    <div key={i} className="flex gap-6">
                      <div className="shrink-0 w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 font-black italic">
                        0{i + 1}
                      </div>
                      <div className="space-y-2">
                        <h4 className="text-sm font-black uppercase tracking-tight text-white">{step.title}</h4>
                        <p className="text-xs text-zinc-500 leading-relaxed font-medium">{step.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </AccessGuard>

  );
}
