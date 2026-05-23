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
    <div className="min-h-screen flex items-center justify-center ">
      <div className="flex flex-col items-center justify-center py-20 animate-pulse">
        <Loader2 size={40} className="text-zinc-700 mb-4 animate-spin" />
        <p className="text-xs font-black uppercase tracking-widest text-zinc-600">Loading Recovery Queue...</p>
      </div>
    </div>
  );

  return (
    <div className="relative p-4 md:p-12 lg:p-16  min-h-screen text-zinc-900 dark:text-white font-sans overflow-x-hidden">
      
      {/* Ambient Glowing Backgrounds */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-blue-600/10 blur-[150px] rounded-full mix-blend-screen" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-red-600/10 blur-[150px] rounded-full mix-blend-screen" />
      </div>

      <div className="max-w-[1700px] mx-auto relative z-10 space-y-6 md:space-y-8">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-8 md:mb-12">
          <div>
            <h1 className="text-2xl md:text-4xl font-black tracking-tighter italic flex items-center gap-3 uppercase text-zinc-900 dark:text-white">
              Access<span className="text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-orange-500">Recovery</span>
            </h1>
            <p className="text-[10px] uppercase tracking-[0.4em] text-zinc-600 dark:text-zinc-500 font-bold mt-3 leading-none">
              • MANUAL PASSWORD INTERVENTION QUEUE •
            </p>
          </div>
        </div>

        <div className="grid gap-6 max-w-5xl">
          {requests.length === 0 ? (
            <div className="w-full flex flex-col items-center justify-center py-24 border border-dashed border-white/[0.1] rounded-[2.5rem] bg-white/[0.01]">
              <CheckCircle2 size={40} className="text-zinc-700 mb-4" />
              <h3 className="text-xl font-black italic tracking-tighter uppercase text-zinc-900 dark:text-white mb-2">Queue Empty</h3>
              <p className="text-xs font-bold text-zinc-600 uppercase tracking-widest">No pending recovery tickets.</p>
            </div>
          ) : (
            requests.map(req => (
              <div key={req.id} className="relative overflow-hidden bg-gradient-to-br from-white/[0.04] to-white/[0.01] border border-white/[0.05] p-6 md:p-8 rounded-[2.5rem] hover:border-white/[0.1] hover:bg-white/[0.06] transition-all duration-300 group shadow-2xl flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="absolute inset-0 bg-gradient-to-br from-white/[0.05] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                
                <div className="relative z-10 flex items-center gap-5 w-full md:w-auto">
                  <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 shadow-[0_0_15px_rgba(239,68,68,0.2)]">
                    <Lock size={24} />
                  </div>
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <p className="text-lg font-black italic uppercase tracking-tighter drop-shadow-md">{req.full_name}</p>
                      <span className="text-[9px] font-black text-red-400 bg-red-500/10 px-2.5 py-1 rounded-lg border border-red-500/20 uppercase tracking-widest shadow-sm">Pending Verification</span>
                    </div>
                    <p className="text-[10px] font-mono font-bold text-zinc-600 dark:text-zinc-500 uppercase tracking-widest">{req.email}</p>
                  </div>
                </div>
                
                <div className="relative z-10 flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
                  <button 
                    onClick={() => handleRejectRequest(req.id)}
                    className="w-full sm:w-auto px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 hover:text-red-400 transition-all flex items-center justify-center gap-2 hover:bg-red-500/10 rounded-xl"
                  >
                    <XCircle size={14} /> Reject
                  </button>
                  <button 
                    onClick={() => handleManualReset(req.id, req.user_id, req.email)}
                    className="w-full sm:w-auto bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-orange-500 text-zinc-900 dark:text-white px-8 py-4 rounded-xl text-[11px] font-black uppercase tracking-[0.2em] transition-all duration-300 shadow-[0_0_30px_rgba(239,68,68,0.3)] hover:shadow-[0_0_40px_rgba(239,68,68,0.5)] active:scale-95 flex items-center justify-center gap-2"
                  >
                    Rotate Access Key
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
