"use client";
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

import { Loader2, Mail, Lock, CheckCircle2, User, XCircle } from 'lucide-react';

export default function PasswordResets() {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRequests = async () => {
      const { data, error } = await supabase.from('password_reset_requests').select('*').eq('status', 'pending');
      if (error) {
        console.error("Error fetching password reset requests:", error);
        // Optionally, display an error message to the user
      } else if (data) {
        setRequests(data);
      }
      setLoading(false);
    };
    fetchRequests();
  }, []);

  const handleManualReset = async (requestId: string, userId: string, email: string) => {
    const newPass = prompt(`Enter new temporary password for ${email}:`);
    if (!newPass || newPass.length < 6) return alert("Password too short.");

    try {
      const response = await fetch('/api/admin/force-reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, newPassword: newPass })
      });
      const result = await response.json();
      if (result.error) throw new Error(result.error);
      await supabase.from('password_reset_requests').update({ status: 'completed' }).eq('id', requestId);
      setRequests(requests.filter(r => r.id !== requestId));
      alert("Identity Access Keys rotated successfully.");
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  };

  const handleRejectRequest = async (requestId: string) => {
    if (!confirm("Are you sure you want to reject this recovery request?")) return;

    try {
      const { error } = await supabase.from('password_reset_requests').update({ status: 'rejected' }).eq('id', requestId);
      if (error) throw error;
      setRequests(requests.filter(r => r.id !== requestId));
    } catch (err: any) {
      alert("Error rejecting request: " + err.message);
    }
  };

  if (loading) return (
    <div className="flex-1 flex items-center justify-center py-20">
      <div className="flex flex-col items-center justify-center py-20 animate-pulse">
        <Loader2 size={40} className="text-orange-500 mb-4 animate-spin" />
        <p className="text-xs font-black uppercase tracking-widest text-zinc-500">Loading Recovery Queue...</p>
      </div>
    </div>
  );

  return (
    <div className="w-full relative z-10 flex flex-col space-y-6 md:space-y-8">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-4">
        <div>
          <h1 className="text-2xl md:text-4xl font-extrabold tracking-tight uppercase text-zinc-900 dark:text-white">
            Access <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-orange-600">Recovery</span>
          </h1>
          <p className="text-[10px] uppercase tracking-[0.3em] font-bold mt-2 text-zinc-500 dark:text-zinc-400">
            • MANUAL PASSWORD INTERVENTION QUEUE •
          </p>
        </div>
      </div>

      <div className="grid gap-6 w-full">
        {requests.length === 0 ? (
          <div className="w-full flex flex-col items-center justify-center py-24 border border-dashed border-[var(--glass-border)] rounded-2xl bg-white/[0.01]">
            <CheckCircle2 size={40} className="text-zinc-550 dark:text-zinc-500 mb-4" />
            <h3 className="text-xl font-black italic tracking-tighter uppercase text-zinc-900 dark:text-white mb-2">Queue Empty</h3>
            <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">No pending recovery tickets.</p>
          </div>
        ) : (
          requests.map(req => (
            <div key={req.id} className="relative overflow-hidden glass-panel p-6 md:p-8 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-6 hover:border-[var(--accent)]/30 hover:shadow-[0_0_30px_var(--accent-glow)] transition-all duration-300">
              <div className="relative z-10 flex items-center gap-5 w-full md:w-auto">
                <div className="w-14 h-14 rounded-xl bg-orange-550/10 border border-orange-555/20 flex items-center justify-center text-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.2)]">
                  <Lock size={24} />
                </div>
                <div>
                  <div className="flex items-center gap-3 mb-1 flex-wrap">
                    <p className="text-lg font-black italic uppercase tracking-tighter drop-shadow-md">{req.full_name}</p>
                    <span className="text-[9px] font-black text-orange-500 bg-orange-500/10 px-2.5 py-1 rounded-lg border border-orange-500/20 uppercase tracking-widest shadow-sm">Pending Verification</span>
                  </div>
                  <p className="text-[10px] font-mono font-bold text-zinc-550 dark:text-zinc-500 uppercase tracking-widest">{req.email}</p>
                </div>
              </div>
              
              <div className="relative z-10 flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
                <button 
                  onClick={() => handleRejectRequest(req.id)}
                  className="w-full sm:w-auto px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 hover:text-red-400 transition-all flex items-center justify-center gap-2 hover:bg-red-500/10 rounded-xl cursor-pointer"
                >
                  <XCircle size={14} /> Reject
                </button>
                <button 
                  onClick={() => handleManualReset(req.id, req.user_id, req.email)}
                  className="w-full sm:w-auto bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-450 text-white px-8 py-4 rounded-xl text-[11px] font-black uppercase tracking-[0.2em] transition-all duration-300 shadow-[0_0_30px_rgba(249,115,22,0.2)] hover:shadow-[0_0_40px_rgba(249,115,22,0.4)] active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
                >
                  Rotate Access Key
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
