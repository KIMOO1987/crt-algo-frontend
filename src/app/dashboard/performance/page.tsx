"use client";

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/hooks/useAuth';
import AccessGuard from '@/components/AccessGuard';
import SignalChart from '@/components/SignalChart';
import { motion, AnimatePresence } from 'framer-motion';
import { getSymbolCategory, normalizeSymbol } from '@/lib/symbol-mapper';
import { 
  TrendingUp, 
  Target, 
  Zap, 
  Activity, 
  Search, 
  ChevronRight, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle,
  Clock,
  ChevronLeft,
  ChevronRight as ChevronRightIcon,
  X,
  Layout,
  Layers,
  AlertCircle,
  ChevronUp,
  ChevronDown
} from 'lucide-react';

const ITEMS_PER_PAGE = 20;

// --- 1. UI HELPERS ---


const DetailBox = ({ label, value, color = "text-zinc-900 dark:text-white", highlight = false }: any) => (
  <div className={`p-4 rounded-2xl border border-[var(--glass-border)] bg-[var(--glass-bg)] ${highlight ? 'border-blue-500/20 bg-blue-500/[0.02]' : ''}`}>
    <p className="text-[8px] font-black text-zinc-600 uppercase tracking-[0.2em] mb-1">{label}</p>
    <p className={`text-[11px] font-bold truncate tracking-tight ${color}`}>{value}</p>
  </div>
);

const PriceRow = ({ label, value, color }: any) => (
  <div className="flex justify-between items-center py-3 border-b border-[var(--glass-border)] last:border-0">
    <span className="text-[9px] font-black text-zinc-600 dark:text-zinc-500 uppercase tracking-widest">{label}</span>
    <span className={`font-mono text-sm font-black ${color}`}>{Number(value || 0).toFixed(5)}</span>
  </div>
);

const ResultBadge = ({ status }: { status: string }) => {
  const s = status?.toUpperCase();
  if (s === 'TP2' || s === 'WIN') return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-emerald-500/20 bg-emerald-500/10 text-emerald-400 text-[9px] md:text-[10px] font-black uppercase tracking-widest shadow-lg shadow-emerald-500/5">
      <CheckCircle2 size={12} /> Full TP Hit
    </span>
  );
  if (s === 'TP1 + SL (BE)' || s === 'TP1') return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-yellow-500/20 bg-yellow-500/10 text-yellow-400 text-[9px] md:text-[10px] font-black uppercase tracking-widest shadow-lg shadow-yellow-500/5">
      <AlertTriangle size={12} /> Partial Win
    </span>
  );
  if (s === 'SL' || s === 'LOSS') return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-500/20 bg-red-500/10 text-red-400 text-[9px] md:text-[10px] font-black uppercase tracking-widest shadow-lg shadow-red-500/5">
      <XCircle size={12} /> Stopped Out
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-500/20 bg-[var(--glass-bg)] text-zinc-700 dark:text-zinc-400 text-[9px] md:text-[10px] font-black uppercase tracking-widest shadow-lg">
      <Clock size={12} /> {status || 'CLOSED'}
    </span>
  );
};

