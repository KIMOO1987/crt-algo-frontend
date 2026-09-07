"use client";
import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { Loader2, ShieldCheck, AlertCircle, ArrowRight } from 'lucide-react';

function SetupContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');
  
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [message, setMessage] = useState('Verifying your invitation...');

  useEffect(() => {
    async function activateModerator() {
      if (!token) {
        setStatus('error');
        setMessage('Invalid or missing invitation token.');
        return;
      }

      // 1. Check if user is logged in
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setStatus('error');
        setMessage('Please login to your account first to accept the invitation.');
        return;
      }

      // 2. Validate token and email match in the database
      const { data: invite, error: inviteError } = await supabase
        .from('staff_invites')
        .select('*')
        .eq('token', token)
        .eq('email', user.email?.toLowerCase())
        .eq('is_used', false)
        .single();

      if (inviteError || !invite) {
        setStatus('error');
        setMessage('Invitation not found, already used, or email mismatch.');
        return;
      }

      // 3. Check for expiration
      if (new Date(invite.expires_at) < new Date()) {
        setStatus('error');
        setMessage('This invitation has expired.');
        return;
      }

      // 4. Update Profile Role & Mark Token as used
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ role: invite.role })
        .eq('id', user.id);

      if (profileError) {
        setStatus('error');
        setMessage('Failed to update account permissions.');
        return;
      }

      await supabase
        .from('staff_invites')
        .update({ is_used: true })
        .eq('id', invite.id);

      setStatus('success');
      setMessage(`Success! You are now registered as a ${invite.role}.`);
    }

    activateModerator();
  }, [token, router]);

  return (
    <div className="relative min-h-screen  flex items-center justify-center p-4 md:p-6 text-zinc-900 dark:text-white font-sans overflow-hidden">
      
      {/* Ambient Glowing Backgrounds */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-20%] left-[-10%] w-[70%] h-[70%] bg-blue-600/10 blur-[120px] rounded-full mix-blend-screen" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[70%] h-[70%] bg-indigo-600/10 blur-[120px] rounded-full mix-blend-screen" />
      </div>

      <div className="relative z-10 w-full max-w-md bg-gradient-to-br from-white/[0.04] to-white/[0.01] border border-white/[0.08] p-10 md:p-12 rounded-[2.5rem] text-center shadow-[0_0_80px_rgba(0,0,0,0.6)] backdrop-blur-2xl">
        
        {status === 'verifying' && (
          <div className="space-y-6">
            <Loader2 className="animate-spin mx-auto text-blue-400 drop-shadow-[0_0_10px_rgba(96,165,250,0.5)]" size={48} />
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-600 dark:text-zinc-500">{message}</p>
          </div>
        )}

        {status === 'error' && (
          <div className="space-y-6 animate-in fade-in zoom-in duration-300">
            <div className="bg-red-500/10 p-5 rounded-3xl w-fit mx-auto border border-red-500/20 shadow-[0_0_20px_rgba(239,68,68,0.2)]">
              <AlertCircle className="text-red-400" size={32} />
            </div>
            <h2 className="text-2xl font-black tracking-tighter uppercase italic mb-3">Access <span className="text-red-400 drop-shadow-md">Denied</span></h2>
            <p className="text-xs text-zinc-700 dark:text-zinc-400 font-bold leading-relaxed px-4">{message}</p>
            <button 
              onClick={() => router.push('/login')}
              className="w-full mt-8 py-4 bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.05] hover:text-zinc-900 dark:text-white rounded-xl text-[11px] font-black uppercase tracking-widest transition-all text-zinc-700 dark:text-zinc-400"
            >
              Back to Login
            </button>
          </div>
        )}

        {status === 'success' && (
          <div className="space-y-6 animate-in fade-in zoom-in duration-300">
            <div className="bg-emerald-500/10 p-5 rounded-3xl w-fit mx-auto border border-emerald-500/20 shadow-[0_0_20px_rgba(52,211,153,0.2)]">
              <ShieldCheck className="text-emerald-400" size={32} />
            </div>
            <h2 className="text-2xl font-black tracking-tighter uppercase italic mb-3">Access <span className="text-emerald-400 drop-shadow-md">Granted</span></h2>
            <p className="text-xs text-zinc-700 dark:text-zinc-400 font-bold leading-relaxed px-4">{message}</p>
            <button 
              onClick={() => window.location.href = '/admin/plans'}
              className="w-full mt-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 border border-blue-500/30 hover:from-blue-500 hover:to-indigo-500 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all duration-300 shadow-[0_0_30px_rgba(59,130,246,0.3)] hover:shadow-[0_0_40px_rgba(59,130,246,0.5)] flex items-center justify-center gap-3 text-zinc-900 dark:text-white active:scale-95"
            >
              Enter Console <ArrowRight size={16} className="text-blue-200" />
            </button>
          </div>
        )}

      </div>
    </div>
  );
}

// Wrap in Suspense because of useSearchParams
export default function SetupPage() {
  return (
    <Suspense fallback={<div className="h-screen bg-[var(--input-bg)]" />}>
      <SetupContent />
    </Suspense>
  );
}
