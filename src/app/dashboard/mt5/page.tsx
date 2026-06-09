'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import AccessGuard from '@/components/AccessGuard';
import { 
  ShieldAlert, ShieldCheck, Activity, Wallet, Percent, 
  Target, Lock, Save, Settings2, BarChart3, TrendingUp, CheckCircle, 
  XCircle, ToggleLeft, ToggleRight, ArrowUpRight, ArrowDownRight, Flame,
  PlayCircle, Compass, Award, GitBranch, ChevronDown, Trash2, Power, Terminal
} from 'lucide-react';

const MT5_SYMBOLS = [
  // Major Symbols (Metals, Indices, Forex)
  { symbol: 'XAUUSD', name: 'Gold vs US Dollar', category: 'METALS', type: 'major' },
  { symbol: 'XAGUSD', name: 'Silver vs US Dollar', category: 'METALS', type: 'major' },
  { symbol: 'NAS100', name: 'Nasdaq 100 Index', category: 'INDICES', type: 'major' },
  { symbol: 'SPX500', name: 'S&P 500 Index', category: 'INDICES', type: 'major' },
  { symbol: 'US30', name: 'Dow Jones Index', category: 'INDICES', type: 'major' },
  { symbol: 'EURUSD', name: 'Euro vs US Dollar', category: 'FOREX', type: 'major' },
  { symbol: 'GBPUSD', name: 'Pound vs US Dollar', category: 'FOREX', type: 'major' },
  { symbol: 'USDJPY', name: 'US Dollar vs Yen', category: 'FOREX', type: 'major' },
  { symbol: 'GBPJPY', name: 'Pound vs Yen', category: 'FOREX', type: 'major' },
  { symbol: 'AUDUSD', name: 'Australian Dollar vs USD', category: 'FOREX', type: 'major' },
  { symbol: 'EURJPY', name: 'Euro vs Yen', category: 'FOREX', type: 'major' },
  { symbol: 'NZDUSD', name: 'NZ Dollar vs USD', category: 'FOREX', type: 'major' },
  { symbol: 'CHFJPY', name: 'Swiss Franc vs Yen', category: 'FOREX', type: 'major' },

  // Alt Symbols (Crypto - Major Only)
  { symbol: 'BTCUSD', name: 'Bitcoin vs USD', category: 'CRYPTO', type: 'alt' },
  { symbol: 'ETHUSD', name: 'Ethereum vs USD', category: 'CRYPTO', type: 'alt' },
  { symbol: 'XRPUSD', name: 'Ripple vs USD', category: 'CRYPTO', type: 'alt' },
  { symbol: 'ADAUSD', name: 'Cardano vs USD', category: 'CRYPTO', type: 'alt' },
  { symbol: 'SOLUSD', name: 'Solana vs USD', category: 'CRYPTO', type: 'alt' },
  { symbol: 'LTCUSD', name: 'Litecoin vs USD', category: 'CRYPTO', type: 'alt' },
  { symbol: 'LINKUSD', name: 'Chainlink vs USD', category: 'CRYPTO', type: 'alt' },
  { symbol: 'BNBUSD', name: 'Binance Coin vs USD', category: 'CRYPTO', type: 'alt' },
  { symbol: 'AVAXUSD', name: 'Avalanche vs USD', category: 'CRYPTO', type: 'alt' },
  { symbol: 'DOTUSD', name: 'Polkadot vs USD', category: 'CRYPTO', type: 'alt' },
  { symbol: 'TRXUSD', name: 'Tron vs USD', category: 'CRYPTO', type: 'alt' }
];


interface SymbolConfig {
  timeframes: string[];
  grades: string[];
}