// --- 2. MODAL COMPONENT ---
const SignalModal = ({ signal, onClose }: { signal: any, onClose: () => void }) => {
  if (!signal) return null;
  const isBuy = signal.side?.toUpperCase() === 'BUY' || signal.side?.toUpperCase() === 'BULLISH';

  return (
    <motion.div 
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-10 /80 backdrop-blur-2xl"
      onClick={onClose}
    >
      <motion.div 
        initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }}
        className="bg-gradient-to-br from-[#0a0c10] to-[#030407] border border-[var(--glass-border)] w-full max-w-6xl rounded-[2.5rem] overflow-hidden flex flex-col lg:flex-row shadow-[0_0_100px_rgba(0,0,0,0.8)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="lg:w-[35%] p-8 overflow-y-auto max-h-[50vh] lg:max-h-none border-b lg:border-b-0 lg:border-r border-[var(--glass-border)] relative">
          <div className="absolute top-0 left-0 w-full h-full bg-blue-500/5 blur-[100px] pointer-events-none" />
          <div className="flex justify-between items-start mb-8">
            <div className="relative z-10">
              <h2 className="text-3xl font-black italic tracking-tighter uppercase text-zinc-900 dark:text-white drop-shadow-md">{signal.symbol}</h2>
              <p className="text-[10px] text-blue-500 font-bold tracking-[0.2em] mt-1">PERFORMANCE AUDIT</p>
            </div>
            <button onClick={onClose} className="p-2 bg-white/5 hover:bg-white/10 rounded-xl transition-all"><X size={20} className="text-zinc-600 dark:text-zinc-500" /></button>
          </div>
          <div className="grid grid-cols-2 gap-3 mb-8">
            <DetailBox label="Execution Date" value={new Date(signal.created_at).toLocaleDateString()} />
            <DetailBox label="Confluences" value={signal.confluences || 'Institutional Bias Confirmed'} />
          </div>
          <div className="space-y-3">
            <PriceRow label="ENTRY" value={signal.entry_price} color="text-blue-400" />
            <PriceRow label="STOP LOSS" value={signal.sl} color="text-red-400" />
            <PriceRow label="TP 1" value={signal.tp} color="text-green-400" />
            <PriceRow label="TP 2" value={signal.tp_secondary} color="text-green-400" />
          </div>
        </div>
        <div className="lg:w-[65%] bg-[var(--input-bg)] relative flex flex-col min-h-[450px]">
          <div className="absolute top-6 left-6 z-10 flex gap-2">
             <span className={`px-4 py-1.5 rounded-xl text-[10px] font-black tracking-widest shadow-lg ${isBuy ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : 'bg-red-500/10 text-red-400 border border-red-500/30'}`}>{isBuy ? 'LONG' : 'SHORT'}</span>
             <span className="px-4 py-1.5 rounded-xl text-[10px] font-black tracking-widest bg-zinc-500/10 text-zinc-400 border border-zinc-500/20 flex items-center gap-2 shadow-lg"><Clock size={12} /> ARCHIVED</span>
          </div>
          <SignalChart symbol={signal.symbol} />
        </div>
      </motion.div>
    </motion.div>
  );
};

