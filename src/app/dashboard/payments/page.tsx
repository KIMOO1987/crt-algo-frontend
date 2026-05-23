"use client";

import { useState, useEffect, useMemo } from 'react';
import { Check, Zap, Crown, Star, CreditCard, Bitcoin, Loader2, Copy, ShieldCheck, X, CheckCircle2, Clock, Gift } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { startTrial } from '@/lib/payments';



const WALLETS = [
  { network: 'USDT (ERC20)', address: '0x79adb2f07fc055e2c858d6edf25a37dce43de00a' },
  { network: 'USDT (TRC20)', address: 'TMfFLoNrLm21YDRcA3oej8ZdksSbNKg8Sb' },
  { network: 'USDT (BEP20)', address: '0x79adb2f07fc055e2c858d6edf25a37dce43de00a' },
];

export default function PaymentsPage() {
  const [plans, setPlans] = useState<any[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState<'CRYPTO'>('CRYPTO');
  const [cryptoHash, setCryptoHash] = useState('');
  const [copied, setCopied] = useState<string | null>(null);
  const [cryptoStatus, setCryptoStatus] = useState<'idle' | 'submitting' | 'success'>('idle');
  const [trialLoading, setTrialLoading] = useState(false);
  const [trialSuccess, setTrialSuccess] = useState<string | null>(null);

  // --- FETCH DYNAMIC PLANS FROM SUPABASE ---
  useEffect(() => {
    // 1. Optimistic Cache Load: Instantly show previous plans
    const cachedPlans = sessionStorage.getItem('payments_plans_cache');
    if (cachedPlans) {
      try {
        setPlans(JSON.parse(cachedPlans));
        setPageLoading(false); // Instantly hide loader
      } catch (e) { }
    }

    const fetchPlans = async () => {
      const { data, error } = await supabase
        .from('plans')
        .select('*')
        .order('price', { ascending: true });

      if (!error && data) {
        setPlans(data);
        sessionStorage.setItem('payments_plans_cache', JSON.stringify(data));
      }
      setPageLoading(false);
    };
    fetchPlans();
  }, []);

  // Determine the recommended plan (e.g., the middle one or a specific ID)
  // --- EXTRACT TRIAL PLAN ---
  const trialPlan = useMemo(() => {
    return plans.find(p => p.id?.toLowerCase().includes('trial') || Number(p.price) === 0);
  }, [plans]);

  // Filter out the trial plan from the regular loop
  const regularPlans = useMemo(() => {
    return plans.filter(p => !p.id?.toLowerCase().includes('trial') && Number(p.price) > 0);
  }, [plans]);

  // Determine the recommended plan (e.g., the middle one or a specific ID)
  const recommendedPlan = useMemo(() => {
    return regularPlans.find(p => p.is_recommended) || regularPlans[Math.floor(regularPlans.length / 2)];
  }, [regularPlans]);

  const renderIcon = (type: string) => {
    switch (type) {
      case 'zap': return <Zap size={24} className="text-zinc-600 dark:text-zinc-500" />;
      case 'crown': return <Crown size={24} className="text-amber-500" />;
      case 'gift': return <Gift size={24} className="text-fuchsia-400 animate-bounce" />;
      default: return <Star size={24} className="text-blue-500" />;
    }
  };



  const handleStartTrial = async () => {
    setTrialLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      alert("Please login to start trial.");
      setTrialLoading(false);
      return;
    }

    try {
      const data = await startTrial(user.id);
      if (data.status === 'success') {
        setTrialSuccess('15-Day Ultimate Trial Activated!');
        setTimeout(() => window.location.href = '/dashboard', 2000);
      } else {
        alert(data.message || 'Could not activate trial. You might have already used it.');
      }
    } catch (err) {
      alert('Trial request failed. Please try again.');
    } finally {
      setTrialLoading(false);
    }
  };

  const handleCryptoSubmit = async () => {
    if (!cryptoHash || !selectedPlan) return;
    setCryptoStatus('submitting');

    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      const { error } = await supabase
        .from('profiles')
        .update({
          pending_crypto_hash: cryptoHash,
          last_payment_method: 'CRYPTO',
          pending_plan_id: selectedPlan.id
        })
        .eq('id', user.id);

      if (!error) {
        setCryptoStatus('success');
        setTimeout(() => {
          setSelectedPlan(null);
          setCryptoStatus('idle');
          setCryptoHash('');
        }, 3000);
      } else {
        alert("Error saving transaction: " + error.message);
        setCryptoStatus('idle');
      }
    } else {
      alert("Please login to submit payment.");
      setCryptoStatus('idle');
    }
  };

  const copyToClipboard = (addr: string) => {
    navigator.clipboard.writeText(addr);
    setCopied(addr);
    setTimeout(() => setCopied(null), 2000);
  };

  if (pageLoading) return (
    <div className="min-h-screen flex items-center justify-center ">
      <div className="flex flex-col items-center justify-center py-20 animate-pulse">
        <Loader2 size={40} className="text-zinc-700 mb-4 animate-spin" />
        <p className="text-xs font-black uppercase tracking-widest text-zinc-600">Loading Licenses...</p>
      </div>
    </div>
  );

  return (
    <div className="relative p-4 md:p-12 lg:p-16 lg:ml-72  min-h-screen text-zinc-900 dark:text-white font-sans overflow-x-hidden">

      {/* Ambient Glowing Backgrounds */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-blue-600/10 blur-[150px] rounded-full mix-blend-screen" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-indigo-600/10 blur-[150px] rounded-full mix-blend-screen" />
      </div>

      <div className="max-w-[1700px] mx-auto relative z-10">
        <div className="text-center mb-12 md:mb-20">
          <h1 className="text-3xl md:text-5xl font-black tracking-tighter italic flex items-center justify-center gap-3 uppercase text-zinc-900 dark:text-white">
            Upgrade to <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-500">Pro</span>
          </h1>
          <p className="text-[10px] uppercase tracking-[0.4em] text-zinc-600 dark:text-zinc-500 font-bold mt-4 leading-none">
            • INSTITUTIONAL CRT LICENSE SELECTION •
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8 max-w-7xl mx-auto">
          {/* 15-DAY FREE TRIAL CARD */}
          <div
            onClick={() => handleStartTrial()}
            className={`relative p-8 md:p-10 flex flex-col cursor-pointer transition-all duration-500 group backdrop-blur-xl rounded-[2.5rem] border border-fuchsia-500/30 bg-fuchsia-500/5 hover:bg-fuchsia-500/10 shadow-[0_0_30px_rgba(217,70,239,0.1)] hover:shadow-[0_0_50px_rgba(217,70,239,0.2)] hover:md:-translate-y-4`}
          >
            <div className="absolute top-0 left-1/2 -translate-x-1/2 bg-gradient-to-r from-fuchsia-600 to-pink-600 text-white text-[9px] font-black px-4 py-1.5 rounded-b-xl uppercase tracking-widest shadow-lg">
              Limited Offer
            </div>

            <div className="mb-8 p-4 rounded-2xl bg-fuchsia-500/10 border border-fuchsia-500/20 w-fit shadow-lg group-hover:scale-110 transition-transform duration-300">
              <Gift size={24} className="text-fuchsia-400 animate-bounce" />
            </div>
            <h3 className="text-xl font-black italic tracking-tighter uppercase drop-shadow-md mb-2 text-fuchsia-400">{trialPlan?.name || '15-Day Trial'}</h3>
            <div className="flex items-baseline gap-2 mb-8">
              <span className="text-5xl md:text-6xl font-black tracking-tighter">{trialPlan?.price === 0 ? 'FREE' : `$${trialPlan?.price || 'FREE'}`}</span>
              <span className="text-[10px] font-bold text-fuchsia-500/60 uppercase tracking-widest">{trialPlan?.duration_text || 'NO COST'}</span>
            </div>

            <div className="space-y-4 mb-10 flex-1">
              {(trialPlan?.features || [
                "FULL TIER 3 (ULTIMATE) ACCESS",
                "ALL EXCHANGES & STRATEGIES",
                "INSTANT SIGNAL DELIVERY",
                "24/7 SUPPORT ACCESS"
              ]).map((feature: string) => (
                <div key={feature} className="flex items-center gap-4">
                  <div className="p-1 rounded-full bg-fuchsia-500/10 border border-fuchsia-500/20 text-fuchsia-400 shadow-[0_0_10px_rgba(217,70,239,0.2)]">
                    <Check size={12} strokeWidth={3} />
                  </div>
                  <span className="text-xs font-bold text-zinc-800 dark:text-zinc-300 uppercase tracking-widest leading-relaxed">{feature}</span>
                </div>
              ))}
            </div>

            <button
              disabled={trialLoading || !!trialSuccess}
              className={`py-4 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all duration-300 mt-auto flex items-center justify-center gap-2 ${trialSuccess
                ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400 shadow-[0_0_20px_rgba(52,211,153,0.2)]'
                : 'bg-gradient-to-r from-fuchsia-600 to-pink-600 text-white shadow-[0_0_30px_rgba(217,70,239,0.4)] border border-fuchsia-500/50 group-hover:scale-[1.02]'
                }`}
            >
              {trialLoading ? <Loader2 size={16} className="animate-spin" /> : trialSuccess ? <><CheckCircle2 size={16} /> Activated</> : 'Start Free Trial'}
            </button>
          </div>
          {regularPlans.map((plan) => (
            <div
              key={plan.id}
              onClick={() => setSelectedPlan(plan)}
              className={`relative p-8 md:p-10 flex flex-col cursor-pointer transition-all duration-500 group backdrop-blur-xl rounded-[2.5rem] border ${selectedPlan?.id === plan.id
                ? 'bg-blue-500/10 border-blue-500/50 shadow-[0_0_50px_rgba(59,130,246,0.2)] transform md:-translate-y-4 z-10'
                : recommendedPlan?.id === plan.id
                  ? 'bg-gradient-to-br from-white/[0.08] to-white/[0.02] border-white/20 shadow-2xl hover:border-white/30'
                  : 'bg-gradient-to-br from-white/[0.04] to-white/[0.01] border-[var(--glass-border)] shadow-xl hover:border-[var(--glass-border)] hover:bg-white/[0.06]'
                }`}
            >
              {recommendedPlan?.id === plan.id && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 bg-gradient-to-r from-blue-600 to-indigo-600 text-zinc-900 dark:text-white text-[9px] font-black px-4 py-1.5 rounded-b-xl uppercase tracking-widest shadow-lg">
                  Best Value
                </div>
              )}

              <div className="mb-8 p-4 rounded-2xl bg-[var(--glass-bg)] border border-[var(--glass-border)] w-fit shadow-lg group-hover:scale-110 transition-transform duration-300">
                {renderIcon(plan.icon_type)}
              </div>
              <h3 className="text-xl font-black italic tracking-tighter uppercase drop-shadow-md mb-2">{plan.name}</h3>
              <div className="flex items-baseline gap-2 mb-8">
                <span className="text-5xl md:text-6xl font-black tracking-tighter">${plan.price}</span>
                <span className="text-[10px] font-bold text-zinc-600 dark:text-zinc-500 uppercase tracking-widest">{plan.duration_text}</span>
              </div>

              <div className="space-y-4 mb-10 flex-1">
                {plan.features.map((feature: string) => (
                  <div key={feature} className="flex items-center gap-4">
                    <div className="p-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 shadow-[0_0_10px_rgba(59,130,246,0.2)]">
                      <Check size={12} strokeWidth={3} />
                    </div>
                    <span className="text-xs font-bold text-zinc-800 dark:text-zinc-300 uppercase tracking-widest leading-relaxed">{feature}</span>
                  </div>
                ))}
              </div>

              <button className={`py-4 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all duration-300 mt-auto ${selectedPlan?.id === plan.id
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-zinc-900 dark:text-white shadow-[0_0_30px_rgba(59,130,246,0.4)] border border-blue-500/50'
                : 'bg-[var(--glass-bg)] border border-[var(--glass-border)] text-zinc-700 dark:text-zinc-400 group-hover:bg-white/[0.05] group-hover:text-zinc-900 dark:text-white group-hover:border-white/20'
                }`}>
                {selectedPlan?.id === plan.id ? 'Plan Selected' : 'Select License'}
              </button>
            </div>
          ))}
        </div>

        {selectedPlan && (
          <div className="fixed inset-0 /80 backdrop-blur-2xl z-[100] flex items-center justify-center p-4 md:p-6 animate-in fade-in duration-300">
            <div className="w-full max-w-xl p-8 md:p-10 bg-gradient-to-br from-[#0a0c10] to-[#030407] border border-[var(--glass-border)] rounded-[2.5rem] shadow-[0_0_100px_rgba(0,0,0,0.8)] max-h-[90vh] overflow-y-auto relative">
              <div className="absolute top-0 left-0 w-full h-full bg-blue-500/5 blur-[100px] pointer-events-none" />
              <div className="relative z-10">
                <div className="flex justify-between items-start mb-8 border-b border-[var(--glass-border)] pb-6">
                  <div>
                    <h2 className="text-2xl font-black italic tracking-tighter uppercase drop-shadow-md">Checkout</h2>
                    <p className="text-[10px] text-zinc-600 dark:text-zinc-500 font-bold uppercase tracking-widest mt-2">
                      Global License Provisioning
                    </p>
                  </div>
                  <button onClick={() => { setSelectedPlan(null); setCryptoStatus('idle'); setCryptoHash(''); }} className="p-2.5 bg-[var(--glass-bg)] border border-[var(--glass-border)] hover:bg-white/[0.08] hover:text-zinc-900 dark:text-white rounded-xl transition-all"><X size={20} className="text-zinc-600 dark:text-zinc-500" /></button>
                </div>

                <div className="space-y-6 animate-in slide-in-from-bottom-2 duration-300">
                  <p className="text-[10px] text-zinc-600 dark:text-zinc-500 font-bold uppercase tracking-widest text-center leading-relaxed">
                    Send exactly <span className="text-orange-400">${selectedPlan.price}</span> to one of the addresses below.
                    <br />Then paste your transaction hash (TxID) for verification.
                  </p>
                  <div className="grid gap-3">
                    {WALLETS.map((w) => (
                      <div key={w.network} className="bg-gradient-to-br from-white/[0.04] to-white/[0.01] border border-[var(--glass-border)] p-4 rounded-2xl flex justify-between items-center group hover:bg-white/[0.06] transition-colors">
                        <div>
                          <p className="text-[9px] font-bold text-zinc-600 dark:text-zinc-500 uppercase tracking-widest mb-1.5">{w.network}</p>
                          <p className="text-xs font-mono font-bold text-zinc-800 dark:text-zinc-300 tracking-tight">{w.address}</p>
                        </div>
                        <button onClick={() => copyToClipboard(w.address)} className="p-2.5 bg-[var(--glass-bg)] border border-[var(--glass-border)] hover:bg-white/[0.1] rounded-xl transition-all shadow-lg">
                          {copied === w.address ? <Check size={16} className="text-emerald-400" /> : <Copy size={16} className="text-zinc-700 dark:text-zinc-400 group-hover:text-zinc-900 dark:text-white" />}
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-3 pt-4 border-t border-[var(--glass-border)]">
                    <label className="text-[9px] font-black text-zinc-600 dark:text-zinc-500 uppercase tracking-widest block ml-1">Transaction Hash (TxID)</label>
                    <input
                      type="text"
                      value={cryptoHash}
                      onChange={(e) => setCryptoHash(e.target.value)}
                      placeholder="Paste your transaction hash (TxID) here..."
                      className="w-full bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-xl px-4 py-4 text-xs font-mono text-zinc-900 dark:text-white focus:border-orange-500/50 hover:border-white/20 outline-none transition-all"
                    />
                    <button
                      onClick={handleCryptoSubmit}
                      disabled={!cryptoHash || cryptoStatus !== 'idle'}
                      className={`w-full py-5 rounded-xl font-black text-[11px] uppercase tracking-[0.2em] transition-all duration-300 active:scale-95 shadow-lg border flex items-center justify-center gap-3
                        ${cryptoStatus === 'success' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-[0_0_30px_rgba(52,211,153,0.2)]' : 'bg-gradient-to-r from-orange-600 to-red-600 text-white border-orange-500/30 hover:from-orange-500 hover:to-red-500 shadow-[0_0_30px_rgba(249,115,22,0.3)] hover:shadow-[0_0_40px_rgba(249,115,22,0.5)]'}
                        ${cryptoStatus === 'submitting' ? 'opacity-70 cursor-not-allowed bg-none bg-white/[0.05] border-[var(--glass-border)] shadow-none text-zinc-600 dark:text-zinc-500' : ''}`}
                    >
                      {cryptoStatus === 'idle' && <><ShieldCheck size={18} className="text-orange-200" /> Submit for Validation</>}
                      {cryptoStatus === 'submitting' && <Loader2 className="animate-spin text-zinc-700 dark:text-zinc-400" size={18} />}
                      {cryptoStatus === 'success' && <><CheckCircle2 size={18} /> Request Sent - Awaiting Admin</>}
                    </button>
                  </div>

                  <div className="flex items-center gap-2 px-2 opacity-50 justify-center">
                    <Clock size={12} className="text-zinc-600 dark:text-zinc-500" />
                    <p className="text-[9px] text-zinc-600 dark:text-zinc-500 font-bold uppercase tracking-widest">Verified within 1-12 hours of confirmation.</p>
                  </div>
                </div>

                <p className="text-[9px] text-zinc-600 text-center mt-8 uppercase font-bold tracking-widest leading-loose">
                  Institutional-grade payment verification.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
