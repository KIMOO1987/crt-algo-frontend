'use client';

import { useState } from 'react';
import { useEffect, useMemo } from 'react';
import { createCryptoPayment, startTrial } from '@/lib/payments';
import { Loader2, Gift, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';

export default function PaymentClient({ userId }: { userId: string }) {
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [trialLoading, setTrialLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    async function fetchPlans() {
      const { data } = await supabase.from('plans').select('*');
      if (data) setPlans(data);
    }
    fetchPlans();
  }, []);

  const trialPlan = useMemo(() => {
    return plans.find(p => p.id?.toLowerCase().includes('trial') || Number(p.price) === 0);
  }, [plans]);

  const handleCryptoPayment = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await createCryptoPayment(userId, 50, 'CRT PRO Lifetime');
      if (data.invoice_url) {
        window.location.href = data.invoice_url;
      } else {
        setError('Could not generate payment link. Please try again.');
      }
    } catch (err) {
      setError('Payment request failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleStartTrial = async () => {
    setTrialLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const data = await startTrial(userId);
      if (data.status === 'success') {
        setSuccess('15-Day Ultimate Trial Activated! Refreshing...');
        setTimeout(() => window.location.href = '/dashboard', 2000);
      } else {
        setError(data.message || 'Could not activate trial. You might have already used it.');
      }
    } catch (err) {
      setError('Trial request failed. Please try again.');
    } finally {
      setTrialLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
      {/* 15-Day Free Trial Card */}
      <div className="glass-panel p-8 rounded-[2rem] relative overflow-hidden preserve-3d transition-transform hover:rotate-x-2 hover:rotate-y-[2deg] border-fuchsia-500/20">
        <div className="absolute inset-0 bg-gradient-to-br from-fuchsia-600/10 to-transparent opacity-10 pointer-events-none rounded-[2rem]" />
        
        <div className="relative z-10 flex flex-col h-full">
          <div className="flex justify-between items-start">
            <h3 className="text-xl font-black uppercase tracking-tighter text-fuchsia-400">{trialPlan?.name || '15-Day Trial'}</h3>
            <Gift className="text-fuchsia-400 animate-bounce" size={24} />
          </div>
          <p className="text-4xl font-black mt-2 drop-shadow-md">{trialPlan?.price === 0 ? 'FREE' : `$${trialPlan?.price || 'FREE'}`} <span className="text-sm opacity-50 font-bold uppercase">{trialPlan?.duration_text || 'ACCESS'}</span></p>
          
          <ul className="mt-6 space-y-3 flex-grow">
            {(trialPlan?.features || [
              "FULL TIER 3 (ULTIMATE) ACCESS",
              "ALL EXCHANGES & STRATEGIES",
              "INSTANT SIGNAL DELIVERY"
            ]).map((feature: string) => (
              <li key={feature} className="flex items-center gap-2 text-xs font-bold opacity-80">
                <CheckCircle2 size={14} className="text-fuchsia-500" />
                {feature}
              </li>
            ))}
          </ul>

          {success && (
            <p className="mt-4 text-green-400 text-[10px] font-black uppercase tracking-widest bg-green-500/10 border border-green-500/20 p-3 rounded-xl backdrop-blur-md">
              {success}
            </p>
          )}

          <button
            onClick={handleStartTrial}
            disabled={trialLoading || loading || !!success}
            className="btn-modern w-full mt-8 flex items-center justify-center gap-2 group preserve-3d !border-fuchsia-500/30 hover:!bg-fuchsia-500/10"
          >
            {trialLoading ? <Loader2 className="animate-spin" size={16} /> : <span className="relative z-10 uppercase tracking-widest text-xs font-black group-hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.8)] transition-all">Start Free Trial</span>}
          </button>
        </div>
      </div>

      {/* Lifetime Pro Card */}
      <div className="glass-panel p-8 rounded-[2rem] relative overflow-hidden preserve-3d transition-transform hover:rotate-x-2 hover:rotate-y-[-2deg]">
        <div className="absolute inset-0 bg-gradient-to-br from-[var(--glow-primary)] to-transparent opacity-10 pointer-events-none rounded-[2rem]" />
        
        <div className="relative z-10">
          <h3 className="text-xl font-black uppercase tracking-tighter">CRT PRO Lifetime</h3>
          <p className="text-4xl font-black mt-2 drop-shadow-md">$50 <span className="text-sm opacity-50 font-bold">USDT</span></p>

          <ul className="mt-6 space-y-3">
            <li className="flex items-center gap-2 text-xs font-bold opacity-80">
              <CheckCircle2 size={14} className="text-orange-500" />
              LIFETIME UNLIMITED ACCESS
            </li>
            <li className="flex items-center gap-2 text-xs font-bold opacity-80">
              <CheckCircle2 size={14} className="text-orange-500" />
              PRIORITY CLOUD EXECUTION
            </li>
            <li className="flex items-center gap-2 text-xs font-bold opacity-80">
              <CheckCircle2 size={14} className="text-orange-500" />
              24/7 DEDICATED SUPPORT
            </li>
          </ul>

          {error && (
            <p className="mt-4 text-red-400 text-[10px] font-black uppercase tracking-widest bg-red-500/10 border border-red-500/20 p-3 rounded-xl backdrop-blur-md">
              {error}
            </p>
          )}

          <button
            onClick={handleCryptoPayment}
            disabled={loading || trialLoading}
            className="btn-modern w-full mt-8 flex items-center justify-center gap-2 group preserve-3d"
          >
            {loading ? <Loader2 className="animate-spin" size={16} /> : <span className="relative z-10 uppercase tracking-widest text-xs font-black group-hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.8)] transition-all">Pay with Crypto (USDT)</span>}
          </button>
        </div>
      </div>
    </div>
  );
}
