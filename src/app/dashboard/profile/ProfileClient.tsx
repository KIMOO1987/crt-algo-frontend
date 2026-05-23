"use client";

import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { 
  User, Mail, MapPin, Globe, ShieldCheck, Activity,
  RefreshCcw, Save, CheckCircle2, AlertCircle, Star, Clock, Lock,
  Camera, CreditCard, Zap, Trash2, Fingerprint
} from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';

export default function ProfileClient({ initialData, tier, expiryDate }: any) {
  const [loading, setLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(initialData?.avatar_url || null);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  
  const [formData, setFormData] = useState({
    full_name: initialData?.full_name || '',
    email: initialData?.email || '',
    country: initialData?.country || '',
    address: initialData?.address || ''
  });

  const [passwordData, setPasswordData] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Days calculation logic
  const daysLeft = expiryDate 
    ? Math.max(0, Math.ceil((new Date(expiryDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))) 
    : 0;

  const memberSince = initialData?.created_at 
    ? new Date(initialData.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) 
    : '---';

  const tierFeatures = tier === 3 
    ? ['Global Radar Access', 'Neural Signal Stream', 'Audit Intelligence', 'Priority Support'] 
    : tier === 2 
    ? ['Neural Signal Stream', 'Radar Access', 'Standard Support'] 
    : ['Alpha Signal Stream', 'Standard Support'];

  const handleUpdateProfile = async () => {
    setLoading(true);
    setMessage(null);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: formData.full_name,
        country: formData.country,
        address: formData.address,
      })
      .eq('id', user.id);

    if (error) {
      setMessage({ type: 'error', text: 'Failed to update profile identity.' });
    } else {
      setMessage({ type: 'success', text: 'Profile identity synchronized successfully.' });
      setTimeout(() => setMessage(null), 3000);
    }
    setLoading(false);
  };

  const handlePasswordChange = async () => {
    if (!passwordData.oldPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      setMessage({ type: 'error', text: 'All security fields are required.' });
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setMessage({ type: 'error', text: 'New passwords do not match.' });
      return;
    }

    setPasswordLoading(true);
    setMessage(null);

    try {
      // 1. Verify old password by attempting to sign in
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: initialData.email,
        password: passwordData.oldPassword,
      });

      if (signInError) throw new Error('Verification failed: Incorrect old password.');

      // 2. Update to new password
      const { error: updateError } = await supabase.auth.updateUser({
        password: passwordData.newPassword
      });

      if (updateError) throw updateError;

      setMessage({ type: 'success', text: 'Security credentials rotated successfully.' });
      setPasswordData({ oldPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || event.target.files.length === 0) {
      setMessage({ type: 'error', text: 'Please select an image to upload.' });
      return;
    }

    setAvatarLoading(true);
    setMessage(null);

    const file = event.target.files[0];
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const filePath = `${initialData.id}/${fileName}`; // Store in user's folder

    try {
      const { error: uploadError } = await supabase.storage
        .from('avatars') // Assuming you have a storage bucket named 'avatars'
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: publicUrlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      if (publicUrlData.publicUrl) {
        const { error: updateProfileError } = await supabase
          .from('profiles')
          .update({ avatar_url: publicUrlData.publicUrl })
          .eq('id', initialData.id);

        if (updateProfileError) throw updateProfileError;

        setAvatarUrl(publicUrlData.publicUrl);
        setMessage({ type: 'success', text: 'Avatar updated successfully.' });
      } else {
        throw new Error('Failed to get public URL for avatar.');
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: `Avatar upload failed: ${error.message}` });
    } finally {
      setAvatarLoading(false);
      setTimeout(() => setMessage(null), 3000);
    }
  };

  return (
    <div className="relative p-4 md:p-12 lg:p-16 lg:ml-72  min-h-screen text-zinc-900 dark:text-white font-sans overflow-x-hidden">
      
      {/* Ambient Glowing Backgrounds */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-blue-600/10 blur-[150px] rounded-full mix-blend-screen" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-indigo-600/10 blur-[150px] rounded-full mix-blend-screen" />
      </div>

      <div className="max-w-[1700px] mx-auto relative z-10 space-y-6 md:space-y-10">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-6">
          <div>
            <h1 className="text-2xl md:text-4xl font-black tracking-tighter italic flex items-center gap-3 uppercase text-zinc-900 dark:text-white">
              Account<span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-500">Identity</span>
            </h1>
            <p className="text-[10px] uppercase tracking-[0.4em] text-zinc-600 dark:text-zinc-500 font-bold mt-3 leading-none">
              • PERSONAL MANAGEMENT & BILLING DETAILS •
            </p>
          </div>
          <div className="flex items-center gap-3 px-5 py-2.5 bg-blue-500/10 border border-blue-500/20 rounded-xl shadow-[0_0_20px_rgba(59,130,246,0.15)]">
            <ShieldCheck size={16} className="text-blue-400 drop-shadow-[0_0_5px_rgba(96,165,250,0.8)]" />
            <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Verified Profile</span>
          </div>
        </div>
        {/* NEW: PLAN STATUS ROW (Synced with Dashboard) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
          <div className="relative overflow-hidden bg-gradient-to-br from-white/[0.04] to-white/[0.01] border border-[var(--glass-border)] p-6 md:p-8 rounded-[2rem] hover:border-white/[0.1] hover:bg-white/[0.06] transition-all duration-300 group shadow-2xl flex items-center gap-6">
            <div className="p-3.5 rounded-2xl bg-[var(--glass-bg)] border border-[var(--glass-border)] text-yellow-400 group-hover:scale-110 transition-transform duration-300 shadow-lg"><Star size={28} /></div>
            <div>
              <span className="text-[9px] md:text-[10px] font-bold text-zinc-600 dark:text-zinc-500 uppercase tracking-widest block mb-1.5">Current Plan</span>
              <span className="text-2xl md:text-3xl font-black italic tracking-tighter uppercase text-zinc-900 dark:text-white drop-shadow-md">
                 {initialData?.plan_type || (tier === 3 ? 'ULTIMATE' : tier === 2 ? 'PRO' : 'ALPHA')}
              </span>
            </div>
          </div>
          <div className="relative overflow-hidden bg-gradient-to-br from-white/[0.04] to-white/[0.01] border border-[var(--glass-border)] p-6 md:p-8 rounded-[2rem] hover:border-white/[0.1] hover:bg-white/[0.06] transition-all duration-300 group shadow-2xl flex items-center gap-6">
            <div className="p-3.5 rounded-2xl bg-[var(--glass-bg)] border border-[var(--glass-border)] text-indigo-400 group-hover:scale-110 transition-transform duration-300 shadow-lg"><Clock size={28} /></div>
            <div>
              <span className="text-[9px] md:text-[10px] font-bold text-zinc-600 dark:text-zinc-500 uppercase tracking-widest block mb-1.5">Validity Status</span>
              <div className="flex items-baseline gap-3">
                <span className={`text-2xl md:text-3xl font-black italic tracking-tighter uppercase drop-shadow-md ${tier > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {tier > 0 ? 'ACTIVE' : 'EXPIRED'}
                </span>
                {tier > 0 && <span className="text-zinc-700 dark:text-zinc-400 font-bold text-[11px] tracking-widest">({daysLeft} DAYS)</span>}
              </div>
            </div>
          </div>
          <div className="relative overflow-hidden bg-gradient-to-br from-white/[0.04] to-white/[0.01] border border-[var(--glass-border)] p-6 md:p-8 rounded-[2rem] hover:border-white/[0.1] hover:bg-white/[0.06] transition-all duration-300 group shadow-2xl flex items-center gap-6">
            <div className="p-3.5 rounded-2xl bg-[var(--glass-bg)] border border-[var(--glass-border)] text-blue-400 group-hover:scale-110 transition-transform duration-300 shadow-lg"><Fingerprint size={28} /></div>
            <div>
              <span className="text-[9px] md:text-[10px] font-bold text-zinc-600 dark:text-zinc-500 uppercase tracking-widest block mb-1.5">Account ID</span>
              <span className="text-xl md:text-2xl font-mono font-black text-zinc-900 dark:text-white italic drop-shadow-md tracking-tighter">
                 #{initialData?.id?.slice(0, 8).toUpperCase() || 'KMO-XXXX'}
              </span>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8">
          <div className="lg:col-span-7 space-y-6 md:space-y-8">
            <div className="bg-gradient-to-br from-white/[0.04] to-white/[0.01] border border-[var(--glass-border)] p-6 md:p-10 rounded-[2.5rem] shadow-2xl backdrop-blur-md">
              <div className="flex items-center justify-between mb-8 border-b border-[var(--glass-border)] pb-8">
                <h3 className="text-xs font-black text-zinc-900 dark:text-white uppercase tracking-widest flex items-center gap-3">
                  <User size={16} className="text-blue-400" /> Personal Information
                </h3>
                <div className="flex items-center gap-5">
                  <div className="text-right hidden sm:block">
                    <p className="text-[9px] font-bold text-zinc-600 dark:text-zinc-500 uppercase tracking-widest mb-1">Member Since</p>
                    <p className="text-xs font-black text-zinc-900 dark:text-white italic">{memberSince}</p>
                  </div>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleAvatarUpload}
                    accept="image/*"
                    style={{ display: 'none' }}
                    disabled={avatarLoading}
                  />
                  <div className="relative group cursor-pointer shadow-[0_0_15px_rgba(0,0,0,0.5)] rounded-full" onClick={handleAvatarClick}>
                    {avatarLoading ? (
                      <div className="w-14 h-14 rounded-full bg-white/[0.05] border border-blue-500/50 flex items-center justify-center overflow-hidden animate-pulse shadow-[0_0_20px_rgba(59,130,246,0.3)]">
                        <Activity size={20} className="text-blue-400" />
                      </div>
                    ) : avatarUrl ? (
                      <img src={avatarUrl} alt="User Avatar" className="w-14 h-14 rounded-full object-cover border-2 border-[var(--glass-border)] group-hover:border-blue-500/50 transition-colors" />
                    ) : (
                      <div className="w-14 h-14 rounded-full bg-white/[0.05] border border-[var(--glass-border)] flex items-center justify-center overflow-hidden group-hover:border-blue-500/50 transition-colors">
                        <User size={24} className="text-zinc-700 dark:text-zinc-400 group-hover:text-blue-400 transition-colors" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-[var(--input-bg)]/60 flex items-center justify-center rounded-full opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm"><Camera size={16} className="text-zinc-900 dark:text-white"/></div>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="space-y-2.5">
                  <label className="text-[9px] md:text-[10px] font-black text-zinc-600 dark:text-zinc-500 uppercase ml-1 tracking-widest">Full Name</label>
                  <div className="relative">
                    <input className="w-full bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-xl pl-12 pr-4 py-3.5 text-xs font-mono font-bold text-zinc-900 dark:text-white outline-none focus:border-blue-500/50 hover:border-white/20 transition-all" value={formData.full_name} onChange={(e) => setFormData({...formData, full_name: e.target.value})} />
                    <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600 dark:text-zinc-500" />
                  </div>
                </div>
                <div className="space-y-2.5">
                  <label className="text-[9px] md:text-[10px] font-black text-zinc-600 dark:text-zinc-500 uppercase ml-1 tracking-widest">Registered Email</label>
                  <div className="relative opacity-60 cursor-not-allowed">
                    <input className="w-full bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-xl pl-12 pr-4 py-3.5 text-xs font-mono text-zinc-700 dark:text-zinc-400 outline-none pointer-events-none" value={formData.email} readOnly />
                    <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600 dark:text-zinc-500" />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2.5">
                    <label className="text-[9px] md:text-[10px] font-black text-zinc-600 dark:text-zinc-500 uppercase ml-1 tracking-widest">Country</label>
                    <div className="relative">
                      <input className="w-full bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-xl pl-12 pr-4 py-3.5 text-xs font-mono text-zinc-900 dark:text-white outline-none focus:border-blue-500/50 hover:border-white/20 transition-all" value={formData.country} onChange={(e) => setFormData({...formData, country: e.target.value})} />
                      <Globe size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600 dark:text-zinc-500" />
                    </div>
                  </div>
                  <div className="space-y-2.5">
                    <label className="text-[9px] md:text-[10px] font-black text-zinc-600 dark:text-zinc-500 uppercase ml-1 tracking-widest">Billing Address</label>
                    <div className="relative">
                      <input className="w-full bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-xl pl-12 pr-4 py-3.5 text-xs font-mono text-zinc-900 dark:text-white outline-none focus:border-blue-500/50 hover:border-white/20 transition-all" value={formData.address} onChange={(e) => setFormData({...formData, address: e.target.value})} />
                      <MapPin size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600 dark:text-zinc-500" />
                    </div>
                  </div>
                </div>

                {message && (
                  <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className={`p-4 rounded-xl flex items-center gap-3 border shadow-lg ${message.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}>
                    {message.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                    <span className="text-[10px] font-black uppercase tracking-widest">{message.text}</span>
                  </motion.div>
                )}

                <button onClick={handleUpdateProfile} disabled={loading} className={`w-full mt-8 py-4 text-zinc-900 dark:text-white text-[11px] font-black uppercase tracking-[0.2em] rounded-xl transition-all duration-300 active:scale-95 flex items-center justify-center gap-3 ${
                    loading ? 'bg-white/[0.05] border border-[var(--glass-border)] text-zinc-600 dark:text-zinc-500 cursor-not-allowed' : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 border border-blue-500/30 shadow-[0_0_30px_rgba(59,130,246,0.3)] hover:shadow-[0_0_40px_rgba(59,130,246,0.5)]'
                }`}>
                  {loading ? <RefreshCcw size={16} className="animate-spin text-zinc-700 dark:text-zinc-400" /> : <Save size={16} className="text-blue-200" />}
                  {loading ? 'Processing Sync...' : 'Save Identity Changes'}
                </button>
              </div>
            </div>
            <div className="p-6 md:p-8 rounded-[2rem] bg-gradient-to-r from-blue-500/[0.05] to-transparent border border-blue-500/10 shadow-[0_0_30px_rgba(59,130,246,0.05)]">
              <h4 className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" /> Security Notice
              </h4>
              <p className="text-xs leading-relaxed text-zinc-700 dark:text-zinc-400 font-bold">
                Identity details are verified strictly for localized billing requirements and advanced security protocols. Ensure accuracy to prevent access revocation.
              </p>
            </div>
          </div>

          <div className="lg:col-span-5 space-y-6 md:space-y-8">
            {/* Password Change Section */}
            <div className="bg-gradient-to-br from-white/[0.04] to-white/[0.01] border border-[var(--glass-border)] p-6 md:p-10 rounded-[2.5rem] shadow-2xl backdrop-blur-md">
              <h3 className="text-xs font-black text-zinc-900 dark:text-white uppercase tracking-widest mb-8 flex items-center gap-3">
                <Lock size={16} className="text-red-400" /> Security Credentials
              </h3>
              
              <div className="space-y-6">
                <div className="space-y-2.5">
                  <label className="text-[9px] md:text-[10px] font-black text-zinc-600 dark:text-zinc-500 uppercase ml-1 tracking-widest">Old Password</label>
                  <div className="relative">
                    <input type="password" placeholder="••••••••" className="w-full bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-xl pl-12 pr-4 py-3.5 text-xs font-mono text-zinc-900 dark:text-white outline-none focus:border-red-500/50 hover:border-white/20 transition-all" value={passwordData.oldPassword} onChange={(e) => setPasswordData({...passwordData, oldPassword: e.target.value})} />
                    <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600 dark:text-zinc-500" />
                  </div>
                </div>
                <div className="space-y-2.5">
                  <label className="text-[9px] md:text-[10px] font-black text-zinc-600 dark:text-zinc-500 uppercase ml-1 tracking-widest">New Password</label>
                  <div className="relative">
                    <input type="password" placeholder="••••••••" className="w-full bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-xl pl-12 pr-4 py-3.5 text-xs font-mono text-zinc-900 dark:text-white outline-none focus:border-red-500/50 hover:border-white/20 transition-all" value={passwordData.newPassword} onChange={(e) => setPasswordData({...passwordData, newPassword: e.target.value})} />
                    <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600 dark:text-zinc-500" />
                  </div>
                </div>
                <div className="space-y-2.5">
                  <label className="text-[9px] md:text-[10px] font-black text-zinc-600 dark:text-zinc-500 uppercase ml-1 tracking-widest">Re-enter Password</label>
                  <div className="relative">
                    <input type="password" placeholder="••••••••" className="w-full bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-xl pl-12 pr-4 py-3.5 text-xs font-mono text-zinc-900 dark:text-white outline-none focus:border-red-500/50 hover:border-white/20 transition-all" value={passwordData.confirmPassword} onChange={(e) => setPasswordData({...passwordData, confirmPassword: e.target.value})} />
                    <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600 dark:text-zinc-500" />
                  </div>
                </div>
              </div>
              <button onClick={handlePasswordChange} disabled={passwordLoading} className={`w-full mt-8 py-4 text-zinc-900 dark:text-white text-[11px] font-black uppercase tracking-[0.2em] rounded-xl transition-all duration-300 active:scale-95 flex items-center justify-center gap-3 group ${
                  passwordLoading ? 'bg-white/[0.05] border border-[var(--glass-border)] text-zinc-600 dark:text-zinc-500 cursor-not-allowed' : 'bg-[var(--glass-bg)] hover:bg-white/[0.05] border border-[var(--glass-border)] hover:border-red-500/50 hover:shadow-[0_0_30px_rgba(239,68,68,0.2)]'
              }`}>
                {passwordLoading ? <RefreshCcw size={16} className="animate-spin text-zinc-700 dark:text-zinc-400" /> : <Lock size={16} className="group-hover:text-red-400 transition-colors" />}
                {passwordLoading ? 'Rotating Keys...' : 'Update Credentials'}
              </button>
            </div>

            <div className="bg-gradient-to-br from-white/[0.04] to-white/[0.01] border border-[var(--glass-border)] p-6 md:p-10 rounded-[2.5rem] shadow-2xl backdrop-blur-md">
              <h4 className="text-xs font-black text-zinc-700 dark:text-zinc-400 uppercase tracking-widest mb-8 flex items-center gap-3">
                <Zap size={16} className="text-amber-400" /> Current Privileges
              </h4>
              <div className="space-y-5">
                {tierFeatures.map((feat, i) => (
                  <div key={i} className="flex items-center gap-4 bg-[var(--glass-bg)] p-3 rounded-xl border border-[var(--glass-border)]">
                    <CheckCircle2 size={18} className="text-emerald-400 drop-shadow-[0_0_5px_rgba(52,211,153,0.5)] shrink-0" />
                    <span className="text-[11px] font-bold text-zinc-800 dark:text-zinc-300 uppercase tracking-widest">{feat}</span>
                  </div>
                ))}
              </div>
              
              <div className="mt-10 pt-8 border-t border-[var(--glass-border)]">
                <h4 className="text-[10px] font-black text-red-500/60 uppercase tracking-widest mb-4 flex items-center gap-2"><AlertCircle size={14}/> Danger Zone</h4>
                <button className="w-full py-4 border border-red-500/20 bg-red-500/5 hover:bg-red-500/10 text-red-400 text-[10px] font-black uppercase tracking-[0.2em] rounded-xl transition-all flex items-center justify-center gap-3 hover:shadow-[0_0_20px_rgba(239,68,68,0.2)]">
                  <Trash2 size={16} /> Request Account Deletion
                </button>
              </div>
            </div>

            <div className="bg-gradient-to-br from-white/[0.02] to-transparent border border-[var(--glass-border)] p-6 md:p-8 rounded-[2rem]">
              <h4 className="text-[10px] font-black text-zinc-600 dark:text-zinc-500 uppercase tracking-widest mb-6 italic flex items-center gap-2"><Activity size={14}/> Security Logs</h4>
              <div className="space-y-5">
                <div className="flex justify-between items-center border-b border-white/[0.02] pb-3">
                  <span className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest">Last Security Rotation</span>
                  <span className="text-[9px] font-black text-zinc-700 dark:text-zinc-400 uppercase font-mono">NEVER</span>
                </div>
                <div className="flex justify-between items-center border-b border-white/[0.02] pb-3">
                  <span className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest">Current Session</span>
                  <span className="text-[9px] font-black text-emerald-400 uppercase font-mono drop-shadow-[0_0_5px_rgba(52,211,153,0.5)]">ACTIVE</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest">Clearance Level</span>
                  <span className="text-[10px] font-black text-zinc-900 dark:text-white uppercase italic tracking-widest">{initialData?.role || 'User'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
