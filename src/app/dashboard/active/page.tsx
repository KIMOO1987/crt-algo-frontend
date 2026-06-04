"use client";

import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { motion, AnimatePresence } from 'framer-motion';
import AccessGuard from '@/components/AccessGuard'; // Switched to AccessGuard
import CustomSelect from '@/components/CustomSelect';
import {
  Clock, Activity, Zap, ArrowUpRight, TrendingUp,
  TrendingDown, Layout, Target, Shield, AlertCircle, Calendar, ChevronDown
} from 'lucide-react';
import SignalModal from '@/components/SignalModal';

// --- SYMBOL CATEGORIZATION HELPER ---
import { normalizeSymbol, getSymbolCategory, deduplicateSignals, getMappedSymbol, SYMBOL_MAP } from '@/lib/symbol-mapper';
import { fetchMarketQuote } from '@/lib/market-data';

// --- UI HANDLERS ---
const handleViewSetup = (symbol: string) => {
  const myLayoutId = "TWlqcP20";
  const cleanSymbol = symbol.includes(':') ? symbol.split(':')[1] : symbol;
  const tvUrl = `https://www.tradingview.com/chart/${myLayoutId}/?symbol=${cleanSymbol.toUpperCase()}`;
  window.open(tvUrl, '_blank');
};

