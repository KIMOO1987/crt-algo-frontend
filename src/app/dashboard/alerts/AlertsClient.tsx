"use client";

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Bell, Send, Trash2, Edit, Plus, X, CheckCircle2, 
  AlertCircle, Loader2, Sparkles, HelpCircle, ToggleLeft, ToggleRight
} from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { apiFetch } from '@/lib/api-utils';

interface AlertProfile {
  id?: string;
  user_id?: string;
  name: string;
  description: string;
  tickers: string[];
  brokers: string[];
  timeframes: string[];
  bias: string;
  setups: string;
  direction: string;
  is_active: boolean;
}

export default function AlertsClient({ userId, userEmail }: { userId: string; userEmail: string }) {
  const [telegramAuth, setTelegramAuth] = useState<any>(null);
  const [profiles, setProfiles] = useState<AlertProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState<AlertProfile | null>(null);
  
  // Form states
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [tickersText, setTickersText] = useState('');
  const [brokersText, setBrokersText] = useState('');
  const [selectedTfs, setSelectedTfs] = useState<string[]>([]);
  const [bias, setBias] = useState('All');
  const [setups, setSetups] = useState('All');
  const [direction, setDirection] = useState('All');

  const availableTimeframes = ['M5/H1', 'M15/H4', 'M30/H6', 'H1/D1'];
  
  // Load data
  useEffect(() => {
    const loadData = async () => {
      try {
        // Fetch Telegram Auth
        const { data: authData } = await supabase
          .from('telegram_auth')
          .select('*')
          .eq('user_id', userId)
          .maybeSingle();
        
        setTelegramAuth(authData);

        // Fetch Alert Profiles
        const { data: profileData } = await supabase
          .from('alert_profiles')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: true });
        
        setProfiles(profileData || []);
      } catch (err) {
        console.error('Error loading data:', err);
      } finally {
        setLoading(false);
      }
    };

    loadData();

    // Subscribe to realtime database changes for telegram_auth
    const authChannel = supabase
      .channel('public:telegram_auth')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'telegram_auth', filter: `user_id=eq.${userId}` },
        (payload) => {
          if (payload.eventType === 'DELETE') {
            setTelegramAuth(null);
          } else {
            setTelegramAuth(payload.new);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(authChannel);
    };
  }, [userId]);

  const showToast = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 4000);
  };

  // Telegram actions
  const handleLinkTelegram = async () => {
    setActionLoading(true);
    try {
      const res = await apiFetch('/api/telegram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'token', userId })
      });
      
      const data = await res.json();
      if (data.status === 'success') {
        const botUsername = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME || 'crt_algo_alerts_bot';
        window.open(`https://t.me/${botUsername}?start=${data.token}`, '_blank');
        showToast('success', 'Bot conversation opened. Please click Start in Telegram.');
      } else {
        showToast('error', data.message || 'Failed to generate connection token.');
      }
    } catch (err: any) {
      showToast('error', err.message || 'Connection request failed.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUnlinkTelegram = async () => {
    if (!confirm('Are you sure you want to unlink your Telegram account? You will stop receiving alerts.')) return;
    setActionLoading(true);
    try {
      const res = await apiFetch('/api/telegram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'unlink', userId })
      });
      const data = await res.json();
      if (data.status === 'success') {
        setTelegramAuth(null);
        showToast('success', 'Telegram account unlinked successfully.');
      } else {
        showToast('error', data.message || 'Failed to unlink.');
      }
    } catch (err: any) {
      showToast('error', err.message || 'Unlink request failed.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSendTest = async () => {
    setActionLoading(true);
    try {
      const res = await apiFetch('/api/telegram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'send-test', userId })
      });
      const data = await res.json();
      if (data.status === 'success') {
        showToast('success', 'Test alert dispatched. Check your Telegram!');
      } else {
        showToast('error', data.message || 'Failed to send test alert.');
      }
    } catch (err: any) {
      showToast('error', err.message || 'Test request failed.');
    } finally {
      setActionLoading(false);
    }
  };

  // Profile actions
  const handleToggleActive = async (profileId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('alert_profiles')
        .update({ is_active: !currentStatus })
        .eq('id', profileId);

      if (error) throw error;
      
      setProfiles(prev => prev.map(p => p.id === profileId ? { ...p, is_active: !currentStatus } : p));
      showToast('success', `Alert Profile ${!currentStatus ? 'Activated' : 'Paused'}`);
    } catch (err: any) {
      showToast('error', err.message || 'Failed to update alert profile status.');
    }
  };

  const handleDeleteProfile = async (profileId: string) => {
    if (!confirm('Are you sure you want to delete this alert profile?')) return;
    try {
      const { error } = await supabase
        .from('alert_profiles')
        .delete()
        .eq('id', profileId);

      if (error) throw error;
      
      setProfiles(prev => prev.filter(p => p.id !== profileId));
      showToast('success', 'Alert Profile deleted.');
    } catch (err: any) {
      showToast('error', err.message || 'Failed to delete alert profile.');
    }
  };

  // Open modals
  const openAddModal = () => {
    if (profiles.length >= 10) {
      showToast('error', 'Maximum limit of 10 alert profiles reached.');
      return;
    }
    setEditingProfile(null);
    setName('');
    setDescription('');
    setTickersText('');
    setBrokersText('');
    setSelectedTfs([]);
    setBias('All');
    setSetups('All');
    setDirection('All');
    setIsModalOpen(true);
  };

  const openEditModal = (profile: AlertProfile) => {
    setEditingProfile(profile);
    setName(profile.name);
    setDescription(profile.description);
    setTickersText(profile.tickers.join(', '));
    setBrokersText(profile.brokers.join(', '));
    setSelectedTfs(profile.timeframes);
    setBias(profile.bias);
    setSetups(profile.setups);
    setDirection(profile.direction);
    setIsModalOpen(true);
  };

  // Save/Submit Form
  const handleSubmitProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      showToast('error', 'Profile Name is required.');
      return;
    }

    const tickers = tickersText
      .split(',')
      .map(t => t.trim().toUpperCase())
      .filter(t => t !== '');
    
    const brokers = brokersText
      .split(',')
      .map(b => b.trim().toUpperCase())
      .filter(b => b !== '');

    const profileData: AlertProfile = {
      user_id: userId,
      name: name.trim(),
      description: description.trim(),
      tickers: tickers.length > 0 ? tickers : ['All'],
      brokers: brokers.length > 0 ? brokers : ['All'],
      timeframes: selectedTfs.length > 0 ? selectedTfs : ['All'],
      bias,
      setups,
      direction,
      is_active: editingProfile ? editingProfile.is_active : true
    };

    try {
      if (editingProfile) {
        const { data, error } = await supabase
          .from('alert_profiles')
          .update(profileData)
          .eq('id', editingProfile.id)
          .select()
          .single();

        if (error) throw error;
        setProfiles(prev => prev.map(p => p.id === editingProfile.id ? data : p));
        showToast('success', 'Alert Profile synchronized successfully.');
      } else {
        const { data, error } = await supabase
          .from('alert_profiles')
          .insert(profileData)
          .select()
          .single();

        if (error) throw error;
        setProfiles(prev => [...prev, data]);
        showToast('success', 'Alert Profile instantiated successfully.');
      }
      setIsModalOpen(false);
    } catch (err: any) {
      showToast('error', err.message || 'Failed to preserve Alert Profile settings.');
    }
  };

  const activeCount = profiles.filter(p => p.is_active).length;

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[60vh]">
        <Loader2 className="animate-spin text-orange-500" size={40} />
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-8 p-6 md:p-10 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <span className="text-[9px] font-black text-blue-500 uppercase tracking-widest block mb-1">Telegram Alerts</span>
          <h1 className="text-3xl font-black italic tracking-tighter uppercase drop-shadow-md text-zinc-900 dark:text-white">
            Alerts
          </h1>
          <p className="text-[11px] font-bold text-zinc-500 tracking-wider mt-1.5 max-w-xl">
            Receive CRT Pro+ signal alerts on Telegram based on the market, symbol, timeframe, and event filters you choose.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={openAddModal}
            className="px-6 py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-zinc-900 dark:text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-xl border border-blue-500/30 shadow-[0_0_30px_rgba(59,130,246,0.3)] hover:shadow-[0_0_40px_rgba(59,130,246,0.5)] transition-all duration-300 flex items-center gap-2"
          >
            <Plus size={14} /> Add alert
          </button>
        </div>
      </div>

      {/* Toast Alert */}
      <AnimatePresence>
        {message && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }} 
            animate={{ opacity: 1, y: 0 }} 
            exit={{ opacity: 0, y: -20 }}
            className={`p-4 rounded-xl flex items-center gap-3 border shadow-lg max-w-md ${
              message.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border-red-500/20 text-red-400'
            }`}
          >
            {message.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
            <span className="text-[10px] font-black uppercase tracking-widest">{message.text}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Telegram Link Box */}
      <div className="glass-panel p-6 md:p-8 hover:border-white/[0.08] hover:bg-white/[0.03] transition-all duration-300 group shadow-2xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="p-4 rounded-2xl bg-[var(--glass-bg)] border border-[var(--glass-border)] text-blue-400 shadow-md">
              <Bell size={24} />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h3 className="text-sm font-black text-zinc-900 dark:text-white uppercase tracking-widest">Telegram</h3>
                {telegramAuth ? (
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[8px] font-black uppercase tracking-widest">
                    CONNECTED
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full bg-zinc-500/10 border border-[var(--glass-border)] text-zinc-500 text-[8px] font-black uppercase tracking-widest">
                    UNLINKED
                  </span>
                )}
              </div>
              <p className="text-[11px] font-bold text-zinc-500 tracking-wider mt-1">
                {telegramAuth ? `@${telegramAuth.telegram_username || 'linked_user'}` : 'Link your Telegram account to start receiving real-time signals.'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {telegramAuth ? (
              <>
                <button 
                  onClick={handleSendTest} 
                  disabled={actionLoading}
                  className="px-5 py-3.5 bg-zinc-200/50 hover:bg-zinc-200 dark:bg-white/[0.05] dark:hover:bg-white/[0.1] border border-[var(--glass-border)] text-zinc-700 dark:text-zinc-300 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all duration-300 flex items-center gap-2"
                >
                  <Send size={12} /> Send test
                </button>
                <button 
                  onClick={handleUnlinkTelegram} 
                  disabled={actionLoading}
                  className="px-5 py-3.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-500 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all duration-300 flex items-center gap-2"
                >
                  <X size={12} /> Unlink
                </button>
              </>
            ) : (
              <button 
                onClick={handleLinkTelegram} 
                disabled={actionLoading}
                className="px-6 py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-zinc-900 dark:text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all duration-300 flex items-center gap-2 shadow-lg"
              >
                {actionLoading ? <Loader2 size={12} className="animate-spin" /> : <Bell size={12} />}
                Link Telegram
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-panel p-6 shadow-xl border border-[var(--glass-border)]">
          <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest block mb-2">Active Alerts</span>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-zinc-900 dark:text-white">{activeCount}</span>
            <span className="text-xs font-bold text-zinc-400">/ {profiles.length} profiles</span>
          </div>
        </div>
        <div className="glass-panel p-6 shadow-xl border border-[var(--glass-border)]">
          <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest block mb-2">Filters Setup</span>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-zinc-900 dark:text-white">{profiles.length}</span>
            <span className="text-xs font-bold text-zinc-400">/ 10 max limit</span>
          </div>
        </div>
        <div className="glass-panel p-6 shadow-xl border border-[var(--glass-border)]">
          <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest block mb-2">Delivery Channel</span>
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-black text-zinc-900 dark:text-white uppercase italic tracking-tighter">
              {telegramAuth ? 'Telegram BOT' : 'None Connected'}
            </span>
          </div>
        </div>
      </div>

      {/* Profile List Header */}
      <div className="flex items-center justify-between border-b border-[var(--glass-border)] pb-4 mt-12">
        <h3 className="text-xs font-black text-zinc-900 dark:text-white uppercase tracking-widest flex items-center gap-3">
          <Sparkles size={16} className="text-blue-400" /> Alert Profiles ({profiles.length}/10)
        </h3>
      </div>

      {/* Profiles Bento Grid */}
      {profiles.length === 0 ? (
        <div className="text-center py-16 glass-panel border border-dashed border-[var(--glass-border)] p-12">
          <Bell size={48} className="text-zinc-600 dark:text-zinc-500 mx-auto mb-4 opacity-50" />
          <h4 className="text-xs font-black uppercase tracking-widest text-zinc-900 dark:text-white mb-2">No Alert Profiles Set</h4>
          <p className="text-[10px] text-zinc-500 font-bold max-w-sm mx-auto mb-6">
            Create an Alert Profile to receive Telegram alerts for specific tokens, timeframes, or directions.
          </p>
          <button 
            onClick={openAddModal}
            className="px-5 py-3 bg-zinc-200/50 hover:bg-zinc-200 dark:bg-white/[0.05] dark:hover:bg-white/[0.1] border border-[var(--glass-border)] text-zinc-900 dark:text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all duration-300"
          >
            Create First Profile
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {profiles.map(profile => (
            <div 
              key={profile.id}
              className={`glass-panel p-6 hover:border-white/[0.1] hover:bg-white/[0.03] transition-all duration-300 shadow-xl flex flex-col justify-between border ${
                profile.is_active ? 'border-[var(--glass-border)]' : 'border-[var(--glass-border)] opacity-60'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h4 className="text-sm font-black text-zinc-900 dark:text-white uppercase tracking-wider">{profile.name}</h4>
                    {profile.description && (
                      <p className="text-[10px] font-bold text-zinc-500 tracking-wide mt-0.5">{profile.description}</p>
                    )}
                  </div>
                  <button 
                    onClick={() => handleToggleActive(profile.id!, profile.is_active)}
                    className="text-zinc-500 hover:text-blue-400 transition-colors"
                  >
                    {profile.is_active ? (
                      <ToggleRight size={32} className="text-blue-500" />
                    ) : (
                      <ToggleLeft size={32} className="text-zinc-600" />
                    )}
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-y-3 gap-x-4 border-t border-b border-[var(--glass-border)] py-4 my-4 text-[10px]">
                  <div>
                    <span className="font-bold text-zinc-500 dark:text-zinc-600 block uppercase tracking-widest text-[8px] mb-1">Tickers</span>
                    <span className="font-black text-zinc-800 dark:text-zinc-300 font-mono tracking-tighter truncate max-w-full block">
                      {profile.tickers.join(', ')}
                    </span>
                  </div>
                  <div>
                    <span className="font-bold text-zinc-500 dark:text-zinc-600 block uppercase tracking-widest text-[8px] mb-1">Brokers</span>
                    <span className="font-black text-zinc-800 dark:text-zinc-300 font-mono tracking-tighter truncate max-w-full block">
                      {profile.brokers.join(', ')}
                    </span>
                  </div>
                  <div>
                    <span className="font-bold text-zinc-500 dark:text-zinc-600 block uppercase tracking-widest text-[8px] mb-1">Timeframes</span>
                    <span className="font-black text-zinc-800 dark:text-zinc-300 font-mono tracking-tighter block">
                      {profile.timeframes.join(', ')}
                    </span>
                  </div>
                  <div>
                    <span className="font-bold text-zinc-500 dark:text-zinc-600 block uppercase tracking-widest text-[8px] mb-1">Direction</span>
                    <span className="font-black text-zinc-800 dark:text-zinc-300 uppercase block">
                      {profile.direction}
                    </span>
                  </div>
                  <div>
                    <span className="font-bold text-zinc-500 dark:text-zinc-600 block uppercase tracking-widest text-[8px] mb-1">Bias</span>
                    <span className="font-black text-zinc-800 dark:text-zinc-300 block">
                      {profile.bias}
                    </span>
                  </div>
                  <div>
                    <span className="font-bold text-zinc-500 dark:text-zinc-600 block uppercase tracking-widest text-[8px] mb-1">Setups</span>
                    <span className="font-black text-zinc-800 dark:text-zinc-300 block">
                      {profile.setups}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between mt-2 pt-2">
                <span className={`text-[9px] font-black uppercase tracking-wider flex items-center gap-1.5 ${
                  profile.is_active ? 'text-emerald-500' : 'text-zinc-500'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${profile.is_active ? 'bg-emerald-500 animate-pulse' : 'bg-zinc-500'}`}></span>
                  {profile.is_active ? 'ACTIVE' : 'PAUSED'}
                </span>
                
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => openEditModal(profile)}
                    className="p-2 bg-zinc-200/50 dark:bg-white/[0.05] hover:bg-zinc-300/50 dark:hover:bg-white/[0.1] border border-[var(--glass-border)] text-zinc-700 dark:text-zinc-300 rounded-lg transition-colors"
                  >
                    <Edit size={12} />
                  </button>
                  <button 
                    onClick={() => handleDeleteProfile(profile.id!)}
                    className="p-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-500 rounded-lg transition-colors"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Profile Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-xl glass-panel p-6 md:p-8 border border-[var(--glass-border)] shadow-2xl max-h-[90vh] overflow-y-auto"
            >
              <button 
                onClick={() => setIsModalOpen(false)}
                className="absolute right-6 top-6 text-zinc-500 hover:text-white transition-colors"
              >
                <X size={18} />
              </button>

              <h3 className="text-md font-black uppercase tracking-widest text-zinc-900 dark:text-white mb-6 border-b border-[var(--glass-border)] pb-4">
                {editingProfile ? 'Edit Alert Profile' : 'Create Alert Profile'}
              </h3>

              <form onSubmit={handleSubmitProfile} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Profile Name *</label>
                  <input 
                    className="input-modern w-full font-bold"
                    placeholder="e.g. CRT Pro+ alerts"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Description</label>
                  <input 
                    className="input-modern w-full font-bold"
                    placeholder="e.g. Indices - All Setups"
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-1">
                      Tickers 
                      <span title="Comma separated lists, e.g. BTCUSDT, EURUSD. Leave blank for ALL."><HelpCircle size={10} className="text-zinc-600" /></span>
                    </label>
                    <input 
                      className="input-modern w-full font-bold font-mono text-xs"
                      placeholder="e.g. US500, US100 (or blank)"
                      value={tickersText}
                      onChange={e => setTickersText(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-1">
                      Brokers
                      <span title="Comma separated lists, e.g. PEPPERSTONE, BINANCE. Leave blank for ALL."><HelpCircle size={10} className="text-zinc-600" /></span>
                    </label>
                    <input 
                      className="input-modern w-full font-bold font-mono text-xs"
                      placeholder="e.g. OANDA, BINANCE (or blank)"
                      value={brokersText}
                      onChange={e => setBrokersText(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Timeframe Alignments (Select all that apply)</label>
                  <div className="flex flex-wrap gap-3">
                    {availableTimeframes.map(tf => {
                      const isSelected = selectedTfs.includes(tf);
                      return (
                        <button
                          key={tf}
                          type="button"
                          onClick={() => {
                            setSelectedTfs(prev => 
                              prev.includes(tf) ? prev.filter(t => t !== tf) : [...prev, tf]
                            );
                          }}
                          className={`px-4 py-2.5 rounded-lg border text-[10px] font-black uppercase transition-all duration-200 ${
                            isSelected 
                              ? 'bg-blue-500/10 border-blue-500/40 text-blue-400 shadow-md shadow-blue-500/5' 
                              : 'bg-white/[0.02] border-[var(--glass-border)] text-zinc-500 hover:border-zinc-500/40'
                          }`}
                        >
                          {tf}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Direction</label>
                    <select 
                      className="input-modern w-full font-bold"
                      value={direction}
                      onChange={e => setDirection(e.target.value)}
                    >
                      <option value="All">All</option>
                      <option value="Bullish">Bullish (Buy)</option>
                      <option value="Bearish">Bearish (Sell)</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Bias</label>
                    <select 
                      className="input-modern w-full font-bold"
                      value={bias}
                      onChange={e => setBias(e.target.value)}
                    >
                      <option value="All">All</option>
                      <option value="Flow Model">Flow Model</option>
                      <option value="Counter">Counter</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Setups</label>
                    <select 
                      className="input-modern w-full font-bold"
                      value={setups}
                      onChange={e => setSetups(e.target.value)}
                    >
                      <option value="All">All Setups</option>
                      <option value="CRT Pro+">CRT Pro+ Only</option>
                      <option value="SFP Algo">SFP Breakout Only</option>
                    </select>
                  </div>
                </div>

                <div className="flex gap-4 pt-6 border-t border-[var(--glass-border)] mt-8">
                  <button 
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 py-4 bg-zinc-200/50 hover:bg-zinc-200 dark:bg-white/[0.05] dark:hover:bg-white/[0.1] border border-[var(--glass-border)] text-zinc-700 dark:text-zinc-300 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all duration-300"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-zinc-900 dark:text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all duration-300 border border-blue-500/30 shadow-[0_0_30px_rgba(59,130,246,0.3)] hover:shadow-[0_0_40px_rgba(59,130,246,0.5)]"
                  >
                    {editingProfile ? 'Save Changes' : 'Instantiate Profile'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
