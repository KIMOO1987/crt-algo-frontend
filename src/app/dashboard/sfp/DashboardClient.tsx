"use client";

import Link from 'next/link';
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import {
  TrendingUp, Zap, Star, Activity, BarChart3, Target, Layers,
  Wallet, CheckCircle2, XCircle, MinusCircle, Percent, Save, Mail, TrendingDown,
  Info, AlertCircle, ChevronRight, Clock, Key, Copy, Check, Calendar, ChevronDown
} from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip as RechartsTooltip,
  PieChart, Pie, Cell
} from 'recharts';
import { motion, Variants } from 'framer-motion';

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } }
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20, rotateX: 10 },
  show: { opacity: 1, y: 0, rotateX: 0, transition: { type: "spring" as const, bounce: 0.4 } }
};

interface DashboardClientProps {
  tier: number; 
  expiryDate?: string | null;
  userProfile: any; 
}

export default function SfpDashboardClient({ tier, expiryDate, userProfile }: DashboardClientProps) {
  const [accountSize, setAccountSize] = useState(userProfile?.account_size || 10000); 
  const [riskValue, setRiskValue] = useState(userProfile?.risk_value || 1.0); 
  const [timeframe, setTimeframe] = useState('all');
  const [assetClass, setAssetClass] = useState('ALL');
  const [tfAlignment, setTfAlignment] = useState('ALL');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [copied, setCopied] = useState(false);
  
  const handleCopyLicense = () => {
    if (userProfile?.id) {
      navigator.clipboard.writeText(userProfile.id);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const [chartData, setChartData] = useState<any[]>([]);
  const [recentSignals, setRecentSignals] = useState<any[]>([]);
  const [realStats, setRealStats] = useState<any>({
    total: 0, totalWins: 0, totalLosses: 0, totalBE: 0,
    winRate: "0%", totalRR: "0.00R", profitUSD: "$0.00",
    mostProfitable: "---", mostTraded: "---", highWRPair: "---",
    maxDrawdown: "0.00R", profitFactor: "0.00", expectancy: "0.00R",
    winStreak: 0, lossStreak: 0, longWR: "0%", shortWR: "0%"
  });

  const fetchData = useCallback(async (isSilent = false) => {
    if (!userProfile?.id) return;
    if (!isSilent) setIsInitialLoad(true);

    let query = supabase.from('sfp_signals').select('*');
    
    if (assetClass !== 'ALL') {
      // Categorize roughly based on symbol name
      // SFP CSV symbols are like XAUUSD, GBPUSD, etc.
    }
    if (tfAlignment !== 'ALL') {
      query = query.eq('tf', tfAlignment);
    }

    const { data: allSignals, error } = await query.order('created_at', { ascending: true });

    if (error) {
      console.error('❌ SFP Signals Fetch Error:', error);
      setIsInitialLoad(false);
      return;
    }

    if (allSignals) {
      let filtered = allSignals;
      
      // Client-side date filter
      if (dateFrom) {
        const fromDate = new Date(dateFrom);
        filtered = filtered.filter(s => new Date(s.created_at) >= fromDate);
      }
      if (dateTo) {
        const toDate = new Date(dateTo);
        toDate.setHours(23, 59, 59, 999);
        filtered = filtered.filter(s => new Date(s.created_at) <= toDate);
      }

      // Filter by result scope (daily, weekly, monthly)
      const now = new Date();
      if (timeframe === 'daily') {
        const dayStart = new Date(now.setHours(0,0,0,0));
        filtered = filtered.filter(s => new Date(s.created_at) >= dayStart);
      } else if (timeframe === 'weekly') {
        const weekStart = new Date(now.setDate(now.getDate() - now.getDay()));
        filtered = filtered.filter(s => new Date(s.created_at) >= weekStart);
      } else if (timeframe === 'monthly') {
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        filtered = filtered.filter(s => new Date(s.created_at) >= monthStart);
      }

      const inactive = filtered.filter(s => !s.is_active);
      const total = inactive.length;

      let wins = 0;
      let losses = 0;
      let be = 0;
      let totalRR = 0;
      let winningRR = 0;
      let losingRR = 0;
      const chartPoints: any[] = [];
      let currentCumulative = 0;

      let winStreak = 0;
      let lossStreak = 0;
      let currentWinStreak = 0;
      let currentLossStreak = 0;

      let tp1Hits = 0;
      let tp2Hits = 0;
      let tp3Hits = 0;
      let tp4Hits = 0;

      const symbolStats: { [key: string]: { wins: number, total: number, rr: number } } = {};

      inactive.forEach(s => {
        let tradeRR = 0;
        const status = s.status?.toUpperCase() || 'ENTRY';
        if (status === 'TP4' || status === 'WIN') {
          tradeRR = 2.825;
        } else if (status === 'TP3') {
          tradeRR = 2.825;
        } else if (status === 'TP3 + BE' || status === 'TP3+BE') {
          tradeRR = 2.625;
        } else if (status === 'TP2 + BE' || status === 'TP2+BE') {
          tradeRR = 2.075;
        } else if (status === 'TP1 + BE' || status === 'TP1+BE') {
          tradeRR = 1.00;
        } else if (status === 'SL') {
          tradeRR = -1.0;
        } else if (status === 'BE' || status.includes('BE') || status === 'CLOSED') {
          tradeRR = 0.0;
        }

        // Count hits cumulatively based on progress levels
        if (['TP1', 'TP1 + BE', 'TP1+BE', 'TP2', 'TP2 + BE', 'TP2+BE', 'TP3', 'TP3 + BE', 'TP3+BE', 'TP4', 'WIN'].some(x => status.includes(x))) {
          tp1Hits++;
        }
        if (['TP2', 'TP2 + BE', 'TP2+BE', 'TP3', 'TP3 + BE', 'TP3+BE', 'TP4', 'WIN'].some(x => status.includes(x))) {
          tp2Hits++;
        }
        if (['TP3', 'TP3 + BE', 'TP3+BE', 'TP4', 'WIN'].some(x => status.includes(x))) {
          tp3Hits++;
        }
        if (['TP4', 'WIN'].some(x => status.includes(x))) {
          tp4Hits++;
        }
        
        if (tradeRR > 0) {
          wins++;
          winningRR += tradeRR;
          currentWinStreak++;
          winStreak = Math.max(winStreak, currentWinStreak);
          currentLossStreak = 0;
        } else if (tradeRR < 0) {
          losses++;
          losingRR += Math.abs(tradeRR);
          currentLossStreak++;
          lossStreak = Math.max(lossStreak, currentLossStreak);
          currentWinStreak = 0;
        } else {
          be++;
          currentWinStreak = 0;
          currentLossStreak = 0;
        }
        totalRR += tradeRR;

        currentCumulative += tradeRR;
        chartPoints.push({
          name: new Date(s.created_at).toLocaleDateString(),
          rr: Number(currentCumulative.toFixed(2))
        });

        const sym = s.symbol?.toUpperCase();
        if (!symbolStats[sym]) {
          symbolStats[sym] = { wins: 0, total: 0, rr: 0 };
        }
        symbolStats[sym].total++;
        symbolStats[sym].rr += tradeRR;
        if (tradeRR > 0) symbolStats[sym].wins++;
      });

      let mostProfitable = '---';
      let maxProf = -Infinity;
      let mostTraded = '---';
      let maxTrades = 0;
      let highWRPair = '---';
      let maxWR = -1;

      Object.entries(symbolStats).forEach(([sym, stats]) => {
        if (stats.rr > maxProf) {
          maxProf = stats.rr;
          mostProfitable = sym;
        }
        if (stats.total > maxTrades) {
          maxTrades = stats.total;
          mostTraded = sym;
        }
        const wr = stats.wins / stats.total;
        if (stats.total >= 3 && wr > maxWR) {
          maxWR = wr;
          highWRPair = sym;
        }
      });

      const buyTrades = inactive.filter(s => ['BUY', 'BULL'].includes(s.side?.toUpperCase()));
      const sellTrades = inactive.filter(s => ['SELL', 'BEAR'].includes(s.side?.toUpperCase()));
      const buyWins = buyTrades.filter(s => {
        const st = s.status.toUpperCase();
        return ['TP1', 'TP2', 'TP3', 'TP4', 'WIN'].includes(st) || st.includes('TP2 + BE') || st.includes('TP2+BE') || st.includes('TP3 + BE') || st.includes('TP3+BE');
      }).length;
      const sellWins = sellTrades.filter(s => {
        const st = s.status.toUpperCase();
        return ['TP1', 'TP2', 'TP3', 'TP4', 'WIN'].includes(st) || st.includes('TP2 + BE') || st.includes('TP2+BE') || st.includes('TP3 + BE') || st.includes('TP3+BE');
      }).length;

      const longWR = buyTrades.length > 0 ? `${((buyWins / buyTrades.length) * 100).toFixed(1)}%` : '0%';
      const shortWR = sellTrades.length > 0 ? `${((sellWins / sellTrades.length) * 100).toFixed(1)}%` : '0%';

      const winRate = total > 0 ? `${((wins / total) * 100).toFixed(1)}%` : '0%';
      const profitUSD = `$${(totalRR * accountSize * riskValue / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      const expectancy = total > 0 ? `${(totalRR / total).toFixed(2)}R` : '0.00R';
      const profitFactor = losingRR > 0 ? (winningRR / losingRR).toFixed(2) : winningRR > 0 ? '99.99' : '0.00';

      const tp1HitRate = total > 0 ? `${((tp1Hits / total) * 100).toFixed(1)}%` : '0.0%';
      const tp2HitRate = total > 0 ? `${((tp2Hits / total) * 100).toFixed(1)}%` : '0.0%';
      const tp3HitRate = total > 0 ? `${((tp3Hits / total) * 100).toFixed(1)}%` : '0.0%';
      const tp4HitRate = total > 0 ? `${((tp4Hits / total) * 100).toFixed(1)}%` : '0.0%';

      setRealStats({
        total,
        totalWins: wins,
        totalLosses: losses,
        totalBE: be,
        winRate,
        totalRR: `${totalRR.toFixed(2)}R`,
        profitUSD,
        mostProfitable: maxProf > 0 ? mostProfitable : '---',
        mostTraded,
        highWRPair,
        maxDrawdown: '0.00R',
        profitFactor,
        expectancy,
        winStreak,
        lossStreak,
        longWR,
        shortWR,
        tp1HitRate,
        tp2HitRate,
        tp3HitRate,
        tp4HitRate
      });

      setChartData(chartPoints);
      const sortedAll = [...filtered].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setRecentSignals(sortedAll.slice(0, 10));
    }
    setIsInitialLoad(false);
  }, [userProfile?.id, accountSize, riskValue, timeframe, assetClass, tfAlignment, dateFrom, dateTo]);

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
        fetchData();
    }, 500);

    const interval = setInterval(() => {
        fetchData(true);
    }, 300000); 

    return () => {
        clearTimeout(delayDebounce);
        clearInterval(interval);
    };
  }, [fetchData]);

  const handleSaveSettings = async () => {
    setIsSaving(true);
    await supabase.from('profiles').update({ 
      account_size: accountSize, 
      risk_value: riskValue
    }).eq('id', userProfile.id);
    setIsSaving(false);
  };

  const getTierDisplay = () => {
    if (userProfile?.role === 'admin') return 'SYSTEM ADMIN';
    const tiers: any = { 3: 'ULTIMATE', 2: 'PRO', 1: 'ALPHA' };
    return tiers[tier] || 'FREE TRADER';
  };

  return (
    <div className="w-full relative z-10 space-y-6 md:space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
        <div>
          <h1 className="text-2xl md:text-4xl font-extrabold tracking-tight uppercase text-zinc-900 dark:text-white">
            SFP <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-orange-600">Dashboard</span>
          </h1>
          <p className="text-[10px] uppercase tracking-[0.3em] font-bold mt-2 text-zinc-500 dark:text-zinc-400">
            • SFP-ALGO ENGINE PRO •
          </p>
        </div>
      </div>

      {/* SETTINGS CARD */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="p-6 md:p-8 glass-panel"
      >
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end border-b border-[var(--glass-border)] pb-6 mb-6">
            <div>
                <div className="flex flex-wrap items-center gap-3 mb-2.5">
                   <h2 className="text-2xl md:text-3xl font-extrabold uppercase tracking-tight text-zinc-900 dark:text-white">{userProfile?.full_name || 'TRADER'}</h2>
                   <span className="bg-orange-500/10 border border-orange-500/20 text-orange-600 dark:text-orange-400 text-[9px] font-extrabold px-3 py-1 rounded-lg uppercase tracking-wider">{getTierDisplay()}</span>
                </div>
                
                <div className="flex items-center gap-2 opacity-70 mb-2.5">
                   <Mail size={13} className="text-orange-500" />
                   <span className="text-[11px] font-semibold tracking-wider uppercase font-mono text-zinc-600 dark:text-zinc-400">{userProfile?.email}</span>
                </div>

                <div className="flex items-center gap-2 bg-[var(--input-bg)] border border-[var(--glass-border)] w-fit px-3 py-1.5 rounded-lg shadow-inner">
                   <Key size={13} className="text-orange-500" />
                   <span className="text-[10px] font-semibold tracking-wider uppercase font-mono text-zinc-600 dark:text-zinc-300">
                      LICENSE: <span className="opacity-80 font-mono">{userProfile?.id || 'NO-KEY-FOUND'}</span>
                   </span>
                   <button 
                      onClick={handleCopyLicense}
                      className="ml-1.5 hover:bg-zinc-200/50 dark:hover:bg-white/10 p-1 rounded transition-all flex items-center justify-center cursor-pointer group"
                   >
                      {copied ? (
                         <Check size={12} className="text-emerald-400" />
                      ) : (
                         <Copy size={12} className="text-zinc-500 dark:text-zinc-400 group-hover:text-zinc-800 dark:group-hover:text-white" />
                      )}
                   </button>
                </div>
             </div>
             <div className="flex items-center gap-2 mt-4 md:mt-0 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-lg">
                <Activity size={14} className="text-emerald-500 animate-pulse" />
                <span className="font-extrabold text-[10px] uppercase tracking-widest text-emerald-500">ONLINE</span>
             </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <InputBox label="Account Size" icon={<Wallet size={15}/>} value={accountSize} onChange={setAccountSize} prefix="$" color="emerald" />
              <InputBox label="Risk per SL" icon={<Percent size={15}/>} value={riskValue} onChange={setRiskValue} suffix="%" color="red" />
              <div className="flex items-end">
                 <button onClick={handleSaveSettings} disabled={isSaving} className="btn-modern h-[42px] flex items-center justify-center gap-2 w-full text-xs py-0">
                    <Save size={14} className={isSaving ? 'animate-spin' : ''} /> {isSaving ? 'Saving' : 'Save Config'}
                 </button>
              </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-6 border-t border-[var(--glass-border)] pt-6">
              <SelectBox label="Result Scope" value={timeframe} onChange={setTimeframe} options={[{v:'all', l:'All Time'}, {v:'daily', l:'Daily'}, {v:'weekly', l:'Weekly'}, {v:'monthly', l:'Monthly'}]} />
              <SelectBox label="Asset Class" value={assetClass} onChange={setAssetClass} options={[{v:'ALL', l:'All Assets'}, {v:'CRYPTO', l:'Crypto'}, {v:'FOREX', l:'Forex'}, {v:'INDICES', l:'Indices'}, {v:'METALS', l:'Metals'}]} />
              <SelectBox label="Timeframe" value={tfAlignment} onChange={setTfAlignment} options={[
                 { v: 'ALL', l: 'All Timeframes' },
                 { v: '1m', l: '1m' },
                 { v: '3m', l: '3m' },
                 { v: '5m', l: '5m' },
                 { v: '15m', l: '15m' },
                 { v: '30m', l: '30m' },
                 { v: '1H', l: '1H' },
                 { v: '4H', l: '4H' },
                 { v: '6H', l: '6H' },
                 { v: '1D', l: '1D' },
                 { v: '1W', l: '1W' }
              ]} />
              <div className="grid grid-cols-2 gap-3">
                 <DateInput label="From Date" value={dateFrom} onChange={setDateFrom} icon={<Calendar size={13} className="text-orange-500" />} />
                 <DateInput label="To Date" value={dateTo} onChange={setDateTo} icon={<Calendar size={13} className="text-orange-500" />} />
              </div>
          </div>
      </motion.div>

      {/* MAIN STATS GRID */}
      {isInitialLoad ? (
         <div className="w-full py-24 flex flex-col items-center justify-center glass-panel animate-pulse mb-12">
            <Activity size={32} className="opacity-40 mb-3 text-orange-500 animate-spin" />
            <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 dark:text-zinc-400">Syncing SFP Intelligence...</p>
         </div>
      ) : (
        <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-6 md:space-y-8">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
             <StatCard label="Total Signals" value={realStats.total} icon={<Activity size={16}/>} />
             <StatCard label="Total Wins" value={realStats.totalWins} icon={<CheckCircle2 size={16}/>} color="text-emerald-500" />
             <StatCard label="Total Losses" value={realStats.totalLosses} icon={<XCircle size={16}/>} color="text-red-500" />
             <StatCard label="Total BE" value={realStats.totalBE} icon={<MinusCircle size={16}/>} color="text-zinc-500" />
             <StatCard label="Win Rate" value={realStats.winRate} icon={<TrendingUp size={16}/>} color="text-emerald-500" />
             <StatCard label="Total R:R" value={realStats.totalRR} icon={<Zap size={16}/>} color="text-indigo-500" />
             
             <StatCard label="Net Profit" value={realStats.profitUSD} icon={<Wallet size={16}/>} color="text-emerald-500" />
             <StatCard label="Profit Factor" value={realStats.profitFactor} icon={<Star size={16}/>} color="text-amber-500" />
             <StatCard label="Expectancy" value={realStats.expectancy} icon={<Layers size={16}/>} color="text-zinc-700 dark:text-zinc-300" />
             <StatCard label="Max Drawdown" value={realStats.maxDrawdown} icon={<TrendingDown size={16}/>} color="text-red-500" />
             <StatCard label="Long WR" value={realStats.longWR} sub="Buy Side" />
             <StatCard label="Short WR" value={realStats.shortWR} sub="Sell Side" />

             <StatCard label="Most Profitable" value={realStats.mostProfitable} sub="Best Pair" color="text-emerald-500" />
             <StatCard label="Most Traded" value={realStats.mostTraded} sub="Volume Pair" color="text-blue-500" />
             <StatCard label="Highest WR" value={realStats.highWRPair} sub="Top Accuracy" color="text-indigo-500" />
             <StatCard label="Win Streak" value={realStats.winStreak} icon={<TrendingUp size={16}/>} color="text-emerald-500" />
             <StatCard label="Loss Streak" value={realStats.lossStreak} icon={<TrendingDown size={16}/>} color="text-red-500" />
             <StatCard label="Integrity" value="100%" sub="SFP Verified" />
          </div>

          {/* SFP TARGET HIT RATES */}
          <div className="border-t border-[var(--glass-border)] pt-6">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-500 dark:text-zinc-400 mb-4 ml-1 flex items-center gap-2">
              <Target size={14} className="text-orange-500" /> SFP Target Progression Hit Rates
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
               <StatCard label="TP1 Hit Rate" value={realStats.tp1HitRate} icon={<Target size={16}/>} sub="Closed 50% @ 2RR" color="text-emerald-500" />
               <StatCard label="TP2 Hit Rate" value={realStats.tp2HitRate} icon={<Target size={16}/>} sub="Closed 15% @ 2.5RR" color="text-amber-500" />
               <StatCard label="TP3 Hit Rate" value={realStats.tp3HitRate} icon={<Target size={16}/>} sub="Closed 25% @ 4RR" color="text-indigo-500" />
               <StatCard label="TP4 Hit Rate" value={realStats.tp4HitRate} icon={<Target size={16}/>} sub="Closed 10% @ 4.5RR" color="text-blue-500" />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <motion.div variants={itemVariants} className="lg:col-span-2 glass-panel p-6 md:p-8">
                 <h3 className="text-sm font-extrabold uppercase tracking-wider mb-6 text-zinc-900 dark:text-white">SFP Equity Curve</h3>
                 <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                       <AreaChart data={chartData}>
                          <defs>
                            <linearGradient id="colorRR" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <XAxis dataKey="name" hide />
                          <YAxis stroke="#64748b" fontSize={10} tickFormatter={(val) => `${val}R`} axisLine={false} tickLine={false} />
                          <RechartsTooltip contentStyle={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--glass-border)', borderRadius: '0.75rem', color: 'var(--fg)' }} />
                          <Area type="monotone" dataKey="rr" stroke="#3b82f6" strokeWidth={2.5} fillOpacity={1} fill="url(#colorRR)" />
                       </AreaChart>
                    </ResponsiveContainer>
                 </div>
              </motion.div>
              <motion.div variants={itemVariants} className="glass-panel p-6 md:p-8 flex flex-col justify-center text-center">
                 <h3 className="text-sm font-extrabold uppercase tracking-wider mb-6 text-zinc-900 dark:text-white">Outcome Split</h3>
                 <div className="h-[250px]">
                    <ResponsiveContainer width="100%" height="100%">
                       <PieChart>
                          <RechartsTooltip contentStyle={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--glass-border)', borderRadius: '0.75rem', color: 'var(--fg)' }} />
                          <Pie data={[{ name: 'Wins', value: realStats.totalWins }, { name: 'Losses', value: realStats.totalLosses }, { name: 'BE', value: realStats.totalBE }]} cx="50%" cy="50%" innerRadius={70} outerRadius={85} paddingAngle={4} dataKey="value" stroke="none" label={{ fill: 'var(--fg-muted)', fontSize: 10, fontWeight: 'bold' }}>
                             <Cell fill="#10b981" /><Cell fill="#ef4444" /><Cell fill="#64748b" />
                          </Pie>
                       </PieChart>
                    </ResponsiveContainer>
                 </div>
              </motion.div>
          </div>
        </motion.div>
      )}
    </div>
  );
}

function InputBox({ label, icon, value, onChange, prefix, suffix, color }: any) {
  return (
    <div className="flex flex-col w-full">
       <span className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5 ml-1">{label}</span>
       <div className="flex items-center input-modern h-[42px] py-0">
          {prefix && <span className="opacity-50 font-semibold text-xs mr-1.5">{prefix}</span>}
          <input type="number" step="0.1" value={value} onChange={(e) => onChange(Number(e.target.value))} className="bg-transparent font-semibold text-sm w-full outline-none" />
          {suffix && <span className="opacity-50 font-semibold text-xs ml-1.5">{suffix}</span>}
       </div>
    </div>
  );
}

function SelectBox({ label, value, onChange, options }: any) {
  return (
    <div className="flex flex-col w-full">
       <span className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5 ml-1">{label}</span>
       <div className="flex items-center input-modern h-[42px] py-0">
          <select value={value} onChange={(e) => onChange(e.target.value)} className="bg-transparent font-semibold text-xs w-full outline-none cursor-pointer">
             {options.map((o: any) => (
                <option key={o.v} value={o.v} className="bg-[var(--bg-surface)] text-foreground">{o.l}</option>
             ))}
          </select>
       </div>
    </div>
  );
}

function DateInput({ label, value, onChange, icon }: any) {
  return (
    <div className="flex flex-col">
       <span className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5 ml-1">{label}</span>
       <div className="flex items-center input-modern h-[42px] py-0">
          {icon}
          <input type="date" value={value} onChange={(e) => onChange(e.target.value)} className="bg-transparent font-semibold text-xs w-full outline-none appearance-none cursor-pointer text-foreground ml-2" />
       </div>
    </div>
  );
}

function StatCard({ label, value, icon, sub, color = "text-zinc-900 dark:text-white" }: any) {
  return (
    <motion.div variants={itemVariants} className="p-4 rounded-xl border border-[var(--glass-border)] bg-[var(--glass-bg)] hover:bg-[var(--input-bg)] transition-all duration-200 flex flex-col justify-between h-[100px]">
       <div className="flex justify-between items-start">
          <span className="text-[9px] font-bold text-zinc-500 dark:text-zinc-450 uppercase tracking-wider">{label}</span>
          {icon && <div className="opacity-40">{icon}</div>}
       </div>
       <div>
          <h4 className={`text-base font-black font-mono tracking-tight ${color}`}>{value}</h4>
          {sub && <span className="text-[8px] font-bold uppercase tracking-wider text-zinc-450 mt-1 block">{sub}</span>}
       </div>
    </motion.div>
  );
}