export default function ActiveSignalsPage() {
  const [activeSignals, setActiveSignals] = useState<any[]>([]);
  const [loadingSignals, setLoadingSignals] = useState(true);
  const [livePrices, setLivePrices] = useState<{ [key: string]: number }>({});
  const [selectedSignal, setSelectedSignal] = useState<any | null>(null);
  const [tfAlignment, setTfAlignment] = useState('ALL');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const filteredSignals = useMemo(() => {
    return activeSignals.filter(signal => {
      if (tfAlignment !== 'ALL' && signal.tf_alignment !== tfAlignment) {
        return false;
      }
      if (dateFrom) {
        const fromDate = new Date(dateFrom);
        if (new Date(signal.created_at) < fromDate) {
          return false;
        }
      }
      if (dateTo) {
        const toDate = new Date(dateTo);
        toDate.setHours(23, 59, 59, 999);
        if (new Date(signal.created_at) > toDate) {
          return false;
        }
      }
      return true;
    });
  }, [activeSignals, tfAlignment, dateFrom, dateTo]);

  // 1. SIGNAL DATA FETCHING & REALTIME
  useEffect(() => {
    const fetchActive = async () => {
      // 1. Optimistic Cache Load: Instantly show previous signals
      const cached = sessionStorage.getItem('active_signals_cache');
      if (cached) {
        try {
          const parsedSignals = deduplicateSignals(JSON.parse(cached));
          setActiveSignals(parsedSignals);
          setLivePrices(prev => {
            const next = { ...prev };
            parsedSignals.forEach((s: any) => {
              const clean = normalizeSymbol(s.symbol);
              if (next[clean] === undefined) next[clean] = Number(s.entry_price || 0);
            });
            return next;
          });
          setLoadingSignals(false); // Instantly hide loader if cache is found
        } catch (e) { }
      } else {
        // Only show loading screen if there is no cache
        setLoadingSignals(true);
      }

      // 2. Fetch fresh data silently in the background
      // Fetches signals from the last 24 hours
      const timeLimit = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

      const { data, error } = await supabase
        .from('signals')
        .select('*')
        .gt('created_at', timeLimit)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) {
        console.error("Signal Fetch Error:", error.message);
      } else if (data) {
        const unique = deduplicateSignals(data);
        setActiveSignals(unique);
        // Save the fresh signals to cache for the next refresh
        sessionStorage.setItem('active_signals_cache', JSON.stringify(unique));

        // Initialize live prices only for symbols we aren't tracking yet
        setLivePrices(prev => {
          const next = { ...prev };
          data.forEach(s => {
            const clean = normalizeSymbol(s.symbol);
            if (next[clean] === undefined) next[clean] = Number(s.entry_price || 0);
          });
          return next;
        });
      }
      setLoadingSignals(false);
    };

    fetchActive();

    // Realtime subscription to keep the dashboard live
    const channel = supabase.channel('active_signals_stream')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'signals' }, () => {
        fetchActive();
      }).subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  // 2. REAL-TIME PRICE UPDATES
  useEffect(() => {
    if (activeSignals.length === 0) return;

    // --- A. BINANCE WEBSOCKET (ANY SUPPORTED ASSET) ---
    const binanceSymbols = activeSignals.filter(s => {
      const normalized = normalizeSymbol(s.symbol);
      return SYMBOL_MAP[normalized]?.binance;
    });

    let socket: WebSocket | null = null;

    if (binanceSymbols.length > 0) {
      const streams = binanceSymbols.map(s => {
        const normalized = normalizeSymbol(s.symbol);
        return `${SYMBOL_MAP[normalized].binance?.toLowerCase()}@ticker`;
      }).join('/');
      
      const url = `wss://stream.binance.com:9443/stream?streams=${streams}`;

      socket = new WebSocket(url);
      socket.onmessage = (event) => {
        try {
          const rawData = JSON.parse(event.data);
          const data = rawData.data || rawData;
          if (data.s && data.c) {
            const normalized = normalizeSymbol(data.s);
            setLivePrices(prev => ({ ...prev, [normalized]: parseFloat(data.c) }));
          }
        } catch (err) {
          console.error("[Binance WS] Parse Error:", err);
        }
      };

      socket.onerror = (err) => {
        // Silently handle connection errors to avoid console spam
      };
    }

    // --- B. NON-BINANCE POLLING (UNIFIED FALLBACK) ---
    const otherSignals = activeSignals.filter(s => {
      const normalized = normalizeSymbol(s.symbol);
      return !SYMBOL_MAP[normalized]?.binance;
    });

    const pollInterval = setInterval(async () => {
      if (otherSignals.length === 0) return;

      const uniqueSymbols = Array.from(new Set(otherSignals.map(s => s.symbol)));

      try {
        for (const symbol of uniqueSymbols) {
          const price = await fetchMarketQuote(symbol);
          if (price !== null) {
            const clean = normalizeSymbol(symbol);
            setLivePrices(prev => ({ ...prev, [clean]: price }));
          }
          await new Promise(r => setTimeout(r, 200)); // Minor throttle
        }
      } catch (err) { }
    }, 5000); // 5s refresh for polled assets

    return () => {
      if (socket) {
        // Graceful closure: only close if open, or wait for open then close if connecting
        if (socket.readyState === WebSocket.OPEN) {
          socket.close();
        } else if (socket.readyState === WebSocket.CONNECTING) {
          socket.onopen = () => socket.close();
        }
      }
      clearInterval(pollInterval);
    };
  }, [activeSignals.length]); // Only re-run if the NUMBER of signals changes, preventing jitter
  
  // 3. AUTO-SYNC STATUS TO SUPABASE
  useEffect(() => {
    if (activeSignals.length === 0) return;

    const syncPending = async () => {
      for (const signal of activeSignals) {
        const cleanSymbol = normalizeSymbol(signal.symbol);
        const livePrice = livePrices[cleanSymbol];
        if (!livePrice) continue;

        const displayStatus = getDisplayStatus(signal.status, livePrice, signal);
        let newDbStatus = null;
        let shouldDeactivate = false;

        if (displayStatus === 'TP2 REACHED (LIVE)') {
          newDbStatus = 'TP2';
          shouldDeactivate = true;
        } else if (displayStatus === 'TP1 REACHED (LIVE)') {
          newDbStatus = 'TP1';
        } else if (displayStatus === 'SL HIT (LIVE)') {
          newDbStatus = 'SL';
          shouldDeactivate = true;
        } else if (displayStatus === 'BE REACHED (LIVE)') {
          newDbStatus = 'TP1 + SL (BE)';
          shouldDeactivate = true;
        }

        if (newDbStatus && newDbStatus !== signal.status) {
          console.log(`[Sync] Detected status change for ${signal.symbol}: ${signal.status} -> ${newDbStatus}`);
          
          const { error } = await supabase
            .from('signals')
            .update({ 
              status: newDbStatus, 
              is_active: !shouldDeactivate,
              current_price: livePrice 
            })
            .eq('id', signal.id);

          if (error) {
            console.error(`[Sync] Error updating ${signal.symbol}:`, error.message);
          } else {
            // Optimistically update local state to prevent redundant requests
            setActiveSignals(prev => prev.map(s => 
              s.id === signal.id ? { ...s, status: newDbStatus, is_active: !shouldDeactivate } : s
            ));
          }
        }
      }
    };

    const timer = setTimeout(syncPending, 2000); // Check for transitions every 2s
    return () => clearTimeout(timer);
  }, [livePrices, activeSignals]);

  return (
    <AccessGuard requiredTier={1} tierName="PRO">
      <div className="w-full relative z-10 space-y-6 md:space-y-8">

        {/* Header Section */}
        <div className="mb-4 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
          <div>
            <h1 className="text-2xl md:text-4xl font-extrabold tracking-tight uppercase text-zinc-900 dark:text-white">
              Active<span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-orange-600">Intelligence</span>
            </h1>
            <p className="text-[10px] uppercase tracking-[0.3em] text-zinc-500 dark:text-zinc-400 font-bold mt-2">
              • LIVE CRT MARKET EXPOSURE •
            </p>
          </div>
          <div className="flex items-center gap-2 bg-orange-500/10 border border-orange-500/20 px-4 py-2 rounded-lg shadow-sm">
            <div className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse shadow-[0_0_8px_rgba(249,115,22,0.8)]" />
            <span className="text-[9px] font-extrabold text-orange-500 uppercase tracking-widest">
              Institutional Flow Active
            </span>
          </div>
        </div>

        {/* Filters Bar */}
        <div className="glass-panel p-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 items-center">
          <CustomSelect
            label="Timeframe Alignment"
            value={tfAlignment}
            onChange={setTfAlignment}
            options={[
              { value: 'ALL', label: 'All Alignments' },
              { value: 'M5/H1', label: '5M - 1H Alignment' },
              { value: 'M15/H4', label: '15M - 4H Alignment' },
              { value: 'M30/H6', label: '30M - 6H Alignment' },
              { value: 'H1/D1', label: '1H - 1D Alignment' }
            ]}
          />
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5 ml-1">From Date</span>
            <div className="flex items-center input-modern h-[42px] py-0">
              <Calendar size={14} className="text-orange-500 mr-2 flex items-center" />
              <input 
                type="date" 
                value={dateFrom} 
                onChange={(e) => setDateFrom(e.target.value)} 
                className="bg-transparent font-semibold text-xs w-full outline-none appearance-none cursor-pointer text-foreground" 
              />
            </div>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5 ml-1">To Date</span>
            <div className="flex items-center input-modern h-[42px] py-0">
              <Calendar size={14} className="text-orange-500 mr-2 flex items-center" />
              <input 
                type="date" 
                value={dateTo} 
                onChange={(e) => setDateTo(e.target.value)} 
                className="bg-transparent font-semibold text-xs w-full outline-none appearance-none cursor-pointer text-foreground" 
              />
            </div>
          </div>
        </div>

        {/* Signals Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          <AnimatePresence mode="popLayout">
            {filteredSignals.length > 0 ? (
              filteredSignals.map((signal) => (
                <motion.div
                  key={signal.id}
                  layout
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  className="relative overflow-hidden glass-panel p-6 hover:border-orange-500/20 hover:shadow-lg transition-all duration-300 group flex flex-col justify-between min-h-[480px]"
                >
                  {/* Internal Ambient Glow */}
                  <div className={`absolute -top-24 -right-24 w-64 h-64 blur-[120px] opacity-10 dark:opacity-15 pointer-events-none group-hover:opacity-20 transition-opacity duration-700 ${signal.side === 'BUY' ? 'bg-emerald-500' : 'bg-red-500'
                    }`} />

                  <div className="relative z-10">
                    <div className="flex justify-between items-start mb-6 border-b border-[var(--glass-border)] pb-4.5">
                      <div>
                        <h3 className="text-2xl font-extrabold text-zinc-900 dark:text-white tracking-tight uppercase">{signal.symbol}</h3>
                        <p className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mt-1.5 flex items-center gap-1.5">
                          {signal.strategy || 'CRT_ALGO_PRO'} • {signal.tf_alignment || '5M'}
                        </p>
                      </div>

                      <div className={`px-3 py-1 rounded-lg border text-[9px] font-extrabold uppercase tracking-wider flex items-center gap-1.5 shadow-sm ${signal.side === 'BUY'
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500'
                        : 'bg-red-500/10 border-red-500/30 text-red-500'
                        }`}>
                        {signal.side === 'BUY' ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                        {signal.side}
                      </div>
                    </div>

                    <div className="space-y-1.5 mb-6">
                      <div className="bg-[var(--input-bg)] border border-[var(--glass-border)] rounded-xl p-3.5 mb-4 flex justify-between items-center group-hover:border-orange-500/10 transition-colors">
                        <div className="flex items-center gap-2.5 text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                          <Activity size={13} className="text-orange-500 animate-pulse" /> Status
                        </div>
                        <span className={`text-[11px] font-extrabold uppercase tracking-wider ${getDisplayStatus(signal.status, livePrices[normalizeSymbol(signal.symbol)], signal).includes('SL HIT')
                          ? 'text-red-500 animate-pulse'
                          : 'text-orange-500'
                          }`}>
                          {getDisplayStatus(signal.status, livePrices[normalizeSymbol(signal.symbol)], signal)}
                        </span>
                      </div>

                      <TradeDataRow icon={<TrendingUp size={12} className="text-indigo-400" />} label="Trade R:R" value={getDynamicRR(signal)} valueClass="text-indigo-500" />
                      <TradeDataRow icon={<Zap size={12} className="text-amber-500" />} label="Entry Region" value={Number(signal.entry_price || 0).toFixed(5)} />
                      <TradeDataRow icon={<Shield size={12} className="text-red-500" />} label="Invalidation" value={Number(signal.sl || 0).toFixed(5)} valueClass="text-red-500" />

                      <div className="my-2 border-t border-[var(--glass-border)]" />

                      <TradeDataRow
                        icon={<Target size={12} className="text-emerald-500" />}
                        label="TP-1 (EQ)"
                        value={`${Number(signal.tp || 0).toFixed(5)} (${calculateTargetRR(signal.tp, signal.entry_price, signal.sl)})`}
                        valueClass="text-emerald-500"
                      />

                      <TradeDataRow
                        icon={<Zap size={12} className="text-amber-500" />}
                        label="TP-2 (TARGET)"
                        value={signal.tp_secondary ? `${Number(signal.tp_secondary).toFixed(5)} (${calculateTargetRR(signal.tp_secondary, signal.entry_price, signal.sl)})` : '---'}
                        valueClass="text-amber-500"
                      />

                      <div className="my-2 border-t border-[var(--glass-border)]" />

                      <TradeDataRow
                        icon={<Layout size={12} className="text-zinc-500" />}
                        label="Confluences"
                        value={signal.confluences || 'Institutional Bias Confirmed'}
                        valueClass="text-zinc-600 dark:text-zinc-400 text-[11px] italic"
                      />

                      {/* Live Realtime RR & PnL */}
                      {(() => {
                        const cleanSymbol = normalizeSymbol(signal.symbol);
                        const current = livePrices[cleanSymbol] ?? Number(signal.current_price || signal.entry_price);
                        const entry = Number(signal.entry_price);
                        const isBuy = signal.side?.toUpperCase() === 'BUY' || signal.side?.toUpperCase() === 'BULLISH';
                        const pnlPercent = entry ? ((isBuy ? (current - entry) : (entry - current)) / entry) * 100 : 0;

                        const liveRRValue = calculateLiveRR(signal, livePrices);
                        const isProfit = pnlPercent >= 0;

                        return (
                          <motion.div
                            key={`${signal.id}-${current}`}
                            initial={{ scale: 1 }}
                            animate={{ scale: [1, 1.01, 1] }}
                            transition={{ duration: 0.3 }}
                            className={`mt-4 p-3.5 rounded-xl border flex justify-between items-center transition-all duration-300 ${isProfit ? 'bg-emerald-500/5 border-emerald-500/20'
                              : 'bg-red-500/5 border-red-500/20'
                              }`}
                          >
                            <div className="flex flex-col">
                              <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-450 flex items-center gap-1.5 mb-0.5">
                                <Activity size={13} className={isProfit ? 'text-emerald-500' : 'text-red-500'} /> Live PnL
                              </div>
                              <span className={`text-xs font-bold font-mono ${isProfit ? 'text-emerald-500/80' : 'text-red-500/80'}`}>
                                {isProfit ? '+' : ''}{pnlPercent.toFixed(2)}%
                              </span>
                            </div>
                            <span className={`text-lg font-extrabold font-mono tracking-tight ${isProfit ? 'text-emerald-500' : 'text-red-500'}`}>
                              {liveRRValue}
                            </span>
                          </motion.div>
                        );
                      })()}

                      <div className="flex justify-between items-center pt-3.5 mt-1.5">
                        <span className="text-[9px] font-bold text-zinc-550 dark:text-zinc-400 uppercase tracking-wider">Time Elapsed</span>
                        <span className="text-[10px] font-mono text-zinc-650 dark:text-zinc-400 font-bold uppercase flex items-center gap-1.5 bg-[var(--input-bg)] px-2.5 py-1 rounded-lg border border-[var(--glass-border)]">
                          <Clock size={11} /> {getTimeAgo(signal.created_at)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col mt-2">
                    <button
                      onClick={() => setSelectedSignal(signal)}
                      className="btn-modern w-full flex items-center justify-center gap-2 text-xs py-3 h-[42px] border border-orange-500/20"
                    >
                      <Layout size={14} className="text-white" />
                      Open Live Setup
                      <ArrowUpRight size={14} className="text-white transition-transform group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5" />
                    </button>
                  </div>
                </motion.div>
              ))
            ) : loadingSignals ? (
              <div className="col-span-full w-full flex flex-col items-center justify-center py-32 glass-panel animate-pulse">
                <Activity size={32} className="text-orange-500 mb-3 animate-spin" />
                <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-550 dark:text-zinc-400">Syncing Live Market Data...</p>
              </div>
            ) : !loadingSignals && (
              <div className="col-span-full w-full flex flex-col items-center justify-center py-40 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl bg-[var(--glass-bg)]">
                <AlertCircle size={40} className="text-zinc-450 mb-4" />
                <h3 className="text-xl font-bold tracking-tight uppercase text-zinc-900 dark:text-white mb-1.5">No Active Intelligence</h3>
                <p className="text-[10px] font-extrabold text-zinc-500 uppercase tracking-widest">Awaiting Order Block Displacement...</p>
              </div>
            )}
          </AnimatePresence>
        </div>

        <AnimatePresence>
          {selectedSignal && <SignalModal signal={selectedSignal} onClose={() => setSelectedSignal(null)} />}
        </AnimatePresence>
      </div>
    </AccessGuard>
  );
}

