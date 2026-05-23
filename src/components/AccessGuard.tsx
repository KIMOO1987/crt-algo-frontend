"use client";

import { useAuth } from '@/hooks/useAuth';
import { Lock, ShieldAlert, Activity } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

interface AccessGuardProps {
  children: React.ReactNode;
  requiredTier: number;
  tierName: string;
}

export default function AccessGuard({ children, requiredTier, tierName }: AccessGuardProps) {
  const { tier, loading } = useAuth();
  const [cachedTier, setCachedTier] = useState<number | null>(null);

  useEffect(() => {
    // Optimistically grab the tier from cache immediately to skip the loading screen
    const saved = sessionStorage.getItem('user_tier_cache');
    if (saved !== null) {
      setCachedTier(Number(saved));
    }
  }, []);

  useEffect(() => {
    // Update the background cache once the real network request finishes
    if (!loading) {
      sessionStorage.setItem('user_tier_cache', tier.toString());
      setCachedTier(tier);
    }
  }, [tier, loading]);

  const currentTier = cachedTier !== null ? cachedTier : tier;
  const showLoading = loading && cachedTier === null;

  // 1. Show a loader while checking the database
  if (showLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#05070a]">
        <Activity size={32} className="text-blue-500 animate-spin" />
      </div>
    );
  }

  // 2. If the user's tier is too low, show the "Blocked" UI
  if (currentTier < requiredTier) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center p-8 text-center">
        <div className="w-20 h-20 bg-blue-500/10 rounded-full flex items-center justify-center mb-6 border border-blue-500/20">
          <Lock className="text-blue-500" size={32} />
        </div>
        <h2 className="text-3xl font-black italic tracking-tighter uppercase text-zinc-900 dark:text-white">
          {tierName} <span className="text-blue-500">Access Required</span>
        </h2>
        <p className="text-zinc-600 dark:text-zinc-500 text-xs font-bold uppercase tracking-widest mt-4 max-w-md leading-relaxed">
          The CRT Institutional protocol for this module is locked for your current subscription level.
        </p>
        <Link 
          href="/pricing" 
          className="mt-8 px-8 py-4 bg-blue-500 text-black font-black uppercase text-[10px] tracking-[0.2em] rounded-full hover:bg-blue-400 transition-all shadow-[0_0_20px_rgba(59,130,246,0.3)]"
        >
          Upgrade to {tierName}
        </Link>
      </div>
    );
  }

  // 3. If they have the right tier, show the actual page (the children)
  return <>{children}</>;
}