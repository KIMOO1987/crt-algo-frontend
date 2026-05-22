"use client";

import React, { useState, useEffect } from 'react';
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
      { name: 'OKX', icon: (props: { size?: number }) => <img src="/okx.png" alt="OKX" width={props.size || 18} height={props.size || 18} className="object-contain" />, path: '/dashboard/okx', minTier: 2 },
      { name: '3Commas (Webhook)', icon: Zap, path: '/dashboard/three-commas', minTier: 2 },
    ]
  }
];

export default function MobileNav({ tier, role }: { tier: number; role?: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isButtonVisible, setIsButtonVisible] = useState(true);
  const pathname = usePathname();
  const isStaff = role === 'admin' || role === 'moderator';

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : 'unset';
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen]);

  useEffect(() => {
    let lastScrollY = typeof window !== 'undefined' ? window.scrollY : 0;
    let ticking = false;

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const mainContainer = document.getElementById('main-scroll-container');

          // Check both window scroll and internal container scroll
          const currentScrollY = window.scrollY > 0 ? window.scrollY : (mainContainer?.scrollTop || 0);

          // Hide button if scrolling down and past 50px, show if scrolling up
          if (currentScrollY > lastScrollY && currentScrollY > 50) {
            setIsButtonVisible(false);
          } else {
            setIsButtonVisible(true);
          }
          lastScrollY = currentScrollY;
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });

    // Also listen to internal container just in case it's handling the overflow
    const mainContainer = document.getElementById('main-scroll-container');
    if (mainContainer) {
      mainContainer.addEventListener('scroll', handleScroll, { passive: true });
    }

    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (mainContainer) mainContainer.removeEventListener('scroll', handleScroll);
    };
  }, []);

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

  return (
    <div className="lg:hidden">
      <div
        className={`fixed top-5 left-4 z-[990] transition-transform duration-300 ease-in-out ${isButtonVisible || isOpen ? 'translate-y-0' : '-translate-y-24'}`}
      >
        <button onClick={() => setIsOpen(true)} className="px-4 py-2 bg-[var(--glass-bg)] backdrop-blur-md rounded-xl text-zinc-900 dark:text-white shadow-lg border border-[var(--glass-border)] active:scale-95 transition-all flex items-center gap-2">
          <Menu size={18} />
          <span className="text-[10px] font-black uppercase tracking-widest">MENU</span>
        </button>
      </div>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 z-[995] bg-black/60 backdrop-blur-sm"
            />

            {/* Sidebar Drawer */}
            <motion.div initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }} transition={{ type: "spring", bounce: 0, duration: 0.4 }} className="fixed inset-y-0 left-0 z-[1000] bg-[var(--bg)] border-r border-[var(--glass-border)] flex flex-col p-6 w-80 shadow-2xl">
              {/* Subtle background glow */}
              <div className="absolute top-0 left-0 w-full h-64 bg-gradient-to-b from-[var(--glow-primary)] to-transparent opacity-20 pointer-events-none" />

              <div className="flex justify-between items-center mb-10 shrink-0 relative z-10">
                <div>
                  <h1 className="text-3xl font-black tracking-tighter uppercase drop-shadow-md">KIMOO<span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-orange-600">PRO</span></h1>
                  {isStaff && (
                    <div className="flex items-center gap-1.5 mt-3 px-2.5 py-1 bg-orange-500/10 border border-orange-500/20 rounded-full w-fit shadow-sm">
                      <ShieldCheck size={10} className="text-orange-500" />
                      <span className="text-[8px] font-black text-orange-600 dark:text-orange-400 uppercase tracking-widest">{role} Mode</span>
                    </div>
                  )}
                </div>
                <button onClick={() => setIsOpen(false)} className="p-2 opacity-50 hover:opacity-100 transition-colors"><X size={32} /></button>
              </div>
              <nav className="flex-1 overflow-y-auto space-y-10 no-scrollbar pb-20 relative z-10">
                {menuGroups.map((group) => (
                  <div key={group.label}>
                    <p className="text-[9px] font-black text-zinc-600 tracking-[0.25em] mb-4 px-3 uppercase">{group.label}</p>
                    <div className="space-y-1.5">
                      {group.items.map((item) => {
                        const isActive = pathname === item.path;
                        const isLocked = !isStaff && tier < item.minTier;

                        return (
                          <Link key={item.name} href={isLocked ? "#" : item.path} onClick={() => !isLocked && setIsOpen(false)}>
                            <div className={`flex items-center justify-between px-4 py-3.5 rounded-full transition-all duration-300 border ${isActive ? 'bg-[var(--glow-primary)] text-[var(--fg)] border-[var(--glass-border-highlight)] shadow-md' : 'opacity-70 border-transparent hover:opacity-100 bg-[var(--input-bg)] border-[var(--glass-border)]'
                              } ${isLocked ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'}`}>
                              <div className="flex items-center gap-4">
                                <item.icon size={18} strokeWidth={isActive ? 2.5 : 2} />
                                <span className="font-bold text-sm tracking-tight">{item.name}</span>
                              </div>
                              {isLocked ? <Lock size={14} className="opacity-50" /> : isActive && <div className="w-1.5 h-1.5 bg-[var(--fg)] rounded-full shadow-[0_0_5px_rgba(255,255,255,0.8)]" />}
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </nav>

              <div className="mt-auto pt-6 border-t border-[var(--glass-border)] shrink-0 flex items-center gap-3 relative z-10">
                <ThemeToggle className="p-3.5 rounded-2xl bg-[var(--input-bg)] border border-[var(--glass-border)] text-zinc-500 hover:text-[var(--fg)] hover:border-blue-500/30 transition-all flex items-center justify-center shrink-0 group" />
                <button onClick={handleLogout} className="flex-1 flex items-center justify-center gap-3 px-4 py-3.5 opacity-70 hover:opacity-100 bg-transparent hover:bg-red-500/10 border border-transparent hover:border-red-500/20 hover:text-red-400 transition-all rounded-2xl group">
                  <LogOut size={16} className="group-hover:scale-110 transition-transform" />
                  <span className="text-[10px] font-black uppercase tracking-widest">SIGN OUT</span>
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
