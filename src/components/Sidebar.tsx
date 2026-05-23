"use client";

import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutGrid, Clock, History, Zap, Compass, BarChart3,
  CheckSquare, LineChart, User, CreditCard,
  LogOut, Lock, X, Menu, ShieldCheck,
  Terminal, Activity, Cpu
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import { useEffect, useState } from 'react';
import { ThemeToggle } from './ThemeToggle';

const menuGroups = [
  {
    label: 'TERMINAL',
    items: [
      { name: 'Dashboard', icon: LayoutGrid, path: '/dashboard', minTier: 0 },
      { name: 'Active Trades', icon: Clock, path: '/dashboard/active', minTier: 1 },
      { name: 'Trade History', icon: History, path: '/dashboard/history', minTier: 1 },
    ]
  },
  {
    label: 'RADAR & ANALYSIS',
    items: [

      { name: 'Alpha Radar', icon: Compass, path: '/dashboard/radar', minTier: 1 },
      { name: 'Symbol Audit', icon: BarChart3, path: '/dashboard/audit', minTier: 1 },
    ]
  },
  {
    label: 'STRATEGY LAB',
    items: [

      { name: 'Performance', icon: LineChart, path: '/dashboard/performance', minTier: 1 },
    ]
  },
  {
    label: 'ACCOUNT & SETTINGS',
    items: [
      { name: 'Profile', icon: User, path: '/dashboard/profile', minTier: 0 },
      { name: 'Payments', icon: CreditCard, path: '/dashboard/payments', minTier: 0 },
    ]
  },
  {
    label: 'CFD Bots',
    items: [
      { name: 'CFD Bot', icon: Cpu, path: '/dashboard/bot/cfd', minTier: 2 },
      { name: 'MT5', icon: (props: { size?: number }) => <img src="/mt5.png" alt="MT5" width={props.size || 18} height={props.size || 18} className="object-contain" />, path: '/dashboard/mt5', minTier: 2 },
      { name: 'cTrader', icon: (props: { size?: number }) => <img src="/ctrader-logo.png" alt="cTrader" width={props.size || 18} height={props.size || 18} className="object-contain" />, path: '/dashboard/ctrader', minTier: 2 },
    ]
  },
  {
    label: 'Crypto Bots',
    items: [
      { name: 'API Trading (Multi)', icon: Cpu, path: '/dashboard/api-trading', minTier: 2 },
      { name: '3Commas (Webhook)', icon: Zap, path: '/dashboard/three-commas', minTier: 2 },
    ]
  }
];

export default function Sidebar({ tier, role }: { tier: number; role?: string }) {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // Staff check: Admin and Moderator get full access
  const isStaff = role === 'admin' || role === 'moderator';

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      window.localStorage.clear();
      window.sessionStorage.clear();
      window.location.href = '/login';
    } catch (error) {
      window.location.href = '/login';
    }
  };

  if (!mounted) return null;

  return (
    <>
      <aside className={`
        fixed inset-y-0 left-0 w-72 glass-panel border-r border-[var(--glass-border)] flex flex-col overflow-hidden
        transition-transform duration-300 ease-in-out z-[9998] !rounded-none !border-y-0 !border-l-0
        ${isOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0
      `}>
        {/* Subtle background glow */}
        <div className="absolute top-0 left-0 w-full h-64 bg-gradient-to-b from-[var(--glow-primary)] to-transparent opacity-20 pointer-events-none" />

        <div className="flex flex-col h-full w-full p-6 relative z-10">
          <div className="mb-10 px-2 shrink-0">
            <h1 className="text-3xl font-black tracking-tighter uppercase drop-shadow-md">
              KIMOO<span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-orange-600">PRO</span>
            </h1>
            {isStaff && (
              <div className="flex items-center gap-1.5 mt-3 px-2.5 py-1 bg-orange-500/10 border border-orange-500/20 rounded-full w-fit shadow-sm">
                <ShieldCheck size={10} className="text-orange-500" />
                <span className="text-[8px] font-black text-orange-600 dark:text-orange-400 uppercase tracking-widest">{role} Access</span>
              </div>
            )}
          </div>

          <nav className="flex-1 overflow-y-auto pr-2 no-scrollbar">
            {menuGroups.map((group) => (
              <div key={group.label} className="mb-8">
                <p className="text-[9px] font-black text-zinc-600 tracking-[0.25em] mb-4 px-3 uppercase">{group.label}</p>
                <div className="space-y-1.5">
                  {group.items.map((item) => {
                    const isActive = pathname === item.path;
                    // Staff never locked, others locked by tier
                    const isLocked = !isStaff && tier < item.minTier;

                    return (
                      <Link key={item.name} href={isLocked ? "#" : item.path} onClick={() => !isLocked && setIsOpen(false)}>
                        <div className={`flex items-center justify-between px-4 py-3 rounded-full transition-all duration-300 border ${isActive
                          ? 'bg-[var(--glow-primary)] text-[var(--fg)] border-[var(--glass-border-highlight)] shadow-md'
                          : 'opacity-70 border-transparent hover:opacity-100 hover:bg-[var(--input-bg)] hover:border-[var(--glass-border)]'
                          } ${isLocked ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'}`}>
                          <div className="flex items-center gap-3">
                            <item.icon size={18} />
                            <span className="text-[12px] font-bold tracking-tight">{item.name}</span>
                          </div>
                          {isLocked ? <Lock size={12} className="opacity-50" /> : isActive && <div className="w-1.5 h-1.5 bg-[var(--fg)] rounded-full shadow-[0_0_5px_rgba(255,255,255,0.8)]" />}
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>

          <div className="mt-auto pt-6 border-t border-[var(--glass-border)] shrink-0 flex items-center gap-3">
            <ThemeToggle className="p-3.5 rounded-2xl bg-[var(--input-bg)] border border-[var(--glass-border)] text-zinc-500 hover:text-[var(--fg)] hover:border-blue-500/30 transition-all flex items-center justify-center shrink-0 group" />
            <button onClick={handleLogout} className="flex-1 flex items-center justify-center gap-3 px-4 py-3.5 opacity-70 hover:opacity-100 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 hover:text-red-400 transition-all rounded-2xl group">
              <LogOut size={16} className="group-hover:scale-110 transition-transform" />
              <span className="text-[10px] font-black uppercase tracking-widest">SIGN OUT</span>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
