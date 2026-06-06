"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabaseClient';
import { 
  Loader2, 
  Globe, 
  Lock, 
  CheckCircle2, 
  AlertTriangle, 
  ArrowRight, 
  User, 
  Sparkles,
  ExternalLink,
  ChevronRight,
  Info,
  CreditCard,
  Bitcoin,
  Copy,
  Check,
  Crown,
  AlertCircle
} from 'lucide-react';

interface InviteRequest {
  id: string;
  tradingview_username: string;
  indicator_id: string;
  indicator_name: string;
  status: 'pending' | 'approved' | 'rejected' | 'pending_payment';
  payment_method: 'FREE' | 'CRYPTO' | 'WHOP';
  crypto_hash: string | null;
  payment_amount: number;
  duration_months: number;
  created_at: string;
}

// Configurable Whop checkout links
const WHOP_LINKS = {
  monthly: "https://whop.com/kimoo-crt-pro-e122/kimoo-crt-pro-02/",
  six_month: "https://whop.com/kimoo-crt-pro-e122/kimoo-crt-pro-cd/",
  twelve_month: "https://whop.com/kimoo-crt-pro-e122/kimoo-crt-pro-yearly-subscription/"
};


const WALLETS = [
  { network: 'USDT (ERC20)', address: '0x79adb2f07fc055e2c858d6edf25a37dce43de00a' },
  { network: 'USDT (TRC20)', address: 'TMfFLoNrLm21YDRcA3oej8ZdksSbNKg8Sb' },
  { network: 'USDT (BEP20)', address: '0x79adb2f07fc055e2c858d6edf25a37dce43de00a' },
];

