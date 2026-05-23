'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { Power, Activity, ShieldAlert, Settings2, Terminal } from 'lucide-react';

export default function CTraderDashboard() {
  const [status, setStatus] = useState<'stopped' | 'running'>('stopped');
  const [logs, setLogs] = useState<string[]>([]);
  const [userTier, setUserTier] = useState<number | null>(null);
  const [botToken, setBotToken] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    const savedStatus = sessionStorage.getItem('ctrader_bridge_status');
    if (savedStatus === 'running') {
      setStatus('running');
    }

    async function initializeBridge(isSilentRefresh = false) {
      try {
        if (!isSilentRefresh) {
          const cached = sessionStorage.getItem('ctrader_data_cache');
          if (cached) {
            try {
              const parsed = JSON.parse(cached);
              setUserTier(parsed.tier);
              setBotToken(parsed.botToken);
              setLoading(false);
            } catch (e) { }
          } else {
            setLoading(true);
          }
        }

        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
          if (!isSilentRefresh) setError("Authentication required. Please log in.");
          setLoading(false);
          return;
        }
        if (!isSilentRefresh) setUserId(user.id);

        const { data: profile } = await supabase
          .from('profiles')
          .select('tier')
          .eq('id', user.id)
          .single();

        if (!isSilentRefresh) setUserTier(profile?.tier || 0);

        let { data, error: tokenError } = await supabase
          .from('bot_signals')
          .select('bot_token, is_active')
          .eq('user_id', user.id)
          .eq('platform', 'cTrader')
          .maybeSingle();

        if (!data && !tokenError) {
          const { data: newData } = await supabase
            .from('bot_signals')
            .insert([{ user_id: user.id, platform: 'cTrader' }])
            .select()
            .single();
          data = newData;
        }

        if (data) {
          if (!isSilentRefresh) setBotToken(data.bot_token);
          if (data.is_active) {
            setStatus('running');
            sessionStorage.setItem('ctrader_bridge_status', 'running');
          } else {
            setStatus('stopped');
            sessionStorage.setItem('ctrader_bridge_status', 'stopped');
          }
          sessionStorage.setItem('ctrader_data_cache', JSON.stringify({
            tier: profile?.tier || 0,
            botToken: data.bot_token
          }));
        }
      } catch (err) {
        console.error("Bridge Init Error:", err);
        if (!isSilentRefresh) setError("Failed to initialize secure bridge.");
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
    if (!botToken || !userId) return;

    const fetchRecentLogs = async () => {
      const { data } = await supabase
        .from('cbot_logs')
        .select('message, created_at, log_type')
        .eq('user_id', userId)
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
      .channel(`private-cbot-logs-${botToken}`)
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'cbot_logs', filter: `bot_token=eq.${botToken}` },
        (payload) => { addLog(payload.new.message, payload.new.created_at, payload.new.log_type); }
      )
      .subscribe();

    return () => { supabase.removeChannel(logChannel); }
  }, [botToken, userId, addLog, supabase]);


  const handleControl = async (action: 'start' | 'stop') => {
    addLog(`Sending ${action.toUpperCase()} command to Cloud Bridge...`);
    try {
      const res = await fetch('/api/terminal/control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform: 'ctrader', action }),
      });

      if (res.ok) {
        setStatus(action === 'start' ? 'running' : 'stopped');
        sessionStorage.setItem('ctrader_bridge_status', action === 'start' ? 'running' : 'stopped');
        addLog(`cTrader Bridge: ${action === 'start' ? 'ACTIVE & LISTENING' : 'OFFLINE'}.`);
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center ">
        <div className="flex flex-col items-center justify-center py-20 animate-pulse">
          <Activity size={40} className="text-cyan-500 mb-4 animate-spin" />
          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-cyan-800">Initializing Secure Bridge...</p>
        </div>
      </div>
    );
  }

  if (error || (userTier !== null && userTier < 2)) {
    return (
      <div className="min-h-screen  flex flex-col items-center justify-center p-6 text-center">
        <ShieldAlert className="text-red-500 mb-4" size={48} />
        <h2 className="text-2xl font-black text-zinc-900 dark:text-white uppercase italic tracking-tighter">Access Denied</h2>
        <p className="text-zinc-600 dark:text-zinc-500 text-sm mt-2 max-w-xs">{error || "This feature requires a PRO (Tier 2) subscription."}</p>
      </div>
    );
  }

  const apiBaseUrl = "https://kimoocrt.vercel.app/api/signals";
  const fullUrl = botToken ? `${apiBaseUrl}?botId=${botToken}` : "Generating Token...";

  return (
    <div className="relative p-4 md:p-12 lg:p-16 lg:ml-72 min-h-screen text-zinc-900 dark:text-white font-sans overflow-x-hidden">

      {/* Ambient Glowing Backgrounds */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-cyan-600/10 blur-[150px] rounded-full mix-blend-screen" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-blue-600/10 blur-[150px] rounded-full mix-blend-screen" />
      </div>

      <div className="max-w-[1700px] mx-auto relative z-10 space-y-6 md:space-y-8">

        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-8 md:mb-12">
          <div>
            <h1 className="text-2xl md:text-4xl font-black tracking-tighter italic flex items-center gap-3 uppercase text-zinc-900 dark:text-white">
              <img src="/ctrader-logo.png" alt="cTrader" className="w-8 h-8 md:w-10 md:h-10 object-contain drop-shadow-[0_0_15px_rgba(6,182,212,0.5)]" />
              cTrader<span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">Terminal</span>
            </h1>
            <p className="text-[10px] uppercase tracking-[0.4em] text-zinc-600 dark:text-zinc-500 font-bold mt-3 leading-none">
              • CLOUD EXECUTION BRIDGE •
            </p>
          </div>

          <div className="flex items-center gap-3 px-5 py-2.5 bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-xl backdrop-blur-md shadow-xl">
            <div className={`w-2.5 h-2.5 rounded-full ${status === 'running' ? 'bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.8)]' : 'bg-red-400 shadow-[0_0_10px_rgba(248,113,113,0.8)]'} animate-pulse`} />
            <span className={`text-[10px] font-black uppercase tracking-widest ${status === 'running' ? 'text-cyan-400' : 'text-red-400'}`}>
              {status === 'running' ? 'BRIDGE ONLINE' : 'BRIDGE OFFLINE'}
            </span>
          </div>
        </div>

        <div className="max-w-[800px] mx-auto grid grid-cols-1 gap-6 md:gap-8">
          <div className="space-y-6 md:space-y-8">
            <div className="bg-gradient-to-br from-white/[0.04] to-white/[0.01] border border-[var(--glass-border)] p-6 md:p-8 rounded-[2.5rem] shadow-2xl backdrop-blur-md">
              <h2 className="text-[11px] font-black text-zinc-900 dark:text-white uppercase tracking-widest mb-6 flex items-center gap-3">
                <Settings2 size={16} className="text-cyan-400" /> Bridge Controls
              </h2>

              <button
                onClick={() => handleControl('start')}
                disabled={status === 'running'}
                className={`w-full py-4 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all duration-300 flex items-center justify-center gap-3 mb-4 active:scale-95 ${status === 'running'
                  ? 'bg-[var(--glass-bg)] border border-[var(--glass-border)] text-zinc-600 cursor-not-allowed shadow-none'
                  : 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-zinc-900 dark:text-white shadow-[0_0_30px_rgba(6,182,212,0.3)] hover:shadow-[0_0_40px_rgba(6,182,212,0.5)] border border-cyan-500/30'
                  }`}
              >
                <Power size={16} className={status === 'running' ? 'text-zinc-600' : 'text-cyan-200'} /> START BRIDGE
              </button>

              <button
                onClick={() => handleControl('stop')}
                disabled={status === 'stopped'}
                className={`w-full py-4 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all duration-300 flex items-center justify-center gap-3 active:scale-95 ${status === 'stopped'
                  ? 'bg-[var(--glass-bg)] border border-[var(--glass-border)] text-zinc-600 cursor-not-allowed shadow-none'
                  : 'bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 hover:shadow-[0_0_30px_rgba(239,68,68,0.2)]'
                  }`}
              >
                <Power size={16} /> STOP BRIDGE
              </button>

            </div>
          </div>

        </div>

        <div className="mt-20 md:mt-32 space-y-20 relative">
          <div className="text-center space-y-4">
            <h2 className="text-3xl md:text-5xl font-black tracking-tighter italic uppercase">
              Guardian<span className="text-cyan-500">Deployment</span> Guide
            </h2>
            <p className="text-[10px] uppercase tracking-[0.4em] text-zinc-500 font-bold max-w-2xl mx-auto">
              Select your license tier and follow the institutional setup protocol for cTrader.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="group relative bg-gradient-to-br from-zinc-900/50 to-zinc-950/50 border border-white/5 p-8 md:p-12 rounded-[3rem] overflow-hidden">
              <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
                <Activity size={120} className="text-cyan-400" />
              </div>
              <div className="relative z-10 space-y-6">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-cyan-500/10 border border-cyan-500/20 rounded-full text-[10px] font-black text-cyan-400 uppercase tracking-widest">
                  Standard Access
                </div>
                <h3 className="text-3xl font-black italic tracking-tighter uppercase">Kimoo<span className="text-cyan-500">Pro</span></h3>
                <p className="text-zinc-400 text-sm leading-relaxed">
                  Automated trend-following for cTrader users. Focuses on safe execution and capital preservation.
                </p>
                <ul className="space-y-4 pt-4">
                  {[
                    'Simplified Market Orders',
                    'Trend-Alignment Auto-Filter',
                    'Prop-Firm Risk Management',
                    'Standard High-Quality Sweeps',
                    '3 Max Concurrent Setups'
                  ].map((feat, i) => (
                    <li key={i} className="flex items-center gap-3 text-xs font-bold text-zinc-300">
                      <div className="w-1.5 h-1.5 rounded-full bg-cyan-500" /> {feat}
                    </li>
                  ))}
                </ul>
                <a
                  href={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/bot-files/KimooGuardian_Pro.algo`}
                  download
                  className="w-full py-4 bg-zinc-800 hover:bg-zinc-700 border border-white/5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all text-center block"
                >
                  Download Pro cBot
                </a>
              </div>
            </div>

            <div className="group relative bg-gradient-to-br from-cyan-600/10 to-blue-600/5 border border-cyan-500/20 p-8 md:p-12 rounded-[3rem] overflow-hidden shadow-[0_0_50px_rgba(6,182,212,0.1)]">
              <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
                <Terminal size={120} className="text-blue-400" />
              </div>
              <div className="relative z-10 space-y-6">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-blue-500/20 border border-blue-500/30 rounded-full text-[10px] font-black text-blue-300 uppercase tracking-widest">
                  Elite Access
                </div>
                <h3 className="text-3xl font-black italic tracking-tighter uppercase">Kimoo<span className="text-blue-400">Ultimate</span></h3>
                <p className="text-zinc-300 text-sm leading-relaxed">
                  Maximum precision for cTrader. Use institutional-grade limit entries and deep confluence filtering.
                </p>
                <ul className="space-y-4 pt-4">
                  {[
                    'OTE Zone Limit Orders (Auto-R:R)',
                    'Full Confluence Controls',
                    'Advanced AI Filter Matrix',
                    'Dynamic Risk Scaling',
                    '5+ Max Concurrent Setups'
                  ].map((feat, i) => (
                    <li key={i} className="flex items-center gap-3 text-xs font-bold text-blue-200">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-400" /> {feat}
                    </li>
                  ))}
                </ul>
                <a
                  href={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/bot-files/KimooGuardian_Ultimate.algo`}
                  download
                  className="w-full py-4 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-xl text-center block"
                >
                  Download Ultimate cBot
                </a>
              </div>
            </div>
          </div>

          <div className="bg-zinc-900/30 border border-white/5 rounded-[3rem] p-8 md:p-16">
            <div className="max-w-4xl mx-auto space-y-12">
              <div className="space-y-4">
                <h3 className="text-2xl md:text-3xl font-black italic tracking-tighter uppercase">Installation <span className="text-cyan-500">Protocol</span></h3>
                <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest">Follow these steps to synchronize your cTrader terminal with the Kimoo Cloud.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-16 gap-y-12">
                {[
                  { title: 'Files Deployment', desc: 'Download the .algo file and double-click it. cTrader will automatically install the bot into your cBot library.' },
                  { title: 'Instance Creation', desc: 'In cTrader Automate tab, find "Kimoo Guardian" and click the "+" button to create a new instance on your chosen symbol.' },
                  { title: 'Access Rights', desc: 'Ensure the bot has "Full Access" rights enabled. This is required for the bot to communicate with our Cloud API.' },
                  { title: 'Cloud Sync', desc: 'Copy your Unique UUID (License Key) from your profile settings and paste it into the "License Key" parameter in the cBot settings.' },
                  { title: 'Engine Start', desc: 'Click the "Start Bridge" button at the top of this page, then click "Start" on your cBot instance in cTrader.' }
                ].map((step, i) => (
                  <div key={i} className="flex gap-6">
                    <div className="shrink-0 w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 font-black italic">
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
  );
}