// --- 3. MAIN PAGE ---
export default function PerformancePage() {
  const { user, loading: authLoading } = useAuth();
  
  // Instant Hydration from localStorage
  const [history, setHistory] = useState<any[]>(() => {
    if (typeof window !== 'undefined') {
      const cached = localStorage.getItem('perf_history_cache');
      return cached ? JSON.parse(cached) : [];
    }
    return [];
  });

  const [stats, setStats] = useState(() => {
    if (typeof window !== 'undefined') {
      const cached = localStorage.getItem('perf_stats_cache');
      return cached ? JSON.parse(cached) : { winRate: "0", totalTrades: 0, profitFactor: "0.00", totalNetR: "0.0", expectancy: "0.00" };
    }
    return { winRate: "0", totalTrades: 0, profitFactor: "0.00", totalNetR: "0.0", expectancy: "0.00" };
  });

  const [loading, setLoading] = useState(() => {
    if (typeof window !== 'undefined') {
      return !localStorage.getItem('perf_history_cache');
    }
    return true;
  });
  
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedSignal, setSelectedSignal] = useState<any | null>(null);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [assetClass, setAssetClass] = useState('ALL');
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' }>({
    key: 'created_at',
    direction: 'desc'
  });

  const handleSort = (key: string) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc'
    }));
  };

  const fetchPerformance = useCallback(async (page: number, isSilent = false) => {
    if (!user) {
      if (!isSilent) setLoading(false);
      return;
    }
    if (!isSilent) setLoading(true);

    try {
      // 1. Fetch RAW data directly to include PUBLIC signals (user_id is NULL)
      let query = supabase.from('signals').select('*', { count: 'exact' });

      // Only show completed/inactive signals in history
      query = query.eq('is_active', false);

      if (searchTerm) {
        query = query.ilike('symbol', `%${searchTerm}%`);
      }
      if (assetClass !== 'ALL') {
        query = query.eq('category', assetClass);
      }
      if (dateFrom) {
        query = query.gte('created_at', new Date(dateFrom).toISOString());
      }
      if (dateTo) {
        const toDate = new Date(dateTo);
        toDate.setDate(toDate.getDate() + 1);
        query = query.lte('created_at', toDate.toISOString());
      }

      const from = (page - 1) * ITEMS_PER_PAGE;
      const { data, count, error } = await query
        .order(sortConfig.key, { ascending: sortConfig.direction === 'asc' })
        .range(from, from + ITEMS_PER_PAGE - 1);

      if (data) {
        // 2. Fetch ALL signals for this user/public to calculate AGGREGATE stats
        // We apply the same filters here so stats reflect the current view
        let statsQuery = supabase
          .from('signals')
          .select('status, entry_price, sl, tp, tp_secondary, symbol, category')
          .eq('is_active', false);

        if (searchTerm) statsQuery = statsQuery.ilike('symbol', `%${searchTerm}%`);
        if (assetClass !== 'ALL') statsQuery = statsQuery.eq('category', assetClass);
        if (dateFrom) statsQuery = statsQuery.gte('created_at', new Date(dateFrom).toISOString());
        if (dateTo) {
          const toDate = new Date(dateTo);
          toDate.setDate(toDate.getDate() + 1);
          statsQuery = statsQuery.lte('created_at', toDate.toISOString());
        }

        const { data: allData } = await statsQuery;

        let totalNetR = 0;
        let wins = 0;
        let total = allData?.length || 0;
        let profitFactor = 0;
        let totalWinR = 0;
        let totalLossR = 0;

        allData?.forEach(s => {
          const entry = Number(s.entry_price || 0);
          const sl = Number(s.sl || 0);
          const risk = Math.abs(entry - sl);
          if (!risk) return;

          const status = s.status?.toUpperCase();
          let rr = 0;
          if (status === 'TP2' || status === 'WIN') {
            rr = Math.abs(Number(s.tp_secondary || s.tp || 0) - entry) / risk;
            wins++;
            totalWinR += rr;
          } else if (status === 'TP1' || status === 'TP1 + SL (BE)') {
            rr = Math.abs(Number(s.tp || 0) - entry) / risk;
            wins++;
            totalWinR += rr;
          } else if (status === 'SL' || status === 'LOSS') {
            rr = -1;
            totalLossR += 1;
          }
          totalNetR += rr;
        });

        const calculatedStats = {
          winRate: total > 0 ? ((wins / total) * 100).toFixed(1) : "0",
          totalTrades: total,
          profitFactor: totalLossR > 0 ? (totalWinR / totalLossR).toFixed(2) : totalWinR.toFixed(2),
          totalNetR: totalNetR.toFixed(1),
          expectancy: total > 0 ? (totalNetR / total).toFixed(2) : "0.00"
        };

        setHistory(data);
        setStats(calculatedStats);
        setTotalCount(count || 0);
        
        if (page === 1 && !searchTerm && assetClass === 'ALL') {
          localStorage.setItem('perf_history_cache', JSON.stringify(data));
          localStorage.setItem('perf_stats_cache', JSON.stringify(calculatedStats));
        }
      }
    } catch (err) {
      console.error("Performance Fetch Error:", err);
    } finally {
      setLoading(false);
    }
  }, [user, searchTerm, assetClass, dateFrom, dateTo]);

  useEffect(() => {
    const delay = setTimeout(() => fetchPerformance(currentPage), 400);
    return () => clearTimeout(delay);
  }, [fetchPerformance, currentPage, sortConfig]);

  useEffect(() => { setCurrentPage(1); }, [searchTerm, dateFrom, dateTo, assetClass]);

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  if (authLoading || (loading && history.length === 0)) {
    return (
      <div className="min-h-screen flex items-center justify-center ">
        <div className="flex flex-col items-center justify-center py-20 animate-pulse">
          <Activity size={40} className="text-zinc-700 mb-4" />
          <p className="text-xs font-black uppercase tracking-widest text-zinc-600">Loading Performance Metrics...</p>
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

        <div className="max-w-[1700px] mx-auto relative z-10 flex flex-col min-h-screen space-y-8">
          
          {/* Header Section */}
          <div className="flex flex-col xl:flex-row justify-between items-start xl:items-end gap-6 mb-6">
            <div>
              <h1 className="text-2xl md:text-4xl font-black tracking-tighter italic flex items-center gap-3 uppercase text-zinc-900 dark:text-white">
                CRT<span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-500">Performance</span>
              </h1>
              <p className="text-[10px] uppercase tracking-[0.4em] text-zinc-600 dark:text-zinc-500 font-bold mt-3 leading-none">
                • LIVE STRATEGY ANALYTICS & EXECUTION METRICS •
              </p>
            </div>

            <div className="flex flex-col md:flex-row gap-4 w-full lg:w-auto">
              {/* Date Filters */}
              <div className="flex gap-2">
                <div className="flex flex-col gap-1">
                  <label className="text-[9px] font-black text-zinc-600 dark:text-zinc-500 uppercase ml-2 tracking-widest">From</label>
                  <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-xl px-4 py-2.5 text-xs font-mono text-zinc-900 dark:text-white outline-none focus:border-blue-500/50 hover:border-white/20 transition-all cursor-pointer" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[9px] font-black text-zinc-600 dark:text-zinc-500 uppercase ml-2 tracking-widest">To</label>
                  <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-xl px-4 py-2.5 text-xs font-mono text-zinc-900 dark:text-white outline-none focus:border-blue-500/50 hover:border-white/20 transition-all cursor-pointer" />
                </div>
                {(dateFrom || dateTo) && (
                  <button onClick={() => { setDateFrom(''); setDateTo(''); }} className="self-end mb-1 p-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 hover:bg-red-500/20 transition-colors"><X size={16} /></button>
                )}
              </div>

              {/* Asset Class Filter */}
              <div className="flex flex-col gap-1 w-full md:w-48">
                <label className="text-[9px] font-black text-zinc-600 dark:text-zinc-500 uppercase ml-2 tracking-widest">Asset Class</label>
                <select value={assetClass} onChange={(e) => setAssetClass(e.target.value)} className="bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-xl px-4 py-2.5 text-xs font-mono font-bold text-zinc-900 dark:text-white outline-none focus:border-blue-500/50 hover:border-white/20 transition-all cursor-pointer appearance-none w-full">
                  <option value="ALL" className="">ALL ASSETS</option>
                  <option value="CRYPTO" className="">CRYPTO</option>
                  <option value="FOREX" className="">FOREX</option>
                  <option value="INDICES" className="">INDICES</option>
                  <option value="METALS" className="">METALS</option>
                </select>
              </div>

              {/* Search Input */}
              <div className="relative flex-grow md:w-64 self-end h-[42px] mb-0.5">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600 dark:text-zinc-500" size={16} />
                <input type="text" placeholder="Filter Symbol..." className="w-full h-full pl-12 pr-4 bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-xl text-xs font-mono text-zinc-900 dark:text-white focus:border-blue-500/50 hover:border-white/20 outline-none transition-all" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
              </div>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            <StatCard label="Win Rate" value={`${stats.winRate}%`} icon={<Target size={18}/>} color="text-indigo-400" />
            <StatCard label="Profit Factor" value={stats.profitFactor} icon={<TrendingUp size={18}/>} color="text-emerald-400" />
            <StatCard label="Total Net R" value={`+${stats.totalNetR}R`} icon={<Zap size={18}/>} color="text-blue-400" />
            <StatCard label="Expectancy" value={`${stats.expectancy}R`} icon={<Activity size={18}/>} color="text-amber-400" />
          </div>

          {/* Detailed Log Table */}
          <div className="bg-gradient-to-br from-white/[0.04] to-white/[0.01] border border-[var(--glass-border)] rounded-2xl md:rounded-[2.5rem] overflow-hidden flex-grow shadow-2xl backdrop-blur-md">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[800px]">
                <thead>
                  <tr className="text-[10px] font-black text-zinc-600 dark:text-zinc-500 uppercase tracking-widest bg-[var(--glass-bg)] border-b border-[var(--glass-border)]">
                    <th className="px-6 md:px-8 py-6 cursor-pointer hover:text-blue-400 transition-colors" onClick={() => handleSort('symbol')}>
                      <div className="flex items-center gap-1">
                        Asset / Provider
                        {sortConfig.key === 'symbol' && (sortConfig.direction === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}
                      </div>
                    </th>
                    <th className="py-6 cursor-pointer hover:text-blue-400 transition-colors" onClick={() => handleSort('side')}>
                      <div className="flex items-center gap-1">
                        Side
                        {sortConfig.key === 'side' && (sortConfig.direction === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}
                      </div>
                    </th>
                    <th className="py-6 cursor-pointer hover:text-blue-400 transition-colors" onClick={() => handleSort('status')}>
                      <div className="flex items-center gap-1">
                        Outcome
                        {sortConfig.key === 'status' && (sortConfig.direction === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}
                      </div>
                    </th>
                    <th className="py-6">Realized R</th>
                    <th className="py-6 hidden md:table-cell cursor-pointer hover:text-blue-400 transition-colors" onClick={() => handleSort('created_at')}>
                      <div className="flex items-center gap-1">
                        Execution
                        {sortConfig.key === 'created_at' && (sortConfig.direction === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}
                      </div>
                    </th>
                    <th className="px-6 md:px-8 py-6 text-center">View</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.05]">
                  <AnimatePresence mode="popLayout">
                    {history.length > 0 ? (
                      history.map((signal) => (
                        <motion.tr 
                          layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} 
                          key={signal.id} onClick={() => setSelectedSignal(signal)}
                          className="group hover:bg-[var(--glass-bg)] transition-colors cursor-pointer"
                        >
                          <td className="px-6 md:px-8 py-6">
                            <div className="flex flex-col">
                                <span className="text-base font-black text-zinc-900 dark:text-white uppercase tracking-tighter italic drop-shadow-sm">{signal.symbol}</span>
                                <span className="text-[9px] font-bold text-zinc-600 dark:text-zinc-500 uppercase tracking-widest mt-0.5">{getSymbolCategory(signal.symbol)}</span>
                            </div>
                          </td>
                          <td className="py-6">
                            <span className={`text-[10px] font-black px-2.5 py-1 rounded-lg border tracking-widest ${signal.side?.toUpperCase() === 'BUY' || signal.side?.toUpperCase() === 'BULLISH' ? 'text-emerald-400 border-emerald-500/20 bg-emerald-500/10' : 'text-red-400 border-red-500/20 bg-red-500/10'}`}>
                              {signal.side}
                            </span>
                          </td>
                          <td className="py-6"><ResultBadge status={signal.status} /></td>
                          <td className={`py-6 text-[14px] font-mono font-black ${
                            ['TP2', 'WIN'].includes(signal.status?.toUpperCase()) ? 'text-emerald-400' : 
                            ['SL', 'LOSS'].includes(signal.status?.toUpperCase()) ? 'text-red-400' : 
                            ['TP1', 'TP1 + SL (BE)'].includes(signal.status?.toUpperCase()) ? 'text-yellow-400' : 
                            'text-indigo-400'
                          }`}>
                            {calculateRRFromRow(signal)}
                          </td>
                          <td className="py-6 hidden md:table-cell text-xs font-mono text-zinc-600 dark:text-zinc-500">{new Date(signal.created_at).toLocaleDateString()}</td>
                          <td className="px-6 md:px-8 py-6 text-center">
                            <button className="p-2 rounded-xl bg-[var(--glass-bg)] border border-[var(--glass-border)] text-zinc-600 dark:text-zinc-500 hover:bg-white/[0.08] hover:text-zinc-900 dark:text-white transition-all">
                              <ChevronRight size={18} />
                            </button>
                          </td>
                        </motion.tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="py-32 text-center">
                          <div className="flex flex-col items-center justify-center">
                            <AlertCircle size={40} className="text-zinc-700 mb-4" />
                            <h3 className="text-xl font-black italic tracking-tighter uppercase text-zinc-900 dark:text-white mb-2">No History Found</h3>
                          </div>
                        </td>
                      </tr>
                    )}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-8 mb-4 flex justify-center items-center gap-4">
              <button onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1} className="p-3 rounded-xl bg-[var(--glass-bg)] border border-[var(--glass-border)] text-zinc-600 dark:text-zinc-500 hover:bg-white/[0.05] hover:text-zinc-900 dark:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"><ChevronLeft size={20} /></button>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase text-zinc-600 dark:text-zinc-500 tracking-widest">Page {currentPage} of {totalPages}</span>
              </div>
              <button onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages} className="p-3 rounded-xl bg-[var(--glass-bg)] border border-[var(--glass-border)] text-zinc-600 dark:text-zinc-500 hover:bg-white/[0.05] hover:text-zinc-900 dark:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"><ChevronRightIcon size={20} /></button>
            </div>
          )}

          {/* Modal */}
          <AnimatePresence>
            {selectedSignal && <SignalModal signal={selectedSignal} onClose={() => setSelectedSignal(null)} />}
          </AnimatePresence>
        </div>
      </div>
    </AccessGuard>
  );
}

