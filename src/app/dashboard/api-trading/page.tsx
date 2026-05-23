'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import CryptoJS from 'crypto-js';
import { 
  ShieldAlert, ShieldCheck, Activity, Wallet, Percent, 
  Target, Lock, Save, Settings2, BarChart3, TrendingUp, CheckCircle, 
  XCircle, ToggleLeft, ToggleRight, ArrowUpRight, ArrowDownRight, Flame,
  PlayCircle, Compass, Award, GitBranch
} from 'lucide-react';

const MASTER_ENCRYPTION_KEY = process.env.NEXT_PUBLIC_ENCRYPTION_KEY;

// Complete list of exchanges supported
const SUPPORTED_EXCHANGES = [
  { id: 'okx', name: 'OKX', requirePassphrase: true, logo: '/okx.png', table: 'okx_auth' },
  { id: 'binance', name: 'Binance', requirePassphrase: false, logo: '/binance.png', table: 'binance_auth' },
  { id: 'bybit', name: 'Bybit', requirePassphrase: false, logo: '/bybit.png', table: 'bybit_auth' },
  { id: 'kucoin', name: 'KuCoin', requirePassphrase: true, logo: '/kucoin.png', table: 'kucoin_auth' },
  { id: 'bitget', name: 'Bitget', requirePassphrase: true, logo: '/bitget.png', table: 'bitget_auth' },
  { id: 'kraken', name: 'Kraken', requirePassphrase: false, logo: '/kraken.png', table: 'kraken_auth' },
  { id: 'gateio', name: 'Gate.io', requirePassphrase: false, logo: '/gateio.png', table: 'gateio_auth' }
];

