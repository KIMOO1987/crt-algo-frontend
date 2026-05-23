"use client";

import { clientRequestPasswordReset, clientSubmitManualResetRequest } from '@/lib/auth-client';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useSearchParams, useRouter } from 'next/navigation';
import { Suspense, useState } from 'react';
import { Mail, User, ArrowLeft, Loader2 } from 'lucide-react';

function ForgotPasswordContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const errorParam = searchParams.get('error');
  const successParam = searchParams.get('success');
  const [error, setError] = useState(errorParam);
  const [success, setSuccess] = useState(successParam);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'email' | 'manual'>('email');

  const handleEmailReset = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);
    const email = new FormData(e.currentTarget).get('email') as string;
    try {
      await clientRequestPasswordReset(email);
      setSuccess('Instructions sent to email');
    } catch (err: any) {
      setError(err.message);
    }
    setLoading(false);
  };

  const handleManualReset = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);
    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const fullName = formData.get('fullName') as string;
    try {
      await clientSubmitManualResetRequest(email, fullName);
      setSuccess('Support request sent. A moderator will contact you.');
    } catch (err: any) {
      setError(err.message);
    }
    setLoading(false);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20, rotateX: 10 }}
      animate={{ opacity: 1, y: 0, rotateX: 0 }}
      transition={{ duration: 0.8, type: "spring", bounce: 0.4 }}
      whileHover={{ scale: 1.02, rotateX: 2, rotateY: -2 }}
      className="glass-panel w-full max-w-md p-8 md:p-12 relative overflow-hidden preserve-3d"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent opacity-30 pointer-events-none rounded-[2rem]" />

      <div className="text-center mb-10 relative z-10">
        <h1 className="text-3xl md:text-4xl font-black tracking-tighter uppercase drop-shadow-xl">Access <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-orange-600">Recovery</span></h1>
        <p className="text-[10px] uppercase tracking-[0.4em] font-bold mt-3 opacity-70">Instructional Flow</p>
      </div>

      {error && <p className="bg-red-500/20 border border-red-500/30 text-red-400 text-[10px] p-3 rounded-lg mb-6 uppercase font-black text-center backdrop-blur-md relative z-10">{error}</p>}
      {success && <p className="bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-[10px] p-3 rounded-lg mb-6 uppercase font-black text-center backdrop-blur-md relative z-10">{success}</p>}

      {mode === 'email' ? (
        <form onSubmit={handleEmailReset} className="space-y-6 relative z-10">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase opacity-70 ml-2 tracking-widest">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-5 top-1/2 -translate-y-1/2 opacity-50" size={18} />
              <input name="email" type="email" required placeholder="operator@kimoo.com" className="input-modern w-full pl-14" />
            </div>
          </div>
          <button type="submit" disabled={loading} className="btn-modern w-full flex items-center justify-center gap-2 mt-8 relative overflow-hidden group preserve-3d">
            {loading ? <Loader2 className="animate-spin" size={18} /> : <span className="relative z-10 uppercase font-black tracking-widest text-[12px] group-hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.8)] transition-all">Request Reset Link</span>}
          </button>
          <button 
            type="button" 
            onClick={() => setMode('manual')}
            className="w-full text-center text-[10px] uppercase font-black opacity-70 hover:opacity-100 hover:text-orange-400 mt-4 transition-all tracking-widest"
          >
            Email not arriving? Request manual help
          </button>
        </form>
      ) : (
        <form onSubmit={handleManualReset} className="space-y-6 relative z-10">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase opacity-70 ml-2 tracking-widest">Full Name</label>
            <div className="relative">
              <User className="absolute left-5 top-1/2 -translate-y-1/2 opacity-50" size={18} />
              <input name="fullName" type="text" required placeholder="TRADER NAME" className="input-modern w-full pl-14" />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase opacity-70 ml-2 tracking-widest">Verified Email</label>
            <div className="relative">
              <Mail className="absolute left-5 top-1/2 -translate-y-1/2 opacity-50" size={18} />
              <input name="email" type="email" required placeholder="operator@kimoo.com" className="input-modern w-full pl-14" />
            </div>
          </div>
          <button type="submit" disabled={loading} className="btn-modern w-full flex items-center justify-center gap-2 mt-8 relative overflow-hidden group preserve-3d">
            {loading ? <Loader2 className="animate-spin" size={18} /> : <span className="relative z-10 uppercase font-black tracking-widest text-[12px] group-hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.8)] transition-all">Submit Ticket to Admin</span>}
          </button>
          <button type="button" onClick={() => setMode('email')} className="w-full text-center text-[10px] uppercase font-black opacity-70 hover:opacity-100 hover:text-orange-400 mt-4 transition-all tracking-widest">
            Back to automatic reset
          </button>
        </form>
      ) }

      <div className="mt-10 pt-8 border-t border-[var(--glass-border)] flex flex-col items-center relative z-10">
        <Link href="/login" className="group flex items-center gap-2 opacity-70 hover:opacity-100 hover:text-orange-400 transition-all">
          <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" />
          <span className="text-[10px] font-black uppercase tracking-widest font-mono">Return to Base</span>
        </Link>
      </div>
    </motion.div>
  );
}

export default function ForgotPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden">
      <Suspense fallback={<Loader2 className="animate-spin opacity-50" />}>
        <ForgotPasswordContent />
      </Suspense>
    </div>
  );
}


