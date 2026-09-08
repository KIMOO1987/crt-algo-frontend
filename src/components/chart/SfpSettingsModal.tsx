'use client';

import React, { useState, useEffect } from 'react';
import { X, RotateCcw, Check, Sliders, Palette } from 'lucide-react';

export interface SfpSettings {
  // Module Selection
  showSFP: boolean;
  enableMTFEntry: boolean;

  // Swing Failure Pattern Settings
  len2: number;
  bullSFP: boolean;
  bearSFP: boolean;
  dSwingLine: boolean;
  dOpposLine: boolean;
  dSFP_Line: boolean;
  dSFP_Label: boolean;
  colBl: string;
  colBr: string;
  colBl2: string;
  colBr2: string;

  // Fib Levels Customization
  showSFPFib: boolean;
  showSFPFibHistory: boolean;
  colFib: string;
  styleFib: 'solid' | 'dashed' | 'dotted';
  widthFib: number;

  // MTF Dashboard Settings
  tablePosInput: 'top_right' | 'top_left' | 'bottom_right' | 'bottom_left';
  tableSizeInput: 'tiny' | 'small' | 'normal' | 'large';
  dashboardBg: string;
  dashboardText: string;
}

export const DEFAULT_SFP_SETTINGS: SfpSettings = {
  showSFP: true,
  enableMTFEntry: true,

  len2: 5,
  bullSFP: true,
  bearSFP: true,
  dSwingLine: true,
  dOpposLine: true,
  dSFP_Line: true,
  dSFP_Label: true,
  colBl: '#089981',
  colBr: '#f23645',
  colBl2: 'rgba(8, 153, 129, 0.5)',
  colBr2: 'rgba(242, 54, 69, 0.5)',

  showSFPFib: true,
  showSFPFibHistory: false,
  colFib: '#0c3299',
  styleFib: 'dotted',
  widthFib: 1,

  tablePosInput: 'top_right',
  tableSizeInput: 'small',
  dashboardBg: 'rgba(15, 15, 15, 0.85)',
  dashboardText: '#ffffff',
};

interface SfpSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: SfpSettings;
  onSave: (newSettings: SfpSettings) => void;
}

