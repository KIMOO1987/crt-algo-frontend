"use client";
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { UserPlus, Shield, Trash2, Mail, Copy, Check, Loader2, ShieldCheck, Activity } from 'lucide-react';

export default function StaffManager() {
  const [staff, setStaff] = useState<any[]>([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [copying, setCopying] = useState<string | null>(null);

  useEffect(() => {
    fetchStaff();
  }, []);

  async function fetchStaff() {
    const { data } = await supabase
      .from('profiles')
      .select('id, email, role')
      .in('role', ['admin', 'moderator']);
    if (data) setStaff(data);
    setLoading(false);
  }

  async function generateInvite() {
    if (!inviteEmail) return;
    const token = Math.random().toString(36).substring(2, 15);
    
    const { error } = await supabase.from('staff_invites').insert({
      email: inviteEmail.toLowerCase(),
      token: token,
      role: 'moderator'
    });

    if (error) alert("Invite already exists for this email.");
    else {
      const inviteUrl = `${window.location.origin}/admin/setup?token=${token}`;
      navigator.clipboard.writeText(inviteUrl);
      alert(`Invite link copied to clipboard for ${inviteEmail}`);
      setInviteEmail('');
    }
  }

  async function removeStaff(id: string) {
    if (!confirm("Remove this person from staff? They will lose all access.")) return;
    const { error } = await supabase.from('profiles').update({ role: 'user' }).eq('id', id);
    if (!error) fetchStaff();
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center ">
      <div className="flex flex-col items-center justify-center py-20 animate-pulse">
        <Loader2 size={40} className="text-zinc-700 mb-4 animate-spin" />
        <p className="text-xs font-black uppercase tracking-widest text-zinc-600">Loading Staff Roster...</p>
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

      <div className="max-w-[1700px] mx-auto relative z-10 space-y-6 md:space-y-8">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-8 md:mb-12">
          <div>
            <h1 className="text-2xl md:text-4xl font-black tracking-tighter italic flex items-center gap-3 uppercase text-zinc-900 dark:text-white">
              Staff<span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-500">Access</span>
            </h1>
            <p className="text-[10px] uppercase tracking-[0.4em] text-zinc-600 dark:text-zinc-500 font-bold mt-3 leading-none">
              • SYSTEM MODERATORS & ADMINS •
            </p>
          </div>
        </div>

        {/* Invite Section */}
        <div className="bg-gradient-to-br from-white/[0.04] to-white/[0.01] border border-white/[0.05] p-6 md:p-8 rounded-[2.5rem] shadow-2xl backdrop-blur-md mb-8 md:mb-12 max-w-3xl">
          <h3 className="text-[11px] font-black uppercase tracking-widest text-zinc-700 dark:text-zinc-400 mb-6 flex items-center gap-3">
            <UserPlus size={16} className="text-blue-400" /> Invite New Moderator
          </h3>
          <div className="flex flex-col sm:flex-row gap-4">
            <input 
              type="email" 
              placeholder="moderator@email.com"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              className="flex-1 bg-white/[0.02] border border-white/[0.08] rounded-xl px-5 py-3.5 text-xs font-mono font-bold text-zinc-900 dark:text-white outline-none focus:border-blue-500/50 hover:border-white/20 transition-all placeholder:text-zinc-600"
            />
            <button onClick={generateInvite} className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 border border-blue-500/30 px-8 py-3.5 rounded-xl text-[11px] font-black uppercase tracking-[0.2em] transition-all whitespace-nowrap shadow-[0_0_30px_rgba(59,130,246,0.3)] hover:shadow-[0_0_40px_rgba(59,130,246,0.5)] active:scale-95 text-zinc-900 dark:text-white">
              Generate Link
            </button>
          </div>
        </div>

        {/* Staff List */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 max-w-6xl">
          {staff.map((member) => (
            <div key={member.id} className="relative overflow-hidden bg-gradient-to-br from-white/[0.04] to-white/[0.01] border border-white/[0.05] p-6 rounded-[2rem] hover:border-white/[0.1] hover:bg-white/[0.06] transition-all duration-300 group shadow-2xl flex items-center justify-between">
              <div className="absolute inset-0 bg-gradient-to-br from-white/[0.05] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              
              <div className="relative z-10 flex items-center gap-4">
                <div className={`p-3.5 rounded-2xl border ${member.role === 'admin' ? 'bg-blue-500/10 text-blue-400 border-blue-500/30 shadow-[0_0_15px_rgba(59,130,246,0.2)]' : 'bg-white/[0.03] border-white/[0.05] text-zinc-500 group-hover:text-zinc-300 shadow-lg transition-colors'}`}>
                  {member.role === 'admin' ? <ShieldCheck size={24} /> : <Shield size={24} />}
                </div>
                <div className="truncate">
                  <p className="text-sm font-black italic tracking-tight drop-shadow-md text-zinc-900 dark:text-white truncate max-w-[150px] md:max-w-[200px]">{member.email}</p>
                  <p className={`text-[9px] uppercase font-black tracking-widest mt-1 ${member.role === 'admin' ? 'text-blue-400' : 'text-zinc-600 dark:text-zinc-500'}`}>{member.role}</p>
                </div>
              </div>
              
              {member.role !== 'admin' && (
                <button onClick={() => removeStaff(member.id)} className="relative z-10 text-[9px] font-black text-red-400 uppercase tracking-widest bg-red-500/10 border border-red-500/20 px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all flex items-center gap-2 hover:bg-red-500/20 hover:shadow-[0_0_15px_rgba(239,68,68,0.2)]">
                  <Trash2 size={12} /> Remove
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