function SymbolGradeDropdown({ symbol, selectedGrades, onChange }: { symbol: string, selectedGrades: string[], onChange: (grades: string[]) => void }) {
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

  const options = ["All", "A++", "A+", "Good", "Normal"];

  const handleToggle = (grade: string) => {
    if (grade === 'All') {
      onChange(['All']);
    } else {
      let next = selectedGrades.includes(grade)
        ? selectedGrades.filter(g => g !== grade)
        : [...selectedGrades.filter(g => g !== 'All'), grade];
      if (next.length === 0) {
        next = ['All'];
      }
      onChange(next);
    }
  };

  const displayText = selectedGrades.includes('All') || selectedGrades.length === 0 ? 'All' : selectedGrades.join(', ');

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="px-2.5 py-1 rounded text-[10px] font-black font-mono tracking-tighter uppercase transition-all select-none border border-zinc-800 text-zinc-400 bg-zinc-900/40 hover:text-white hover:bg-zinc-800 shrink-0 flex items-center gap-1 cursor-pointer"
        title={`Configure grades for ${symbol}`}
      >
        <span>Grades: {displayText}</span>
        <ChevronDown size={10} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-1.5 w-32 rounded-xl bg-zinc-950 border border-zinc-800 p-2 shadow-2xl z-50 space-y-1 animate-fadeIn">
          {options.map(opt => {
            const checked = selectedGrades.includes(opt);
            return (
              <button
                key={opt}
                type="button"
                onClick={() => handleToggle(opt)}
                className="w-full flex items-center gap-2 px-2 py-1.5 text-[10px] font-mono font-bold text-left rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-900/60 transition-all cursor-pointer"
              >
                <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 ${
                  checked ? 'border-blue-500 bg-blue-500 text-black' : 'border-zinc-800 bg-zinc-900'
                }`}>
                  {checked && (
                    <svg className="w-2.5 h-2.5 fill-current stroke-2" viewBox="0 0 24 24">
                      <path fill="none" stroke="currentColor" strokeWidth="4" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                <span>{opt}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function SymbolTfDropdown({
  symbol,
  selectedTfs,
  onChange
}: {
  symbol: string,
  selectedTfs: string[],
  onChange: (tfs: string[]) => void
}) {
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

  const options = ["M5/H1", "M15/H4", "M30/H6", "H1/D1"];

  const handleToggle = (tf: string) => {
    const next = selectedTfs.includes(tf)
      ? selectedTfs.filter(t => t !== tf)
      : [...selectedTfs, tf];
    onChange(next);
  };

  const getShortLabel = (tf: string) => tf.split("/")[0];
  const displayText = selectedTfs.length === 0
    ? 'None'
    : selectedTfs.length === options.length
    ? 'All'
    : selectedTfs.map(getShortLabel).join(', ');

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="px-2.5 py-1 rounded text-[10px] font-black font-mono tracking-tighter uppercase transition-all select-none border border-zinc-800 text-zinc-400 bg-zinc-900/40 hover:text-white hover:bg-zinc-800 shrink-0 flex items-center gap-1 cursor-pointer"
        title={`Configure timeframes for ${symbol}`}
      >
        <span>TFs: {displayText}</span>
        <ChevronDown size={10} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-1.5 w-32 rounded-xl bg-zinc-950 border border-zinc-800 p-2 shadow-2xl z-50 space-y-1 animate-fadeIn">
          {options.map(opt => {
            const checked = selectedTfs.includes(opt);
            return (
              <button
                key={opt}
                type="button"
                onClick={() => handleToggle(opt)}
                className="w-full flex items-center gap-2 px-2 py-1.5 text-[10px] font-mono font-bold text-left rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-900/60 transition-all cursor-pointer"
              >
                <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 ${
                  checked ? 'border-blue-500 bg-blue-500 text-black' : 'border-zinc-800 bg-zinc-900'
                }`}>
                  {checked && (
                    <svg className="w-2.5 h-2.5 fill-current stroke-2" viewBox="0 0 24 24">
                      <path fill="none" stroke="currentColor" strokeWidth="4" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                <span>{opt}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function MT5Dashboard() {
  const [supabase] = useState(() => createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  ));

  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [botToken, setBotToken] = useState<string | null>(null);
  const [status, setStatus] = useState('stopped');
  const [isResetting, setIsResetting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Sync parameters from bot table
  const [botConfig, setBotConfig] = useState<any>({
    is_enabled: true,
    daily_risk_wallet: 1000,
    risk_percentage: 1.0,
    rr: 1.5,
    max_concurrent_setups: 3,
    account_mode: 'Hedging',
    base_capital: 5000
  });

  const [allowedSymbolsList, setAllowedSymbolsList] = useState<Record<string, SymbolConfig>>({});
  const [searchQuery, setSearchQuery] = useState("");

  const [terminalTab, setTerminalTab] = useState<'trade' | 'bridge'>('trade');
  const [bridgeLogs, setBridgeLogs] = useState<string[]>([]);
  const [rawExecutions, setRawExecutions] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<any>({
    total: 0, partialTps: 0, fullTps: 0, sls: 0, bes: 0, opening: 5000, closing: 5000, pnl: 0
  });

  const addLog = useCallback((msg: string, timestamp?: string, type?: string) => {
    const time = timestamp ? new Date(timestamp) : new Date();
    const prefix = type ? `[${type}] ` : '';
    const newLog = `[${time.toLocaleTimeString()}] ${prefix}${msg}`;
    setBridgeLogs((prev) => {
      const uniqueLogs = Array.from(new Set([...prev, newLog]));
      return uniqueLogs.slice(-100);
    });
  }, []);

  const parseAllowedSymbols = (loaded: any): Record<string, SymbolConfig> => {
    const res: Record<string, SymbolConfig> = {};
    if (loaded && typeof loaded === 'object' && !Array.isArray(loaded)) {
      Object.entries(loaded).forEach(([sym, val]: [string, any]) => {
        if (Array.isArray(val)) {
          res[sym] = { timeframes: val, grades: ['All'] };
        } else if (val && typeof val === 'object') {
          res[sym] = { timeframes: val.timeframes || [], grades: val.grades || ['All'] };
        } else {
          res[sym] = { timeframes: [], grades: ['All'] };
        }
      });
      return res;
    }
    // Set default empty lists for all supported symbols
    MT5_SYMBOLS.forEach(s => {
      res[s.symbol] = { timeframes: [], grades: ['All'] };
    });
    return res;
  };

  const getActiveCount = (list: string[]) => {
    return list.filter(sym => {
      const config = allowedSymbolsList[sym];
      return config && config.timeframes && config.timeframes.length > 0;
    }).length;
  };

  const fetchDashboardData = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        setLoading(false);
        return;
      }
      
      const uId = session.user.id;
      setUserId(uId);

      // Fetch Bot Token mapping from bot_signals
      let { data: sigData } = await supabase
        .from('bot_signals')
        .select('bot_token, is_active')
        .eq('user_id', uId)
        .eq('platform', 'MT5')
        .maybeSingle();

      if (!sigData) {
        const { data: newData } = await supabase
          .from('bot_signals')
          .insert([{ user_id: uId, platform: 'MT5' }])
          .select()
          .single();
        sigData = newData;
      }

      if (sigData) {
        setBotToken(sigData.bot_token);
        setStatus(sigData.is_active ? 'running' : 'stopped');
      }

      // Fetch MT5 configurations from mt5_auth
      let { data: authConfig } = await supabase
        .from('mt5_auth')
        .select('*')
        .eq('user_id', uId)
        .maybeSingle();

      if (!authConfig) {
        const { data: newConfig } = await supabase
          .from('mt5_auth')
          .insert([{ user_id: uId }])
          .select()
          .single();
        authConfig = newConfig;
      }

      if (authConfig) {
        setBotConfig({
          is_enabled: authConfig.is_enabled ?? true,
          daily_risk_wallet: authConfig.daily_risk_wallet ?? 1000,
          risk_percentage: authConfig.risk_percentage ?? 1.0,
          rr: authConfig.rr ?? 1.5,
          max_concurrent_setups: authConfig.max_concurrent_setups ?? 3,
          account_mode: authConfig.account_mode ?? 'Hedging',
          base_capital: authConfig.base_capital ?? 5000
        });
        setAllowedSymbolsList(parseAllowedSymbols(authConfig.allowed_symbols));
      }

      // Fetch executions
      const { data: execs } = await supabase
        .from('trade_executions')
        .select('*')
        .eq('user_id', uId)
        .eq('exchange_name', 'mt5');

      const executions = execs || [];
      setRawExecutions(executions);

      // Calculate performance metrics
      const baseCap = authConfig?.base_capital ?? 5000;
      if (executions.length > 0) {
        const partialTpCount = executions.filter(e => 
          (e.tp_hits && e.tp_hits >= 1) || 
          ['TP1_HIT', 'TP2_HIT', 'BE_HIT', 'BE_MODIFIED'].includes(e.status)
        ).length;
        const fullTpCount = executions.filter(e => e.status === 'TP2_HIT').length;
        const slCount = executions.filter(e => e.status === 'SL_HIT' || (e.sl_hits && e.sl_hits > 0)).length;
        const beCount = executions.filter(e => e.status === 'BE_HIT').length;
        const totalPnL = executions.reduce((acc, curr) => acc + (curr.pnl ?? 0), 0);
        
        setMetrics({
          total: executions.length,
          partialTps: partialTpCount,
          fullTps: fullTpCount,
          sls: slCount,
          bes: beCount,
          opening: baseCap,
          closing: baseCap + totalPnL,
          pnl: totalPnL
        });
      } else {
        setMetrics({
          total: 0,
          partialTps: 0,
          fullTps: 0,
          sls: 0,
          bes: 0,
          opening: baseCap,
          closing: baseCap,
          pnl: 0
        });
      }

      setLoading(false);
    } catch (e) {
      console.error(e);
      setLoading(false);
    }
  }, [supabase]);

  // Fetch bridge logs
  const fetchRecentLogs = useCallback(async (token: string) => {
    const { data } = await supabase
      .from('cbot_logs')
      .select('message, created_at, log_type')
      .eq('bot_token', token)
      .order('created_at', { ascending: false })
      .limit(30);

    if (data) {
      const history = data.map((log: any) => {
        const typePrefix = log.log_type ? `[${log.log_type}] ` : '';
        return `[${new Date(log.created_at).toLocaleTimeString()}] ${typePrefix}${log.message}`;
      });
      setBridgeLogs(history.reverse());
    }
  }, [supabase]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Subscriptions for logs & executions
  useEffect(() => {
    if (!userId) return;

    if (botToken) {
      fetchRecentLogs(botToken);
    }

    const channel = supabase
      .channel('mt5-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'trade_executions', filter: `user_id=eq.${userId}` },
        (payload) => {
          if (payload.new && (payload.new as any).exchange_name === 'mt5') {
            fetchDashboardData();
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'mt5_auth', filter: `user_id=eq.${userId}` },
        () => {
          fetchDashboardData();
        }
      );

    let logSub: any = null;
    if (botToken) {
      logSub = supabase
        .channel(`private-mt5-logs-${botToken}`)
        .on('postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'cbot_logs', filter: `bot_token=eq.${botToken}` },
          (payload) => { addLog(payload.new.message, payload.new.created_at, payload.new.log_type); }
        );
      logSub.subscribe();
    }

    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
      if (logSub) supabase.removeChannel(logSub);
    };
  }, [userId, botToken, fetchDashboardData, fetchRecentLogs, addLog, supabase]);

  // Checklist Toggles
  const isSymbolChecked = (symbol: string) => {
    const config = allowedSymbolsList[symbol];
    const tfs = config?.timeframes || [];
    return tfs && tfs.length > 0;
  };

  const isTfChecked = (symbol: string, tf: string) => {
    const config = allowedSymbolsList[symbol];
    const tfs = config?.timeframes || [];
    return tfs && tfs.includes(tf);
  };

  const toggleWholeSymbol = (symbol: string) => {
    setAllowedSymbolsList(prev => {
      const config = prev[symbol];
      const currentTfs = config?.timeframes || [];
      const currentGrades = config?.grades || ['All'];
      const allTfs = ["M5/H1", "M15/H4", "M30/H6", "H1/D1"];
      const isAnyChecked = currentTfs.length > 0;
      return {
        ...prev,
        [symbol]: {
          timeframes: isAnyChecked ? [] : allTfs,
          grades: isAnyChecked ? ['All'] : currentGrades
        }
      };
    });
  };

  const toggleSymbolTimeframe = (symbol: string, tf: string) => {
    setAllowedSymbolsList(prev => {
      const config = prev[symbol];
      const currentTfs = config?.timeframes || [];
      const currentGrades = config?.grades || ['All'];
      const nextTfs = currentTfs.includes(tf)
        ? currentTfs.filter(t => t !== tf)
        : [...currentTfs, tf];
      return {
        ...prev,
        [symbol]: {
          timeframes: nextTfs,
          grades: currentGrades
        }
      };
    });
  };

  const changeSymbolGrades = (symbol: string, grades: string[]) => {
    setAllowedSymbolsList(prev => {
      const config = prev[symbol];
      const currentTfs = config?.timeframes || [];
      return {
        ...prev,
        [symbol]: {
          timeframes: currentTfs,
          grades: grades
        }
      };
    });
  };

  const isTfAllChecked = (list: string[], tf: string) => {
    return list.every(sym => {
      const config = allowedSymbolsList[sym];
      const tfs = config?.timeframes || [];
      return tfs && tfs.includes(tf);
    });
  };

  const toggleTfBulk = (list: string[], tf: string) => {
    const isAllChecked = isTfAllChecked(list, tf);
    setAllowedSymbolsList(prev => {
      const next = { ...prev };
      list.forEach(sym => {
        const config = prev[sym];
        const currentTfs = config?.timeframes || [];
        const currentGrades = config?.grades || ['All'];
        if (isAllChecked) {
          next[sym] = {
            timeframes: currentTfs.filter(t => t !== tf),
            grades: currentGrades
          };
        } else {
          if (!currentTfs.includes(tf)) {
            next[sym] = {
              timeframes: [...currentTfs, tf],
              grades: currentGrades
            };
          }
        }
      });
      return next;
    });
  };

  const saveSettings = async () => {
    if (!userId) return;
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('mt5_auth')
        .update({
          allowed_symbols: allowedSymbolsList,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId);

      if (!error) {
        addLog("✅ Allowed Symbols checklist updated successfully.", undefined, "SUCCESS");
      } else {
        addLog(`❌ Failed to save allowed symbols checklist: ${error.message}`, undefined, "ERROR");
      }
    } catch (err: any) {
      addLog(`❌ Connection Error: ${err.message || err}`, undefined, "ERROR");
    } finally {
      setIsSaving(false);
    }
  };

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

  const handleResetData = async () => {
    if (!userId || !botToken) return;
    const confirmReset = window.confirm(
      "⚠️ DANGER ZONE: Are you sure you want to reset all your MT5 trade logs and executions?\n\nThis deletes your MT5 performance metrics permanently. This action cannot be undone."
    );
    if (!confirmReset) return;

    setIsResetting(true);
    addLog("⏳ Resetting MT5 logs and trade history...");
    try {
      await supabase.from('trade_executions').delete().eq('user_id', userId).eq('exchange_name', 'mt5');
      await supabase.from('cbot_logs').delete().eq('bot_token', botToken);
      
      setRawExecutions([]);
      setBridgeLogs([]);
      addLog("✅ MT5 Reset Successful.", undefined, "SUCCESS");
      fetchDashboardData();
    } catch (err: any) {
      addLog(`❌ Reset failed: ${err.message || err}`, undefined, "ERROR");
    } finally {
      setIsResetting(false);
    }
  };

  const metalsList = MT5_SYMBOLS.filter(s => s.category === 'METALS').map(s => s.symbol);
  const indicesList = MT5_SYMBOLS.filter(s => s.category === 'INDICES').map(s => s.symbol);
  const forexList = MT5_SYMBOLS.filter(s => s.category === 'FOREX').map(s => s.symbol);
  const cryptoList = MT5_SYMBOLS.filter(s => s.category === 'CRYPTO').map(s => s.symbol);

  const filteredMetals = MT5_SYMBOLS.filter(s => 
    s.category === 'METALS' && s.symbol.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const filteredIndices = MT5_SYMBOLS.filter(s => 
    s.category === 'INDICES' && s.symbol.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const filteredForex = MT5_SYMBOLS.filter(s => 
    s.category === 'FOREX' && s.symbol.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const filteredCrypto = MT5_SYMBOLS.filter(s => 
    s.category === 'CRYPTO' && s.symbol.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center justify-center py-20 animate-pulse">
          <Activity size={40} className="text-blue-500 mb-4 animate-spin" />
          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-blue-800">Initializing Secure Bridge...</p>
        </div>
      </div>
    );
  }

  return (
    <AccessGuard requiredTier={2} tierName="PRO">
      <div className="w-full relative z-10 space-y-6 md:space-y-8 text-white">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-8 md:mb-12 border-b border-zinc-800 pb-8">
          <div>
            <h1 className="text-2xl md:text-4xl font-black tracking-tighter italic flex items-center gap-3 uppercase text-zinc-900 dark:text-white">
              <img src="/mt5.png" alt="MetaTrader 5" className="w-8 h-8 md:w-10 md:h-10 object-contain drop-shadow-[0_0_15px_rgba(59,130,246,0.5)]" />
              MetaTrader 5<span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-500">Terminal</span>
            </h1>
            <p className="text-[10px] uppercase tracking-[0.4em] text-zinc-600 dark:text-zinc-500 font-bold mt-3 leading-none">
              • HIGH-FREQUENCY EXECUTION BRIDGE •
            </p>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3 px-5 py-2.5 bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-xl backdrop-blur-md shadow-xl">
              <div className={`w-2.5 h-2.5 rounded-full ${status === 'running' ? 'bg-blue-400 shadow-[0_0_10px_rgba(59,130,246,0.8)]' : 'bg-red-400 shadow-[0_0_10px_rgba(248,113,113,0.8)]'} animate-pulse`} />
              <span className={`text-[10px] font-black uppercase tracking-widest ${status === 'running' ? 'text-blue-400' : 'text-red-400'}`}>
                {status === 'running' ? 'VPS ONLINE' : 'VPS OFFLINE'}
              </span>
            </div>
          </div>
        </div>

        {/* Performance Board */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <div className="glass-panel p-5">
            <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Executions</span>
            <p className="text-2xl font-black mt-2 font-mono">{metrics.total}</p>
          </div>
          <div className="glass-panel p-5">
            <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Partial TPs</span>
            <p className="text-2xl font-black mt-2 font-mono text-emerald-400">✓ {metrics.partialTps}</p>
          </div>
          <div className="glass-panel p-5">
            <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Full TPs</span>
            <p className="text-2xl font-black mt-2 font-mono text-blue-400">✓ {metrics.fullTps}</p>
          </div>
          <div className="glass-panel p-5">
            <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">SL Hits</span>
            <p className="text-2xl font-black mt-2 font-mono text-red-500">✗ {metrics.sls}</p>
          </div>
          <div className="glass-panel p-5">
            <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Break Evens</span>
            <p className="text-2xl font-black mt-2 font-mono text-zinc-400">✓ {metrics.bes}</p>
          </div>
        </div>

        {/* Vault Balance Cards */}
        <div className="glass-panel p-8 space-y-6">
          <h3 className="text-xs font-black text-blue-500 uppercase tracking-widest flex items-center gap-2">
            <BarChart3 size={16} /> MT5 Performance Board
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-zinc-950/50 border border-zinc-800 p-6 rounded-2xl">
              <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Opening Balance</span>
              <p className="text-3xl font-black mt-2 font-mono">${metrics.opening.toFixed(2)}</p>
            </div>
            <div className="bg-zinc-950/50 border border-zinc-800 p-6 rounded-2xl">
              <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Closing Balance</span>
              <p className="text-3xl font-black mt-2 font-mono">${metrics.closing.toFixed(2)}</p>
            </div>
            <div className="bg-zinc-950/50 border border-zinc-800 p-6 rounded-2xl flex flex-col justify-between">
              <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Net Realized PnL</span>
              <div className="flex items-center gap-2 mt-2">
                <p className={`text-3xl font-black font-mono ${metrics.pnl >= 0 ? 'text-emerald-400' : 'text-red-500'}`}>
                  {metrics.pnl >= 0 ? `+$${metrics.pnl.toFixed(2)}` : `-$${Math.abs(metrics.pnl).toFixed(2)}`}
                </p>
                {metrics.pnl >= 0 ? <ArrowUpRight className="text-emerald-400" /> : <ArrowDownRight className="text-red-500" />}
              </div>
            </div>
          </div>
        </div>

        {/* Synced Settings from Terminal */}
        <div className="glass-panel p-8 space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-xs font-black text-blue-500 uppercase tracking-widest flex items-center gap-2">
              <Settings2 size={16} /> Bot parameters (Synced from Terminal)
            </h3>
            <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-wider">Read-Only</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 font-mono text-xs">
            <div className="bg-zinc-950/30 border border-zinc-850 p-4 rounded-xl">
              <span className="text-[8px] text-zinc-500 block uppercase tracking-wider mb-1">Account Mode</span>
              <span className="font-bold uppercase text-white">{botConfig.account_mode}</span>
            </div>
            <div className="bg-zinc-950/30 border border-zinc-850 p-4 rounded-xl">
              <span className="text-[8px] text-zinc-500 block uppercase tracking-wider mb-1">Base Capital</span>
              <span className="font-bold text-white">${botConfig.base_capital}</span>
            </div>
            <div className="bg-zinc-950/30 border border-zinc-850 p-4 rounded-xl">
              <span className="text-[8px] text-zinc-500 block uppercase tracking-wider mb-1">Daily Risk</span>
              <span className="font-bold text-white">${botConfig.daily_risk_wallet}</span>
            </div>
            <div className="bg-zinc-950/30 border border-zinc-850 p-4 rounded-xl">
              <span className="text-[8px] text-zinc-500 block uppercase tracking-wider mb-1">Risk Percentage</span>
              <span className="font-bold text-white">{botConfig.risk_percentage}%</span>
            </div>
            <div className="bg-zinc-950/30 border border-zinc-850 p-4 rounded-xl">
              <span className="text-[8px] text-zinc-500 block uppercase tracking-wider mb-1">Min RR</span>
              <span className="font-bold text-white">{botConfig.rr} R</span>
            </div>
            <div className="bg-zinc-950/30 border border-zinc-850 p-4 rounded-xl">
              <span className="text-[8px] text-zinc-500 block uppercase tracking-wider mb-1">Max Concurrent</span>
              <span className="font-bold text-white">{botConfig.max_concurrent_setups}</span>
            </div>
          </div>
        </div>

        {/* Allowed Symbols Section */}
        <div className="glass-panel p-8 space-y-6">
          <div className="flex justify-between items-center flex-wrap gap-4 border-b border-zinc-850 pb-4">
            <div>
              <h2 className="text-[12px] font-black uppercase tracking-[0.2em] text-blue-500">
                ALLOWED SYMBOLS CHECKLIST
              </h2>
              <p className="text-[10px] text-zinc-500 font-mono mt-1">
                Configure allowed timeframes and grades per symbol. Toggled off symbols are blocked.
              </p>
            </div>
            <input
              type="text"
              placeholder="Search all symbols..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2 text-xs outline-none w-48 focus:border-blue-500 transition-all font-mono text-white"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            
            {/* 1. Metals Card */}
            <div className="bg-zinc-950/40 border border-zinc-900 p-6 rounded-2xl space-y-4">
              <div className="flex justify-between items-center border-b border-zinc-900 pb-3">
                <div>
                  <h3 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2">
                    <Flame size={14} className="text-blue-400" /> Metals
                  </h3>
                  <span className="text-[8px] font-mono text-zinc-500 uppercase">
                    Enabled: {getActiveCount(metalsList)} / {metalsList.length}
                  </span>
                </div>
                <div className="flex gap-1">
                  {["M5/H1", "M15/H4", "M30/H6", "H1/D1"].map(tf => {
                    const bulkChecked = isTfAllChecked(metalsList, tf);
                    return (
                      <button
                        key={tf}
                        type="button"
                        onClick={() => toggleTfBulk(metalsList, tf)}
                        className={`px-1.5 py-0.5 rounded text-[8px] font-bold font-mono tracking-tighter uppercase transition-all border shrink-0 cursor-pointer ${
                          bulkChecked 
                            ? 'border-blue-500 bg-blue-500/10 text-blue-400' 
                            : 'border-zinc-800 text-zinc-500 hover:text-zinc-300'
                        }`}
                      >
                        {tf.split("/")[0]}
                      </button>
                    );
                  })}
                </div>
              </div>
              
              <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-2 custom-scrollbar">
                {filteredMetals.map(sym => {
                  const checked = isSymbolChecked(sym.symbol);
                  return (
                    <div key={sym.symbol} className="flex items-center justify-between p-2.5 bg-zinc-950/20 border border-zinc-850/60 rounded-xl hover:border-zinc-800 transition-all select-none">
                      <button
                        type="button"
                        onClick={() => toggleWholeSymbol(sym.symbol)}
                        className="flex items-center gap-2 text-left focus:outline-none cursor-pointer flex-1 min-w-0"
                      >
                        <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 ${
                          checked ? 'border-blue-500 bg-blue-500 text-black' : 'border-zinc-850 bg-zinc-900'
                        }`}>
                          {checked && (
                            <svg className="w-2.5 h-2.5 fill-current stroke-2" viewBox="0 0 24 24">
                              <path fill="none" stroke="currentColor" strokeWidth="4" d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                        <div className="truncate">
                          <span className="text-xs font-black font-mono block text-white">{sym.symbol}</span>
                          <span className="text-[7.5px] text-zinc-500 font-bold block uppercase tracking-tight">{sym.name}</span>
                        </div>
                      </button>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <SymbolTfDropdown
                          symbol={sym.symbol}
                          selectedTfs={allowedSymbolsList[sym.symbol]?.timeframes || []}
                          onChange={(tfs) => {
                            setAllowedSymbolsList(prev => ({
                              ...prev,
                              [sym.symbol]: {
                                timeframes: tfs,
                                grades: prev[sym.symbol]?.grades || ['All']
                              }
                            }));
                          }}
                        />
                        <SymbolGradeDropdown
                          symbol={sym.symbol}
                          selectedGrades={allowedSymbolsList[sym.symbol]?.grades || ['All']}
                          onChange={(grades) => changeSymbolGrades(sym.symbol, grades)}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 2. Indices Card */}
            <div className="bg-zinc-950/40 border border-zinc-900 p-6 rounded-2xl space-y-4">
              <div className="flex justify-between items-center border-b border-zinc-900 pb-3">
                <div>
                  <h3 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2">
                    <BarChart3 size={14} className="text-blue-400" /> Indices
                  </h3>
                  <span className="text-[8px] font-mono text-zinc-500 uppercase">
                    Enabled: {getActiveCount(indicesList)} / {indicesList.length}
                  </span>
                </div>
                <div className="flex gap-1">
                  {["M5/H1", "M15/H4", "M30/H6", "H1/D1"].map(tf => {
                    const bulkChecked = isTfAllChecked(indicesList, tf);
                    return (
                      <button
                        key={tf}
                        type="button"
                        onClick={() => toggleTfBulk(indicesList, tf)}
                        className={`px-1.5 py-0.5 rounded text-[8px] font-bold font-mono tracking-tighter uppercase transition-all border shrink-0 cursor-pointer ${
                          bulkChecked 
                            ? 'border-blue-500 bg-blue-500/10 text-blue-400' 
                            : 'border-zinc-800 text-zinc-500 hover:text-zinc-300'
                        }`}
                      >
                        {tf.split("/")[0]}
                      </button>
                    );
                  })}
                </div>
              </div>
              
              <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-2 custom-scrollbar">
                {filteredIndices.map(sym => {
                  const checked = isSymbolChecked(sym.symbol);
                  return (
                    <div key={sym.symbol} className="flex items-center justify-between p-2.5 bg-zinc-950/20 border border-zinc-850/60 rounded-xl hover:border-zinc-800 transition-all select-none">
                      <button
                        type="button"
                        onClick={() => toggleWholeSymbol(sym.symbol)}
                        className="flex items-center gap-2 text-left focus:outline-none cursor-pointer flex-1 min-w-0"
                      >
                        <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 ${
                          checked ? 'border-blue-500 bg-blue-500 text-black' : 'border-zinc-850 bg-zinc-900'
                        }`}>
                          {checked && (
                            <svg className="w-2.5 h-2.5 fill-current stroke-2" viewBox="0 0 24 24">
                              <path fill="none" stroke="currentColor" strokeWidth="4" d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                        <div className="truncate">
                          <span className="text-xs font-black font-mono block text-white">{sym.symbol}</span>
                          <span className="text-[7.5px] text-zinc-500 font-bold block uppercase tracking-tight">{sym.name}</span>
                        </div>
                      </button>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <SymbolTfDropdown
                          symbol={sym.symbol}
                          selectedTfs={allowedSymbolsList[sym.symbol]?.timeframes || []}
                          onChange={(tfs) => {
                            setAllowedSymbolsList(prev => ({
                              ...prev,
                              [sym.symbol]: {
                                timeframes: tfs,
                                grades: prev[sym.symbol]?.grades || ['All']
                              }
                            }));
                          }}
                        />
                        <SymbolGradeDropdown
                          symbol={sym.symbol}
                          selectedGrades={allowedSymbolsList[sym.symbol]?.grades || ['All']}
                          onChange={(grades) => changeSymbolGrades(sym.symbol, grades)}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 3. Forex Card */}
            <div className="bg-zinc-950/40 border border-zinc-900 p-6 rounded-2xl space-y-4">
              <div className="flex justify-between items-center border-b border-zinc-900 pb-3">
                <div>
                  <h3 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2">
                    <Compass size={14} className="text-blue-400" /> Forex
                  </h3>
                  <span className="text-[8px] font-mono text-zinc-500 uppercase">
                    Enabled: {getActiveCount(forexList)} / {forexList.length}
                  </span>
                </div>
                <div className="flex gap-1">
                  {["M5/H1", "M15/H4", "M30/H6", "H1/D1"].map(tf => {
                    const bulkChecked = isTfAllChecked(forexList, tf);
                    return (
                      <button
                        key={tf}
                        type="button"
                        onClick={() => toggleTfBulk(forexList, tf)}
                        className={`px-1.5 py-0.5 rounded text-[8px] font-bold font-mono tracking-tighter uppercase transition-all border shrink-0 cursor-pointer ${
                          bulkChecked 
                            ? 'border-blue-500 bg-blue-500/10 text-blue-400' 
                            : 'border-zinc-800 text-zinc-500 hover:text-zinc-300'
                        }`}
                      >
                        {tf.split("/")[0]}
                      </button>
                    );
                  })}
                </div>
              </div>
              
              <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                {filteredForex.map(sym => {
                  const checked = isSymbolChecked(sym.symbol);
                  return (
                    <div key={sym.symbol} className="flex items-center justify-between p-2.5 bg-zinc-950/20 border border-zinc-850/60 rounded-xl hover:border-zinc-800 transition-all select-none">
                      <button
                        type="button"
                        onClick={() => toggleWholeSymbol(sym.symbol)}
                        className="flex items-center gap-2 text-left focus:outline-none cursor-pointer flex-1 min-w-0"
                      >
                        <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 ${
                          checked ? 'border-blue-500 bg-blue-500 text-black' : 'border-zinc-850 bg-zinc-900'
                        }`}>
                          {checked && (
                            <svg className="w-2.5 h-2.5 fill-current stroke-2" viewBox="0 0 24 24">
                              <path fill="none" stroke="currentColor" strokeWidth="4" d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                        <div className="truncate">
                          <span className="text-xs font-black font-mono block text-white">{sym.symbol}</span>
                          <span className="text-[7.5px] text-zinc-500 font-bold block uppercase tracking-tight">{sym.name}</span>
                        </div>
                      </button>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <SymbolTfDropdown
                          symbol={sym.symbol}
                          selectedTfs={allowedSymbolsList[sym.symbol]?.timeframes || []}
                          onChange={(tfs) => {
                            setAllowedSymbolsList(prev => ({
                              ...prev,
                              [sym.symbol]: {
                                timeframes: tfs,
                                grades: prev[sym.symbol]?.grades || ['All']
                              }
                            }));
                          }}
                        />
                        <SymbolGradeDropdown
                          symbol={sym.symbol}
                          selectedGrades={allowedSymbolsList[sym.symbol]?.grades || ['All']}
                          onChange={(grades) => changeSymbolGrades(sym.symbol, grades)}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 4. Crypto (Major Only) Card */}
            <div className="bg-zinc-950/40 border border-zinc-900 p-6 rounded-2xl space-y-4">
              <div className="flex justify-between items-center border-b border-zinc-900 pb-3">
                <div>
                  <h3 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2">
                    <Award size={14} className="text-blue-400" /> Crypto (Major Only)
                  </h3>
                  <span className="text-[8px] font-mono text-zinc-500 uppercase">
                    Enabled: {getActiveCount(cryptoList)} / {cryptoList.length}
                  </span>
                </div>
                <div className="flex gap-1">
                  {["M5/H1", "M15/H4", "M30/H6", "H1/D1"].map(tf => {
                    const bulkChecked = isTfAllChecked(cryptoList, tf);
                    return (
                      <button
                        key={tf}
                        type="button"
                        onClick={() => toggleTfBulk(cryptoList, tf)}
                        className={`px-1.5 py-0.5 rounded text-[8px] font-bold font-mono tracking-tighter uppercase transition-all border shrink-0 cursor-pointer ${
                          bulkChecked 
                            ? 'border-blue-500 bg-blue-500/10 text-blue-400' 
                            : 'border-zinc-800 text-zinc-500 hover:text-zinc-300'
                        }`}
                      >
                        {tf.split("/")[0]}
                      </button>
                    );
                  })}
                </div>
              </div>
              
              <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                {filteredCrypto.map(sym => {
                  const checked = isSymbolChecked(sym.symbol);
                  return (
                    <div key={sym.symbol} className="flex items-center justify-between p-2.5 bg-zinc-950/20 border border-zinc-850/60 rounded-xl hover:border-zinc-800 transition-all select-none">
                      <button
                        type="button"
                        onClick={() => toggleWholeSymbol(sym.symbol)}
                        className="flex items-center gap-2 text-left focus:outline-none cursor-pointer flex-1 min-w-0"
                      >
                        <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 ${
                          checked ? 'border-blue-500 bg-blue-500 text-black' : 'border-zinc-850 bg-zinc-900'
                        }`}>
                          {checked && (
                            <svg className="w-2.5 h-2.5 fill-current stroke-2" viewBox="0 0 24 24">
                              <path fill="none" stroke="currentColor" strokeWidth="4" d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                        <div className="truncate">
                          <span className="text-xs font-black font-mono block text-white">{sym.symbol}</span>
                          <span className="text-[7.5px] text-zinc-500 font-bold block uppercase tracking-tight">{sym.name}</span>
                        </div>
                      </button>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <SymbolTfDropdown
                          symbol={sym.symbol}
                          selectedTfs={allowedSymbolsList[sym.symbol]?.timeframes || []}
                          onChange={(tfs) => {
                            setAllowedSymbolsList(prev => ({
                              ...prev,
                              [sym.symbol]: {
                                timeframes: tfs,
                                grades: prev[sym.symbol]?.grades || ['All']
                              }
                            }));
                          }}
                        />
                        <SymbolGradeDropdown
                          symbol={sym.symbol}
                          selectedGrades={allowedSymbolsList[sym.symbol]?.grades || ['All']}
                          onChange={(grades) => changeSymbolGrades(sym.symbol, grades)}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>
        </div>

        {/* Save button floating panel */}
        <div className="glass-panel p-6 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-[11px] text-zinc-400 tracking-wide font-bold uppercase text-center sm:text-left leading-relaxed">
            💡 Allowed symbols configuration dynamically overrides signal dispatches for MT5 bots in real-time.
          </p>
          <button
            onClick={saveSettings}
            disabled={isSaving}
            className="px-8 py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 border border-blue-500/20 text-white text-[11px] font-black uppercase tracking-widest rounded-xl transition-all shadow-xl active:scale-95 flex items-center gap-2 cursor-pointer disabled:opacity-50 shrink-0 w-full sm:w-auto justify-center"
          >
            <Save size={14} /> {isSaving ? 'SAVING...' : 'SAVE CHECKLIST'}
          </button>
        </div>

        {/* Control and Reset Panels */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="glass-panel p-6 md:p-8 space-y-6">
            <h2 className="text-[11px] font-black uppercase tracking-widest flex items-center gap-3">
              <Power size={16} className="text-blue-400" /> Engine Controls
            </h2>
            <div className="space-y-4">
              <button
                onClick={() => handleControl('start')}
                className={`w-full py-4 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all duration-300 flex items-center justify-center gap-3 active:scale-95 ${status === 'running'
                  ? 'bg-[var(--glass-bg)] border border-[var(--glass-border)] text-zinc-600 cursor-not-allowed shadow-none'
                  : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-[0_0_30px_rgba(59,130,246,0.3)] hover:shadow-[0_0_40px_rgba(59,130,246,0.5)] border border-blue-500/30'
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

          <div className="glass-panel p-6 md:p-8 space-y-6">
            <h2 className="text-[11px] font-black uppercase tracking-widest flex items-center gap-3 text-red-400">
              <Trash2 size={16} /> Danger Zone
            </h2>
            <div className="space-y-4">
              <p className="text-zinc-400 text-xs leading-relaxed">
                Clear all historical trade logs, execution files, and MT5 performance metrics. Your Allowed Symbols checklists and bot credentials will not be affected.
              </p>
              <button
                onClick={handleResetData}
                disabled={isResetting}
                className="w-full py-4 bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 hover:shadow-[0_0_30px_rgba(239,68,68,0.2)] rounded-xl text-[11px] font-black uppercase tracking-widest transition-all shadow-xl active:scale-95 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Trash2 size={14} /> {isResetting ? 'RESETTING...' : 'RESET HISTORICAL DATA'}
              </button>
            </div>
          </div>
        </div>

        {/* Live log Terminal */}
        <div className="glass-panel overflow-hidden">
          <div className="flex border-b border-zinc-850 bg-zinc-950/60 p-2 gap-1 flex-wrap">
            <button
              onClick={() => setTerminalTab('trade')}
              className={`px-5 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                terminalTab === 'trade' 
                  ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' 
                  : 'text-zinc-500 hover:text-white border border-transparent'
              }`}
            >
              Trade executions Log
            </button>
            <button
              onClick={() => setTerminalTab('bridge')}
              className={`px-5 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                terminalTab === 'bridge' 
                  ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' 
                  : 'text-zinc-500 hover:text-white border border-transparent'
              }`}
            >
              Bridge Log Terminal
            </button>
          </div>

          <div className="p-6 bg-zinc-950/80 font-mono text-[11px] leading-relaxed">
            {terminalTab === 'trade' ? (
              <div className="space-y-2.5 overflow-x-auto">
                <table className="w-full text-left border-collapse select-text">
                  <thead>
                    <tr className="border-b border-zinc-850 text-zinc-500 text-[10px] font-black uppercase tracking-widest">
                      <th className="pb-3 pr-4">Time</th>
                      <th className="pb-3 pr-4">Ticket</th>
                      <th className="pb-3 pr-4">Symbol</th>
                      <th className="pb-3 pr-4">Side</th>
                      <th className="pb-3 pr-4">TF</th>
                      <th className="pb-3 pr-4">Price</th>
                      <th className="pb-3 pr-4">Qty</th>
                      <th className="pb-3 pr-4 text-right">PnL</th>
                      <th className="pb-3 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-900/50">
                    {rawExecutions.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="py-6 text-center text-zinc-600 font-bold uppercase tracking-wider">
                          No MT5 executions recorded yet.
                        </td>
                      </tr>
                    ) : (
                      [...rawExecutions].reverse().map(e => (
                        <tr key={e.id} className="hover:bg-zinc-900/10 transition-colors">
                          <td className="py-3 pr-4 text-zinc-500 whitespace-nowrap">{new Date(e.executed_at).toLocaleString()}</td>
                          <td className="py-3 pr-4 text-zinc-400 font-mono">{e.position_id || '---'}</td>
                          <td className="py-3 pr-4 font-black">{e.symbol}</td>
                          <td className="py-3 pr-4 whitespace-nowrap">
                            <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${
                              e.side === 'BUY' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'
                            }`}>
                              {e.side}
                            </span>
                          </td>
                          <td className="py-3 pr-4 font-bold text-zinc-400">{e.tf_alignment || '---'}</td>
                          <td className="py-3 pr-4 font-mono font-bold text-zinc-300">{e.entry_price ? `$${parseFloat(e.entry_price).toFixed(5)}` : '---'}</td>
                          <td className="py-3 pr-4 font-mono text-zinc-300">{e.quantity}</td>
                          <td className={`py-3 pr-4 text-right font-bold font-mono ${e.pnl > 0 ? 'text-emerald-400' : e.pnl < 0 ? 'text-red-500' : 'text-zinc-500'}`}>
                            {e.pnl > 0 ? `+$${parseFloat(e.pnl).toFixed(2)}` : e.pnl < 0 ? `-$${Math.abs(parseFloat(e.pnl)).toFixed(2)}` : '$0.00'}
                          </td>
                          <td className="py-3 text-right whitespace-nowrap">
                            <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${
                              e.status === 'ENTRY' ? 'bg-zinc-800 text-zinc-400 border border-zinc-700' :
                              ['TP2_HIT', 'WIN'].includes(e.status) ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                              ['SL_HIT', 'LOSS'].includes(e.status) ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                              'bg-zinc-900 text-zinc-500 border border-zinc-800'
                            }`}>
                              {e.status}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="space-y-1.5 max-h-[400px] overflow-y-auto custom-scrollbar select-text pr-2">
                {bridgeLogs.length === 0 ? (
                  <p className="text-center py-6 text-zinc-600 font-bold uppercase tracking-wider">No Bridge signals received yet.</p>
                ) : (
                  [...bridgeLogs].reverse().map((log, i) => {
                    const isError = log.includes("[ERROR]") || log.includes("❌");
                    const isSuccess = log.includes("[SUCCESS]") || log.includes("✅");
                    const isWarning = log.includes("[WARNING]") || log.includes("⚠️");
                    
                    let colorClass = "text-zinc-400";
                    if (isError) colorClass = "text-red-400";
                    else if (isSuccess) colorClass = "text-emerald-400";
                    else if (isWarning) colorClass = "text-amber-400";
                    
                    return (
                      <div key={i} className={`py-1 border-b border-zinc-900/30 font-mono tracking-tight ${colorClass}`}>
                        {log}
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        </div>

        {/* Installation Guide */}
        <div className="glass-panel p-8 md:p-16">
          <div className="max-w-4xl mx-auto space-y-12">
            <div className="space-y-4">
              <h3 className="text-2xl md:text-3xl font-black italic tracking-tighter uppercase">Installation <span className="text-blue-500">Protocol</span></h3>
              <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest">Follow these steps to synchronize your terminal with the CRT-ALGO Cloud.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-16 gap-y-12">
              {[
                { title: 'MT5 Configuration', desc: 'Go to Tools > Options > Expert Advisors. Check "Allow WebRequest" and add: https://crt-algo.vercel.app and https://kimoocrt.onrender.com' },
                { title: 'Files Deployment', desc: 'Copy your downloaded .ex5 file. In MT5, go to File > Open Data Folder > MQL5 > Experts, and paste the file.' },
                { title: 'Expert Activation', desc: 'Drag the CRT-ALGO EA onto any chart. Ensure "Allow Algorithmic Trading" is enabled in the common tab.' },
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
    </AccessGuard>
  );
}
