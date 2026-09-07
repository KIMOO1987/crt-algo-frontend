"use client";
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Save, Loader2, Edit3, Gift } from 'lucide-react';

export default function PlanManager() {
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    fetchPlans();
  }, []);

  async function fetchPlans() {
    const { data } = await supabase.from('plans').select('*').order('price', { ascending: true });
    if (data) {
      const plansWithText = data.map(p => ({
        ...p,
        features: p.features || [],
        features_text: (p.features || []).join(', ')
      }));
      setPlans(plansWithText);
    }
    setLoading(false);
  }

  async function updatePlan(id: string) {
    const currentPlan = plans.find(p => p.id === id);
    if (!currentPlan) return;
    
    setSaving(id);
    
    // Parse features_text back to features array
    const parsedFeatures = (currentPlan.features_text || '')
      .split(',')
      .map((f: string) => f.trim())
      .filter((f: string) => f !== '');
    
    // Only send editable fields to prevent system field update errors
    const { id: _, created_at: __, features_text: ___, ...updates } = currentPlan;
    updates.features = parsedFeatures;
    
    const { data, error } = await supabase.from('plans').update(updates).eq('id', id).select();
    if (!error) {
      if (data && data.length > 0) {
        alert("Plan Updated Successfully!");
        setPlans(prevPlans => prevPlans.map(p => {
          if (p.id === id) {
            return { ...p, features: parsedFeatures, features_text: parsedFeatures.join(', ') };
          }
          return p;
        }));
      } else {
        alert("Update Failed: You do not have permission to edit this plan (Row Level Security policy blocked the update).");
      }
    }
    else alert(`Update Error: ${error.message}`);
    setSaving(null);
  }

  if (loading) return (
    <div className="flex-1 flex items-center justify-center py-20">
      <div className="flex flex-col items-center justify-center py-20 animate-pulse">
        <Loader2 size={40} className="text-orange-500 mb-4 animate-spin" />
        <p className="text-xs font-black uppercase tracking-widest text-zinc-500">Loading Configuration...</p>
      </div>
    </div>
  );

  return (
    <div className="w-full relative z-10 flex flex-col space-y-6 md:space-y-8">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-4">
        <div>
          <h1 className="text-2xl md:text-4xl font-extrabold tracking-tight uppercase text-zinc-900 dark:text-white">
            Plan <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-orange-600">Editor</span>
          </h1>
          <p className="text-[10px] uppercase tracking-[0.3em] font-bold mt-2 text-zinc-500 dark:text-zinc-400">
            • SUBSCRIPTION TIERS & PRICING CONTROL •
          </p>
        </div>
      </div>
      
      <div className="grid gap-6 md:gap-8 w-full">
        {plans.map((plan) => {
          const isTrial = plan.id?.toLowerCase().includes('trial') || Number(plan.price) === 0;
          return (
            <div key={plan.id} className={`relative overflow-hidden glass-panel p-6 md:p-8 shadow-2xl flex flex-col gap-6 hover:border-[var(--accent)]/30 hover:shadow-[0_0_30px_var(--accent-glow)] transition-all duration-300 group`}>
              {isTrial && (
                <div className="absolute top-0 right-0 bg-fuchsia-600 text-white text-[8px] font-black px-4 py-1.5 rounded-bl-xl uppercase tracking-[0.2em] shadow-lg z-20">
                  Trial Package
                </div>
              )}

              <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-[var(--glass-border)] pb-6">
                 <h2 className="text-2xl font-black italic tracking-tighter uppercase drop-shadow-md flex items-center gap-3">
                   <Edit3 className={isTrial ? "text-fuchsia-400" : "text-orange-500"} size={20} /> {plan.name}
                 </h2>
                 <button 
                  onClick={() => updatePlan(plan.id)}
                  disabled={saving === plan.id}
                  className={`w-full md:w-auto px-8 py-3.5 rounded-xl text-[11px] font-black uppercase tracking-[0.2em] transition-all duration-300 flex items-center justify-center gap-3 active:scale-95 cursor-pointer ${
                    saving === plan.id 
                      ? 'bg-white/[0.05] border border-white/5 text-zinc-500 cursor-not-allowed shadow-none' 
                      : isTrial
                        ? 'bg-gradient-to-r from-fuchsia-600 to-pink-600 hover:from-fuchsia-500 hover:to-pink-500 text-white shadow-[0_0_30px_rgba(217,70,239,0.2)] hover:shadow-[0_0_40px_rgba(217,70,239,0.4)] border border-fuchsia-500/30'
                        : 'bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400 text-white shadow-[0_0_30px_rgba(249,115,22,0.2)] hover:shadow-[0_0_40px_rgba(249,115,22,0.4)] border border-orange-500/30'
                  }`}
                 >
                   {saving === plan.id ? <Loader2 size={16} className="animate-spin text-orange-200" /> : <Save size={16} className="text-orange-200" />} 
                   {saving === plan.id ? 'Saving...' : 'Save Changes'}
                 </button>
              </div>

              <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[9px] md:text-[10px] font-black text-zinc-500 uppercase ml-1 tracking-widest block">Price (USDT)</label>
                  <input 
                    type="number" 
                    value={plan.price} 
                    onChange={(e) => {
                      setPlans(prevPlans => prevPlans.map(p => {
                        if (p.id === plan.id) {
                          return { ...p, price: Number(e.target.value) };
                        }
                        return p;
                      }));
                    }}
                    className="w-full bg-[var(--input-bg)] border border-[var(--glass-border)] rounded-xl px-4 py-3.5 text-xs font-mono font-bold text-zinc-900 dark:text-white outline-none focus:border-orange-500/50 hover:border-white/20 transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] md:text-[10px] font-black text-zinc-500 uppercase ml-1 tracking-widest block">Duration Text</label>
                  <input 
                    type="text" 
                    value={plan.duration_text} 
                    onChange={(e) => {
                      setPlans(prevPlans => prevPlans.map(p => {
                        if (p.id === plan.id) {
                          return { ...p, duration_text: e.target.value };
                        }
                        return p;
                      }));
                    }}
                    className="w-full bg-[var(--input-bg)] border border-[var(--glass-border)] rounded-xl px-4 py-3.5 text-xs font-mono font-bold text-zinc-900 dark:text-white outline-none focus:border-orange-500/50 hover:border-white/20 transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] md:text-[10px] font-black text-zinc-500 uppercase ml-1 tracking-widest block">Plan Duration (Days)</label>
                  <input 
                    type="number" 
                    value={plan.duration} 
                    onChange={(e) => {
                      setPlans(prevPlans => prevPlans.map(p => {
                        if (p.id === plan.id) {
                          return { ...p, duration: Number(e.target.value) };
                        }
                        return p;
                      }));
                    }}
                    className="w-full bg-[var(--input-bg)] border border-[var(--glass-border)] rounded-xl px-4 py-3.5 text-xs font-mono font-bold text-zinc-900 dark:text-white outline-none focus:border-orange-500/50 hover:border-white/20 transition-all"
                  />
                </div>
                <div className="relative z-10 space-y-2">
                  <label className="text-[9px] md:text-[10px] font-black text-zinc-500 uppercase ml-1 tracking-widest block">Features (Comma Separated)</label>
                  <textarea 
                    value={plan.features_text ?? ''} 
                    onChange={(e) => {
                      setPlans(prevPlans => prevPlans.map(p => {
                        if (p.id === plan.id) {
                          return { ...p, features_text: e.target.value };
                        }
                        return p;
                      }));
                    }}
                    className="w-full bg-[var(--input-bg)] border border-[var(--glass-border)] rounded-xl px-4 py-3.5 text-xs font-mono font-bold text-zinc-900 dark:text-white outline-none focus:border-orange-500/50 hover:border-white/20 transition-all h-28 resize-none"
                  />
                </div>
              </div>
            </div>
          );
        })}
        
        {/* Add Trial Placeholder if missing */}
        {!plans.some(p => p.id?.toLowerCase().includes('trial') || Number(p.price) === 0) && (
          <div className="relative overflow-hidden glass-panel border-dashed border-fuchsia-500/30 p-12 rounded-2xl flex flex-col items-center justify-center gap-6 group hover:border-fuchsia-500/50 transition-all">
             <div className="p-4 rounded-full bg-fuchsia-500/10 border border-fuchsia-500/20">
               <Gift className="text-fuchsia-400" size={32} />
             </div>
             <div className="text-center">
               <h3 className="text-xl font-black uppercase italic tracking-tighter text-fuchsia-400">No Trial Package Found</h3>
               <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mt-2">The database does not have a trial configuration.</p>
             </div>
             <button 
              onClick={async () => {
                const newTrial = {
                  id: 'trial',
                  name: '15-Day Trial',
                  price: 0,
                  duration: 15,
                  duration_text: 'FREE ACCESS',
                  features: ['FULL TIER 3 (ULTIMATE) ACCESS', 'ALL EXCHANGES & STRATEGIES', 'INSTANT SIGNAL DELIVERY', '24/7 SUPPORT ACCESS'],
                  icon_type: 'gift'
                };
                const { error } = await supabase.from('plans').insert(newTrial);
                if (!error) fetchPlans();
              }}
              className="px-8 py-3.5 bg-fuchsia-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg hover:shadow-fuchsia-500/30 transition-all active:scale-95 cursor-pointer font-bold"
             >
               Initialize Trial Package
             </button>
          </div>
        )}
      </div>
    </div>
  );
}
