"use client";

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/hooks/useAuth';
import AccessGuard from '@/components/AccessGuard';
import { motion, AnimatePresence } from 'framer-motion';
import SignalChart from '@/components/SignalChart';
import CustomSelect from '@/components/CustomSelect';
import { 
  Search, Activity, Target, Shield, Clock, Zap, 
  ChevronLeft, ChevronRight, TrendingUp, TrendingDown,
  ArrowUpRight, Layout, AlertCircle, FileSpreadsheet, ChevronDown, Award, Star
} from 'lucide-react';
import { normalizeSymbol, getSymbolCategory } from '@/lib/symbol-mapper';
import SymbolMultiSelect from '@/components/SymbolMultiSelect';
import { exportToCSV } from '@/lib/csv-exporter';



const handleViewSetup = (symbol: string) => {
  const myLayoutId = "TWlqcP20"; 
  const cleanSymbol = symbol.includes(':') ? symbol.split(':')[1] : symbol;
  const tvUrl = `https://www.tradingview.com/chart/${myLayoutId}/?symbol=${cleanSymbol.toUpperCase()}`;
  window.open(tvUrl, '_blank');
};

const ITEMS_PER_PAGE = 12;

import SignalModal from '@/components/SignalModal';

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
  if (hrs < 24) return `${hrs}H ${diff % 60}M AGO`;
  return new Date(timestamp).toLocaleDateString();
}

function getDisplayStatus(status: string) {
  switch (status?.toUpperCase()) {
    case 'PENDING': return 'In Progress';
    case 'TP1': return 'TP1 Hit';
    case 'TP1 + SL (BE)': return 'Partial TP1';
    case 'SL': return 'Stopped Out';
    case 'TP2': return 'TP1 / TP2';
    case 'WIN': return 'Take Profit';
    default: return 'Active';
  }
}

function calculateTargetRR(target: any, entry: any, sl: any) {
  const t = Number(target); const e = Number(entry); const s = Number(sl);
  if (!t || !e || !s || e === s) return "0.0R";
  const risk = Math.abs(e - s);
  return `+${(Math.abs(t - e) / risk).toFixed(1)}R`;
}

function getDynamicRR(signal: any) {
  const entry = Number(signal.entry_price || 0);
  const sl = Number(signal.sl || 0);
  const tp2 = Number(signal.tp2 || 0);
  const tp1 = Number(signal.tp || 0);
  if (!entry || !sl || entry === sl) return '0.0R';
  const risk = Math.abs(entry - sl);
  const status = signal.status?.toUpperCase();
  if (status === 'SL') return '-1.0R';
  if (status === 'TP2' && tp2) return `+${(Math.abs(tp2 - entry) / risk).toFixed(1)}R`;
  if ((status === 'TP1' || status === 'TP1 + SL (BE)') && tp1) return `+${(Math.abs(tp1 - entry) / risk).toFixed(1)}R`;
  return `1:${(Math.abs((tp2 || tp1) - entry) / risk).toFixed(1)}`;
}

