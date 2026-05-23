'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { 
  ShieldCheck, Zap, Cpu, ArrowRight, 
  Target, Activity, Terminal, AlertCircle,
  BarChart3, Settings2, Lock, CheckCircle2,
  Database, Radio, Layers, ZapIcon,
  Download, ExternalLink, HelpCircle,
  ArrowUpRight, Info, BookOpen, Globe,
  TrendingUp, Shield, MousePointer2,
  ListFilter, ZapOff, Clock, Gauge,
  ShieldAlert, RefreshCcw, LayoutDashboard
} from 'lucide-react';
import AccessGuard from '@/components/AccessGuard';

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5 }
};

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.1
    }
  }
};

export default function CFDBotDocumentation() {
  return (
    <AccessGuard requiredTier={2} tierName="PRO">
      <div className="min-h-screen lg:ml-72 bg-transparent text-zinc-900 dark:text-zinc-100 pb-20 overflow-x-hidden">
        
        {/* Dynamic Background Elements */}
        <div className="fixed inset-0 pointer-events-none z-0">
          <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-600/5 blur-[120px] rounded-full" />
          <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-cyan-600/5 blur-[120px] rounded-full" />
        </div>

        {/* Hero Section */}
        <div className="relative pt-16 pb-24 px-8 lg:px-16 border-b border-[var(--glass-border)] mb-16 z-10">
          <div className="max-w-[1600px] mx-auto">
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="relative z-10"
            >
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-500 text-[10px] font-black uppercase tracking-widest mb-8">
                <ShieldCheck size={12} />
                Kimoo Guardian Infrastructure
              </div>
              <h1 className="text-5xl lg:text-7xl font-black italic tracking-tighter uppercase mb-6 leading-tight">
                Kimoo Guardian <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-cyan-400">Institutional SaaS Receiver</span>
              </h1>
              <p className="text-zinc-500 text-sm md:text-base font-medium max-w-3xl leading-relaxed">
                High-performance trading infrastructure for cTrader and MT5. Synchronized with Kimoo AI backend to execute signals with microsecond precision and tier-gated risk management.
              </p>
            </motion.div>
          </div>
        </div>

        <div className="max-w-[1600px] mx-auto px-8 lg:px-16 relative z-10">
          <div className="space-y-32">
            
            {/* 1. TIER DIFFERENTIATION */}
            <section id="tier-differentiation">
              <div className="flex items-center gap-4 mb-16">
                <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20 shadow-[0_0_20px_rgba(59,130,246,0.1)]">
                  <Layers className="text-blue-500" size={24} />
                </div>
                <h2 className="text-3xl font-black uppercase tracking-tighter italic">1. Tier Differentiation</h2>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-12">
                {/* KIMOO PRO */}
                <motion.div {...fadeInUp} className="glass-panel p-10 rounded-[2.5rem] border border-[var(--glass-border)] relative overflow-hidden group">
                  <div className="flex flex-col gap-10 relative z-10">
                    <div>
                      <div className="p-5 bg-zinc-500/10 rounded-[2rem] border border-zinc-500/20 w-fit mb-8">
                        <Zap className="text-zinc-500" size={32} />
                      </div>
                      <h3 className="text-4xl font-black italic uppercase mb-2 tracking-tighter">Kimoo <span className="text-zinc-500">PRO</span></h3>
                      <p className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] mb-8 italic">Standard Tier Execution</p>
                    </div>
                    <div className="border-t border-[var(--glass-border)] pt-8 space-y-6">
                      <ul className="space-y-5">
                        <li className="flex items-start gap-4">
                          <div className="mt-1 p-1 bg-blue-500/10 rounded-full border border-blue-500/20">
                            <CheckCircle2 size={12} className="text-blue-500" />
                          </div>
                          <span className="text-[13px] leading-relaxed"><strong>Target:</strong> High-speed, high-frequency signal execution.</span>
                        </li>
                        <li className="flex items-start gap-4">
                          <div className="mt-1 p-1 bg-blue-500/10 rounded-full border border-blue-500/20">
                            <CheckCircle2 size={12} className="text-blue-500" />
                          </div>
                          <span className="text-[13px] leading-relaxed"><strong>Execution:</strong> Immediate Market orders for instant entry.</span>
                        </li>
                        <li className="flex items-start gap-4">
                          <div className="mt-1 p-1 bg-blue-500/10 rounded-full border border-blue-500/20">
                            <CheckCircle2 size={12} className="text-blue-500" />
                          </div>
                          <span className="text-[13px] leading-relaxed"><strong>Safety Gate:</strong> <strong>Counter-Trend Block</strong>. Skips signals conflicting with primary trend.</span>
                        </li>
                        <li className="flex items-start gap-4">
                          <div className="mt-1 p-1 bg-blue-500/10 rounded-full border border-blue-500/20">
                            <CheckCircle2 size={12} className="text-blue-500" />
                          </div>
                          <span className="text-[13px] leading-relaxed"><strong>Capacity:</strong> Up to 3 concurrent active setups.</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </motion.div>

                {/* KIMOO ULTIMATE */}
                <motion.div {...fadeInUp} className="glass-panel p-10 rounded-[2.5rem] border border-blue-500/20 bg-blue-500/[0.02] relative overflow-hidden group">
                  <div className="flex flex-col gap-10 relative z-10">
                    <div>
                      <div className="p-5 bg-blue-500/10 rounded-[2rem] border border-blue-500/20 w-fit mb-8">
                        <Cpu className="text-blue-500" size={32} />
                      </div>
                      <h3 className="text-4xl font-black italic uppercase mb-2 tracking-tighter">Kimoo <span className="text-blue-500">ULTIMATE</span></h3>
                      <p className="text-[10px] font-black text-blue-500 uppercase tracking-[0.2em] mb-8 italic">Premium Tier Elite Precision</p>
                    </div>
                    <div className="border-t border-blue-500/10 pt-8 space-y-6">
                      <ul className="space-y-5">
                        <li className="flex items-start gap-4">
                          <div className="mt-1 p-1 bg-blue-500/10 rounded-full border border-blue-500/20">
                            <CheckCircle2 size={12} className="text-blue-500" />
                          </div>
                          <span className="text-[13px] leading-relaxed"><strong>Elite Precision:</strong> Designed to avoid institutional liquidity traps.</span>
                        </li>
                        <li className="flex items-start gap-4">
                          <div className="mt-1 p-1 bg-blue-500/10 rounded-full border border-blue-500/20">
                            <CheckCircle2 size={12} className="text-blue-500" />
                          </div>
                          <span className="text-[13px] leading-relaxed"><strong>Execution:</strong> Market + <strong>OTE Limit Zones</strong> (Top, Mid, or Bottom entries).</span>
                        </li>
                        <li className="flex items-start gap-4">
                          <div className="mt-1 p-1 bg-blue-500/10 rounded-full border border-blue-500/20">
                            <CheckCircle2 size={12} className="text-blue-500" />
                          </div>
                          <span className="text-[13px] leading-relaxed"><strong>Pro AI Gatekeeper:</strong> Matrix utilizing Daily Anchored VWAP and Volume Spike Ratio.</span>
                        </li>
                        <li className="flex items-start gap-4">
                          <div className="mt-1 p-1 bg-blue-500/10 rounded-full border border-blue-500/20">
                            <CheckCircle2 size={12} className="text-blue-500" />
                          </div>
                          <span className="text-[13px] leading-relaxed"><strong>Capacity:</strong> Up to 5 concurrent active setups.</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </motion.div>
              </div>
            </section>

            {/* 2. CORE TECHNOLOGIES */}
            <section id="core-technologies">
              <div className="flex items-center gap-4 mb-16">
                <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20 shadow-[0_0_20px_rgba(59,130,246,0.1)]">
                  <Database className="text-blue-500" size={24} />
                </div>
                <h2 className="text-3xl font-black uppercase tracking-tighter italic">2. Core Technologies</h2>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {[
                  { 
                    title: "Robust JSON Engine", 
                    desc: "Upgraded parsing logic handles string-quoted and numeric values. Eliminates \"Invalid Levels\" errors.", 
                    icon: ZapIcon 
                  },
                  { 
                    title: "Multi-Alias Mapping", 
                    desc: "Institutional resolution matrix: NAS100 -> US100, USTEC, NDX100. GOLD -> XAUUSD, XAUUSDm.", 
                    icon: Globe 
                  },
                  { 
                    title: "Time Synchronization", 
                    desc: "SaaS-Broker clock offset calc using HTTP Date header. Accurate 10-minute signal age guarding.", 
                    icon: Clock 
                  }
                ].map((tech, i) => (
                  <motion.div 
                    key={i} 
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="glass-panel p-8 rounded-[2rem] border border-[var(--glass-border)] flex flex-col gap-6 group hover:border-blue-500/20 transition-all duration-500"
                  >
                    <div className="w-16 h-16 rounded-[1.5rem] bg-blue-500/5 border border-blue-500/10 flex items-center justify-center shrink-0 group-hover:bg-blue-500/10 transition-all">
                      <tech.icon className="text-blue-500" size={28} />
                    </div>
                    <div>
                      <h4 className="text-xl font-black uppercase tracking-tighter mb-2 italic">{tech.title}</h4>
                      <p className="text-sm text-zinc-500 leading-relaxed">{tech.desc}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </section>

            {/* 3. OPERATIONAL MODES */}
            <section id="operational-modes">
              <div className="flex items-center gap-4 mb-16">
                <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20 shadow-[0_0_20px_rgba(59,130,246,0.1)]">
                  <Settings2 className="text-blue-500" size={24} />
                </div>
                <h2 className="text-3xl font-black uppercase tracking-tighter italic">3. Operational Modes</h2>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                {/* HEDGING */}
                <div className="glass-panel p-10 rounded-[2.5rem] border border-blue-500/20 bg-blue-500/[0.01]">
                  <h4 className="text-2xl font-black uppercase tracking-tighter italic mb-4">Hedging <span className="text-zinc-500">(2 Trades)</span></h4>
                  <div className="space-y-6">
                    <p className="text-sm text-zinc-500 leading-relaxed">Opens two identical positions for strategic management.</p>
                    <div className="grid grid-cols-1 gap-4">
                      <div className="flex justify-between items-center p-5 rounded-2xl bg-zinc-500/5 border border-zinc-500/10">
                        <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">TP1 Hit</span>
                        <span className="text-xs font-black text-blue-500 uppercase tracking-tighter">Close Position 1</span>
                      </div>
                      <div className="flex justify-between items-center p-5 rounded-2xl bg-zinc-500/5 border border-zinc-500/10">
                        <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Runner Management</span>
                        <span className="text-xs font-black text-blue-500 uppercase tracking-tighter">Lock at Breakeven (BE)</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* NETTING */}
                <div className="glass-panel p-10 rounded-[2.5rem] border border-zinc-500/20">
                  <h4 className="text-2xl font-black uppercase tracking-tighter italic mb-4">Netting <span className="text-zinc-500">(1 Trade)</span></h4>
                  <div className="space-y-6">
                    <p className="text-sm text-zinc-500 leading-relaxed">Opens a single position with dynamic partial management.</p>
                    <div className="grid grid-cols-1 gap-4">
                      <div className="flex justify-between items-center p-5 rounded-2xl bg-zinc-500/5 border border-zinc-500/10">
                        <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">TP1 Level Reach</span>
                        <span className="text-xs font-black text-zinc-900 dark:text-zinc-200 uppercase tracking-tighter">50% Partial Close</span>
                      </div>
                      <div className="flex justify-between items-center p-5 rounded-2xl bg-zinc-500/5 border border-zinc-500/10">
                        <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Remaining Position</span>
                        <span className="text-xs font-black text-zinc-900 dark:text-zinc-200 uppercase tracking-tighter">Shift SL to Breakeven</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* 4. RISK & SAFETY MATRIX */}
            <section id="safety-matrix">
              <div className="flex items-center gap-4 mb-16">
                <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20 shadow-[0_0_20px_rgba(59,130,246,0.1)]">
                  <ShieldAlert className="text-blue-500" size={24} />
                </div>
                <h2 className="text-3xl font-black uppercase tracking-tighter italic">4. Risk & Safety Matrix</h2>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {[
                  { 
                    title: "Daily Risk Wallet", 
                    desc: "Automatic KILL-SWITCH mode when realized + floating PnL exceeds risk limit. Halts all trading until next day.", 
                    icon: ZapOff 
                  },
                  { 
                    title: "ATR Late Entry", 
                    desc: "Uses 14-day ATR to calculate drift. Skips signals if price has moved too far from origin to avoid chasing.", 
                    icon: ListFilter 
                  },
                  { 
                    title: "Crash Protection", 
                    desc: "Strict validation using MathIsValidNumber. Prevents terminal crashes from zero-volume or malformed broker data.", 
                    icon: ShieldCheck 
                  }
                ].map((risk, i) => (
                  <motion.div 
                    key={i} 
                    initial={{ opacity: 0, scale: 0.95 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    className="glass-panel p-8 rounded-[2.5rem] border border-[var(--glass-border)] flex flex-col gap-6"
                  >
                    <div className="w-14 h-14 rounded-2xl bg-zinc-500/5 border border-zinc-500/10 flex items-center justify-center">
                      <risk.icon className="text-zinc-500" size={24} />
                    </div>
                    <div>
                      <h4 className="text-xl font-black uppercase tracking-tighter mb-2 italic">{risk.title}</h4>
                      <p className="text-sm text-zinc-500 leading-relaxed font-medium">{risk.desc}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </section>

            {/* 5. DASHBOARD TELEMETRY */}
            <section id="telemetry">
              <div className="flex items-center gap-4 mb-16">
                <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20 shadow-[0_0_20px_rgba(59,130,246,0.1)]">
                  <LayoutDashboard className="text-blue-500" size={24} />
                </div>
                <h2 className="text-3xl font-black uppercase tracking-tighter italic">5. Dashboard Telemetry</h2>
              </div>

              <div className="overflow-hidden rounded-[2.5rem] border border-[var(--glass-border)] shadow-2xl">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 divide-x divide-y md:divide-y-0 divide-[var(--glass-border)] bg-zinc-500/[0.01]">
                  {[
                    { label: "Bot Status", value: "Seeking Signals", detail: "Active polling mode" },
                    { label: "Buffer Left", value: "Risk Capital", detail: "Remaining daily wallet" },
                    { label: "Active Pairs", value: "Exposure Check", detail: "Active vs Max Allowed" },
                    { label: "Time Sync", value: "Clock Verification", detail: "SaaS offset validation" }
                  ].map((stat, i) => (
                    <div key={i} className="p-10 flex flex-col gap-4 hover:bg-blue-500/[0.02] transition-colors">
                      <span className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.4em]">{stat.label}</span>
                      <h4 className="text-2xl font-black italic uppercase tracking-tighter text-blue-500">{stat.value}</h4>
                      <p className="text-xs text-zinc-400 font-medium">{stat.detail}</p>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* 6. TROUBLESHOOTING */}
            <section id="troubleshooting" className="pb-32">
              <div className="flex items-center gap-4 mb-16">
                <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20 shadow-[0_0_20px_rgba(59,130,246,0.1)]">
                  <Terminal className="text-blue-500" size={24} />
                </div>
                <h2 className="text-3xl font-black uppercase tracking-tighter italic">6. Troubleshooting</h2>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-[#0a0c10] rounded-[3rem] p-12 border border-zinc-800 shadow-2xl">
                  <h4 className="text-xl font-black italic uppercase text-white mb-8 flex items-center gap-3">
                    <Radio size={20} className="text-blue-500" />
                    Terminal Log Indicators
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 font-mono">
                    {[
                      { code: "✅ EXECUTED", desc: "Trade successful.", color: "text-green-500" },
                      { code: "🔄 SYNC", desc: "Symbol mapped successfully.", color: "text-blue-500" },
                      { code: "⏭️ SKIP", desc: "Filter rejected the trade.", color: "text-orange-500" },
                      { code: "🔴 KILL-SWITCH", desc: "Daily loss limit hit.", color: "text-red-500" }
                    ].map((item, i) => (
                      <div key={i} className="space-y-3">
                        <p className={`text-[11px] font-bold uppercase tracking-widest ${item.color}`}>{item.code}</p>
                        <p className="text-[10px] text-zinc-600 leading-relaxed">{item.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-6">
                  {[
                    { q: "Auth Failed", a: "Verify Email and License. Ensure 'Allow WebRequest' is enabled for Kimoo domain in Expert Advisor options." },
                    { q: "Skip Signal (RR low)", a: "Bot skips trades where projected Reward-to-Risk ratio is below your InpMinRR setting." },
                    { q: "Symbol Not Found", a: "Check for unique broker suffixes (e.g. NAS100.x) and add them to the Symbol Map function." }
                  ].map((item, i) => (
                    <div key={i} className="glass-panel p-8 rounded-[2rem] border border-[var(--glass-border)]">
                      <h4 className="text-sm font-black uppercase italic mb-3 text-blue-500">{item.q}</h4>
                      <p className="text-xs text-zinc-500 leading-relaxed font-medium">{item.a}</p>
                    </div>
                  ))}
                </div>
              </div>
            </section>

          </div>
        </div>

        {/* Footer */}
        <div className="max-w-[1600px] mx-auto px-16 mt-32 opacity-30 text-center">
          <div className="h-px bg-gradient-to-r from-transparent via-zinc-500/20 to-transparent mb-8" />
          <p className="text-[10px] font-black uppercase tracking-[0.5em] text-zinc-500">
            © 2026 Kimoo Guardian Infrastructure. Institutional Documentation.
          </p>
        </div>
      </div>
    </AccessGuard>
  );
}
