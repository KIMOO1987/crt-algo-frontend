'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import CryptoJS from 'crypto-js';
import CustomSelect from '@/components/CustomSelect';
import { 
  ShieldAlert, ShieldCheck, Activity, Wallet, Percent, 
  Target, Lock, Save, Settings2, BarChart3, TrendingUp, CheckCircle, 
  XCircle, ToggleLeft, ToggleRight, ArrowUpRight, ArrowDownRight, Flame,
  PlayCircle, Compass, Award, GitBranch, ChevronDown
} from 'lucide-react';

const MASTER_ENCRYPTION_KEY = process.env.NEXT_PUBLIC_ENCRYPTION_KEY;
import okxSymbols from './okx_symbols.json';

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
  const dropdownRef = React.useRef<HTMLDivElement>(null);

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
    <div className="space-y-2 relative" ref={dropdownRef}>
      <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-1.5 select-none">
        {icon} {label}
      </label>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="input-modern w-full h-[42px] py-0 font-bold uppercase tracking-wider text-left flex justify-between items-center select-none text-xs"
      >
        <span className="truncate pr-2">{getDisplayText()}</span>
        <ChevronDown size={14} className="text-zinc-500 transition-transform duration-200" style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }} />
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-1.5 w-full bg-zinc-950/95 backdrop-blur-md border border-zinc-800 rounded-xl shadow-2xl p-2 space-y-1 max-h-60 overflow-y-auto custom-scrollbar select-none animate-fadeIn">
          {options.map((opt) => {
            const checked = isChecked(opt.value);
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => handleToggle(opt.value)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider cursor-pointer text-left transition-all ${
                  checked 
                    ? 'bg-orange-500/10 text-orange-500 border border-orange-500/20' 
                    : 'text-zinc-400 hover:bg-zinc-900/60 hover:text-white border border-transparent'
                }`}
              >
                <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-all ${
                  checked 
                    ? 'border-orange-500 bg-orange-500 text-black' 
                    : 'border-zinc-700 bg-zinc-950'
                }`}>
                  {checked && (
                    <svg className="w-3 h-3 fill-current stroke-2" viewBox="0 0 24 24">
                      <path fill="none" stroke="currentColor" strokeWidth="3" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                <span>{opt.label}</span>
              </button>
            );
          })}
        </div>
      )}
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

  
  const parseAllowedSymbols = (loaded: any, tab: string): Record<string, string[]> => {
    if (loaded && typeof loaded === 'object' && !Array.isArray(loaded)) {
      return loaded as Record<string, string[]>;
    }
    if (Array.isArray(loaded)) {
      const res: Record<string, string[]> = {};
      loaded.forEach(sym => {
        if (typeof sym === 'string') {
          res[sym] = ["M5/H1", "M15/H4", "M30/H6", "H1/D1"];
        }
      });
      return res;
    }
    const res: Record<string, string[]> = {};
    if (tab === 'okx') {
      okxSymbols.forEach(s => {
        res[s.symbol] = ["M5/H1", "M15/H4", "M30/H6", "H1/D1"];
      });
    }
    return res;
  };

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

  // Alt Coins Risk Management States
  const [altWalletSize, setAltWalletSize] = useState(1000);
  const [altRiskPercent, setAltRiskPercent] = useState(1.0);
  const [altMinRR, setAltMinRR] = useState(1.5);
  const [altMaxConcurrent, setAltMaxConcurrent] = useState(3);
  const [altAlignment, setAltAlignment] = useState('Both');
  const [altEntryMode, setAltEntryMode] = useState('market');
  const [altSweepQuality, setAltSweepQuality] = useState('All');
  const [altGradeSetting, setAltGradeSetting] = useState('All');
  const [altHtfAlignment, setAltHtfAlignment] = useState('All');

  // Checklist Allowed Symbols State
  const [allowedSymbolsList, setAllowedSymbolsList] = useState<Record<string, string[]>>({});
  const [majorSearchQuery, setMajorSearchQuery] = useState("");
  const [altSearchQuery, setAltSearchQuery] = useState("");

  // Stats / Metrics per Exchange
  const [metrics, setMetrics] = useState<Record<string, any>>({});
  const [statusLogs, setStatusLogs] = useState<string[]>([]);
  const [terminalTab, setTerminalTab] = useState<'trade' | 'vault'>('trade');
  const [exchangeLogs, setExchangeLogs] = useState<any[]>([]);
  const [rawExecutions, setRawExecutions] = useState<any[]>([]);

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

      // Optimized single batch query for all user execution statistics to reduce db roundtrips by 700%
      const { data: allExecs } = await supabase
        .from('trade_executions')
        .select('*')
        .eq('user_id', uId);

      setRawExecutions(allExecs || []);

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
          // Partial TP = executions that hit TP1 (active in BE_MODIFIED, closed at TP1, closed at BE, or closed at TP2)
          const partialTpCount = execs.filter(e => (e.tp_hits && e.tp_hits >= 1) || ['TP1_HIT', 'TP2_HIT', 'BE_HIT', 'BE_MODIFIED', 'FUNDING_CLOSE_TP1'].includes(e.status)).length;
          // Full TP = executions that hit TP2
          const fullTpCount = execs.filter(e => e.tp_hits === 2 || e.status === 'TP2_HIT').length;
          const slCount = execs.filter(e => e.status === 'SL_HIT' || (e.sl_hits && e.sl_hits > 0)).length;
          // Break Evens = executions that hit Break-Even Stop Loss exit
          const beCount = execs.filter(e => e.status === 'BE_HIT').length;
          
          // Total physical trade executions (all statuses including ENTRY)
          const total = execs.length;
          
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
        
        // Alt Coins settings
        setAltWalletSize(config.alt_daily_risk_wallet ?? 1000);
        setAltRiskPercent(config.alt_risk_percentage ?? 1.0);
        setAltMinRR(config.alt_rr ?? 1.5);
        setAltMaxConcurrent(config.alt_max_concurrent_setups ?? 3);
        setAltAlignment(config.alt_alignment ?? 'Both');
        setAltEntryMode(config.alt_entry_mode ?? 'market');
        setAltSweepQuality(config.alt_sweep_quality ?? 'All');
        setAltGradeSetting(config.alt_grade ?? 'All');
        setAltHtfAlignment(config.alt_htf_alignment ?? 'All');

        // Allowed symbols checklist
        setAllowedSymbolsList(parseAllowedSymbols(config.allowed_symbols, activeTab));
        
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

        // Defaults for Alt Coins
        setAltWalletSize(1000);
        setAltRiskPercent(1.0);
        setAltMinRR(1.5);
        setAltMaxConcurrent(3);
        setAltAlignment('Both');
        setAltEntryMode('market');
        setAltSweepQuality('All');
        setAltGradeSetting('All');
        setAltHtfAlignment('All');

        // Allowed symbols checklist default
        setAllowedSymbolsList(parseAllowedSymbols(null, activeTab));
        
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
      
      // Major Coins Config
      daily_risk_wallet: walletSize,
      risk_percentage: riskPercent,
      rr: minRR,
      max_concurrent_setups: maxConcurrent,
      alignment: alignment,
      entry_mode: entryMode,
      sweep_quality: sweepQuality,
      grade: gradeSetting,
      htf_alignment: htfAlignment,

      // Alt Coins Config
      alt_daily_risk_wallet: altWalletSize,
      alt_risk_percentage: altRiskPercent,
      alt_rr: altMinRR,
      alt_max_concurrent_setups: altMaxConcurrent,
      alt_alignment: altAlignment,
      alt_entry_mode: altEntryMode,
      alt_sweep_quality: altSweepQuality,
      alt_grade: altGradeSetting,
      alt_htf_alignment: altHtfAlignment,

      // Checklist allowed symbols
      allowed_symbols: allowedSymbolsList,

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

  // Access Lock Block for Free / Tier 1 / Non-Pro Users
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
          className="mt-8 px-8 py-3.5 bg-gradient-to-r from-orange-500 to-red-600 rounded-full text-xs font-black uppercase tracking-widest hover:scale-105 active:scale-95 shadow-xl transition-all"
        >
          UPGRADE NOW
        </button>
      </div>
    );
  }

  const getTfStats = (alignment: string) => {
    const tfExecs = rawExecutions.filter(e => {
      if (e.exchange_name !== activeTab) return false;
      if (!e.tf_alignment) return false;
      const normalized = e.tf_alignment.toUpperCase().replace("-", "/");
      return normalized === alignment.toUpperCase();
    });

    const total = tfExecs.length;
    const wins = tfExecs.filter(e => e.status === 'TP2_HIT' || e.status === 'WIN' || e.pnl > 0).length;
    const sls = tfExecs.filter(e => e.status === 'SL_HIT' || e.status === 'LOSS' || e.pnl < 0).length;
    const bes = tfExecs.filter(e => e.status === 'BE_HIT').length;
    const winPnL = tfExecs.filter(e => e.pnl > 0).reduce((sum, e) => sum + (e.pnl ?? 0), 0);

    return { total, wins, sls, bes, winPnL };
  };

  const getActiveCount = (list: string[]) => {
    return Object.entries(allowedSymbolsList).filter(([sym, tfs]) => list.includes(sym) && tfs.length > 0).length;
  };

  const isSymbolChecked = (symbol: string) => {
    const tfs = allowedSymbolsList[symbol];
    return tfs && tfs.length > 0;
  };

  const isTfChecked = (symbol: string, tf: string) => {
    const tfs = allowedSymbolsList[symbol];
    return tfs && tfs.includes(tf);
  };

  const toggleWholeSymbol = (symbol: string) => {
    setAllowedSymbolsList(prev => {
      const current = prev[symbol] ?? [];
      const allTfs = ["M5/H1", "M15/H4", "M30/H6", "H1/D1"];
      const isAnyChecked = current.length > 0;
      return {
        ...prev,
        [symbol]: isAnyChecked ? [] : allTfs
      };
    });
  };

  const toggleSymbolTimeframe = (symbol: string, tf: string) => {
    setAllowedSymbolsList(prev => {
      const current = prev[symbol] ?? [];
      const next = current.includes(tf)
        ? current.filter(t => t !== tf)
        : [...current, tf];
      return {
        ...prev,
        [symbol]: next
      };
    });
  };

  const majorsList = okxSymbols.filter(s => s.type === 'major').map(s => s.symbol);
  const altsList = okxSymbols.filter(s => s.type === 'alt').map(s => s.symbol);

  const activeEx = SUPPORTED_EXCHANGES.find(e => e.id === activeTab) || SUPPORTED_EXCHANGES[0];
  const activeMetrics = metrics[activeTab] || { total: 0, partialTps: 0, fullTps: 0, sls: 0, bes: 0, opening: 1000, closing: 1000, pnl: 0 };

  return (
    <div className="w-full relative z-10 space-y-8 md:space-y-10 text-white font-sans selection:bg-orange-500 selection:text-white">
        
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

        {/* Exchange Navigation Dock */}
        <div className="flex overflow-x-auto gap-3 pb-3 scrollbar-hide border-b border-zinc-850">
          {SUPPORTED_EXCHANGES.map(ex => {
            const isConfigured = !!exchangeConfigs[ex.id];
            const isEnabled = botEnables[ex.id] ?? true;
            
            return (
              <button
                key={ex.id}
                onClick={() => setActiveTab(ex.id)}
                className={`px-6 py-3.5 rounded-full text-xs font-black uppercase tracking-widest border transition-all duration-300 flex items-center gap-2.5 shrink-0 ${
                  activeTab === ex.id 
                    ? 'bg-orange-500 border-orange-500 text-white shadow-xl shadow-orange-500/10' 
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
              </button>
            );
          })}
        </div>

        {/* Configurations Widescreen Row */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Column 1: API Config & Allowed Symbols Checklist */}
          <div className="lg:col-span-4 space-y-8">
            <div className="bg-gradient-to-br from-zinc-900 to-zinc-950 border border-zinc-800 rounded-[2.5rem] p-8 shadow-2xl space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-xs font-black text-orange-500 uppercase tracking-widest flex items-center gap-2">
                  <Lock size={16} /> API Vault Configuration
                </h3>
                <span className="text-[10px] font-mono text-zinc-500 uppercase">
                  {activeEx.name} Storage
                </span>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-2 mb-2">Network Environment</label>
                  <div className="flex bg-zinc-950 rounded-xl p-1.5 border border-zinc-800">
                    <button 
                      type="button"
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
                      type="button"
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
                      placeholder="Exchange passphrase"
                    />
                  </div>
                )}

                <div className="flex items-center justify-between p-4 bg-zinc-950 border border-zinc-850 rounded-xl">
                  <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
                    Trade Engine State
                  </span>
                  <button 
                    type="button"
                    onClick={() => setBotEnables(prev => ({ ...prev, [activeEx.id]: !(botEnables[activeEx.id] ?? true) }))}
                    className="text-orange-500 focus:outline-none"
                  >
                    {(botEnables[activeEx.id] ?? true) ? <ToggleRight size={38} className="text-emerald-500" /> : <ToggleLeft size={38} className="text-zinc-600" />}
                  </button>
                </div>

                <button 
                  type="button"
                  onClick={() => saveExchangeSettings(activeEx.id)}
                  className="w-full py-4 bg-white hover:bg-zinc-200 text-black text-[11px] font-black uppercase tracking-widest rounded-xl transition-all shadow-xl active:scale-95 flex items-center justify-center gap-2"
                >
                  <Save size={14} /> SAVE & SYNC {activeEx.name.toUpperCase()}
                </button>
              </div>
            </div>

            {/* Timeframe Performance Board (OKX ONLY) */}
            {activeTab === 'okx' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center px-2">
                  <h3 className="text-xs font-black text-orange-500 uppercase tracking-widest flex items-center gap-2">
                    <Activity size={16} className="animate-pulse" /> Timeframe Performance Board
                  </h3>
                  <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-wider">Active Statistics</span>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 select-none">
                  {[
                    { label: "M5 / H1 Alignment", key: "M5/H1", color: "from-orange-500/20 to-transparent", text: "text-orange-500", border: "hover:border-orange-500/30" },
                    { label: "M15 / H4 Alignment", key: "M15/H4", color: "from-emerald-500/20 to-transparent", text: "text-emerald-400", border: "hover:border-emerald-500/30" },
                    { label: "M30 / H6 Alignment", key: "M30/H6", color: "from-cyan-500/20 to-transparent", text: "text-cyan-400", border: "hover:border-cyan-500/30" },
                    { label: "H1 / D1 Alignment", key: "H1/D1", color: "from-purple-500/20 to-transparent", text: "text-purple-400", border: "hover:border-purple-500/30" }
                  ].map(tf => {
                    const stats = getTfStats(tf.key);
                    return (
                      <div key={tf.key} className={`bg-gradient-to-br from-zinc-900 to-zinc-950/80 border border-zinc-800/80 rounded-2xl p-5 shadow-xl hover:shadow-2xl transition-all duration-300 ${tf.border} flex flex-col justify-between relative overflow-hidden group`}>
                        {/* Glow effect at top left corner */}
                        <div className={`absolute top-0 left-0 w-24 h-12 bg-gradient-to-br ${tf.color} filter blur-xl opacity-40 group-hover:opacity-60 transition-opacity duration-300`} />
                        
                        <div className="relative z-10 space-y-4">
                          {/* Title */}
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400 truncate">{tf.label}</span>
                            <span className={`w-2 h-2 rounded-full shrink-0 ${tf.text.replace("text-", "bg-")} animate-pulse`} />
                          </div>
                          
                          {/* Main metric - Total Trades */}
                          <div className="flex items-baseline justify-between">
                            <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Total Trades</span>
                            <span className="text-xl font-black font-mono text-white">{stats.total}</span>
                          </div>
                          
                          {/* Mini inline bar or flex metrics */}
                          <div className="grid grid-cols-3 gap-1 border-t border-b border-zinc-850 py-2.5 my-1 text-center font-mono text-[9px] font-bold">
                            <div>
                              <div className="text-zinc-500 uppercase tracking-wider mb-0.5">Win</div>
                              <div className="text-emerald-400 font-extrabold">{stats.wins}</div>
                            </div>
                            <div>
                              <div className="text-zinc-500 uppercase tracking-wider mb-0.5">SL</div>
                              <div className="text-red-500 font-extrabold">{stats.sls}</div>
                            </div>
                            <div>
                              <div className="text-zinc-500 uppercase tracking-wider mb-0.5">BE</div>
                              <div className="text-blue-400 font-extrabold">{stats.bes}</div>
                            </div>
                          </div>
                          
                          {/* Win PnL */}
                          <div className="flex items-center justify-between pt-1 font-mono">
                            <span className="text-[8px] font-black text-zinc-500 uppercase tracking-widest">Win PnL</span>
                            <span className="text-xs font-black text-emerald-400 truncate">
                              +${stats.winPnL.toFixed(2)}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Column 2: Major Coins Risk Desk */}
          <div className="lg:col-span-4 bg-gradient-to-br from-zinc-900 to-zinc-950 border border-zinc-800 rounded-[2.5rem] p-8 shadow-2xl space-y-6 border-orange-500/5 hover:border-orange-500/10 transition-all">
            <h2 className="text-xs font-black uppercase tracking-widest text-orange-500 flex items-center gap-2.5 select-none">
              <Target size={16} /> Major Coins Risk Desk (BTC/ETH)
            </h2>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-1.5"><Wallet size={12} /> Daily Risk Capital ($)</label>
                <input type="number" value={walletSize} onChange={(e) => setWalletSize(Number(e.target.value))} className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3.5 text-xs font-mono text-white outline-none focus:border-orange-500 hover:border-zinc-700 transition-all" />
              </div>
              <div className="space-y-2">
                <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-1.5"><Percent size={12} /> Risk Per Trade (%)</label>
                <input type="number" step="0.1" value={riskPercent} onChange={(e) => setRiskPercent(Number(e.target.value))} className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3.5 text-xs font-mono text-white outline-none focus:border-orange-500 hover:border-zinc-700 transition-all" />
              </div>
              <div className="space-y-2">
                <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-1.5"><Target size={12} /> Minimum RR Ratio</label>
                <input type="number" step="0.1" value={minRR} onChange={(e) => setMinRR(Number(e.target.value))} className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3.5 text-xs font-mono text-white outline-none focus:border-orange-500 hover:border-zinc-700 transition-all" />
              </div>
              <div className="space-y-2">
                <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-1.5"><Activity size={12} /> Max Setups</label>
                <input type="number" min="1" value={maxConcurrent} onChange={(e) => setMaxConcurrent(Number(e.target.value))} className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3.5 text-xs font-mono text-white outline-none focus:border-orange-500 hover:border-zinc-700 transition-all" />
              </div>
              <CustomSelect label="Trend Alignment" icon={<Activity size={12} />} value={alignment} onChange={setAlignment} options={[{value: 'Both', label: 'Both'}, {value: 'Aligned', label: 'Aligned Only'}, {value: 'Counter', label: 'Counter Only'}]} />
              <CustomSelect label="Sweep Quality Filter" icon={<Compass size={12} />} value={sweepQuality} onChange={setSweepQuality} options={[{value: 'All', label: 'All Sweeps'}, {value: 'High', label: 'High'}, {value: 'Normal', label: 'Normal'}]} />
              <MultiSelectDropdown label="Grading Filter" icon={<Award size={12} />} options={GRADE_OPTIONS} selectedValues={gradeSetting} onChange={setGradeSetting} />
              <MultiSelectDropdown label="HTF Timeframe Alignment" icon={<GitBranch size={12} />} options={HTF_OPTIONS} selectedValues={htfAlignment} onChange={setHtfAlignment} />
              
              {activeTab === 'okx' && (
                <div className="pt-6 border-t border-zinc-850 space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black text-orange-500 uppercase tracking-widest flex items-center gap-1.5">
                      <Target size={12} /> Major Symbols ({getActiveCount(majorsList)} / {majorsList.length})
                    </span>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setAllowedSymbolsList(prev => {
                            const next = { ...prev };
                            majorsList.forEach(sym => {
                              next[sym] = ["M5/H1", "M15/H4", "M30/H6", "H1/D1"];
                            });
                            return next;
                          });
                        }}
                        className="px-2 py-0.5 bg-zinc-950 border border-zinc-800 hover:border-zinc-700 rounded text-[8px] font-black uppercase tracking-wider text-zinc-400 hover:text-white transition-all select-none"
                      >
                        All
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setAllowedSymbolsList(prev => {
                            const next = { ...prev };
                            majorsList.forEach(sym => {
                              next[sym] = [];
                            });
                            return next;
                          });
                        }}
                        className="px-2 py-0.5 bg-zinc-950 border border-zinc-800 hover:border-zinc-700 rounded text-[8px] font-black uppercase tracking-wider text-zinc-400 hover:text-white transition-all select-none"
                      >
                        None
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Search Major symbols..."
                        value={majorSearchQuery}
                        onChange={(e) => setMajorSearchQuery(e.target.value)}
                        className="w-full bg-zinc-950 border border-zinc-850 rounded-xl px-3 py-2 text-[10px] text-white outline-none focus:border-orange-500 hover:border-zinc-800 transition-all font-mono"
                      />
                    </div>
                    {/* Bulk TF Toggles Bar */}
                    <div className="flex flex-wrap items-center gap-1 pt-1 select-none text-[8px] font-black uppercase tracking-wider text-zinc-500">
                      <span className="mr-0.5">Enable All:</span>
                      {["M5/H1", "M15/H4", "M30/H6", "H1/D1"].map(tf => (
                        <button
                          key={`enable-major-${tf}`}
                          type="button"
                          onClick={() => {
                            setAllowedSymbolsList(prev => {
                              const next = { ...prev };
                              majorsList.forEach(sym => {
                                const current = prev[sym] ?? [];
                                if (!current.includes(tf)) {
                                  next[sym] = [...current, tf];
                                }
                              });
                              return next;
                            });
                          }}
                          className="px-1 py-0.5 bg-zinc-950 border border-zinc-850 hover:border-zinc-700 rounded text-emerald-400 hover:text-emerald-300 transition-all font-mono shrink-0"
                        >
                          +{tf.split("/")[0]}
                        </button>
                      ))}
                      <span className="mx-1 font-normal text-zinc-800">|</span>
                      <span className="mr-0.5">Disable All:</span>
                      {["M5/H1", "M15/H4", "M30/H6", "H1/D1"].map(tf => (
                        <button
                          key={`disable-major-${tf}`}
                          type="button"
                          onClick={() => {
                            setAllowedSymbolsList(prev => {
                              const next = { ...prev };
                              majorsList.forEach(sym => {
                                const current = prev[sym] ?? [];
                                next[sym] = current.filter(t => t !== tf);
                              });
                              return next;
                            });
                          }}
                          className="px-1 py-0.5 bg-zinc-950 border border-zinc-850 hover:border-zinc-700 rounded text-red-400 hover:text-red-300 transition-all font-mono shrink-0"
                        >
                          -{tf.split("/")[0]}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="h-[220px] overflow-y-auto pr-1 custom-scrollbar flex flex-col gap-2 select-none">
                    {okxSymbols
                      .filter(s => s.type === 'major')
                      .filter(s => s.symbol.toLowerCase().includes(majorSearchQuery.toLowerCase()))
                      .map(s => {
                        const isChecked = isSymbolChecked(s.symbol);
                        return (
                          <div
                            key={s.symbol}
                            className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-2 bg-zinc-950/40 hover:bg-zinc-950/80 border border-zinc-900 hover:border-zinc-800/80 rounded-xl transition-all"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <button
                                type="button"
                                onClick={() => toggleWholeSymbol(s.symbol)}
                                className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 transition-all ${
                                  isChecked ? 'border-orange-500 bg-orange-500 text-black' : 'border-zinc-800 bg-zinc-900'
                                }`}
                              >
                                {isChecked && (
                                  <svg className="w-2.5 h-2.5 fill-current stroke-2" viewBox="0 0 24 24">
                                    <path fill="none" stroke="currentColor" strokeWidth="4" d="M5 13l4 4L19 7" />
                                  </svg>
                                )}
                              </button>
                              <span className={`text-[10px] font-mono tracking-wider font-bold truncate ${isChecked ? 'text-white' : 'text-zinc-500'}`}>
                                {s.symbol}
                              </span>
                              <span className="px-1 py-0.5 rounded text-[7px] font-black uppercase tracking-widest bg-orange-500/10 text-orange-400 border border-orange-500/20 shrink-0 select-none">
                                major
                              </span>
                            </div>
                            
                            <div className="flex items-center gap-1 shrink-0 self-end sm:self-auto">
                              {["M5/H1", "M15/H4", "M30/H6", "H1/D1"].map(tf => {
                                const active = isTfChecked(s.symbol, tf);
                                const shortLabel = tf.split("/")[0];
                                return (
                                  <button
                                    key={tf}
                                    type="button"
                                    onClick={() => toggleSymbolTimeframe(s.symbol, tf)}
                                    title={`Toggle ${tf} for ${s.symbol}`}
                                    className={`px-1.5 py-0.5 rounded text-[8px] font-black font-mono tracking-tighter uppercase transition-all select-none border shrink-0 ${
                                      active
                                        ? 'bg-gradient-to-r from-amber-500/20 to-orange-500/20 border-amber-500/60 text-amber-300 shadow-[0_0_6px_rgba(245,158,11,0.15)] hover:border-amber-400'
                                        : 'border-zinc-850 text-zinc-500 bg-zinc-950/20 hover:text-zinc-300 hover:bg-zinc-900/40'
                                    }`}
                                  >
                                    {shortLabel}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Column 3: Alt Coins Risk Desk */}
          <div className="lg:col-span-4 bg-gradient-to-br from-zinc-900 to-zinc-950 border border-zinc-800 rounded-[2.5rem] p-8 shadow-2xl space-y-6 border-purple-500/5 hover:border-purple-500/10 transition-all">
            <h2 className="text-xs font-black uppercase tracking-widest text-purple-400 flex items-center gap-2.5 select-none">
              <Target size={16} /> Alt Coins Risk Desk (Alts)
            </h2>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-1.5"><Wallet size={12} /> Daily Risk Capital ($)</label>
                <input type="number" value={altWalletSize} onChange={(e) => setAltWalletSize(Number(e.target.value))} className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3.5 text-xs font-mono text-white outline-none focus:border-purple-500 hover:border-zinc-700 transition-all" />
              </div>
              <div className="space-y-2">
                <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-1.5"><Percent size={12} /> Risk Per Trade (%)</label>
                <input type="number" step="0.1" value={altRiskPercent} onChange={(e) => setAltRiskPercent(Number(e.target.value))} className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3.5 text-xs font-mono text-white outline-none focus:border-purple-500 hover:border-zinc-700 transition-all" />
              </div>
              <div className="space-y-2">
                <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-1.5"><Target size={12} /> Minimum RR Ratio</label>
                <input type="number" step="0.1" value={altMinRR} onChange={(e) => setAltMinRR(Number(e.target.value))} className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3.5 text-xs font-mono text-white outline-none focus:border-purple-500 hover:border-zinc-700 transition-all" />
              </div>
              <div className="space-y-2">
                <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-1.5"><Activity size={12} /> Max Setups</label>
                <input type="number" min="1" value={altMaxConcurrent} onChange={(e) => setAltMaxConcurrent(Number(e.target.value))} className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3.5 text-xs font-mono text-white outline-none focus:border-purple-500 hover:border-zinc-700 transition-all" />
              </div>
              <CustomSelect label="Trend Alignment" icon={<Activity size={12} />} value={altAlignment} onChange={setAltAlignment} options={[{value: 'Both', label: 'Both'}, {value: 'Aligned', label: 'Aligned Only'}, {value: 'Counter', label: 'Counter Only'}]} />
              <CustomSelect label="Sweep Quality Filter" icon={<Compass size={12} />} value={altSweepQuality} onChange={setAltSweepQuality} options={[{value: 'All', label: 'All Sweeps'}, {value: 'High', label: 'High'}, {value: 'Normal', label: 'Normal'}]} />
              <MultiSelectDropdown label="Grading Filter" icon={<Award size={12} />} options={GRADE_OPTIONS} selectedValues={altGradeSetting} onChange={setAltGradeSetting} />
              <MultiSelectDropdown label="HTF Timeframe Alignment" icon={<GitBranch size={12} />} options={HTF_OPTIONS} selectedValues={altHtfAlignment} onChange={setAltHtfAlignment} />
              
              {activeTab === 'okx' && (
                <div className="pt-6 border-t border-zinc-850 space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black text-purple-400 uppercase tracking-widest flex items-center gap-1.5">
                      <Target size={12} /> Alt Symbols ({getActiveCount(altsList)} / {altsList.length})
                    </span>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setAllowedSymbolsList(prev => {
                            const next = { ...prev };
                            altsList.forEach(sym => {
                              next[sym] = ["M5/H1", "M15/H4", "M30/H6", "H1/D1"];
                            });
                            return next;
                          });
                        }}
                        className="px-2 py-0.5 bg-zinc-950 border border-zinc-800 hover:border-zinc-700 rounded text-[8px] font-black uppercase tracking-wider text-zinc-400 hover:text-white transition-all select-none"
                      >
                        All
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setAllowedSymbolsList(prev => {
                            const next = { ...prev };
                            altsList.forEach(sym => {
                              next[sym] = [];
                            });
                            return next;
                          });
                        }}
                        className="px-2 py-0.5 bg-zinc-950 border border-zinc-800 hover:border-zinc-700 rounded text-[8px] font-black uppercase tracking-wider text-zinc-400 hover:text-white transition-all select-none"
                      >
                        None
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Search Alt symbols..."
                        value={altSearchQuery}
                        onChange={(e) => setAltSearchQuery(e.target.value)}
                        className="w-full bg-zinc-950 border border-zinc-850 rounded-xl px-3 py-2 text-[10px] text-white outline-none focus:border-purple-500 hover:border-zinc-800 transition-all font-mono"
                      />
                    </div>
                    {/* Bulk TF Toggles Bar */}
                    <div className="flex flex-wrap items-center gap-1 pt-1 select-none text-[8px] font-black uppercase tracking-wider text-zinc-500">
                      <span className="mr-0.5">Enable All:</span>
                      {["M5/H1", "M15/H4", "M30/H6", "H1/D1"].map(tf => (
                        <button
                          key={`enable-alt-${tf}`}
                          type="button"
                          onClick={() => {
                            setAllowedSymbolsList(prev => {
                              const next = { ...prev };
                              altsList.forEach(sym => {
                                const current = prev[sym] ?? [];
                                if (!current.includes(tf)) {
                                  next[sym] = [...current, tf];
                                }
                              });
                              return next;
                            });
                          }}
                          className="px-1 py-0.5 bg-zinc-950 border border-zinc-850 hover:border-zinc-700 rounded text-emerald-400 hover:text-emerald-300 transition-all font-mono shrink-0"
                        >
                          +{tf.split("/")[0]}
                        </button>
                      ))}
                      <span className="mx-1 font-normal text-zinc-800">|</span>
                      <span className="mr-0.5">Disable All:</span>
                      {["M5/H1", "M15/H4", "M30/H6", "H1/D1"].map(tf => (
                        <button
                          key={`disable-alt-${tf}`}
                          type="button"
                          onClick={() => {
                            setAllowedSymbolsList(prev => {
                              const next = { ...prev };
                              altsList.forEach(sym => {
                                const current = prev[sym] ?? [];
                                next[sym] = current.filter(t => t !== tf);
                              });
                              return next;
                            });
                          }}
                          className="px-1 py-0.5 bg-zinc-950 border border-zinc-850 hover:border-zinc-700 rounded text-red-400 hover:text-red-300 transition-all font-mono shrink-0"
                        >
                          -{tf.split("/")[0]}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="h-[220px] overflow-y-auto pr-1 custom-scrollbar flex flex-col gap-2 select-none">
                    {okxSymbols
                      .filter(s => s.type === 'alt')
                      .filter(s => s.symbol.toLowerCase().includes(altSearchQuery.toLowerCase()))
                      .map(s => {
                        const isChecked = isSymbolChecked(s.symbol);
                        return (
                          <div
                            key={s.symbol}
                            className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-2 bg-zinc-950/40 hover:bg-zinc-950/80 border border-zinc-900 hover:border-zinc-800/80 rounded-xl transition-all"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <button
                                type="button"
                                onClick={() => toggleWholeSymbol(s.symbol)}
                                className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 transition-all ${
                                  isChecked ? 'border-purple-500 bg-purple-500 text-black' : 'border-zinc-800 bg-zinc-900'
                                }`}
                              >
                                {isChecked && (
                                  <svg className="w-2.5 h-2.5 fill-current stroke-2" viewBox="0 0 24 24">
                                    <path fill="none" stroke="currentColor" strokeWidth="4" d="M5 13l4 4L19 7" />
                                  </svg>
                                )}
                              </button>
                              <span className={`text-[10px] font-mono tracking-wider font-bold truncate ${isChecked ? 'text-white' : 'text-zinc-500'}`}>
                                {s.symbol}
                              </span>
                              <span className="px-1 py-0.5 rounded text-[7px] font-black uppercase tracking-widest bg-purple-500/10 text-purple-400 border border-purple-500/20 shrink-0 select-none">
                                alt
                              </span>
                            </div>
                            
                            <div className="flex items-center gap-1 shrink-0 self-end sm:self-auto">
                              {["M5/H1", "M15/H4", "M30/H6", "H1/D1"].map(tf => {
                                const active = isTfChecked(s.symbol, tf);
                                const shortLabel = tf.split("/")[0];
                                return (
                                  <button
                                    key={tf}
                                    type="button"
                                    onClick={() => toggleSymbolTimeframe(s.symbol, tf)}
                                    title={`Toggle ${tf} for ${s.symbol}`}
                                    className={`px-1.5 py-0.5 rounded text-[8px] font-black font-mono tracking-tighter uppercase transition-all select-none border shrink-0 ${
                                      active
                                        ? 'bg-gradient-to-r from-purple-500/20 to-fuchsia-500/20 border-purple-500/60 text-purple-300 shadow-[0_0_6px_rgba(168,85,247,0.15)] hover:border-purple-400'
                                        : 'border-zinc-850 text-zinc-500 bg-zinc-950/20 hover:text-zinc-300 hover:bg-zinc-900/40'
                                    }`}
                                  >
                                    {shortLabel}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Live Performance & Sync Terminal Row */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pt-8 border-t border-zinc-850">
          <div className="lg:col-span-5 space-y-8">
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
          </div>

          <div className="lg:col-span-7 bg-zinc-950 border border-zinc-850 rounded-3xl p-6 h-[460px] overflow-hidden flex flex-col relative font-mono text-xs">
            <div className="flex justify-between items-center pb-4 border-b border-zinc-850 mb-3 text-[10px] text-zinc-500 uppercase tracking-widest shrink-0">
              <div className="flex gap-6">
                <button type="button" onClick={() => setTerminalTab('trade')} className={`font-black tracking-widest uppercase transition-all pb-1 ${terminalTab === 'trade' ? 'text-orange-500 border-b-2 border-orange-500 font-bold' : 'text-zinc-500 hover:text-zinc-300'}`}>
                  📈 Trade Logs ({activeEx.name})
                </button>
                <button type="button" onClick={() => setTerminalTab('vault')} className={`font-black tracking-widest uppercase transition-all pb-1 ${terminalTab === 'vault' ? 'text-orange-500 border-b-2 border-orange-500 font-bold' : 'text-zinc-500 hover:text-zinc-300'}`}>
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
                    <div className="flex items-center justify-center h-full text-zinc-600 font-bold uppercase tracking-wider text-[10px]">No trade execution logs found.</div>
                  ) : (
                    tradeLogs.map((log, i) => {
                      const timeStr = new Date(log.created_at).toLocaleTimeString();
                      const isError = log.log_type === 'ERROR' || log.message.includes('❌');
                      const isSuccess = log.log_type === 'SUCCESS' || log.message.includes('✅');
                      const colorClass = isError ? 'text-red-400 font-semibold' : isSuccess ? 'text-emerald-400 font-semibold' : 'text-zinc-300';
                      return (
                        <div key={log.id || i} className="flex gap-2.5 text-zinc-400 animate-fadeIn">
                          <span className="text-zinc-600 select-none shrink-0">&gt;&gt;</span>
                          <span className="text-zinc-500 select-none font-semibold shrink-0">[{timeStr}]</span>
                          {log.symbol && <span className="text-blue-400 font-bold shrink-0">[{log.symbol.toUpperCase()}]</span>}
                          <span className={colorClass}>{log.message}</span>
                        </div>
                      );
                    })
                  );
                })()
              ) : (
                (() => {
                  const vaultLogs = exchangeLogs.filter(log => !log.symbol);
                  return (
                    <div className="space-y-2.5">
                      {vaultLogs.map((log, i) => (
                        <div key={log.id || i} className="flex gap-2.5 text-zinc-400">
                          <span className="text-zinc-600 select-none shrink-0">&gt;&gt;</span>
                          <span className="text-zinc-300">{log.message}</span>
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
  );
}