function TradeDataRow({ icon, label, value, valueClass = "text-zinc-900 dark:text-white" }: any) {
  return (
    <div className="flex justify-between items-center py-2.5 hover:bg-[var(--glass-bg)] rounded-lg px-2 -mx-2 transition-colors">
      <div className="flex items-center gap-3 text-[10px] font-bold text-zinc-600 dark:text-zinc-500 uppercase tracking-widest">
        {icon} <span>{label}</span>
      </div>
      <span className={`text-sm font-mono font-black ${valueClass}`}>{value}</span>
    </div>
  );
}

function getTimeAgo(timestamp: string) {
  const diff = Math.floor((Date.now() - new Date(timestamp).getTime()) / 60000);
  if (diff < 1) return 'JUST NOW';
  if (diff < 60) return `${diff}M AGO`;
  const hrs = Math.floor(diff / 60);
  return `${hrs}H ${diff % 60}M AGO`;
}

function getDisplayStatus(status: string, livePrice?: number, signal?: any) {
  const category = signal ? getSymbolCategory(signal.symbol) : 'CRYPTO';

  // ORGANIC PROTECTION: Now for ALL assets if price is available
  if (livePrice && signal) {
    const entry = Number(signal.entry_price);
    const sl = Number(signal.sl);
    const tp1 = Number(signal.tp);
    const tp2 = Number(signal.tp_secondary);
    const side = signal.side?.toUpperCase();
    const isBuy = side === 'BUY' || side === 'BULLISH';
    const tolerance = 0.00005; // 0.005% alignment with backend worker

    // 1. Live Target Detection (Immediate feedback before DB update)
    if (tp2 && ((isBuy && livePrice >= (tp2 * (1 - tolerance))) || (!isBuy && livePrice <= (tp2 * (1 + tolerance))))) {
      return 'TP2 REACHED (LIVE)';
    }

    if (tp1 && ((isBuy && livePrice >= (tp1 * (1 - tolerance))) || (!isBuy && livePrice <= (tp1 * (1 + tolerance))))) {
      if (status !== 'TP1' && status !== 'TP2') return 'TP1 REACHED (LIVE)';
    }

    if (sl && ((isBuy && livePrice <= (sl * (1 + tolerance))) || (!isBuy && livePrice >= (sl * (1 - tolerance))))) {
      return 'SL HIT (LIVE)';
    }

    // 2. Break Even Detection (TP1 -> BE)
    if (status === 'TP1' && entry && ((isBuy && livePrice <= (entry * (1 + tolerance))) || (!isBuy && livePrice >= (entry * (1 - tolerance))))) {
      return 'BE REACHED (LIVE)';
    }
  }

  // Backup Logic for METALS, INDICES, FOREX or Fallback
  switch (status?.toUpperCase()) {
    case 'PENDING': return 'In Progress';
    case 'ENTRY': return 'Active';
    case 'TP1': return 'TP1 Hit';
    case 'TP1 + SL (BE)': return 'Partial TP1';
    case 'SL': return 'Stopped Out';
    case 'TP2': return 'TP1 / TP2';
    case 'WIN': return 'Take Profit';
    default: return status || 'Active';
  }
}

