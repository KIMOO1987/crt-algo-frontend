"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import { ThemeToggle } from '@/components/ThemeToggle';
import { 
  Loader2, 
  Shield, 
  Activity, 
  Cpu, 
  Layers, 
  TrendingUp, 
  BarChart3, 
  ArrowRight, 
  Lock, 
  Settings, 
  Mail, 
  Globe, 
  LineChart, 
  Check, 
  AlertCircle,
  Menu,
  X,
  MessageSquare
} from 'lucide-react';

interface Plan {
  id: string;
  name: string;
  price: number;
  duration: number;
  duration_text: string;
  features: string[];
  icon_type?: string;
}

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(true);
  
  // Contact form state
  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formSubject, setFormSubject] = useState("");
  const [formMessage, setFormMessage] = useState("");
  const [sendingForm, setSendingForm] = useState(false);
  const [formStatus, setFormStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [formErrorMessage, setFormErrorMessage] = useState("");

  // Live signal simulation states for a WOW factor presentation
  const [simulatedSignals, setSimulatedSignals] = useState([
    { id: 1, pair: 'BTCUSDT', type: 'BUY', price: '68,240', tf: 'M5/H1', time: 'Just Now', status: 'Entry Triggered' },
    { id: 2, pair: 'ETHUSDT', type: 'SELL', price: '3,780', tf: 'M15/H4', time: '2 mins ago', status: 'TP1 Hit (+1.5R)' },
    { id: 3, pair: 'SOLUSDT', type: 'BUY', price: '162.40', tf: 'M5/H1', time: '10 mins ago', status: 'TP2 Hit (+3.0R)' },
  ]);

  useEffect(() => {
    async function getPlans() {
      try {
        const { data, error } = await supabase
          .from('plans')
          .select('*')
          .order('price', { ascending: true });
        
        if (!error && data && data.length > 0) {
          setPlans(data);
        } else {
          // Use high-converting fallback plans if DB is empty
          setPlans([
            {
              id: 'trial',
              name: '15-Day Trial',
              price: 0,
              duration: 15,
              duration_text: 'FREE ACCESS',
              features: [
                'Full Tier 3 (Ultimate) Access',
                'All Exchanges & Strategies',
                'Instant Signal Delivery',
                '24/7 Support Access'
              ]
            },
            {
              id: 'pro_monthly',
              name: 'PRO MONTHLY',
              price: 99,
              duration: 30,
              duration_text: '/ MONTH',
              features: [
                'Access to Tier 2 Features',
                'Up to 3 concurrent positions',
                'Binance, OKX, Bybit integrations',
                'Advanced Trend Alignment Filters'
              ]
            },
            {
              id: 'ultimate_monthly',
              name: 'ULTIMATE MONTHLY',
              price: 199,
              duration: 30,
              duration_text: '/ MONTH',
              features: [
                'Full Tier 3 Access',
                'Unlimited concurrent positions',
                'MT5 & cTrader API execution',
                'Direct webhook endpoints',
                'Private TradingView Script Access'
              ]
            }
          ]);
        }
      } catch (err) {
        console.error("Error fetching plans:", err);
      } finally {
        setLoadingPlans(false);
      }
    }
    getPlans();

    // Rotate simulated signals periodically for visual feedback
    const interval = setInterval(() => {
      setSimulatedSignals(prev => {
        const copy = [...prev];
        const last = copy.pop()!;
        const nextId = last.id + 3;
        const pairs = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'AVAXUSDT', 'LINKUSDT', 'NEARUSDT'];
        const types = ['BUY', 'SELL'];
        const statusList = ['Entry Triggered', 'TP1 Hit (+1.5R)', 'TP2 Hit (+3.0R)', 'Trailing SL (+0.8R)', 'SL Triggered (-1.0R)'];
        
        const randomPair = pairs[Math.floor(Math.random() * pairs.length)];
        const randomType = types[Math.floor(Math.random() * types.length)];
        const randomStatus = statusList[Math.floor(Math.random() * statusList.length)];
        const randomPrice = (Math.random() * 1000 + 10).toFixed(2);

        const newSignal = {
          id: nextId,
          pair: randomPair,
          type: randomType,
          price: randomPrice,
          tf: 'M5/H1',
          time: 'Just Now',
          status: randomStatus
        };
        
        // Update relative times of other signals
        const updated = [
          newSignal,
          { ...copy[0], time: '1 min ago' },
          { ...copy[1], time: '5 mins ago' }
        ];
        return updated;
      });
    }, 8000);

    return () => clearInterval(interval);
  }, []);

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName || !formEmail || !formMessage) {
      setFormStatus('error');
      setFormErrorMessage("Please fill in all required fields.");
      return;
    }

    setSendingForm(true);
    setFormStatus('idle');

    try {
      const { error } = await supabase
        .from('contact_inquiries')
        .insert({
          name: formName,
          email: formEmail,
          subject: formSubject || "General Inquiry",
          message: formMessage,
          status: 'pending'
        });

      if (error) throw error;

      // Reset form
      setFormName("");
      setFormEmail("");
      setFormSubject("");
      setFormMessage("");
      setFormStatus('success');
    } catch (err: any) {
      console.error("Error submitting contact inquiry:", err);
      setFormStatus('error');
      setFormErrorMessage(err.message || "Failed to submit inquiry. Please try again.");
    } finally {
      setSendingForm(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--fg)] selection:bg-orange-500/30 overflow-x-hidden font-sans relative">
      
      {/* 1. Navbar */}
      <header className="sticky top-0 z-50 w-full border-b border-[var(--glass-border)] bg-[var(--bg)]/80 backdrop-blur-md transition-all">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          
          <Link href="/" className="flex items-center gap-2">
            <h1 className="text-2xl font-black tracking-tighter uppercase drop-shadow-md">
              CRT-ALGO<span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-orange-600">CONSOLE</span>
            </h1>
          </Link>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-xs font-bold tracking-widest uppercase hover:text-orange-500 transition-colors">Features</a>
            <a href="#simulator" className="text-xs font-bold tracking-widest uppercase hover:text-orange-500 transition-colors">Signal Desk</a>
            <a href="#pricing" className="text-xs font-bold tracking-widest uppercase hover:text-orange-500 transition-colors">Pricing</a>
            <a href="#contact" className="text-xs font-bold tracking-widest uppercase hover:text-orange-500 transition-colors">Contact</a>
          </nav>

          {/* CTAs */}
          <div className="hidden md:flex items-center gap-4">
            <ThemeToggle className="p-3.5 rounded-2xl bg-[var(--input-bg)] border border-[var(--glass-border)] text-zinc-500 hover:text-[var(--fg)] hover:border-orange-500/30 transition-all flex items-center justify-center shrink-0" />
            <Link href="/login" className="btn-secondary px-5 py-2.5">
              Sign In
            </Link>
            <Link href="/signup" className="btn-modern px-5 py-2.5">
              Get Started
            </Link>
          </div>

          {/* Mobile Menu Toggle */}
          <div className="flex items-center gap-3 md:hidden">
            <ThemeToggle className="p-2.5 rounded-xl bg-[var(--input-bg)] border border-[var(--glass-border)] text-zinc-500 hover:text-[var(--fg)] flex items-center justify-center shrink-0" />
            <button 
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2.5 rounded-xl bg-[var(--input-bg)] border border-[var(--glass-border)] text-zinc-950 dark:text-white"
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>

        </div>

        {/* Mobile menu panel */}
        {mobileMenuOpen && (
          <div className="md:hidden border-b border-[var(--glass-border)] bg-[var(--bg)] px-6 py-6 space-y-4 flex flex-col absolute top-20 left-0 w-full shadow-xl animate-in fade-in slide-in-from-top-5 duration-200">
            <a 
              href="#features" 
              onClick={() => setMobileMenuOpen(false)}
              className="text-sm font-bold tracking-widest uppercase py-2 hover:text-orange-500 transition-colors"
            >
              Features
            </a>
            <a 
              href="#simulator" 
              onClick={() => setMobileMenuOpen(false)}
              className="text-sm font-bold tracking-widest uppercase py-2 hover:text-orange-500 transition-colors"
            >
              Signal Desk
            </a>
            <a 
              href="#pricing" 
              onClick={() => setMobileMenuOpen(false)}
              className="text-sm font-bold tracking-widest uppercase py-2 hover:text-orange-500 transition-colors"
            >
              Pricing
            </a>
            <a 
              href="#contact" 
              onClick={() => setMobileMenuOpen(false)}
              className="text-sm font-bold tracking-widest uppercase py-2 hover:text-orange-500 transition-colors"
            >
              Contact
            </a>
            
            <div className="pt-4 border-t border-[var(--glass-border)] flex flex-col gap-3">
              <Link href="/login" onClick={() => setMobileMenuOpen(false)} className="btn-secondary w-full text-center py-3">
                Sign In
              </Link>
              <Link href="/signup" onClick={() => setMobileMenuOpen(false)} className="btn-modern w-full text-center py-3">
                Get Started
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* 2. Hero Section */}
      <section className="relative pt-12 pb-20 md:py-32 overflow-hidden max-w-7xl mx-auto px-6">
        
        {/* Decorative Grid Pattern */}
        <div className="absolute inset-0 -z-20 opacity-30 dark:opacity-20 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          
          <div className="lg:col-span-6 space-y-6 text-left">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-orange-500/10 border border-orange-500/20 rounded-full shadow-sm w-fit">
              <Shield size={12} className="text-orange-500" />
              <span className="text-[9px] font-black text-orange-600 dark:text-orange-400 uppercase tracking-widest">Version 2.4 Live</span>
            </div>
            
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight uppercase leading-none italic">
              Algorithmic <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-orange-600">Precision</span>. <br />
              Institutional Speed.
            </h1>

            <p className="text-zinc-600 dark:text-zinc-400 text-sm md:text-base leading-relaxed max-w-xl">
              Automate your trade executions, bridge MT5 and cTrader accounts, enforce strict risk metrics, and track your metrics in one beautifully consolidated trading console.
            </p>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 pt-2">
              <Link href="/signup" className="btn-modern text-center py-4 px-8 flex items-center justify-center gap-3">
                Launch Console Now <ArrowRight size={16} />
              </Link>
              <a href="#features" className="btn-secondary text-center py-4 px-6 border border-zinc-300 dark:border-zinc-800">
                Explore Features
              </a>
            </div>
          </div>

          {/* Right side teaser box (Interactive mock console) */}
          <div className="lg:col-span-6 w-full relative group">
            <div className="absolute -inset-1.5 bg-gradient-to-r from-orange-500 to-fuchsia-500 rounded-2xl blur-lg opacity-25 group-hover:opacity-40 transition duration-1000" />
            
            <div className="relative glass-panel bg-[var(--bg-surface)] border border-[var(--glass-border)] shadow-2xl p-6 rounded-2xl overflow-hidden flex flex-col gap-4 font-mono text-left">
              <div className="flex justify-between items-center pb-3 border-b border-[var(--glass-border)] shrink-0">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-red-500" />
                  <span className="w-3 h-3 rounded-full bg-yellow-500" />
                  <span className="w-3 h-3 rounded-full bg-green-500" />
                </div>
                <div className="text-[9px] uppercase tracking-widest text-zinc-500 font-black">CRT-CONSOLE // SYSTEM_LIVE</div>
              </div>

              {/* simulated metric widgets */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-[var(--input-bg)] border border-[var(--glass-border)] rounded-xl">
                  <span className="text-[8px] text-zinc-550 block uppercase tracking-wider">TOTAL EXPECTANCY</span>
                  <span className="text-lg font-black text-orange-500 italic font-sans">+2.45 R</span>
                </div>
                <div className="p-3 bg-[var(--input-bg)] border border-[var(--glass-border)] rounded-xl">
                  <span className="text-[8px] text-zinc-555 block uppercase tracking-wider">WIN FACTOR</span>
                  <span className="text-lg font-black text-emerald-500 italic font-sans">73.2 %</span>
                </div>
              </div>

              <div className="space-y-2.5">
                <div className="text-[8px] uppercase tracking-widest text-zinc-500 font-bold mb-1">Active Executions (Simulated)</div>
                {simulatedSignals.map((sig, idx) => (
                  <div 
                    key={sig.id}
                    className={`p-3 rounded-xl border flex items-center justify-between text-xs transition-all duration-500 ${
                      idx === 0 
                        ? 'bg-orange-500/10 border-orange-500/25 shadow-md shadow-orange-500/5 translate-x-1.5' 
                        : 'bg-zinc-800/10 dark:bg-black/20 border-[var(--glass-border)]'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className={`text-[9px] font-black px-1.5 py-0.5 rounded ${sig.type === 'BUY' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                        {sig.type}
                      </span>
                      <div>
                        <span className="font-bold font-sans text-zinc-900 dark:text-white">{sig.pair}</span>
                        <span className="text-[8px] text-zinc-500 ml-2 block sm:inline">Price: {sig.price}</span>
                      </div>
                    </div>
                    
                    <div className="text-right flex items-center gap-2">
                      <span className={`text-[8px] font-bold px-2 py-0.5 rounded border ${
                        sig.status.includes('TP') ? 'text-emerald-450 bg-emerald-500/10 border-emerald-500/20' :
                        sig.status.includes('SL') ? 'text-red-450 bg-red-500/10 border-red-500/20' :
                        'text-orange-450 bg-orange-500/10 border-orange-500/20'
                      }`}>
                        {sig.status}
                      </span>
                      <span className="text-[8px] text-zinc-500 block sm:inline font-sans">{sig.time}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="text-[8px] text-zinc-550 border-t border-[var(--glass-border)] pt-2 w-full text-center uppercase tracking-widest font-black">
                Interactive real-time desk view
              </div>
            </div>

          </div>

        </div>

      </section>

      {/* 3. Stats section */}
      <section className="border-y border-[var(--glass-border)] bg-[var(--input-bg)]/30 py-12">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          <div>
            <span className="text-2xl sm:text-4xl font-black italic tracking-tighter text-orange-500 block mb-1">$1.45B+</span>
            <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500">Volume Executed</span>
          </div>
          <div>
            <span className="text-2xl sm:text-4xl font-black italic tracking-tighter text-zinc-900 dark:text-white block mb-1">&lt; 40ms</span>
            <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500">Average Execution Latency</span>
          </div>
          <div>
            <span className="text-2xl sm:text-4xl font-black italic tracking-tighter text-zinc-900 dark:text-white block mb-1">9,420+</span>
            <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500">Connected Terminal Bots</span>
          </div>
          <div>
            <span className="text-2xl sm:text-4xl font-black italic tracking-tighter text-orange-500 block mb-1">99.99%</span>
            <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500">Operational Uptime</span>
          </div>
        </div>
      </section>

      {/* 4. Features presentation (Bento box grid) */}
      <section id="features" className="py-20 md:py-32 max-w-7xl mx-auto px-6">
        <div className="text-center max-w-3xl mx-auto mb-16 md:mb-24 space-y-4">
          <span className="text-[10px] font-black uppercase tracking-[0.25em] text-orange-500 block">• PRO-LEVEL FEATURES •</span>
          <h2 className="text-3xl sm:text-4xl font-black uppercase tracking-tight italic">
            Engineered For Consistent Trade Execution
          </h2>
          <p className="text-sm text-zinc-550 dark:text-zinc-400">
            A comprehensive suite of tools built to bridge multiple exchange accounts, direct TradingView webhooks, apply advanced trading parameters, and audit execution histories.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          
          {/* Card 1: Bot Strategy Engine */}
          <div className="glass-panel md:col-span-8 p-6 md:p-8 bg-zinc-500/[0.01] flex flex-col justify-between gap-6 hover:border-orange-500/30 transition-all duration-300">
            <div className="flex items-center justify-between">
              <div className="p-3 bg-orange-500/10 border border-orange-500/20 text-orange-500 rounded-xl">
                <Cpu size={24} />
              </div>
              <span className="text-[8px] font-black uppercase tracking-widest text-zinc-500 px-3 py-1 bg-[var(--input-bg)] border border-[var(--glass-border)] rounded-full">Automated</span>
            </div>
            
            <div className="space-y-2">
              <h3 className="text-xl font-black italic uppercase tracking-tight">Algorithmic Bot Trading</h3>
              <p className="text-sm text-zinc-650 dark:text-zinc-400 leading-relaxed">
                Connect your backend exchange keys and configure custom investment values. When TradingView alerts trigger, our system routes, validates, and fills them with sub-millisecond execution matching.
              </p>
            </div>
          </div>

          {/* Card 2: Risk Filters */}
          <div className="glass-panel md:col-span-4 p-6 md:p-8 bg-zinc-500/[0.01] flex flex-col justify-between gap-6 hover:border-orange-500/30 transition-all duration-300">
            <div className="p-3 bg-orange-500/10 border border-orange-500/20 text-orange-500 rounded-xl w-fit">
              <Shield size={24} />
            </div>
            
            <div className="space-y-2">
              <h3 className="text-xl font-black italic uppercase tracking-tight">Advanced Risk Filters</h3>
              <p className="text-sm text-zinc-650 dark:text-zinc-400 leading-relaxed">
                Configure constraints like HTF alignment, sweep quality, grading filters, and custom risk-to-reward metrics.
              </p>
            </div>
          </div>

          {/* Card 3: cTrader & MT5 Bridge */}
          <div className="glass-panel md:col-span-4 p-6 md:p-8 bg-zinc-500/[0.01] flex flex-col justify-between gap-6 hover:border-orange-500/30 transition-all duration-300">
            <div className="p-3 bg-orange-500/10 border border-orange-500/20 text-orange-500 rounded-xl w-fit">
              <Layers size={24} />
            </div>
            
            <div className="space-y-2">
              <h3 className="text-xl font-black italic uppercase tracking-tight">MT5 & cTrader Bridge</h3>
              <p className="text-sm text-zinc-650 dark:text-zinc-400 leading-relaxed">
                Say goodbye to complex execution setups. Seamlessly link your MetaTrader 5 and cTrader API keys to route indicator signals directly into legacy brokers.
              </p>
            </div>
          </div>

          {/* Card 4: Analytics Dashboard */}
          <div className="glass-panel md:col-span-8 p-6 md:p-8 bg-zinc-500/[0.01] flex flex-col justify-between gap-6 hover:border-orange-500/30 transition-all duration-300">
            <div className="flex items-center justify-between">
              <div className="p-3 bg-orange-500/10 border border-orange-500/20 text-orange-500 rounded-xl">
                <BarChart3 size={24} />
              </div>
              <span className="text-[8px] font-black uppercase tracking-widest text-zinc-500 px-3 py-1 bg-[var(--input-bg)] border border-[var(--glass-border)] rounded-full">Reporting</span>
            </div>
            
            <div className="space-y-2">
              <h3 className="text-xl font-black italic uppercase tracking-tight">Institutional Performance Auditing</h3>
              <p className="text-sm text-zinc-650 dark:text-zinc-400 leading-relaxed">
                Analyze win rates, average R-expectancy, win/loss streaks, and maximum drawdown percentages. Build deep insights with automated historical charting and categorization filters.
              </p>
            </div>
          </div>

        </div>
      </section>

      {/* 5. Signal Desk Simulator Section */}
      <section id="simulator" className="py-20 md:py-32 bg-[var(--input-bg)]/20 border-y border-[var(--glass-border)]">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          <div className="lg:col-span-5 space-y-6 text-left">
            <span className="text-[10px] font-black uppercase tracking-[0.25em] text-orange-500 block">• INTERACTIVE MONITOR •</span>
            <h2 className="text-3xl sm:text-4xl font-black uppercase tracking-tight italic">
              Live Signal Simulator
            </h2>
            <p className="text-sm text-zinc-650 dark:text-zinc-400 leading-relaxed">
              Witness how the CRT-ALGO console processes alerts in real time. Our servers fetch webhook events, validate user parameters, check current market structures, and execute orders across major crypto exchanges instantly.
            </p>
            <div className="flex items-center gap-4 text-xs font-bold text-zinc-550">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 bg-green-550 rounded-full animate-ping" />
                <span>Simulating Live Stream</span>
              </div>
              <span>•</span>
              <span>Refreshes every 8 seconds</span>
            </div>
          </div>

          <div className="lg:col-span-7">
            <div className="glass-panel p-6 bg-[var(--bg-surface)] border border-[var(--glass-border)] flex flex-col gap-4 text-left font-mono">
              <div className="flex items-center justify-between border-b border-[var(--glass-border)] pb-4">
                <span className="text-xs font-black uppercase text-zinc-900 dark:text-white flex items-center gap-2">
                  <Activity size={14} className="text-orange-500" /> Webhook Receiver Log
                </span>
                <span className="text-[8px] bg-orange-500/10 border border-orange-500/20 px-2 py-0.5 rounded text-orange-500 font-black">Active Listener</span>
              </div>
              
              <div className="space-y-3">
                {simulatedSignals.map((sig) => (
                  <div key={sig.id} className="p-3 bg-[var(--input-bg)] rounded-xl border border-[var(--glass-border)] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-3">
                      <span className={`text-[8.5px] font-black px-1.5 py-0.5 rounded ${sig.type === 'BUY' ? 'bg-emerald-500/20 text-emerald-450' : 'bg-red-500/20 text-red-450'}`}>
                        {sig.type}
                      </span>
                      <div>
                        <span className="font-bold text-zinc-900 dark:text-white">{sig.pair}</span>
                        <span className="text-[9px] text-zinc-500 block sm:inline sm:ml-2">Level: {sig.price}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between sm:justify-end gap-3">
                      <span className="text-[9px] text-zinc-550">Tf: {sig.tf}</span>
                      <span className={`text-[9px] font-black px-2 py-0.5 rounded border ${
                        sig.status.includes('TP') ? 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20' :
                        sig.status.includes('SL') ? 'text-red-400 bg-red-500/10 border-red-500/20' :
                        'text-orange-500 bg-orange-500/10 border-orange-500/25'
                      }`}>
                        {sig.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* 6. Pricing Tiers section */}
      <section id="pricing" className="py-20 md:py-32 max-w-7xl mx-auto px-6">
        <div className="text-center max-w-3xl mx-auto mb-16 md:mb-24 space-y-4">
          <span className="text-[10px] font-black uppercase tracking-[0.25em] text-orange-500 block">• TRANSPARENT PRICING •</span>
          <h2 className="text-3xl sm:text-4xl font-black uppercase tracking-tight italic">
            Select Your Trading Tier
          </h2>
          <p className="text-sm text-zinc-650 dark:text-zinc-400">
            Access automated signal execution, risk configuration templates, and comprehensive performance metrics.
          </p>
        </div>

        {loadingPlans ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="animate-spin text-orange-500" size={36} />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
            {plans.map((plan) => {
              const isTrial = plan.price === 0 || plan.id.includes('trial');
              return (
                <div 
                  key={plan.id}
                  className={`glass-panel p-8 flex flex-col justify-between gap-8 hover:border-orange-500/30 hover:shadow-[0_0_30px_var(--accent-glow)] transition-all duration-300 relative ${
                    plan.id.includes('ultimate') ? 'border-orange-500/40 bg-orange-500/[0.01]' : 'bg-zinc-500/[0.01]'
                  }`}
                >
                  {plan.id.includes('ultimate') && (
                    <span className="absolute top-0 right-0 bg-orange-500 text-white text-[8px] font-black tracking-widest px-4 py-1 rounded-bl-xl uppercase shadow-md">
                      POPULAR CHOICE
                    </span>
                  )}
                  {isTrial && (
                    <span className="absolute top-0 right-0 bg-fuchsia-600 text-white text-[8px] font-black tracking-widest px-4 py-1 rounded-bl-xl uppercase shadow-md">
                      TRIAL PERIOD
                    </span>
                  )}
                  
                  <div className="space-y-4">
                    <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest block">{plan.name}</span>
                    
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-black tracking-tighter italic">
                        {plan.price === 0 ? 'FREE' : `$${plan.price}`}
                      </span>
                      <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">
                        {plan.duration_text || `/ ${plan.duration} Days`}
                      </span>
                    </div>

                    <div className="border-t border-[var(--glass-border)] pt-6">
                      <ul className="space-y-3">
                        {plan.features.map((feat, i) => (
                          <li key={i} className="flex items-start gap-3 text-xs text-zinc-650 dark:text-zinc-350">
                            <Check size={14} className="text-orange-500 mt-0.5 shrink-0" />
                            <span>{feat}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <Link 
                    href="/signup" 
                    className={`text-center py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer ${
                      plan.id.includes('ultimate')
                        ? 'bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400 text-white shadow-lg'
                        : 'bg-[var(--input-bg)] hover:bg-[var(--glass-border-highlight)] border border-[var(--glass-border)] text-zinc-900 dark:text-white'
                    }`}
                  >
                    {isTrial ? 'Claim Free Trial' : 'Get Started Now'}
                  </Link>

                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* 7. Contact Us Form Section */}
      <section id="contact" className="py-20 md:py-32 bg-[var(--input-bg)]/20 border-t border-[var(--glass-border)]">
        <div className="max-w-4xl mx-auto px-6 text-center">
          
          <div className="mb-12 space-y-4">
            <span className="text-[10px] font-black uppercase tracking-[0.25em] text-orange-500 block">• GET IN TOUCH •</span>
            <h2 className="text-3xl sm:text-4xl font-black uppercase tracking-tight italic">
              Have Questions? Contact Us
            </h2>
            <p className="text-sm text-zinc-650 dark:text-zinc-400 max-w-xl mx-auto">
              Leave your inquiry below. Our administrative team monitors submissions 24/7 and will respond to your email as soon as possible.
            </p>
          </div>

          <div className="glass-panel p-6 md:p-10 bg-[var(--bg-surface)] border border-[var(--glass-border)] shadow-2xl rounded-2xl text-left max-w-2xl mx-auto relative group">
            
            {formStatus === 'success' ? (
              <div className="py-8 flex flex-col items-center justify-center text-center space-y-4 animate-in fade-in duration-300">
                <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 rounded-full">
                  <Check className="w-10 h-10" />
                </div>
                <h3 className="text-xl font-black italic uppercase tracking-tighter text-zinc-950 dark:text-white">Inquiry Submitted Successfully!</h3>
                <p className="text-xs font-bold text-zinc-550 dark:text-zinc-450 uppercase tracking-widest max-w-md">
                  Thank you for reaching out. We have logged your request under the admin console, and our team will get back to you shortly.
                </p>
                <button 
                  onClick={() => setFormStatus('idle')}
                  className="btn-secondary px-6 py-2.5 mt-2"
                >
                  Send another message
                </button>
              </div>
            ) : (
              <form onSubmit={handleContactSubmit} className="space-y-6">
                
                {formStatus === 'error' && (
                  <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3 text-red-500 animate-shake">
                    <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-black uppercase tracking-wider">Submission Error</p>
                      <p className="text-xs text-red-400 mt-1">{formErrorMessage}</p>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-2 flex flex-col">
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Full Name <span className="text-orange-500">*</span></label>
                    <input 
                      type="text" 
                      required
                      placeholder="e.g. John Doe"
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      className="input-modern w-full font-bold"
                    />
                  </div>
                  <div className="space-y-2 flex flex-col">
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Email Address <span className="text-orange-500">*</span></label>
                    <input 
                      type="email" 
                      required
                      placeholder="e.g. john@example.com"
                      value={formEmail}
                      onChange={(e) => setFormEmail(e.target.value)}
                      className="input-modern w-full font-bold"
                    />
                  </div>
                </div>

                <div className="space-y-2 flex flex-col">
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Subject</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Question about API trading keys"
                    value={formSubject}
                    onChange={(e) => setFormSubject(e.target.value)}
                    className="input-modern w-full font-bold"
                  />
                </div>

                <div className="space-y-2 flex flex-col">
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Message / Question <span className="text-orange-500">*</span></label>
                  <textarea 
                    required
                    placeholder="Type your question here in detail..."
                    value={formMessage}
                    onChange={(e) => setFormMessage(e.target.value)}
                    className="input-modern w-full h-36 resize-none font-bold"
                  />
                </div>

                <button 
                  type="submit"
                  disabled={sendingForm}
                  className="w-full btn-modern py-4 flex items-center justify-center gap-3 text-center disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {sendingForm ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>Sending Message...</span>
                    </>
                  ) : (
                    <>
                      <Mail size={16} />
                      <span>Submit Inquiry</span>
                    </>
                  )}
                </button>

              </form>
            )}

          </div>

        </div>
      </section>

      {/* 8. Footer */}
      <footer className="border-t border-[var(--glass-border)] py-12 bg-[var(--bg)]">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="text-center md:text-left">
            <h3 className="text-xl font-black uppercase tracking-tighter">
              CRT-ALGO<span className="text-orange-500">CONSOLE</span>
            </h3>
            <p className="text-[9px] uppercase tracking-widest font-black text-zinc-500 mt-1">
              © {new Date().getFullYear()} CRT-ALGO. ALL RIGHTS RESERVED.
            </p>
          </div>

          <div className="flex items-center gap-6 text-[10px] font-black uppercase tracking-widest text-zinc-550">
            <a href="#features" className="hover:text-orange-500 transition-colors">Features</a>
            <a href="#pricing" className="hover:text-orange-500 transition-colors">Pricing</a>
            <a href="#contact" className="hover:text-orange-500 transition-colors">Contact</a>
            <Link href="/login" className="hover:text-orange-500 transition-colors">Console Log</Link>
          </div>
        </div>
      </footer>

    </div>
  );
}