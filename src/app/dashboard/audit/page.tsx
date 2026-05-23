"use client";

import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/hooks/useAuth';
import AccessGuard from '@/components/AccessGuard';
import { Search, Activity, Zap, TrendingUp, Layers, Target, Wallet, BarChart3, AlertCircle, ChevronUp, ChevronDown } from 'lucide-react';
import { normalizeSymbol, getSymbolCategory } from '@/lib/symbol-mapper';

// Sub-component remains the same as your original
function AnalysisCard({ title, symbol, value, subValue, colorClass, icon: Icon }: any) {
  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-white/[0.04] to-white/[0.01] border border-[var(--glass-border)] p-6 md:p-8 rounded-[2rem] hover:border-white/[0.1] hover:bg-white/[0.06] transition-all duration-300 group shadow-2xl flex flex-col justify-between">
      <div className={`absolute top-0 left-0 w-full h-[2px] ${colorClass.replace('text-', 'bg-')} opacity-50 group-hover:opacity-100 transition-opacity`} />
      <div className="relative z-10 flex justify-between items-start mb-6">
        <p className="text-[10px] md:text-xs font-bold text-zinc-600 dark:text-zinc-500 uppercase tracking-widest">{title}</p>
        {Icon && <div className={`p-2.5 rounded-xl bg-[var(--glass-bg)] border border-[var(--glass-border)] ${colorClass} group-hover:scale-110 transition-transform duration-300 shadow-lg`}><Icon size={18} /></div>}
      </div>
      <div className="relative z-10">
        <h3 className="text-2xl md:text-3xl font-black text-zinc-900 dark:text-white italic uppercase tracking-tighter mb-2 drop-shadow-md">{symbol}</h3>
        <div className="flex items-baseline gap-3">
          <span className={`text-lg md:text-xl font-black tracking-tight ${colorClass}`}>{value}</span>
          {subValue && <span className="text-[10px] md:text-xs text-zinc-700 dark:text-zinc-400 font-bold uppercase tracking-widest">{subValue}</span>}
        </div>
      </div>
    </div>
  );
}

