"use client";

import { useState, useEffect } from 'react';
// Use your existing client or the standard one
import { createBrowserClient } from '@supabase/ssr' 
import { motion } from 'framer-motion';
import { Lock, Eye, EyeOff, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function UpdatePasswordPage() {
  // Initialize the browser client directly
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  
  const router = useRouter();
  
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // CRITICAL FIX: Ensure the session is recognized on mount
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "PASSWORD_RECOVERY") {
        console.log("Password recovery mode active");
      }
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newPassword.length < 6) {
      setMessage({ type: 'error', text: 'Password must be at least 6 characters.' });
      return;
    }

    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'Passwords do not match.' });
      return;
    }

    setLoading(true);
    setMessage(null);

    // Supabase Update Call
    const { data, error } = await supabase.auth.updateUser({
      password: newPassword
    });

    if (error) {
      setMessage({ type: 'error', text: error.message });
      setLoading(false);
    } else if (data) {
      setMessage({ type: 'success', text: 'Security Credentials Updated! Accessing Terminal...' });
      
      // Give the user time to see the success message
      setTimeout(() => {
        router.push('/dashboard');
        router.refresh(); // Refresh to ensure middleware sees the new session
      }, 2000);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden">
      <motion.div 
        initial={{ opacity: 0, y: 20, rotateX: 10 }}
        animate={{ opacity: 1, y: 0, rotateX: 0 }}
        transition={{ duration: 0.8, type: "spring", bounce: 0.4 }}
        whileHover={{ scale: 1.02, rotateX: 2, rotateY: -2 }}
        className="glass-panel w-full max-w-md p-8 md:p-12 relative overflow-hidden preserve-3d"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent opacity-30 pointer-events-none rounded-[2rem]" />

        <div className="mb-10 text-center relative z-10">
          <div className="inline-flex p-3 rounded-full bg-orange-500/10 text-orange-500 mb-4 border border-orange-500/20">
            <Lock size={24} />
          </div>
          <h1 className="text-3xl md:text-4xl font-black uppercase tracking-tighter drop-shadow-xl">
            Reset <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-orange-600">Security</span>
          </h1>
          <p className="opacity-70 text-[10px] font-bold uppercase tracking-[0.3em] mt-3">
            Protocol: Update Terminal Access
          </p>
        </div>

        <form onSubmit={handleUpdatePassword} className="space-y-6 relative z-10">
          <div className="space-y-2">
            <label className="text-[10px] font-black opacity-70 uppercase ml-2 tracking-widest">New Credentials</label>
            <div className="relative">
              <input 
                type={showPassword ? "text" : "password"} 
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                className="input-modern w-full"
                required
              />
              <button 
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-5 top-1/2 -translate-y-1/2 opacity-50 hover:opacity-100 transition-colors"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black opacity-70 uppercase ml-2 tracking-widest">Confirm Credentials</label>
            <input 
              type={showPassword ? "text" : "password"} 
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              className="input-modern w-full"
              required
            />
          </div>

          {message && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className={`flex items-center gap-3 p-4 rounded-2xl text-[10px] font-bold uppercase tracking-wider backdrop-blur-md ${
                message.type === 'success' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'
              }`}
            >
              {message.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
              {message.text}
            </motion.div>
          )}

          <button 
            type="submit"
            disabled={loading}
            className="btn-modern w-full flex items-center justify-center gap-2 mt-8 relative overflow-hidden group preserve-3d"
          >
            {loading ? (
              <Loader2 className="animate-spin" size={20} />
            ) : (
              <span className="relative z-10 font-black uppercase text-[12px] tracking-widest group-hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.8)] transition-all">Authorize New Credentials</span>
            )}
          </button>
        </form>

        <p className="mt-8 pt-8 border-t border-[var(--glass-border)] text-center opacity-50 text-[9px] font-bold uppercase tracking-[0.2em] relative z-10">
          KIMOO CRT Security Protocol v2.0
        </p>
      </motion.div>
    </div>
  );
}