const SignalCard = ({ signal, onClick }: { signal: any, onClick: () => void }) => {
  const isBuy = signal.side?.toUpperCase() === 'BUY' || signal.side?.toUpperCase() === 'BULLISH';

  return (
    <motion.div 
      id={`signal-card-${signal.id}`}
      layout onClick={onClick} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden glass-panel p-6 md:p-8 hover:border-orange-500/20 hover:shadow-lg transition-all duration-300 group flex flex-col justify-between min-h-[480px] cursor-pointer"
    >
      <div className={`absolute -top-24 -right-24 w-64 h-64 blur-[120px] opacity-10 dark:opacity-15 pointer-events-none group-hover:opacity-20 transition-opacity duration-700 ${isBuy ? 'bg-emerald-500' : 'bg-red-500'}`} />
      <div className="relative z-10">
        <div className="flex justify-between items-start mb-6 border-b border-[var(--glass-border)] pb-4.5">
          <div>
            <h3 className="text-2xl font-extrabold text-zinc-900 dark:text-white tracking-tight uppercase">{signal.symbol}</h3>
            <p className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mt-1.5 flex items-center gap-1.5">{signal.strategy || 'SFP_ALGO_PRO'} • {signal.tf || '15m'}</p>
          </div>
          <div className={`px-3 py-1 rounded-lg border text-[9px] font-extrabold uppercase tracking-wider flex items-center gap-1.5 shadow-sm ${isBuy ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-555' : 'bg-red-500/10 border-red-500/30 text-red-500'}`}>
            {isBuy ? <TrendingUp size={12} /> : <TrendingDown size={12} />} {isBuy ? 'BULLISH' : 'BEARISH'}
          </div>
        </div>
        <div className="space-y-1.5 mb-6">
          <div className="bg-[var(--input-bg)] border border-[var(--glass-border)] rounded-xl p-3.5 mb-4 flex justify-between items-center group-hover:border-orange-500/10 transition-colors">
            <div className="flex items-center gap-2.5 text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider"><Activity size={13} className="text-orange-500 animate-pulse"/> Status</div>
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-orange-500">{getDisplayStatus(signal.status)}</span>
          </div>
          <TradeDataRow icon={<TrendingUp size={12} className="text-indigo-400"/>} label="Trade R:R" value={getDynamicRR(signal)} valueClass="text-indigo-500" />
          <TradeDataRow icon={<Zap size={12} className="text-amber-500"/>} label="Entry Region" value={Number(signal.entry_price || 0).toFixed(5)} />
          <TradeDataRow icon={<Shield size={12} className="text-red-400"/>} label="Invalidation" value={Number(signal.sl || 0).toFixed(5)} valueClass="text-red-400" />
          <div className="my-2 border-t border-[var(--glass-border)]" />
          <TradeDataRow icon={<Target size={12} className="text-emerald-500"/>} label="TP-1 (2RR)" value={`${Number(signal.tp || 0).toFixed(5)} (${calculateTargetRR(signal.tp, signal.entry_price, signal.sl)})`} valueClass="text-emerald-500" />
          <TradeDataRow icon={<Zap size={12} className="text-amber-500"/>} label="TP-2 (2.5RR)" value={signal.tp2 ? `${Number(signal.tp2).toFixed(5)} (${calculateTargetRR(signal.tp2, signal.entry_price, signal.sl)})` : '---'} valueClass="text-amber-500" />
          <TradeDataRow icon={<Target size={12} className="text-blue-500"/>} label="TP-3 (4RR)" value={signal.tp3 ? `${Number(signal.tp3).toFixed(5)} (${calculateTargetRR(signal.tp3, signal.entry_price, signal.sl)})` : '---'} valueClass="text-blue-500" />
          <TradeDataRow icon={<Zap size={12} className="text-indigo-500"/>} label="TP-4 (4.5RR)" value={signal.tp4 ? `${Number(signal.tp4).toFixed(5)} (${calculateTargetRR(signal.tp4, signal.entry_price, signal.sl)})` : '---'} valueClass="text-indigo-500" />
          <div className="my-2 border-t border-[var(--glass-border)]" />
          <TradeDataRow icon={<Award size={12} className="text-blue-500 dark:text-blue-400"/>} label="Grading" value={renderGradeStars(signal.grade)} valueClass="text-blue-500 dark:text-blue-400 font-extrabold uppercase animate-pulse" />
          <TradeDataRow icon={<Layout size={12} className="text-zinc-500"/>} label="Confluences" value={signal.confluences || 'Institutional Bias Confirmed'} valueClass="text-zinc-650 dark:text-zinc-400 text-[11px] italic" />
          <div className="flex justify-between items-center pt-3.5 mt-1.5">
            <span className="text-[9px] font-bold text-zinc-550 dark:text-zinc-400 uppercase tracking-wider">Time Elapsed</span>
            <span className="text-[10px] font-mono text-zinc-650 dark:text-zinc-400 font-bold uppercase flex items-center gap-1.5 bg-[var(--input-bg)] px-2.5 py-1 rounded-lg border border-[var(--glass-border)]"><Clock size={11} /> {getTimeAgo(signal.created_at)}</span>
          </div>
        </div>
      </div>
      
      <div className="flex flex-col mt-2">
        <button onClick={(e) => { e.stopPropagation(); onClick(); }} className="btn-modern w-full flex items-center justify-center gap-2 text-xs py-3 h-[42px] border border-orange-500/20">
          <Layout size={14} className="text-white" /> 
          Open Live Setup 
          <ArrowUpRight size={14} className="text-white transition-transform group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5" />
        </button>
      </div>
    </motion.div>
  );
};