export default function SymbolAudit() {
  const { user, loading: authLoading } = useAuth();

  // 1. INSTANT HYDRATION
  const [stats, setStats] = useState<any[]>(() => {
    if (typeof window !== 'undefined') {
      const cached = localStorage.getItem('audit_stats_cache');
      return cached ? JSON.parse(cached) : [];
    }
    return [];
  });

  const [loading, setLoading] = useState(() => {
    if (typeof window !== 'undefined') {
      return !localStorage.getItem('audit_stats_cache');
    }
    return true;
  });

  const [search, setSearch] = useState('');
  const [assetClass, setAssetClass] = useState('ALL');
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' }>({
    key: 'totalRR',
    direction: 'desc'
  });

  const handleSort = (key: string) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc'
    }));
  };



  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const fetchPerformance = async () => {
      try {
        // 1. Fetch ALL completed signals directly to include PUBLIC signals
        const { data, error } = await supabase
          .from('signals')
          .select('symbol, status, entry_price, sl, tp, tp_secondary')
          .eq('is_active', false);

        if (data) {
          // 2. Aggregate manually by symbol
          const symbolMap: { [key: string]: any } = {};

          data.forEach(s => {
            const sym = s.symbol.toUpperCase();
            if (!symbolMap[sym]) {
              symbolMap[sym] = {
                symbol: sym,
                total_trades: 0,
                wins: 0,
                losses: 0,
                be: 0,
                total_rr: 0
              };
            }

            const stats = symbolMap[sym];
            stats.total_trades++;

            const entry = Number(s.entry_price || 0);
            const sl = Number(s.sl || 0);
            const risk = Math.abs(entry - sl);
            if (!risk) return;

            const status = s.status?.toUpperCase();
            if (status === 'TP2' || status === 'WIN') {
              stats.wins++;
              stats.total_rr += Math.abs(Number(s.tp_secondary || s.tp || 0) - entry) / risk;
            } else if (status === 'TP1' || status === 'TP1 + SL (BE)') {
              stats.wins++; // Treat partial as win for audit
              stats.total_rr += Math.abs(Number(s.tp || 0) - entry) / risk;
            } else if (status === 'SL' || status === 'LOSS') {
              stats.losses++;
              stats.total_rr -= 1;
            } else {
              stats.be++;
            }
          });

          const formatted = Object.values(symbolMap).map((item: any) => ({
            symbol: item.symbol,
            trades: item.total_trades,
            wins: item.wins,
            losses: item.losses,
            be: item.be,
            winRate: item.total_trades > 0 ? Number(((item.wins / item.total_trades) * 100).toFixed(1)) : 0,
            totalRR: Number(item.total_rr.toFixed(1))
          }));

          setStats(formatted);
          localStorage.setItem('audit_stats_cache', JSON.stringify(formatted));
        }
      } catch (err) {
        console.error("Audit Fetch Error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchPerformance();
  }, [user]);

  // 3. DYNAMIC FILTERING (Optimized with useMemo)
  const filteredStats = useMemo(() => {
    const filtered = stats.filter(s => {
      const searchMatch = s.symbol.toUpperCase().includes(search.toUpperCase());
      const assetMatch = assetClass === 'ALL' || getSymbolCategory(s.symbol) === assetClass;
      return searchMatch && assetMatch;
    });

    return filtered.sort((a, b) => {
      const { key, direction } = sortConfig;
      let valA = a[key];
      let valB = b[key];

      if (valA < valB) return direction === 'asc' ? -1 : 1;
      if (valA > valB) return direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [stats, search, assetClass, sortConfig]);

  // Derived metrics for Top Cards
  const mostProfitable = useMemo(() => [...filteredStats].sort((a, b) => b.totalRR - a.totalRR)[0], [filteredStats]);
  const highestWinRate = useMemo(() => [...filteredStats].filter(s => s.trades >= 2).sort((a, b) => b.winRate - a.winRate)[0], [filteredStats]);
  const mostTraded = useMemo(() => [...filteredStats].sort((a, b) => b.trades - a.trades)[0], [filteredStats]);

  const filteredGlobalData = useMemo(() => {
    let gWins = 0;
    let gTotal = 0;
    filteredStats.forEach(s => {
      gWins += Number(s.wins || 0);
      gTotal += Number(s.trades || (s.wins + s.losses + s.be) || 0);
    });
    return {
      winRate: gTotal > 0 ? Number(((gWins / gTotal) * 100).toFixed(1)) : 0,
      total: gTotal
    };
  }, [filteredStats]);

  // ... (Rest of your JSX layout stays the same) ...
  if (authLoading || (loading && stats.length === 0)) {
    return (
      <div className="min-h-screen flex items-center justify-center ">
        <div className="flex flex-col items-center justify-center py-20 animate-pulse">
          <Activity size={40} className="text-zinc-700 mb-4" />
          <p className="text-xs font-black uppercase tracking-widest text-zinc-600">Aggregating Global Audit...</p>
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
          <div className="flex flex-col xl:flex-row justify-between items-start xl:items-end gap-6 mb-6">
            <div>
              <h1 className="text-2xl md:text-4xl font-black tracking-tighter italic flex items-center gap-3 uppercase text-zinc-900 dark:text-white">
                Symbol<span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-500">Audit</span>
              </h1>
              <p className="text-[10px] uppercase tracking-[0.4em] text-zinc-600 dark:text-zinc-500 font-bold mt-3 leading-none">
                • INSTITUTIONAL PERFORMANCE BREAKDOWN BY PAIR •
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
                    <option value="ALL" className="">ALL ASSETS</option>
                    <option value="CRYPTO" className="">CRYPTO</option>
                    <option value="FOREX" className="">FOREX</option>
                    <option value="INDICES" className="">INDICES</option>
                    <option value="METALS" className="">METALS</option>
                  </select>
                </div>
              </div>

              <div className="relative flex-grow md:w-64 self-end h-[42px] mb-0.5">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600 dark:text-zinc-500" size={16} />
                <input
                  type="text" placeholder="Search symbol..."
                  className="w-full h-full pl-12 pr-4 bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-xl text-xs font-mono text-zinc-900 dark:text-white focus:border-blue-500/50 hover:border-white/20 outline-none transition-all"
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6 md:gap-8">
            <AnalysisCard
              title="Most Profitable"
              symbol={mostProfitable?.symbol || "---"}
              value={mostProfitable ? `+${mostProfitable.totalRR.toFixed(2)}R` : "0.00R"}
              colorClass="text-emerald-400" icon={Wallet}
            />
            <AnalysisCard
              title="Highest Win Rate"
              symbol={highestWinRate?.symbol || "---"}
              value={highestWinRate ? `${highestWinRate.winRate}%` : "0%"}
              subValue={highestWinRate ? `(${highestWinRate.wins}W - ${highestWinRate.losses}L)` : ""}
              colorClass="text-blue-400" icon={Target}
            />
            <AnalysisCard
              title="Most Traded"
              symbol={mostTraded?.symbol || "---"}
              value={mostTraded ? `${mostTraded.trades} Executions` : "0 Executions"}
              colorClass="text-indigo-400" icon={BarChart3}
            />
            <AnalysisCard
              title="Filtered Win Rate"
              symbol={`${filteredGlobalData.winRate}%`}
              value={`Across ${filteredGlobalData.total} Trades`}
              colorClass="text-amber-400" icon={Activity}
            />
          </div>

          <div className="bg-gradient-to-br from-white/[0.04] to-white/[0.01] border border-[var(--glass-border)] rounded-2xl md:rounded-[2.5rem] overflow-hidden flex-grow shadow-2xl backdrop-blur-md">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[800px]">
                <thead>
                  <tr className="text-[10px] font-black text-zinc-600 dark:text-zinc-500 uppercase tracking-widest bg-[var(--glass-bg)] border-b border-[var(--glass-border)]">
                    <th className="px-6 md:px-8 py-6 cursor-pointer hover:text-blue-400 transition-colors" onClick={() => handleSort('symbol')}>
                      <div className="flex items-center gap-1">
                        Symbol
                        {sortConfig.key === 'symbol' && (sortConfig.direction === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}
                      </div>
                    </th>
                    <th className="px-4 py-6 cursor-pointer hover:text-blue-400 transition-colors" onClick={() => handleSort('trades')}>
                      <div className="flex items-center gap-1">
                        Trades
                        {sortConfig.key === 'trades' && (sortConfig.direction === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}
                      </div>
                    </th>
                    <th className="px-4 py-6 cursor-pointer hover:text-blue-400 transition-colors" onClick={() => handleSort('wins')}>
                      <div className="flex items-center gap-1">
                        Wins
                        {sortConfig.key === 'wins' && (sortConfig.direction === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}
                      </div>
                    </th>
                    <th className="px-4 py-6 cursor-pointer hover:text-blue-400 transition-colors" onClick={() => handleSort('losses')}>
                      <div className="flex items-center gap-1">
                        Losses
                        {sortConfig.key === 'losses' && (sortConfig.direction === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}
                      </div>
                    </th>
                    <th className="px-4 py-6 cursor-pointer hover:text-blue-400 transition-colors" onClick={() => handleSort('be')}>
                      <div className="flex items-center gap-1">
                        BE
                        {sortConfig.key === 'be' && (sortConfig.direction === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}
                      </div>
                    </th>
                    <th className="px-4 py-6 cursor-pointer hover:text-blue-400 transition-colors" onClick={() => handleSort('winRate')}>
                      <div className="flex items-center gap-1">
                        Win Rate
                        {sortConfig.key === 'winRate' && (sortConfig.direction === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}
                      </div>
                    </th>
                    <th className="px-4 py-6 cursor-pointer hover:text-blue-400 transition-colors" onClick={() => handleSort('totalRR')}>
                      <div className="flex items-center gap-1">
                        Net R:R
                        {sortConfig.key === 'totalRR' && (sortConfig.direction === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.05]">
                  {filteredStats.length > 0 ? (
                    filteredStats.map((item) => (
                      <tr key={item.symbol} className="hover:bg-[var(--glass-bg)] transition-colors group">
                        <td className="px-6 md:px-8 py-6">
                          <span className="text-base font-black text-zinc-900 dark:text-white uppercase tracking-tighter italic drop-shadow-sm">{item.symbol}</span>
                        </td>
                        <td className="px-4 py-6 text-[13px] font-mono font-bold text-zinc-700 dark:text-zinc-400">{item.trades}</td>
                        <td className="px-4 py-6 text-[13px] font-mono font-black text-emerald-400/80">{item.wins}</td>
                        <td className="px-4 py-6 text-[13px] font-mono font-black text-red-400/80">{item.losses}</td>
                        <td className="px-4 py-6 text-[13px] font-mono font-bold text-zinc-600 dark:text-zinc-500">{item.be}</td>
                        <td className="px-4 py-6 text-[13px] font-mono font-black text-blue-400">{item.winRate}%</td>
                        <td className={`px-4 py-6 text-[14px] font-mono font-black ${item.totalRR >= 0 ? 'text-emerald-400 drop-shadow-[0_0_5px_rgba(52,211,153,0.5)]' : 'text-red-400 drop-shadow-[0_0_5px_rgba(239,68,68,0.5)]'}`}>
                          {item.totalRR >= 0 ? `+${item.totalRR.toFixed(2)}R` : `${item.totalRR.toFixed(2)}R`}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="py-32 text-center">
                        <div className="flex flex-col items-center justify-center">
                          <AlertCircle size={40} className="text-zinc-700 mb-4" />
                          <h3 className="text-xl font-black italic tracking-tighter uppercase text-zinc-900 dark:text-white mb-2">No Audit Data Found</h3>
                          <p className="text-xs font-bold text-zinc-600 uppercase tracking-widest">Adjust asset class or search term.</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </AccessGuard>
  );
}