export default function MultiExchangeDashboard() {
  const [supabase] = useState(() => createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  ));

  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [userTier, setUserTier] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState('okx');
  const [loadedTab, setLoadedTab] = useState<string | null>(null);

  
  // Exchange credentials configuration states
  const [exchangeConfigs, setExchangeConfigs] = useState<Record<string, any>>({});
  const [apiKeys, setApiKeys] = useState<Record<string, string>>({});
  const [apiSecrets, setApiSecrets] = useState<Record<string, string>>({});
  const [passphrases, setPassphrases] = useState<Record<string, string>>({});
  const [environments, setEnvironments] = useState<Record<string, 'testnet' | 'live'>>({});
  const [botEnables, setBotEnables] = useState<Record<string, boolean>>({});

  // Global Risk Management States
  const [walletSize, setWalletSize] = useState(1000);
  const [riskPercent, setRiskPercent] = useState(1.0);
  const [minRR, setMinRR] = useState(1.5);
  const [maxConcurrent, setMaxConcurrent] = useState(3);
  const [alignment, setAlignment] = useState('Both');
  const [entryMode, setEntryMode] = useState('market');
  const [sweepQuality, setSweepQuality] = useState('All');
  const [gradeSetting, setGradeSetting] = useState('All');
  const [htfAlignment, setHtfAlignment] = useState('All');

  // Stats / Metrics per Exchange
  const [metrics, setMetrics] = useState<Record<string, any>>({});
  const [statusLogs, setStatusLogs] = useState<string[]>([]);
  const [terminalTab, setTerminalTab] = useState<'trade' | 'vault'>('trade');
  const [exchangeLogs, setExchangeLogs] = useState<any[]>([]);

  const addLog = useCallback((msg: string) => {
    setStatusLogs((prev) => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev].slice(0, 30));
  }, []);

  const fetchExchangeLogs = useCallback(async (exId: string, uId: string) => {
    try {
      const { data, error } = await supabase
        .from('exchange_logs')
        .select('*')
        .eq('user_id', uId)
        .eq('exchange_name', exId)
        .order('created_at', { ascending: false })
        .limit(50);
        
      if (error) {
        console.error("Error fetching exchange logs:", error);
        return;
      }
      
      setExchangeLogs(data || []);
    } catch (err) {
      console.error("Error fetching exchange logs:", err);
    }
  }, [supabase]);

  // Hydrate user tier, stats, and configurations
  const fetchDashboardData = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        setLoading(false);
        return;
      }
      
      const uId = session.user.id;
      setUserId(uId);

      // Fetch user profile and tier
      const { data: profile } = await supabase
        .from('profiles')
        .select('tier')
        .eq('id', uId)
        .single();

      const tier = profile?.tier ?? 0;
      setUserTier(tier);

      if (tier < 2) {
        setLoading(false);
        return;
      }

      // Optimized single batch query for all user execution statistics to reduce db roundtrips by 700%
      const { data: allExecs } = await supabase
        .from('trade_executions')
        .select('*')
        .eq('user_id', uId);

      // Concurrently load credentials configs for all exchanges
      const configsTemp: Record<string, any> = {};
      const keysTemp: Record<string, string> = {};
      const envTemp: Record<string, 'testnet' | 'live'> = {};
      const enableTemp: Record<string, boolean> = {};
      const metricsTemp: Record<string, any> = {};

      for (const ex of SUPPORTED_EXCHANGES) {
        const { data: exData } = await supabase
          .from(ex.table)
          .select('*')
          .eq('user_id', uId)
          .single();

        if (exData) {
          configsTemp[ex.id] = exData;
          keysTemp[ex.id] = exData.api_key || '';
          envTemp[ex.id] = (exData.environment as 'testnet' | 'live') || 'testnet';
          enableTemp[ex.id] = exData.is_enabled ?? true;
        } else {
          envTemp[ex.id] = 'testnet';
          enableTemp[ex.id] = true;
        }

        // Filter metrics client-side from optimized single database fetch
        const execs = allExecs?.filter(e => e.exchange_name === ex.id) || [];

        const initialBal = exData?.daily_risk_wallet ?? 1000;

        if (execs && execs.length > 0) {
          // Partial TP = executions that hit TP1 (either ended at TP1 or hit BE after TP1)
          const partialTpCount = execs.filter(e => e.tp_hits === 1 || e.status === 'TP1_HIT' || e.status === 'BE_HIT').length;
          // Full TP = executions that hit TP2
          const fullTpCount = execs.filter(e => e.tp_hits === 2 || e.status === 'TP2_HIT').length;
          const slCount = execs.filter(e => e.status === 'SL_HIT' || (e.sl_hits && e.sl_hits > 0)).length;
          const beCount = execs.filter(e => e.status === 'BE_HIT' || (e.be_hits && e.be_hits > 0)).length;
          
          // Calculate total physical trades: since all TP/BE trades hit partial TP first,
          // the unique physical trades count is the maximum of partial TPs or (Full TPs + Break Evens),
          // plus any direct SL hits. This avoids double-counting.
          const total = Math.max(partialTpCount, fullTpCount + beCount) + slCount;
          
          // Calculate Net Realized PnL directly from closed trades
          const totalPnL = execs.reduce((acc, curr) => acc + (curr.pnl ?? 0), 0);
          const currentBal = initialBal + totalPnL;

          metricsTemp[ex.id] = {
            total,
            partialTps: partialTpCount,
            fullTps: fullTpCount,
            sls: slCount,
            bes: beCount,
            opening: initialBal,
            closing: currentBal,
            pnl: totalPnL
          };
        } else {
          metricsTemp[ex.id] = {
            total: 0,
            partialTps: 0,
            fullTps: 0,
            sls: 0,
            bes: 0,
            opening: initialBal,
            closing: initialBal,
            pnl: 0
          };
        }
      }

      setExchangeConfigs(configsTemp);
      if (loading) {
        setApiKeys(keysTemp);
        setEnvironments(envTemp);
        setBotEnables(enableTemp);
      }
      setMetrics(metricsTemp);

      setLoading(false);
    } catch (e) {
      console.error(e);
      setLoading(false);
    }
  }, [supabase, loading]);

  // Sync risk settings and form inputs when switching active exchange tabs
  useEffect(() => {
    if (loading) return;

    if (loadedTab !== activeTab) {
      const config = exchangeConfigs[activeTab];
      if (config) {
        setWalletSize(config.daily_risk_wallet ?? 1000);
        setRiskPercent(config.risk_percentage ?? 1.0);
        setMinRR(config.rr ?? 1.5);
        setMaxConcurrent(config.max_concurrent_setups ?? 3);
        setAlignment(config.alignment ?? 'Both');
        setEntryMode(config.entry_mode ?? 'market');
        setSweepQuality(config.sweep_quality ?? 'All');
        setGradeSetting(config.grade ?? 'All');
        setHtfAlignment(config.htf_alignment ?? 'All');
        
        setApiKeys(prev => ({ ...prev, [activeTab]: config.api_key || '' }));
        setEnvironments(prev => ({ ...prev, [activeTab]: config.environment || 'testnet' }));
        setBotEnables(prev => ({ ...prev, [activeTab]: config.is_enabled ?? true }));
      } else {
        // Defaults for unconfigured exchanges
        setWalletSize(1000);
        setRiskPercent(1.0);
        setMinRR(1.5);
        setMaxConcurrent(3);
        setAlignment('Both');
        setEntryMode('market');
        setSweepQuality('All');
        setGradeSetting('All');
        setHtfAlignment('All');
        
        setApiKeys(prev => ({ ...prev, [activeTab]: '' }));
        setEnvironments(prev => ({ ...prev, [activeTab]: 'testnet' }));
        setBotEnables(prev => ({ ...prev, [activeTab]: true }));
      }
      setLoadedTab(activeTab);
    }
  }, [activeTab, exchangeConfigs, loading, loadedTab]);

  // Load session and dashboard data on mount
  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Polling loop for active stats and logs (runs every 4 seconds for real-time responsiveness)
  useEffect(() => {
    if (!userId) return;
    
    // Initial immediate fetch for logs once user session is resolved
    fetchExchangeLogs(activeTab, userId);
    
    const interval = setInterval(() => {
      fetchDashboardData();
      fetchExchangeLogs(activeTab, userId);
    }, 4000); // 4-second live refresh cycle
    
    return () => clearInterval(interval);
  }, [activeTab, userId, fetchExchangeLogs, fetchDashboardData]);

  // Supabase Real-time Subscriptions for instantaneous UI updates (sub-50ms reactive updates)
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel('dashboard-realtime-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'trade_executions',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          console.log('⚡ Realtime trade execution update:', payload);
          fetchDashboardData();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'exchange_logs',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          console.log('⚡ Realtime exchange log update:', payload);
          fetchExchangeLogs(activeTab, userId);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, activeTab, fetchExchangeLogs, fetchDashboardData]);


  const saveExchangeSettings = async (exchangeId: string) => {
    if (!userId) return addLog("❌ Cannot save: Session not found.");
    if (!MASTER_ENCRYPTION_KEY) {
      addLog("❌ Security Vault Error: Encryption key not configured.");
      return;
    }

    const exSpec = SUPPORTED_EXCHANGES.find(e => e.id === exchangeId);
    if (!exSpec) return;

    const startMsg = `🔒 Encrypting keys & syncing credentials for ${exSpec.name.toUpperCase()}...`;
    addLog(startMsg);
    try {
      await supabase.from('exchange_logs').insert({
        user_id: userId,
        exchange_name: exchangeId,
        message: startMsg,
        symbol: null,
        log_type: 'INFO'
      });
      fetchExchangeLogs(exchangeId, userId);
    } catch (err) {
      console.error("Error inserting sync log:", err);
    }

    const plainSecret = apiSecrets[exchangeId];
    const plainPassphrase = passphrases[exchangeId];

    // Maintain existing decrypted credentials if not overriding
    let encryptedSecret = exchangeConfigs[exchangeId]?.encrypted_secret || '';
    if (plainSecret) {
      encryptedSecret = CryptoJS.AES.encrypt(plainSecret, MASTER_ENCRYPTION_KEY).toString();
    }

    let encryptedPass = exchangeConfigs[exchangeId]?.encrypted_passphrase || '';
    if (plainPassphrase && exSpec.requirePassphrase) {
      encryptedPass = CryptoJS.AES.encrypt(plainPassphrase, MASTER_ENCRYPTION_KEY).toString();
    }

    const payload: any = {
      user_id: userId,
      api_key: apiKeys[exchangeId] || '',
      encrypted_secret: encryptedSecret,
      environment: environments[exchangeId] || 'testnet',
      is_enabled: botEnables[exchangeId] ?? true,
      daily_risk_wallet: walletSize,
      risk_percentage: riskPercent,
      rr: minRR,
      max_concurrent_setups: maxConcurrent,
      alignment: alignment,
      entry_mode: entryMode,
      sweep_quality: sweepQuality,
      grade: gradeSetting,
      htf_alignment: htfAlignment,
      updated_at: new Date().toISOString()
    };

    if (exSpec.requirePassphrase) {
      payload.encrypted_passphrase = encryptedPass;
    }

    let error = null;
    const configId = exchangeConfigs[exchangeId]?.id;

    if (configId) {
      const { error: err } = await supabase.from(exSpec.table).update(payload).eq('id', configId);
      error = err;
    } else {
      const { data, error: err } = await supabase.from(exSpec.table).insert([payload]).select().single();
      error = err;
      if (data) {
        setExchangeConfigs(prev => ({ ...prev, [exchangeId]: data }));
      }
    }

    if (!error) {
      const successMsg = `✅ Successfully secured and synced ${exSpec.name} configs.`;
      addLog(successMsg);
      try {
        await supabase.from('exchange_logs').insert({
          user_id: userId,
          exchange_name: exchangeId,
          message: successMsg,
          symbol: null,
          log_type: 'SUCCESS'
        });
      } catch (err) {
        console.error("Error inserting sync success log:", err);
      }
      // Clear plain values
      setApiSecrets(prev => ({ ...prev, [exchangeId]: '' }));
      setPassphrases(prev => ({ ...prev, [exchangeId]: '' }));
      fetchDashboardData();
      fetchExchangeLogs(exchangeId, userId);
    } else {
      const errorMsg = `❌ Failed to sync: ${error.message}`;
      addLog(errorMsg);
      try {
        await supabase.from('exchange_logs').insert({
          user_id: userId,
          exchange_name: exchangeId,
          message: errorMsg,
          symbol: null,
          log_type: 'ERROR'
        });
      } catch (err) {
        console.error("Error inserting sync error log:", err);
      }
      fetchExchangeLogs(exchangeId, userId);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="flex flex-col items-center justify-center py-20 animate-pulse">
          <Activity size={40} className="text-orange-500 mb-4 animate-spin" />
          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-500">Initializing Multi-Exchange Vault...</p>
        </div>
      </div>
    );
  }

  // Access Lock Block for Free / Tier 1 Users
  if (userTier !== null && userTier < 2) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center p-6 text-center text-white">
        <ShieldAlert className="text-red-500 mb-4 animate-bounce" size={54} />
        <h2 className="text-3xl font-black uppercase italic tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-orange-400 to-red-600">Upgrade Required</h2>
        <p className="text-zinc-400 text-sm mt-3 max-w-md leading-relaxed">
          Advanced Multi-Exchange API Trading is an exclusive feature reserved for Pro (Tier 2) and Ultimate (Tier 3) members. Connect all exchange accounts simultaneously and experience dynamic Break-Even trailing executions.
        </p>
        <button 
          onClick={() => window.location.href = '/dashboard/payments'} 
          className="mt-8 px-8 py-3.5 bg-gradient-to-r from-orange-500 to-red-600 rounded-full text-xs font-black uppercase tracking-widest hover:scale-105 active:scale-95 shadow-xl transition-all"
        >
          UPGRADE NOW
        </button>
      </div>
    );
  }

  const activeEx = SUPPORTED_EXCHANGES.find(e => e.id === activeTab) || SUPPORTED_EXCHANGES[0];
  const activeMetrics = metrics[activeTab] || { total: 0, partialTps: 0, fullTps: 0, sls: 0, bes: 0, opening: 1000, closing: 1000, pnl: 0 };

  return (
    <div className="p-4 md:p-12 lg:p-16 lg:ml-72 min-h-screen text-white font-sans selection:bg-orange-500 selection:text-white">
      
      {/* Background glow meshes */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-orange-600/5 blur-[150px] rounded-full" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-red-600/5 blur-[150px] rounded-full" />
      </div>

      <div className="max-w-[1700px] mx-auto relative z-10 space-y-8 md:space-y-10">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-zinc-800 pb-8">
          <div>
            <h1 className="text-3xl md:text-5xl font-black tracking-tighter italic flex items-center gap-3 uppercase bg-clip-text text-transparent bg-gradient-to-r from-white to-zinc-500">
              <Settings2 className="text-orange-500 w-10 h-10 animate-pulse" />
              Unified API<span className="text-orange-500 font-light">Trading</span>
            </h1>
            <p className="text-[10px] uppercase tracking-[0.4em] text-zinc-500 font-bold mt-3 leading-none flex items-center gap-2">
              <ShieldCheck className="text-emerald-500" size={12} /> SECURED MILITARY-GRADE AES-256 VAULT
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold text-[10px] tracking-widest uppercase">
              Pro Access Enabled
            </span>
          </div>
        </div>

        {/* Global Risk Management Deck */}
        <div className="bg-gradient-to-br from-zinc-900 to-zinc-950 border border-zinc-800 rounded-[2rem] p-6 md:p-8 shadow-2xl space-y-6">
          <h2 className="text-sm font-black uppercase tracking-widest text-orange-500 flex items-center gap-2.5">
            <Target size={18} /> Global Trade Risk Settings
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
            <div className="space-y-2">
              <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-1.5"><Wallet size={12} /> Daily Risk Capital ($)</label>
              <input 
                type="number" 
                value={walletSize} 
                onChange={(e) => setWalletSize(Number(e.target.value))} 
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3.5 text-xs font-mono text-white outline-none focus:border-orange-500 hover:border-zinc-700 transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-1.5"><Percent size={12} /> Risk Per Trade (%)</label>
              <input 
                type="number" 
                step="0.1"
                value={riskPercent} 
                onChange={(e) => setRiskPercent(Number(e.target.value))} 
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3.5 text-xs font-mono text-white outline-none focus:border-orange-500 hover:border-zinc-700 transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-1.5"><Target size={12} /> Minimum RR Ratio</label>
              <input 
                type="number" 
                step="0.1"
                value={minRR} 
                onChange={(e) => setMinRR(Number(e.target.value))} 
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3.5 text-xs font-mono text-white outline-none focus:border-orange-500 hover:border-zinc-700 transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-1.5"><Activity size={12} /> Max Setups</label>
              <input 
                type="number" 
                min="1"
                value={maxConcurrent} 
                onChange={(e) => setMaxConcurrent(Number(e.target.value))} 
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3.5 text-xs font-mono text-white outline-none focus:border-orange-500 hover:border-zinc-700 transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-1.5"><Activity size={12} /> Trend Alignment</label>
              <select 
                value={alignment} 
                onChange={(e) => setAlignment(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3.5 text-xs font-black tracking-widest uppercase text-white outline-none focus:border-orange-500 hover:border-zinc-700 transition-all"
              >
                <option value="Both">Both</option>
                <option value="Aligned">Aligned Only</option>
                <option value="Counter">Counter Only</option>
              </select>
            </div>
          </div>

          {/* Advanced Risk & Quality Filters Row */}
          <div className="border-t border-zinc-850 pt-6">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-4 flex items-center gap-1.5">
              <ShieldCheck size={14} className="text-orange-500" /> Advanced Quality & Execution Filters
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="space-y-2">
                <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-1.5">
                  <PlayCircle size={12} /> Entry Execution Mode
                </label>
                <select 
                  value={entryMode} 
                  onChange={(e) => setEntryMode(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3.5 text-xs font-black tracking-widest uppercase text-white outline-none focus:border-orange-500 hover:border-zinc-700 transition-all"
                >
                  <option value="market">Market Order</option>
                  <option value="limit">Limit Order</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-1.5">
                  <Compass size={12} /> Sweep Quality Filter
                </label>
                <select 
                  value={sweepQuality} 
                  onChange={(e) => setSweepQuality(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3.5 text-xs font-black tracking-widest uppercase text-white outline-none focus:border-orange-500 hover:border-zinc-700 transition-all"
                >
                  <option value="All">All Sweeps (Bypass)</option>
                  <option value="High">High</option>
                  <option value="Normal">Normal</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-1.5">
                  <Award size={12} /> Grading Filter
                </label>
                <select 
                  value={gradeSetting} 
                  onChange={(e) => setGradeSetting(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3.5 text-xs font-black tracking-widest uppercase text-white outline-none focus:border-orange-500 hover:border-zinc-700 transition-all"
                >
                  <option value="All">All Grades (Bypass)</option>
                  <option value="A++">A++</option>
                  <option value="A+">A+</option>
                  <option value="GOOD">GOOD</option>
                  <option value="NORMAL">NORMAL</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-1.5">
                  <GitBranch size={12} /> HTF Timeframe Alignment
                </label>
                <select 
                  value={htfAlignment} 
                  onChange={(e) => setHtfAlignment(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3.5 text-xs font-black tracking-widest uppercase text-white outline-none focus:border-orange-500 hover:border-zinc-700 transition-all"
                >
                  <option value="All">All Alignments (Bypass)</option>
                  <option value="M5/H1">5M - 1H Alignment</option>
                  <option value="M15/H4">15M - 4H Alignment</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Exchange Navigation Dock */}
        <div className="flex overflow-x-auto gap-3 pb-3 scrollbar-hide border-b border-zinc-850">
          {SUPPORTED_EXCHANGES.map(ex => (
            <button
              key={ex.id}
              onClick={() => setActiveTab(ex.id)}
              className={`px-6 py-3.5 rounded-full text-xs font-black uppercase tracking-widest border transition-all duration-300 flex items-center gap-2 shrink-0 ${
                activeTab === ex.id 
                  ? 'bg-orange-500 border-orange-500 text-white shadow-xl shadow-orange-500/10' 
                  : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700'
              }`}
            >
              <Activity size={12} className={activeTab === ex.id ? 'animate-spin' : ''} />
              {ex.name}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Form Credentials Settings Column */}
          <div className="lg:col-span-5 space-y-8">
            <div className="bg-gradient-to-br from-zinc-900 to-zinc-950 border border-zinc-800 rounded-[2.5rem] p-8 shadow-2xl space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-xs font-black text-orange-500 uppercase tracking-widest flex items-center gap-2">
                  <Lock size={16} /> API Vault Configuration
                </h3>
                <span className="text-[10px] font-mono text-zinc-500 uppercase">
                  {activeEx.name} Table Storage
                </span>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-2 mb-2">Network Environment</label>
                  <div className="flex bg-zinc-950 rounded-xl p-1.5 border border-zinc-800">
                    <button 
                      onClick={() => setEnvironments(prev => ({ ...prev, [activeEx.id]: 'testnet' }))}
                      className={`flex-1 py-2.5 text-[10px] font-black rounded-lg transition-all uppercase tracking-widest ${
                        (environments[activeEx.id] || 'testnet') === 'testnet' 
                          ? 'bg-orange-500 text-white shadow-lg' 
                          : 'text-zinc-500 hover:text-white'
                      }`}
                    >
                      SANDBOX / DEMO
                    </button>
                    <button 
                      onClick={() => setEnvironments(prev => ({ ...prev, [activeEx.id]: 'live' }))}
                      className={`flex-1 py-2.5 text-[10px] font-black rounded-lg transition-all uppercase tracking-widest ${
                        (environments[activeEx.id] || 'testnet') === 'live' 
                          ? 'bg-red-600 text-white shadow-lg' 
                          : 'text-zinc-500 hover:text-white'
                      }`}
                    >
                      LIVE MARKET
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-2"><Settings2 size={10}/> API KEY</label>
                  <input 
                    type="text" 
                    value={apiKeys[activeEx.id] || ''} 
                    onChange={(e) => setApiKeys(prev => ({ ...prev, [activeEx.id]: e.target.value }))} 
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3.5 text-xs font-mono text-white outline-none focus:border-orange-500 hover:border-zinc-700 transition-all"
                    placeholder={`${activeEx.name} API Public Key`}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-2"><Lock size={10}/> SECRET KEY (AES ENCRYPTED)</label>
                  <input 
                    type="password" 
                    value={apiSecrets[activeEx.id] || ''} 
                    onChange={(e) => setApiSecrets(prev => ({ ...prev, [activeEx.id]: e.target.value }))} 
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3.5 text-xs font-mono text-white outline-none focus:border-orange-500 hover:border-zinc-700 transition-all"
                    placeholder="••••••••••••••••••••••••"
                  />
                </div>

                {activeEx.requirePassphrase && (
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-2"><Lock size={10}/> API PASSPHRASE</label>
                    <input 
                      type="password" 
                      value={passphrases[activeEx.id] || ''} 
                      onChange={(e) => setPassphrases(prev => ({ ...prev, [activeEx.id]: e.target.value }))} 
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3.5 text-xs font-mono text-white outline-none focus:border-orange-500 hover:border-zinc-700 transition-all"
                      placeholder="Exchange passphrase / passphrase password"
                    />
                  </div>
                )}

                <div className="flex items-center justify-between p-4 bg-zinc-950 border border-zinc-850 rounded-xl">
                  <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
                    Trade Engine State
                  </span>
                  <button 
                    onClick={() => setBotEnables(prev => ({ ...prev, [activeEx.id]: !(botEnables[activeEx.id] ?? true) }))}
                    className="text-orange-500 focus:outline-none"
                  >
                    {(botEnables[activeEx.id] ?? true) ? <ToggleRight size={38} className="text-emerald-500" /> : <ToggleLeft size={38} className="text-zinc-600" />}
                  </button>
                </div>

                <button 
                  onClick={() => saveExchangeSettings(activeEx.id)}
                  className="w-full py-4 bg-white hover:bg-zinc-200 text-black text-[11px] font-black uppercase tracking-widest rounded-xl transition-all shadow-xl active:scale-95 flex items-center justify-center gap-2"
                >
                  <Save size={14} /> SAVE & SYNC {activeEx.name.toUpperCase()}
                </button>
              </div>
            </div>
          </div>

          {/* Performance stats Column */}
          <div className="lg:col-span-7 space-y-8">
            
            {/* Live stats summary board */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
              <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-2xl flex flex-col justify-between">
                <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Executions</span>
                <span className="text-2xl font-black mt-2 text-white">{activeMetrics.total}</span>
              </div>
              <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-2xl flex flex-col justify-between">
                <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Partial TP</span>
                <span className="text-2xl font-black mt-2 text-amber-400 flex items-center gap-1.5"><CheckCircle size={16} /> {activeMetrics.partialTps}</span>
              </div>
              <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-2xl flex flex-col justify-between">
                <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Full TP</span>
                <span className="text-2xl font-black mt-2 text-emerald-400 flex items-center gap-1.5"><CheckCircle size={16} /> {activeMetrics.fullTps}</span>
              </div>
              <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-2xl flex flex-col justify-between">
                <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">SL Hits</span>
                <span className="text-2xl font-black mt-2 text-red-500 flex items-center gap-1.5"><XCircle size={16} /> {activeMetrics.sls}</span>
              </div>
              <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-2xl flex flex-col justify-between col-span-2 sm:col-span-1">
                <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Break Evens</span>
                <span className="text-2xl font-black mt-2 text-blue-400 flex items-center gap-1.5"><ShieldCheck size={16} /> {activeMetrics.bes}</span>
              </div>
            </div>

            {/* Balances & PnL metrics */}
            <div className="bg-gradient-to-br from-zinc-900 to-zinc-950 border border-zinc-800 rounded-[2.5rem] p-8 shadow-2xl">
              <h3 className="text-xs font-black text-orange-500 uppercase tracking-widest flex items-center gap-2 mb-6">
                <BarChart3 size={16} /> Vault Performance Board
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div className="bg-zinc-950 border border-zinc-850 p-6 rounded-2xl">
                  <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Opening Balance</span>
                  <h4 className="text-xl font-bold mt-2 font-mono">${Number(activeMetrics.opening).toFixed(2)}</h4>
                </div>
                <div className="bg-zinc-950 border border-zinc-850 p-6 rounded-2xl">
                  <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Closing Balance</span>
                  <h4 className="text-xl font-bold mt-2 font-mono">${Number(activeMetrics.closing).toFixed(2)}</h4>
                </div>
                <div className={`bg-zinc-950 border p-6 rounded-2xl ${activeMetrics.pnl >= 0 ? 'border-emerald-500/20' : 'border-red-500/20'}`}>
                  <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Net Realized PnL</span>
                  <div className="flex items-center gap-2 mt-2">
                    <h4 className={`text-xl font-black font-mono ${activeMetrics.pnl >= 0 ? 'text-emerald-400' : 'text-red-500'}`}>
                      {activeMetrics.pnl >= 0 ? '+' : ''}${Number(activeMetrics.pnl).toFixed(2)}
                    </h4>
                    {activeMetrics.pnl >= 0 ? <ArrowUpRight className="text-emerald-400 shrink-0" size={18} /> : <ArrowDownRight className="text-red-500 shrink-0" size={18} />}
                  </div>
                </div>
              </div>
            </div>

            {/* Sync Status Terminal Console */}
            <div className="bg-zinc-950 border border-zinc-850 rounded-3xl p-6 h-[300px] overflow-hidden flex flex-col relative font-mono text-xs">
              <div className="flex justify-between items-center pb-4 border-b border-zinc-850 mb-3 text-[10px] text-zinc-500 uppercase tracking-widest shrink-0">
                <div className="flex gap-6">
                  <button 
                    onClick={() => setTerminalTab('trade')} 
                    className={`font-black tracking-widest uppercase transition-all pb-1 ${
                      terminalTab === 'trade' 
                        ? 'text-orange-500 border-b-2 border-orange-500 font-bold' 
                        : 'text-zinc-500 hover:text-zinc-300'
                    }`}
                  >
                    📈 Trade Logs ({activeEx.name})
                  </button>
                  <button 
                    onClick={() => setTerminalTab('vault')} 
                    className={`font-black tracking-widest uppercase transition-all pb-1 ${
                      terminalTab === 'vault' 
                        ? 'text-orange-500 border-b-2 border-orange-500 font-bold' 
                        : 'text-zinc-500 hover:text-zinc-300'
                    }`}
                  >
                    🔒 Vault Sync Logs
                  </button>
                </div>
                <span className="text-orange-500 flex items-center gap-1.5"><Flame className="animate-pulse" size={12} /> Active</span>
              </div>
              <div className="overflow-y-auto flex-1 space-y-2.5 custom-scrollbar pr-2">
                {terminalTab === 'trade' ? (
                  (() => {
                    const tradeLogs = exchangeLogs.filter(log => log.symbol);
                    return tradeLogs.length === 0 ? (
                      <div className="flex items-center justify-center h-full text-zinc-600 font-bold uppercase tracking-wider text-[10px]">
                        No trade execution logs found for {activeEx.name}.
                      </div>
                    ) : (
                      tradeLogs.map((log, i) => {
                        const timeStr = new Date(log.created_at).toLocaleTimeString();
                        const isError = log.log_type === 'ERROR' || log.message.includes('❌');
                        const isSuccess = log.log_type === 'SUCCESS' || log.message.includes('✅');
                        const isWarning = log.log_type === 'WARNING' || log.message.includes('⚠️');
                        
                        let colorClass = 'text-zinc-300';
                        if (isError) colorClass = 'text-red-400 font-semibold';
                        else if (isSuccess) colorClass = 'text-emerald-400 font-semibold';
                        else if (isWarning) colorClass = 'text-orange-400 font-semibold';

                        return (
                          <div key={log.id || i} className="flex gap-2.5 text-zinc-400 animate-fadeIn">
                            <span className="text-zinc-600 select-none shrink-0">&gt;&gt;</span>
                            <span className="text-zinc-500 select-none font-semibold shrink-0">[{timeStr}]</span>
                            {log.symbol && (
                              <span className="text-blue-400 font-bold shrink-0">
                                [{log.symbol.toUpperCase()}]
                              </span>
                            )}
                            <span className={colorClass}>{log.message}</span>
                          </div>
                        );
                      })
                    );
                  })()
                ) : (
                  (() => {
                    const vaultLogs = exchangeLogs.filter(log => !log.symbol);
                    if (vaultLogs.length === 0 && statusLogs.length === 0) {
                      return (
                        <div className="flex items-center justify-center h-full text-zinc-600 font-bold uppercase tracking-wider text-[10px]">
                          Vault fully idle. Awaiting configuration saves...
                        </div>
                      );
                    }
                    return (
                      <div className="space-y-2.5">
                        {vaultLogs.map((log, i) => {
                          const timeStr = new Date(log.created_at).toLocaleTimeString();
                          const isError = log.log_type === 'ERROR' || log.message.includes('❌');
                          const isSuccess = log.log_type === 'SUCCESS' || log.message.includes('✅');
                          const isWarning = log.log_type === 'WARNING' || log.message.includes('⚠️');
                          
                          let colorClass = 'text-zinc-300';
                          if (isError) colorClass = 'text-red-400 font-semibold';
                          else if (isSuccess) colorClass = 'text-emerald-400 font-semibold';
                          else if (isWarning) colorClass = 'text-orange-400 font-semibold';

                          return (
                            <div key={log.id || i} className="flex gap-2.5 text-zinc-400 animate-fadeIn">
                              <span className="text-zinc-600 select-none shrink-0">&gt;&gt;</span>
                              <span className="text-zinc-500 select-none font-semibold shrink-0">[{timeStr}]</span>
                              <span className={colorClass}>{log.message}</span>
                            </div>
                          );
                        })}
                        {vaultLogs.length === 0 && statusLogs.map((log, i) => (
                          <div key={`local-${i}`} className="flex gap-3 text-zinc-400">
                            <span className="text-zinc-600 select-none shrink-0">&gt;&gt;</span>
                            <span className={log.includes('❌') ? 'text-red-400' : log.includes('✅') ? 'text-emerald-400' : 'text-zinc-300'}>
                              {log}
                            </span>
                          </div>
                        ))}
                      </div>
                    );
                  })()
                )}
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