// --- 5. MAIN PAGE ---
export default function SignalsPage() {
  const { user, loading: authLoading } = useAuth();
  const [signals, setSignals] = useState<any[]>(() => (typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('history_cache') || '[]') : []));
  const [loading, setLoading] = useState(() => (typeof window !== 'undefined' ? !localStorage.getItem('history_cache') : true));
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedSignal, setSelectedSignal] = useState<any | null>(null);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [assetClass, setAssetClass] = useState('ALL');
  const [tfAlignment, setTfAlignment] = useState('ALL');

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

  const fetchSignals = useCallback(async (page: number, isSilent = false) => {
    if (!isSilent) setLoading(true);

    let query = supabase.from('sfp_signals').select('*', { count: 'exact' });

    // Filter by is_active = false for historical data
    query = query.eq('is_active', false);

    if (searchTerm) {
      query = query.ilike('symbol', `%${searchTerm}%`);
    }

    if (assetClass !== 'ALL') {
      query = query.eq('category', assetClass);
    }

    if (tfAlignment !== 'ALL') {
      query = query.eq('tf', tfAlignment);
    }

    if (selectedSymbols.length > 0) {
      query = query.in('symbol', selectedSymbols);
    }

    if (dateFrom) {
      query = query.gte('created_at', new Date(dateFrom).toISOString());
    }

    if (dateTo) {
      // Add one day to dateTo to include the entire day
      const toDate = new Date(dateTo);
      toDate.setDate(toDate.getDate() + 1);
      query = query.lte('created_at', toDate.toISOString());
    }

    query = query.order('created_at', { ascending: false });

    const from = (page - 1) * ITEMS_PER_PAGE;
    const to = from + ITEMS_PER_PAGE - 1;
    
    query = query.range(from, to);

    const { data, count, error } = await query;

    if (error) {
      console.error("Error fetching signals:", error);
    }

    if (data) {
      setSignals(data);
      setTotalCount(count || 0);
      if (page === 1 && !searchTerm && assetClass === 'ALL' && tfAlignment === 'ALL' && selectedSymbols.length === 0) {
        localStorage.setItem('history_cache', JSON.stringify(data));
      }
    }
    setLoading(false);
  }, [searchTerm, assetClass, dateFrom, dateTo, tfAlignment, selectedSymbols]);

  const handleDownloadCSV = async () => {
    let query = supabase.from('sfp_signals').select('*');
    query = query.eq('is_active', false);
    
    if (searchTerm) query = query.ilike('symbol', `%${searchTerm}%`);
    if (assetClass !== 'ALL') query = query.eq('category', assetClass);
    if (tfAlignment !== 'ALL') query = query.eq('tf', tfAlignment);
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
        { key: 'side', label: 'Side' },
        { key: 'status', label: 'Status' },
        { key: 'strategy', label: 'Strategy' },
        { key: 'entry_price', label: 'Entry Price' },
        { key: 'sl', label: 'Stop Loss' },
        { key: 'tp', label: 'Take Profit 1' },
        { key: 'tp2', label: 'Take Profit 2' },
        { key: 'tf', label: 'Timeframe' },
        { key: 'category', label: 'Asset Class' },
        { key: 'confluences', label: 'Confluences' },
        { key: 'created_at', label: 'Date Executed' }
      ];
      exportToCSV(data, headers, "Trade_History_Report");
    }
  };

  useEffect(() => {
    const delay = setTimeout(() => fetchSignals(currentPage), 400);
    return () => clearTimeout(delay);
  }, [fetchSignals, currentPage]);

  useEffect(() => { setCurrentPage(1); }, [searchTerm, dateFrom, dateTo, assetClass, tfAlignment, selectedSymbols]);

  if (authLoading || (loading && signals.length === 0)) {
    return (
      <div className="min-h-screen flex items-center justify-center ">
        <div className="flex flex-col items-center justify-center py-20 animate-pulse">
          <Activity size={40} className="text-zinc-700 mb-4" />
          <p className="text-xs font-black uppercase tracking-widest text-zinc-600">Loading Intelligence...</p>
        </div>
      </div>
    );
  }

  return (
    <AccessGuard requiredTier={1} tierName="PRO">
      <div className="w-full relative z-10 space-y-6 md:space-y-8">        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl md:text-4xl font-extrabold tracking-tight uppercase text-zinc-900 dark:text-white">
              Alpha<span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-orange-600">Terminal</span>
            </h1>
            <p className="text-[10px] uppercase tracking-[0.3em] text-zinc-500 dark:text-zinc-400 font-bold mt-2">• SFP PROTOCOL • REAL-TIME INSTITUTIONAL SIGNALS •</p>
          </div>
        </div>

        <div className="glass-panel p-4 md:p-5 w-full grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4 items-end shadow-lg">
          <div className="flex flex-col gap-1.5 w-full">
            <span className="text-[10px] font-bold text-zinc-550 dark:text-zinc-400 uppercase tracking-wider ml-1">From Date</span>
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="input-modern h-[42px] px-4 text-xs font-semibold text-foreground bg-[var(--input-bg)] border border-[var(--input-border)] outline-none w-full cursor-pointer" />
          </div>
          <div className="flex flex-col gap-1.5 w-full">
            <span className="text-[10px] font-bold text-zinc-550 dark:text-zinc-400 uppercase tracking-wider ml-1">To Date</span>
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="input-modern h-[42px] px-4 text-xs font-semibold text-foreground bg-[var(--input-bg)] border border-[var(--input-border)] outline-none w-full cursor-pointer" />
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
              { value: 'ALL', label: 'All Timeframes' },
              { value: '1m', label: '1m' },
              { value: '3m', label: '3m' },
              { value: '5m', label: '5m' },
              { value: '15m', label: '15m' },
              { value: '30m', label: '30m' },
              { value: '1H', label: '1H' },
              { value: '4H', label: '4H' },
              { value: '6H', label: '6H' },
              { value: '1D', label: '1D' },
              { value: '1W', label: '1W' }
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
                <input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Search symbol..." className="w-full h-full pl-9 pr-3 input-modern text-xs font-semibold text-foreground bg-[var(--input-bg)] border border-[var(--input-border)] outline-none" />
              </div>
              
              <button
                onClick={handleDownloadCSV}
                className="p-3 bg-orange-500/10 border border-orange-500/20 hover:bg-orange-500/20 text-orange-500 hover:text-orange-400 transition-all rounded-xl flex items-center justify-center shadow-sm h-full shrink-0 cursor-pointer"
                title="Download Spreadsheet"
              >
                <FileSpreadsheet size={16} />
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 flex-grow">
          <AnimatePresence mode="popLayout">
            {signals.length > 0 ? signals.map((signal) => (
              <SignalCard key={signal.id} signal={signal} onClick={() => setSelectedSignal(signal)} />
            )) : (
              <div className="col-span-full w-full flex flex-col items-center justify-center py-40 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl bg-[var(--glass-bg)]">
                <AlertCircle size={40} className="text-zinc-500 mb-4" />
                <h3 className="text-xl font-bold tracking-tight uppercase text-zinc-900 dark:text-white mb-1.5">No Intelligence Found</h3>
                <p className="text-[10px] font-extrabold text-zinc-500 uppercase tracking-widest">Awaiting Order Block Displacement...</p>
              </div>
            )}
          </AnimatePresence>
        </div>

        {Math.ceil(totalCount / ITEMS_PER_PAGE) > 1 && (
          <div className="mt-8 mb-4 flex justify-center items-center gap-4">
            <button onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1} className="p-3 rounded-xl bg-[var(--glass-bg)] border border-[var(--glass-border)] text-zinc-500 hover:text-orange-500 transition-all cursor-pointer"><ChevronLeft size={18} /></button>
            <span className="text-[10px] font-extrabold uppercase text-zinc-500 tracking-wider">Page {currentPage} of {Math.ceil(totalCount / ITEMS_PER_PAGE)}</span>
            <button onClick={() => setCurrentPage(prev => Math.min(prev + 1, Math.ceil(totalCount / ITEMS_PER_PAGE)))} disabled={currentPage === Math.ceil(totalCount / ITEMS_PER_PAGE)} className="p-3 rounded-xl bg-[var(--glass-bg)] border border-[var(--glass-border)] text-zinc-500 hover:text-orange-500 transition-all cursor-pointer"><ChevronRight size={18} /></button>
          </div>
        )}

        <AnimatePresence>
          {selectedSignal && <SignalModal signal={selectedSignal} onClose={() => setSelectedSignal(null)} />}
        </AnimatePresence>
      </div>
    </AccessGuard>
  );
}

function renderGradeStars(grade: string | undefined) {
  const g = (grade || 'A+').toUpperCase().trim();
  let starsCount = 4; // Default for A+
  let cleanLabel = 'A+';

  if (g.includes('A++')) {
    starsCount = 5;
    cleanLabel = 'A++';
  } else if (g.includes('A+')) {
    starsCount = 4;
    cleanLabel = 'A+';
  } else if (g.includes('GOOD')) {
    starsCount = 3;
    cleanLabel = 'GOOD';
  } else if (g.includes('NORMAL')) {
    starsCount = 2;
    cleanLabel = 'NORMAL';
  } else {
    cleanLabel = g;
    starsCount = g.includes('A') ? 4 : 2;
  }

  return (
    <span className="inline-flex items-center gap-1.5">
      <span>{cleanLabel}</span>
      <span className="inline-flex items-center gap-0.5 text-amber-500">
        {Array.from({ length: starsCount }).map((_, i) => (
          <Star key={i} size={11} fill="currentColor" className="stroke-none" />
        ))}
      </span>
    </span>
  );
}
