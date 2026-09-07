"use client";

import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/hooks/useAuth';
import AccessGuard from '@/components/AccessGuard';
import CustomSelect from '@/components/CustomSelect';
import { Search, Activity, Zap, TrendingUp, Layers, Target, Wallet, BarChart3, AlertCircle, ChevronUp, ChevronDown, Calendar, FileSpreadsheet } from 'lucide-react';
import { normalizeSymbol, getSymbolCategory } from '@/lib/symbol-mapper';
import SymbolMultiSelect from '@/components/SymbolMultiSelect';
import GradeMultiSelect from '@/components/GradeMultiSelect';
import { exportToCSV } from '@/lib/csv-exporter';

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
  const [cachedStats] = useState<any[]>(() => {
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
  const [tfAlignment, setTfAlignment] = useState('ALL');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' }>({
    key: 'totalRR',
    direction: 'desc'
  });

  // Symbol multi-select filter states
  const [selectedSymbols, setSelectedSymbols] = useState<string[]>([]);
  // Grade multi-select filter states
  const [selectedGrades, setSelectedGrades] = useState<string[]>([]);

  const [rawSignals, setRawSignals] = useState<any[]>([]);

  // Dynamically extract unique symbols from the raw signals or cached stats
  const uniqueSymbols = useMemo(() => {
    const source = rawSignals.length > 0 ? rawSignals : [];
    if (source.length > 0) {
      return Array.from(new Set(source.map((s: any) => s.symbol.toUpperCase()))).sort();
    }
    return Array.from(new Set(cachedStats.map((s: any) => s.symbol.toUpperCase()))).sort();
  }, [rawSignals, cachedStats]);

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
        let query = supabase
          .from('signals')
          .select('symbol, status, entry_price, sl, tp, tp_secondary, grade')
          .eq('is_active', false);

        if (tfAlignment !== 'ALL') {
          query = query.eq('tf_alignment', tfAlignment);
        }

        if (dateFrom) {
          query = query.gte('created_at', new Date(dateFrom).toISOString());
        }

        if (dateTo) {
          const toDate = new Date(dateTo);
          toDate.setHours(23, 59, 59, 999);
          query = query.lte('created_at', toDate.toISOString());
        }

        const { data, error } = await query;

        if (data) {
          setRawSignals(data);
        }
      } catch (err) {
        console.error("Audit Fetch Error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchPerformance();
  }, [user, tfAlignment, dateFrom, dateTo]);

  // Aggregate signals into performance stats by symbol, applying filters dynamically
  const stats = useMemo(() => {
    if (loading && rawSignals.length === 0) {
      return cachedStats;
    }

    const symbolMap: { [key: string]: any } = {};

    rawSignals.forEach(s => {
      const rawGrade = (s.grade || 'A+').toUpperCase().trim();
      const cleanGrade = rawGrade.includes('A++') ? 'A++' : rawGrade.includes('A+') ? 'A+' : rawGrade.includes('GOOD') ? 'GOOD' : 'NORMAL';

      // Apply grade checklist filtering
      if (selectedGrades.length > 0 && !selectedGrades.includes(cleanGrade)) {
        return;
      }

      const sym = s.symbol.toUpperCase();
      if (!symbolMap[sym]) {
        symbolMap[sym] = {
          symbol: sym,
          total_trades: 0,
          wins: 0,
          losses: 0,
          be: 0,
          total_rr: 0,
          gradeCounts: {
            'A++': 0,
            'A+': 0,
            'GOOD': 0,
            'NORMAL': 0
          }
        };
      }

      const statsObj = symbolMap[sym];
      statsObj.total_trades++;
      statsObj.gradeCounts[cleanGrade]++;

      const entry = Number(s.entry_price || 0);
      const sl = Number(s.sl || 0);
      const risk = Math.abs(entry - sl);
      if (!risk) return;

      const status = s.status?.toUpperCase();
      if (status === 'TP2' || status === 'WIN') {
        statsObj.wins++;
        statsObj.total_rr += Math.abs(Number(s.tp_secondary || s.tp || 0) - entry) / risk;
      } else if (status === 'TP1' || status === 'TP1 + SL (BE)') {
        statsObj.wins++;
        statsObj.total_rr += Math.abs(Number(s.tp || 0) - entry) / risk;
      } else if (status === 'SL' || status === 'LOSS') {
        statsObj.losses++;
        statsObj.total_rr -= 1;
      } else {
        statsObj.be++;
      }
    });

    return Object.values(symbolMap).map((item: any) => {
      const gCounts = item.gradeCounts;
      const gradeWeight = (gCounts['A++'] * 4) + (gCounts['A+'] * 3) + (gCounts['GOOD'] * 2) + (gCounts['NORMAL'] * 1);
      return {
        symbol: item.symbol,
        trades: item.total_trades,
        wins: item.wins,
        losses: item.losses,
        be: item.be,
        winRate: item.total_trades > 0 ? Number(((item.wins / item.total_trades) * 100).toFixed(1)) : 0,
        gradeCounts: gCounts,
        gradeWeight: gradeWeight,
        totalRR: Number(item.total_rr.toFixed(1))
      };
    });
  }, [rawSignals, selectedGrades, cachedStats, loading]);

  // Update cached stats for instant hydration on subsequent loads (only cache full stats)
  useEffect(() => {
    if (rawSignals.length > 0 && selectedGrades.length === 0) {
      localStorage.setItem('audit_stats_cache', JSON.stringify(stats));
    }
  }, [rawSignals, selectedGrades, stats]);

  // 3. DYNAMIC FILTERING (Optimized with useMemo)
  const filteredStats = useMemo(() => {
    const filtered = stats.filter(s => {
      const searchMatch = s.symbol.toUpperCase().includes(search.toUpperCase());
      const assetMatch = assetClass === 'ALL' || getSymbolCategory(s.symbol) === assetClass;
      const symbolMatch = selectedSymbols.length === 0 || selectedSymbols.includes(s.symbol.toUpperCase());
      return searchMatch && assetMatch && symbolMatch;
    });

    return filtered.sort((a, b) => {
      const { key, direction } = sortConfig;
      const sortKey = key === 'grade' ? 'gradeWeight' : key;
      let valA = a[sortKey];
      let valB = b[sortKey];

      if (valA < valB) return direction === 'asc' ? -1 : 1;
      if (valA > valB) return direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [stats, search, assetClass, selectedSymbols, sortConfig]);

  const handleDownloadCSV = () => {
    const headers = [
      { key: 'symbol', label: 'Symbol' },
      { key: 'trades', label: 'Total Executions' },
      { key: 'wins', label: 'Wins' },
      { key: 'losses', label: 'Losses' },
      { key: 'be', label: 'Breakeven (BE)' },
      { key: 'winRate', label: 'Win Rate %' },
      { key: 'gradesFormatted', label: 'Setup Grades' },
      { key: 'totalRR', label: 'Net Realized R:R' }
    ];
    
    const statsWithFormattedGrades = filteredStats.map(s => ({
      ...s,
      gradesFormatted: `A++: ${s.gradeCounts?.['A++'] || 0} | A+: ${s.gradeCounts?.['A+'] || 0} | Good: ${s.gradeCounts?.['GOOD'] || 0} | Normal: ${s.gradeCounts?.['NORMAL'] || 0}`
    }));
    
    exportToCSV(statsWithFormattedGrades, headers, "Symbol_Audit_Analytics_Report");
  };

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
      <div className="w-full relative z-10 space-y-6 md:space-y-8 text-zinc-900 dark:text-white font-sans selection:bg-orange-500">
          {/* Header Section */}
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-2xl md:text-4xl font-black tracking-tighter italic flex items-center gap-3 uppercase text-zinc-900 dark:text-white">
                Symbol<span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-500">Audit</span>
              </h1>
              <p className="text-[10px] uppercase tracking-[0.4em] text-zinc-650 dark:text-zinc-400 font-bold mt-3 leading-none">
                • INSTITUTIONAL PERFORMANCE BREAKDOWN BY PAIR •
              </p>
            </div>
          </div>          {/* Filters Bar */}
          <div className="glass-panel p-4 md:p-5 w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 items-end shadow-lg">
            <div className="flex flex-col gap-1.5 w-full">
              <span className="text-[10px] font-bold text-zinc-555 dark:text-zinc-400 uppercase tracking-wider ml-1">From Date</span>
              <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="input-modern h-[42px] px-4 text-xs font-semibold text-foreground bg-[var(--input-bg)] border border-[var(--input-border)] outline-none w-full cursor-pointer" />
            </div>
            <div className="flex flex-col gap-1.5 w-full">
              <span className="text-[10px] font-bold text-zinc-555 dark:text-zinc-400 uppercase tracking-wider ml-1">To Date</span>
              <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="input-modern h-[42px] px-4 text-xs font-semibold text-foreground bg-[var(--input-bg)] border border-[var(--input-border)] outline-none w-full cursor-pointer" />
            </div>

            <CustomSelect
              label="Asset Class"
              icon={<Layers size={14} />}
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
              icon={<Activity size={14} />}
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

            <div className="w-full flex flex-col gap-1.5">
              <GradeMultiSelect selectedGrades={selectedGrades} onChange={setSelectedGrades} />
            </div>

            <div className="flex flex-col gap-1.5 w-full sm:col-span-2 lg:col-span-3 xl:col-span-2">
              <span className="text-[10px] font-bold text-zinc-555 dark:text-zinc-400 uppercase tracking-wider ml-1">Search & Export</span>
              <div className="flex gap-2 w-full h-[42px]">
                <div className="relative flex-grow h-full">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={14} />
                  <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search symbol..." className="w-full h-full pl-9 pr-3 input-modern text-xs font-semibold text-foreground bg-[var(--input-bg)] border border-[var(--input-border)] outline-none" />
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
                    <th className="px-4 py-6 cursor-pointer hover:text-blue-400 transition-colors" onClick={() => handleSort('grade')}>
                      <div className="flex items-center gap-1">
                        Grading
                        {sortConfig.key === 'grade' && (sortConfig.direction === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}
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
                        <td className="px-4 py-6">
                          <div className="flex flex-wrap gap-1.5 text-[10px] font-mono font-black select-none">
                            <span className="text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/10">A++: {item.gradeCounts?.['A++'] || 0}</span>
                            <span className="text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded border border-blue-500/10">A+: {item.gradeCounts?.['A+'] || 0}</span>
                            <span className="text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/10">Good: {item.gradeCounts?.['GOOD'] || 0}</span>
                            <span className="text-zinc-400 bg-zinc-500/10 px-1.5 py-0.5 rounded border border-zinc-500/10">Normal: {item.gradeCounts?.['NORMAL'] || 0}</span>
                          </div>
                        </td>
                        <td className={`px-4 py-6 text-[14px] font-mono font-black ${item.totalRR >= 0 ? 'text-emerald-400 drop-shadow-[0_0_5px_rgba(52,211,153,0.5)]' : 'text-red-400 drop-shadow-[0_0_5px_rgba(239,68,68,0.5)]'}`}>
                          {item.totalRR >= 0 ? `+${item.totalRR.toFixed(2)}R` : `${item.totalRR.toFixed(2)}R`}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={8} className="py-32 text-center">
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
    </AccessGuard>
  );
}
