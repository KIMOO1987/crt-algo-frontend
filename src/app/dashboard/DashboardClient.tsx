"use client";

import Link from 'next/link';
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import CustomSelect from '@/components/CustomSelect';
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

export default function DashboardClient({ tier, expiryDate, userProfile }: DashboardClientProps) {
  const [accountSize, setAccountSize] = useState(userProfile?.account_size || 10000); 
  const [riskValue, setRiskValue] = useState(userProfile?.risk_value || 1.0); 
  const [rewardValue, setRewardValue] = useState(userProfile?.reward_value || 2.0); 
  const [timeframe, setTimeframe] = useState('all');
  const [assetClass, setAssetClass] = useState('ALL');
  const [tfAlignment, setTfAlignment] = useState('ALL');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [copied, setCopied] = useState(false); // <-- NEW STATE
  
    // --- NEW COPY FUNCTION ---
    const handleCopyLicense = () => {
      if (userProfile?.id) {
        navigator.clipboard.writeText(userProfile.id);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000); // Reset after 2 seconds
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

    const { data, error } = await supabase.rpc('get_client_dashboard_data', {
      p_user_id: userProfile.id,
      p_account_size: accountSize,
      p_risk_percent: riskValue,
      p_reward_ratio: rewardValue,
      p_timeframe: timeframe,
      p_asset_class: assetClass,
      p_tf_alignment: tfAlignment,
      p_date_from: dateFrom ? new Date(dateFrom).toISOString() : null,
      p_date_to: dateTo ? new Date(new Date(dateTo).setHours(23, 59, 59, 999)).toISOString() : null
    });

    if (error) {
      console.error('❌ Dashboard RPC Error:', error);
      setIsInitialLoad(false);
      return;
    }

    if (data) {
      setRealStats(data);
      setChartData(data.chartData || []);
      setRecentSignals(data.recentSignals || []);
    }
    setIsInitialLoad(false);
  }, [userProfile?.id, accountSize, riskValue, rewardValue, timeframe, assetClass, tfAlignment, dateFrom, dateTo]);

  // --- EXACT LOCATION OF THE CODE YOU ASKED FOR ---
  useEffect(() => {
    // 1. Fetch immediately (with a small 500ms delay to wait for typing to finish)
    const delayDebounce = setTimeout(() => {
        fetchData();
    }, 500);

    // 2. Change 30000 (30s) to 300000 (5 mins) to stop resource exhaustion
    const interval = setInterval(() => {
        fetchData(true); // 'true' means silent refresh (no loading spinner)
    }, 300000); 

    // 3. Cleanup on unmount or setting change
    return () => {
        clearTimeout(delayDebounce);
        clearInterval(interval);
    };
  }, [fetchData]); // Re-runs when account size, risk, or timeframe changes
  // -----------------------------------------------

  const handleSaveSettings = async () => {
    setIsSaving(true);
    await supabase.from('profiles').update({ 
      account_size: accountSize, 
      risk_value: riskValue, 
      reward_value: rewardValue 
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
            Client <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-orange-600">Dashboard</span>
          </h1>
          <p className="text-[10px] uppercase tracking-[0.3em] font-bold mt-2 text-zinc-500 dark:text-zinc-400">
            • CRT-ALGO ENGINE PRO •
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
                
                {/* Email Row */}
                <div className="flex items-center gap-2 opacity-70 mb-2.5">
                   <Mail size={13} className="text-orange-500" />
                   <span className="text-[11px] font-semibold tracking-wider uppercase font-mono text-zinc-600 dark:text-zinc-400">{userProfile?.email}</span>
                </div>

                {/* License Key / UUID Row */}
                <div className="flex items-center gap-2 bg-[var(--input-bg)] border border-[var(--glass-border)] w-fit px-3 py-1.5 rounded-lg shadow-inner">
                   <Key size={13} className="text-orange-500" />
                   <span className="text-[10px] font-semibold tracking-wider uppercase font-mono text-zinc-600 dark:text-zinc-300">
                      LICENSE: <span className="opacity-80 font-mono">{userProfile?.id || 'NO-KEY-FOUND'}</span>
                   </span>
                   <button 
                      onClick={handleCopyLicense}
                      className="ml-1.5 hover:bg-zinc-200/50 dark:hover:bg-white/10 p-1 rounded transition-all flex items-center justify-center cursor-pointer group"
                      title="Copy License Key"
                   >
                      {copied ? (
                         <Check size={12} className="text-emerald-400" />
                      ) : (
                         <Copy size={12} className="text-zinc-500 dark:text-zinc-400 group-hover:text-zinc-800 dark:group-hover:text-white transition-colors" />
                      )}
                   </button>
                   {copied && <span className="text-[9px] text-emerald-500 font-bold uppercase tracking-widest ml-1 animate-pulse">Copied!</span>}
                </div>
             </div>
             <div className="flex items-center gap-2 mt-4 md:mt-0 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-lg">
                <Activity size={14} className="text-emerald-500 animate-pulse" />
                <span className="font-extrabold text-[10px] uppercase tracking-widest text-emerald-500">ONLINE</span>
             </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <InputBox label="Account Size" icon={<Wallet size={15}/>} value={accountSize} onChange={setAccountSize} prefix="$" color="emerald" />
              <InputBox label="Risk per SL" icon={<Percent size={15}/>} value={riskValue} onChange={setRiskValue} suffix="R" color="red" />
              <InputBox label="Reward per TP" icon={<TrendingUp size={15}/>} value={rewardValue} onChange={setRewardValue} suffix="R" color="blue" />
              <div className="flex items-end">
                 <button onClick={handleSaveSettings} disabled={isSaving} className="btn-modern h-[42px] flex items-center justify-center gap-2 w-full text-xs py-0">
                    <Save size={14} className={isSaving ? 'animate-spin' : ''} /> {isSaving ? 'Saving' : 'Save Config'}
                 </button>
              </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-6 border-t border-[var(--glass-border)] pt-6">
              <SelectBox label="Result Scope" value={timeframe} onChange={setTimeframe} options={[{v:'all', l:'All Time'}, {v:'daily', l:'Daily'}, {v:'weekly', l:'Weekly'}, {v:'monthly', l:'Monthly'}]} />
              <SelectBox label="Asset Class" value={assetClass} onChange={setAssetClass} options={[{v:'ALL', l:'All Assets'}, {v:'CRYPTO', l:'Crypto'}, {v:'FOREX', l:'Forex'}, {v:'METALS', l:'Metals'}]} />
              <SelectBox label="Timeframe Alignment" value={tfAlignment} onChange={setTfAlignment} options={[
                 { v: 'ALL', l: 'All Alignments' },
                 { v: 'M5/H1', l: '5M - 1H Alignment' },
                 { v: 'M15/H4', l: '15M - 4H Alignment' },
                 { v: 'M30/H6', l: '30M - 6H Alignment' },
                 { v: 'H1/D1', l: '1H - 1D Alignment' }
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
            <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 dark:text-zinc-400">Syncing Intelligence...</p>
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
             <StatCard label="Integrity" value="100%" sub="Verified" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <motion.div variants={itemVariants} className="lg:col-span-2 glass-panel p-6 md:p-8">
                 <h3 className="text-sm font-extrabold uppercase tracking-wider mb-6 text-zinc-900 dark:text-white">Equity Curve</h3>
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

// Reusable Components
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
  const mappedOptions = options.map((o: any) => ({ value: o.v, label: o.l }));
  return (
    <CustomSelect
      label={label}
      value={value}
      onChange={onChange}
      options={mappedOptions}
      widthClass="w-full"
    />
  );
}

function DateInput({ label, value, onChange, icon }: any) {
  return (
    <div className="flex flex-col w-full">
       <span className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5 ml-1">{label}</span>
       <div className="flex items-center input-modern h-[42px] py-0">
          {icon && <span className="opacity-60 mr-2 flex items-center">{icon}</span>}
          <input 
             type="date" 
             value={value} 
             onChange={(e) => onChange(e.target.value)} 
             className="bg-transparent font-semibold text-xs w-full outline-none appearance-none cursor-pointer text-foreground" 
          />
       </div>
    </div>
  );
}

function StatCard({ label, value, icon, sub, color = "text-inherit" }: any) {
  return (
    <motion.div 
      variants={itemVariants} 
      whileHover={{ scale: 1.02, y: -2 }} 
      className="relative overflow-hidden glass-panel p-5 transition-all duration-300 group preserve-3d"
    >
       <div className="flex justify-between items-start mb-4 relative z-10">
          <p className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">{label}</p>
          <div className={`${color} opacity-65`}>{icon}</div>
       </div>
       <p className={`text-xl font-extrabold tracking-tight ${color} relative z-10`}>{value ?? '---'}</p>
       {sub && <p className="text-[9px] font-semibold text-zinc-400 dark:text-zinc-500 mt-1.5 uppercase tracking-wider relative z-10">{sub}</p>}
    </motion.div>
  );
}
