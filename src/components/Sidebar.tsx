"use client";

import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutGrid, Clock, History, Zap, Compass, BarChart3,
  CheckSquare, LineChart, User, CreditCard,
  LogOut, Lock, X, Menu, ShieldCheck,
  Terminal, Activity, Cpu, Settings, UserPlus, Mail, BookOpen, Bell
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import { useEffect, useState } from 'react';
import { ThemeToggle } from './ThemeToggle';

interface MenuItem {
  name: string;
  icon: any;
  path: string;
  minTier: number;
}

interface MenuGroup {
  key: string;
  label: string;
  items: MenuItem[];
}

const baseGroups: MenuGroup[] = [
  {
    key: 'crt',
    label: 'CRT SECTION',
    items: [
      { name: 'Dashboard', icon: LayoutGrid, path: '/dashboard/crt', minTier: 0 },
      { name: 'Pro Terminal', icon: LineChart, path: '/dashboard/chart', minTier: 0 },
      { name: 'Active Trades', icon: Clock, path: '/dashboard/crt/active', minTier: 1 },
      { name: 'Trade History', icon: History, path: '/dashboard/crt/history', minTier: 1 },
      { name: 'Alpha Radar', icon: Compass, path: '/dashboard/crt/radar', minTier: 1 },
      { name: 'Symbol Audit', icon: BarChart3, path: '/dashboard/crt/audit', minTier: 1 },
      { name: 'Performance', icon: LineChart, path: '/dashboard/crt/performance', minTier: 1 },
    ]
  },
  {
    key: 'sfp',
    label: 'SFP SECTION',
    items: [
      { name: 'Dashboard', icon: LayoutGrid, path: '/dashboard/sfp', minTier: 0 },
      { name: 'Active Trades', icon: Clock, path: '/dashboard/sfp/active', minTier: 1 },
      { name: 'Trade History', icon: History, path: '/dashboard/sfp/history', minTier: 1 },
      { name: 'Alpha Radar', icon: Compass, path: '/dashboard/sfp/radar', minTier: 1 },
      { name: 'Symbol Audit', icon: BarChart3, path: '/dashboard/sfp/audit', minTier: 1 },
      { name: 'Performance', icon: LineChart, path: '/dashboard/sfp/performance', minTier: 1 },
    ]
  },
  {
    key: 'settings',
    label: 'ACCOUNT & SETTINGS',
    items: [
      { name: 'Profile', icon: User, path: '/dashboard/profile', minTier: 0 },
      { name: 'Telegram Alerts', icon: Bell, path: '/dashboard/alerts', minTier: 2 },
      { name: 'Payments', icon: CreditCard, path: '/dashboard/payments', minTier: 0 },
      { name: 'Trade General', icon: BookOpen, path: '/dashboard/trade-general', minTier: 1 },
      { name: 'Resources', icon: Zap, path: '/dashboard/resources', minTier: 0 },
    ]
  },
  {
    key: 'cfd_bots',
    label: 'CFD BOTS',
    items: [
      { name: 'CFD Bot', icon: Cpu, path: '/dashboard/bot/cfd', minTier: 2 },
      { name: 'MT5', icon: (props: { size?: number }) => <img src="/mt5.png" alt="MT5" width={props.size || 18} height={props.size || 18} className="object-contain" />, path: '/dashboard/mt5', minTier: 2 },
      { name: 'cTrader', icon: (props: { size?: number }) => <img src="/ctrader-logo.png" alt="cTrader" width={props.size || 18} height={props.size || 18} className="object-contain" />, path: '/dashboard/ctrader', minTier: 2 },
    ]
  },
  {
    key: 'crypto_bots',
    label: 'CRYPTO BOTS',
    items: [
      { name: 'API Trading (Multi)', icon: Cpu, path: '/dashboard/api-trading', minTier: 2 },
    ]
  }
];

const TriangleIcon = ({ isOpen }: { isOpen: boolean }) => (
  <svg
    width="8"
    height="8"
    viewBox="0 0 24 24"
    fill="currentColor"
    className={`transition-transform duration-250 ${isOpen ? 'rotate-180 text-orange-500' : 'rotate-90 text-zinc-500 opacity-60'}`}
  >
    <path d="M24 22h-24l12-20z" />
  </svg>
);

