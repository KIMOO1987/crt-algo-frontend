"use client";

import { useAuth } from '@/hooks/useAuth';
import { Activity, Lock } from 'lucide-react';
import Link from 'next/link';

export default function RoleGuard({ children }: { children: React.ReactNode }) {
  const { user, role, tier, loading } = useAuth();

  // 1. While Supabase is verifying the session, show a spinner
  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
        <Activity size={32} className="text-blue-500 animate-spin" />
        <p className="text-[10px] font-black text-zinc-600 dark:text-zinc-500 uppercase tracking-[0.3em]">
          Verifying Access...
        </p>
      </div>
    );
  }

  // 2. Loading is done but no user session — show blocked UI directly
  if (!user) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center p-8 text-center">
        <div className="w-20 h-20 bg-blue-500/10 rounded-full flex items-center justify-center mb-6 border border-blue-500/20">
          <Lock className="text-blue-500" size={32} />
        </div>
        <h2 className="text-3xl font-black italic tracking-tighter uppercase text-zinc-900 dark:text-white">
          Alpha <span className="text-blue-500">Access Required</span>
        </h2>
        <p className="text-zinc-600 dark:text-zinc-500 text-xs font-bold uppercase tracking-widest mt-4 max-w-md leading-relaxed">
          The CRT Institutional protocol for this module is locked for your current subscription level.
        </p>
        <Link
          href="/login"
          className="mt-8 px-8 py-4 bg-blue-500 text-black font-black uppercase text-[10px] tracking-[0.2em] rounded-full hover:bg-blue-400 transition-all shadow-[0_0_20px_rgba(59,130,246,0.3)]"
        >
          Sign In
        </Link>
      </div>
    );
  }

  // 3. User is confirmed — render the page
  return <>{children}</>;
}
