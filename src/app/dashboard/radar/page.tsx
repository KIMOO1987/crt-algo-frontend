"use client";

import { useState, useEffect, useCallback } from 'react';
import { normalizeSymbol, getSymbolCategory, deduplicateSignals, getMappedSymbol } from '@/lib/symbol-mapper';
import { fetchMarketQuote } from '@/lib/market-data';
import { supabase } from '@/lib/supabaseClient';
import AccessGuard from '@/components/AccessGuard';
import { Shield, Activity, Radio, Search, Layers, ChevronRight, AlertCircle, ChevronUp, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';

export default function RadarPage() {
  // 1. INSTANT HYDRATION: Load from localStorage immediately
  const [liveSignals, setLiveSignals] = useState<any[]>(() => {
    if (typeof window !== 'undefined') {
      const cached = localStorage.getItem('radar_signals_cache');
      return cached ? JSON.parse(cached) : [];
    }
    return [];
  });

  const [isLoading, setIsLoading] = useState(() => {
    if (typeof window !== 'undefined') {
      return !localStorage.getItem('radar_signals_cache');
    }
    return true;
  });

  const [livePrices, setLivePrices] = useState<{ [key: string]: number }>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [assetClass, setAssetClass] = useState('ALL');
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' }>({
    key: 'confidence',
    direction: 'desc'
  });

  const handleSort = (key: string) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc'
    }));
  };

  // --- SYMBOL CATEGORIZATION HELPER (No change) ---

  // 2. REFINED RADAR DATA FETCHING
  const fetchRadarData = useCallback(async (isSilent = false) => {
    if (!isSilent && liveSignals.length === 0) setIsLoading(true);

    // INCREASE POOL SIZE: Fetch 50 signals instead of 10 to ensure we find enough PRIME setups
    const { data, error } = await supabase
      .from('signals')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(50);

    if (data) {
      const unique = deduplicateSignals(data);
      setLiveSignals(unique);
      localStorage.setItem('radar_signals_cache', JSON.stringify(unique));
    }
    setIsLoading(false);
  }, [liveSignals.length]);

  useEffect(() => {
    fetchRadarData(liveSignals.length > 0);

    const channel = supabase.channel('radar_updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'signals' }, () => {
        fetchRadarData(true);
      }).subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchRadarData]);

  // --- REAL-TIME PRICE UPDATES (Keep existing Logic) ---
  useEffect(() => {
    if (liveSignals.length === 0) return;
    const cryptoPairs = liveSignals.filter(s => getSymbolCategory(s.symbol) === 'CRYPTO');
    let socket: WebSocket | null = null;
    if (cryptoPairs.length > 0) {
      const streams = cryptoPairs.map(s => `${getMappedSymbol(s.symbol, 'binance').toLowerCase()}@ticker`).join('/');
      const url = `wss://stream.binance.com:9443/stream?streams=${streams}`;

      socket = new WebSocket(url);
      socket.onmessage = (event) => {
        try {
          const rawData = JSON.parse(event.data);
          const data = rawData.data || rawData;
          if (data.s && data.c) setLivePrices(prev => ({ ...prev, [data.s.toUpperCase()]: parseFloat(data.c) }));
        } catch (err) { }
      };
    }
    const otherSignals = liveSignals.filter(s => getSymbolCategory(s.symbol) !== 'CRYPTO');
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
    return () => { if (socket) socket.close(); clearInterval(pollInterval); };
  }, [liveSignals]);

  // 3. FIXED CONFIDENCE CALCULATOR
  const getConfidence = (signal: any) => {
    const minutesAgo = (Date.now() - new Date(signal.created_at).getTime()) / 60000;

    // NORMALIZE LIVE PRICE
    const entry = Number(signal.entry_price || 0);
    const sl = Number(signal.sl || 0);
    const cleanSym = normalizeSymbol(signal.symbol);
    const current = livePrices[cleanSym] ?? entry;
    const risk = Math.abs(entry - sl);
    const isBuy = signal.side?.toUpperCase() === 'BUY' || signal.side?.toUpperCase() === 'BULLISH';
    const rr = risk ? (isBuy ? (current - entry) : (entry - current)) / risk : 0;

    // A. Freshness (40 points max)
    const timeScore = Math.max(0, 40 - (minutesAgo / 4));

    // B. Confluence (30 points max)
    const confCount = signal.confluences ? signal.confluences.split(',').length : 1;
    const confluenceScore = Math.min(30, confCount * 10);

    // C. Proximity/Performance (30 points max)
    // We award points if the signal is near entry OR moving into profit
    let performanceScore = 0;
    if (rr >= -0.1 && rr <= 0.3) performanceScore = 30; // Perfect "Entry Zone" signal
    else if (rr > 0.3) performanceScore = Math.min(30, rr * 10);
    else performanceScore = 0;

    const total = Math.round(timeScore + confluenceScore + performanceScore);

    // LOWERED THRESHOLDS: 75 is now PRIME (allows for entries to show up)
    if (total >= 75) return { val: Math.min(total, 100), label: 'PRIME' };
    if (total >= 50) return { val: total, label: 'STABLE' };
    if (total >= 30) return { val: total, label: 'DECAY' };
    return { val: 20, label: 'EXPIRED' };
  };

  // 4. FILTERING & SORTING
  const filteredRadarSignals = liveSignals
    .map(s => ({ ...s, confidence: getConfidence(s) }))
    .filter(s => {
      // Show PRIME and STABLE only
      const isHighProb = s.confidence.label === 'PRIME' || s.confidence.label === 'STABLE';
      const symbolMatch = s.symbol.toLowerCase().includes(searchTerm.toLowerCase());
      const assetMatch = assetClass === 'ALL' || getSymbolCategory(s.symbol) === assetClass;
      return isHighProb && symbolMatch && assetMatch;
    })
    .sort((a, b) => {
      const { key, direction } = sortConfig;
      let valA: any;
      let valB: any;

      if (key === 'symbol') {
        valA = a.symbol;
        valB = b.symbol;
      } else if (key === 'category') {
        valA = getSymbolCategory(a.symbol);
        valB = getSymbolCategory(b.symbol);
      } else if (key === 'entry_price') {
        valA = Number(a.entry_price);
        valB = Number(b.entry_price);
      } else if (key === 'confidence') {
        valA = a.confidence.val;
        valB = b.confidence.val;
      } else if (key === 'side') {
        valA = a.side;
        valB = b.side;
      } else if (key === 'pnl') {
        const calculateRR = (signal: any) => {
          const status = signal.status?.toUpperCase();
          const entry = Number(signal.entry_price);
          const sl = Number(signal.sl);
          const tp1 = Number(signal.tp);
          const tp2 = Number(signal.tp_secondary);
          const risk = Math.abs(entry - sl);
          const isBuy = signal.side?.toUpperCase() === 'BUY' || signal.side?.toUpperCase() === 'BULLISH';
          const cleanSym = normalizeSymbol(signal.symbol);

          if (status === 'SL') return -1.0;
          if (status === 'TP2' && tp2) return risk ? Math.abs(tp2 - entry) / risk : 0;
          if ((status === 'TP1' || status === 'TP1 + SL (BE)') && tp1) return risk ? Math.abs(tp1 - entry) / risk : 0;
          
          const current = livePrices[cleanSym] ?? Number(signal.current_price || entry);
          const reward = isBuy ? (current - entry) : (entry - current);
          return risk ? reward / risk : 0;
        };
        valA = calculateRR(a);
        valB = calculateRR(b);
      }

      if (valA < valB) return direction === 'asc' ? -1 : 1;
      if (valA > valB) return direction === 'asc' ? 1 : -1;
      return 0;
    });

  if (isLoading && liveSignals.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center ">
        <div className="flex flex-col items-center justify-center py-20 animate-pulse">
          <Activity size={40} className="text-zinc-700 mb-4" />
          <p className="text-xs font-black uppercase tracking-widest text-zinc-600">Syncing Radar Frequencies...</p>
        </div>
      </div>
    );
  }

  return (
    <AccessGuard requiredTier={1} tierName="PRO">
      <div className="relative p-4 md:p-12 lg:p-16 lg:ml-72  min-h-screen text-zinc-900 dark:text-white font-sans overflow-x-hidden">

        {/* Ambient Glowing Backgrounds */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
          <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-blue-600/10 blur-[150px] rounded-full mix-blend-screen" />
          <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-indigo-600/10 blur-[150px] rounded-full mix-blend-screen" />
        </div>

        <div className="max-w-[1700px] mx-auto relative z-10 space-y-6 md:space-y-8">
          {/* Header & Filters */}
          <div className="flex flex-col xl:flex-row justify-between items-start xl:items-end gap-6 mb-6">
            <div>
              <h1 className="text-2xl md:text-4xl font-black tracking-tighter italic flex items-center gap-3 uppercase text-zinc-900 dark:text-white">
                Alpha<span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-500">Radar</span>
                <div className={`w-2.5 h-2.5 rounded-full ${isLoading ? 'bg-amber-400 animate-spin' : 'bg-blue-400 animate-pulse'} shadow-[0_0_10px_rgba(96,165,250,0.8)] mt-1`} />
              </h1>
              <p className="text-[10px] uppercase tracking-[0.4em] text-zinc-600 dark:text-zinc-500 font-bold mt-3 leading-none">
                • INSTITUTIONAL LIQUIDITY SCANNER • GLOBAL STREAM •
              </p>
            </div>

            <div className="flex flex-col md:flex-row gap-4 w-full lg:w-auto">
              <div className="flex flex-col gap-1 w-full md:w-48">
                <label className="text-[9px] font-black text-zinc-600 dark:text-zinc-500 uppercase ml-2 tracking-widest">Asset Class</label>
                <div className="relative">
                  <Layers className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600 dark:text-zinc-500" size={14} />
                  <select
                    value={assetClass}
                    onChange={(e) => setAssetClass(e.target.value)}
                    className="bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-xl pl-10 pr-4 py-2.5 text-xs font-mono font-bold text-zinc-900 dark:text-white outline-none focus:border-blue-500/50 hover:border-white/20 transition-all cursor-pointer appearance-none w-full"
                  >
                    <option value="ALL">ALL ASSETS</option>
                    <option value="CRYPTO">CRYPTO</option>
                    <option value="FOREX">FOREX</option>
                    <option value="INDICES">INDICES</option>
                    <option value="METALS">METALS</option>
                  </select>
                </div>
              </div>

              <div className="relative flex-grow md:w-64 self-end h-[42px] mb-0.5">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600 dark:text-zinc-500" size={16} />
                <input
                  type="text"
                  placeholder="Search stream..."
                  className="w-full h-full pl-12 pr-4 bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-xl text-xs font-mono text-zinc-900 dark:text-white focus:border-blue-500/50 hover:border-white/20 outline-none transition-all"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Live Signal Stream */}
          <div className="w-full">
            <div className="bg-gradient-to-br from-white/[0.04] to-white/[0.01] border border-[var(--glass-border)] rounded-2xl md:rounded-[2.5rem] overflow-hidden shadow-2xl backdrop-blur-md">
              <div className="p-5 md:p-8 border-b border-[var(--glass-border)] flex justify-between items-center bg-[var(--glass-bg)]">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-700 dark:text-zinc-400">Scanner Stream</h3>
                <div className="flex items-center gap-2">
                  <span className="flex h-2 w-2 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                  </span>
                  <span className="text-[9px] font-black text-blue-400 uppercase tracking-widest">Real-time Injection</span>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[800px]">
                  <thead>
                    <tr className="text-[10px] font-black text-zinc-600 dark:text-zinc-500 uppercase tracking-widest bg-[var(--glass-bg)] border-b border-[var(--glass-border)]">
                      <th className="px-6 md:px-8 py-5 cursor-pointer hover:text-blue-400 transition-colors" onClick={() => handleSort('symbol')}>
                        <div className="flex items-center gap-1">
                          Instrument
                          {sortConfig.key === 'symbol' && (sortConfig.direction === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}
                        </div>
                      </th>
                      <th className="hidden md:table-cell py-5 cursor-pointer hover:text-blue-400 transition-colors" onClick={() => handleSort('category')}>
                        <div className="flex items-center gap-1">
                          Category
                          {sortConfig.key === 'category' && (sortConfig.direction === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}
                        </div>
                      </th>
                      <th className="py-5 cursor-pointer hover:text-blue-400 transition-colors" onClick={() => handleSort('entry_price')}>
                        <div className="flex items-center gap-1">
                          Entry Price
                          {sortConfig.key === 'entry_price' && (sortConfig.direction === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}
                        </div>
                      </th>
                      <th className="py-5 w-[20%] cursor-pointer hover:text-blue-400 transition-colors" onClick={() => handleSort('confidence')}>
                        <div className="flex items-center gap-1">
                          CRT Confidence
                          {sortConfig.key === 'confidence' && (sortConfig.direction === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}
                        </div>
                      </th>
                      <th className="py-5 text-center cursor-pointer hover:text-blue-400 transition-colors" onClick={() => handleSort('side')}>
                        <div className="flex items-center justify-center gap-1">
                          Bias
                          {sortConfig.key === 'side' && (sortConfig.direction === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}
                        </div>
                      </th>
                      <th className="px-6 py-5 cursor-pointer hover:text-blue-400 transition-colors" onClick={() => handleSort('pnl')}>
                        <div className="flex items-center gap-1">
                          Live PnL
                          {sortConfig.key === 'pnl' && (sortConfig.direction === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}
                        </div>
                      </th>
                      <th className="px-6 py-5 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.05]">
                    <AnimatePresence>
                      {filteredRadarSignals.map((signal) => {
                        const cleanSym = normalizeSymbol(signal.symbol);
                        const status = signal.status?.toUpperCase();
                        const entry = Number(signal.entry_price);
                        const sl = Number(signal.sl);
                        const tp1 = Number(signal.tp);
                        const tp2 = Number(signal.tp_secondary);
                        const risk = Math.abs(entry - sl);
                        const isBuy = signal.side?.toUpperCase() === 'BUY' || signal.side?.toUpperCase() === 'BULLISH';

                        // --- SEALING LOGIC ---
                        let rr = 0;
                        if (status === 'SL') {
                          rr = -1.0;
                        } else if (status === 'TP2' && tp2) {
                          rr = risk ? Math.abs(tp2 - entry) / risk : 0;
                        } else if ((status === 'TP1' || status === 'TP1 + SL (BE)') && tp1) {
                          rr = risk ? Math.abs(tp1 - entry) / risk : 0;
                        } else {
                          // Live Calculation
                          const current = livePrices[cleanSym] ?? Number(signal.current_price || entry);
                          const reward = isBuy ? (current - entry) : (entry - current);
                          rr = risk ? reward / risk : 0;
                        }

                        return (
                          <motion.tr
                            layout initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} key={signal.id}
                            className="hover:bg-[var(--glass-bg)] transition-colors group cursor-pointer"
                          >
                            <td className="px-6 md:px-8 py-6 font-black text-lg tracking-tighter text-zinc-900 dark:text-white uppercase italic drop-shadow-sm">{signal.symbol}</td>
                            <td className="hidden md:table-cell py-6 text-[10px] font-bold text-zinc-600 dark:text-zinc-500 uppercase tracking-widest">{getSymbolCategory(signal.symbol)}</td>
                            <td className="py-6 text-[13px] font-mono font-black text-zinc-800 dark:text-zinc-300">{entry.toFixed(5)}</td>
                            <td className="py-6 pr-6">
                              <div className="flex items-center gap-2">
                                <div className="w-12 md:w-16 h-1 bg-white/5 rounded-full overflow-hidden">
                                  <motion.div initial={{ width: 0 }} animate={{ width: `${signal.confidence.val}%` }} transition={{ duration: 1 }}
                                    className={`h-full shadow-[0_0_10px_rgba(59,130,246,0.8)] ${signal.confidence.label === 'PRIME' ? 'bg-blue-500' : 'bg-zinc-600'}`}
                                  />
                                </div>
                                <span className={`text-[10px] font-bold font-mono ${signal.confidence.label === 'PRIME' ? 'text-blue-400' : 'text-zinc-600 dark:text-zinc-500'}`}>{signal.confidence.label}</span>
                              </div>
                            </td>
                            <td className="py-6 text-center">
                              <span className={`text-[10px] font-black px-2.5 py-1 rounded-lg border tracking-widest ${isBuy ? 'text-emerald-400 border-emerald-500/20 bg-emerald-500/10' : 'text-red-400 border-red-500/20 bg-red-500/10'}`}>
                                {isBuy ? 'LONG' : 'SHORT'}
                              </span>
                            </td>
                            <td className="px-6 py-6">
                              {(() => {
                                const current = livePrices[cleanSym] ?? Number(signal.current_price || entry);
                                const pnlPercent = entry ? ((isBuy ? (current - entry) : (entry - current)) / entry) * 100 : 0;

                                return (
                                  <motion.div
                                    key={`${signal.id}-${current}`}
                                    initial={{ scale: 1 }}
                                    animate={{ scale: [1, 1.05, 1] }}
                                    transition={{ duration: 0.3 }}
                                    className="flex flex-col gap-0.5"
                                  >
                                    <div className="flex items-center gap-2">
                                      <div className={`w-1.5 h-1.5 rounded-full ${rr >= 0 ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
                                      <span className={`text-[12px] font-mono font-black ${rr >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                        {rr >= 0 ? `+${rr.toFixed(2)}R` : `${rr.toFixed(2)}R`}
                                      </span>
                                    </div>
                                    <span className={`text-[9px] font-black font-mono ml-3.5 ${rr >= 0 ? 'text-emerald-500/60' : 'text-red-500/60'}`}>
                                      {rr >= 0 ? '+' : ''}{pnlPercent.toFixed(2)}%
                                    </span>
                                  </motion.div>
                                );
                              })()}
                            </td>
                            <td className="px-6 py-6 text-center">
                              <Link href="/dashboard/active" className="p-2 rounded-xl bg-[var(--glass-bg)] border border-[var(--glass-border)] text-zinc-600 dark:text-zinc-500 hover:bg-white/[0.08] hover:text-zinc-900 dark:text-white transition-all group-hover:border-white/20 inline-flex">
                                <ChevronRight size={16} />
                              </Link>
                            </td>
                          </motion.tr>
                        );
                      })}
                    </AnimatePresence>
                  </tbody>
                </table>
                {filteredRadarSignals.length === 0 && !isLoading && (
                  <div className="w-full flex flex-col items-center justify-center py-24 border-dashed border-t border-[var(--glass-border)] bg-[var(--glass-bg)]">
                    <AlertCircle size={40} className="text-zinc-700 mb-4" />
                    <h3 className="text-xl font-black italic tracking-tighter uppercase text-zinc-900 dark:text-white mb-2">Awaiting Prime Setup</h3>
                    <p className="text-xs font-bold text-zinc-600 uppercase tracking-widest">Scanner active. Displacements are being analyzed.</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Footer Security Shield */}
          <div className="w-full mt-4">
            <div className="bg-gradient-to-r from-emerald-500/[0.05] to-transparent border border-emerald-500/10 p-6 md:p-8 rounded-[2rem] flex flex-col md:flex-row items-start md:items-center gap-6 shadow-[0_0_30px_rgba(16,185,129,0.05)]">
              <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 shrink-0">
                <Shield size={24} className="text-emerald-400" />
              </div>
              <div>
                <h4 className="text-[11px] font-black uppercase tracking-widest text-emerald-400 mb-1 flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Scanner Integrity Active
                </h4>
                <p className="text-xs text-zinc-700 dark:text-zinc-400 leading-relaxed font-bold">
                  Signals are analyzed for institutional delivery. To protect capital, setups older than 4 hours or those exhibiting heavy decay are filtered from the Prime interface.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AccessGuard>
  );
}
