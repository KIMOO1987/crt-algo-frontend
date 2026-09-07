"use client";
import { useEffect, useState, use } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Save, User, Mail, Shield, Calendar, Wallet, Percent, TrendingUp, Loader2, ArrowLeft, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import CustomSelect from '@/components/CustomSelect';

export default function UserDetailClient() {
  const searchParams = useSearchParams();
  const id = searchParams.get('id');
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!id) return;
    const fetchUser = async () => {
      const { data } = await supabase.from('profiles').select('*').eq('id', id).single();
      if (data) setUser(data);
      setLoading(false);
    };
    fetchUser();
  }, [id]);

  const handleUpdate = async () => {
    if (!id) return;
    setSaving(true);
    
    // EXCLUDE id and other immutable system fields from the update payload
    const updateData = {
      full_name: user.full_name,
      email: user.email,
      role: user.role,
      tier: Number(user.tier),
      is_pro: user.is_pro === true || user.is_pro === 'true',
      plan_type: user.plan_type,
      subscription_type: user.subscription_type,
      subscription_status: user.subscription_status,
      expiry_date: user.expiry_date || null, 
      account_size: user.account_size?.toString() || '0',
      risk_value: user.risk_value?.toString() || '1.0',
      reward_value: user.reward_value?.toString() || '2.0',
      country: user.country,
      address: user.address,
      age: Number(user.age) || 0
    };
    
    try {
      const { data, error } = await supabase.from('profiles').update(updateData).eq('id', id).select();
      
      if (error) {
        alert(`Sync Error: ${error.message}`);
      } else if (!data || data.length === 0) {
        alert("Sync Failed: No records were updated. Check permissions or ID.");
      } else {
        alert("Member profile synchronized with database.");
      }
    } catch (err: any) {
      console.error("Fetch Error:", err);
      if (err.name === 'TypeError' && err.message === 'Failed to fetch') {
        alert("Sync Error: Network connection failed or was blocked by CORS. Please check your internet or Supabase configuration.");
      } else {
        alert(`Sync Error: ${err.message || 'An unexpected error occurred'}`);
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div className="flex-1 flex items-center justify-center py-20">
      <div className="flex flex-col items-center justify-center py-20 animate-pulse">
        <Loader2 size={40} className="text-orange-500 mb-4 animate-spin" />
        <p className="text-xs font-black uppercase tracking-widest text-zinc-500">Loading Identity Data...</p>
      </div>
    </div>
  );

  return (
    <div className="w-full relative z-10 flex flex-col space-y-6 md:space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-4">
        <div className="flex flex-col items-start">
          <button onClick={() => router.back()} className="flex items-center gap-2 text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-all mb-6 uppercase font-black text-[10px] tracking-widest hover:bg-white/[0.02] py-2 px-3 rounded-lg border border-transparent hover:border-white/[0.05] -ml-3 cursor-pointer">
            <ArrowLeft size={14} /> Back
          </button>
          <h1 className="text-2xl md:text-4xl font-extrabold tracking-tight uppercase text-zinc-900 dark:text-white">
            Edit <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-orange-600">Member</span>
          </h1>
          <p className="text-[10px] uppercase tracking-[0.3em] font-bold mt-2 text-zinc-500 dark:text-zinc-400">
            • ID: {user.id} •
          </p>
        </div>
        <button 
          onClick={handleUpdate} 
          disabled={saving}
          className={`w-full md:w-auto py-4 px-8 rounded-xl text-[11px] font-black uppercase tracking-[0.2em] transition-all duration-300 flex items-center justify-center gap-3 active:scale-95 cursor-pointer ${
            saving 
              ? 'bg-white/[0.05] border border-white/5 text-zinc-500 cursor-not-allowed shadow-none' 
              : 'bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400 text-white shadow-[0_0_30px_rgba(249,115,22,0.2)] hover:shadow-[0_0_40px_rgba(249,115,22,0.4)] border border-orange-500/30'
          }`}
        >
          {saving ? <Loader2 size={16} className="animate-spin text-orange-200" /> : <Save size={16} className="text-orange-200" />} 
          {saving ? 'Syncing...' : 'Sync Changes'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8 w-full">
        <div className="glass-panel p-6 md:p-8 shadow-2xl space-y-6">
          <h3 className="text-[11px] font-black uppercase tracking-widest text-zinc-700 dark:text-zinc-400 flex items-center gap-3 border-b border-[var(--glass-border)] pb-6 mb-6">
            <User size={16} className="text-orange-500" /> Core Identity
          </h3>
          <div className="space-y-5">
            <InputField label="Full Name" value={user.full_name} onChange={(v: string) => setUser({...user, full_name: v})} />
            <InputField label="Email Address" value={user.email} onChange={(v: string) => setUser({...user, email: v})} />
            <div className="grid grid-cols-2 gap-5">
              <SelectField 
                label="Access Role" 
                value={user.role} 
                options={['user', 'moderator', 'admin']} 
                onChange={(v: string) => setUser({...user, role: v})} 
              />
              <SelectField 
                label="Tier Level" 
                value={user.tier} 
                options={[0, 1, 2, 3]} 
                onChange={(v: string) => setUser({...user, tier: Number(v)})} 
              />
            </div>
            <div className="grid grid-cols-2 gap-5">
              <InputField label="Country" value={user.country} onChange={(v: string) => setUser({...user, country: v})} />
              <InputField label="Age" type="number" value={user.age} onChange={(v: string) => setUser({...user, age: v})} />
            </div>
            <InputField label="Address" value={user.address} onChange={(v: string) => setUser({...user, address: v})} />
          </div>
        </div>

        <div className="glass-panel p-6 md:p-8 shadow-2xl space-y-6">
          <h3 className="text-[11px] font-black uppercase tracking-widest text-zinc-700 dark:text-zinc-400 flex items-center gap-3 border-b border-[var(--glass-border)] pb-6 mb-6">
            <Calendar size={16} className="text-orange-500" /> Subscription Meta
          </h3>
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-5">
              <SelectField 
                label="Plan Display Text" 
                value={user.subscription_status || 'free'} 
                options={['free', 'active']} 
                onChange={(v: string) => setUser({...user, subscription_status: v})} 
              />
              <InputField label="Expiry Date" value={user.expiry_date?.split('T')[0] || ''} type="date" onChange={(v: string) => setUser({...user, expiry_date: v})} />
            </div>

            <div className="grid grid-cols-2 gap-5">
              <SelectField 
                label="Plan Type" 
                value={user.plan_type || 'free'} 
                options={['free', 'alpha', 'pro', 'ultimate']} 
                onChange={(v: string) => setUser({...user, plan_type: v})} 
              />
              <SelectField 
                label="Subscription Type" 
                value={user.subscription_type || 'free'} 
                options={['free', 'alpha', 'pro', 'ultimate']} 
                onChange={(v: string) => setUser({...user, subscription_type: v})} 
              />
            </div>

            <SelectField 
              label="Is Pro Flag" 
              value={user.is_pro?.toString()} 
              options={['true', 'false']} 
              onChange={(v: string) => setUser({...user, is_pro: v === 'true'})} 
            />
          </div>
        </div>

        <div className="lg:col-span-2 glass-panel p-6 md:p-8 shadow-2xl">
          <h3 className="text-[11px] font-black uppercase tracking-widest text-zinc-700 dark:text-zinc-400 flex items-center gap-3 border-b border-[var(--glass-border)] pb-6 mb-6">
            <TrendingUp size={16} className="text-emerald-500" /> Trading Parameters
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <InputField label="Account Size ($)" value={user.account_size} type="number" onChange={(v: string) => setUser({...user, account_size: v})} />
            <InputField label="Risk Value (R)" value={user.risk_value} type="number" step="0.1" onChange={(v: string) => setUser({...user, risk_value: v})} />
            <InputField label="Reward Value (R)" value={user.reward_value} type="number" step="0.1" onChange={(v: string) => setUser({...user, reward_value: v})} />
          </div>
        </div>
      </div>
    </div>
  );
}

function InputField({ label, value, onChange, type = "text", step }: any) {
  return (
    <div className="space-y-2">
      <label className="text-[9px] md:text-[10px] font-black text-zinc-650 dark:text-zinc-500 uppercase ml-1 tracking-widest block">{label}</label>
      <input 
        type={type} 
        step={step}
        className="w-full bg-white/[0.02] border border-white/[0.08] rounded-xl px-4 py-3.5 text-xs font-mono font-bold text-zinc-900 dark:text-white outline-none focus:border-blue-500/50 hover:border-white/20 transition-all" 
        value={value || ''} 
        onChange={(e) => onChange(e.target.value)} 
      />
    </div>
  );
}

function SelectField({ label, value, options, onChange }: any) {
  const mappedOptions = options.map((o: any) => ({ value: o.toString(), label: o.toString().toUpperCase() }));
  return (
    <CustomSelect
      label={label}
      value={value?.toString()}
      onChange={onChange}
      options={mappedOptions}
      widthClass="w-full"
    />
  );
}
