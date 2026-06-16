"use client";

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Mail, Lock, Loader2, User, Calendar, Globe, MapPin, 
  UserPlus, ShieldCheck, ArrowLeft, LogIn 
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { clientLogin } from '@/lib/auth-client';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'login' | 'signup';
  errorMessage?: string | null;
}

export default function AuthModal({ isOpen, onClose, initialMode = 'login', errorMessage = null }: AuthModalProps) {
  const router = useRouter();
  const [mode, setMode] = useState<'login' | 'signup'>(initialMode);
  
  // Login State
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(errorMessage);
  
  // Signup State
  const [signupLoading, setSignupLoading] = useState(false);
  const [signupMessage, setSignupMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);
  const [signupData, setSignupData] = useState({
    fullName: '',
    age: '',
    country: '',
    address: '',
    email: '',
    password: '',
    confirmPassword: ''
  });

  // Sync mode and error when modal opens/changes
  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      setLoginError(errorMessage);
      setSignupMessage(null);
    }
  }, [isOpen, initialMode, errorMessage]);

  // Handle Login Submit
  const handleLoginSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError(null);
    
    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    try {
      await clientLogin(email, password);
      onClose();
      router.push('/dashboard');
    } catch (err: any) {
      setLoginError(err.message || 'Authentication failed');
      setLoginLoading(false);
    }
  };

  // Handle Signup Input Changes
  const handleSignupChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSignupData({ ...signupData, [e.target.name]: e.target.value });
  };

  // Handle Signup Submit
  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSignupLoading(true);
    setSignupMessage(null);

    // Age validation — must be 18+
    const age = parseInt(signupData.age);
    if (isNaN(age) || age < 18) {
      setSignupMessage({ type: 'error', text: 'You must be at least 18 years old to register.' });
      setSignupLoading(false);
      return;
    }

    // Password strength — minimum 8 characters with at least one number
    if (signupData.password.length < 8) {
      setSignupMessage({ type: 'error', text: 'Password must be at least 8 characters long.' });
      setSignupLoading(false);
      return;
    }
    if (!/\d/.test(signupData.password)) {
      setSignupMessage({ type: 'error', text: 'Password must contain at least one number.' });
      setSignupLoading(false);
      return;
    }

    // Password match
    if (signupData.password !== signupData.confirmPassword) {
      setSignupMessage({ type: 'error', text: 'Passwords do not match.' });
      setSignupLoading(false);
      return;
    }

    // Supabase sign up
    const { error } = await supabase.auth.signUp({
      email: signupData.email,
      password: signupData.password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        data: {
          full_name: signupData.fullName,
          age: signupData.age,
          country: signupData.country,
          address: signupData.address,
        },
      },
    });

    if (error) {
      setSignupMessage({ type: 'error', text: error.message });
      setSignupLoading(false);
    } else {
      setSignupMessage({
        type: 'success',
        text: 'Identity Initialized. Please check your email to verify your clearance.'
      });
      setSignupLoading(false);
      // Auto switch to login mode after 5 seconds
      setTimeout(() => {
        setMode('login');
        setSignupData({
          fullName: '',
          age: '',
          country: '',
          address: '',
          email: '',
          password: '',
          confirmPassword: ''
        });
        setSignupMessage(null);
      }, 5000);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 overflow-y-auto bg-black/75 backdrop-blur-md">
          {/* Outer backdrop click-trigger */}
          <div className="absolute inset-0 cursor-default" onClick={onClose} />
          
          <motion.div 
            initial={{ scale: 0.95, opacity: 0, y: 15 }} 
            animate={{ scale: 1, opacity: 1, y: 0 }} 
            exit={{ scale: 0.95, opacity: 0, y: 15 }}
            transition={{ duration: 0.3 }}
            className="glass-panel w-full max-w-xl p-6 md:p-10 bg-gradient-to-br from-[var(--bg-surface)] to-[var(--bg)] border border-[var(--glass-border)] rounded-2xl shadow-[0_0_80px_rgba(0,0,0,0.4)] relative overflow-hidden preserve-3d z-10 max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Ambient orange glow in the modal */}
            <div className="absolute top-0 left-0 w-full h-full bg-orange-500/5 blur-[80px] pointer-events-none" />

            {/* Header */}
            <div className="flex justify-between items-start mb-6 shrink-0 relative z-10">
              <div className="text-left">
                <h2 className="text-2xl font-black tracking-tighter uppercase drop-shadow-md flex items-center gap-2">
                  CRT-ALGO<span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-orange-600">CONSOLE</span>
                </h2>
                <p className="text-[9px] uppercase tracking-[0.3em] font-bold mt-1.5 opacity-70">
                  {mode === 'login' ? 'Institutional Access Point' : 'New Operator Registration'}
                </p>
              </div>
              <button onClick={onClose} className="p-1.5 hover:bg-black/10 dark:hover:bg-white/10 rounded-lg transition-all cursor-pointer">
                <X size={18} className="text-zinc-550 hover:text-white" />
              </button>
            </div>

            {/* Mode Tabs */}
            <div className="flex border-b border-[var(--glass-border)] mb-6 shrink-0 relative z-10">
              <button 
                onClick={() => { setMode('login'); setLoginError(null); }}
                className={`flex-1 pb-3 text-xs font-black uppercase tracking-wider transition-all border-b-2 ${
                  mode === 'login' 
                    ? 'border-orange-500 text-orange-500' 
                    : 'border-transparent text-zinc-500 hover:text-zinc-300'
                }`}
              >
                Sign In
              </button>
              <button 
                onClick={() => { setMode('signup'); setSignupMessage(null); }}
                className={`flex-1 pb-3 text-xs font-black uppercase tracking-wider transition-all border-b-2 ${
                  mode === 'signup' 
                    ? 'border-orange-500 text-orange-500' 
                    : 'border-transparent text-zinc-500 hover:text-zinc-300'
                }`}
              >
                Register
              </button>
            </div>

            {/* Scrollable Form Content */}
            <div className="overflow-y-auto pr-1 no-scrollbar flex-1 relative z-10">
              {mode === 'login' ? (
                /* LOGIN FORM */
                <form onSubmit={handleLoginSubmit} className="space-y-5 text-left">
                  {loginError && (
                    <p className="bg-red-500/20 border border-red-500/30 text-red-400 text-[10px] p-3 rounded-lg mb-4 uppercase font-black text-center backdrop-blur-md">
                      {loginError}
                    </p>
                  )}

                  <div className="space-y-2 flex flex-col">
                    <label className="text-[10px] font-black uppercase opacity-70 ml-2 tracking-widest">Operator Email</label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 opacity-50" size={16} />
                      <input name="email" type="email" required placeholder="operator@crtalgo.com" className="input-modern w-full pl-12 font-bold" />
                    </div>
                  </div>

                  <div className="space-y-2 flex flex-col">
                    <label className="text-[10px] font-black uppercase opacity-70 ml-2 tracking-widest">Access Key</label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 opacity-50" size={16} />
                      <input name="password" type="password" required placeholder="••••••••" className="input-modern w-full pl-12 font-bold" />
                    </div>
                  </div>

                  <div className="flex justify-end px-2">
                    <button 
                      type="button"
                      onClick={() => { onClose(); router.push('/forgot-password'); }}
                      className="text-[9px] font-black uppercase opacity-70 hover:opacity-100 hover:text-orange-400 transition-all tracking-widest cursor-pointer"
                    >
                      Forgot Access Key?
                    </button>
                  </div>

                  <button type="submit" disabled={loginLoading} className="btn-modern w-full flex items-center justify-center gap-2 mt-6">
                    {loginLoading ? <Loader2 className="animate-spin" size={16} /> : (
                      <>
                        <LogIn size={14} />
                        <span className="uppercase font-black tracking-widest text-[11px]">AUTHENTICATE</span>
                      </>
                    )}
                  </button>
                </form>
              ) : (
                /* SIGNUP FORM */
                <form onSubmit={handleSignupSubmit} className="space-y-5 text-left">
                  {signupMessage && (
                    <div className={`p-3 rounded-xl border text-[10px] font-bold uppercase tracking-tight mb-4 ${
                      signupMessage.type === 'error' ? 'bg-red-500/10 border-red-500/30 text-red-400' : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                    }`}>
                      {signupMessage.text}
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2 flex flex-col">
                      <label className="text-[10px] font-black uppercase opacity-70 ml-2 tracking-widest">Full Name</label>
                      <div className="relative">
                        <User className="absolute left-4 top-1/2 -translate-y-1/2 opacity-50" size={16} />
                        <input name="fullName" type="text" required value={signupData.fullName} onChange={handleSignupChange} placeholder="John Doe" className="input-modern w-full pl-12 font-bold" />
                      </div>
                    </div>
                    <div className="space-y-2 flex flex-col">
                      <label className="text-[10px] font-black uppercase opacity-70 ml-2 tracking-widest">Age (18+ required)</label>
                      <div className="relative">
                        <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 opacity-50" size={16} />
                        <input name="age" type="number" required min="18" max="100" value={signupData.age} onChange={handleSignupChange} placeholder="25" className="input-modern w-full pl-12 font-bold" />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2 flex flex-col">
                      <label className="text-[10px] font-black uppercase opacity-70 ml-2 tracking-widest">Country</label>
                      <div className="relative">
                        <Globe className="absolute left-4 top-1/2 -translate-y-1/2 opacity-50" size={16} />
                        <input name="country" type="text" required value={signupData.country} onChange={handleSignupChange} placeholder="United Kingdom" className="input-modern w-full pl-12 font-bold" />
                      </div>
                    </div>
                    <div className="space-y-2 flex flex-col">
                      <label className="text-[10px] font-black uppercase opacity-70 ml-2 tracking-widest">Billing Address</label>
                      <div className="relative">
                        <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 opacity-50" size={16} />
                        <input name="address" type="text" required value={signupData.address} onChange={handleSignupChange} placeholder="Street, City, Zip" className="input-modern w-full pl-12 font-bold" />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 flex flex-col">
                    <label className="text-[10px] font-black uppercase opacity-70 ml-2 tracking-widest">Email Address</label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 opacity-50" size={16} />
                      <input name="email" type="email" required value={signupData.email} onChange={handleSignupChange} placeholder="name@company.com" className="input-modern w-full pl-12 font-bold" />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2 flex flex-col">
                      <label className="text-[10px] font-black uppercase opacity-70 ml-2 tracking-widest">Password</label>
                      <div className="relative">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 opacity-50" size={16} />
                        <input name="password" type="password" required value={signupData.password} onChange={handleSignupChange} placeholder="••••••••" className="input-modern w-full pl-12 font-bold" />
                      </div>
                    </div>
                    <div className="space-y-2 flex flex-col">
                      <label className="text-[10px] font-black uppercase opacity-70 ml-2 tracking-widest">Confirm Password</label>
                      <div className="relative">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 opacity-50" size={16} />
                        <input name="confirmPassword" type="password" required value={signupData.confirmPassword} onChange={handleSignupChange} placeholder="••••••••" className="input-modern w-full pl-12 font-bold" />
                      </div>
                    </div>
                  </div>

                  <button type="submit" disabled={signupLoading} className="btn-modern w-full flex items-center justify-center gap-2 mt-6">
                    {signupLoading ? <Loader2 className="animate-spin" size={16} /> : (
                      <>
                        <UserPlus size={14} />
                        <span className="uppercase font-black text-[11px] tracking-widest">Initialize Account</span>
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>

            {/* Footer security badge */}
            <div className="mt-6 pt-4 border-t border-[var(--glass-border)] flex items-center justify-center gap-2 opacity-50 shrink-0 relative z-10">
              <ShieldCheck size={14} className="text-orange-500" />
              <span className="text-[8px] font-bold uppercase tracking-[0.2em]">Security Protocol v4.0 Active</span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