// --- 4. LOGIC HELPERS ---
function calculateRRFromRow(signal: any) {
  const entry = Number(signal.entry_price || 0); 
  const sl = Number(signal.sl || 0); 
  const status = signal.status?.toUpperCase();
  const risk = Math.abs(entry - sl);
  
  if (!risk) return "0.0R";
  
  if (status === 'TP2' || status === 'WIN') {
    return `+${(Math.abs(Number(signal.tp_secondary || signal.tp || 0) - entry) / risk).toFixed(1)}R`;
  }
  if (status === 'TP1 + SL (BE)' || status === 'TP1') {
    return `+${(Math.abs(Number(signal.tp || 0) - entry) / risk).toFixed(1)}R`;
  }
  if (status === 'SL' || status === 'LOSS') {
    return "-1.0R";
  }
  return "0.0R";
}

function StatCard({ label, value, icon, color }: any) {
  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-white/[0.04] to-white/[0.01] border border-[var(--glass-border)] p-6 md:p-8 rounded-[2rem] hover:border-white/[0.1] hover:bg-white/[0.06] transition-all duration-500 group shadow-2xl flex flex-col justify-between">
      <div className="absolute inset-0 bg-gradient-to-br from-white/[0.05] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      <div className="relative z-10 flex justify-between items-start mb-4 md:mb-6">
        <p className="text-[9px] md:text-[10px] font-bold text-zinc-600 dark:text-zinc-500 uppercase tracking-widest">{label}</p>
        <div className={`p-2.5 rounded-xl bg-[var(--glass-bg)] border border-[var(--glass-border)] ${color} group-hover:scale-110 transition-transform duration-300 shadow-lg`}>{icon}</div>
      </div>
      <div className="relative z-10"><p className={`text-2xl md:text-3xl font-black italic tracking-tighter drop-shadow-md ${color}`}>{value}</p></div>
    </div>
  );
}
