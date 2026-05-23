"use client";

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/hooks/useAuth';
import AccessGuard from '@/components/AccessGuard';
import { motion, AnimatePresence } from 'framer-motion';
import SignalChart from '@/components/SignalChart';
import { 
  Search, Activity, Target, Shield, Clock, Zap, 
  ChevronLeft, ChevronRight, TrendingUp, TrendingDown,
  ArrowUpRight, Layout, AlertCircle
} from 'lucide-react';
import { normalizeSymbol, getSymbolCategory } from '@/lib/symbol-mapper';



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
  const tp2 = Number(signal.tp_secondary || 0);
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
      layout onClick={onClick} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden bg-gradient-to-br from-white/[0.04] to-white/[0.01] border border-[var(--glass-border)] p-6 md:p-8 rounded-[2.5rem] hover:border-white/[0.1] hover:bg-white/[0.06] transition-all duration-500 group shadow-2xl flex flex-col justify-between min-h-[500px] cursor-pointer"
    >
      <div className={`absolute -top-24 -right-24 w-64 h-64 blur-[120px] opacity-20 pointer-events-none group-hover:opacity-40 transition-opacity duration-700 ${isBuy ? 'bg-emerald-500' : 'bg-red-500'}`} />
      <div className="relative z-10">
        <div className="flex justify-between items-start mb-8 border-b border-[var(--glass-border)] pb-6">
          <div>
            <h3 className="text-3xl font-black text-zinc-900 dark:text-white tracking-tighter italic uppercase drop-shadow-md">{signal.symbol}</h3>
            <p className="text-[10px] font-bold text-zinc-600 dark:text-zinc-500 uppercase tracking-widest mt-2 flex items-center gap-2">{signal.strategy || 'KIMOO CRT PRO'} • {signal.tf_alignment || '5M'}</p>
          </div>
          <div className={`px-4 py-1.5 rounded-xl border text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-lg ${isBuy ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-red-500/10 border-red-500/30 text-red-400'}`}>
            {isBuy ? <TrendingUp size={12} /> : <TrendingDown size={12} />} {isBuy ? 'BULLISH' : 'BEARISH'}
          </div>
        </div>
        <div className="space-y-1.5 mb-8">
          <div className="bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-2xl p-4 mb-4 flex justify-between items-center group-hover:border-white/[0.1] transition-colors">
            <div className="flex items-center gap-3 text-[10px] font-black text-zinc-600 dark:text-zinc-500 uppercase tracking-widest"><Activity size={14} className="text-blue-400 animate-pulse"/> Status</div>
            <span className="text-xs font-black uppercase tracking-widest text-blue-400">{getDisplayStatus(signal.status)}</span>
          </div>
          <TradeDataRow icon={<TrendingUp size={12} className="text-indigo-400"/>} label="Trade R:R" value={getDynamicRR(signal)} valueClass="text-indigo-400" />
          <TradeDataRow icon={<Zap size={12} className="text-amber-400"/>} label="Entry Region" value={Number(signal.entry_price || 0).toFixed(5)} />
          <TradeDataRow icon={<Shield size={12} className="text-red-400"/>} label="Invalidation" value={Number(signal.sl || 0).toFixed(5)} valueClass="text-red-400" />
          <div className="my-2 border-t border-[var(--glass-border)]" />
          <TradeDataRow icon={<Target size={12} className="text-emerald-400"/>} label="TP-1 (EQ)" value={`${Number(signal.tp || 0).toFixed(5)} (${calculateTargetRR(signal.tp, signal.entry_price, signal.sl)})`} valueClass="text-emerald-400" />
          <TradeDataRow icon={<Zap size={12} className="text-yellow-500"/>} label="TP-2 (TARGET)" value={signal.tp_secondary ? `${Number(signal.tp_secondary).toFixed(5)} (${calculateTargetRR(signal.tp_secondary, signal.entry_price, signal.sl)})` : '---'} valueClass="text-yellow-500" />
          <div className="my-2 border-t border-[var(--glass-border)]" />
          <TradeDataRow icon={<Layout size={12} className="text-zinc-600 dark:text-zinc-500"/>} label="Confluences" value={signal.confluences || 'Institutional Bias Confirmed'} valueClass="text-zinc-700 dark:text-zinc-400 text-[11px] italic" />
          <div className="flex justify-between items-center pt-4 mt-2">
            <span className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">Time Elapsed</span>
            <span className="text-[10px] font-mono text-zinc-700 dark:text-zinc-400 font-black uppercase flex items-center gap-2 bg-[var(--glass-bg)] px-3 py-1.5 rounded-lg border border-[var(--glass-border)]"><Clock size={12} /> {getTimeAgo(signal.created_at)}</span>
          </div>
        </div>
      </div>
      
      <div className="flex flex-col gap-3 mt-4">
        <button onClick={(e) => { e.stopPropagation(); onClick(); }} className="action-btn relative z-10 w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-zinc-900 dark:text-white py-4 rounded-xl text-[11px] font-black uppercase tracking-[0.2em] transition-all duration-300 shadow-[0_0_30px_rgba(59,130,246,0.3)] hover:shadow-[0_0_40px_rgba(59,130,246,0.5)] active:scale-95 flex items-center justify-center gap-3 border border-blue-500/30 group/btn">
          <Layout size={16} className="text-blue-200 group-hover/btn:text-zinc-900 dark:text-white transition-colors" /> 
          Open Live Setup 
          <ArrowUpRight size={16} className="text-blue-200 group-hover/btn:translate-x-1 group-hover/btn:-translate-y-1 transition-transform" />
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

  const fetchSignals = useCallback(async (page: number, isSilent = false) => {
    if (!isSilent) setLoading(true);

    let query = supabase.from('signals').select('*', { count: 'exact' });

    // Filter by is_active = false for historical data
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
      if (page === 1 && !searchTerm && assetClass === 'ALL') localStorage.setItem('history_cache', JSON.stringify(data));
    }
    setLoading(false);
  }, [searchTerm, assetClass, dateFrom, dateTo]);

  useEffect(() => {
    const delay = setTimeout(() => fetchSignals(currentPage), 400);
    return () => clearTimeout(delay);
  }, [fetchSignals, currentPage]);

  useEffect(() => { setCurrentPage(1); }, [searchTerm, dateFrom, dateTo, assetClass]);

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
      <div className="relative p-4 md:p-12 lg:p-16 lg:ml-72  min-h-screen text-zinc-900 dark:text-white font-sans overflow-x-hidden">
        <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
          <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-blue-600/10 blur-[150px]" />
          <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-indigo-600/10 blur-[150px]" />
        </div>

        <div className="max-w-[1700px] mx-auto relative z-10 flex flex-col min-h-screen space-y-8">
          <div className="flex flex-col xl:flex-row justify-between items-start xl:items-end gap-6 mb-6">
            <div>
              <h1 className="text-2xl md:text-4xl font-black tracking-tighter italic flex items-center gap-3 uppercase text-zinc-900 dark:text-white">
                Alpha<span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-500">Terminal</span>
              </h1>
              <p className="text-[10px] uppercase tracking-[0.4em] text-zinc-600 dark:text-zinc-500 font-bold mt-3 leading-none">• CRT PROTOCOL • REAL-TIME INSTITUTIONAL SIGNALS •</p>
            </div>

            <div className="flex flex-col md:flex-row gap-4 w-full lg:w-auto">
              <div className="flex gap-2">
                <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-xl px-4 py-2.5 text-xs font-mono text-zinc-900 dark:text-white outline-none" />
                <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-xl px-4 py-2.5 text-xs font-mono text-zinc-900 dark:text-white outline-none" />
              </div>
              <select value={assetClass} onChange={(e) => setAssetClass(e.target.value)} className="bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-xl px-4 py-2.5 text-xs font-mono font-bold text-zinc-900 dark:text-white outline-none appearance-none">
                <option value="ALL">ALL ASSETS</option>
                <option value="CRYPTO">CRYPTO</option>
                <option value="FOREX">FOREX</option>
                <option value="INDICES">INDICES</option>
                <option value="METALS">METALS</option>
              </select>
              <div className="relative flex-grow md:w-64 h-[42px]">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600 dark:text-zinc-500" size={16} />
                <input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Search symbol..." className="w-full h-full pl-12 pr-4 bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-xl text-xs font-mono text-zinc-900 dark:text-white outline-none" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 md:gap-8 flex-grow">
            <AnimatePresence mode="popLayout">
              {signals.length > 0 ? signals.map((signal) => (
                <SignalCard key={signal.id} signal={signal} onClick={() => setSelectedSignal(signal)} />
              )) : (
                <div className="col-span-full w-full flex flex-col items-center justify-center py-40 border border-dashed border-white/[0.1] rounded-[2.5rem] bg-[var(--glass-bg)]">
                  <AlertCircle size={48} className="text-zinc-700 mb-6" />
                  <h3 className="text-2xl font-black italic tracking-tighter uppercase text-zinc-900 dark:text-white mb-2">No Intelligence Found</h3>
                </div>
              )}
            </AnimatePresence>
          </div>

          {Math.ceil(totalCount / ITEMS_PER_PAGE) > 1 && (
            <div className="mt-8 mb-4 flex justify-center items-center gap-4">
              <button onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1} className="p-3 rounded-xl bg-[var(--glass-bg)] border border-[var(--glass-border)] text-zinc-600 dark:text-zinc-500"><ChevronLeft size={20} /></button>
              <span className="text-[10px] font-black uppercase text-zinc-600 dark:text-zinc-500 tracking-widest">Page {currentPage} of {Math.ceil(totalCount / ITEMS_PER_PAGE)}</span>
              <button onClick={() => setCurrentPage(prev => Math.min(prev + 1, Math.ceil(totalCount / ITEMS_PER_PAGE)))} disabled={currentPage === Math.ceil(totalCount / ITEMS_PER_PAGE)} className="p-3 rounded-xl bg-[var(--glass-bg)] border border-[var(--glass-border)] text-zinc-600 dark:text-zinc-500"><ChevronRight size={20} /></button>
            </div>
          )}

          <AnimatePresence>
            {selectedSignal && <SignalModal signal={selectedSignal} onClose={() => setSelectedSignal(null)} />}
          </AnimatePresence>
        </div>
      </div>
    </AccessGuard>
  );
}
