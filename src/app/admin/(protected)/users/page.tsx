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
    <div className="min-h-screen flex items-center justify-center ">
      <div className="flex flex-col items-center justify-center py-20 animate-pulse">
        <Loader2 size={40} className="text-zinc-700 mb-4 animate-spin" />
        <p className="text-xs font-black uppercase tracking-widest text-zinc-600">Loading Operators...</p>
      </div>
    </div>
  );

  return (
    <div className="relative p-4 md:p-12 lg:p-16  min-h-screen text-zinc-900 dark:text-white font-sans overflow-x-hidden">
      
      {/* Ambient Glowing Backgrounds */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-blue-600/10 blur-[150px] rounded-full mix-blend-screen" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-indigo-600/10 blur-[150px] rounded-full mix-blend-screen" />
      </div>

      <div className="max-w-[1700px] mx-auto relative z-10">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-8 md:mb-12">
          <div>
            <h1 className="text-2xl md:text-4xl font-black tracking-tighter italic flex items-center gap-3 uppercase text-zinc-900 dark:text-white">
              Free<span className="text-transparent bg-clip-text bg-gradient-to-r from-zinc-400 to-zinc-600">Tier</span>
            </h1>
            <p className="text-[10px] uppercase tracking-[0.4em] text-zinc-600 dark:text-zinc-500 font-bold mt-3 leading-none">
              • TRIAL OPERATORS & PROSPECTS •
            </p>
          </div>
          <div className="relative w-full md:w-80 h-[42px]">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600 dark:text-zinc-500" size={16} />
            <input 
              placeholder="Filter identity..." 
              className="w-full h-full bg-white/[0.02] border border-white/[0.08] rounded-xl py-3 pl-12 pr-4 text-xs font-mono text-zinc-900 dark:text-white outline-none focus:border-blue-500/50 hover:border-white/20 transition-all"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="grid gap-4 max-w-5xl mx-auto">
          {filtered.map(user => (
            <div key={user.id} className="relative overflow-hidden bg-gradient-to-br from-white/[0.04] to-white/[0.01] border border-white/[0.05] p-6 rounded-[2rem] hover:border-white/[0.1] hover:bg-white/[0.06] transition-all duration-300 group shadow-2xl flex items-center justify-between">
              <div className="absolute inset-0 bg-gradient-to-br from-white/[0.05] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              
              <Link href={`/admin/users/details?id=${user.id}`} className="relative z-10 flex items-center gap-5 flex-grow">
                <div className="w-12 h-12 rounded-2xl bg-white/[0.03] border border-white/[0.05] flex items-center justify-center text-zinc-500 group-hover:text-blue-400 group-hover:border-blue-500/30 group-hover:bg-blue-500/10 transition-all shadow-lg">
                  <User size={20} />
                </div>
                <div>
                  <p className="text-base font-black italic tracking-tight drop-shadow-md text-zinc-900 dark:text-white">{user.full_name || 'TRADER'}</p>
                  <p className="text-[10px] font-mono font-bold text-zinc-600 dark:text-zinc-500 uppercase tracking-widest mt-1">{user.email}</p>
                </div>
              </Link>
              <div className="relative z-10 flex items-center gap-4">
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleRemoveUser(user.id);
                  }}
                  className="text-[9px] font-black text-red-400 uppercase tracking-widest bg-red-500/10 border border-red-500/20 px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all flex items-center gap-2 hover:bg-red-500/20 hover:shadow-[0_0_15px_rgba(239,68,68,0.2)]"
                  disabled={removingUserId === user.id}
                >
                  {removingUserId === user.id ? (
                    <Loader2 className="animate-spin text-red-200" size={12} />
                  ) : (
                    <Trash2 size={12} />
                  )}
                  Remove
                </button>
                <div className="p-2 rounded-xl bg-white/[0.02] border border-white/[0.05] text-zinc-600 dark:text-zinc-500 group-hover:bg-white/[0.08] group-hover:text-zinc-900 dark:text-white transition-all group-hover:border-white/20">
                  <ChevronRight size={18} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
