"use client";

import { clientLogin } from '@/lib/auth-client';
import { Mail, Lock, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { motion } from 'framer-motion';

function LoginContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const errorParam = searchParams.get('error');
  const [error, setError] = useState(errorParam);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    try {
      await clientLogin(email, password);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
      setLoading(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 50, rotateX: 20 }}
      animate={{ opacity: 1, y: 0, rotateX: 0 }}
      transition={{ duration: 0.8, type: "spring", bounce: 0.4 }}
      whileHover={{ scale: 1.02, rotateX: 2, rotateY: -2 }}
      className="glass-panel w-full max-w-md p-8 md:p-12 relative overflow-hidden preserve-3d"
    >
      {/* Glossy Reflection Overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent opacity-30 pointer-events-none rounded-[2rem]" />
      
      <div className="text-center mb-10 relative z-10">
        <h1 className="text-4xl font-black tracking-tighter uppercase drop-shadow-xl">Client <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-orange-600">Terminal</span></h1>
        <p className="text-[10px] uppercase tracking-[0.4em] font-bold mt-3 opacity-70">Institutional Access Point</p>
      </div>

      {error && <p className="bg-red-500/20 border border-red-500/30 text-red-400 text-[10px] p-3 rounded-lg mb-6 uppercase font-black text-center backdrop-blur-md relative z-10">{error}</p>}

      <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase opacity-70 ml-2 tracking-widest">Operator Email</label>
          <div className="relative">
            <Mail className="absolute left-5 top-1/2 -translate-y-1/2 opacity-50" size={18} />
            <input name="email" type="email" required placeholder="operator@kimoo.com" className="input-modern w-full pl-14" />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase opacity-70 ml-2 tracking-widest">Access Key</label>
          <div className="relative">
            <Lock className="absolute left-5 top-1/2 -translate-y-1/2 opacity-50" size={18} />
            <input name="password" type="password" required placeholder="••••••••" className="input-modern w-full pl-14" />
          </div>
        </div>

        <div className="flex justify-end px-2">
          <Link 
            href="/forgot-password" 
            className="text-[10px] font-black uppercase opacity-70 hover:opacity-100 hover:text-orange-400 transition-all tracking-widest"
          >
            Forgot Access Key?
          </Link>
        </div>

        <button type="submit" disabled={loading} className="btn-modern w-full flex items-center justify-center gap-2 mt-8 relative overflow-hidden group preserve-3d">
          {loading ? <Loader2 className="animate-spin" size={18} /> : <span className="relative z-10 uppercase font-black tracking-widest text-[12px] group-hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.8)] transition-all">AUTHENTICATE</span>}
        </button>
      </form>

      <div className="mt-8 pt-6 border-t border-white/10 text-center relative z-10">
          <Link href="/signup" className="text-orange-500 hover:text-orange-400 transition-colors ml-2 font-bold text-sm tracking-wide">
            Create new account
          </Link>
      </div>
    </motion.div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6 relative perspective-1000 overflow-hidden">
      <Suspense fallback={<Loader2 className="animate-spin text-orange-500" />}>
        <LoginContent />
      </Suspense>
    </div>
  );
}