/**
 * Calculates the potential R:R for a specific target level
 */
function calculateTargetRR(target: any, entry: any, sl: any) {
  const t = Number(target);
  const e = Number(entry);
  const s = Number(sl);
  if (!t || !e || !s || e === s) return "0.0R";
  const risk = Math.abs(e - s);
  const reward = Math.abs(t - e);
  return `+${(reward / risk).toFixed(1)}R`;
}

/**
 * Calculates the Dynamic RR based on current status (Ported from History Page)
 */
function getDynamicRR(signal: any) {
  const entry = Number(signal.entry_price || 0);
  const sl = Number(signal.sl || 0);
  const tp2 = Number(signal.tp_secondary || 0);
  const tp1 = Number(signal.tp || 0);

  if (!entry || !sl || entry === sl) return '0.0R';
  const risk = Math.abs(entry - sl);

  // Outcome-based results
  if (signal.status === 'SL') return '-1.0R';
  if (signal.status === 'TP2' && tp2) {
    return `+${(Math.abs(tp2 - entry) / risk).toFixed(1)}R`;
  }
  if ((signal.status === 'TP1' || signal.status === 'TP1 + SL (BE)') && tp1) {
    return `+${(Math.abs(tp1 - entry) / risk).toFixed(1)}R`;
  }

  // Setup fallback (Potential)
  const targetTp = tp2 || tp1;
  return `1:${(Math.abs(targetTp - entry) / risk).toFixed(1)}`;
}

