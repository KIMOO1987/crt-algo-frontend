"use client";
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Search, User, ShieldCheck, ChevronRight, Loader2, Crown, Zap, Star, Trash2 } from 'lucide-react';
import Link from 'next/link';



export default function PremiumUsers() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [removingUserId, setRemovingUserId] = useState<string | null>(null); // State to track which user is being removed

  useEffect(() => {
    const fetchUsers = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'user')
        .gt('tier', 0)
        .order('tier', { ascending: false });
      if (data) setUsers(data);
      setLoading(false);
    };
    fetchUsers();
  }, []);

  const handleRemoveUser = async (userId: string) => {
    if (!confirm('Are you sure you want to remove this user? This action cannot be undone.')) {
      return;
    }
    setRemovingUserId(userId);
    try {
      // Call the API to remove user
      const response = await fetch('/api/admin/delete-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      });
      const result = await response.json();
      if (result.error) throw new Error(result.error);

      // Update local state
      setUsers(prevUsers => prevUsers.filter(user => user.id !== userId));
    } catch (error: any) {
      console.error('Error removing user:', error.message);
      alert(`Failed to remove user: ${error.message}`);
    } finally {
      setRemovingUserId(null);
    }
  };

  const filtered = users.filter(u => u.email?.toLowerCase().includes(query.toLowerCase()) || u.full_name?.toLowerCase().includes(query.toLowerCase()));

  if (loading) return (
    <div className="flex-1 flex items-center justify-center py-20">
      <div className="flex flex-col items-center justify-center py-20 animate-pulse">
        <Loader2 size={40} className="text-orange-500 mb-4 animate-spin" />
        <p className="text-xs font-black uppercase tracking-widest text-zinc-500">Loading Premium Fleet...</p>
      </div>
    </div>
  );

  return (
    <div className="w-full relative z-10 flex flex-col space-y-6 md:space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-4">
        <div>
          <h1 className="text-2xl md:text-4xl font-extrabold tracking-tight uppercase text-zinc-900 dark:text-white">
            Premium <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-orange-600">Fleet</span>
          </h1>
          <p className="text-[10px] uppercase tracking-[0.3em] font-bold mt-2 text-zinc-500 dark:text-zinc-400">
            • ACTIVE CRT LICENSE HOLDERS •
          </p>
        </div>
        <div className="relative w-full md:w-80 h-[42px]">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
          <input 
            placeholder="Search email or name..." 
            className="w-full h-full pl-12 pr-4 input-modern text-xs font-mono text-zinc-900 dark:text-white outline-none"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="grid gap-4 w-full">
        {filtered.map(user => (
          <div key={user.id} className="relative overflow-hidden glass-panel p-6 shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6 hover:border-[var(--accent)]/30 hover:shadow-[0_0_30px_var(--accent-glow)] transition-all duration-300 group">
            <Link href={`/admin/users/details?id=${user.id}`} className="relative z-10 flex items-center gap-5 flex-grow w-full md:w-auto">
              <div className="w-14 h-14 shrink-0 rounded-xl bg-white/[0.03] border border-[var(--glass-border)] flex items-center justify-center text-zinc-500 group-hover:text-orange-500 group-hover:border-orange-500/30 group-hover:bg-orange-500/10 transition-all shadow-lg">
                <User size={24} />
              </div>
              <div className="truncate flex-grow">
                <div className="flex items-center gap-3 mb-1">
                  <p className="text-base font-black italic tracking-tight drop-shadow-md text-zinc-900 dark:text-white truncate max-w-[150px] sm:max-w-xs">{user.full_name || 'TRADER'}</p>
                  <TierBadge tier={user.tier} />
                </div>
                <p className="text-[10px] font-mono font-bold text-zinc-550 dark:text-zinc-500 uppercase tracking-widest truncate">{user.email}</p>
              </div>
            </Link>
            
            <div className="relative z-10 flex items-center justify-between md:justify-end gap-6 w-full md:w-auto border-t md:border-t-0 border-white/5 pt-4 md:pt-0 shrink-0">
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleRemoveUser(user.id);
                }}
                className="text-[9px] font-black text-red-400 uppercase tracking-widest bg-red-500/10 border border-red-500/20 px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all flex items-center gap-2 hover:bg-red-500/20 hover:shadow-[0_0_15px_rgba(239,68,68,0.2)] cursor-pointer"
                disabled={removingUserId === user.id}
              >
                {removingUserId === user.id ? (
                  <Loader2 className="animate-spin text-red-200" size={12} />
                ) : (
                  <Trash2 size={12} />
                )}
                Remove
              </button>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-0.5">Expires</p>
                  <p className="text-[10px] font-bold font-mono text-zinc-800 dark:text-zinc-300">{user.expiry_date ? new Date(user.expiry_date).toLocaleDateString() : 'NEVER'}</p>
                </div>
                <div className="p-2 rounded-xl bg-white/[0.02] border border-[var(--glass-border)] text-zinc-500 group-hover:bg-white/[0.08] group-hover:text-zinc-900 dark:text-white transition-all group-hover:border-white/20">
                  <ChevronRight size={18} />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TierBadge({ tier }: { tier: number }) {
  const styles: any = {
    3: { label: 'ULTIMATE', color: 'text-purple-400 bg-purple-500/10 border-purple-500/20 shadow-[0_0_10px_rgba(168,85,247,0.2)]', icon: <Crown size={10}/> },
    2: { label: 'PRO', color: 'text-blue-400 bg-blue-500/10 border-blue-500/20 shadow-[0_0_10px_rgba(59,130,246,0.2)]', icon: <Star size={10}/> },
    1: { label: 'ALPHA', color: 'text-amber-400 bg-amber-500/10 border-amber-500/20 shadow-[0_0_10px_rgba(245,158,11,0.2)]', icon: <Zap size={10}/> },
  };
  const s = styles[tier] || styles[1];
  return (
    <span className={`flex items-center gap-1.5 text-[8px] md:text-[9px] font-black px-2.5 py-1 rounded-lg border uppercase tracking-widest ${s.color}`}>
      {s.icon} {s.label}
    </span>
  );
}
