"use client";
import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Save, User, Calendar, TrendingUp, Loader2, ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api-utils';

export default function NewUserPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>({
    full_name: '',
    email: '',
    password: '',
    role: 'user',
    tier: 0,
    is_pro: false,
    plan_type: 'free',
    subscription_type: 'free',
    subscription_status: 'free',
    expiry_date: null,
    account_size: '0',
    risk_value: '1.0',
    reward_value: '2.0',
    country: '',
    address: '',
    age: 0,
  });
  const [saving, setSaving] = useState(false);

  const handleCreate = async () => {
    if (!user.email || !user.password) {
      alert("Email and Password are required to create an Authentication record.");
      return;
    }

    setSaving(true);
    
    // 1. Call the API to create the Auth record
    const response = await apiFetch('/api/admin/create-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(user)
    });
    const { user: authUser, error: authError } = await response.json();

    if (authError || !authUser) {
      alert(`Authentication Error: ${authError}`);
      setSaving(false);
      return;
    }

    // 2. Use the ID from the newly created Auth user for the profile
    const { password: _, ...profileData } = user;
    const insertData = {
      ...profileData,
      id: authUser.id, 
      tier: Number(user.tier),
      is_pro: user.is_pro === true || user.is_pro === 'true',
      age: Number(user.age) || 0,
      account_size: user.account_size?.toString() || '0',
      risk_value: user.risk_value?.toString() || '1.0',
      reward_value: user.reward_value?.toString() || '2.0',
      expiry_date: user.expiry_date || null,
    };
    
    // Use upsert instead of insert to handle cases where a database trigger 
    // might have already created the profile row upon auth user creation.
    const { data, error } = await supabase.from('profiles').upsert(insertData).select();
    
    if (error) {
      alert(`Creation Error: ${error.message}`);
    } else if (!data || data.length === 0) {
      alert("Creation Failed: No record was created.");
    } else {
      alert("New member profile created successfully.");
      // Redirect to the newly created user's edit page
      router.push(`/admin/users/details?id=${data[0].id}`);
    }
    setSaving(false);
  };

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
          <div className="flex flex-col items-start">
            <button onClick={() => router.push('/admin/users')} className="flex items-center gap-2 text-zinc-600 dark:text-zinc-500 hover:text-zinc-900 dark:text-white transition-all mb-6 uppercase font-black text-[10px] tracking-widest hover:bg-white/[0.02] py-2 px-3 rounded-lg border border-transparent hover:border-white/[0.05] -ml-3">
              <ArrowLeft size={14} /> Back to Users
            </button>
            <h1 className="text-2xl md:text-4xl font-black tracking-tighter italic flex items-center gap-3 uppercase text-zinc-900 dark:text-white">
              Add<span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-500">New Member</span>
            </h1>
            <p className="text-[10px] uppercase tracking-[0.4em] text-zinc-600 dark:text-zinc-500 font-bold mt-3 leading-none">
              • OPERATOR PROVISIONING •
            </p>
          </div>
          <button 
            onClick={handleCreate} 
            disabled={saving}
            className={`w-full md:w-auto py-4 px-8 rounded-xl text-[11px] font-black uppercase tracking-[0.2em] transition-all duration-300 flex items-center justify-center gap-3 active:scale-95 ${
              saving 
                ? 'bg-white/[0.05] border border-white/5 text-zinc-600 dark:text-zinc-500 cursor-not-allowed shadow-none' 
                : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-zinc-900 dark:text-white shadow-[0_0_30px_rgba(59,130,246,0.3)] hover:shadow-[0_0_40px_rgba(59,130,246,0.5)] border border-blue-500/30'
            }`}
          >
            {saving ? <Loader2 size={16} className="animate-spin text-blue-200" /> : <Save size={16} className="text-blue-200" />} 
            {saving ? 'Creating...' : 'Create Member'}
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
          {/* Identity Block */}
          <div className="bg-gradient-to-br from-white/[0.04] to-white/[0.01] border border-white/[0.05] p-6 md:p-8 rounded-[2.5rem] shadow-2xl backdrop-blur-md space-y-6">
            <h3 className="text-[11px] font-black uppercase tracking-widest text-zinc-700 dark:text-zinc-400 flex items-center gap-3 border-b border-white/[0.05] pb-6 mb-6">
              <User size={16} className="text-blue-400" /> Core Identity
            </h3>
            <div className="space-y-5">
              <InputField label="Full Name" value={user.full_name} onChange={(v: string) => setUser({...user, full_name: v})} />
              <InputField label="Email Address" value={user.email} onChange={(v: string) => setUser({...user, email: v})} />
              <InputField label="Initial Password" type="password" value={user.password} onChange={(v: string) => setUser({...user, password: v})} />
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

          {/* Subscription Block */}
          <div className="bg-gradient-to-br from-white/[0.04] to-white/[0.01] border border-white/[0.05] p-6 md:p-8 rounded-[2.5rem] shadow-2xl backdrop-blur-md space-y-6">
            <h3 className="text-[11px] font-black uppercase tracking-widest text-zinc-700 dark:text-zinc-400 flex items-center gap-3 border-b border-white/[0.05] pb-6 mb-6">
              <Calendar size={16} className="text-indigo-400" /> Subscription Meta
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

          {/* Trading Parameters */}
          <div className="lg:col-span-2 bg-gradient-to-br from-white/[0.04] to-white/[0.01] border border-white/[0.05] p-6 md:p-8 rounded-[2.5rem] shadow-2xl backdrop-blur-md">
            <h3 className="text-[11px] font-black uppercase tracking-widest text-zinc-700 dark:text-zinc-400 flex items-center gap-3 border-b border-white/[0.05] pb-6 mb-6">
              <TrendingUp size={16} className="text-emerald-400" /> Trading Parameters
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <InputField label="Account Size ($)" value={user.account_size} type="number" onChange={(v: string) => setUser({...user, account_size: v})} />
              <InputField label="Risk Value (R)" value={user.risk_value} type="number" step="0.1" onChange={(v: string) => setUser({...user, risk_value: v})} />
              <InputField label="Reward Value (R)" value={user.reward_value} type="number" step="0.1" onChange={(v: string) => setUser({...user, reward_value: v})} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function InputField({ label, value, onChange, type = "text", step }: any) {
  return (
    <div className="space-y-2">
      <label className="text-[9px] md:text-[10px] font-black text-zinc-600 dark:text-zinc-500 uppercase ml-1 tracking-widest block">{label}</label>
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
  return (
    <div className="space-y-2">
      <label className="text-[9px] md:text-[10px] font-black text-zinc-600 dark:text-zinc-500 uppercase ml-1 tracking-widest block">{label}</label>
      <select 
        className="w-full bg-white/[0.02] border border-white/[0.08] rounded-xl px-4 py-3.5 text-xs font-mono font-bold text-zinc-900 dark:text-white outline-none focus:border-blue-500/50 hover:border-white/20 transition-all appearance-none cursor-pointer" 
        value={value} 
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((o: any) => (
          <option key={o} value={o} className="">{o.toString().toUpperCase()}</option>
        ))}
      </select>
    </div>
  );
}