/**
 * Calculates Realtime R:R based on current price vs entry and risk
 */
function calculateLiveRR(signal: any, livePrices: { [key: string]: number }) {
  const status = signal.status?.toUpperCase();
  const entry = Number(signal.entry_price || 0);
  const sl = Number(signal.sl || 0);
  const tp1 = Number(signal.tp || 0);
  const tp2 = Number(signal.tp_secondary || 0);
  const risk = Math.abs(entry - sl);
  const category = getSymbolCategory(signal.symbol);

  if (!entry || !sl || risk === 0) return '0.00R';

  // Sealing logic for final states
  if (status === 'SL') return '-1.00R';
  if (status === 'TP2' && tp2) return `+${(Math.abs(tp2 - entry) / risk).toFixed(2)}R`;
  if ((status === 'TP1' || status === 'TP1 + SL (BE)') && tp1) return `+${(Math.abs(tp1 - entry) / risk).toFixed(2)}R`;

  // Backup Logic: Always live calculation for Metals, Indices, Forex
  const cleanSymbol = normalizeSymbol(signal.symbol);
  const current = livePrices[cleanSymbol] ?? Number(signal.current_price || entry);
  const side = signal.side?.toUpperCase();

  const isBuy = side === 'BUY' || side === 'BULLISH';
  const reward = isBuy ? (current - entry) : (entry - current);
  const rr = reward / risk;

  return `${rr >= 0 ? '+' : ''}${rr.toFixed(2)}R`;
}
