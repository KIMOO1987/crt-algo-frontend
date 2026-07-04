"use client";

import { useEffect, useState, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/hooks/useAuth';
import AccessGuard from '@/components/AccessGuard';
import SignalChart from '@/components/SignalChart';
import CustomSelect from '@/components/CustomSelect';
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
  ChevronDown,
  FileSpreadsheet
} from 'lucide-react';
import SymbolMultiSelect from '@/components/SymbolMultiSelect';
import { exportToCSV } from '@/lib/csv-exporter';

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
        className="w-full max-w-6xl glass-panel overflow-hidden flex flex-col lg:flex-row shadow-[0_0_100px_rgba(0,0,0,0.8)]"
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
            <PriceRow label="TP 2" value={signal.tp2} color="text-green-400" />
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
  const [symbolPerformance, setSymbolPerformance] = useState<any[]>(() => {
    if (typeof window !== 'undefined') {
      const cached = localStorage.getItem('perf_symbol_perf_cache');
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
      return !localStorage.getItem('perf_symbol_perf_cache');
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
  const [tfAlignment, setTfAlignment] = useState('ALL');
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' }>({
    key: 'net_r',
    direction: 'desc'
  });

  // Symbol multi-select filter states
  const [selectedSymbols, setSelectedSymbols] = useState<string[]>([]);
  const [uniqueSymbols, setUniqueSymbols] = useState<string[]>([]);

  // Fetch unique symbols from historical signals database on mount
  useEffect(() => {
    async function fetchUniqueSymbols() {
      const { data } = await supabase
        .from('sfp_signals')
        .select('symbol')
        .eq('is_active', false);
      if (data) {
        const syms = Array.from(new Set(data.map((s: any) => s.symbol.toUpperCase()))).sort();
        setUniqueSymbols(syms);
      }
    }
    fetchUniqueSymbols();
  }, []);

  const handleSort = (key: string) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc'
    }));
  };

  const fetchPerformance = useCallback(async (isSilent = false) => {
    if (!user) {
      if (!isSilent) setLoading(false);
      return;
    }
    if (!isSilent) setLoading(true);

    try {
      // Fetch ALL signals matching filter criteria to calculate AGGREGATE stats and symbol performance
      let statsQuery = supabase
        .from('sfp_signals')
        .select('status, entry_price, sl, tp, tp2, symbol, category')
        .eq('is_active', false);

      if (searchTerm) statsQuery = statsQuery.ilike('symbol', `%${searchTerm}%`);
      if (assetClass !== 'ALL') statsQuery = statsQuery.eq('category', assetClass);
      if (tfAlignment !== 'ALL') statsQuery = statsQuery.eq('tf_alignment', tfAlignment);
      if (selectedSymbols.length > 0) statsQuery = statsQuery.in('symbol', selectedSymbols);
      if (dateFrom) statsQuery = statsQuery.gte('created_at', new Date(dateFrom).toISOString());
      if (dateTo) {
        const toDate = new Date(dateTo);
        toDate.setDate(toDate.getDate() + 1);
        statsQuery = statsQuery.lte('created_at', toDate.toISOString());
      }

      const { data: allData } = await statsQuery;

      if (allData) {
        let totalNetR = 0;
        let wins = 0;
        let total = allData.length;
        let totalWinR = 0;
        let totalLossR = 0;

        const symbolMap: Record<string, any> = {};

        allData.forEach(s => {
          const entry = Number(s.entry_price || 0);
          const sl = Number(s.sl || 0);
          const risk = Math.abs(entry - sl);
          if (!risk) return;

          const status = s.status?.toUpperCase();
          let rr = 0;
          if (status === 'TP2' || status === 'WIN') {
            rr = Math.abs(Number(s.tp2 || s.tp || 0) - entry) / risk;
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

          const sym = s.symbol.toUpperCase();
          if (!symbolMap[sym]) {
            symbolMap[sym] = {
              symbol: sym,
              category: s.category || '',
              total_trades: 0,
              wins: 0,
              totalWinR: 0,
              totalLossR: 0,
              net_r: 0
            };
          }

          const statsObj = symbolMap[sym];
          statsObj.total_trades++;
          if (status === 'TP2' || status === 'WIN' || status === 'TP1' || status === 'TP1 + SL (BE)') {
            statsObj.wins++;
            statsObj.totalWinR += rr;
          } else if (status === 'SL' || status === 'LOSS') {
            statsObj.totalLossR++;
          }
          statsObj.net_r += rr;
        });

        const calculatedStats = {
          winRate: total > 0 ? ((wins / total) * 100).toFixed(1) : "0",
          totalTrades: total,
          profitFactor: totalLossR > 0 ? (totalWinR / totalLossR).toFixed(2) : totalWinR.toFixed(2),
          totalNetR: totalNetR.toFixed(1),
          expectancy: total > 0 ? (totalNetR / total).toFixed(2) : "0.00"
        };

        const performanceList = Object.values(symbolMap).map((s: any) => ({
          ...s,
          win_rate: s.total_trades > 0 ? parseFloat(((s.wins / s.total_trades) * 100).toFixed(1)) : 0.0,
          profit_factor: s.totalLossR > 0 ? parseFloat((s.totalWinR / s.totalLossR).toFixed(2)) : parseFloat(s.totalWinR.toFixed(2)),
          expectancy: s.total_trades > 0 ? parseFloat((s.net_r / s.total_trades).toFixed(2)) : 0.00
        }));

        setStats(calculatedStats);
        setSymbolPerformance(performanceList);
        setTotalCount(total);

        if (!searchTerm && assetClass === 'ALL' && tfAlignment === 'ALL' && selectedSymbols.length === 0) {
          localStorage.setItem('perf_symbol_perf_cache', JSON.stringify(performanceList));
          localStorage.setItem('perf_stats_cache', JSON.stringify(calculatedStats));
        }
      }
    } catch (err) {
      console.error("Performance Fetch Error:", err);
    } finally {
      setLoading(false);
    }
  }, [user, searchTerm, assetClass, dateFrom, dateTo, tfAlignment, selectedSymbols]);

  const handleDownloadCSV = async () => {
    let query = supabase.from('sfp_signals').select('*');
    query = query.eq('is_active', false);
    
    if (searchTerm) query = query.ilike('symbol', `%${searchTerm}%`);
    if (assetClass !== 'ALL') query = query.eq('category', assetClass);
    if (tfAlignment !== 'ALL') query = query.eq('tf_alignment', tfAlignment);
    if (selectedSymbols.length > 0) query = query.in('symbol', selectedSymbols);
    
    if (dateFrom) query = query.gte('created_at', new Date(dateFrom).toISOString());
    if (dateTo) {
      const toDate = new Date(dateTo);
      toDate.setDate(toDate.getDate() + 1);
      query = query.lte('created_at', toDate.toISOString());
    }
    
    query = query.order('created_at', { ascending: false });

    setLoading(true);
    const { data, error } = await query;
    setLoading(false);

    if (error) {
      console.error("Export Error:", error);
      alert("Failed to export data.");
      return;
    }

    if (data) {
      const headers = [
        { key: 'symbol', label: 'Symbol' },
        { key: 'category', label: 'Asset Class' },
        { key: 'side', label: 'Side' },
        { key: 'status', label: 'Outcome Status' },
        { key: 'entry_price', label: 'Entry Price' },
        { key: 'sl', label: 'Stop Loss' },
        { key: 'tp', label: 'Take Profit 1' },
        { key: 'tp2', label: 'Take Profit 2' },
        { key: 'confluences', label: 'Confluences' },
        { key: 'created_at', label: 'Execution Date' }
      ];
      exportToCSV(data, headers, "Performance_Analytics_Report");
    }
  };

  useEffect(() => {
    const delay = setTimeout(() => fetchPerformance(), 400);
    return () => clearTimeout(delay);
  }, [fetchPerformance, sortConfig]);

  useEffect(() => { setCurrentPage(1); }, [searchTerm, dateFrom, dateTo, assetClass, tfAlignment, selectedSymbols]);

  const sortedPerformance = useMemo(() => {
    const list = [...symbolPerformance];
    const { key, direction } = sortConfig;
    
    const sortKey = key === 'created_at' ? 'net_r' : key;
    
    list.sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];
      
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return direction === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      
      const numA = Number(aVal || 0);
      const numB = Number(bVal || 0);
      return direction === 'asc' ? numA - numB : numB - numA;
    });
    
    return list;
  }, [symbolPerformance, sortConfig]);

  const totalPages = 1;

  if (authLoading || (loading && symbolPerformance.length === 0)) {
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
      <div className="w-full relative z-10 flex flex-col min-h-screen space-y-8">
          
          {/* Header Section */}
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-2xl md:text-4xl font-black tracking-tighter italic flex items-center gap-3 uppercase text-zinc-900 dark:text-white">
                SFP<span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-500">Performance</span>
              </h1>
              <p className="text-[10px] uppercase tracking-[0.4em] text-zinc-650 dark:text-zinc-400 font-bold mt-3 leading-none">
                • LIVE STRATEGY ANALYTICS & EXECUTION METRICS •
              </p>
            </div>
          </div>

          {/* Filters Bar */}
          <div className="glass-panel p-4 md:p-5 w-full grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4 items-end shadow-lg">
            <div className="flex flex-col gap-1.5 w-full">
              <span className="text-[10px] font-bold text-zinc-550 dark:text-zinc-400 uppercase tracking-wider ml-1">From Date</span>
              <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="input-modern h-[42px] px-4 text-xs font-semibold text-foreground bg-[var(--input-bg)] border border-[var(--input-border)] outline-none w-full cursor-pointer" />
            </div>
            <div className="flex flex-col gap-1.5 w-full">
              <span className="text-[10px] font-bold text-zinc-550 dark:text-zinc-400 uppercase tracking-wider ml-1">To Date</span>
              <div className="relative w-full">
                <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="input-modern h-[42px] px-4 text-xs font-semibold text-foreground bg-[var(--input-bg)] border border-[var(--input-border)] outline-none w-full cursor-pointer pr-10" />
                {(dateFrom || dateTo) && (
                  <button onClick={() => { setDateFrom(''); setDateTo(''); }} className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 hover:bg-red-500/20 transition-colors flex items-center justify-center cursor-pointer" title="Clear Dates">
                    <X size={12} />
                  </button>
                )}
              </div>
            </div>

            <CustomSelect
              label="Asset Class"
              value={assetClass}
              onChange={setAssetClass}
              options={[
                { value: 'ALL', label: 'ALL ASSETS' },
                { value: 'CRYPTO', label: 'CRYPTO' },
                { value: 'FOREX', label: 'FOREX' },
                { value: 'INDICES', label: 'INDICES' },
                { value: 'METALS', label: 'METALS' }
              ]}
            />

            <CustomSelect
              label="Timeframe"
              value={tfAlignment}
              onChange={setTfAlignment}
              options={[
                { value: 'ALL', label: 'ALL ALIGNMENTS' },
                { value: 'M5/H1', label: '5M - 1H Alignment' },
                { value: 'M15/H4', label: '15M - 4H Alignment' },
                { value: 'M30/H6', label: '30M - 6H Alignment' },
                { value: 'H1/D1', label: '1H - 1D Alignment' }
              ]}
            />

            <div className="w-full flex flex-col gap-1.5">
              <SymbolMultiSelect symbols={uniqueSymbols} selectedSymbols={selectedSymbols} onChange={setSelectedSymbols} />
            </div>

            <div className="flex flex-col gap-1.5 w-full">
              <span className="text-[10px] font-bold text-zinc-550 dark:text-zinc-400 uppercase tracking-wider ml-1">Search & Export</span>
              <div className="flex gap-2 w-full h-[42px]">
                <div className="relative flex-grow h-full">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={14} />
                  <input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Filter symbol..." className="w-full h-full pl-9 pr-3 input-modern text-xs font-semibold text-foreground bg-[var(--input-bg)] border border-[var(--input-border)] outline-none" />
                </div>
                
                <button
                  onClick={handleDownloadCSV}
                  className="p-3 bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 text-emerald-500 hover:text-emerald-400 transition-all rounded-xl flex items-center justify-center shadow-sm h-full shrink-0 cursor-pointer"
                  title="Download Spreadsheet"
                >
                  <FileSpreadsheet size={16} />
                </button>
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

          {/* Detailed Leaderboard Table */}
          <div className="glass-panel overflow-hidden flex-grow shadow-2xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[800px]">
                <thead>
                  <tr className="text-[10px] font-black text-zinc-600 dark:text-zinc-500 uppercase tracking-widest bg-[var(--glass-bg)] border-b border-[var(--glass-border)]">
                    <th className="px-6 md:px-8 py-6 cursor-pointer hover:text-blue-400 transition-colors" onClick={() => handleSort('symbol')}>
                      <div className="flex items-center gap-1">
                        Symbol / Asset
                        {sortConfig.key === 'symbol' && (sortConfig.direction === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}
                      </div>
                    </th>
                    <th className="py-6 cursor-pointer hover:text-blue-400 transition-colors" onClick={() => handleSort('total_trades')}>
                      <div className="flex items-center gap-1">
                        Total Trades
                        {sortConfig.key === 'total_trades' && (sortConfig.direction === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}
                      </div>
                    </th>
                    <th className="py-6 cursor-pointer hover:text-blue-400 transition-colors" onClick={() => handleSort('win_rate')}>
                      <div className="flex items-center gap-1">
                        Win Rate
                        {sortConfig.key === 'win_rate' && (sortConfig.direction === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}
                      </div>
                    </th>
                    <th className="py-6 cursor-pointer hover:text-blue-400 transition-colors" onClick={() => handleSort('profit_factor')}>
                      <div className="flex items-center gap-1">
                        Profit Factor
                        {sortConfig.key === 'profit_factor' && (sortConfig.direction === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}
                      </div>
                    </th>
                    <th className="py-6 cursor-pointer hover:text-blue-400 transition-colors" onClick={() => handleSort('expectancy')}>
                      <div className="flex items-center gap-1">
                        Expectancy
                        {sortConfig.key === 'expectancy' && (sortConfig.direction === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}
                      </div>
                    </th>
                    <th className="py-6 cursor-pointer hover:text-blue-400 transition-colors" onClick={() => handleSort('net_r')}>
                      <div className="flex items-center gap-1">
                        Net Realized R
                        {sortConfig.key === 'net_r' && (sortConfig.direction === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.05]">
                  <AnimatePresence mode="popLayout">
                    {sortedPerformance.length > 0 ? (
                      sortedPerformance.map((item, idx) => (
                        <motion.tr 
                          layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} 
                          key={item.symbol}
                          className="group hover:bg-[var(--glass-bg)] transition-colors"
                        >
                          <td className="px-6 md:px-8 py-6">
                            <div className="flex items-center gap-3">
                              <span className="text-xs font-mono text-zinc-500 font-bold">#{idx + 1}</span>
                              <div className="flex flex-col">
                                <span className="text-base font-black text-zinc-900 dark:text-white uppercase tracking-tighter italic drop-shadow-sm">{item.symbol}</span>
                                <span className="text-[9px] font-bold text-zinc-650 dark:text-zinc-500 uppercase tracking-widest mt-0.5">{getSymbolCategory(item.symbol)}</span>
                              </div>
                            </div>
                          </td>
                          <td className="py-6 font-mono font-bold text-zinc-800 dark:text-zinc-300">
                            {item.total_trades}
                          </td>
                          <td className="py-6">
                            <span className={`text-[10px] font-black px-2.5 py-1 rounded-lg border tracking-widest ${item.win_rate >= 50 ? 'text-emerald-450 border-emerald-500/20 bg-emerald-500/10' : 'text-red-400 border-red-500/20 bg-red-500/10'}`}>
                              {item.win_rate}%
                            </span>
                          </td>
                          <td className="py-6 font-mono font-bold text-zinc-800 dark:text-zinc-300">
                            {item.profit_factor}
                          </td>
                          <td className={`py-6 font-mono font-bold ${item.expectancy >= 0 ? 'text-emerald-500' : 'text-red-400'}`}>
                            {item.expectancy >= 0 ? '+' : ''}{item.expectancy}R
                          </td>
                          <td className={`py-6 text-[15px] font-mono font-black ${item.net_r >= 0 ? 'text-emerald-450' : 'text-red-500'}`}>
                            {item.net_r >= 0 ? '+' : ''}{item.net_r.toFixed(1)}R
                          </td>
                        </motion.tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="py-32 text-center">
                          <div className="flex flex-col items-center justify-center">
                            <AlertCircle size={40} className="text-zinc-700 mb-4" />
                            <h3 className="text-xl font-black italic tracking-tighter uppercase text-zinc-900 dark:text-white mb-2">No Performance Data Found</h3>
                          </div>
                        </td>
                      </tr>
                    )}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>
          </div>

          {/* Modal */}
          <AnimatePresence>
            {selectedSignal && <SignalModal signal={selectedSignal} onClose={() => setSelectedSignal(null)} />}
          </AnimatePresence>
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
    return `+${(Math.abs(Number(signal.tp2 || signal.tp || 0) - entry) / risk).toFixed(1)}R`;
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
    <div className="relative overflow-hidden glass-panel p-6 md:p-8 hover:border-white/[0.1] hover:bg-white/[0.06] transition-all duration-500 group shadow-2xl flex flex-col justify-between">
      <div className="absolute inset-0 bg-gradient-to-br from-white/[0.05] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      <div className="relative z-10 flex justify-between items-start mb-4 md:mb-6">
        <p className="text-[9px] md:text-[10px] font-bold text-zinc-600 dark:text-zinc-500 uppercase tracking-widest">{label}</p>
        <div className={`p-2.5 rounded-xl bg-[var(--glass-bg)] border border-[var(--glass-border)] ${color} group-hover:scale-110 transition-transform duration-300 shadow-lg`}>{icon}</div>
      </div>
      <div className="relative z-10"><p className={`text-2xl md:text-3xl font-black italic tracking-tighter drop-shadow-md ${color}`}>{value}</p></div>
    </div>
  );
}