export default function ResourcesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [requests, setRequests] = useState<Record<string, InviteRequest>>({});
  
  // Modal 1: Free Indicator Request (7H Profiling)
  const [isFreeModalOpen, setIsFreeModalOpen] = useState(false);
  const [freeIndicator, setFreeIndicator] = useState<{ id: string; name: string } | null>(null);
  const [freeTvUsername, setFreeTvUsername] = useState('');
  const [freeSubmitting, setFreeSubmitting] = useState(false);
  const [freeModalError, setFreeModalError] = useState('');

  // Modal 2: Paid Indicator Checkout (CRT-Algo +Ultimate)
  const [isPaidModalOpen, setIsPaidModalOpen] = useState(false);
  const [paidIndicator, setPaidIndicator] = useState<{ id: string; name: string } | null>(null);
  
  // Checkout Steps: 'plan' -> 'method' -> 'crypto_form' or 'whop_form'
  const [checkoutStep, setCheckoutStep] = useState<'plan' | 'method' | 'crypto_form' | 'whop_form'>('plan');
  const [selectedPlan, setSelectedPlan] = useState<{ duration: number; price: number; id: string } | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'CRYPTO' | 'WHOP' | null>(null);
  
  // Crypto Form inputs
  const [cryptoTvUsername, setCryptoTvUsername] = useState('');
  const [cryptoTxHash, setCryptoTxHash] = useState('');
  const [cryptoSubmitting, setCryptoSubmitting] = useState(false);
  const [cryptoError, setCryptoError] = useState('');
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);

  // Whop Form inputs
  const [whopTvUsername, setWhopTvUsername] = useState('');
  const [whopSubmitting, setWhopSubmitting] = useState(false);
  const [whopError, setWhopError] = useState('');

  // Modal 3: Claim Whop Username (if purchased via Whop but missing username)
  const [isClaimModalOpen, setIsClaimModalOpen] = useState(false);
  const [claimTvUsername, setClaimTvUsername] = useState('');
  const [claimSubmitting, setClaimSubmitting] = useState(false);
  const [claimError, setClaimError] = useState('');

  // Initial Fetch
  const fetchUserData = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      router.push('/login');
      return;
    }
    setUser(session.user);

    // Fetch user invites
    const { data: invites, error } = await supabase
      .from('tradingview_invites')
      .select('*')
      .eq('user_id', session.user.id);

    if (error) {
      console.error("Error fetching TV invites:", error);
    } else if (invites) {
      const invitesMap = invites.reduce((acc, curr) => {
        acc[curr.indicator_id] = curr;
        return acc;
      }, {} as Record<string, InviteRequest>);
      setRequests(invitesMap);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchUserData();
  }, [router]);

  // Handle Free Request Submit (7H Profiling)
  const openFreeModal = (id: string, name: string) => {
    const existing = requests[id];
    setFreeIndicator({ id, name });
    setFreeTvUsername(existing ? existing.tradingview_username : '');
    setFreeModalError('');
    setIsFreeModalOpen(true);
  };

  const handleFreeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!freeIndicator || !user) return;
    if (!freeTvUsername.trim()) {
      setFreeModalError('Please enter a valid TradingView username.');
      return;
    }

    setFreeSubmitting(true);
    setFreeModalError('');

    try {
      const { data, error } = await supabase
        .from('tradingview_invites')
        .upsert({
          user_id: user.id,
          tradingview_username: freeTvUsername.trim(),
          indicator_id: freeIndicator.id,
          indicator_name: freeIndicator.name,
          status: 'pending',
          payment_method: 'FREE',
          payment_amount: 0,
          duration_months: 0,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,indicator_id'
        })
        .select()
        .single();

      if (error) throw error;

      setRequests(prev => ({ ...prev, [freeIndicator.id]: data as InviteRequest }));
      setIsFreeModalOpen(false);
    } catch (err: any) {
      setFreeModalError(err.message || 'Failed to submit request.');
    } finally {
      setFreeSubmitting(false);
    }
  };

  // Handle Paid Checkout Submit (CRT-Algo +Ultimate)
  const openPaidCheckout = (id: string, name: string) => {
    setPaidIndicator({ id, name });
    setSelectedPlan(null);
    setPaymentMethod(null);
    setCheckoutStep('plan');
    setCryptoTvUsername('');
    setCryptoTxHash('');
    setCryptoError('');
    setWhopTvUsername('');
    setWhopError('');
    setIsPaidModalOpen(true);
  };

  const handlePlanSelect = (duration: number, price: number, planId: string) => {
    setSelectedPlan({ duration, price, id: planId });
    setCheckoutStep('method');
  };

  const handlePaymentMethodSelect = (method: 'CRYPTO' | 'WHOP') => {
    setPaymentMethod(method);
    if (method === 'WHOP') {
      setCheckoutStep('whop_form');
    } else {
      setCheckoutStep('crypto_form');
    }
  };

  const handleWhopSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paidIndicator || !selectedPlan || !user) return;
    if (!whopTvUsername.trim()) {
      setWhopError('Please enter your TradingView username.');
      return;
    }

    setWhopSubmitting(true);
    setWhopError('');

    try {
      const { data, error } = await supabase
        .from('tradingview_invites')
        .upsert({
          user_id: user.id,
          tradingview_username: whopTvUsername.trim(),
          indicator_id: paidIndicator.id,
          indicator_name: paidIndicator.name,
          status: 'pending_payment',
          payment_method: 'WHOP',
          payment_amount: selectedPlan.price,
          duration_months: selectedPlan.duration,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,indicator_id'
        })
        .select()
        .single();

      if (error) throw error;

      setRequests(prev => ({ ...prev, [paidIndicator.id]: data as InviteRequest }));

      const whopUrl = selectedPlan.duration === 12 ? WHOP_LINKS.twelve_month :
                       selectedPlan.duration === 6 ? WHOP_LINKS.six_month :
                       WHOP_LINKS.monthly;
      window.open(whopUrl, '_blank');
      setIsPaidModalOpen(false);
    } catch (err: any) {
      setWhopError(err.message || 'Failed to initialize Whop checkout.');
    } finally {
      setWhopSubmitting(false);
    }
  };

  const handleCryptoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paidIndicator || !selectedPlan || !user) return;
    if (!cryptoTvUsername.trim() || !cryptoTxHash.trim()) {
      setCryptoError('Please enter both your TradingView username and TxID transaction hash.');
      return;
    }

    setCryptoSubmitting(true);
    setCryptoError('');

    try {
      const { data, error } = await supabase
        .from('tradingview_invites')
        .upsert({
          user_id: user.id,
          tradingview_username: cryptoTvUsername.trim(),
          indicator_id: paidIndicator.id,
          indicator_name: paidIndicator.name,
          status: 'pending',
          payment_method: 'CRYPTO',
          crypto_hash: cryptoTxHash.trim(),
          payment_amount: selectedPlan.price,
          duration_months: selectedPlan.duration,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,indicator_id'
        })
        .select()
        .single();

      if (error) throw error;

      setRequests(prev => ({ ...prev, [paidIndicator.id]: data as InviteRequest }));
      setIsPaidModalOpen(false);
    } catch (err: any) {
      setCryptoError(err.message || 'Failed to submit payment hash.');
    } finally {
      setCryptoSubmitting(false);
    }
  };

  const copyWalletAddress = (address: string) => {
    navigator.clipboard.writeText(address);
    setCopiedAddress(address);
    setTimeout(() => setCopiedAddress(null), 2000);
  };

  // Handle Whop Username Claim
  const openClaimModal = () => {
    setClaimTvUsername('');
    setClaimError('');
    setIsClaimModalOpen(true);
  };

  const handleClaimSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const req = requests['crt_algo_ultimate'];
    if (!req || !user) return;
    if (!claimTvUsername.trim()) {
      setClaimError('Please enter a valid TradingView username.');
      return;
    }

    setClaimSubmitting(true);
    setClaimError('');

    try {
      const { data, error } = await supabase
        .from('tradingview_invites')
        .update({
          tradingview_username: claimTvUsername.trim(),
          status: 'pending', // Send to admin panel for whitelisting & approval (was approved)
          updated_at: new Date().toISOString()
        })
        .eq('id', req.id)
        .select()
        .single();

      if (error) throw error;

      setRequests(prev => ({ ...prev, crt_algo_ultimate: data as InviteRequest }));
      setIsClaimModalOpen(false);
    } catch (err: any) {
      setClaimError(err.message || 'Failed to claim access.');
    } finally {
      setClaimSubmitting(false);
    }
  };

  // Local helper to render status badge
  const renderStatus = (indicatorId: string) => {
    const req = requests[indicatorId];
    if (!req) return null;

    if (req.tradingview_username === 'AWAITING_USER_INPUT' && req.payment_method === 'WHOP') {
      return (
        <span className="flex items-center gap-1.5 px-3 py-1 bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] font-black uppercase tracking-widest rounded-lg shadow-sm">
          Action Required
        </span>
      );
    }

    if (req.status === 'pending_payment') {
      return (
        <span className="flex items-center gap-1.5 px-3 py-1 bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-black uppercase tracking-widest rounded-lg shadow-sm">
          Awaiting Payment
        </span>
      );
    }

    if (req.status === 'approved') {
      return (
        <span className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase tracking-widest rounded-lg shadow-sm animate-pulse">
          <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full" />
          Access Active
        </span>
      );
    } else if (req.status === 'rejected') {
      return (
        <span className="flex items-center gap-1.5 px-3 py-1 bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] font-black uppercase tracking-widest rounded-lg shadow-sm">
          <span className="w-1.5 h-1.5 bg-red-400 rounded-full" />
          Access Denied
        </span>
      );
    } else {
      return (
        <span className="flex items-center gap-1.5 px-3 py-1 bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-[10px] font-black uppercase tracking-widest rounded-lg shadow-sm">
          <span className="w-1.5 h-1.5 bg-yellow-400 rounded-full animate-pulse" />
          Pending Whitelist
        </span>
      );
    }
  };

  return (
    <div className="w-full relative z-10 space-y-6 md:space-y-10">
      
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-6">
        <div>
          <h1 className="text-2xl md:text-4xl font-black tracking-tighter italic flex items-center gap-3 uppercase text-zinc-900 dark:text-white">
            Library<span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-orange-600">Resources</span>
          </h1>
          <p className="text-[10px] uppercase tracking-[0.4em] text-zinc-600 dark:text-zinc-500 font-bold mt-3 leading-none">
            • DOWNLOAD TRADINGVIEW SCRIPT INDICATORS & GUIDES •
          </p>
        </div>
        <div className="flex items-center gap-3 px-5 py-2.5 bg-orange-500/10 border border-orange-500/20 rounded-xl shadow-[0_0_20px_rgba(249,115,22,0.15)]">
          <Sparkles size={16} className="text-orange-400 drop-shadow-[0_0_5px_rgba(249,115,22,0.8)]" />
          <span className="text-[10px] font-black text-orange-400 uppercase tracking-widest">Premium Assets</span>
        </div>
      </div>

      {/* Info Notice Box */}
      <div className="glass-panel p-6 flex items-start gap-4 bg-gradient-to-r from-orange-500/[0.03] to-transparent border-l-2 border-l-orange-500">
        <Info size={20} className="text-orange-500 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <h4 className="text-xs font-black uppercase tracking-widest text-zinc-900 dark:text-white">TradingView Access Guide</h4>
          <p className="text-xs leading-relaxed text-zinc-700 dark:text-zinc-400 font-medium">
            TradingView scripts are divided into **Free** (open community scripts) and **Invite Only** (private algorithms). For invite-only access, enter your exact TradingView username. Our system administrator will review and grant script authorization within 24 hours.
          </p>
        </div>
      </div>

      {/* Grid of Resource Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
        
        {/* Card 1: Gold VP */}
        <div className="relative overflow-hidden glass-panel p-6 md:p-8 hover:border-orange-500/20 hover:shadow-[0_0_30px_rgba(249,115,22,0.08)] transition-all duration-300 flex flex-col h-full justify-between group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 blur-3xl rounded-full group-hover:bg-emerald-500/10 transition-all pointer-events-none" />
          
          <div className="space-y-6">
            <div className="flex items-start justify-between">
              <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                <Globe size={24} />
              </div>
              <span className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase tracking-widest rounded-lg shadow-sm">
                Free Access
              </span>
            </div>

            <div>
              <h3 className="text-xl font-black italic tracking-tighter uppercase text-zinc-900 dark:text-white drop-shadow-md mb-2.5">
                Gold VP - Volume Profile Single Indicator
              </h3>
              <div className="text-xs text-zinc-750 dark:text-zinc-400 leading-relaxed font-semibold space-y-1.5">
                <p>Sophisticated session-based volume profile and reversal signal algorithm featuring:</p>
                <p>• <strong>Accumulation Profile Engine</strong>: Automatically builds volume profiles (VAH, VAL, POC) over a custom accumulation timezone window.</p>
                <p>• <strong>Profile Shape Bias</strong>: Classifies session shape (P-Shape/Bullish, B-Shape/Bearish, D-Shape/Neutral) to determine if market bias is Trend Following or Mean Reversion.</p>
                <p>• <strong>Wick Sweep Reversals</strong>: Detects high-precision 1-candle and multi-candle reversals sweeping outside VAH/VAL boundaries.</p>
                <p>• <strong>Daily Signal Lock</strong>: Applies a strict daily gate filter allowing a maximum of one Long and one Short signal per trading session.</p>
              </div>
            </div>

            <div className="pt-4 border-t border-[var(--glass-border)] flex items-center justify-between text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
              <span>Author: Community</span>
              <span>Open Source</span>
            </div>
          </div>

          <div className="mt-8 pt-4">
            <a 
              href="https://www.tradingview.com/script/rgPgxON8-Gold-VP-Volume-Profile-Signal-Indicator/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="w-full btn-modern flex items-center justify-center gap-2"
            >
              Add to TradingView <ExternalLink size={14} />
            </a>
          </div>
        </div>

        {/* Card 2: 7H Profiling */}
        <div className="relative overflow-hidden glass-panel p-6 md:p-8 hover:border-orange-500/20 hover:shadow-[0_0_30px_rgba(249,115,22,0.08)] transition-all duration-300 flex flex-col h-full justify-between group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/5 blur-3xl rounded-full group-hover:bg-orange-500/10 transition-all pointer-events-none" />
          
          <div className="space-y-6">
            <div className="flex items-start justify-between">
              <div className="p-3.5 rounded-2xl bg-orange-500/10 border border-orange-500/20 text-orange-400">
                <Lock size={24} />
              </div>
              <div className="flex flex-col items-end gap-1.5">
                <span className="px-3 py-1 bg-orange-500/10 border border-orange-500/20 text-orange-400 text-[10px] font-black uppercase tracking-widest rounded-lg shadow-sm">
                  Invite Only
                </span>
                {renderStatus('7h_profiling')}
              </div>
            </div>

            <div>
              <h3 className="text-xl font-black italic tracking-tighter uppercase text-zinc-900 dark:text-white drop-shadow-md mb-2.5">
                7H Profiling by (KIMOOO1987)
              </h3>
              <div className="text-xs text-zinc-750 dark:text-zinc-400 leading-relaxed font-semibold space-y-1.5">
                <p>Advanced session and liquidity profiling algorithm containing:</p>
                <p>• <strong>Session & HTF Candle Overlay</strong>: Session backgrounds (Asia/London/NY), HTF candle overlays, FVGs, and Volume Imbalances.</p>
                <p>• <strong>Liquidity Sweeps & Equilibrium</strong>: Identifies potential and confirmed swing sweeps with equilibrium (EQ) premium/discount zones.</p>
                <p>• <strong>SMT Divergence (Triads & Dyads)</strong>: Automatic Smart Money Technique divergence detection across correlated asset groups (NQ/ES/YM, Gold/Silver, Forex, BTC/ETH).</p>
                <p>• <strong>C2 Fractals & CISD Breakouts</strong>: Candle Invalidation & Structure Disruption confirmation and alerts.</p>
              </div>
            </div>

            {requests['7h_profiling'] && (
              <div className="p-3 rounded-xl bg-[var(--input-bg)] border border-[var(--glass-border)] text-zinc-700 dark:text-zinc-400 text-[11px] font-bold flex items-center justify-between">
                <span>Requested Username:</span>
                <span className="font-mono text-zinc-900 dark:text-white px-2 py-0.5 bg-orange-500/10 border border-orange-500/20 rounded-md">
                  {requests['7h_profiling'].tradingview_username}
                </span>
              </div>
            )}

            <div className="pt-4 border-t border-[var(--glass-border)] flex items-center justify-between text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
              <span>Author: KIMOOO1987</span>
              <span>Proprietary</span>
            </div>
          </div>

          <div className="mt-8 pt-4">
            {(() => {
              const req = requests['7h_profiling'];
              
              if (req?.status === 'approved') {
                return (
                  <a 
                    href="https://www.tradingview.com/script/YEKxUU99-7H-Profiling-by-KIMOOO1987/" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="w-full py-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 border border-emerald-500/30 text-white text-[11px] font-black uppercase tracking-[0.2em] rounded-xl transition-all duration-300 active:scale-95 flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(16,185,129,0.2)] hover:shadow-[0_0_30px_rgba(16,185,129,0.4)] cursor-pointer"
                  >
                    Launch Indicator <ExternalLink size={14} />
                  </a>
                );
              }

              if (req?.status === 'pending') {
                return (
                  <button 
                    onClick={() => openFreeModal('7h_profiling', '7H Profiling by (KIMOOO1987)')}
                    className="w-full py-4 bg-zinc-500/15 border border-zinc-500/20 text-zinc-500 text-[11px] font-black uppercase tracking-[0.2em] rounded-xl hover:bg-zinc-500/25 hover:text-zinc-800 dark:hover:text-zinc-350 transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    Change TV Username
                  </button>
                );
              }

              if (req?.status === 'rejected') {
                return (
                  <button 
                    onClick={() => openFreeModal('7h_profiling', '7H Profiling by (KIMOOO1987)')}
                    className="w-full py-4 bg-red-500/10 border border-red-500/20 text-red-400 text-[11px] font-black uppercase tracking-[0.2em] rounded-xl hover:bg-red-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    Retry Access Request
                  </button>
                );
              }

              return (
                <button 
                  onClick={() => openFreeModal('7h_profiling', '7H Profiling by (KIMOOO1987)')}
                  className="w-full btn-modern flex items-center justify-center gap-2"
                >
                  Request Access <ArrowRight size={14} />
                </button>
              );
            })()}
          </div>
        </div>

        {/* Card 3: CRT-Algo (+Ultimate) */}
        <div className="relative overflow-hidden glass-panel p-6 md:p-8 hover:border-orange-500/20 hover:shadow-[0_0_30px_rgba(249,115,22,0.08)] transition-all duration-300 flex flex-col h-full justify-between group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/5 blur-3xl rounded-full group-hover:bg-orange-500/10 transition-all pointer-events-none" />
          
          <div className="space-y-6">
            <div className="flex items-start justify-between">
              <div className="p-3.5 rounded-2xl bg-orange-500/10 border border-orange-500/20 text-orange-400">
                <Crown size={24} className="text-orange-500" />
              </div>
              <div className="flex flex-col items-end gap-1.5">
                <span className="px-3 py-1 bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-black uppercase tracking-widest rounded-lg shadow-sm">
                  Premium Access
                </span>
                {renderStatus('crt_algo_ultimate')}
              </div>
            </div>

            <div>
              <h3 className="text-xl font-black italic tracking-tighter uppercase text-zinc-900 dark:text-white drop-shadow-md mb-2.5">
                CRT-Algo (+Ultimate)
              </h3>
              <div className="text-xs text-zinc-750 dark:text-zinc-400 leading-relaxed font-semibold space-y-1.5">
                <p>Institutional private TradingView script access containing:</p>
                <p>• <strong>Neural Signals</strong>: Fully integrated trade triggers designed to run on automated execution bots.</p>
                <p>• <strong>Custom Whitelist Activation</strong>: Automatically whitelisted on your TradingView account when purchased.</p>
                <p>• <strong>Multiple Duration Licenses</strong>: Affordable month-to-month or discounted multi-month passes.</p>
              </div>
            </div>

            {/* If paid via Whop but waiting for username */}
            {requests['crt_algo_ultimate'] && requests['crt_algo_ultimate'].tradingview_username === 'AWAITING_USER_INPUT' && (
              <div className="p-4 bg-red-500/5 border border-red-550/20 rounded-xl space-y-3">
                <p className="text-[10px] font-bold text-red-400 uppercase tracking-widest flex items-center gap-1">
                  <AlertCircle size={14} /> Action Required
                </p>
                <p className="text-[11px] font-semibold text-zinc-700 dark:text-zinc-400">
                  Whop payment succeeded, but we need your TradingView username to activate invitation whitelist.
                </p>
                <button 
                  onClick={openClaimModal}
                  className="w-full py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all"
                >
                  Enter Username
                </button>
              </div>
            )}

            {requests['crt_algo_ultimate'] && requests['crt_algo_ultimate'].tradingview_username !== 'AWAITING_USER_INPUT' && (
              <div className="p-3 rounded-xl bg-[var(--input-bg)] border border-[var(--glass-border)] text-zinc-700 dark:text-zinc-400 text-[11px] font-bold flex flex-col gap-2">
                <div className="flex justify-between items-center">
                  <span>Requested Username:</span>
                  <span className="font-mono text-zinc-900 dark:text-white px-2 py-0.5 bg-orange-500/10 border border-orange-500/20 rounded-md">
                    {requests['crt_algo_ultimate'].tradingview_username}
                  </span>
                </div>
                {requests['crt_algo_ultimate'].payment_method === 'CRYPTO' && requests['crt_algo_ultimate'].status === 'pending' && (
                  <div className="flex justify-between items-center text-[9px] border-t border-[var(--glass-border)] pt-2 mt-1">
                    <span>TxID Status:</span>
                    <span className="font-mono truncate max-w-[120px] text-zinc-650" title={requests['crt_algo_ultimate'].crypto_hash || ''}>
                      {requests['crt_algo_ultimate'].crypto_hash?.slice(0, 8)}...
                    </span>
                  </div>
                )}
              </div>
            )}

            <div className="pt-4 border-t border-[var(--glass-border)] flex items-center justify-between text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
              <span>Author: CRT-Algo</span>
              <span>Paid Script</span>
            </div>
          </div>

          <div className="mt-8 pt-4">
            {(() => {
              const req = requests['crt_algo_ultimate'];
              
              if (req?.status === 'approved' && req.tradingview_username !== 'AWAITING_USER_INPUT') {
                return (
                  <a 
                    href="https://www.tradingview.com/script/crt-algo-ultimate/" // Replace with actual script link if needed
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="w-full py-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 border border-emerald-500/30 text-white text-[11px] font-black uppercase tracking-[0.2em] rounded-xl transition-all duration-300 active:scale-95 flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(16,185,129,0.2)] hover:shadow-[0_0_30px_rgba(16,185,129,0.4)] cursor-pointer"
                  >
                    Launch Indicator <ExternalLink size={14} />
                  </a>
                );
              }

              if (req?.status === 'pending_payment') {
                return (
                  <button 
                    onClick={() => openPaidCheckout('crt_algo_ultimate', 'CRT-Algo (+Ultimate)')}
                    className="w-full py-4 bg-orange-500/10 border border-orange-500/20 text-orange-400 text-[11px] font-black uppercase tracking-[0.2em] rounded-xl hover:bg-orange-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer animate-pulse"
                  >
                    Complete Whop Payment <ArrowRight size={14} />
                  </button>
                );
              }

              if (req?.status === 'pending' && req.tradingview_username !== 'AWAITING_USER_INPUT') {
                return (
                  <button 
                    disabled
                    className="w-full py-4 bg-zinc-500/15 border border-zinc-500/20 text-zinc-500 text-[11px] font-black uppercase tracking-[0.2em] rounded-xl opacity-60 flex items-center justify-center gap-2 cursor-not-allowed"
                  >
                    Pending Whitelist Approval
                  </button>
                );
              }

              return (
                <button 
                  onClick={() => openPaidCheckout('crt_algo_ultimate', 'CRT-Algo (+Ultimate)')}
                  className="w-full btn-modern flex items-center justify-center gap-2"
                >
                  Buy License / Access <ArrowRight size={14} />
                </button>
              );
            })()}
          </div>
        </div>

      </div>

      {/* MODAL 1: Free Request Modal (7H Profiling) */}
      <AnimatePresence>
        {isFreeModalOpen && freeIndicator && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsFreeModalOpen(false)} className="absolute inset-0 bg-black/70 backdrop-blur-md" />
            <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} transition={{ type: 'spring', duration: 0.4 }} className="relative w-full max-w-lg glass-panel p-6 md:p-10 shadow-2xl border border-white/[0.08]">
              <div className="space-y-6">
                <div className="flex items-center gap-3">
                  <div className="p-3.5 rounded-2xl bg-orange-500/10 border border-orange-500/20 text-orange-400">
                    <User size={24} />
                  </div>
                  <div>
                    <h3 className="text-xl font-black italic tracking-tighter uppercase text-zinc-900 dark:text-white">Script Whitelisting</h3>
                    <p className="text-[9px] uppercase tracking-widest text-zinc-500 font-bold mt-1">{freeIndicator.name}</p>
                  </div>
                </div>

                <div className="text-xs leading-relaxed text-zinc-700 dark:text-zinc-400 font-semibold space-y-2.5">
                  <p>Please enter your **TradingView Username**. Our administrator will add your account to the whitelist access list.</p>
                  <p className="p-2.5 bg-orange-500/5 border border-orange-500/15 rounded-lg text-[11px] flex items-start gap-2">
                    <AlertTriangle size={14} className="text-orange-500 shrink-0 mt-0.5" />
                    Double check the spelling to ensure it matches your TradingView profile identity case-sensitively.
                  </p>
                </div>

                <form onSubmit={handleFreeSubmit} className="space-y-5">
                  <div className="space-y-2">
                    <label className="text-[9px] md:text-[10px] font-black text-zinc-600 dark:text-zinc-500 uppercase ml-1 tracking-widest">TradingView Username</label>
                    <div className="relative">
                      <input type="text" placeholder="e.g. trading_master_99" value={freeTvUsername} onChange={(e) => setFreeTvUsername(e.target.value)} className="input-modern w-full pl-12 pr-4 font-bold" required disabled={freeSubmitting} />
                      <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600 dark:text-zinc-500" />
                    </div>
                  </div>

                  {freeModalError && (
                    <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                      <AlertTriangle size={14} /> {freeModalError}
                    </div>
                  )}

                  <div className="flex items-center gap-4 pt-2">
                    <button type="button" onClick={() => setIsFreeModalOpen(false)} className="flex-1 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-350 hover:bg-zinc-550/10 rounded-xl transition-all cursor-pointer" disabled={freeSubmitting}>Cancel</button>
                    <button type="submit" className="flex-2 btn-modern flex items-center justify-center gap-2" disabled={freeSubmitting}>
                      {freeSubmitting ? <Loader2 size={14} className="animate-spin" /> : <>Submit Request <ChevronRight size={14} /></>}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 2: Paid Checkout Modal (CRT-Algo +Ultimate) */}
      <AnimatePresence>
        {isPaidModalOpen && paidIndicator && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsPaidModalOpen(false)} className="absolute inset-0 bg-black/80 backdrop-blur-md" />
            <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} transition={{ type: 'spring', duration: 0.4 }} className="relative w-full max-w-xl glass-panel p-6 md:p-10 shadow-2xl border border-white/[0.08] max-h-[90vh] overflow-y-auto">
              <div className="space-y-6">
                
                {/* Modal Title */}
                <div className="flex justify-between items-start border-b border-[var(--glass-border)] pb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-3.5 bg-orange-500/10 border border-orange-500/20 text-orange-400 rounded-2xl">
                      <Crown size={20} className="text-orange-500" />
                    </div>
                    <div>
                      <h2 className="text-xl font-black italic tracking-tighter uppercase drop-shadow-md">Select License Plan</h2>
                      <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest mt-1">{paidIndicator.name}</p>
                    </div>
                  </div>
                  <button onClick={() => setIsPaidModalOpen(false)} className="p-2 text-zinc-500 hover:text-zinc-800 dark:hover:text-white transition-all text-xs font-bold">Close</button>
                </div>

                {/* STEP 1: Plan Selection */}
                {checkoutStep === 'plan' && (
                  <div className="space-y-6 animate-in fade-in duration-200">
                    <p className="text-xs text-zinc-700 dark:text-zinc-400 font-semibold leading-relaxed">
                      Choose your preferred licensing duration. All plans grant full whitelisted TradingView access to the CRT-Algo (+Ultimate) script.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* Plan 1: 1 Month */}
                      <div 
                        onClick={() => handlePlanSelect(1, 20, 'ultimate')}
                        className="glass-panel p-5 cursor-pointer border border-[var(--glass-border)] hover:border-orange-500/40 hover:bg-orange-500/5 transition-all text-center flex flex-col justify-between"
                      >
                        <h4 className="text-xs font-black uppercase tracking-widest mb-4">1-Month License</h4>
                        <div className="my-4">
                          <span className="text-3xl font-black italic tracking-tighter">$20</span>
                          <span className="text-[10px] text-zinc-500 block font-bold mt-1">Single Month</span>
                        </div>
                        <button className="w-full py-2 bg-[var(--input-bg)] border border-[var(--glass-border)] rounded-lg text-[9px] font-black uppercase tracking-widest mt-4">Select</button>
                      </div>

                      {/* Plan 2: 6 Month */}
                      <div 
                        onClick={() => handlePlanSelect(6, 120, 'ultimate_6m')}
                        className="glass-panel p-5 cursor-pointer border border-[var(--glass-border)] hover:border-orange-500/40 hover:bg-orange-500/5 transition-all text-center flex flex-col justify-between"
                      >
                        <h4 className="text-xs font-black uppercase tracking-widest mb-4 text-orange-400">6-Month License</h4>
                        <div className="my-4">
                          <span className="text-3xl font-black italic tracking-tighter text-orange-500">$120</span>
                          <span className="text-[10px] text-zinc-500 block font-bold mt-1">$20/Month</span>
                        </div>
                        <button className="w-full py-2 bg-orange-500/10 border border-orange-500/20 text-orange-400 rounded-lg text-[9px] font-black uppercase tracking-widest mt-4">Select</button>
                      </div>

                      {/* Plan 3: 12 Month */}
                      <div 
                        onClick={() => handlePlanSelect(12, 240, 'ultimate_12m')}
                        className="glass-panel p-5 cursor-pointer border-2 border-orange-500/30 bg-orange-500/5 hover:bg-orange-500/10 transition-all text-center flex flex-col justify-between relative"
                      >
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 bg-orange-500 text-zinc-950 text-[8px] font-black px-2 py-0.5 rounded-b-md uppercase tracking-wider">Best Value</div>
                        <h4 className="text-xs font-black uppercase tracking-widest mb-4 mt-2">12-Month License</h4>
                        <div className="my-4">
                          <span className="text-3xl font-black italic tracking-tighter">$240</span>
                          <span className="text-[10px] text-zinc-500 block font-bold mt-1">1 Year Access</span>
                        </div>
                        <button className="w-full py-2 bg-gradient-to-r from-orange-600 to-orange-500 text-white rounded-lg text-[9px] font-black uppercase tracking-widest mt-4">Select</button>
                      </div>
                    </div>
                  </div>
                )}

                {/* STEP 2: Payment Method */}
                {checkoutStep === 'method' && selectedPlan && (
                  <div className="space-y-6 animate-in fade-in duration-200">
                    <div className="p-3 bg-[var(--input-bg)] border border-[var(--glass-border)] rounded-xl flex items-center justify-between text-xs font-bold">
                      <span>Selected Plan:</span>
                      <span className="text-orange-500 uppercase">{selectedPlan.duration} Month License (${selectedPlan.price})</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Whop payment option */}
                      <div 
                        onClick={() => handlePaymentMethodSelect('WHOP')}
                        className="glass-panel p-6 cursor-pointer border border-[var(--glass-border)] hover:border-blue-500/40 hover:bg-blue-500/5 transition-all text-center flex flex-col items-center gap-4 group"
                      >
                        <div className="p-3.5 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400 group-hover:scale-110 transition-transform">
                          <CreditCard size={24} />
                        </div>
                        <div>
                          <h4 className="text-sm font-black uppercase tracking-widest">Pay via Whop</h4>
                          <p className="text-[10px] text-zinc-500 font-semibold mt-1">Instant Whitelist Activation</p>
                        </div>
                      </div>

                      {/* Crypto payment option */}
                      <div 
                        onClick={() => handlePaymentMethodSelect('CRYPTO')}
                        className="glass-panel p-6 cursor-pointer border border-[var(--glass-border)] hover:border-orange-500/40 hover:bg-orange-500/5 transition-all text-center flex flex-col items-center gap-4 group"
                      >
                        <div className="p-3.5 rounded-2xl bg-orange-500/10 border border-orange-500/20 text-orange-400 group-hover:scale-110 transition-transform">
                          <Bitcoin size={24} />
                        </div>
                        <div>
                          <h4 className="text-sm font-black uppercase tracking-widest">Pay via Crypto</h4>
                          <p className="text-[10px] text-zinc-500 font-semibold mt-1">Manual Verification via TxID</p>
                        </div>
                      </div>
                    </div>

                    <button 
                      onClick={() => setCheckoutStep('plan')}
                      className="text-[10px] font-black uppercase tracking-widest text-zinc-500 hover:text-zinc-800 dark:hover:text-white transition-all cursor-pointer"
                    >
                      ← Back to Plans
                    </button>
                  </div>
                )}

                {/* STEP 3: Crypto Checkout Form */}
                {checkoutStep === 'crypto_form' && selectedPlan && (
                  <form onSubmit={handleCryptoSubmit} className="space-y-6 animate-in fade-in duration-200">
                    <div className="p-3 bg-[var(--input-bg)] border border-[var(--glass-border)] rounded-xl flex items-center justify-between text-xs font-bold">
                      <span>Licensing duration:</span>
                      <span className="text-orange-500 uppercase">{selectedPlan.duration} Month (${selectedPlan.price} USDT)</span>
                    </div>

                    <div className="space-y-3">
                      <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest text-center leading-relaxed">
                        Send exactly <span className="text-orange-500">${selectedPlan.price} USDT</span> to one of these addresses.
                      </p>
                      
                      <div className="grid gap-3">
                        {WALLETS.map((w) => (
                          <div key={w.network} className="bg-gradient-to-br from-white/[0.03] to-white/[0.01] border border-[var(--glass-border)] p-3 rounded-xl flex justify-between items-center group hover:bg-white/[0.05] transition-colors">
                            <div>
                              <p className="text-[8px] font-bold text-zinc-550 dark:text-zinc-500 uppercase tracking-widest mb-1">{w.network}</p>
                              <p className="text-xs font-mono font-bold text-zinc-800 dark:text-zinc-350 truncate max-w-[200px] sm:max-w-sm">{w.address}</p>
                            </div>
                            <button 
                              type="button" 
                              onClick={() => copyWalletAddress(w.address)} 
                              className="p-2 bg-[var(--glass-bg)] border border-[var(--glass-border)] hover:bg-white/[0.1] rounded-lg transition-all"
                            >
                              {copiedAddress === w.address ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} className="text-zinc-550 dark:text-zinc-400" />}
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-4 pt-4 border-t border-[var(--glass-border)]">
                      <div className="space-y-2">
                        <label className="text-[9px] md:text-[10px] font-black text-zinc-650 dark:text-zinc-500 uppercase ml-1 tracking-widest">TradingView Username</label>
                        <div className="relative">
                          <input 
                            type="text" 
                            placeholder="Exact username, case-sensitive..." 
                            value={cryptoTvUsername} 
                            onChange={(e) => setCryptoTvUsername(e.target.value)} 
                            className="input-modern w-full pl-12 pr-4 font-bold focus:border-orange-500/50" 
                            required
                            disabled={cryptoSubmitting}
                          />
                          <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600 dark:text-zinc-500" />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[9px] md:text-[10px] font-black text-zinc-600 dark:text-zinc-500 uppercase ml-1 tracking-widest">Transaction Hash (TxID)</label>
                        <div className="relative">
                          <input 
                            type="text" 
                            placeholder="Paste your transaction TxID hash here..." 
                            value={cryptoTxHash} 
                            onChange={(e) => setCryptoTxHash(e.target.value)} 
                            className="input-modern w-full pl-12 pr-4 font-mono focus:border-orange-500/50" 
                            required
                            disabled={cryptoSubmitting}
                          />
                          <Bitcoin size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600 dark:text-zinc-500" />
                        </div>
                      </div>
                    </div>

                    {cryptoError && (
                      <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                        <AlertTriangle size={14} /> {cryptoError}
                      </div>
                    )}

                    <div className="flex items-center gap-4 pt-2">
                      <button 
                        type="button" 
                        onClick={() => setCheckoutStep('method')} 
                        className="flex-1 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 hover:text-zinc-800 dark:hover:text-white hover:bg-zinc-500/10 rounded-xl transition-all cursor-pointer" 
                        disabled={cryptoSubmitting}
                      >
                        Back
                      </button>
                      <button 
                        type="submit" 
                        className="flex-2 btn-modern flex items-center justify-center gap-2" 
                        disabled={cryptoSubmitting}
                      >
                        {cryptoSubmitting ? <Loader2 size={14} className="animate-spin" /> : <>Submit Checkout <ChevronRight size={14} /></>}
                      </button>
                    </div>
                  </form>
                )}

                {/* STEP 4: Whop Checkout Form */}
                {checkoutStep === 'whop_form' && selectedPlan && (
                  <form onSubmit={handleWhopSubmit} className="space-y-6 animate-in fade-in duration-200">
                    <div className="p-3 bg-[var(--input-bg)] border border-[var(--glass-border)] rounded-xl flex items-center justify-between text-xs font-bold">
                      <span>Selected Plan:</span>
                      <span className="text-orange-500 uppercase">{selectedPlan.duration} Month (${selectedPlan.price} USDT/month via Whop)</span>
                    </div>

                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-[9px] md:text-[10px] font-black text-zinc-650 dark:text-zinc-500 uppercase ml-1 tracking-widest">TradingView Username</label>
                        <div className="relative">
                          <input 
                            type="text" 
                            placeholder="Exact username, case-sensitive..." 
                            value={whopTvUsername} 
                            onChange={(e) => setWhopTvUsername(e.target.value)} 
                            className="input-modern w-full pl-12 pr-4 font-bold focus:border-orange-500/50" 
                            required
                            disabled={whopSubmitting}
                          />
                          <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600 dark:text-zinc-500" />
                        </div>
                      </div>
                    </div>

                    {whopError && (
                      <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                        <AlertTriangle size={14} /> {whopError}
                      </div>
                    )}

                    <div className="flex items-center gap-4 pt-2">
                      <button 
                        type="button" 
                        onClick={() => setCheckoutStep('method')} 
                        className="flex-1 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 hover:text-zinc-800 dark:hover:text-white hover:bg-zinc-500/10 rounded-xl transition-all cursor-pointer" 
                        disabled={whopSubmitting}
                      >
                        Back
                      </button>
                      <button 
                        type="submit" 
                        className="flex-2 btn-modern flex items-center justify-center gap-2" 
                        disabled={whopSubmitting}
                      >
                        {whopSubmitting ? <Loader2 size={14} className="animate-spin" /> : <>Go to Whop Checkout <ChevronRight size={14} /></>}
                      </button>
                    </div>
                  </form>
                )}

              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 3: Claim Username Modal (Whop checkout claim flow) */}
      <AnimatePresence>
        {isClaimModalOpen && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsClaimModalOpen(false)} className="absolute inset-0 bg-black/70 backdrop-blur-md" />
            <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} transition={{ type: 'spring', duration: 0.4 }} className="relative w-full max-w-lg glass-panel p-6 md:p-10 shadow-2xl border border-white/[0.08]">
              <div className="space-y-6">
                <div className="flex items-center gap-3">
                  <div className="p-3.5 rounded-2xl bg-orange-500/10 border border-orange-500/20 text-orange-400">
                    <User size={24} />
                  </div>
                  <div>
                    <h3 className="text-xl font-black italic tracking-tighter uppercase text-zinc-900 dark:text-white">Claim Indicator Access</h3>
                    <p className="text-[9px] uppercase tracking-widest text-zinc-500 font-bold mt-1">CRT-Algo (+Ultimate)</p>
                  </div>
                </div>

                <div className="text-xs leading-relaxed text-zinc-700 dark:text-zinc-400 font-semibold space-y-2.5">
                  <p>Provide your **TradingView Username** to associate it with your Whop payment license. Access will be instantly authorized.</p>
                </div>

                <form onSubmit={handleClaimSubmit} className="space-y-5">
                  <div className="space-y-2">
                    <label className="text-[9px] md:text-[10px] font-black text-zinc-600 dark:text-zinc-500 uppercase ml-1 tracking-widest">TradingView Username</label>
                    <div className="relative">
                      <input type="text" placeholder="Exact TradingView username..." value={claimTvUsername} onChange={(e) => setClaimTvUsername(e.target.value)} className="input-modern w-full pl-12 pr-4 font-bold" required disabled={claimSubmitting} />
                      <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600 dark:text-zinc-500" />
                    </div>
                  </div>

                  {claimError && (
                    <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                      <AlertTriangle size={14} /> {claimError}
                    </div>
                  )}

                  <div className="flex items-center gap-4 pt-2">
                    <button type="button" onClick={() => setIsClaimModalOpen(false)} className="flex-1 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 hover:text-zinc-800 dark:hover:text-white hover:bg-zinc-500/10 rounded-xl transition-all cursor-pointer" disabled={claimSubmitting}>Cancel</button>
                    <button type="submit" className="flex-2 btn-modern flex items-center justify-center gap-2" disabled={claimSubmitting}>
                      {claimSubmitting ? <Loader2 size={14} className="animate-spin" /> : <>Claim Access <ChevronRight size={14} /></>}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
