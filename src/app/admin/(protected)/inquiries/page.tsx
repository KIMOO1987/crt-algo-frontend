"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { 
  Loader2, 
  User, 
  Mail, 
  MessageSquare, 
  CheckCircle2, 
  Clock, 
  Search, 
  RefreshCcw, 
  Send,
  Check,
  AlertCircle
} from 'lucide-react';

interface Inquiry {
  id: string;
  name: string;
  email: string;
  subject: string | null;
  message: string;
  status: 'pending' | 'replied';
  reply_message: string | null;
  replied_by: string | null;
  replied_at: string | null;
  created_at: string;
  updated_at: string;
  // Mapped:
  replied_by_name?: string;
  replied_by_email?: string;
}

export default function InquiriesManager() {
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [replyText, setReplyText] = useState("");
  const [activeReplyId, setActiveReplyId] = useState<string | null>(null);
  const [submittingReply, setSubmittingReply] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'replied'>('all');

  const fetchInquiries = async () => {
    setLoading(true);
    try {
      // Get current user session
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
      }

      // Fetch inquiries
      const { data: dbInquiries, error: dbError } = await supabase
        .from('contact_inquiries')
        .select('*')
        .order('created_at', { ascending: false });

      if (dbError) throw dbError;

      if (!dbInquiries || dbInquiries.length === 0) {
        setInquiries([]);
        setLoading(false);
        return;
      }

      // Fetch profiles in bulk for replied_by
      const staffIds = Array.from(new Set(dbInquiries.map(i => i.replied_by).filter(Boolean))) as string[];
      let profilesMap: Record<string, { full_name: string; email: string }> = {};

      if (staffIds.length > 0) {
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .in('id', staffIds);

        if (!profilesError && profiles) {
          profilesMap = profiles.reduce((acc, curr) => {
            acc[curr.id] = { full_name: curr.full_name, email: curr.email };
            return acc;
          }, {} as Record<string, { full_name: string; email: string }>);
        }
      }

      // Map profiles onto inquiries
      const mappedInquiries: Inquiry[] = dbInquiries.map(inquiry => {
        const staff = inquiry.replied_by ? profilesMap[inquiry.replied_by] : null;
        return {
          ...inquiry,
          replied_by_name: staff?.full_name || 'STAFF MEMBER',
          replied_by_email: staff?.email || ''
        };
      });

      setInquiries(mappedInquiries);
    } catch (err: any) {
      console.error("Error fetching inquiries:", err);
      alert("Failed to load inquiries: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInquiries();
  }, []);

  const handleSendReply = async (inquiryId: string) => {
    if (!replyText.trim()) return;
    setSubmittingReply(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        alert("You must be logged in to reply.");
        return;
      }

      const { error } = await supabase
        .from('contact_inquiries')
        .update({
          status: 'replied',
          reply_message: replyText,
          replied_by: user.id,
          replied_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', inquiryId);

      if (error) throw error;

      // Reset reply UI state
      setReplyText("");
      setActiveReplyId(null);
      
      // Refresh inquiries
      await fetchInquiries();
      alert("Reply saved successfully!");
    } catch (err: any) {
      console.error("Error submitting reply:", err);
      alert("Failed to submit reply: " + err.message);
    } finally {
      setSubmittingReply(false);
    }
  };

  // Stats calculation
  const totalCount = inquiries.length;
  const pendingCount = inquiries.filter(i => i.status === 'pending').length;
  const repliedCount = inquiries.filter(i => i.status === 'replied').length;

  // Filter inquiries list
  const filteredInquiries = inquiries.filter(inq => {
    const matchesStatus = statusFilter === 'all' || inq.status === statusFilter;
    const matchesSearch = 
      inq.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inq.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (inq.subject || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      inq.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (inq.reply_message || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center py-20">
        <div className="flex flex-col items-center justify-center py-20 animate-pulse">
          <Loader2 size={40} className="text-orange-500 mb-4 animate-spin" />
          <p className="text-xs font-black uppercase tracking-widest text-zinc-500">Loading Inquiries Queue...</p>
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
            Support <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-orange-600">Inquiries</span>
          </h1>
          <p className="text-[10px] uppercase tracking-[0.3em] font-bold mt-2 text-zinc-500 dark:text-zinc-400">
            • MANAGE CUSTOMER QUESTIONS AND REPLIES •
          </p>
        </div>
        <button 
          onClick={fetchInquiries}
          className="btn-secondary flex items-center gap-2"
        >
          <RefreshCcw size={14} /> Refresh List
        </button>
      </div>

      {/* Stats Summary Bento Grid */}
      <div className="grid grid-cols-3 gap-4 md:gap-6">
        <div className="glass-panel p-4 md:p-6 bg-zinc-500/[0.02] border border-[var(--glass-border)]">
          <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500 block mb-1">Total Inquiries</span>
          <span className="text-xl md:text-3xl font-black italic tracking-tighter text-zinc-900 dark:text-white">{totalCount}</span>
        </div>
        <div className="glass-panel p-4 md:p-6 bg-yellow-500/[0.02] border border-yellow-500/10">
          <span className="text-[9px] font-black uppercase tracking-widest text-yellow-500 block mb-1">Pending Questions</span>
          <span className="text-xl md:text-3xl font-black italic tracking-tighter text-yellow-550 dark:text-yellow-400">{pendingCount}</span>
        </div>
        <div className="glass-panel p-4 md:p-6 bg-emerald-500/[0.02] border border-emerald-500/10">
          <span className="text-[9px] font-black uppercase tracking-widest text-emerald-500 block mb-1">Replied</span>
          <span className="text-xl md:text-3xl font-black italic tracking-tighter text-emerald-500 dark:text-emerald-400">{repliedCount}</span>
        </div>
      </div>

      {/* Filters Control Panel */}
      <div className="glass-panel p-4 md:p-6 flex flex-col md:flex-row gap-4 items-center justify-between">
        
        {/* Search Input */}
        <div className="relative w-full md:w-96">
          <input 
            type="text" 
            placeholder="Search by name, email, subject, message..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-modern w-full pl-12 pr-4 font-bold"
          />
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600 dark:text-zinc-500" />
        </div>

        {/* Status Tab Filters */}
        <div className="flex items-center gap-1.5 p-1 bg-[var(--input-bg)] border border-[var(--input-border)] rounded-xl w-full md:w-auto overflow-x-auto">
          {(['all', 'pending', 'replied'] as const).map((status) => (
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
        {filteredInquiries.length === 0 ? (
          <div className="w-full flex flex-col items-center justify-center py-24 border border-dashed border-[var(--glass-border)] rounded-2xl bg-white/[0.01]">
            <CheckCircle2 size={40} className="text-zinc-500 mb-4" />
            <h3 className="text-xl font-black italic tracking-tighter uppercase text-zinc-900 dark:text-white mb-2">No Inquiries Found</h3>
            <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Adjust filters or search parameters.</p>
          </div>
        ) : (
          filteredInquiries.map(inq => (
            <div 
              key={inq.id} 
              className={`relative overflow-hidden glass-panel p-6 md:p-8 shadow-2xl flex flex-col gap-6 hover:border-[var(--accent)]/30 hover:shadow-[0_0_30px_var(--accent-glow)] transition-all duration-300 ${
                inq.status === 'pending' ? 'border-l-2 border-l-yellow-500' : 'border-l-2 border-l-emerald-500'
              }`}
            >
              <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 w-full">
                
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-3 mb-1 flex-wrap">
                    <p className="text-lg font-black italic uppercase tracking-tighter drop-shadow-md">
                      {inq.name}
                    </p>
                    
                    {/* Status badge */}
                    {inq.status === 'pending' ? (
                      <span className="text-[9px] font-black text-yellow-500 bg-yellow-550/10 px-2.5 py-1 rounded-lg border border-yellow-500/20 uppercase tracking-widest shadow-sm">
                        Pending Reply
                      </span>
                    ) : (
                      <span className="text-[9px] font-black text-emerald-500 bg-emerald-550/10 px-2.5 py-1 rounded-lg border border-emerald-500/20 uppercase tracking-widest shadow-sm">
                        Replied
                      </span>
                    )}
                  </div>
                  
                  {/* Email & Subject */}
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                    <span className="flex items-center gap-1.5"><Mail size={12}/> {inq.email}</span>
                    {inq.subject && (
                      <span className="flex items-center gap-1.5">
                        <MessageSquare size={12}/> Subject: <span className="text-zinc-900 dark:text-white">{inq.subject}</span>
                      </span>
                    )}
                  </div>

                  {/* Message content */}
                  <div className="bg-[var(--input-bg)] p-4 rounded-xl border border-[var(--glass-border)] text-sm leading-relaxed mt-2 text-zinc-900 dark:text-zinc-300">
                    {inq.message}
                  </div>

                  {/* Reply section if already replied */}
                  {inq.status === 'replied' && inq.reply_message && (
                    <div className="bg-emerald-500/5 p-4 rounded-xl border border-emerald-500/10 text-sm leading-relaxed mt-3 relative">
                      <div className="text-[9px] font-black text-emerald-500 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 bg-emerald-555 rounded-full" />
                        Replied by {inq.replied_by_name} ({inq.replied_by_email}) on {inq.replied_at ? new Date(inq.replied_at).toLocaleString() : 'N/A'}
                      </div>
                      <p className="text-zinc-800 dark:text-zinc-300 italic">{inq.reply_message}</p>
                    </div>
                  )}

                  {/* Input reply form if active */}
                  {activeReplyId === inq.id ? (
                    <div className="mt-4 flex flex-col gap-3">
                      <textarea
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        placeholder="Type your reply here..."
                        className="w-full bg-[var(--input-bg)] border border-[var(--glass-border)] rounded-xl px-4 py-3 text-sm text-zinc-900 dark:text-white outline-none focus:border-orange-500/50 hover:border-white/20 transition-all h-28 resize-none"
                      />
                      <div className="flex items-center gap-2 self-end">
                        <button
                          onClick={() => {
                            setActiveReplyId(null);
                            setReplyText("");
                          }}
                          className="px-4 py-2.5 rounded-lg border border-[var(--glass-border)] text-[10px] font-black uppercase tracking-widest hover:bg-white/[0.05] transition-all"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleSendReply(inq.id)}
                          disabled={submittingReply || !replyText.trim()}
                          className="px-6 py-2.5 bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400 text-white rounded-lg text-[10px] font-black uppercase tracking-[0.15em] transition-all flex items-center gap-2 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {submittingReply ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
                          Send Reply
                        </button>
                      </div>
                    </div>
                  ) : (
                    inq.status === 'pending' && (
                      <button
                        onClick={() => {
                          setActiveReplyId(inq.id);
                          setReplyText("");
                        }}
                        className="mt-4 px-6 py-2.5 bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400 text-white rounded-lg text-[10px] font-black uppercase tracking-[0.15em] transition-all flex items-center gap-2 w-fit shadow-lg"
                      >
                        <Send size={12} /> Reply to inquiry
                      </button>
                    )
                  )}

                  {/* Submission timestamp */}
                  <p className="text-[9px] font-mono text-zinc-550 dark:text-zinc-500 pt-1">
                    Submitted on: {new Date(inq.created_at).toLocaleString()}
                  </p>

                </div>

              </div>
            </div>
          ))
        )}
      </div>

    </div>
  );
}