export default function Sidebar({ tier, role }: { tier: number; role?: string }) {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState<{ [key: string]: boolean }>({
    crt: false,
    sfp: false,
    settings: false,
    cfd_bots: false,
    crypto_bots: false,
    system_control: false,
    user_management: false,
    financial: false
  });

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem('sidebar_collapsed_groups');
    if (saved) {
      try {
        setCollapsedGroups(JSON.parse(saved));
      } catch (e) {}
    }
  }, []);

  const toggleGroup = (key: string) => {
    setCollapsedGroups(prev => {
      const updated = { ...prev, [key]: !prev[key] };
      localStorage.setItem('sidebar_collapsed_groups', JSON.stringify(updated));
      return updated;
    });
  };

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      const theme = window.localStorage.getItem('theme');
      window.localStorage.clear();
      if (theme) window.localStorage.setItem('theme', theme);
      window.sessionStorage.clear();
      window.location.href = '/';
    } catch (error) {
      window.location.href = '/';
    }
  };

  // Staff check: Admin and Moderator get full access
  const isStaff = role === 'admin' || role === 'moderator';
  const isAdmin = role === 'admin';

  // Construct dynamic menu groups based on role
  const dynamicMenuGroups = [...baseGroups];

  if (isStaff) {
    const systemControlItems = [
      { name: 'Signals Manager', path: '/admin/signals', icon: Activity, minTier: 0 },
      { name: 'Plans Editor', path: '/admin/plans', icon: Settings, minTier: 0 },
    ];
    if (isAdmin) {
      systemControlItems.push({ name: 'Staff Manager', path: '/admin/staff', icon: UserPlus, minTier: 0 });
    }
    const userManagementItems = [
      { name: 'New User', path: '/admin/new-user', icon: UserPlus, minTier: 0 },
      { name: 'Premium Members', path: '/admin/premium', icon: UserPlus, minTier: 0 },
      { name: 'Free Members', path: '/admin/users', icon: UserPlus, minTier: 0 },
      { name: 'Reset Requests', path: '/admin/resets', icon: UserPlus, minTier: 0 },
      { name: 'TV Invites', path: '/admin/tv-invites', icon: Activity, minTier: 0 },
      { name: 'Contact Messages', path: '/admin/inquiries', icon: Mail, minTier: 0 },
    ];

    dynamicMenuGroups.push({
      key: 'system_control',
      label: 'SYSTEM CONTROL',
      items: systemControlItems
    });

    dynamicMenuGroups.push({
      key: 'user_management',
      label: 'USER MANAGEMENT',
      items: userManagementItems
    });

    if (isAdmin) {
      dynamicMenuGroups.push({
        key: 'financial',
        label: 'FINANCIAL',
        items: [
          { name: 'Payment Terminal', path: '/admin/payments', icon: CreditCard, minTier: 0 }
        ]
      });
    }
  }

  if (!mounted) return null;

  return (
    <>
      <aside className={`
        fixed inset-y-0 left-0 w-72 glass-panel border-r border-[var(--glass-border)] flex flex-col overflow-hidden
        transition-transform duration-300 ease-in-out z-[9998] !rounded-none !border-y-0 !border-l-0
        ${isOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0
      `}>
        {/* Subtle background glow */}
        <div className="absolute top-0 left-0 w-full h-64 bg-gradient-to-b from-orange-500/5 to-transparent opacity-40 pointer-events-none" />

        <div className="flex flex-col h-full w-full p-6 relative z-10">
          <div className="mb-10 px-2 shrink-0">
            <h1 className="text-3xl font-black tracking-tighter uppercase drop-shadow-md">
              CRT-ALGO<span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-orange-600">PRO</span>
            </h1>
            {isStaff && (
              <div className="flex items-center gap-1.5 mt-3 px-2.5 py-1 bg-orange-500/10 border border-orange-500/20 rounded-lg w-fit shadow-sm">
                <ShieldCheck size={10} className="text-orange-500" />
                <span className="text-[8px] font-black text-orange-600 dark:text-orange-400 uppercase tracking-widest">{role} Access</span>
              </div>
            )}
          </div>

          <nav className="flex-1 overflow-y-auto pr-2 no-scrollbar">
            {dynamicMenuGroups.map((group) => {
              const isExpanded = !collapsedGroups[group.key];

              return (
                <div key={group.key} className="mb-6">
                  <button 
                    onClick={() => toggleGroup(group.key)}
                    className="w-full flex items-center justify-between px-3 py-1 text-[10px] font-bold text-zinc-500 dark:text-zinc-400 tracking-[0.2em] mb-3 uppercase text-left hover:text-orange-500 transition-colors"
                  >
                    <span>{group.label}</span>
                    <TriangleIcon isOpen={isExpanded} />
                  </button>

                  <motion.div
                    initial={false}
                    animate={{ height: isExpanded ? 'auto' : 0, opacity: isExpanded ? 1 : 0 }}
                    transition={{ duration: 0.2, ease: "easeInOut" }}
                    className="overflow-hidden space-y-1"
                  >
                    {group.items.map((item) => {
                      const isActive = pathname === item.path || pathname?.startsWith(item.path + '/');
                      // Staff never locked, others locked by tier
                      const isLocked = !isStaff && tier < item.minTier;

                      return (
                        <Link key={item.name} href={isLocked ? "#" : item.path} onClick={() => !isLocked && setIsOpen(false)}>
                          <div className={`flex items-center justify-between px-4 py-2.5 rounded-lg transition-all duration-200 border text-foreground ${isActive
                            ? 'bg-orange-500/10 text-orange-500 dark:text-orange-400 border-orange-500/20 shadow-sm'
                            : 'opacity-70 border-transparent hover:opacity-100 hover:bg-[var(--input-bg)] hover:border-[var(--glass-border)]'
                            } ${isLocked ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'}`}>
                            <div className="flex items-center gap-3">
                              <item.icon size={16} />
                              <span className="text-[12px] font-semibold tracking-tight">{item.name}</span>
                            </div>
                            {isLocked ? <Lock size={12} className="opacity-50" /> : isActive && <div className="w-1.5 h-1.5 bg-orange-500 rounded-full shadow-[0_0_8px_rgba(249,115,22,0.8)]" />}
                          </div>
                        </Link>
                      );
                    })}
                  </motion.div>
                </div>
              );
            })}
          </nav>

          <div className="mt-auto pt-6 border-t border-[var(--glass-border)] shrink-0 flex items-center gap-3">
            <ThemeToggle className="p-3 rounded-xl bg-[var(--input-bg)] border border-[var(--glass-border)] text-zinc-500 hover:text-[var(--fg)] hover:border-orange-500/30 transition-all flex items-center justify-center shrink-0 group" />
            <button onClick={handleLogout} className="flex-1 flex items-center justify-center gap-3 px-4 py-3 opacity-70 hover:opacity-100 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 hover:text-red-400 transition-all rounded-xl group">
              <LogOut size={16} className="group-hover:scale-110 transition-transform" />
              <span className="text-[10px] font-black uppercase tracking-widest">SIGN OUT</span>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
