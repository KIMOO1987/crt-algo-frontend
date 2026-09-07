"use client";

import { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { ThemeToggle } from '@/components/ThemeToggle';
import AuthModal from '@/components/AuthModal';
import { motion, AnimatePresence } from 'framer-motion';
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
  MessageSquare,
  Compass,
  LayoutGrid,
  Target,
  Zap,
  ChevronRight
} from 'lucide-react';

const performanceData = [
  { day: 1, balance: 100000, pnl: 0 },
  { day: 2, balance: 100800, pnl: 800 },
  { day: 3, balance: 100300, pnl: -500 },
  { day: 4, balance: 101500, pnl: 1200 },
  { day: 5, balance: 102400, pnl: 900 },
  { day: 6, balance: 101900, pnl: -500 },
  { day: 7, balance: 103200, pnl: 1300 },
  { day: 8, balance: 104500, pnl: 1300 },
  { day: 9, balance: 103900, pnl: -600 },
  { day: 10, balance: 105400, pnl: 1500 },
  { day: 11, balance: 106300, pnl: 900 },
  { day: 12, balance: 105800, pnl: -500 },
  { day: 13, balance: 107600, pnl: 1800 },
  { day: 14, balance: 109100, pnl: 1500 },
  { day: 15, balance: 108400, pnl: -700 },
  { day: 16, balance: 110200, pnl: 1800 },
  { day: 17, balance: 111500, pnl: 1300 },
  { day: 18, balance: 110900, pnl: -600 },
  { day: 19, balance: 112800, pnl: 1900 },
  { day: 20, balance: 114200, pnl: 1400 },
  { day: 21, balance: 113500, pnl: -700 },
  { day: 22, balance: 115600, pnl: 2100 },
  { day: 23, balance: 117200, pnl: 1600 },
  { day: 24, balance: 116500, pnl: -700 },
  { day: 25, balance: 118900, pnl: 2400 },
  { day: 26, balance: 120800, pnl: 1900 },
  { day: 27, balance: 120000, pnl: -800 },
  { day: 28, balance: 122400, pnl: 2400 },
  { day: 29, balance: 124100, pnl: 1700 },
  { day: 30, balance: 123300, pnl: -800 },
  { day: 31, balance: 126102, pnl: 2802 }
];

const chartPoints = performanceData.map((d, i) => {
  const x = (i / (performanceData.length - 1)) * 100;
  const y = 90 - ((d.balance - 100000) / 26102) * 85;
  return `${x.toFixed(1)},${y.toFixed(1)}`;
});
const chartLinePath = `M ${chartPoints.join(' L ')}`;
const chartAreaPath = `${chartLinePath} L 100,100 L 0,100 Z`;

const executionHistory = [
  { asset: 'THETAUSDT.P', provider: 'CRYPTO', side: 'SELL', outcome: 'FULL TP HIT', realizedR: '+5.7R', date: '10/06/2026', type: 'win' },
  { asset: 'AZTECUSDT.P', provider: 'CRYPTO', side: 'BUY', outcome: 'PARTIAL WIN', realizedR: '+0.3R', date: '10/06/2026', type: 'partial' },
  { asset: 'HUSDT.P', provider: 'CRYPTO', side: 'BUY', outcome: 'PARTIAL WIN', realizedR: '+0.5R', date: '10/06/2026', type: 'partial' },
  { asset: 'NVDAUSDT.P', provider: 'CRYPTO', side: 'BUY', outcome: 'PARTIAL WIN', realizedR: '+0.2R', date: '10/06/2026', type: 'partial' },
  { asset: 'THETAUSDT.P', provider: 'CRYPTO', side: 'SELL', outcome: 'FULL TP HIT', realizedR: '+5.7R', date: '10/06/2026', type: 'win' },
  { asset: 'RSRUSDT.P', provider: 'CRYPTO', side: 'SELL', outcome: 'FULL TP HIT', realizedR: '+1.7R', date: '10/06/2026', type: 'win' },
  { asset: 'ALGOUSDT.P', provider: 'CRYPTO', side: 'SELL', outcome: 'FULL TP HIT', realizedR: '+2.0R', date: '10/06/2026', type: 'win' }
];

interface Plan {
  id: string;
  name: string;
  price: number;
  duration: number;
  duration_text: string;
  features: string[];
  icon_type?: string;
}

