"use client";
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Search, User, ChevronRight, Loader2, Filter, Trash2 } from 'lucide-react';
import Link from 'next/link';


import { apiFetch } from '@/lib/api-utils';

export default function FreeUsers() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [removingUserId, setRemovingUserId] = useState<string | null>(null); // State to track which user is being removed

  useEffect(() => {
    const fetchUsers = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('tier', 0)
        .order('created_at', { ascending: false });
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
      // Call the API to remove user from both profiles and auth.users
      const response = await apiFetch('/api/admin/delete-user', {
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
        <p className="text-xs font-black uppercase tracking-widest text-zinc-500">Loading Operators...</p>
      </div>
    </div>
  );

  return (
    <div className="w-full relative z-10 flex flex-col space-y-6 md:space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-4">
        <div>
          <h1 className="text-2xl md:text-4xl font-extrabold tracking-tight uppercase text-zinc-900 dark:text-white">
            Free <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-orange-600">Tier</span>
          </h1>
          <p className="text-[10px] uppercase tracking-[0.3em] font-bold mt-2 text-zinc-500 dark:text-zinc-400">
            • TRIAL OPERATORS & PROSPECTS •
          </p>
        </div>
        <div className="relative w-full md:w-80 h-[42px]">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
          <input 
            placeholder="Filter identity..." 
            className="w-full h-full pl-12 pr-4 input-modern text-xs font-mono text-zinc-900 dark:text-white outline-none"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="grid gap-4 w-full">
        {filtered.map(user => (
          <div key={user.id} className="relative overflow-hidden glass-panel p-6 shadow-2xl flex items-center justify-between group hover:border-[var(--accent)]/30 hover:shadow-[0_0_30px_var(--accent-glow)] transition-all duration-300">
            <Link href={`/admin/users/details?id=${user.id}`} className="relative z-10 flex items-center gap-5 flex-grow">
              <div className="w-12 h-12 rounded-xl bg-white/[0.03] border border-[var(--glass-border)] flex items-center justify-center text-zinc-500 group-hover:text-orange-500 group-hover:border-orange-500/30 group-hover:bg-orange-500/10 transition-all shadow-lg">
                <User size={20} />
              </div>
              <div>
                <p className="text-base font-black italic tracking-tight drop-shadow-md text-zinc-900 dark:text-white">{user.full_name || 'TRADER'}</p>
                <p className="text-[10px] font-mono font-bold text-zinc-550 dark:text-zinc-500 uppercase tracking-widest mt-1">{user.email}</p>
              </div>
            </Link>
            <div className="relative z-10 flex items-center gap-4">
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
              <div className="p-2 rounded-xl bg-white/[0.02] border border-[var(--glass-border)] text-zinc-500 group-hover:bg-white/[0.08] group-hover:text-zinc-900 dark:text-white transition-all group-hover:border-white/20">
                <ChevronRight size={18} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
