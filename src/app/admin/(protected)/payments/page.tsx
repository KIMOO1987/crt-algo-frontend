"use client";

import { useEffect, useState, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabaseClient';

import {
  Check,
  ExternalLink,
  Loader2,
  RefreshCcw,
  Trash2,
  Zap,
  Crown,
  Star,
  Search,
  Clock,
  DollarSign,
  ShieldAlert,
  CheckCircle2
} from 'lucide-react';

import { apiFetch } from '@/lib/api-utils';

export default function AdminPayments() {
  const [requests, setRequests] = useState<any[]>([]);
  const [allProfiles, setAllProfiles] = useState<any[]>([]);
  const [dbPlans, setDbPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const getTimeAgo = (dateString: string) => {
    if (!dateString) return "Pending";
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (diffInSeconds < 60) return `Just now`;
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    const { data: plansData } = await supabase.from('plans').select('id, price');
    if (plansData) setDbPlans(plansData);

    const { data: profileData, error } = await supabase.from('profiles').select('*');
    if (!error && profileData) {
      setAllProfiles(profileData);
      setRequests(profileData.filter(p => p.pending_crypto_hash !== null));
    }
    setLoading(false);
  }, []);

  const totalEarnings = useMemo(() => {
    const priceMap = dbPlans.reduce((acc, plan) => {
      acc[plan.id] = plan.price;
      return acc;
    }, {} as Record<string, number>);
    return allProfiles.reduce((acc, curr) => {
      const price = priceMap[curr.subscription_status] || 0;
      return acc + price;
    }, 0);
  }, [allProfiles, dbPlans]);

  const filteredRequests = useMemo(() => {
    return requests
      .filter(req =>
        req.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        req.pending_crypto_hash?.toLowerCase().includes(searchQuery.toLowerCase())
      )
      .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
  }, [requests, searchQuery]);

  useEffect(() => {
    const verifyAccess = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { window.location.href = '/admin/login'; return; }
      const { data } = await supabase.from('profiles').select('role').eq('id', user.id).single();
      if (data?.role === 'admin') { setRole('admin'); fetchData(); }
      else { setRole('unauthorized'); }
    };
    verifyAccess();
  }, [fetchData]);

  // FIXED: approveUser now calls an API
  async function approveUser(userId: string, requestedPlan: string) {
    if (!confirm(`Authorize [${requestedPlan?.toUpperCase()}] Access?`)) return;
    try {
      const response = await apiFetch('/api/admin/approve-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, requestedPlan })
      });
      const result = await response.json();
      if (result.error) throw new Error(result.error);
      fetchData();
    } catch (err: any) {
      alert(`Failed: ${err.message}`);
    }
  }

  // FIXED: kickHash now calls an API
  async function kickHash(userId: string) {
    if (!confirm("KICK HASH: This will delete the TxID. Proceed?")) return;
    try {
      const response = await apiFetch('/api/admin/kick-hash', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      });
      const result = await response.json();
      if (result.error) throw new Error(result.error);
      fetchData();
    } catch (err: any) {
      alert(`Failed: ${err.message}`);
    }
  }

  if (role === null) return (
    <div className="flex-1 flex items-center justify-center py-20">
      <div className="flex flex-col items-center justify-center py-20 animate-pulse">
        <Loader2 size={40} className="text-orange-500 mb-4 animate-spin" />
        <p className="text-xs font-black uppercase tracking-widest text-zinc-500">Verifying Clearance...</p>
      </div>
    </div>
  );

  if (role === 'unauthorized') return (
    <div className="flex-1 flex flex-col items-center justify-center py-20 text-center">
      <ShieldAlert className="text-red-500 mb-4 animate-bounce" size={48} />
      <h2 className="text-2xl font-black text-zinc-900 dark:text-white uppercase italic tracking-tighter">Unauthorized Access</h2>
      <p className="text-zinc-500 text-[10px] uppercase font-bold tracking-[0.2em] mt-3 max-w-xs leading-relaxed">Contact Super Admin for terminal clearance</p>
    </div>
  );

  return (
    <div className="w-full relative z-10 flex flex-col space-y-6 md:space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 w-full">
        <div className="relative overflow-hidden glass-panel p-6 md:p-8 flex items-center justify-between shadow-2xl hover:border-orange-500/30 hover:shadow-[0_0_30px_rgba(249,115,22,0.15)] transition-all duration-300">
          <div>
            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-2">Total Verified Revenue</p>
            <h2 className="text-3xl md:text-4xl font-extrabold italic text-zinc-900 dark:text-white tracking-tighter">${totalEarnings} <span className="text-sm not-italic text-zinc-500 ml-2 font-bold tracking-widest">USDT</span></h2>
          </div>
          <div className="bg-orange-500/10 border border-orange-500/20 p-4 rounded-2xl">
            <DollarSign className="text-orange-500" size={28} />
          </div>
        </div>

        <div className="relative overflow-hidden glass-panel p-6 md:p-8 flex items-center justify-between shadow-2xl transition-all duration-300">
          <div>
            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-2">Active Queue</p>
            <h2 className="text-3xl md:text-4xl font-extrabold italic text-zinc-900 dark:text-white tracking-tighter">{requests.length} <span className="text-sm not-italic text-zinc-500 ml-2 font-bold tracking-widest">Pending</span></h2>
          </div>
          <div className="bg-white/[0.03] border border-[var(--glass-border)] p-4 rounded-2xl">
            <Clock className="text-zinc-500" size={28} />
          </div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-4 w-full">
        <div>
          <h1 className="text-2xl md:text-4xl font-extrabold tracking-tight uppercase text-zinc-900 dark:text-white">
            Terminal <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-orange-600">Hashes</span>
          </h1>
          <p className="text-[10px] uppercase tracking-[0.3em] font-bold mt-2 text-zinc-500 dark:text-zinc-400">• CRYPTO PAYMENT VALIDATION QUEUE •</p>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
          <div className="relative w-full sm:w-80 h-[42px]">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
            <input
              type="text"
              placeholder="Search by email or hash..."
              className="w-full h-full pl-12 pr-4 input-modern text-xs font-mono text-zinc-900 dark:text-white outline-none"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <button onClick={fetchData} className="p-3 bg-white/[0.02] border border-[var(--glass-border)] rounded-xl hover:bg-white/[0.08] hover:border-white/20 hover:text-orange-500 transition-all text-zinc-500 flex items-center justify-center cursor-pointer">
            <RefreshCcw size={18} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      <div className="w-full">
        {loading && requests.length === 0 ? (
          <div className="w-full flex flex-col items-center justify-center py-20 animate-pulse">
            <Loader2 size={40} className="text-orange-500 mb-4 animate-spin" />
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="w-full flex flex-col items-center justify-center py-24 border border-dashed border-[var(--glass-border)] rounded-2xl bg-white/[0.01]">
            <CheckCircle2 size={40} className="text-zinc-500 mb-4" />
            <h3 className="text-xl font-black italic tracking-tighter uppercase text-zinc-900 dark:text-white mb-2">Queue Empty</h3>
            <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">
              {searchQuery ? "No results match your search" : "All payments validated."}
            </p>
          </div>
        ) : (
          <div className="grid gap-6">
            {filteredRequests.map((req) => {
              const isUltimate = req.pending_plan_id === 'ultimate';
              const isAlpha = req.pending_plan_id === 'alpha';
              return (
                <div key={req.id} className="relative overflow-hidden glass-panel p-6 md:p-8 shadow-2xl flex flex-col lg:flex-row items-start lg:items-center justify-between group hover:border-[var(--accent)]/30 hover:shadow-[0_0_30px_var(--accent-glow)] transition-all duration-300 gap-6">
                  <div className="space-y-4 flex-1 relative z-10 w-full">
                    <div className="flex flex-wrap items-center gap-4">
                      <span className="text-base font-black italic uppercase tracking-tighter text-zinc-900 dark:text-white">{req.email}</span>
                      <span className="flex items-center gap-1.5 text-[9px] font-bold text-zinc-500 bg-white/[0.03] px-3 py-1 rounded-lg border border-[var(--glass-border)]">
                        <Clock size={12} className="text-zinc-500" />
                        {getTimeAgo(req.updated_at)}
                      </span>
                      <span className={`flex items-center gap-1.5 text-[9px] font-black px-3 py-1 rounded-lg uppercase border tracking-widest ${
                        isUltimate ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' :
                        isAlpha ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                        'bg-orange-500/10 text-orange-400 border-orange-500/20'
                      }`}>
                        {isUltimate ? <Crown size={10} /> : isAlpha ? <Zap size={10} /> : <Star size={10} />}
                        {req.pending_plan_id?.toUpperCase() || "PRO"}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 bg-[var(--input-bg)] p-3 rounded-xl border border-[var(--glass-border)] w-full lg:w-fit">
                      <code className="text-xs font-mono font-bold text-zinc-650 dark:text-zinc-350 truncate max-w-[200px] sm:max-w-md">
                        {req.pending_crypto_hash}
                      </code>
                      <a href={`https://tronscan.org/#/transaction/${req.pending_crypto_hash}`} target="_blank" className="p-2 bg-white/[0.03] border border-[var(--glass-border)] hover:bg-white/[0.1] rounded-lg text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors ml-auto">
                        <ExternalLink size={14} />
                      </a>
                    </div>
                  </div>
                  <div className="relative z-10 flex items-center gap-4 w-full lg:w-auto mt-2 lg:mt-0">
                    <button onClick={() => kickHash(req.id)} className="flex-1 lg:flex-none flex items-center justify-center gap-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 px-6 py-4 rounded-xl font-black text-[10px] uppercase tracking-[0.2em] border border-red-500/20 transition-all cursor-pointer">
                      <Trash2 size={16} />
                    </button>
                    <button onClick={() => approveUser(req.id, req.pending_plan_id)} className="flex-1 lg:flex-none flex items-center justify-center gap-3 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-405 text-white px-10 py-4 rounded-xl font-black text-[11px] uppercase tracking-[0.2em] shadow-[0_0_30px_rgba(16,185,129,0.2)] active:scale-95 border border-emerald-500/30 transition-all cursor-pointer">
                      <Check size={18} />
                      Approve
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
