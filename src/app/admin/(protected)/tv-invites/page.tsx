"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { 
  Loader2, 
  User, 
  Mail, 
  Copy, 
  Check, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Search, 
  RefreshCcw, 
  AlertCircle 
} from 'lucide-react';

interface InviteRequest {
  id: string;
  user_id: string;
  tradingview_username: string;
  indicator_id: string;
  indicator_name: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  updated_at: string;
  payment_method?: 'FREE' | 'CRYPTO' | 'WHOP';
  crypto_hash?: string | null;
  payment_amount?: number;
  duration_months?: number;
  // Mapped in-memory:
  full_name?: string;
  email?: string;
  tier?: number;
  plan_type?: string;
}

export default function TVInvitesManager() {
  const [requests, setRequests] = useState<InviteRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  
  // Filtering & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');

  const fetchRequests = async () => {
    setLoading(true);
    try {
      // 1. Fetch TV invites
      const { data: invites, error: invitesError } = await supabase
        .from('tradingview_invites')
        .select('*')
        .neq('status', 'pending_payment')
        .order('created_at', { ascending: false });

      if (invitesError) throw invitesError;

      if (!invites || invites.length === 0) {
        setRequests([]);
        setLoading(false);
        return;
      }

      // 2. Fetch profiles in bulk to attach full name, email, tier and plan
      const userIds = Array.from(new Set(invites.map(i => i.user_id)));
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, email, tier, plan_type')
        .in('id', userIds);

      if (profilesError) {
        console.error("Error fetching user profiles:", profilesError);
      }

      const profilesMap = (profiles || []).reduce((acc, curr) => {
        acc[curr.id] = curr;
        return acc;
      }, {} as Record<string, { full_name: string; email: string; tier?: number; plan_type?: string }>);

      // 3. Map together
      const mapped: InviteRequest[] = invites.map(invite => ({
        ...invite,
        full_name: profilesMap[invite.user_id]?.full_name || 'UNKNOWN TRADER',
        email: profilesMap[invite.user_id]?.email || '',
        tier: profilesMap[invite.user_id]?.tier ?? 0,
        plan_type: profilesMap[invite.user_id]?.plan_type || 'ALPHA'
      }));

      setRequests(mapped);
    } catch (err: any) {
      console.error("Error loading TV invites:", err);
      alert("Failed to load TradingView invite queue: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleUpdateStatus = async (requestId: string, newStatus: 'approved' | 'rejected' | 'pending') => {
    try {
      const { error } = await supabase
        .from('tradingview_invites')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', requestId);

      if (error) throw error;

      // Update local state
      setRequests(prev => prev.map(r => r.id === requestId ? { ...r, status: newStatus } : r));
    } catch (err: any) {
      alert("Failed to update invite status: " + err.message);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Stats calculation
  const totalRequests = requests.length;
  const pendingRequests = requests.filter(r => r.status === 'pending').length;
  const approvedRequests = requests.filter(r => r.status === 'approved').length;
  const rejectedRequests = requests.filter(r => r.status === 'rejected').length;

  // Filtered requests list
  const filteredRequests = requests.filter(req => {
    const matchesStatus = statusFilter === 'all' || req.status === statusFilter;
    const matchesSearch = 
      req.tradingview_username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (req.full_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (req.email || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (req.indicator_name || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center py-20">
        <div className="flex flex-col items-center justify-center py-20 animate-pulse">
          <Loader2 size={40} className="text-orange-500 mb-4 animate-spin" />
          <p className="text-xs font-black uppercase tracking-widest text-zinc-500">Loading Invite Queue...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full relative z-10 flex flex-col space-y-6 md:space-y-8">
      
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-4">
        <div>
          <h1 className="text-2xl md:text-4xl font-extrabold tracking-tight uppercase text-zinc-900 dark:text-white">
            TV Invite <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-orange-600">Console</span>
          </h1>
          <p className="text-[10px] uppercase tracking-[0.3em] font-bold mt-2 text-zinc-500 dark:text-zinc-400">
            • TRADINGVIEW PRIVATE INDICATOR ACCESS MANAGER •
          </p>
        </div>
        <button 
          onClick={fetchRequests}
          className="btn-secondary flex items-center gap-2"
        >
          <RefreshCcw size={14} /> Refresh List
        </button>
      </div>

      {/* Stats Summary Bento Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <div className="glass-panel p-4 md:p-6 bg-zinc-500/[0.02] border border-[var(--glass-border)]">
          <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500 block mb-1">Total Requests</span>
          <span className="text-xl md:text-3xl font-black italic tracking-tighter text-zinc-900 dark:text-white">{totalRequests}</span>
        </div>
        <div className="glass-panel p-4 md:p-6 bg-yellow-500/[0.02] border border-yellow-500/10">
          <span className="text-[9px] font-black uppercase tracking-widest text-yellow-500 block mb-1">Pending Queue</span>
          <span className="text-xl md:text-3xl font-black italic tracking-tighter text-yellow-550 dark:text-yellow-400">{pendingRequests}</span>
        </div>
        <div className="glass-panel p-4 md:p-6 bg-emerald-500/[0.02] border border-emerald-500/10">
          <span className="text-[9px] font-black uppercase tracking-widest text-emerald-500 block mb-1">Approved Invites</span>
          <span className="text-xl md:text-3xl font-black italic tracking-tighter text-emerald-500 dark:text-emerald-400">{approvedRequests}</span>
        </div>
        <div className="glass-panel p-4 md:p-6 bg-red-500/[0.02] border border-red-500/10">
          <span className="text-[9px] font-black uppercase tracking-widest text-red-500 block mb-1">Rejected Invites</span>
          <span className="text-xl md:text-3xl font-black italic tracking-tighter text-red-500 dark:text-red-400">{rejectedRequests}</span>
        </div>
      </div>

      {/* Filters Control Panel */}
      <div className="glass-panel p-4 md:p-6 flex flex-col md:flex-row gap-4 items-center justify-between">
        
        {/* Search Input */}
        <div className="relative w-full md:w-96">
          <input 
            type="text" 
            placeholder="Search by TV user, Email, Name or Indicator..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-modern w-full pl-12 pr-4 font-bold"
          />
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600 dark:text-zinc-500" />
        </div>

        {/* Status Tab Filters */}
        <div className="flex items-center gap-1.5 p-1 bg-[var(--input-bg)] border border-[var(--input-border)] rounded-xl w-full md:w-auto overflow-x-auto">
          {(['all', 'pending', 'approved', 'rejected'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`flex-1 md:flex-none px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all cursor-pointer ${
                statusFilter === status 
                  ? 'bg-orange-500/15 border border-orange-500/20 text-orange-500 shadow-sm'
                  : 'opacity-60 border-transparent hover:opacity-100 hover:bg-[var(--glass-bg)]'
              }`}
            >
              {status}
            </button>
          ))}
        </div>

      </div>

      {/* Main Request Queue List */}
      <div className="grid gap-6 w-full">
        {filteredRequests.length === 0 ? (
          <div className="w-full flex flex-col items-center justify-center py-24 border border-dashed border-[var(--glass-border)] rounded-2xl bg-white/[0.01]">
            <CheckCircle2 size={40} className="text-zinc-550 dark:text-zinc-500 mb-4" />
            <h3 className="text-xl font-black italic tracking-tighter uppercase text-zinc-900 dark:text-white mb-2">No Requests Found</h3>
            <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Adjust filters or search parameters.</p>
          </div>
        ) : (
          filteredRequests.map(req => (
            <div 
              key={req.id} 
              className={`relative overflow-hidden glass-panel p-6 md:p-8 shadow-2xl flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 hover:border-[var(--accent)]/30 hover:shadow-[0_0_30px_var(--accent-glow)] transition-all duration-300 ${
                req.status === 'pending' ? 'border-l-2 border-l-yellow-500' :
                req.status === 'approved' ? 'border-l-2 border-l-emerald-500' :
                'border-l-2 border-l-red-500'
              }`}
            >
              <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center gap-5 w-full lg:w-auto">
                
                {/* User avatar indicator */}
                <div className="w-14 h-14 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.15)] shrink-0">
                  <User size={24} />
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-3 mb-1 flex-wrap">
                    <p className="text-lg font-black italic uppercase tracking-tighter drop-shadow-md">
                      {req.full_name}
                    </p>
                    
                    {/* User Subscription tier badge */}
                    <span className={`text-[9px] font-black px-2.5 py-1 rounded-lg border uppercase tracking-widest shadow-sm ${
                      req.tier === 3 ? 'text-indigo-450 bg-indigo-500/10 border-indigo-500/20 shadow-[0_0_10px_rgba(99,102,241,0.2)]' :
                      req.tier === 2 ? 'text-blue-450 bg-blue-500/10 border-blue-500/20' :
                      req.tier === 1 ? 'text-orange-450 bg-orange-500/10 border-orange-500/20' :
                      'text-zinc-500 dark:text-zinc-400 bg-zinc-500/5 border-[var(--glass-border)]'
                    }`}>
                      Plan: {req.plan_type || (req.tier === 3 ? 'ULTIMATE' : req.tier === 2 ? 'PRO' : req.tier === 1 ? 'ACTIVE' : 'ALPHA')} (Tier {req.tier})
                    </span>

                    {/* Status badge */}
                    {req.status === 'pending' && (
                      <span className="text-[9px] font-black text-yellow-450 bg-yellow-500/10 px-2.5 py-1 rounded-lg border border-yellow-500/20 uppercase tracking-widest shadow-sm">
                        Pending Approval
                      </span>
                    )}
                    {req.status === 'approved' && (
                      <span className="text-[9px] font-black text-emerald-450 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20 uppercase tracking-widest shadow-sm">
                        Active Access
                      </span>
                    )}
                    {req.status === 'rejected' && (
                      <span className="text-[9px] font-black text-red-450 bg-red-500/10 px-2.5 py-1 rounded-lg border border-red-500/20 uppercase tracking-widest shadow-sm">
                        Access Revoked
                      </span>
                    )}
                  </div>
                  
                  {/* Email */}
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-[10px] font-bold text-zinc-550 dark:text-zinc-500 uppercase tracking-widest">
                    <span className="flex items-center gap-1"><Mail size={12}/> {req.email || 'NO EMAIL'}</span>
                  </div>

                  {/* Indicator name & payment details block */}
                  <div className="flex flex-wrap items-center gap-2 mt-2.5 mb-2">
                    <div className="px-3 py-1.5 rounded-lg bg-orange-500/15 border border-orange-500/20 text-orange-500 text-[10px] font-black uppercase tracking-wider w-fit flex items-center gap-1.5 shadow-sm">
                      <span className="w-1.5 h-1.5 bg-orange-400 rounded-full animate-pulse" />
                      Indicator: {req.indicator_name}
                    </div>

                    {req.payment_method !== 'FREE' && (
                      <span className={`text-[9px] font-black px-2.5 py-1.5 rounded-lg border uppercase tracking-widest ${
                        req.payment_method === 'WHOP' ? 'text-blue-400 bg-blue-500/10 border-blue-500/20' : 'text-amber-400 bg-amber-500/10 border-amber-500/20'
                      }`}>
                        {req.payment_method} - ${req.payment_amount} ({req.duration_months}M)
                      </span>
                    )}
                  </div>

                  {/* Transaction Hash */}
                  {req.payment_method === 'CRYPTO' && req.crypto_hash && (
                    <div className="flex items-center gap-2 bg-[var(--input-bg)] p-2.5 rounded-xl border border-[var(--glass-border)] w-fit mt-1.5 mb-2.5">
                      <span className="text-[8px] font-black text-zinc-500 uppercase tracking-widest px-1">TxID:</span>
                      <code className="text-xs font-mono font-bold text-zinc-700 dark:text-zinc-350 select-all">
                        {req.crypto_hash}
                      </code>
                    </div>
                  )}

                  {/* Warning for Lower Tiers on paid scripts */}
                  {req.tier === 0 && req.indicator_id === '7h_profiling' && (
                    <div className="mt-2 px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-[9px] font-black uppercase tracking-widest w-fit flex items-center gap-1.5 shadow-sm">
                      <AlertCircle size={12} className="shrink-0" />
                      Warning: Free User (Tier 0) requesting paid indicator
                    </div>
                  )}

                  {/* Request timestamp */}
                  <p className="text-[9px] font-mono text-zinc-650 dark:text-zinc-555 font-bold pt-1">
                    Requested on: {new Date(req.created_at).toLocaleString()}
                  </p>
                </div>
              </div>
              
              {/* Copy & Status Controls */}
              <div className="relative z-10 flex flex-col sm:flex-row items-center gap-4 w-full lg:w-auto shrink-0">
                
                {/* TV Username display & copy block */}
                <div className="w-full sm:w-auto p-3 rounded-xl bg-[var(--input-bg)] border border-[var(--input-border)] flex items-center justify-between gap-4">
                  <div>
                    <span className="text-[8px] font-black text-zinc-650 dark:text-zinc-500 uppercase tracking-widest block mb-0.5">TV Username</span>
                    <span className="font-mono text-xs font-bold text-zinc-900 dark:text-white">{req.tradingview_username}</span>
                  </div>
                  <button 
                    onClick={() => copyToClipboard(req.tradingview_username, req.id)}
                    className="p-2 rounded-lg bg-[var(--glass-bg)] hover:bg-[var(--input-border)] text-zinc-600 dark:text-zinc-400 hover:text-orange-500 transition-colors border border-[var(--glass-border)] cursor-pointer"
                    title="Copy to clipboard"
                  >
                    {copiedId === req.id ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                  </button>
                </div>

                {/* Status modifiers */}
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  {req.status !== 'approved' && (
                    <button 
                      onClick={() => handleUpdateStatus(req.id, 'approved')}
                      className="flex-1 sm:flex-none bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white px-5 py-3 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-1.5 shadow-[0_0_15px_rgba(16,185,129,0.15)] cursor-pointer"
                    >
                      <CheckCircle2 size={12} /> Approve
                    </button>
                  )}
                  {req.status !== 'rejected' && (
                    <button 
                      onClick={() => handleUpdateStatus(req.id, 'rejected')}
                      className="flex-1 sm:flex-none border border-red-500/20 bg-red-500/5 hover:bg-red-500/10 text-red-400 px-5 py-3 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <XCircle size={12} /> Reject
                    </button>
                  )}
                  {(req.status === 'approved' || req.status === 'rejected') && (
                    <button 
                      onClick={() => handleUpdateStatus(req.id, 'pending')}
                      className="flex-1 sm:flex-none border border-[var(--glass-border)] hover:bg-white/[0.05] text-zinc-500 px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Clock size={12} /> Pending
                    </button>
                  )}
                </div>

              </div>

            </div>
          ))
        )}
      </div>

    </div>
  );
}
