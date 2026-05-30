"use client";

import { useEffect, useState, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { 
  Activity, Search, Plus, Edit2, Trash2, X, 
  Loader2, RefreshCcw, Clock, AlertCircle, Save, Layers, Target, Shield, Zap
} from 'lucide-react';
import CustomSelect from '@/components/CustomSelect';

const ITEMS_PER_PAGE = 12;

const ASSET_CLASS_OPTIONS = [
  { value: 'ALL', label: 'ALL ASSETS' },
  { value: 'CRYPTO', label: 'CRYPTO' },
  { value: 'FOREX', label: 'FOREX' },
  { value: 'INDICES', label: 'INDICES' },
  { value: 'METALS', label: 'METALS' }
];

const STATUS_OPTIONS = [
  { value: 'ALL', label: 'ALL STATUSES' },
  { value: 'ACTIVE', label: 'ACTIVE' },
  { value: 'PENDING', label: 'PENDING' },
  { value: 'TP1', label: 'TP1 HIT' },
  { value: 'TP2', label: 'TP2 HIT' },
  { value: 'SL', label: 'SL HIT' },
  { value: 'WIN', label: 'TAKE PROFIT (WIN)' },
  { value: 'LOSS', label: 'STOP LOSS (LOSS)' },
  { value: 'TP1 + SL (BE)', label: 'PARTIAL TP1 (BE)' }
];

const STATE_OPTIONS = [
  { value: 'ALL', label: 'ALL STATES' },
  { value: 'LIVE', label: 'LIVE ACTIVE SIGNALS' },
  { value: 'ARCHIVED', label: 'ARCHIVED/HISTORICAL' }
];

const MODAL_CATEGORY_OPTIONS = [
  { value: 'CRYPTO', label: 'CRYPTO' },
  { value: 'FOREX', label: 'FOREX' },
  { value: 'INDICES', label: 'INDICES' },
  { value: 'METALS', label: 'METALS' }
];

const MODAL_SIDE_OPTIONS = [
  { value: 'BUY', label: 'BUY (BULLISH)' },
  { value: 'SELL', label: 'SELL (BEARISH)' }
];

const MODAL_STATUS_OPTIONS = [
  { value: 'ACTIVE', label: 'ACTIVE' },
  { value: 'PENDING', label: 'PENDING' },
  { value: 'TP1', label: 'TP1 HIT' },
  { value: 'TP2', label: 'TP2 HIT' },
  { value: 'SL', label: 'SL HIT' },
  { value: 'WIN', label: 'TAKE PROFIT (WIN)' },
  { value: 'LOSS', label: 'STOP LOSS (LOSS)' },
  { value: 'TP1 + SL (BE)', label: 'PARTIAL TP1 (BE)' }
];

const MODAL_TF_OPTIONS = [
  { value: 'M5/H1', label: 'M5/H1 (5M - 1H Alignment)' },
  { value: 'M15/H4', label: 'M15/H4 (15M - 4H Alignment)' },
  { value: 'M30/H6', label: 'M30/H6 (30M - 6H Alignment)' },
  { value: 'H1/D1', label: 'H1/D1 (1H - 1D Alignment)' }
];

export default function SignalsManager() {
  const [signals, setSignals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [assetClass, setAssetClass] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [stateFilter, setStateFilter] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSignal, setEditingSignal] = useState<any | null>(null);
  const [formData, setFormData] = useState({
    symbol: '',
    side: 'BUY',
    status: 'ACTIVE',
    entry_price: '',
    sl: '',
    tp: '',
    tp_secondary: '',
    tf_alignment: 'M5/H1',
    category: 'CRYPTO',
    strategy: 'KIMOO CRT PRO',
    confluences: 'Institutional Bias Confirmed',
    is_active: true
  });

  const fetchSignals = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase.from('signals').select('*', { count: 'exact' });

      if (searchTerm) {
        query = query.ilike('symbol', `%${searchTerm}%`);
      }
      if (assetClass !== 'ALL') {
        query = query.eq('category', assetClass);
      }
      if (statusFilter !== 'ALL') {
        query = query.eq('status', statusFilter);
      }
      if (stateFilter !== 'ALL') {
        query = query.eq('is_active', stateFilter === 'LIVE');
      }

      query = query.order('created_at', { ascending: false });

      const from = (currentPage - 1) * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;
      query = query.range(from, to);

      const { data, count, error } = await query;
      if (error) throw error;
      if (data) {
        setSignals(data);
        setTotalCount(count || 0);
      }
    } catch (error: any) {
      console.error("Error fetching signals:", error);
      alert(`Fetch Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }, [searchTerm, assetClass, statusFilter, stateFilter, currentPage]);

  useEffect(() => {
    fetchSignals();
  }, [fetchSignals]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, assetClass, statusFilter, stateFilter]);

  const openCreateModal = () => {
    setEditingSignal(null);
    setFormData({
      symbol: '',
      side: 'BUY',
      status: 'ACTIVE',
      entry_price: '',
      sl: '',
      tp: '',
      tp_secondary: '',
      tf_alignment: 'M5/H1',
      category: 'CRYPTO',
      strategy: 'KIMOO CRT PRO',
      confluences: 'Institutional Bias Confirmed',
      is_active: true
    });
    setIsModalOpen(true);
  };

  const openEditModal = (signal: any) => {
    setEditingSignal(signal);
    setFormData({
      symbol: signal.symbol || '',
      side: signal.side || 'BUY',
      status: signal.status || 'ACTIVE',
      entry_price: signal.entry_price ? String(signal.entry_price) : '',
      sl: signal.sl ? String(signal.sl) : '',
      tp: signal.tp ? String(signal.tp) : '',
      tp_secondary: signal.tp_secondary ? String(signal.tp_secondary) : '',
      tf_alignment: signal.tf_alignment || 'M5/H1',
      category: signal.category || 'CRYPTO',
      strategy: signal.strategy || 'KIMOO CRT PRO',
      confluences: signal.confluences || 'Institutional Bias Confirmed',
      is_active: signal.is_active ?? true
    });
    setIsModalOpen(true);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: checked }));
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.symbol) {
      alert("Symbol is required.");
      return;
    }

    setSaving("modal");
    try {
      const dbPayload = {
        symbol: formData.symbol.toUpperCase().trim(),
        side: formData.side,
        status: formData.status,
        entry_price: formData.entry_price ? Number(formData.entry_price) : null,
        sl: formData.sl ? Number(formData.sl) : null,
        tp: formData.tp ? Number(formData.tp) : null,
        tp_secondary: formData.tp_secondary ? Number(formData.tp_secondary) : null,
        tf_alignment: formData.tf_alignment,
        category: formData.category,
        strategy: formData.strategy,
        confluences: formData.confluences,
        is_active: formData.is_active
      };

      if (editingSignal) {
        const { error } = await supabase
          .from('signals')
          .update(dbPayload)
          .eq('id', editingSignal.id);

        if (error) throw error;
        alert("Signal updated successfully!");
      } else {
        const { error } = await supabase
          .from('signals')
          .insert([dbPayload]);

        if (error) throw error;
        alert("Signal created successfully!");
      }

      setIsModalOpen(false);
      fetchSignals();
    } catch (error: any) {
      console.error("Save Signal Error:", error);
      alert(`Save Error: ${error.message}`);
    } finally {
      setSaving(null);
    }
  };

  const handleDeleteSignal = async (id: string, symbol: string) => {
    if (!confirm(`Are you sure you want to delete the setup for ${symbol}? This action cannot be undone.`)) {
      return;
    }
    setSaving(id);
    try {
      const { error } = await supabase
        .from('signals')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setSignals(prev => prev.filter(s => s.id !== id));
      alert("Signal deleted successfully.");
    } catch (error: any) {
      console.error("Delete Signal Error:", error);
      alert(`Delete Error: ${error.message}`);
    } finally {
      setSaving(null);
    }
  };

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  return (
    <div className="w-full relative z-10 flex flex-col space-y-6 md:space-y-8">
      
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-end gap-6 mb-4">
        <div>
          <h1 className="text-2xl md:text-4xl font-extrabold tracking-tight uppercase text-zinc-900 dark:text-white">
            Signal <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-orange-600">Manager</span>
          </h1>
          <p className="text-[10px] uppercase tracking-[0.3em] font-bold mt-2 text-zinc-500 dark:text-zinc-400">
            • COMPLETE TRADING TERMINAL CONFIGURATION CONTROLS •
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 w-full xl:w-auto items-stretch sm:items-end">
          <button
            onClick={openCreateModal}
            className="px-8 py-3.5 bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400 text-white rounded-xl text-[11px] font-black uppercase tracking-[0.2em] transition-all duration-300 shadow-[0_0_30px_rgba(249,115,22,0.2)] hover:shadow-[0_0_40px_rgba(249,115,22,0.4)] active:scale-95 flex items-center justify-center gap-2 border border-orange-500/30 cursor-pointer font-bold"
          >
            <Plus size={16} /> Create Signal Setup
          </button>
          
          <button 
            onClick={fetchSignals} 
            className="p-3 bg-white/[0.02] border border-[var(--glass-border)] rounded-xl hover:bg-white/[0.08] hover:border-white/20 hover:text-orange-500 transition-all text-zinc-500 flex items-center justify-center cursor-pointer"
          >
            <RefreshCcw size={18} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 glass-panel p-5 items-end">
        <div className="flex flex-col gap-1.5 w-full">
          <label className="text-[10px] font-bold text-zinc-500 uppercase ml-1 tracking-wider select-none">Filter Symbol</label>
          <div className="relative h-[42px]">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={14} />
            <input
              type="text"
              placeholder="Search symbol..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-full pl-11 pr-4 input-modern outline-none transition-all"
            />
          </div>
        </div>

        <CustomSelect
          label="Asset Class"
          value={assetClass}
          onChange={(val) => setAssetClass(val)}
          options={ASSET_CLASS_OPTIONS}
        />

        <CustomSelect
          label="Outcome Status"
          value={statusFilter}
          onChange={(val) => setStatusFilter(val)}
          options={STATUS_OPTIONS}
        />

        <CustomSelect
          label="Activity State"
          value={stateFilter}
          onChange={(val) => setStateFilter(val)}
          options={STATE_OPTIONS}
        />
      </div>

      <div className="glass-panel overflow-hidden flex-grow shadow-2xl relative">
        
        {loading && (
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm z-30 flex items-center justify-center">
            <Loader2 size={40} className="animate-spin text-orange-500" />
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1100px]">
            <thead>
              <tr className="text-[10px] font-black text-zinc-500 uppercase tracking-widest bg-[var(--glass-bg)] border-b border-[var(--glass-border)]">
                <th className="px-6 md:px-8 py-6">Asset / Strategy</th>
                <th className="py-6">Side</th>
                <th className="py-6">Status</th>
                <th className="py-6">Execution Prices</th>
                <th className="py-6">Alignment</th>
                <th className="py-6">State</th>
                <th className="px-6 md:px-8 py-6 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.05]">
              {signals.length > 0 ? (
                signals.map((signal) => {
                  const isBuy = signal.side?.toUpperCase() === 'BUY' || signal.side?.toUpperCase() === 'BULLISH';
                  return (
                    <tr key={signal.id} className="hover:bg-[var(--glass-bg)] transition-colors group">
                      <td className="px-6 md:px-8 py-6">
                        <div className="flex flex-col">
                          <span className="text-base font-black text-zinc-900 dark:text-white uppercase tracking-tighter italic drop-shadow-sm">
                            {signal.symbol}
                          </span>
                          <span className="text-[9px] font-bold text-zinc-550 dark:text-zinc-500 uppercase tracking-widest mt-0.5">
                            {signal.category || 'CRYPTO'} • {signal.strategy || 'KIMOO CRT PRO'}
                          </span>
                        </div>
                      </td>
                      <td className="py-6">
                        <span className={`text-[10px] font-black px-2.5 py-1 rounded-lg border tracking-widest ${
                          isBuy 
                            ? 'text-emerald-400 border-emerald-500/20 bg-emerald-500/10' 
                            : 'text-red-400 border-red-500/20 bg-red-500/10'
                        }`}>
                          {signal.side}
                        </span>
                      </td>
                      <td className="py-6">
                        <span className={`text-[10px] font-black tracking-widest uppercase ${
                          ['TP2', 'WIN'].includes(signal.status?.toUpperCase()) ? 'text-emerald-400' :
                          ['SL', 'LOSS'].includes(signal.status?.toUpperCase()) ? 'text-red-400' :
                          ['TP1', 'TP1 + SL (BE)'].includes(signal.status?.toUpperCase()) ? 'text-yellow-400' :
                          'text-blue-400'
                        }`}>
                          {signal.status || 'ACTIVE'}
                        </span>
                      </td>
                      <td className="py-6 font-mono text-[11px]">
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                          <div><span className="text-[8px] text-zinc-555 dark:text-zinc-500 mr-1">ENT:</span> <span className="font-bold">{Number(signal.entry_price || 0).toFixed(5)}</span></div>
                          <div><span className="text-[8px] text-zinc-555 dark:text-zinc-500 mr-1">SL:</span> <span className="font-bold text-red-400">{Number(signal.sl || 0).toFixed(5)}</span></div>
                          <div><span className="text-[8px] text-zinc-555 dark:text-zinc-500 mr-1">TP1:</span> <span className="font-bold text-emerald-400">{Number(signal.tp || 0).toFixed(5)}</span></div>
                          <div><span className="text-[8px] text-zinc-555 dark:text-zinc-500 mr-1">TP2:</span> <span className="font-bold text-yellow-500">{signal.tp_secondary ? Number(signal.tp_secondary).toFixed(5) : '---'}</span></div>
                        </div>
                      </td>
                      <td className="py-6 text-xs font-mono font-bold text-zinc-500">
                        {signal.tf_alignment || 'M5/H1'}
                      </td>
                      <td className="py-6">
                        <span className={`text-[9px] font-black px-2.5 py-1 rounded-full border uppercase tracking-wider ${
                          signal.is_active 
                            ? 'bg-blue-500/10 border-blue-500/20 text-blue-400 shadow-[0_0_10px_rgba(59,130,246,0.1)]' 
                            : 'bg-zinc-500/10 border-white/5 text-zinc-500'
                        }`}>
                          {signal.is_active ? 'LIVE ACTIVE' : 'ARCHIVED'}
                        </span>
                      </td>
                      <td className="px-6 md:px-8 py-6 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => openEditModal(signal)}
                            className="p-2 rounded-xl bg-white/5 hover:bg-blue-500/20 hover:text-blue-400 border border-transparent hover:border-blue-500/30 transition-all text-zinc-555 dark:text-zinc-500"
                            title="Edit Signal Setup"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            onClick={() => handleDeleteSignal(signal.id, signal.symbol)}
                            disabled={saving === signal.id}
                            className="p-2 rounded-xl bg-white/5 hover:bg-red-500/20 hover:text-red-400 border border-transparent hover:border-red-500/30 transition-all text-zinc-555 dark:text-zinc-500 disabled:opacity-30 disabled:cursor-not-allowed"
                            title="Delete Setup"
                          >
                            {saving === signal.id ? (
                              <Loader2 size={14} className="animate-spin text-red-200" />
                            ) : (
                              <Trash2 size={14} />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="py-32 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <AlertCircle size={40} className="text-zinc-555 dark:text-zinc-500 mb-4" />
                      <h3 className="text-xl font-black italic tracking-tighter uppercase text-zinc-900 dark:text-white mb-2">No Setup Configured</h3>
                      <p className="text-xs font-bold text-zinc-555 dark:text-zinc-500 uppercase tracking-widest">Adjust filters or create a new signal setup.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {totalPages > 1 && (
        <div className="mt-8 mb-4 flex justify-center items-center gap-4">
          <button 
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} 
            disabled={currentPage === 1 || loading} 
            className="p-3 rounded-xl bg-[var(--glass-bg)] border border-[var(--glass-border)] text-zinc-500 hover:bg-white/[0.05] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            <Clock size={16} className="rotate-180" />
          </button>
          <span className="text-[10px] font-black uppercase text-zinc-555 dark:text-zinc-500 tracking-widest">
            Page {currentPage} of {totalPages}
          </span>
          <button 
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} 
            disabled={currentPage === totalPages || loading} 
            className="p-3 rounded-xl bg-[var(--glass-bg)] border border-[var(--glass-border)] text-zinc-555 dark:text-zinc-500 hover:bg-white/[0.05] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            <Clock size={16} />
          </button>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 backdrop-blur-xl bg-black/60 overflow-y-auto">
          <div 
            className="glass-panel w-full max-w-2xl overflow-hidden shadow-[0_0_100px_rgba(0,0,0,0.8)] relative flex flex-col max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="absolute top-0 left-0 w-full h-full bg-orange-500/5 blur-[100px] pointer-events-none" />

            <div className="p-8 border-b border-[var(--glass-border)] flex justify-between items-center relative z-10 shrink-0">
              <div>
                <h2 className="text-2xl font-black italic tracking-tighter uppercase text-white drop-shadow-md">
                  {editingSignal ? 'Edit Setup' : 'Create Setup'}
                </h2>
                <p className="text-[9px] text-orange-500 font-bold tracking-[0.2em] mt-1 uppercase">
                  {editingSignal ? `CONFIGURING: ${editingSignal.symbol}` : 'SYSTEM SIGNAL SETUP BOARD'}
                </p>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)} 
                className="p-2 bg-white/5 hover:bg-white/10 rounded-xl transition-all cursor-pointer"
              >
                <X size={18} className="text-zinc-400" />
              </button>
            </div>

            <div className="p-8 overflow-y-auto relative z-10 custom-scrollbar flex-1">
              <form onSubmit={handleFormSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <label className="text-[9px] md:text-[10px] font-black text-zinc-500 uppercase ml-1 tracking-widest block flex items-center gap-1">
                      <Activity size={10} className="text-orange-500" /> Trading Symbol
                    </label>
                    <input
                      type="text"
                      name="symbol"
                      value={formData.symbol}
                      onChange={handleInputChange}
                      placeholder="e.g. BTCUSDT"
                      className="w-full bg-white/[0.02] border border-white/[0.08] rounded-xl px-4 py-3.5 text-xs font-mono font-bold text-white outline-none focus:border-blue-500/50 hover:border-white/10 transition-all uppercase"
                      required
                    />
                  </div>

                  <CustomSelect
                    label="Asset Category"
                    value={formData.category}
                    onChange={(val) => setFormData(prev => ({ ...prev, category: val }))}
                    options={MODAL_CATEGORY_OPTIONS}
                  />

                  <CustomSelect
                    label="Action Side"
                    value={formData.side}
                    onChange={(val) => setFormData(prev => ({ ...prev, side: val }))}
                    options={MODAL_SIDE_OPTIONS}
                  />

                  <CustomSelect
                    label="Outcome Status"
                    value={formData.status}
                    onChange={(val) => setFormData(prev => ({ ...prev, status: val }))}
                    options={MODAL_STATUS_OPTIONS}
                  />

                  <div className="space-y-2">
                    <label className="text-[9px] md:text-[10px] font-black text-zinc-650 dark:text-zinc-500 uppercase ml-1 tracking-widest block flex items-center gap-1">
                      <Zap size={10} className="text-blue-400" /> Entry Region Price
                    </label>
                    <input
                      type="number"
                      step="any"
                      name="entry_price"
                      value={formData.entry_price}
                      onChange={handleInputChange}
                      placeholder="0.00000"
                      className="w-full bg-white/[0.02] border border-white/[0.08] rounded-xl px-4 py-3.5 text-xs font-mono font-bold text-white outline-none focus:border-blue-500/50 hover:border-white/10 transition-all"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[9px] md:text-[10px] font-black text-zinc-650 dark:text-zinc-500 uppercase ml-1 tracking-widest block flex items-center gap-1">
                      <Shield size={10} className="text-red-400" /> Invalidation Price (SL)
                    </label>
                    <input
                      type="number"
                      step="any"
                      name="sl"
                      value={formData.sl}
                      onChange={handleInputChange}
                      placeholder="0.00000"
                      className="w-full bg-white/[0.02] border border-white/[0.08] rounded-xl px-4 py-3.5 text-xs font-mono font-bold text-white outline-none focus:border-blue-500/50 hover:border-white/10 transition-all"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[9px] md:text-[10px] font-black text-zinc-650 dark:text-zinc-500 uppercase ml-1 tracking-widest block flex items-center gap-1">
                      <Target size={10} className="text-emerald-400" /> Target 1 Price (TP-1)
                    </label>
                    <input
                      type="number"
                      step="any"
                      name="tp"
                      value={formData.tp}
                      onChange={handleInputChange}
                      placeholder="0.00000"
                      className="w-full bg-white/[0.02] border border-white/[0.08] rounded-xl px-4 py-3.5 text-xs font-mono font-bold text-white outline-none focus:border-blue-500/50 hover:border-white/10 transition-all"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[9px] md:text-[10px] font-black text-zinc-650 dark:text-zinc-500 uppercase ml-1 tracking-widest block flex items-center gap-1">
                      <Zap size={10} className="text-yellow-500" /> Target 2 Price (TP-2)
                    </label>
                    <input
                      type="number"
                      step="any"
                      name="tp_secondary"
                      value={formData.tp_secondary}
                      onChange={handleInputChange}
                      placeholder="Optional secondary target"
                      className="w-full bg-white/[0.02] border border-white/[0.08] rounded-xl px-4 py-3.5 text-xs font-mono font-bold text-white outline-none focus:border-blue-500/50 hover:border-white/10 transition-all"
                    />
                  </div>

                  <CustomSelect
                    label="Timeframe Alignment"
                    value={formData.tf_alignment}
                    onChange={(val) => setFormData(prev => ({ ...prev, tf_alignment: val }))}
                    options={MODAL_TF_OPTIONS}
                  />

                  <div className="space-y-2">
                    <label className="text-[9px] md:text-[10px] font-black text-zinc-650 dark:text-zinc-500 uppercase ml-1 tracking-widest block flex items-center gap-1">
                      <Activity size={10} className="text-amber-400" /> System Strategy
                    </label>
                    <input
                      type="text"
                      name="strategy"
                      value={formData.strategy}
                      onChange={handleInputChange}
                      placeholder="e.g. KIMOO CRT PRO"
                      className="w-full bg-white/[0.02] border border-white/[0.08] rounded-xl px-4 py-3.5 text-xs font-mono font-bold text-white outline-none focus:border-blue-500/50 hover:border-white/10 transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[9px] md:text-[10px] font-black text-zinc-650 dark:text-zinc-500 uppercase ml-1 tracking-widest">Trade Confluences / Notes</label>
                  <textarea
                    name="confluences"
                    value={formData.confluences}
                    onChange={handleInputChange}
                    placeholder="e.g. Institutional Bias Confirmed, Orderblock mitigation..."
                    className="w-full bg-white/[0.02] border border-white/[0.08] rounded-xl px-4 py-3.5 text-xs font-mono font-bold text-white outline-none focus:border-blue-500/50 hover:border-white/10 transition-all h-20 resize-none"
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-white/[0.02] border border-white/[0.05] rounded-xl">
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold text-white uppercase tracking-tight block">Live Setup State</span>
                    <span className="text-[9px] text-zinc-500 uppercase font-black tracking-widest block">
                      If active, appears in live dashboard trackers. If inactive, sends to history and performance.
                    </span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      name="is_active"
                      checked={formData.is_active}
                      onChange={handleCheckboxChange}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-white/10 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-zinc-900 after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500 peer-checked:after:bg-white" />
                  </label>
                </div>

                <div className="flex items-center gap-4 pt-4 border-t border-[var(--glass-border)] shrink-0">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 px-8 py-3.5 bg-white/5 hover:bg-white/10 text-white rounded-xl text-[10px] font-black uppercase tracking-[0.2em] border border-white/5 transition-all text-center cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving === "modal"}
                    className="flex-1 px-8 py-3.5 bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400 text-white rounded-xl text-[10px] font-black uppercase tracking-[0.2em] shadow-[0_0_30px_rgba(249,115,22,0.2)] active:scale-95 border border-orange-500/30 transition-all flex items-center justify-center gap-2 cursor-pointer font-bold"
                  >
                    {saving === "modal" ? (
                      <Loader2 size={14} className="animate-spin text-orange-200" />
                    ) : (
                      <Save size={14} />
                    )}
                    Save Signal Setup
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
