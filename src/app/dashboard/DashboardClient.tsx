"use client";

import Link from 'next/link';
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import {
  TrendingUp, Zap, Star, Activity, BarChart3, Target, Layers,
  Wallet, CheckCircle2, XCircle, MinusCircle, Percent, Save, Mail, TrendingDown,
  Info, AlertCircle, ChevronRight, Clock, Key, Copy, Check
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
      p_asset_class: assetClass
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
  }, [userProfile?.id, accountSize, riskValue, rewardValue, timeframe, assetClass]);

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
    <div className="relative p-4 md:p-12 lg:p-16 lg:ml-72 min-h-screen font-sans overflow-x-hidden">
      
      {/* Ambience is now handled by layout.tsx, removed local ambience to prevent overlap */}

      <div className="max-w-[1700px] mx-auto relative z-10">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-12">
          <div>
            <h1 className="text-3xl md:text-5xl font-black tracking-tighter uppercase drop-shadow-md">Client <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500">Dashboard</span></h1>
            <p className="text-[10px] uppercase tracking-[0.4em] font-bold mt-3 leading-none opacity-70">• KIMOO CRT ENGINE PRO •</p>
          </div>
        </div>

        {/* SETTINGS CARD */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="mb-10 p-6 md:p-10 rounded-[2.5rem] glass-panel preserve-3d"
        >
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end border-b border-[var(--glass-border)] pb-8 mb-8">
              <div>
                  <div className="flex flex-wrap items-center gap-4 mb-3">
                     <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tighter">{userProfile?.full_name || 'TRADER'}</h2>
                     <span className="bg-gradient-to-r from-purple-500/20 to-blue-500/20 border border-purple-500/40 text-purple-600 dark:text-purple-400 text-[10px] font-black px-4 py-1.5 rounded-full uppercase tracking-widest drop-shadow-sm">{getTierDisplay()}</span>
                  </div>
                  
                  {/* Email Row */}
                  <div className="flex items-center gap-2 opacity-70 mb-2">
                     <Mail size={14} className="text-purple-500" />
                     <span className="text-[11px] font-bold tracking-widest uppercase font-mono">{userProfile?.email}</span>
                  </div>

                  {/* License Key / UUID Row */}
                  <div className="flex items-center gap-2 opacity-80 bg-[var(--input-bg)] border border-[var(--glass-border)] w-fit px-4 py-2 rounded-full shadow-inner">
                     <Key size={14} className="text-pink-500" />
                     <span className="text-[11px] font-bold tracking-widest uppercase font-mono">
                        LICENSE: <span className="opacity-70">{userProfile?.id || 'NO-KEY-FOUND'}</span>
                     </span>
                     <button 
                        onClick={handleCopyLicense}
                        className="ml-2 hover:bg-white/10 p-1.5 rounded transition-all flex items-center justify-center cursor-pointer group"
                        title="Copy License Key"
                     >
                        {copied ? (
                           <Check size={14} className="text-emerald-400" />
                        ) : (
                           <Copy size={14} className="text-zinc-700 dark:text-zinc-400 group-hover:text-zinc-900 dark:text-white transition-colors" />
                        )}
                     </button>
                     {copied && <span className="text-[9px] text-emerald-500 font-black uppercase tracking-widest ml-1 animate-pulse">Copied!</span>}
                  </div>
               </div>
               <div className="flex items-center gap-3 mt-6 md:mt-0">
                  <Activity size={20} className="text-emerald-400" />
                  <span className="font-black text-lg uppercase text-emerald-400">ONLINE</span>
               </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
                <InputBox label="Account Size" icon={<Wallet size={16}/>} value={accountSize} onChange={setAccountSize} prefix="$" color="emerald" />
                <InputBox label="Risk per SL" icon={<Percent size={16}/>} value={riskValue} onChange={setRiskValue} suffix="R" color="red" />
                <InputBox label="Reward per TP" icon={<TrendingUp size={16}/>} value={rewardValue} onChange={setRewardValue} suffix="R" color="blue" />
                <SelectBox label="Result Scope" value={timeframe} onChange={setTimeframe} options={[{v:'all', l:'All Time'}, {v:'daily', l:'Daily'}, {v:'weekly', l:'Weekly'}, {v:'monthly', l:'Monthly'}]} />
                <SelectBox label="Asset Class" value={assetClass} onChange={setAssetClass} options={[{v:'ALL', l:'All Assets'}, {v:'CRYPTO', l:'Crypto'}, {v:'FOREX', l:'Forex'}, {v:'METALS', l:'Metals'}]} />
                <button onClick={handleSaveSettings} disabled={isSaving} className="btn-modern h-[50px] self-end flex items-center justify-center gap-2 w-full md:w-auto">
                   <Save size={16} className={isSaving ? 'animate-spin' : ''} /> {isSaving ? 'Saving' : 'Save Config'}
                </button>
            </div>
        </motion.div>

        {/* MAIN STATS GRID */}
        {isInitialLoad ? (
           <div className="w-full py-24 flex flex-col items-center justify-center glass-panel rounded-[2.5rem] animate-pulse mb-12"><Activity size={40} className="opacity-50 mb-4" /><p className="text-xs font-black uppercase opacity-70">Syncing Intelligence...</p></div>
        ) : (
          <motion.div variants={containerVariants} initial="hidden" animate="show">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4 md:gap-6 mb-8 perspective-1000">
               <StatCard label="Total Signals" value={realStats.total} icon={<Activity size={18}/>} />
               <StatCard label="Total Wins" value={realStats.totalWins} icon={<CheckCircle2 size={18}/>} color="text-emerald-400" />
               <StatCard label="Total Losses" value={realStats.totalLosses} icon={<XCircle size={18}/>} color="text-red-500" />
               <StatCard label="Total BE" value={realStats.totalBE} icon={<MinusCircle size={18}/>} color="text-zinc-700 dark:text-zinc-400" />
               <StatCard label="Win Rate" value={realStats.winRate} icon={<TrendingUp size={18}/>} color="text-emerald-400" />
               <StatCard label="Total R:R" value={realStats.totalRR} icon={<Zap size={18}/>} color="text-indigo-400" />
               
               <StatCard label="Net Profit" value={realStats.profitUSD} icon={<Wallet size={18}/>} color="text-emerald-500" />
               <StatCard label="Profit Factor" value={realStats.profitFactor} icon={<Star size={18}/>} color="text-blue-400" />
               <StatCard label="Expectancy" value={realStats.expectancy} icon={<Layers size={18}/>} color="text-zinc-800 dark:text-zinc-300" />
               <StatCard label="Max Drawdown" value={realStats.maxDrawdown} icon={<TrendingDown size={18}/>} color="text-red-400" />
               <StatCard label="Long WR" value={realStats.longWR} sub="Buy Side" />
               <StatCard label="Short WR" value={realStats.shortWR} sub="Sell Side" />

               <StatCard label="Most Profitable" value={realStats.mostProfitable} sub="Best Pair" color="text-emerald-400" />
               <StatCard label="Most Traded" value={realStats.mostTraded} sub="Volume Pair" color="text-blue-400" />
               <StatCard label="Highest WR" value={realStats.highWRPair} sub="Top Accuracy" color="text-indigo-400" />
               <StatCard label="Win Streak" value={realStats.winStreak} icon={<TrendingUp size={18}/>} color="text-emerald-500" />
               <StatCard label="Loss Streak" value={realStats.lossStreak} icon={<TrendingDown size={18}/>} color="text-red-500" />
               <StatCard label="Integrity" value="100%" sub="Verified" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-12 perspective-1000">
                <motion.div variants={itemVariants} className="lg:col-span-2 glass-panel p-8 rounded-[2.5rem]">
                   <h3 className="text-xl font-black italic tracking-tighter uppercase mb-6">Equity Curve</h3>
                   <div className="h-[300px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                         <AreaChart data={chartData}>
                            <defs><linearGradient id="colorRR" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/><stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/></linearGradient></defs>
                            <XAxis dataKey="name" hide /><YAxis stroke="#52525b" fontSize={10} tickFormatter={(val) => `${val}R`} />
                            <RechartsTooltip contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', borderRadius: '1rem' }} />
                            <Area type="monotone" dataKey="rr" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorRR)" />
                         </AreaChart>
                      </ResponsiveContainer>
                   </div>
                </motion.div>
                <motion.div variants={itemVariants} className="glass-panel p-8 rounded-[2.5rem] flex flex-col justify-center text-center">
                   <h3 className="text-xl font-black italic tracking-tighter uppercase mb-6">Outcome Split</h3>
                   <div className="h-[250px]">
                      <ResponsiveContainer width="100%" height="100%">
                         <PieChart>
                            <RechartsTooltip contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', borderRadius: '1rem', color: '#fff' }} itemStyle={{ color: '#fff' }} />
                            <Pie data={[{ name: 'Wins', value: realStats.totalWins }, { name: 'Losses', value: realStats.totalLosses }, { name: 'BE', value: realStats.totalBE }]} cx="50%" cy="50%" innerRadius={70} outerRadius={90} paddingAngle={5} dataKey="value" stroke="none" label={{ fill: '#a1a1aa', fontSize: 12, fontWeight: 'bold' }}>
                               <Cell fill="#34d399" /><Cell fill="#ef4444" /><Cell fill="#52525b" />
                            </Pie>
                         </PieChart>
                      </ResponsiveContainer>
                   </div>
                </motion.div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}

// Reusable Components
function InputBox({ label, icon, value, onChange, prefix, suffix, color }: any) {
  return (
    <div className="flex flex-col w-full">
       <span className="text-[9px] font-black uppercase opacity-70 tracking-widest mb-1.5 ml-2">{label}</span>
       <div className="flex items-center input-modern">
          {prefix && <span className="opacity-50 font-black text-sm mr-2">{prefix}</span>}
          <input type="number" step="0.1" value={value} onChange={(e) => onChange(Number(e.target.value))} className="bg-transparent font-black text-lg w-full outline-none" />
          {suffix && <span className="opacity-50 font-black text-sm ml-2">{suffix}</span>}
       </div>
    </div>
  );
}

function SelectBox({ label, value, onChange, options }: any) {
  return (
    <div className="flex flex-col w-full">
       <span className="text-[9px] font-black uppercase opacity-70 tracking-widest mb-1.5 ml-2">{label}</span>
       <div className="input-modern relative">
          <select value={value} onChange={(e) => onChange(e.target.value)} className="bg-transparent font-black text-lg w-full outline-none appearance-none cursor-pointer pr-4">
            {options.map((o: any) => <option key={o.v} value={o.v} className="bg-[var(--bg)]">{o.l}</option>)}
          </select>
       </div>
    </div>
  );
}

function StatCard({ label, value, icon, sub, color = "text-inherit" }: any) {
  return (
    <motion.div variants={itemVariants} whileHover={{ scale: 1.05, rotateX: 5, rotateY: -5, z: 20 }} className="relative overflow-hidden glass-panel p-6 transition-colors duration-300 group preserve-3d rounded-[2rem]">
       <div className="flex justify-between items-start mb-6 relative z-10">
          <p className="text-[9px] font-bold opacity-70 uppercase tracking-widest">{label}</p>
          <div className={`${color} opacity-60 drop-shadow-md`}>{icon}</div>
       </div>
       <p className={`text-2xl font-black tracking-tight ${color} drop-shadow-md relative z-10`}>{value ?? '---'}</p>
       {sub && <p className="text-[8px] font-bold opacity-50 mt-2 uppercase tracking-widest relative z-10">{sub}</p>}
    </motion.div>
  );
}