export default function SfpSettingsModal({
  isOpen,
  onClose,
  settings,
  onSave,
}: SfpSettingsModalProps) {
  const [activeTab, setActiveTab] = useState<'inputs' | 'style'>('inputs');
  const [localSettings, setLocalSettings] = useState<SfpSettings>(settings);

  useEffect(() => {
    setLocalSettings(settings);
  }, [settings, isOpen]);

  if (!isOpen) return null;

  const updateSetting = <K extends keyof SfpSettings>(key: K, value: SfpSettings[K]) => {
    setLocalSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleReset = () => {
    setLocalSettings(DEFAULT_SFP_SETTINGS);
  };

  const handleApply = () => {
    onSave(localSettings);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-xl bg-zinc-900 border border-zinc-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-900/90">
          <div>
            <h2 className="text-base font-extrabold text-white flex items-center gap-2">
              <Sliders size={18} className="text-orange-500" />
              <span>Swing Failure Pattern (SFP) Settings</span>
            </h2>
            <p className="text-xs text-zinc-400 font-mono">1:1 Pine Script v6 Configuration</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex border-b border-zinc-800 px-6 bg-zinc-950/40">
          <button
            onClick={() => setActiveTab('inputs')}
            className={`py-3 px-4 text-xs font-bold flex items-center gap-2 border-b-2 transition cursor-pointer ${
              activeTab === 'inputs'
                ? 'border-orange-500 text-orange-400'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Sliders size={14} />
            <span>Inputs</span>
          </button>
          <button
            onClick={() => setActiveTab('style')}
            className={`py-3 px-4 text-xs font-bold flex items-center gap-2 border-b-2 transition cursor-pointer ${
              activeTab === 'style'
                ? 'border-orange-500 text-orange-400'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Palette size={14} />
            <span>Style & Colors</span>
          </button>
        </div>

        {/* Body Form */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-sm text-zinc-200 custom-scrollbar">
          {activeTab === 'inputs' ? (
            <>
              {/* Group: Module Selection */}
              <div className="space-y-3 bg-zinc-800/40 p-4 rounded-xl border border-zinc-800">
                <h3 className="text-xs font-bold uppercase tracking-wider text-orange-400 font-mono">
                  Module Selection
                </h3>
                <div className="space-y-2">
                  <label className="flex items-center justify-between cursor-pointer">
                    <span className="text-zinc-300 font-medium">══ SWING FAILURE ══</span>
                    <input
                      type="checkbox"
                      checked={localSettings.showSFP}
                      onChange={(e) => updateSetting('showSFP', e.target.checked)}
                      className="w-4 h-4 accent-orange-500 rounded cursor-pointer"
                    />
                  </label>
                  <label className="flex items-center justify-between cursor-pointer">
                    <span className="text-zinc-300 font-medium">══ MTF ENTRY MODEL ══</span>
                    <input
                      type="checkbox"
                      checked={localSettings.enableMTFEntry}
                      onChange={(e) => updateSetting('enableMTFEntry', e.target.checked)}
                      className="w-4 h-4 accent-orange-500 rounded cursor-pointer"
                    />
                  </label>
                </div>
              </div>

              {/* Group: Swing Failure Pattern */}
              <div className="space-y-3 bg-zinc-800/40 p-4 rounded-xl border border-zinc-800">
                <h3 className="text-xs font-bold uppercase tracking-wider text-orange-400 font-mono">
                  Swing Failure Pattern
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-300 font-medium">Swings (Pivot Length)</span>
                    <input
                      type="number"
                      min={1}
                      max={50}
                      value={localSettings.len2}
                      onChange={(e) => updateSetting('len2', Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-20 px-2.5 py-1 text-center bg-zinc-900 border border-zinc-700 rounded-lg text-white font-mono text-xs focus:border-orange-500 outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-zinc-800/80">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={localSettings.bullSFP}
                        onChange={(e) => updateSetting('bullSFP', e.target.checked)}
                        className="w-4 h-4 accent-orange-500 rounded cursor-pointer"
                      />
                      <span className="text-zinc-300 text-xs">Bullish SFP</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={localSettings.bearSFP}
                        onChange={(e) => updateSetting('bearSFP', e.target.checked)}
                        className="w-4 h-4 accent-orange-500 rounded cursor-pointer"
                      />
                      <span className="text-zinc-300 text-xs">Bearish SFP</span>
                    </label>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-zinc-800/80">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={localSettings.dSwingLine}
                        onChange={(e) => updateSetting('dSwingLine', e.target.checked)}
                        className="w-4 h-4 accent-orange-500 rounded cursor-pointer"
                      />
                      <span className="text-zinc-300 text-xs">Swing Lines</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={localSettings.dOpposLine}
                        onChange={(e) => updateSetting('dOpposLine', e.target.checked)}
                        className="w-4 h-4 accent-orange-500 rounded cursor-pointer"
                      />
                      <span className="text-zinc-300 text-xs">Confirmation Lines</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={localSettings.dSFP_Line}
                        onChange={(e) => updateSetting('dSFP_Line', e.target.checked)}
                        className="w-4 h-4 accent-orange-500 rounded cursor-pointer"
                      />
                      <span className="text-zinc-300 text-xs">Swing Failure Wick</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={localSettings.dSFP_Label}
                        onChange={(e) => updateSetting('dSFP_Label', e.target.checked)}
                        className="w-4 h-4 accent-orange-500 rounded cursor-pointer"
                      />
                      <span className="text-zinc-300 text-xs">Swing Failure Label</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Group: Fibonacci Levels */}
              <div className="space-y-3 bg-zinc-800/40 p-4 rounded-xl border border-zinc-800">
                <h3 className="text-xs font-bold uppercase tracking-wider text-orange-400 font-mono">
                  SFP Fib Levels
                </h3>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={localSettings.showSFPFib}
                        onChange={(e) => updateSetting('showSFPFib', e.target.checked)}
                        className="w-4 h-4 accent-orange-500 rounded cursor-pointer"
                      />
                      <span className="text-zinc-300 text-xs">Show SFP Fib Levels</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={localSettings.showSFPFibHistory}
                        onChange={(e) => updateSetting('showSFPFibHistory', e.target.checked)}
                        className="w-4 h-4 accent-orange-500 rounded cursor-pointer"
                      />
                      <span className="text-zinc-300 text-xs">Keep Historical Fibs</span>
                    </label>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <div>
                      <span className="block text-xs text-zinc-400 mb-1">Fib Line Style</span>
                      <select
                        value={localSettings.styleFib}
                        onChange={(e) => updateSetting('styleFib', e.target.value as any)}
                        className="w-full px-2.5 py-1.5 bg-zinc-900 border border-zinc-700 rounded-lg text-white text-xs outline-none focus:border-orange-500"
                      >
                        <option value="dotted">Dotted</option>
                        <option value="dashed">Dashed</option>
                        <option value="solid">Solid</option>
                      </select>
                    </div>
                    <div>
                      <span className="block text-xs text-zinc-400 mb-1">Fib Line Width</span>
                      <input
                        type="number"
                        min={1}
                        max={5}
                        value={localSettings.widthFib}
                        onChange={(e) => updateSetting('widthFib', Math.max(1, Math.min(5, parseInt(e.target.value) || 1)))}
                        className="w-full px-2.5 py-1.5 bg-zinc-900 border border-zinc-700 rounded-lg text-white text-xs text-center font-mono outline-none focus:border-orange-500"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Group: MTF Dashboard Position */}
              <div className="space-y-3 bg-zinc-800/40 p-4 rounded-xl border border-zinc-800">
                <h3 className="text-xs font-bold uppercase tracking-wider text-orange-400 font-mono">
                  MTF Entry Model Dashboard
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="block text-xs text-zinc-400 mb-1">Table Position</span>
                    <select
                      value={localSettings.tablePosInput}
                      onChange={(e) => updateSetting('tablePosInput', e.target.value as any)}
                      className="w-full px-2.5 py-1.5 bg-zinc-900 border border-zinc-700 rounded-lg text-white text-xs outline-none focus:border-orange-500"
                    >
                      <option value="top_right">Top Right</option>
                      <option value="top_left">Top Left</option>
                      <option value="bottom_right">Bottom Right</option>
                      <option value="bottom_left">Bottom Left</option>
                    </select>
                  </div>
                  <div>
                    <span className="block text-xs text-zinc-400 mb-1">Table Size</span>
                    <select
                      value={localSettings.tableSizeInput}
                      onChange={(e) => updateSetting('tableSizeInput', e.target.value as any)}
                      className="w-full px-2.5 py-1.5 bg-zinc-900 border border-zinc-700 rounded-lg text-white text-xs outline-none focus:border-orange-500"
                    >
                      <option value="tiny">Tiny</option>
                      <option value="small">Small</option>
                      <option value="normal">Normal</option>
                      <option value="large">Large</option>
                    </select>
                  </div>
                </div>
              </div>
            </>
          ) : (
            /* Style & Colors Tab */
            <div className="space-y-4">
              <div className="bg-zinc-800/40 p-4 rounded-xl border border-zinc-800 space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-orange-400 font-mono">
                  SFP Pattern Colors
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-zinc-300 font-medium mb-1.5">Bullish Color</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={localSettings.colBl}
                        onChange={(e) => updateSetting('colBl', e.target.value)}
                        className="w-8 h-8 rounded border border-zinc-700 cursor-pointer bg-transparent"
                      />
                      <input
                        type="text"
                        value={localSettings.colBl}
                        onChange={(e) => updateSetting('colBl', e.target.value)}
                        className="flex-1 px-2 py-1 bg-zinc-900 border border-zinc-700 rounded font-mono text-xs text-white uppercase"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs text-zinc-300 font-medium mb-1.5">Bearish Color</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={localSettings.colBr}
                        onChange={(e) => updateSetting('colBr', e.target.value)}
                        className="w-8 h-8 rounded border border-zinc-700 cursor-pointer bg-transparent"
                      />
                      <input
                        type="text"
                        value={localSettings.colBr}
                        onChange={(e) => updateSetting('colBr', e.target.value)}
                        className="flex-1 px-2 py-1 bg-zinc-900 border border-zinc-700 rounded font-mono text-xs text-white uppercase"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-2 border-t border-zinc-800/80">
                  <div>
                    <label className="block text-xs text-zinc-300 font-medium mb-1.5">Fib Line Color</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={localSettings.colFib}
                        onChange={(e) => updateSetting('colFib', e.target.value)}
                        className="w-8 h-8 rounded border border-zinc-700 cursor-pointer bg-transparent"
                      />
                      <input
                        type="text"
                        value={localSettings.colFib}
                        onChange={(e) => updateSetting('colFib', e.target.value)}
                        className="flex-1 px-2 py-1 bg-zinc-900 border border-zinc-700 rounded font-mono text-xs text-white uppercase"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs text-zinc-300 font-medium mb-1.5">Dashboard Text Color</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={localSettings.dashboardText}
                        onChange={(e) => updateSetting('dashboardText', e.target.value)}
                        className="w-8 h-8 rounded border border-zinc-700 cursor-pointer bg-transparent"
                      />
                      <input
                        type="text"
                        value={localSettings.dashboardText}
                        onChange={(e) => updateSetting('dashboardText', e.target.value)}
                        className="flex-1 px-2 py-1 bg-zinc-900 border border-zinc-700 rounded font-mono text-xs text-white uppercase"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-zinc-800 bg-zinc-900/90">
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition cursor-pointer font-bold"
          >
            <RotateCcw size={14} />
            <span>Reset Defaults</span>
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-1.5 text-xs text-zinc-300 hover:text-white hover:bg-zinc-800 rounded-lg transition cursor-pointer font-bold"
            >
              Cancel
            </button>
            <button
              onClick={handleApply}
              className="flex items-center gap-1.5 px-4 py-1.5 text-xs bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition cursor-pointer font-bold shadow-sm shadow-orange-500/20"
            >
              <Check size={14} />
              <span>Apply & Save</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