function LandingPageContent() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(true);

  // Auth Modal States
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [authError, setAuthError] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();

  // Interactive Tour States
  const [activeTourTab, setActiveTourTab] = useState<'dashboard' | 'radar' | 'performance' | 'bridges'>('dashboard');

  // Contact Modal State
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  
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
    async function checkUserAndParams() {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        router.push('/dashboard');
        return;
      }

      const authParam = searchParams.get('auth');
      const errorParam = searchParams.get('error');

      if (authParam === 'login' || authParam === 'signup') {
        setAuthMode(authParam);
        if (errorParam) {
          setAuthError(errorParam === 'auth_callback_failed' ? 'Authentication failed. Please try again.' : errorParam);
        }
        setIsAuthModalOpen(true);

        const newUrl = window.location.pathname;
        window.history.replaceState({ path: newUrl }, '', newUrl);
      }

      setCheckingAuth(false);
    }

    checkUserAndParams();
  }, [router, searchParams]);

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

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-[#050505] text-white flex flex-col items-center justify-center font-sans">
        <div className="absolute top-0 left-0 w-full h-full bg-orange-500/5 blur-[120px] pointer-events-none" />
        <div className="relative z-10 flex flex-col items-center gap-4 text-center">
          <h1 className="text-3xl font-black tracking-tighter uppercase drop-shadow-md">
            CRT-ALGO<span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-orange-600">CONSOLE</span>
          </h1>
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/20">
            <Loader2 className="animate-spin text-orange-500" size={14} />
            <span className="text-[9px] font-black text-orange-550 uppercase tracking-[0.2em]">Authenticating Operator...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--fg)] selection:bg-orange-500/30 overflow-x-hidden font-sans relative">
      
      {/* 1. Navbar */}
      <header className="sticky top-0 z-50 w-full border-b border-[var(--glass-border)] bg-[var(--bg)]/80 backdrop-blur-md transition-all">
        <div className="max-w-[1400px] mx-auto px-6 md:px-12 h-20 flex items-center justify-between">
          
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
            <button onClick={() => setIsContactModalOpen(true)} className="text-xs font-bold tracking-widest uppercase hover:text-orange-500 transition-colors cursor-pointer bg-transparent border-0 p-0">Contact</button>
          </nav>

          {/* CTAs */}
          <div className="hidden md:flex items-center gap-4">
            <ThemeToggle className="p-3.5 rounded-2xl bg-[var(--input-bg)] border border-[var(--glass-border)] text-zinc-500 hover:text-[var(--fg)] hover:border-orange-500/30 transition-all flex items-center justify-center shrink-0" />
            <button onClick={() => { setAuthMode('login'); setAuthError(null); setIsAuthModalOpen(true); }} className="btn-secondary px-5 py-2.5">
              Sign In
            </button>
            <button onClick={() => { setAuthMode('signup'); setIsAuthModalOpen(true); }} className="btn-modern px-5 py-2.5">
              Get Started
            </button>
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
            <button 
              onClick={() => { setMobileMenuOpen(false); setIsContactModalOpen(true); }}
              className="text-sm font-bold tracking-widest uppercase py-2 hover:text-orange-500 transition-colors cursor-pointer text-left bg-transparent border-0 p-0"
            >
              Contact
            </button>
            
            <div className="pt-4 border-t border-[var(--glass-border)] flex flex-col gap-3">
              <button onClick={() => { setMobileMenuOpen(false); setAuthMode('login'); setAuthError(null); setIsAuthModalOpen(true); }} className="btn-secondary w-full text-center py-3">
                Sign In
              </button>
              <button onClick={() => { setMobileMenuOpen(false); setAuthMode('signup'); setIsAuthModalOpen(true); }} className="btn-modern w-full text-center py-3">
                Get Started
              </button>
            </div>
          </div>
        )}
      </header>

      {/* 2. Hero Section */}
      <section className="relative pt-12 pb-20 md:py-32 overflow-hidden max-w-[1400px] mx-auto px-6 md:px-12">
        
        {/* Decorative Grid Pattern */}
        <div className="absolute inset-0 -z-20 opacity-30 dark:opacity-20 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
          
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
              <button onClick={() => { setAuthMode('signup'); setIsAuthModalOpen(true); }} className="btn-modern text-center py-4 px-8 flex items-center justify-center gap-3 w-full sm:w-auto">
                Launch Console Now <ArrowRight size={16} />
              </button>
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
        <div className="max-w-[1400px] mx-auto px-6 md:px-12 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
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

      {/* 3.5 Interactive Terminal Tour */}
      <section className="py-20 md:py-32 border-b border-[var(--glass-border)] max-w-[1400px] mx-auto px-6 md:px-12">
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <span className="text-[10px] font-black uppercase tracking-[0.25em] text-orange-500 block">• INTERACTIVE WALKTHROUGH •</span>
          <h2 className="text-3xl sm:text-4xl font-black uppercase tracking-tight italic">
            Inside the Console: Page-by-Page Audit
          </h2>
          <p className="text-sm text-zinc-650 dark:text-zinc-400">
            Explore the actual trading interfaces, bias scanners, and execution tunnels configured inside the CRT-ALGO platform.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left: Tab Selectors */}
          <div className="lg:col-span-4 flex flex-col gap-4">
            <button 
              onClick={() => setActiveTourTab('dashboard')}
              className={`p-5 rounded-2xl border text-left transition-all duration-300 flex flex-col gap-2 group cursor-pointer ${
                activeTourTab === 'dashboard'
                  ? 'bg-orange-500/5 border-orange-500/30 shadow-[0_0_20px_var(--accent-glow)]'
                  : 'bg-[var(--glass-bg)] border-[var(--glass-border)] hover:border-zinc-500/30'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className={`p-2 rounded-xl border transition-all ${
                  activeTourTab === 'dashboard' ? 'bg-orange-500/10 border-orange-500/30 text-orange-400' : 'bg-zinc-500/10 border-[var(--glass-border)] text-zinc-500'
                }`}>
                  <LayoutGrid size={16} />
                </span>
                <span className="text-xs font-black uppercase tracking-wider group-hover:text-orange-550 transition-colors">Live Dashboard & Active Trades</span>
              </div>
              <p className="text-[10.5px] text-zinc-500 dark:text-zinc-400 leading-relaxed font-sans">
                Track active long/short positions, edit stop-losses, monitor live margins, and compute real-time unrealized PnL curves.
              </p>
            </button>

            <button 
              onClick={() => setActiveTourTab('radar')}
              className={`p-5 rounded-2xl border text-left transition-all duration-300 flex flex-col gap-2 group cursor-pointer ${
                activeTourTab === 'radar'
                  ? 'bg-orange-500/5 border-orange-500/30 shadow-[0_0_20px_var(--accent-glow)]'
                  : 'bg-[var(--glass-bg)] border-[var(--glass-border)] hover:border-zinc-500/30'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className={`p-2 rounded-xl border transition-all ${
                  activeTourTab === 'radar' ? 'bg-orange-500/10 border-orange-500/30 text-orange-400' : 'bg-zinc-500/10 border-[var(--glass-border)] text-zinc-500'
                }`}>
                  <Compass size={16} />
                </span>
                <span className="text-xs font-black uppercase tracking-wider group-hover:text-orange-550 transition-colors">Alpha Radar & Symbol Audit</span>
              </div>
              <p className="text-[10.5px] text-zinc-500 dark:text-zinc-400 leading-relaxed font-sans">
                Scan multi-timeframe trends (M5 to D1) to ensure entry bias. Prune setups with pair-by-pair win ratios and profit expectancy diagnostics.
              </p>
            </button>

            <button 
              onClick={() => setActiveTourTab('performance')}
              className={`p-5 rounded-2xl border text-left transition-all duration-300 flex flex-col gap-2 group cursor-pointer ${
                activeTourTab === 'performance'
                  ? 'bg-orange-500/5 border-orange-500/30 shadow-[0_0_20px_var(--accent-glow)]'
                  : 'bg-[var(--glass-bg)] border-[var(--glass-border)] hover:border-zinc-500/30'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className={`p-2 rounded-xl border transition-all ${
                  activeTourTab === 'performance' ? 'bg-orange-500/10 border-orange-500/30 text-orange-400' : 'bg-zinc-500/10 border-[var(--glass-border)] text-zinc-500'
                }`}>
                  <LineChart size={16} />
                </span>
                <span className="text-xs font-black uppercase tracking-wider group-hover:text-orange-550 transition-colors">Performance Lab</span>
              </div>
              <p className="text-[10.5px] text-zinc-500 dark:text-zinc-400 leading-relaxed font-sans">
                Audit expectancy metrics, profit factors, drawdowns, win streaks, and visualize capital growth over time.
              </p>
            </button>

            <button 
              onClick={() => setActiveTourTab('bridges')}
              className={`p-5 rounded-2xl border text-left transition-all duration-300 flex flex-col gap-2 group cursor-pointer ${
                activeTourTab === 'bridges'
                  ? 'bg-orange-500/5 border-orange-500/30 shadow-[0_0_20px_var(--accent-glow)]'
                  : 'bg-[var(--glass-bg)] border-[var(--glass-border)] hover:border-zinc-500/30'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className={`p-2 rounded-xl border transition-all ${
                  activeTourTab === 'bridges' ? 'bg-orange-500/10 border-orange-500/30 text-orange-400' : 'bg-zinc-500/10 border-[var(--glass-border)] text-zinc-500'
                }`}>
                  <Cpu size={16} />
                </span>
                <span className="text-xs font-black uppercase tracking-wider group-hover:text-orange-550 transition-colors">Broker & Exchange Tunnels</span>
              </div>
              <p className="text-[10.5px] text-zinc-500 dark:text-zinc-400 leading-relaxed font-sans">
                MetaTrader 5 socket connection, cTrader execution bridge, and sub-millisecond API order dispatching on OKX and Bybit.
              </p>
            </button>
          </div>

          {/* Right: Mock Terminal Display */}
          <div className="lg:col-span-8 relative group w-full">
            <div className="absolute -inset-1.5 bg-gradient-to-r from-orange-500 to-amber-500 rounded-2xl blur-lg opacity-15 group-hover:opacity-25 transition duration-1000" />
            
            <div className="relative glass-panel bg-[var(--bg-surface)] border border-[var(--glass-border)] shadow-2xl rounded-2xl overflow-hidden flex flex-col min-h-[440px] font-mono text-left text-xs">
              {/* Window Header */}
              <div className="flex justify-between items-center p-4 border-b border-[var(--glass-border)] shrink-0 bg-black/10 dark:bg-black/20">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
                  <span className="w-2.5 h-2.5 rounded-full bg-yellow-500" />
                  <span className="w-2.5 h-2.5 rounded-full bg-green-500" />
                  <span className="text-[9px] uppercase tracking-widest text-zinc-500 font-bold ml-2 font-sans">
                    {activeTourTab === 'dashboard' && 'CRT-CONSOLE // LIVE_DASHBOARD'}
                    {activeTourTab === 'radar' && 'CRT-CONSOLE // ALPHA_RADAR_MATRIX'}
                    {activeTourTab === 'performance' && 'CRT-CONSOLE // PERFORMANCE_AUDITOR'}
                    {activeTourTab === 'bridges' && 'CRT-CONSOLE // BROKER_BRIDGE_SOCKETS'}
                  </span>
                </div>
                <div className="text-[8px] bg-orange-500/10 border border-orange-500/20 px-2 py-0.5 rounded text-orange-500 font-bold font-sans">
                  SECURE BRIDGE ACTIVE
                </div>
              </div>

              {/* Window Body */}
              <div className="p-6 flex-1 overflow-y-auto">
                {activeTourTab === 'dashboard' && (
                  <div className="space-y-6">
                    {/* Header metrics */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="p-3 bg-[var(--input-bg)] border border-[var(--glass-border)] rounded-xl">
                        <span className="text-[8px] text-zinc-500 block uppercase tracking-wider font-sans">ACCOUNT BALANCE</span>
                        <span className="text-sm font-black text-zinc-900 dark:text-white">$124,580.40</span>
                      </div>
                      <div className="p-3 bg-[var(--input-bg)] border border-[var(--glass-border)] rounded-xl">
                        <span className="text-[8px] text-zinc-500 block uppercase tracking-wider font-sans">EQUITY VALUATION</span>
                        <span className="text-sm font-black text-zinc-900 dark:text-white">$126,102.15</span>
                      </div>
                      <div className="p-3 bg-[var(--input-bg)] border border-[var(--glass-border)] rounded-xl">
                        <span className="text-[8px] text-zinc-500 block uppercase tracking-wider font-sans">UNREALIZED P&L</span>
                        <span className="text-sm font-black text-emerald-500">+$1,521.75</span>
                      </div>
                      <div className="p-3 bg-[var(--input-bg)] border border-[var(--glass-border)] rounded-xl">
                        <span className="text-[8px] text-zinc-500 block uppercase tracking-wider font-sans">API TUNNEL SPEED</span>
                        <span className="text-sm font-black text-orange-500">22ms</span>
                      </div>
                    </div>

                    {/* Positions */}
                    <div className="space-y-2.5">
                      <div className="text-[9px] uppercase tracking-widest text-zinc-550 font-bold font-sans">Active Operations (Connected Bots)</div>
                      
                      <div className="p-3 bg-emerald-500/5 border border-emerald-500/10 rounded-xl flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-[8px] font-black px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 uppercase">LONG</span>
                          <div>
                            <span className="font-bold text-zinc-900 dark:text-white font-sans text-xs">BTCUSDT</span>
                            <span className="text-[9px] text-zinc-500 block mt-0.5 font-sans">Size: 1.20 BTC • Entry: 68,240.00 • Mark: 68,410.00</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="font-bold text-emerald-500 block font-sans text-xs">+$204.00</span>
                          <span className="text-[8px] text-zinc-505 font-sans">TP1 Active</span>
                        </div>
                      </div>

                      <div className="p-3 bg-red-500/5 border border-red-500/10 rounded-xl flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-[8px] font-black px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 uppercase">SHORT</span>
                          <div>
                            <span className="font-bold text-zinc-900 dark:text-white font-sans text-xs">ETHUSDT</span>
                            <span className="text-[9px] text-zinc-500 block mt-0.5 font-sans">Size: 15.00 ETH • Entry: 3,780.00 • Mark: 3,745.00</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="font-bold text-emerald-500 block font-sans text-xs">+$525.00</span>
                          <span className="text-[8px] text-zinc-505 font-sans">Trailing SL</span>
                        </div>
                      </div>

                      <div className="p-3 bg-emerald-500/5 border border-emerald-500/10 rounded-xl flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-[8px] font-black px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 uppercase">LONG</span>
                          <div>
                            <span className="font-bold text-zinc-900 dark:text-white font-sans text-xs">SOLUSDT</span>
                            <span className="text-[9px] text-zinc-500 block mt-0.5 font-sans">Size: 120.00 SOL • Entry: 162.40 • Mark: 164.20</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="font-bold text-emerald-500 block font-sans text-xs">+$216.00</span>
                          <span className="text-[8px] text-zinc-505 font-sans">SL Breakeven</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeTourTab === 'radar' && (
                  <div className="space-y-4">
                    <div className="text-[9px] uppercase tracking-widest text-zinc-500 font-bold mb-2 font-sans">Multi-Timeframe Trend Alignment Matrix</div>
                    
                    <div className="overflow-x-auto no-scrollbar">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-[var(--glass-border)] text-zinc-550 text-[8px] uppercase font-sans">
                            <th className="pb-2 font-black">SYMBOL</th>
                            <th className="pb-2 font-black">H4 TREND</th>
                            <th className="pb-2 font-black">H1 BIAS</th>
                            <th className="pb-2 font-black">M15 ALIGN</th>
                            <th className="pb-2 font-black">M5 SIGNAL</th>
                            <th className="pb-2 font-black text-right">STATUS</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--glass-border)] text-[10.5px]">
                          <tr className="border-b border-[var(--glass-border)]">
                            <td className="py-2.5 font-bold text-zinc-900 dark:text-white font-sans">BTCUSDT</td>
                            <td className="py-2.5 text-emerald-500 font-bold">BULLISH</td>
                            <td className="py-2.5 text-emerald-500 font-bold">BULLISH</td>
                            <td className="py-2.5 text-emerald-500 font-bold">BULLISH</td>
                            <td className="py-2.5"><span className="px-1.5 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded text-[8.5px] font-bold">BUY TRIGGER</span></td>
                            <td className="py-2.5 text-right"><span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full text-[8px] font-black uppercase tracking-wider font-sans">ALIGNED</span></td>
                          </tr>
                          <tr className="border-b border-[var(--glass-border)]">
                            <td className="py-2.5 font-bold text-zinc-900 dark:text-white font-sans">ETHUSDT</td>
                            <td className="py-2.5 text-red-500 font-bold">BEARISH</td>
                            <td className="py-2.5 text-red-500 font-bold">BEARISH</td>
                            <td className="py-2.5 text-red-500 font-bold">BEARISH</td>
                            <td className="py-2.5"><span className="px-1.5 py-0.5 bg-red-500/10 text-red-400 border border-red-500/20 rounded text-[8.5px] font-bold">SELL TRIGGER</span></td>
                            <td className="py-2.5 text-right"><span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full text-[8px] font-black uppercase tracking-wider font-sans">ALIGNED</span></td>
                          </tr>
                          <tr className="border-b border-[var(--glass-border)]">
                            <td className="py-2.5 font-bold text-zinc-900 dark:text-white font-sans">SOLUSDT</td>
                            <td className="py-2.5 text-emerald-500 font-bold">BULLISH</td>
                            <td className="py-2.5 text-red-500 font-bold">BEARISH</td>
                            <td className="py-2.5 text-zinc-500 font-bold">NEUTRAL</td>
                            <td className="py-2.5"><span className="px-1.5 py-0.5 bg-zinc-500/10 text-zinc-400 border border-[var(--glass-border)] rounded text-[8.5px] font-bold">HOLD</span></td>
                            <td className="py-2.5 text-right"><span className="px-2 py-0.5 bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 rounded-full text-[8px] font-black uppercase tracking-wider font-sans">CONFLICT</span></td>
                          </tr>
                          <tr>
                            <td className="py-2.5 font-bold text-zinc-900 dark:text-white font-sans">AVAXUSDT</td>
                            <td className="py-2.5 text-red-500 font-bold">BEARISH</td>
                            <td className="py-2.5 text-emerald-500 font-bold">BULLISH</td>
                            <td className="py-2.5 text-emerald-500 font-bold">BULLISH</td>
                            <td className="py-2.5"><span className="px-1.5 py-0.5 bg-emerald-500/5 text-zinc-400 border border-[var(--glass-border)] rounded text-[8.5px] font-bold">BUY SETUP</span></td>
                            <td className="py-2.5 text-right"><span className="px-2 py-0.5 bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 rounded-full text-[8px] font-black uppercase tracking-wider font-sans">TREND MISALIGN</span></td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {activeTourTab === 'performance' && (
                  <div className="space-y-6">
                    {/* Performance metrics grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {/* WIN RATE */}
                      <div className="p-4 bg-[var(--input-bg)] border border-[var(--glass-border)] rounded-xl flex flex-col justify-between h-[90px] relative">
                        <div className="flex justify-between items-start">
                          <span className="text-[8px] text-zinc-550 block uppercase tracking-wider font-sans font-black">WIN RATE</span>
                          <span className="p-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-500 flex items-center justify-center">
                            <Target size={12} />
                          </span>
                        </div>
                        <span className="text-xl font-black italic tracking-tighter text-indigo-500 block font-sans">59.2%</span>
                      </div>

                      {/* PROFIT FACTOR */}
                      <div className="p-4 bg-[var(--input-bg)] border border-[var(--glass-border)] rounded-xl flex flex-col justify-between h-[90px] relative">
                        <div className="flex justify-between items-start">
                          <span className="text-[8px] text-zinc-550 block uppercase tracking-wider font-sans font-black">PROFIT FACTOR</span>
                          <span className="p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center justify-center">
                            <TrendingUp size={12} />
                          </span>
                        </div>
                        <span className="text-xl font-black italic tracking-tighter text-emerald-500 block font-sans">2.83</span>
                      </div>

                      {/* TOTAL NET R */}
                      <div className="p-4 bg-[var(--input-bg)] border border-[var(--glass-border)] rounded-xl flex flex-col justify-between h-[90px] relative">
                        <div className="flex justify-between items-start">
                          <span className="text-[8px] text-zinc-550 block uppercase tracking-wider font-sans font-black">TOTAL NET R</span>
                          <span className="p-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-500 flex items-center justify-center">
                            <Zap size={12} />
                          </span>
                        </div>
                        <span className="text-xl font-black italic tracking-tighter text-blue-500 block font-sans">+7455.1R</span>
                      </div>

                      {/* EXPECTANCY */}
                      <div className="p-4 bg-[var(--input-bg)] border border-[var(--glass-border)] rounded-xl flex flex-col justify-between h-[90px] relative">
                        <div className="flex justify-between items-start">
                          <span className="text-[8px] text-zinc-550 block uppercase tracking-wider font-sans font-black">EXPECTANCY</span>
                          <span className="p-1.5 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 flex items-center justify-center">
                            <Activity size={12} />
                          </span>
                        </div>
                        <span className="text-xl font-black italic tracking-tighter text-yellow-500 block font-sans">0.75R</span>
                      </div>
                    </div>

                    {/* Execution History Table */}
                    <div className="space-y-2">
                      <div className="text-[9px] uppercase tracking-widest text-zinc-550 font-bold font-sans">Active Execution Log & Realized Metrics</div>
                      <div className="border border-[var(--glass-border)] bg-black/5 dark:bg-black/20 rounded-xl p-4 overflow-x-auto no-scrollbar">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="border-b border-[var(--glass-border)] text-zinc-550 text-[8px] uppercase font-sans">
                              <th className="pb-2 font-black">ASSET / PROVIDER</th>
                              <th className="pb-2 font-black">SIDE</th>
                              <th className="pb-2 font-black">OUTCOME</th>
                              <th className="pb-2 font-black">REALIZED R</th>
                              <th className="pb-2 font-black">EXECUTION</th>
                              <th className="pb-2 font-black text-right">VIEW</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[var(--glass-border)] text-[10.5px]">
                            {executionHistory.map((row, idx) => (
                              <tr key={idx} className="border-b border-[var(--glass-border)] last:border-b-0 hover:bg-black/5 dark:hover:bg-white/5 transition-all">
                                <td className="py-2.5">
                                  <span className="font-sans font-black italic tracking-tight text-zinc-900 dark:text-white uppercase block">
                                    {row.asset}
                                  </span>
                                  <span className="text-[7.5px] text-zinc-500 font-sans tracking-widest uppercase block mt-0.5">
                                    {row.provider}
                                  </span>
                                </td>
                                <td className="py-2.5">
                                  {row.side === 'SELL' ? (
                                    <span className="px-2 py-0.5 bg-red-500/10 text-red-500 border border-red-500/20 rounded-md text-[8px] font-black uppercase font-sans tracking-wide">
                                      SELL
                                    </span>
                                  ) : (
                                    <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 rounded-md text-[8px] font-black uppercase font-sans tracking-wide">
                                      BUY
                                    </span>
                                  )}
                                </td>
                                <td className="py-2.5">
                                  {row.type === 'win' ? (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-500/5 text-emerald-500 border border-emerald-500/15 rounded-md text-[8px] font-extrabold uppercase font-sans tracking-wide">
                                      <span className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
                                      FULL TP HIT
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-yellow-500/5 text-yellow-500 border border-yellow-500/15 rounded-md text-[8px] font-extrabold uppercase font-sans tracking-wide">
                                      <span className="w-1.5 h-1.5 rounded-full bg-yellow-500" />
                                      PARTIAL WIN
                                    </span>
                                  )}
                                </td>
                                <td className="py-2.5">
                                  <span className={`font-black font-sans ${row.type === 'win' ? 'text-emerald-500' : 'text-yellow-500'}`}>
                                    {row.realizedR}
                                  </span>
                                </td>
                                <td className="py-2.5 font-mono text-[9.5px] text-zinc-500 dark:text-zinc-400 font-bold">
                                  {row.date}
                                </td>
                                <td className="py-2.5 text-right">
                                  <button className="inline-flex w-5 h-5 items-center justify-center rounded-full border border-[var(--glass-border)] bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-zinc-550 dark:text-zinc-450 hover:text-zinc-900 dark:hover:text-white transition-all cursor-pointer">
                                    <ChevronRight size={10} />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}

                {activeTourTab === 'bridges' && (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center text-[9px] uppercase tracking-widest text-zinc-550 font-bold font-sans">
                      <span>Live execution socket telemetry</span>
                      <span className="text-[8px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/25 px-1.5 py-0.5 rounded font-black">LATENCY: 8ms</span>
                    </div>

                    <div className="border border-[var(--glass-border)] p-4 rounded-xl font-mono text-[10.5px] space-y-1.5 text-zinc-800 dark:text-zinc-200 bg-transparent">
                      <div className="text-zinc-500 dark:text-zinc-400">[09:42:15] [listener] waiting for incoming tradingview webhooks...</div>
                      <div>[09:43:02] <span className="text-orange-600 dark:text-orange-400 font-bold">[webhook]</span> received: <span className="text-zinc-900 dark:text-white font-extrabold">TV_ALERT_SOL_LONG</span> (symbol=SOLUSDT, tf=M5)</div>
                      <div className="text-zinc-500 dark:text-zinc-400">[09:43:02] [radar] validating multi-timeframe trend alignment...</div>
                      <div>[09:43:02] <span className="text-emerald-600 dark:text-emerald-450 font-bold">[radar]</span> H4=BULLISH, H1=BULLISH, M15=BULLISH -&gt; <span className="text-emerald-650 dark:text-emerald-400 font-extrabold">bias aligned.</span></div>
                      <div className="text-zinc-550 dark:text-zinc-450">[09:43:03] [bridge] executing buy order on okx & bybit (size=100 SOL)...</div>
                      <div>[09:43:03] <span className="text-blue-600 dark:text-blue-400 font-bold">[okx]</span> socket response: <span className="text-emerald-650 dark:text-emerald-400 font-extrabold">200 OK</span> (order_id=984321, price=162.40)</div>
                      <div>[09:43:03] <span className="text-blue-600 dark:text-blue-400 font-bold">[bybit]</span> socket response: <span className="text-emerald-650 dark:text-emerald-400 font-extrabold">200 OK</span> (order_id=456721, price=162.40)</div>
                      <div className="text-zinc-500 dark:text-zinc-400">[09:43:04] [mt5-bridge] tunneling to meta-trader 5 terminal...</div>
                      <div>[09:43:04] <span className="text-fuchsia-600 dark:text-fuchsia-400 font-bold">[mt5]</span> order filled successfully: <span className="text-zinc-900 dark:text-white font-extrabold">LONG 1.0 Lot</span> at 162.40</div>
                      <div className="text-zinc-500 dark:text-zinc-400">[09:43:05] <span className="text-orange-650 dark:text-orange-500 font-bold">[system]</span> target execution completed in 32ms.</div>
                    </div>
                  </div>
                )}
              </div>

              {/* Status footer bar */}
              <div className="border-t border-[var(--glass-border)] p-3 bg-black/10 dark:bg-black/20 flex flex-wrap gap-4 items-center justify-between text-[8.5px] uppercase font-bold text-zinc-550 shrink-0 font-sans">
                <div className="flex gap-4">
                  <div className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" /> OKX BRIDGE: ONLINE</div>
                  <div className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" /> BYBIT BRIDGE: ONLINE</div>
                  <div className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" /> MT5 PLUG: CONNECTED</div>
                  <div className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 bg-orange-500 rounded-full" /> CTRADER: LISTENING</div>
                </div>
                <div>SECURE PKCE ENCRYPTION ENABLED</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Features presentation (Bento box grid) */}
      <section id="features" className="py-20 md:py-32 max-w-[1400px] mx-auto px-6 md:px-12">
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
          
          {/* Card 1: Dashboard Console & Active Trades */}
          <div className="glass-panel md:col-span-6 p-6 md:p-8 bg-zinc-500/[0.01] flex flex-col justify-between gap-6 hover:border-orange-500/30 transition-all duration-300">
            <div className="flex items-center justify-between">
              <div className="p-3 bg-orange-500/10 border border-orange-500/20 text-orange-400 rounded-xl">
                <LayoutGrid size={24} />
              </div>
              <span className="text-[8px] font-black uppercase tracking-widest text-zinc-500 px-3 py-1 bg-[var(--input-bg)] border border-[var(--glass-border)] rounded-full">Core Interface</span>
            </div>
            
            <div className="space-y-2">
              <h3 className="text-xl font-black italic uppercase tracking-tight">Live Dashboard & Active Monitoring</h3>
              <p className="text-sm text-zinc-650 dark:text-zinc-400 leading-relaxed">
                Connect and govern your full trade workspace in one console. Monitor active positions with live unrealized PnL computations, margin thresholds, real-time stop-loss (SL) triggers, and automated trailing indicators.
              </p>
            </div>
          </div>

          {/* Card 2: Alpha Radar & Trend Scanner */}
          <div className="glass-panel md:col-span-6 p-6 md:p-8 bg-zinc-500/[0.01] flex flex-col justify-between gap-6 hover:border-orange-500/30 transition-all duration-300">
            <div className="flex items-center justify-between">
              <div className="p-3 bg-orange-500/10 border border-orange-500/20 text-orange-400 rounded-xl">
                <Compass size={24} />
              </div>
              <span className="text-[8px] font-black uppercase tracking-widest text-zinc-550 px-3 py-1 bg-[var(--input-bg)] border border-[var(--glass-border)] rounded-full">Bias Check</span>
            </div>
            
            <div className="space-y-2">
              <h3 className="text-xl font-black italic uppercase tracking-tight">Alpha Radar & Timeframe Scanner</h3>
              <p className="text-sm text-zinc-650 dark:text-zinc-400 leading-relaxed">
                Prune erratic setups with our multi-timeframe bias matrix. Alpha Radar automatically scans higher timeframe trends (H4/D1) and aligns them with your lower entry timeframes (M5/M15) to confirm trend direction before execution.
              </p>
            </div>
          </div>

          {/* Card 3: cTrader & MT5 Broker Bridges */}
          <div className="glass-panel md:col-span-4 p-6 md:p-8 bg-zinc-500/[0.01] flex flex-col justify-between gap-6 hover:border-orange-500/30 transition-all duration-300">
            <div className="p-3 bg-orange-500/10 border border-orange-500/20 text-orange-450 rounded-xl w-fit">
              <Layers size={24} />
            </div>
            
            <div className="space-y-2">
              <h3 className="text-xl font-black italic uppercase tracking-tight">MetaTrader 5 & cTrader Bridges</h3>
              <p className="text-sm text-zinc-650 dark:text-zinc-400 leading-relaxed">
                Connect custom TradingView indicator webhooks directly to MetaTrader 5 and cTrader accounts. The bridge translates JSON alerts into instant socket execution events.
              </p>
            </div>
          </div>

          {/* Card 4: Crypto Exchange Tunnels (OKX / Bybit) */}
          <div className="glass-panel md:col-span-4 p-6 md:p-8 bg-zinc-500/[0.01] flex flex-col justify-between gap-6 hover:border-orange-500/30 transition-all duration-300">
            <div className="p-3 bg-orange-500/10 border border-orange-500/20 text-orange-450 rounded-xl w-fit">
              <Cpu size={24} />
            </div>
            
            <div className="space-y-2">
              <h3 className="text-xl font-black italic uppercase tracking-tight">Bybit & OKX Bot Tunnels</h3>
              <p className="text-sm text-zinc-650 dark:text-zinc-400 leading-relaxed">
                Establish direct API execution hooks to OKX and Bybit accounts. Leverage sub-millisecond pkce order matching to automate trades with precise sizing.
              </p>
            </div>
          </div>

          {/* Card 5: Performance Analytics Lab */}
          <div className="glass-panel md:col-span-4 p-6 md:p-8 bg-zinc-500/[0.01] flex flex-col justify-between gap-6 hover:border-orange-500/30 transition-all duration-300">
            <div className="p-3 bg-orange-500/10 border border-orange-500/20 text-orange-450 rounded-xl w-fit">
              <LineChart size={24} />
            </div>
            
            <div className="space-y-2">
              <h3 className="text-xl font-black italic uppercase tracking-tight">Performance Lab</h3>
              <p className="text-sm text-zinc-650 dark:text-zinc-400 leading-relaxed">
                Audit metrics like win factor, profit expectancy, drawdown curves, win streaks, Sortino ratios, and generate detailed equity charts automatically.
              </p>
            </div>
          </div>

          {/* Card 6: Symbol Audit & Statistics */}
          <div className="glass-panel md:col-span-6 p-6 md:p-8 bg-zinc-500/[0.01] flex flex-col justify-between gap-6 hover:border-orange-500/30 transition-all duration-300">
            <div className="flex items-center justify-between">
              <div className="p-3 bg-orange-500/10 border border-orange-500/20 text-orange-440 rounded-xl">
                <BarChart3 size={24} />
              </div>
              <span className="text-[8px] font-black uppercase tracking-widest text-zinc-550 px-3 py-1 bg-[var(--input-bg)] border border-[var(--glass-border)] rounded-full">Asset Stats</span>
            </div>
            
            <div className="space-y-2">
              <h3 className="text-xl font-black italic uppercase tracking-tight">Symbol Performance Audit</h3>
              <p className="text-sm text-zinc-650 dark:text-zinc-400 leading-relaxed">
                Identify and isolate your most profitable asset pairs. Symbol Audit tracks profit factors, win factors, and optimal hold periods on a per-coin basis, allowing you to prune underperforming setups and optimize capital allocation.
              </p>
            </div>
          </div>

          {/* Card 7: Indicator Library & Webhook Resources */}
          <div className="glass-panel md:col-span-6 p-6 md:p-8 bg-zinc-500/[0.01] flex flex-col justify-between gap-6 hover:border-orange-500/30 transition-all duration-300">
            <div className="flex items-center justify-between">
              <div className="p-3 bg-orange-500/10 border border-orange-500/20 text-orange-440 rounded-xl">
                <TrendingUp size={24} />
              </div>
              <span className="text-[8px] font-black uppercase tracking-widest text-zinc-550 px-3 py-1 bg-[var(--input-bg)] border border-[var(--glass-border)] rounded-full">Operator Manuals</span>
            </div>
            
            <div className="space-y-2">
              <h3 className="text-xl font-black italic uppercase tracking-tight">Indicator Resources & Guides</h3>
              <p className="text-sm text-zinc-650 dark:text-zinc-400 leading-relaxed">
                Deploy and scale with dedicated indicator scripts. Access complete webhook payload templates, step-by-step TradingView alert configuration manuals, and broker socket parameters for a frictionless integration.
              </p>
            </div>
          </div>

        </div>
      </section>

      {/* 5. Signal Desk Simulator Section */}
      <section id="simulator" className="py-20 md:py-32 bg-[var(--input-bg)]/20 border-y border-[var(--glass-border)]">
        <div className="max-w-[1400px] mx-auto px-6 md:px-12 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          <div className="lg:col-span-5 space-y-6 text-left">
            <span className="text-[10px] font-black uppercase tracking-[0.25em] text-orange-500 block">• INTERACTIVE MONITOR •</span>
            <h2 className="text-3xl sm:text-4xl font-black uppercase tracking-tight italic">
              Live Signal Simulator
            </h2>
            <p className="text-sm text-zinc-650 dark:text-zinc-400 leading-relaxed">
              Witness how the CRT-ALGO console processes alerts in real time. Our servers fetch webhook events, validate user parameters, check current market structures, and execute orders across major crypto exchanges instantly.
            </p>
            <div className="flex items-center gap-4 text-xs font-bold text-zinc-550 flex-wrap">
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <span className="w-2.5 h-2.5 bg-green-550 rounded-full animate-ping" />
                <span>Simulating Stream</span>
              </div>
              <span>•</span>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                <span>MT5 Bridge: Online</span>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                <span>cTrader Bridge: Online</span>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                <span>OKX API: Online</span>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                <span>Bybit API: Online</span>
              </div>
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
      <section id="pricing" className="py-20 md:py-32 max-w-[1400px] mx-auto px-6 md:px-12">
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

                  <button 
                    onClick={() => { setAuthMode('signup'); setIsAuthModalOpen(true); }}
                    className={`text-center py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer ${
                      plan.id.includes('ultimate')
                        ? 'bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400 text-white shadow-lg'
                        : 'bg-[var(--input-bg)] hover:bg-[var(--glass-border-highlight)] border border-[var(--glass-border)] text-zinc-900 dark:text-white'
                    }`}
                  >
                    {isTrial ? 'Claim Free Trial' : 'Get Started Now'}
                  </button>

                </div>
              );
            })}
          </div>
        )}
      </section>



      {/* 8. Footer */}
      <footer className="border-t border-[var(--glass-border)] py-12 bg-[var(--bg)]">
        <div className="max-w-[1400px] mx-auto px-6 md:px-12 flex flex-col md:flex-row items-center justify-between gap-6">
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
            <button onClick={() => setIsContactModalOpen(true)} className="hover:text-orange-500 transition-colors cursor-pointer bg-transparent border-0 p-0">Contact</button>
            <button onClick={() => { setAuthMode('login'); setAuthError(null); setIsAuthModalOpen(true); }} className="hover:text-orange-500 transition-colors cursor-pointer">Console Log</button>
          </div>
        </div>
      </footer>

      {/* Auth Modal Popup Overlay */}
      <AuthModal 
        isOpen={isAuthModalOpen} 
        onClose={() => setIsAuthModalOpen(false)} 
        initialMode={authMode}
        errorMessage={authError}
      />

      {/* Contact Modal Popup Overlay */}
      <AnimatePresence>
        {isContactModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
            <div className="absolute inset-0 cursor-default" onClick={() => setIsContactModalOpen(false)} />
            
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 15 }} 
              animate={{ scale: 1, opacity: 1, y: 0 }} 
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              transition={{ duration: 0.3 }}
              className="glass-panel w-full max-w-2xl p-6 md:p-10 bg-gradient-to-br from-[var(--bg-surface)] to-[var(--bg)] border border-[var(--glass-border)] rounded-2xl shadow-[0_0_80px_rgba(0,0,0,0.4)] relative overflow-hidden preserve-3d z-10"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="absolute top-0 left-0 w-full h-full bg-orange-500/5 blur-[80px] pointer-events-none" />

              <div className="flex justify-between items-start mb-6 shrink-0 relative z-10">
                <div className="text-left">
                  <span className="text-[9px] font-black uppercase tracking-[0.25em] text-orange-500 block">• GET IN TOUCH •</span>
                  <h2 className="text-2xl font-black tracking-tighter uppercase drop-shadow-md flex items-center gap-2 mt-1">
                    Have Questions? Contact Us
                  </h2>
                </div>
                <button onClick={() => setIsContactModalOpen(false)} className="p-1.5 hover:bg-black/10 dark:hover:bg-white/10 rounded-lg transition-all cursor-pointer">
                  <X size={18} className="text-zinc-555 hover:text-white" />
                </button>
              </div>

              <div className="relative z-10 max-h-[70vh] overflow-y-auto pr-1 no-scrollbar">
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
                      onClick={() => setIsContactModalOpen(false)}
                      className="btn-secondary px-6 py-2.5 mt-2"
                    >
                      Close Modal
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleContactSubmit} className="space-y-5 text-left">
                    {formStatus === 'error' && (
                      <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3 text-red-500 animate-shake">
                        <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs font-black uppercase tracking-wider">Submission Error</p>
                          <p className="text-xs text-red-400 mt-1">{formErrorMessage}</p>
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                        <label className="text-[10px] font-black text-zinc-550 uppercase tracking-widest ml-1">Email Address <span className="text-orange-500">*</span></label>
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
                      <label className="text-[10px] font-black text-zinc-550 uppercase tracking-widest ml-1">Subject</label>
                      <input 
                        type="text" 
                        placeholder="e.g. Question about API trading keys"
                        value={formSubject}
                        onChange={(e) => setFormSubject(e.target.value)}
                        className="input-modern w-full font-bold"
                      />
                    </div>

                    <div className="space-y-2 flex flex-col">
                      <label className="text-[10px] font-black text-zinc-550 uppercase tracking-widest ml-1">Message / Question <span className="text-orange-500">*</span></label>
                      <textarea 
                        required
                        placeholder="Type your question here in detail..."
                        value={formMessage}
                        onChange={(e) => setFormMessage(e.target.value)}
                        className="input-modern w-full h-32 resize-none font-bold"
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
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}

export default function LandingPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#050505] text-white flex flex-col items-center justify-center font-sans">
        <div className="absolute top-0 left-0 w-full h-full bg-orange-500/5 blur-[120px] pointer-events-none" />
        <div className="relative z-10 flex flex-col items-center gap-4 text-center">
          <h1 className="text-3xl font-black tracking-tighter uppercase drop-shadow-md">
            CRT-ALGO<span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-orange-600">CONSOLE</span>
          </h1>
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/20">
            <Loader2 className="animate-spin text-orange-500" size={14} />
            <span className="text-[9px] font-black text-orange-550 uppercase tracking-[0.2em]">Loading Core Console...</span>
          </div>
        </div>
      </div>
    }>
      <LandingPageContent />
    </Suspense>
  );
}