'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import CryptoJS from 'crypto-js';
import { 
  ShieldAlert, ShieldCheck, Activity, Wallet, Percent, 
  Target, Lock, Save, Settings2, BarChart3, TrendingUp, CheckCircle, 
  XCircle, ToggleLeft, ToggleRight, ArrowUpRight, ArrowDownRight, Flame,
  PlayCircle, Compass, Award, GitBranch, ChevronDown, Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import CustomSelect from '@/components/customselect';

const MASTER_ENCRYPTION_KEY = process.env.NEXT_PUBLIC_ENCRYPTION_KEY;

// Complete list of exchanges supported
const SUPPORTED_EXCHANGES = [
  { id: 'okx', name: 'OKX', requirePassphrase: true, logo: '/okx.png', table: 'okx_auth' },
  { id: 'bybit', name: 'Bybit', requirePassphrase: false, logo: '/bybit.png', table: 'bybit_auth' }
];

const GRADE_OPTIONS = [
  { value: 'All', label: 'All Grades (Bypass)' },
  { value: 'A++', label: 'A++' },
  { value: 'A+', label: 'A+' },
  { value: 'GOOD', label: 'GOOD' },
  { value: 'NORMAL', label: 'NORMAL' }
];

const HTF_OPTIONS = [
  { value: 'All', label: 'All Alignments (Bypass)' },
  { value: 'M5/H1', label: '5M - 1H Alignment' },
  { value: 'M15/H4', label: '15M - 4H Alignment' },
  { value: 'M30/H6', label: '30M - 6H Alignment' },
  { value: 'H1/D1', label: '1H - 1D Alignment' }
];

interface MultiSelectProps {
  label: string;
  icon: React.ReactNode;
  options: { value: string; label: string }[];
  selectedValues: string;
  onChange: (value: string) => void;
}

function MultiSelectDropdown({ label, icon, options, selectedValues, onChange }: MultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const currentList = selectedValues ? selectedValues.split(',').map(v => v.trim()).filter(Boolean) : [];

  const handleToggle = (value: string) => {
    if (value === 'All') {
      onChange('All');
      return;
    }

    let newList = currentList.filter(v => v !== 'All');

    if (newList.includes(value)) {
      newList = newList.filter(v => v !== value);
    } else {
      newList.push(value);
    }

    if (newList.length === 0) {
      onChange('All');
    } else {
      onChange(newList.join(','));
    }
  };

  const isChecked = (value: string) => {
    if (value === 'All') {
      return currentList.includes('All') || currentList.length === 0;
    }
    return currentList.includes(value) && !currentList.includes('All');
  };

  const getDisplayText = () => {
    if (currentList.includes('All') || currentList.length === 0) {
      return 'All (Bypass)';
    }
    return currentList.join(', ');
  };

  return (
    <div className="space-y-1.5 relative w-full flex flex-col" ref={dropdownRef}>
      <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-1.5 select-none ml-2">
        {icon} {label}
      </label>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-white/[0.02] border border-white/[0.08] hover:border-white/20 focus:border-orange-500/40 focus:shadow-[0_0_15px_rgba(249,115,22,0.15)] rounded-xl px-4 py-2.5 text-xs font-mono font-bold text-white outline-none transition-all duration-300 h-[42px] flex justify-between items-center select-none cursor-pointer"
      >
        <span className="truncate pr-2">{getDisplayText()}</span>
        <ChevronDown size={14} className={`text-zinc-500 shrink-0 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute left-0 right-0 mt-2 bg-[#0d0f14]/95 border border-white/[0.08] rounded-2xl shadow-[0_10px_50px_rgba(0,0,0,0.85)] backdrop-blur-2xl z-[999] overflow-hidden max-h-60 overflow-y-auto custom-scrollbar p-2 space-y-1 select-none"
            style={{ top: '100%' }}
          >
            {options.map((opt) => {
              const checked = isChecked(opt.value);
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => handleToggle(opt.value)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-mono font-bold uppercase tracking-wider cursor-pointer text-left transition-all ${
                    checked 
                      ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20' 
                      : 'text-zinc-400 hover:bg-white/[0.05] hover:text-white border border-transparent'
                  }`}
                >
                  <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-all ${
                    checked 
                      ? 'border-orange-500 bg-orange-500/20 text-orange-450' 
                      : 'border-white/20 bg-white/[0.01]'
                  }`}>
                    {checked && (
                      <Check size={10} strokeWidth={4} className="text-orange-400" />
                    )}
                  </div>
                  <span>{opt.label}</span>
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function MultiExchangeDashboard() {
  const [supabase] = useState(() => createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  ));

  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [userTier, setUserTier] = useState<number | null>(null);
  const [isPro, setIsPro] = useState<boolean | null>(null);
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
        .select('tier, is_pro')
        .eq('id', uId)
        .single();

      const tier = profile?.tier ?? 0;
      const isProUser = profile?.is_pro ?? false;
      setUserTier(tier);
      setIsPro(isProUser);

      if (tier < 2 || !isProUser) {
        setLoading(false);
        return;
      }

      const { data: allExecs } = await supabase
        .from('trade_executions')
        .select('*')
        .eq('user_id', uId);

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

        const execs = allExecs?.filter(e => e.exchange_name === ex.id) || [];
        const initialBal = exData?.daily_risk_wallet ?? 1000;

        if (execs && execs.length > 0) {
          const partialTpCount = execs.filter(e => (e.tp_hits && e.tp_hits >= 1) || ['TP1_HIT', 'TP2_HIT', 'BE_HIT', 'BE_MODIFIED', 'FUNDING_CLOSE_TP1'].includes(e.status)).length;
          const fullTpCount = execs.filter(e => e.tp_hits === 2 || e.status === 'TP2_HIT').length;
          const slCount = execs.filter(e => e.status === 'SL_HIT' || (e.sl_hits && e.sl_hits > 0)).length;
          const beCount = execs.filter(e => e.status === 'BE_HIT').length;
          const total = execs.length;
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

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  useEffect(() => {
    if (!userId) return;
    fetchExchangeLogs(activeTab, userId);
    
    const interval = setInterval(() => {
      fetchDashboardData();
      fetchExchangeLogs(activeTab, userId);
    }, 4000);
    
    return () => clearInterval(interval);
  }, [activeTab, userId, fetchExchangeLogs, fetchDashboardData]);

  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel('dashboard-realtime-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'trade_executions', filter: `user_id=eq.${userId}` },
        () => fetchDashboardData()
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'exchange_logs', filter: `user_id=eq.${userId}` },
        () => fetchExchangeLogs(activeTab, userId)
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
    } catch (err) {}

    const plainSecret = apiSecrets[exchangeId];
    const plainPassphrase = passphrases[exchangeId];

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
      } catch (err) {}
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
      } catch (err) {}
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

  if (userTier !== null && (userTier < 2 || !isPro)) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center p-6 text-center text-white">
        <ShieldAlert className="text-red-500 mb-4 animate-bounce" size={54} />
        <h2 className="text-3xl font-black uppercase italic tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-orange-400 to-red-600">Upgrade Required</h2>
        <p className="text-zinc-400 text-sm mt-3 max-w-md leading-relaxed">
          Advanced Multi-Exchange API Trading is an exclusive feature reserved for Pro (Tier 2) and Ultimate (Tier 3) members. Connect all exchange accounts simultaneously and experience dynamic Break-Even trailing executions.
        </p>
        <button 
          onClick={() => window.location.href = '/dashboard/payments'} 
          className="mt-8 px-8 py-3.5 bg-gradient-to-r from-orange-500 to-red-600 rounded-full text-xs font-black uppercase tracking-widest hover:scale-105 active:scale-95 shadow-xl transition-all cursor-pointer"
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
            <span className="px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold text-[10px] tracking-widest uppercase shadow-lg">
              Pro Access Enabled
            </span>
          </div>
        </div>

        {/* Global Risk Management Deck */}
        <div className="bg-gradient-to-br from-zinc-900 to-zinc-950 border border-zinc-800 rounded-[2rem] p-6 md:p-8 shadow-2xl space-y-6">
          <h2 className="text-sm font-black uppercase tracking-widest text-orange-500 flex items-center gap-2.5">
            <Target size={18} /> Global Trade Risk Settings
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6 items-end">
            <div className="space-y-2">
              <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-1.5 ml-2"><Wallet size={12} /> Daily Risk Capital ($)</label>
              <div className="flex items-center bg-white/[0.02] hover:bg-white/[0.04] border border-white/[0.08] hover:border-white/20 rounded-xl px-4 py-3 h-[42px] transition-all duration-300 focus-within:border-orange-500/40 focus-within:shadow-[0_0_15px_rgba(249,115,22,0.15)] text-orange-400">
                <input 
                  type="number" 
                  value={walletSize} 
                  onChange={(e) => setWalletSize(Number(e.target.value))} 
                  className="bg-transparent font-black text-xs font-mono w-full outline-none text-white"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-1.5 ml-2"><Percent size={12} /> Risk Per Trade (%)</label>
              <div className="flex items-center bg-white/[0.02] hover:bg-white/[0.04] border border-white/[0.08] hover:border-white/20 rounded-xl px-4 py-3 h-[42px] transition-all duration-300 focus-within:border-orange-500/40 focus-within:shadow-[0_0_15px_rgba(249,115,22,0.15)] text-orange-400">
                <input 
                  type="number" 
                  step="0.1"
                  value={riskPercent} 
                  onChange={(e) => setRiskPercent(Number(e.target.value))} 
                  className="bg-transparent font-black text-xs font-mono w-full outline-none text-white"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-1.5 ml-2"><Target size={12} /> Minimum RR Ratio</label>
              <div className="flex items-center bg-white/[0.02] hover:bg-white/[0.04] border border-white/[0.08] hover:border-white/20 rounded-xl px-4 py-3 h-[42px] transition-all duration-300 focus-within:border-orange-500/40 focus-within:shadow-[0_0_15px_rgba(249,115,22,0.15)] text-orange-400">
                <input 
                  type="number" 
                  step="0.1"
                  value={minRR} 
                  onChange={(e) => setMinRR(Number(e.target.value))} 
                  className="bg-transparent font-black text-xs font-mono w-full outline-none text-white"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-1.5 ml-2"><Activity size={12} /> Max Setups</label>
              <div className="flex items-center bg-white/[0.02] hover:bg-white/[0.04] border border-white/[0.08] hover:border-white/20 rounded-xl px-4 py-3 h-[42px] transition-all duration-300 focus-within:border-orange-500/40 focus-within:shadow-[0_0_15px_rgba(249,115,22,0.15)] text-orange-400">
                <input 
                  type="number" 
                  min="1"
                  value={maxConcurrent} 
                  onChange={(e) => setMaxConcurrent(Number(e.target.value))} 
                  className="bg-transparent font-black text-xs font-mono w-full outline-none text-white"
                />
              </div>
            </div>

            <CustomSelect
              label="Trend Alignment"
              value={alignment}
              onChange={setAlignment}
              options={[
                { v: "Both", l: "Both Modes" },
                { v: "Aligned", l: "Aligned Only" },
                { v: "Counter", l: "Counter Only" }
              ]}
            />
          </div>

          {/* Advanced Risk & Quality Filters Row */}
          <div className="border-t border-zinc-850 pt-6">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-4 flex items-center gap-1.5">
              <ShieldCheck size={14} className="text-orange-500" /> Advanced Quality & Execution Filters
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 items-end">
              <CustomSelect
                label="Sweep Quality Filter"
                value={sweepQuality}
                onChange={setSweepQuality}
                icon={<Compass className="text-zinc-500 mr-1" size={12} />}
                options={[
                  { v: "All", l: "All Sweeps (Bypass)" },
                  { v: "High", l: "High Quality" },
                  { v: "Normal", l: "Normal Quality" }
                ]}
              />

              <MultiSelectDropdown
                label="Grading Filter"
                icon={<Award size={12} />}
                options={GRADE_OPTIONS}
                selectedValues={gradeSetting}
                onChange={setGradeSetting}
              />
              
              <MultiSelectDropdown
                label="HTF Timeframe Alignment"
                icon={<GitBranch size={12} />}
                options={HTF_OPTIONS}
                selectedValues={htfAlignment}
                onChange={setHtfAlignment}
              />
            </div>
          </div>
        </div>

        {/* Exchange Navigation Dock */}
        <div className="flex overflow-x-auto gap-3 pb-3 scrollbar-hide border-b border-zinc-850">
          {SUPPORTED_EXCHANGES.map(ex => {
            const isConfigured = !!exchangeConfigs[ex.id];
            const isEnabled = botEnables[ex.id] ?? true;
            
            return (
              <motion.button
                key={ex.id}
                onClick={() => setActiveTab(ex.id)}
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                className={`px-6 py-3.5 rounded-full text-xs font-black uppercase tracking-widest border transition-all duration-300 flex items-center gap-2.5 shrink-0 cursor-pointer ${
                  activeTab === ex.id 
                    ? 'bg-orange-500 border-orange-500 text-white shadow-xl shadow-orange-500/20' 
                    : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700'
                }`}
              >
                <Activity size={12} className={activeTab === ex.id ? 'animate-spin' : ''} />
                <span>{ex.name}</span>
                
                {isConfigured ? (
                  isEnabled ? (
                    <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]" title="Active & Enabled" />
                  ) : (
                    <span className="w-2 h-2 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.8)]" title="Configured but Paused" />
                  )
                ) : (
                  <span className="w-2 h-2 rounded-full bg-zinc-700" title="Unconfigured" />
                )}
              </motion.button>
            );
          })}
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
                  <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-2 mb-2 ml-2">Network Environment</label>
                  <div className="flex bg-zinc-950 rounded-xl p-1.5 border border-zinc-850">
                    <button 
                      onClick={() => setEnvironments(prev => ({ ...prev, [activeEx.id]: 'testnet' }))}
                      className={`flex-1 py-2.5 text-[10px] font-black rounded-lg transition-all uppercase tracking-widest cursor-pointer ${
                        (environments[activeEx.id] || 'testnet') === 'testnet' 
                          ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20' 
                          : 'text-zinc-500 hover:text-white'
                      }`}
                    >
                      SANDBOX / DEMO
                    </button>
                    <button 
                      onClick={() => setEnvironments(prev => ({ ...prev, [activeEx.id]: 'live' }))}
                      className={`flex-1 py-2.5 text-[10px] font-black rounded-lg transition-all uppercase tracking-widest cursor-pointer ${
                        (environments[activeEx.id] || 'testnet') === 'live' 
                          ? 'bg-red-600 text-white shadow-lg shadow-red-600/20' 
                          : 'text-zinc-500 hover:text-white'
                      }`}
                    >
                      LIVE MARKET
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-2 ml-2"><Settings2 size={10}/> API KEY</label>
                  <div className="flex items-center bg-white/[0.02] hover:bg-white/[0.04] border border-white/[0.08] hover:border-white/20 rounded-xl px-4 py-3 h-[42px] transition-all duration-300 focus-within:border-orange-500/40 focus-within:shadow-[0_0_15px_rgba(249,115,22,0.15)] text-orange-400">
                    <input 
                      type="text" 
                      value={apiKeys[activeEx.id] || ''} 
                      onChange={(e) => setApiKeys(prev => ({ ...prev, [activeEx.id]: e.target.value }))} 
                      className="bg-transparent font-black text-xs font-mono w-full outline-none text-white"
                      placeholder={`${activeEx.name} API Public Key`}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-2 ml-2"><Lock size={10}/> SECRET KEY (AES ENCRYPTED)</label>
                  <div className="flex items-center bg-white/[0.02] hover:bg-white/[0.04] border border-white/[0.08] hover:border-white/20 rounded-xl px-4 py-3 h-[42px] transition-all duration-300 focus-within:border-orange-500/40 focus-within:shadow-[0_0_15px_rgba(249,115,22,0.15)] text-orange-400">
                    <input 
                      type="password" 
                      value={apiSecrets[activeEx.id] || ''} 
                      onChange={(e) => setApiSecrets(prev => ({ ...prev, [activeEx.id]: e.target.value }))} 
                      className="bg-transparent font-black text-xs font-mono w-full outline-none text-white"
                      placeholder="••••••••••••••••••••••••"
                    />
                  </div>
                </div>

                {activeEx.requirePassphrase && (
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-2 ml-2"><Lock size={10}/> API PASSPHRASE</label>
                    <div className="flex items-center bg-white/[0.02] hover:bg-white/[0.04] border border-white/[0.08] hover:border-white/20 rounded-xl px-4 py-3 h-[42px] transition-all duration-300 focus-within:border-orange-500/40 focus-within:shadow-[0_0_15px_rgba(249,115,22,0.15)] text-orange-400">
                      <input 
                        type="password" 
                        value={passphrases[activeEx.id] || ''} 
                        onChange={(e) => setPassphrases(prev => ({ ...prev, [activeEx.id]: e.target.value }))} 
                        className="bg-transparent font-black text-xs font-mono w-full outline-none text-white"
                        placeholder="Exchange passphrase / passphrase password"
                      />
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between p-4 bg-zinc-950/20 border border-white/[0.05] rounded-xl">
                  <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-2">
                    Trade Engine State
                  </span>
                  <button 
                    onClick={() => setBotEnables(prev => ({ ...prev, [activeEx.id]: !(botEnables[activeEx.id] ?? true) }))}
                    className="text-orange-500 focus:outline-none cursor-pointer"
                  >
                    {(botEnables[activeEx.id] ?? true) ? <ToggleRight size={38} className="text-emerald-500" /> : <ToggleLeft size={38} className="text-zinc-650" />}
                  </button>
                </div>

                <motion.button 
                  onClick={() => saveExchangeSettings(activeEx.id)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full py-4 bg-white hover:bg-zinc-200 text-black text-[11px] font-black uppercase tracking-widest rounded-xl transition-all shadow-[0_0_30px_rgba(255,255,255,0.15)] active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Save size={14} /> SAVE & SYNC {activeEx.name.toUpperCase()}
                </motion.button>
              </div>
            </div>
          </div>

          {/* Performance stats Column */}
          <div className="lg:col-span-7 space-y-8">
            
            {/* Live stats summary board */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
              <div className="bg-gradient-to-br from-white/[0.04] to-white/[0.01] border border-[var(--glass-border)] p-5 rounded-2xl flex flex-col justify-between shadow-lg">
                <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Executions</span>
                <span className="text-2xl font-black mt-2 text-white font-mono">{activeMetrics.total}</span>
              </div>
              <div className="bg-gradient-to-br from-white/[0.04] to-white/[0.01] border border-[var(--glass-border)] p-5 rounded-2xl flex flex-col justify-between shadow-lg">
                <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Partial TP</span>
                <span className="text-2xl font-black mt-2 text-amber-400 flex items-center gap-1.5 font-mono"><CheckCircle size={16} /> {activeMetrics.partialTps}</span>
              </div>
              <div className="bg-gradient-to-br from-white/[0.04] to-white/[0.01] border border-[var(--glass-border)] p-5 rounded-2xl flex flex-col justify-between shadow-lg">
                <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Full TP</span>
                <span className="text-2xl font-black mt-2 text-emerald-400 flex items-center gap-1.5 font-mono"><CheckCircle size={16} /> {activeMetrics.fullTps}</span>
              </div>
              <div className="bg-gradient-to-br from-white/[0.04] to-white/[0.01] border border-[var(--glass-border)] p-5 rounded-2xl flex flex-col justify-between shadow-lg">
                <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">SL Hits</span>
                <span className="text-2xl font-black mt-2 text-red-500 flex items-center gap-1.5 font-mono"><XCircle size={16} /> {activeMetrics.sls}</span>
              </div>
              <div className="bg-gradient-to-br from-white/[0.04] to-white/[0.01] border border-[var(--glass-border)] p-5 rounded-2xl flex flex-col justify-between shadow-lg col-span-2 sm:col-span-1">
                <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Break Evens</span>
                <span className="text-2xl font-black mt-2 text-blue-400 flex items-center gap-1.5 font-mono"><ShieldCheck size={16} /> {activeMetrics.bes}</span>
              </div>
            </div>

            {/* Balances & PnL metrics */}
            <div className="bg-gradient-to-br from-zinc-900 to-zinc-950 border border-zinc-800 rounded-[2.5rem] p-8 shadow-2xl">
              <h3 className="text-xs font-black text-orange-500 uppercase tracking-widest flex items-center gap-2 mb-6">
                <BarChart3 size={16} /> Vault Performance Board
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div className="bg-zinc-950/40 border border-zinc-850 p-6 rounded-2xl">
                  <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Opening Balance</span>
                  <h4 className="text-xl font-bold mt-2 font-mono">${Number(activeMetrics.opening).toFixed(2)}</h4>
                </div>
                <div className="bg-zinc-950/40 border border-zinc-850 p-6 rounded-2xl">
                  <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Closing Balance</span>
                  <h4 className="text-xl font-bold mt-2 font-mono">${Number(activeMetrics.closing).toFixed(2)}</h4>
                </div>
                <div className={`bg-zinc-950/45 border p-6 rounded-2xl ${activeMetrics.pnl >= 0 ? 'border-emerald-500/20 shadow-[0_0_15px_rgba(52,211,153,0.05)]' : 'border-red-500/20 shadow-[0_0_15px_rgba(239,68,68,0.05)]'}`}>
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
            <div className="bg-[#0b0c10]/95 border border-zinc-850 rounded-3xl p-6 h-[300px] overflow-hidden flex flex-col relative font-mono text-xs shadow-2xl backdrop-blur-md">
              <div className="flex justify-between items-center pb-4 border-b border-zinc-850 mb-3 text-[10px] text-zinc-500 uppercase tracking-widest shrink-0">
                <div className="flex gap-6">
                  <button 
                    onClick={() => setTerminalTab('trade')} 
                    className={`font-black tracking-widest uppercase transition-all pb-1 cursor-pointer ${
                      terminalTab === 'trade' 
                        ? 'text-orange-500 border-b-2 border-orange-500 font-bold' 
                        : 'text-zinc-500 hover:text-zinc-300'
                    }`}
                  >
                    📈 Trade Logs ({activeEx.name})
                  </button>
                  <button 
                    onClick={() => setTerminalTab('vault')} 
                    className={`font-black tracking-widest uppercase transition-all pb-1 cursor-pointer ${
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
                      <div className="flex items-center justify-center h-full text-zinc-650 font-bold uppercase tracking-wider text-[10px]">
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
                            <span className="text-zinc-700 select-none shrink-0">&gt;&gt;</span>
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
                        <div className="flex items-center justify-center h-full text-zinc-650 font-bold uppercase tracking-wider text-[10px]">
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
                              <span className="text-zinc-700 select-none shrink-0">&gt;&gt;</span>
                              <span className="text-zinc-500 select-none font-semibold shrink-0">[{timeStr}]</span>
                              <span className={colorClass}>{log.message}</span>
                            </div>
                          );
                        })}
                        {vaultLogs.length === 0 && statusLogs.map((log, i) => (
                          <div key={`local-${i}`} className="flex gap-3 text-zinc-400">
                            <span className="text-zinc-700 select-none shrink-0">&gt;&gt;</span>
                            <span className={log.includes('❌') ? 'text-red-400 font-semibold' : log.includes('✅') ? 'text-emerald-400 font-semibold' : 'text-zinc-300'}>
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
