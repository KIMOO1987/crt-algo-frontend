"use client";

import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import {
  Lock,
  Mail,
  Loader2,
  UserPlus,
  ArrowLeft,
  ShieldCheck,
  User,
  Globe,
  MapPin,
  Calendar
} from 'lucide-react';
import Link from 'next/link';
import { motion } from 'framer-motion';

export default function SignUpPage() {
  const [formData, setFormData] = useState({
    fullName: '',
    age: '',
    country: '',
    address: '',
    email: '',
    password: '',
    confirmPassword: ''
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);
  const router = useRouter();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    // 1. Age validation — must be 18+
    const age = parseInt(formData.age);
    if (isNaN(age) || age < 18) {
      setMessage({ type: 'error', text: 'You must be at least 18 years old to register.' });
      setLoading(false);
      return;
    }

    // 2. Password strength — minimum 8 characters with at least one number
    if (formData.password.length < 8) {
      setMessage({ type: 'error', text: 'Password must be at least 8 characters long.' });
      setLoading(false);
      return;
    }
    if (!/\d/.test(formData.password)) {
      setMessage({ type: 'error', text: 'Password must contain at least one number.' });
      setLoading(false);
      return;
    }

    // 3. Password match
    if (formData.password !== formData.confirmPassword) {
      setMessage({ type: 'error', text: 'Passwords do not match.' });
      setLoading(false);
      return;
    }

    // 4. Supabase sign up
    const { error } = await supabase.auth.signUp({
      email: formData.email,
      password: formData.password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        data: {
          full_name: formData.fullName,
          age: formData.age,
          country: formData.country,
          address: formData.address,
        },
      },
    });

    if (error) {
      setMessage({ type: 'error', text: error.message });
      setLoading(false);
    } else {
      setMessage({
        type: 'success',
        text: 'Identity Initialized. Please check your email to verify your clearance.'
      });
      setTimeout(() => router.push('/login'), 5000);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-6 relative overflow-hidden">
      <motion.div 
        initial={{ opacity: 0, y: 20, rotateX: 10 }}
        animate={{ opacity: 1, y: 0, rotateX: 0 }}
        transition={{ duration: 0.8, type: "spring", bounce: 0.4 }}
        whileHover={{ scale: 1.01, rotateX: 1, rotateY: -1 }}
        className="glass-panel w-full max-w-xl p-8 md:p-12 relative overflow-hidden preserve-3d"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent opacity-30 pointer-events-none rounded-[2rem]" />

        <div className="mb-10 text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/20 mb-4">
            <UserPlus size={10} className="text-orange-500" />
            <span className="text-[8px] font-black text-orange-500 uppercase tracking-[0.2em]">New Operator Registration</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-black tracking-tighter uppercase drop-shadow-xl">
            Client <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-orange-600">Terminal</span>
          </h1>
        </div>

        <form onSubmit={handleSignUp} className="space-y-6 relative z-10">
          {message && (
            <div className={`p-3 rounded-xl border text-[10px] font-bold uppercase tracking-tight ${
              message.type === 'error' ? 'bg-red-500/10 border-red-500/30 text-red-400' : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
            }`}>
              {message.text}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase opacity-70 ml-2 tracking-widest">Full Name</label>
              <div className="relative">
                <User className="absolute left-5 top-1/2 -translate-y-1/2 opacity-50" size={18} />
                <input name="fullName" type="text" required value={formData.fullName} onChange={handleChange} placeholder="John Doe" className="input-modern w-full pl-14" />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase opacity-70 ml-2 tracking-widest">Age (18+ required)</label>
              <div className="relative">
                <Calendar className="absolute left-5 top-1/2 -translate-y-1/2 opacity-50" size={18} />
                <input name="age" type="number" required min="18" max="100" value={formData.age} onChange={handleChange} placeholder="25" className="input-modern w-full pl-14" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase opacity-70 ml-2 tracking-widest">Country</label>
              <div className="relative">
                <Globe className="absolute left-5 top-1/2 -translate-y-1/2 opacity-50" size={18} />
                <input name="country" type="text" required value={formData.country} onChange={handleChange} placeholder="United Kingdom" className="input-modern w-full pl-14" />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase opacity-70 ml-2 tracking-widest">Billing Address</label>
              <div className="relative">
                <MapPin className="absolute left-5 top-1/2 -translate-y-1/2 opacity-50" size={18} />
                <input name="address" type="text" required value={formData.address} onChange={handleChange} placeholder="Street, City, Zip" className="input-modern w-full pl-14" />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase opacity-70 ml-2 tracking-widest">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-5 top-1/2 -translate-y-1/2 opacity-50" size={18} />
              <input name="email" type="email" required value={formData.email} onChange={handleChange} placeholder="name@company.com" className="input-modern w-full pl-14" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase opacity-70 ml-2 tracking-widest">Password</label>
              <div className="relative">
                <Lock className="absolute left-5 top-1/2 -translate-y-1/2 opacity-50" size={18} />
                <input name="password" type="password" required value={formData.password} onChange={handleChange} placeholder="••••••••" className="input-modern w-full pl-14" />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase opacity-70 ml-2 tracking-widest">Confirm Password</label>
              <div className="relative">
                <Lock className="absolute left-5 top-1/2 -translate-y-1/2 opacity-50" size={18} />
                <input name="confirmPassword" type="password" required value={formData.confirmPassword} onChange={handleChange} placeholder="••••••••" className="input-modern w-full pl-14" />
              </div>
            </div>
          </div>

          <button type="submit" disabled={loading} className="btn-modern w-full flex items-center justify-center gap-2 mt-8 relative overflow-hidden group preserve-3d">
            {loading ? <Loader2 className="animate-spin" size={18} /> : (
              <span className="relative z-10 font-black uppercase text-xs tracking-widest group-hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.8)] transition-all">Initialize Account</span>
            )}
          </button>
        </form>

        <div className="mt-10 pt-8 border-t border-[var(--glass-border)] flex flex-col items-center gap-6 relative z-10">
          <Link href="/login" className="group flex items-center gap-2 opacity-70 hover:opacity-100 hover:text-orange-400 transition-all">
            <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" />
            <span className="text-[10px] font-black uppercase tracking-widest font-mono">Back to Authentication</span>
          </Link>
          <div className="flex items-center gap-2 opacity-50">
            <ShieldCheck size={14} />
            <span className="text-[9px] font-bold uppercase tracking-[0.2em]">Security Protocol v4.0 Active</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
