"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabaseClient';
import { 
  Loader2, 
  HelpCircle, 
  BookOpen, 
  Globe, 
  Lock, 
  CheckCircle2, 
  AlertTriangle, 
  ArrowRight, 
  User, 
  Sparkles,
  ExternalLink,
  ChevronRight,
  Info
} from 'lucide-react';

interface InviteRequest {
  id: string;
  tradingview_username: string;
  indicator_id: string;
  indicator_name: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
}

export default function ResourcesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [requests, setRequests] = useState<Record<string, InviteRequest>>({});
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedIndicator, setSelectedIndicator] = useState<{ id: string; name: string } | null>(null);
  const [tvUsername, setTvUsername] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState('');

  // Initial Fetch
  useEffect(() => {
    const checkUserAndFetchInvites = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }
      setUser(session.user);

      // Fetch requests
      const { data: invites, error } = await supabase
        .from('tradingview_invites')
        .select('*')
        .eq('user_id', session.user.id);

      if (error) {
        console.error("Error fetching TV invites:", error);
      } else if (invites) {
        const invitesMap = invites.reduce((acc, curr) => {
          acc[curr.indicator_id] = curr;
          return acc;
        }, {} as Record<string, InviteRequest>);
        setRequests(invitesMap);
      }
      setLoading(false);
    };

    checkUserAndFetchInvites();
  }, [router]);

  const openInviteModal = (indicatorId: string, indicatorName: string) => {
    const existing = requests[indicatorId];
    setSelectedIndicator({ id: indicatorId, name: indicatorName });
    setTvUsername(existing ? existing.tradingview_username : '');
    setModalError('');
    setIsModalOpen(true);
  };

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIndicator || !user) return;
    if (!tvUsername.trim()) {
      setModalError('Please enter a valid TradingView username.');
      return;
    }

    setSubmitting(true);
    setModalError('');

    try {
      const { data, error } = await supabase
        .from('tradingview_invites')
        .upsert({
          user_id: user.id,
          tradingview_username: tvUsername.trim(),
          indicator_id: selectedIndicator.id,
          indicator_name: selectedIndicator.name,
          status: 'pending',
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,indicator_id'
        })
        .select()
        .single();

      if (error) throw error;

      // Update state
      setRequests(prev => ({
        ...prev,
        [selectedIndicator.id]: data as InviteRequest
      }));
      
      setIsModalOpen(false);
    } catch (err: any) {
      console.error("Error submitting invite request:", err);
      setModalError(err.message || 'Failed to submit request. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center py-20">
        <div className="flex flex-col items-center justify-center py-20 animate-pulse">
          <Loader2 size={40} className="text-orange-500 mb-4 animate-spin" />
          <p className="text-xs font-black uppercase tracking-widest text-zinc-500">Synchronizing Resources...</p>
        </div>
      </div>
    );
  }

  // Local helper to render status badge
  const renderStatus = (indicatorId: string) => {
    const req = requests[indicatorId];
    if (!req) return null;

    if (req.status === 'approved') {
      return (
        <span className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase tracking-widest rounded-lg shadow-sm">
          <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-ping" />
          Access Active
        </span>
      );
    } else if (req.status === 'rejected') {
      return (
        <span className="flex items-center gap-1.5 px-3 py-1 bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] font-black uppercase tracking-widest rounded-lg shadow-sm">
          <span className="w-1.5 h-1.5 bg-red-400 rounded-full" />
          Access Denied
        </span>
      );
    } else {
      return (
        <span className="flex items-center gap-1.5 px-3 py-1 bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-[10px] font-black uppercase tracking-widest rounded-lg shadow-sm">
          <span className="w-1.5 h-1.5 bg-yellow-400 rounded-full animate-pulse" />
          Invite Pending
        </span>
      );
    }
  };

  return (
    <div className="w-full relative z-10 space-y-6 md:space-y-10">
      
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-6">
        <div>
          <h1 className="text-2xl md:text-4xl font-black tracking-tighter italic flex items-center gap-3 uppercase text-zinc-900 dark:text-white">
            Library<span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-orange-600">Resources</span>
          </h1>
          <p className="text-[10px] uppercase tracking-[0.4em] text-zinc-600 dark:text-zinc-500 font-bold mt-3 leading-none">
            • DOWNLOAD TRADINGVIEW SCRIPT INDICATORS & GUIDES •
          </p>
        </div>
        <div className="flex items-center gap-3 px-5 py-2.5 bg-orange-500/10 border border-orange-500/20 rounded-xl shadow-[0_0_20px_rgba(249,115,22,0.15)]">
          <Sparkles size={16} className="text-orange-400 drop-shadow-[0_0_5px_rgba(249,115,22,0.8)]" />
          <span className="text-[10px] font-black text-orange-400 uppercase tracking-widest">Premium Assets</span>
        </div>
      </div>

      {/* Info Notice Box */}
      <div className="glass-panel p-6 flex items-start gap-4 bg-gradient-to-r from-orange-500/[0.03] to-transparent border-l-2 border-l-orange-500">
        <Info size={20} className="text-orange-500 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <h4 className="text-xs font-black uppercase tracking-widest text-zinc-900 dark:text-white">TradingView Access Guide</h4>
          <p className="text-xs leading-relaxed text-zinc-700 dark:text-zinc-400 font-medium">
            TradingView scripts are divided into **Free** (open community scripts) and **Invite Only** (private algorithms). For invite-only access, enter your exact TradingView username. Our system administrator will review and grant script authorization within 24 hours.
          </p>
        </div>
      </div>

      {/* Grid of Resource Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
        
        {/* Card 1: Gold VP */}
        <div className="relative overflow-hidden glass-panel p-6 md:p-8 hover:border-orange-500/20 hover:shadow-[0_0_30px_rgba(249,115,22,0.08)] transition-all duration-300 flex flex-col h-full justify-between group">
          {/* Subtle Glow */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 blur-3xl rounded-full group-hover:bg-emerald-500/10 transition-all pointer-events-none" />
          
          <div className="space-y-6">
            <div className="flex items-start justify-between">
              <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                <Globe size={24} />
              </div>
              <span className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase tracking-widest rounded-lg shadow-sm">
                Free Access
              </span>
            </div>

            <div>
              <h3 className="text-xl font-black italic tracking-tighter uppercase text-zinc-900 dark:text-white drop-shadow-md mb-2.5">
                Gold VP - Volume Profile Single Indicator
              </h3>
              <p className="text-xs text-zinc-750 dark:text-zinc-400 leading-relaxed font-semibold">
                An essential volume analysis script that identifies high trading activity nodes. Automatically tracks historical volume by price levels over custom time ranges to reveal critical institutional support and resistance clusters.
              </p>
            </div>

            <div className="pt-4 border-t border-[var(--glass-border)] flex items-center justify-between text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
              <span>Author: Community</span>
              <span>Open Source</span>
            </div>
          </div>

          <div className="mt-8 pt-4">
            <a 
              href="https://www.tradingview.com/script/rgPgxON8-Gold-VP-Volume-Profile-Signal-Indicator/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="w-full btn-modern flex items-center justify-center gap-2"
            >
              Add to TradingView <ExternalLink size={14} />
            </a>
          </div>
        </div>

        {/* Card 2: 7H Profiling */}
        <div className="relative overflow-hidden glass-panel p-6 md:p-8 hover:border-orange-500/20 hover:shadow-[0_0_30px_rgba(249,115,22,0.08)] transition-all duration-300 flex flex-col h-full justify-between group">
          {/* Subtle Glow */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/5 blur-3xl rounded-full group-hover:bg-orange-500/10 transition-all pointer-events-none" />
          
          <div className="space-y-6">
            <div className="flex items-start justify-between">
              <div className="p-3.5 rounded-2xl bg-orange-500/10 border border-orange-500/20 text-orange-400">
                <Lock size={24} />
              </div>
              <div className="flex flex-col items-end gap-1.5">
                <span className="px-3 py-1 bg-orange-500/10 border border-orange-500/20 text-orange-400 text-[10px] font-black uppercase tracking-widest rounded-lg shadow-sm">
                  Invite Only
                </span>
                {renderStatus('7h_profiling')}
              </div>
            </div>

            <div>
              <h3 className="text-xl font-black italic tracking-tighter uppercase text-zinc-900 dark:text-white drop-shadow-md mb-2.5">
                7H Profiling by (KIMOOO1987)
              </h3>
              <p className="text-xs text-zinc-750 dark:text-zinc-400 leading-relaxed font-semibold">
                Premium multi-session market structure mapping tool. Plotted with horizontal volume nodes, session extensions, value areas, POC lines, and structural breakout keylevels to map liquidity traps like a professional orderbook analyst.
              </p>
            </div>

            {requests['7h_profiling'] && (
              <div className="p-3 rounded-xl bg-[var(--input-bg)] border border-[var(--glass-border)] text-zinc-700 dark:text-zinc-400 text-[11px] font-bold flex items-center justify-between">
                <span>Requested Username:</span>
                <span className="font-mono text-zinc-900 dark:text-white px-2 py-0.5 bg-orange-500/10 border border-orange-500/20 rounded-md">
                  {requests['7h_profiling'].tradingview_username}
                </span>
              </div>
            )}

            <div className="pt-4 border-t border-[var(--glass-border)] flex items-center justify-between text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
              <span>Author: KIMOOO1987</span>
              <span>Proprietary</span>
            </div>
          </div>

          <div className="mt-8 pt-4">
            {(() => {
              const req = requests['7h_profiling'];
              
              if (req?.status === 'approved') {
                return (
                  <a 
                    href="https://www.tradingview.com/script/YEKxUU99-7H-Profiling-by-KIMOOO1987/" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="w-full py-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 border border-emerald-500/30 text-white text-[11px] font-black uppercase tracking-[0.2em] rounded-xl transition-all duration-300 active:scale-95 flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(16,185,129,0.2)] hover:shadow-[0_0_30px_rgba(16,185,129,0.4)] cursor-pointer"
                  >
                    Launch Indicator <ExternalLink size={14} />
                  </a>
                );
              }

              if (req?.status === 'pending') {
                return (
                  <button 
                    onClick={() => openInviteModal('7h_profiling', '7H Profiling by (KIMOOO1987)')}
                    className="w-full py-4 bg-zinc-500/15 border border-zinc-500/20 text-zinc-500 text-[11px] font-black uppercase tracking-[0.2em] rounded-xl hover:bg-zinc-500/25 hover:text-zinc-800 dark:hover:text-zinc-350 transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    Change TV Username
                  </button>
                );
              }

              if (req?.status === 'rejected') {
                return (
                  <button 
                    onClick={() => openInviteModal('7h_profiling', '7H Profiling by (KIMOOO1987)')}
                    className="w-full py-4 bg-red-500/10 border border-red-500/20 text-red-400 text-[11px] font-black uppercase tracking-[0.2em] rounded-xl hover:bg-red-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    Retry Access Request
                  </button>
                );
              }

              return (
                <button 
                  onClick={() => openInviteModal('7h_profiling', '7H Profiling by (KIMOOO1987)')}
                  className="w-full btn-modern flex items-center justify-center gap-2"
                >
                  Request Access <ArrowRight size={14} />
                </button>
              );
            })()}
          </div>
        </div>

      </div>

      {/* Username Invite Request Modal */}
      <AnimatePresence>
        {isModalOpen && selectedIndicator && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-black/70 backdrop-blur-md"
            />

            {/* Modal Box */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: 'spring', duration: 0.4 }}
              className="relative w-full max-w-lg glass-panel p-6 md:p-10 shadow-2xl border border-white/[0.08]"
            >
              <div className="space-y-6">
                <div className="flex items-center gap-3">
                  <div className="p-3.5 rounded-2xl bg-orange-500/10 border border-orange-500/20 text-orange-400">
                    <User size={24} />
                  </div>
                  <div>
                    <h3 className="text-xl font-black italic tracking-tighter uppercase text-zinc-900 dark:text-white">
                      Script Authorization
                    </h3>
                    <p className="text-[9px] uppercase tracking-widest text-zinc-500 font-bold mt-1">
                      {selectedIndicator.name}
                    </p>
                  </div>
                </div>

                <div className="text-xs leading-relaxed text-zinc-700 dark:text-zinc-400 font-semibold space-y-2.5">
                  <p>
                    Please provide your **TradingView Username** so we can add your account to the script's whitelist invitation.
                  </p>
                  <p className="p-2.5 bg-orange-500/5 border border-orange-500/15 rounded-lg text-[11px] flex items-start gap-2">
                    <AlertTriangle size={14} className="text-orange-500 shrink-0 mt-0.5" />
                    Make sure the spelling matches your TradingView profile identity exactly. Double check for spaces or special symbols.
                  </p>
                </div>

                <form onSubmit={handleInviteSubmit} className="space-y-5">
                  <div className="space-y-2">
                    <label className="text-[9px] md:text-[10px] font-black text-zinc-600 dark:text-zinc-500 uppercase ml-1 tracking-widest">
                      TradingView Username
                    </label>
                    <div className="relative">
                      <input 
                        type="text" 
                        placeholder="e.g. trading_master_99" 
                        value={tvUsername}
                        onChange={(e) => setTvUsername(e.target.value)}
                        className="input-modern w-full pl-12 pr-4 font-bold"
                        required
                        disabled={submitting}
                      />
                      <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600 dark:text-zinc-500" />
                    </div>
                  </div>

                  {modalError && (
                    <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                      <AlertTriangle size={14} /> {modalError}
                    </div>
                  )}

                  <div className="flex items-center gap-4 pt-2">
                    <button 
                      type="button" 
                      onClick={() => setIsModalOpen(false)}
                      className="flex-1 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-350 hover:bg-zinc-550/10 rounded-xl transition-all cursor-pointer"
                      disabled={submitting}
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit" 
                      className="flex-2 btn-modern flex items-center justify-center gap-2 disabled:opacity-50"
                      disabled={submitting}
                    >
                      {submitting ? (
                        <>
                          <Loader2 size={14} className="animate-spin" /> Whitelisting...
                        </>
                      ) : (
                        <>
                          Submit Request <ChevronRight size={14} />
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
