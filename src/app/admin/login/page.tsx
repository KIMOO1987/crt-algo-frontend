"use client";

import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Loader2, ShieldCheck } from 'lucide-react';
import { motion } from 'framer-motion';

export default function AdminLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // FIXED: Removed supabase.auth.signOut() — it was silently logging out
    // any user who accidentally navigated to this page.
    // signInWithPassword replaces the existing session automatically.
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      window.location.href = '/admin/payments';
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4 md:p-6 font-sans overflow-hidden">
      <motion.div 
        initial={{ opacity: 0, y: 20, rotateX: 10 }}
        animate={{ opacity: 1, y: 0, rotateX: 0 }}
        transition={{ duration: 0.8, type: "spring", bounce: 0.4 }}
        whileHover={{ scale: 1.02, rotateX: 2, rotateY: -2 }}
        className="glass-panel w-full max-w-md p-10 md:p-12 relative overflow-hidden preserve-3d"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent opacity-30 pointer-events-none rounded-[2rem]" />
        
        <div className="relative z-10">
          <div className="text-center mb-10">
            <div className="w-16 h-16 bg-orange-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-orange-500/20 shadow-[0_0_20px_rgba(249,115,22,0.2)]">
              <ShieldCheck className="text-orange-500" size={32} />
            </div>
            <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tighter flex items-center justify-center gap-2 drop-shadow-xl">
              KIMOO<span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-orange-600">CONSOLE</span>
            </h1>
            <p className="text-[9px] font-bold uppercase tracking-[0.3em] mt-3 opacity-70">Secure Terminal Access</p>
          </div>

          <form onSubmit={handleAdminLogin} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black opacity-70 uppercase ml-2 tracking-widest">Admin Email</label>
              <input
                type="email"
                placeholder="Admin Email"
                className="input-modern w-full"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black opacity-70 uppercase ml-2 tracking-widest">Master Password</label>
              <input
                type="password"
                placeholder="Password"
                className="input-modern w-full"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            {error && (
              <p className="text-red-400 text-[10px] font-black uppercase text-center bg-red-500/10 border border-red-500/20 py-2.5 rounded-xl backdrop-blur-md">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-modern w-full flex items-center justify-center gap-2 mt-8 relative overflow-hidden group preserve-3d"
            >
              {loading ? <Loader2 className="animate-spin" size={18} /> : <span className="relative z-10 uppercase font-black tracking-widest text-[12px] group-hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.8)] transition-all">Authorize Entry</span>}
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
