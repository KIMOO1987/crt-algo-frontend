'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Bookmark,
  Plus,
  Trash2,
  Check,
  Download,
  Upload,
  Star,
  Layers,
  Eraser,
  CheckCircle2,
  SlidersHorizontal,
} from 'lucide-react';
import type { VelaWorkspace } from '@luxalgo/vela/workspace';

export interface ChartTemplate {
  id: string;
  name: string;
  createdAt: number;
  symbol?: string;
  timeframe?: string;
  layout?: string | false;
  isDefault?: boolean;
  workspaceState?: any;
  drawings?: any;
  drawingsCount: number;
}

const STORAGE_KEY = 'crt_algo_chart_templates';

interface TemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspace: VelaWorkspace | null;
  currentSymbol: string;
  currentTimeframe?: string;
  currentLayout?: string | false;
  onApplyTemplate?: (template: ChartTemplate) => void;
}

export default function TemplateModal({
  isOpen,
  onClose,
  workspace,
  currentSymbol,
  currentTimeframe = '15',
  currentLayout = false,
  onApplyTemplate,
}: TemplateModalProps) {
  const [activeTab, setActiveTab] = useState<'saved' | 'save' | 'manage'>('saved');
  const [templates, setTemplates] = useState<ChartTemplate[]>([]);
  const [templateName, setTemplateName] = useState('');
  const [includeDrawings, setIncludeDrawings] = useState(true);
  const [includeLayout, setIncludeLayout] = useState(true);
  const [setAsDefault, setSetAsDefault] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);
  const [drawingsOnChart, setDrawingsOnChart] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Normalize symbol for storage key
  const cleanSymbol = (currentSymbol.includes(':') ? currentSymbol.split(':').pop()! : currentSymbol).toLowerCase();

  // Load saved templates from localStorage
  const loadTemplates = (): ChartTemplate[] => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setTemplates(parsed);
          return parsed;
        }
      }
    } catch (e) {
      console.warn('[TemplateModal] Error loading templates from localStorage:', e);
    }
    setTemplates([]);
    return [];
  };

  useEffect(() => {
    if (isOpen) {
      const loaded = loadTemplates();
      // Count current drawings on chart
      try {
        const count = workspace?.chart?.drawings?.all()?.length || 0;
        setDrawingsOnChart(count);
      } catch (e) {
        setDrawingsOnChart(0);
      }

      // If no saved templates, default to save tab
      if (loaded.length === 0) {
        setActiveTab('save');
      }
    }
  }, [isOpen, workspace]);

  const showToast = (msg: string) => {
    setNotification(msg);
    setTimeout(() => {
      setNotification(null);
    }, 3000);
  };

  // Save Current Setup as New Template
  const handleSaveTemplate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!templateName.trim()) {
      showToast('⚠️ Please enter a template name.');
      return;
    }

    try {
      let drawingsDoc: any = null;
      let dCount = 0;
      if (includeDrawings && workspace?.chart?.drawings) {
        drawingsDoc = workspace.chart.drawings.toJSON();
        dCount = workspace.chart.drawings.all()?.length || 0;
      }

      let wsState: any = null;
      if (includeLayout && workspace) {
        try {
          wsState = workspace.getState();
        } catch (e) {
          console.warn('[TemplateModal] Could not read workspace state:', e);
        }
      }

      const newTemplate: ChartTemplate = {
        id: `tpl_${Date.now()}`,
        name: templateName.trim(),
        createdAt: Date.now(),
        symbol: currentSymbol,
        timeframe: currentTimeframe,
        layout: currentLayout,
        isDefault: setAsDefault,
        workspaceState: wsState,
        drawings: drawingsDoc,
        drawingsCount: dCount,
      };

      const existing = loadTemplates();
      let updated: ChartTemplate[];

      if (setAsDefault) {
        // Clear isDefault from other templates
        updated = [
          newTemplate,
          ...existing.map((t) => ({ ...t, isDefault: false })),
        ];
      } else {
        updated = [newTemplate, ...existing];
      }

      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      setTemplates(updated);
      setTemplateName('');
      setActiveTab('saved');
      showToast(`✓ Template "${newTemplate.name}" saved!`);
    } catch (err) {
      console.error('[TemplateModal] Failed to save template:', err);
      showToast('❌ Failed to save template.');
    }
  };

  // Apply Saved Template to Chart
  const handleApplyTemplate = (tpl: ChartTemplate) => {
    if (!workspace) {
      showToast('⚠️ Chart not fully ready.');
      return;
    }

    try {
      // 1. Restore drawings if present
      if (tpl.drawings && workspace.chart?.drawings) {
        workspace.chart.drawings.fromJSON(tpl.drawings);
        // Persist to per-symbol cache so it survives reload
        localStorage.setItem(`crt_drawings_${cleanSymbol}`, JSON.stringify(tpl.drawings));
      }

      // 2. Restore workspace layout / indicators if present
      if (tpl.workspaceState) {
        try {
          const stateToApply = JSON.parse(JSON.stringify(tpl.workspaceState));
          // Preserve current symbol when applying onto the active chart
          if (stateToApply.charts && stateToApply.charts[0]) {
            stateToApply.charts[0].symbol = currentSymbol;
          }
          workspace.applyState(stateToApply);
        } catch (e) {
          console.warn('[TemplateModal] Error applying workspaceState:', e);
        }
      }

      if (onApplyTemplate) {
        onApplyTemplate(tpl);
      }

      showToast(`✓ Applied template "${tpl.name}"!`);
      setTimeout(() => {
        onClose();
      }, 600);
    } catch (err) {
      console.error('[TemplateModal] Error applying template:', err);
      showToast('❌ Failed to apply template.');
    }
  };

  // Delete Template
  const handleDeleteTemplate = (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete template "${name}"?`)) {
      const updated = templates.filter((t) => t.id !== id);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      setTemplates(updated);
      showToast(`Deleted template "${name}".`);
    }
  };

  // Toggle Default
  const handleToggleDefault = (id: string) => {
    const updated = templates.map((t) => ({
      ...t,
      isDefault: t.id === id ? !t.isDefault : false,
    }));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    setTemplates(updated);
    showToast('Default template updated.');
  };

  // Clear All Drawings from Current Chart
  const handleClearChartDrawings = () => {
    if (!workspace?.chart?.drawings) return;
    if (confirm(`Are you sure you want to clear all drawings on ${currentSymbol}?`)) {
      try {
        workspace.chart.drawings.fromJSON({ version: 1, drawings: [] });
        localStorage.removeItem(`crt_drawings_${cleanSymbol}`);
        setDrawingsOnChart(0);
        showToast('✓ Cleared all drawings from chart.');
      } catch (err) {
        console.error('[TemplateModal] Error clearing drawings:', err);
        showToast('❌ Could not clear drawings.');
      }
    }
  };

  // Export Templates to JSON File
  const handleExportTemplates = () => {
    if (templates.length === 0) {
      showToast('⚠️ No templates to export.');
      return;
    }
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(templates, null, 2));
    const downloadAnchor = document.createElement('a');
    const dateStr = new Date().toISOString().slice(0, 10);
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `crt-algo-templates-${dateStr}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showToast('✓ Templates exported successfully!');
  };

  // Import Templates from JSON File
  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const imported = JSON.parse(content);
        if (Array.isArray(imported)) {
          const existing = loadTemplates();
          const existingIds = new Set(existing.map((t) => t.id));
          const newEntries = imported.filter((t: any) => t && t.name && !existingIds.has(t.id));
          const merged = [...newEntries, ...existing];
          localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
          setTemplates(merged);
          showToast(`✓ Imported ${newEntries.length} new templates!`);
          setActiveTab('saved');
        } else {
          showToast('❌ Invalid template file format.');
        }
      } catch (err) {
        console.error('[TemplateModal] Import error:', err);
        showToast('❌ Failed to parse template file.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="w-full max-w-lg bg-zinc-900 border border-orange-500/30 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] text-white animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800 bg-zinc-950/40">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-400">
              <Bookmark size={18} />
            </div>
            <div>
              <h3 className="text-sm md:text-base font-black tracking-tight flex items-center gap-2">
                CHART TEMPLATES & DRAWINGS
              </h3>
              <p className="text-[11px] text-zinc-400 font-medium">
                Save, load, and preserve your drawing setups across reloads
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Notification Banner */}
        {notification && (
          <div className="px-5 py-2 bg-orange-500/15 border-b border-orange-500/30 text-xs font-semibold text-orange-300 flex items-center gap-2">
            <CheckCircle2 size={14} className="text-orange-400" />
            <span>{notification}</span>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="flex items-center border-b border-zinc-800 px-5 pt-2 gap-2 bg-zinc-950/20">
          <button
            onClick={() => setActiveTab('saved')}
            className={`px-3 py-2 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'saved'
                ? 'border-orange-500 text-orange-400'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Layers size={14} />
            <span>Saved Templates ({templates.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('save')}
            className={`px-3 py-2 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'save'
                ? 'border-orange-500 text-orange-400'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Plus size={14} />
            <span>Save New Template</span>
          </button>

          <button
            onClick={() => setActiveTab('manage')}
            className={`px-3 py-2 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'manage'
                ? 'border-orange-500 text-orange-400'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <SlidersHorizontal size={14} />
            <span>Tools & Backup</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* TAB 1: SAVED TEMPLATES */}
          {activeTab === 'saved' && (
            <div className="space-y-3">
              {templates.length === 0 ? (
                <div className="py-10 text-center space-y-3">
                  <div className="w-12 h-12 mx-auto rounded-2xl bg-zinc-800/80 border border-zinc-700 flex items-center justify-center text-zinc-500">
                    <Bookmark size={22} />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-sm font-bold text-zinc-300">No Saved Templates Yet</h4>
                    <p className="text-xs text-zinc-500 max-w-xs mx-auto">
                      Draw your trendlines, S&R zones, and indicators, then save them as a reusable template.
                    </p>
                  </div>
                  <button
                    onClick={() => setActiveTab('save')}
                    className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition-all cursor-pointer shadow-lg shadow-orange-500/20"
                  >
                    <Plus size={14} />
                    Save Current Setup
                  </button>
                </div>
              ) : (
                templates.map((tpl) => (
                  <div
                    key={tpl.id}
                    className="p-3.5 bg-zinc-800/50 hover:bg-zinc-800/80 border border-zinc-700/60 rounded-xl flex items-center justify-between gap-3 transition-all group"
                  >
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-zinc-100 truncate">{tpl.name}</span>
                        {tpl.isDefault && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-orange-500/20 border border-orange-500/40 text-orange-400 flex items-center gap-1">
                            <Star size={10} fill="currentColor" /> Default
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-zinc-400 font-mono">
                        <span>{new Date(tpl.createdAt).toLocaleDateString()}</span>
                        <span>•</span>
                        <span className="text-orange-400/90 font-semibold">{tpl.drawingsCount} Drawings</span>
                        {tpl.timeframe && (
                          <>
                            <span>•</span>
                            <span>TF: {tpl.timeframe}m</span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {/* Set Default */}
                      <button
                        onClick={() => handleToggleDefault(tpl.id)}
                        title={tpl.isDefault ? 'Remove Default' : 'Set as Default Template'}
                        className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                          tpl.isDefault
                            ? 'bg-orange-500/20 border-orange-500/40 text-orange-400'
                            : 'border-transparent text-zinc-500 hover:text-zinc-300 hover:bg-zinc-700'
                        }`}
                      >
                        <Star size={14} fill={tpl.isDefault ? 'currentColor' : 'none'} />
                      </button>

                      {/* Delete */}
                      <button
                        onClick={() => handleDeleteTemplate(tpl.id, tpl.name)}
                        title="Delete Template"
                        className="p-1.5 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-all cursor-pointer"
                      >
                        <Trash2 size={14} />
                      </button>

                      {/* Apply Button */}
                      <button
                        onClick={() => handleApplyTemplate(tpl)}
                        className="px-3 py-1.5 bg-orange-500 hover:bg-orange-600 active:scale-95 text-white font-extrabold text-xs rounded-lg transition-all cursor-pointer flex items-center gap-1 shadow-md shadow-orange-500/20"
                      >
                        <Check size={14} />
                        Apply
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB 2: SAVE NEW TEMPLATE */}
          {activeTab === 'save' && (
            <form onSubmit={handleSaveTemplate} className="space-y-4">
              <div className="p-3.5 bg-zinc-950/40 border border-zinc-800 rounded-xl space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-400">Current Symbol:</span>
                  <span className="font-mono font-bold text-orange-400 uppercase">{currentSymbol}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-400">Drawings on Chart:</span>
                  <span className="font-mono font-bold text-zinc-200">{drawingsOnChart} item(s)</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-400">Timeframe:</span>
                  <span className="font-mono font-bold text-zinc-200">{currentTimeframe}m</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-300 block">Template Name</label>
                <input
                  type="text"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  placeholder="e.g. Support and Resistance, Daily Breakout, SMC Setup"
                  className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-700 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 rounded-xl text-sm text-white placeholder-zinc-500 outline-none transition-all"
                  autoFocus
                />
              </div>

              <div className="space-y-2 pt-1">
                <label className="flex items-center gap-2.5 text-xs text-zinc-300 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={includeDrawings}
                    onChange={(e) => setIncludeDrawings(e.target.checked)}
                    className="rounded border-zinc-700 text-orange-500 focus:ring-orange-500 w-4 h-4 cursor-pointer"
                  />
                  <span>Include all lines, zones, and drawings ({drawingsOnChart})</span>
                </label>

                <label className="flex items-center gap-2.5 text-xs text-zinc-300 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={includeLayout}
                    onChange={(e) => setIncludeLayout(e.target.checked)}
                    className="rounded border-zinc-700 text-orange-500 focus:ring-orange-500 w-4 h-4 cursor-pointer"
                  />
                  <span>Include chart layout and indicator state</span>
                </label>

                <label className="flex items-center gap-2.5 text-xs text-zinc-300 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={setAsDefault}
                    onChange={(e) => setSetAsDefault(e.target.checked)}
                    className="rounded border-zinc-700 text-orange-500 focus:ring-orange-500 w-4 h-4 cursor-pointer"
                  />
                  <span>Set as Default Template (loads automatically)</span>
                </label>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 active:scale-98 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-lg shadow-orange-500/25 flex items-center justify-center gap-2"
              >
                <Bookmark size={15} />
                Save Template
              </button>
            </form>
          )}

          {/* TAB 3: TOOLS & BACKUP */}
          {activeTab === 'manage' && (
            <div className="space-y-4">
              {/* Clear Drawings Tool */}
              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <h5 className="text-xs font-bold text-red-300 flex items-center gap-1.5">
                      <Eraser size={14} /> Clear Current Chart Drawings
                    </h5>
                    <p className="text-[11px] text-zinc-400">
                      Remove all trendlines, shapes, and tools from {currentSymbol}.
                    </p>
                  </div>
                  <button
                    onClick={handleClearChartDrawings}
                    className="px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white rounded-lg text-xs font-bold transition-all cursor-pointer flex-shrink-0"
                  >
                    Clear All
                  </button>
                </div>
              </div>

              {/* Export / Import Section */}
              <div className="p-4 bg-zinc-950/40 border border-zinc-800 rounded-xl space-y-3">
                <h5 className="text-xs font-bold text-zinc-200 flex items-center gap-1.5">
                  <Download size={14} className="text-orange-400" /> Backup and Sync Templates
                </h5>
                <p className="text-[11px] text-zinc-400">
                  Export your saved templates to a JSON file or import templates from another device.
                </p>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={handleExportTemplates}
                    disabled={templates.length === 0}
                    className="flex-1 py-2 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 text-zinc-200 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 border border-zinc-700"
                  >
                    <Download size={14} />
                    Export to JSON ({templates.length})
                  </button>

                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex-1 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 border border-zinc-700"
                  >
                    <Upload size={14} />
                    Import JSON
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json"
                    onChange={handleImportFile}
                    className="hidden"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="px-5 py-3 border-t border-zinc-800 bg-zinc-950/50 flex items-center justify-between text-[11px] text-zinc-500">
          <span>Drawings auto-save to browser storage</span>
          <span className="font-mono">CRT-ALGO PRO</span>
        </div>
      </div>
    </div>
  );
}
