'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Pencil,
  ChevronDown,
  Plus,
  Trash2,
  Check,
  RotateCcw,
  Sparkles,
  Sliders,
  Eye,
  SlidersHorizontal,
} from 'lucide-react';

export interface FibLevelConfig {
  ratio: number;
  color: string;
  enabled: boolean;
  label?: string;
}

export interface FibSettingsData {
  levels: FibLevelConfig[];
  numbersSize?: number | string;
  labelsSize?: number | string;
  background?: boolean;
  backgroundOpacity?: number;
  showPrices?: boolean;
  showLevels?: boolean;
  levelFormat?: 'values' | 'percentages';
  extendLines?: 'none' | 'right' | 'left' | 'both';
  reverse?: boolean;
  labelsAlign?: 'left' | 'center' | 'right';
  labelsVAlign?: 'top' | 'middle' | 'bottom';
  showTrendline?: boolean;
  trendlineColor?: string;
  useOneColor?: boolean;
  oneColor?: string;
  style?: {
    lineColor?: string;
    lineWidth?: number;
    lineStyle?: 'solid' | 'dashed' | 'dotted';
  };
}

// 24 Standard TradingView Levels + User Negative Levels
export const DEFAULT_FIB_LEVELS: FibLevelConfig[] = [
  { ratio: 1, color: '#787b86', enabled: true },
  { ratio: 0.236, color: '#f23645', enabled: false },
  { ratio: 0, color: '#787b86', enabled: true },
  { ratio: 0.5, color: '#4caf50', enabled: false },
  { ratio: -1, color: '#2962ff', enabled: true },
  { ratio: 1, color: '#787b86', enabled: false },
  { ratio: -2, color: '#089981', enabled: true },
  { ratio: 2, color: '#2962ff', enabled: false },
  { ratio: -2.5, color: '#ff9800', enabled: true },
  { ratio: -3, color: '#089981', enabled: true },
  { ratio: -4, color: '#f23645', enabled: true },
  { ratio: 4, color: '#f23645', enabled: false },
  { ratio: -4.5, color: '#9c27b0', enabled: true },
  { ratio: 4.5, color: '#9c27b0', enabled: false },
  { ratio: 2.414, color: '#00bcd4', enabled: false },
  { ratio: 2, color: '#2962ff', enabled: false },
  { ratio: 3, color: '#ff5722', enabled: false },
  { ratio: 3.272, color: '#ff5722', enabled: false },
  { ratio: -0.5, color: '#4caf50', enabled: false },
  { ratio: 4, color: '#f23645', enabled: false },
  { ratio: 4.272, color: '#673ab7', enabled: false },
  { ratio: 4.414, color: '#673ab7', enabled: false },
  { ratio: 4.618, color: '#e91e63', enabled: false },
  { ratio: 4.764, color: '#e91e63', enabled: false },
];

// Preset: User's Exact Configuration from screenshot
export const USER_SCREENSHOT_PRESET: FibLevelConfig[] = [
  { ratio: 1, color: '#2962ff', enabled: true },
  { ratio: 0.236, color: '#2962ff', enabled: false },
  { ratio: 0, color: '#2962ff', enabled: true },
  { ratio: 0.5, color: '#2962ff', enabled: false },
  { ratio: -1, color: '#2962ff', enabled: true },
  { ratio: 1, color: '#2962ff', enabled: false },
  { ratio: -2, color: '#2962ff', enabled: true },
  { ratio: 2, color: '#2962ff', enabled: false },
  { ratio: -2.5, color: '#2962ff', enabled: true },
  { ratio: -3, color: '#2962ff', enabled: true },
  { ratio: -4, color: '#2962ff', enabled: true },
  { ratio: 4, color: '#2962ff', enabled: false },
  { ratio: -4.5, color: '#2962ff', enabled: true },
  { ratio: 4.5, color: '#2962ff', enabled: false },
  { ratio: 2.414, color: '#2962ff', enabled: false },
  { ratio: 2, color: '#2962ff', enabled: false },
  { ratio: 3, color: '#2962ff', enabled: false },
  { ratio: 3.272, color: '#2962ff', enabled: false },
  { ratio: -0.5, color: '#2962ff', enabled: false },
  { ratio: 4, color: '#2962ff', enabled: false },
  { ratio: 4.272, color: '#2962ff', enabled: false },
  { ratio: 4.414, color: '#2962ff', enabled: false },
  { ratio: 4.618, color: '#2962ff', enabled: false },
  { ratio: 4.764, color: '#2962ff', enabled: false },
];

interface FibSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  drawing: {
    id: string;
    type: string;
    anchors?: { time: number; price: number }[];
    props?: Record<string, any>;
    levels?: FibLevelConfig[];
    [key: string]: any;
  } | null;
  onApply: (id: string, updatedProps: FibSettingsData, updatedAnchors?: { time: number; price: number }[]) => void;
}

export default function FibSettingsModal({
  isOpen,
  onClose,
  drawing,
  onApply,
}: FibSettingsModalProps) {
  const [activeTab, setActiveTab] = useState<'style' | 'coordinates' | 'visibility'>('style');
  const [templateDropdownOpen, setTemplateDropdownOpen] = useState(false);

  // Form states
  const [levels, setLevels] = useState<FibLevelConfig[]>(DEFAULT_FIB_LEVELS);
  const [showTrendline, setShowTrendline] = useState(true);
  const [trendlineColor, setTrendlineColor] = useState('#2962ff');
  const [lineWidth, setLineWidth] = useState(1);
  const [lineStyle, setLineStyle] = useState<'solid' | 'dashed' | 'dotted'>('solid');
  const [extendLines, setExtendLines] = useState<'none' | 'right' | 'left' | 'both'>('none');
  const [useOneColor, setUseOneColor] = useState(false);
  const [oneColor, setOneColor] = useState('#2962ff');
  const [background, setBackground] = useState(true);
  const [backgroundOpacity, setBackgroundOpacity] = useState(6); // 0 - 80%
  const [reverse, setReverse] = useState(false);
  const [showPrices, setShowPrices] = useState(false);
  const [showLevels, setShowLevels] = useState(true);
  const [levelFormat, setLevelFormat] = useState<'values' | 'percentages'>('values');
  const [labelsAlign, setLabelsAlign] = useState<'left' | 'center' | 'right'>('right');
  const [labelsVAlign, setLabelsVAlign] = useState<'top' | 'middle' | 'bottom'>('middle');
  const [showText, setShowText] = useState(true);
  const [textAlign, setTextAlign] = useState<'left' | 'center' | 'right'>('center');
  const [textVAlign, setTextVAlign] = useState<'top' | 'middle' | 'bottom'>('middle');
  const [fontSize, setFontSize] = useState<number>(12);
  const [logScale, setLogScale] = useState(false);

  // Coordinates
  const [anchors, setAnchors] = useState<{ time: number; price: number }[]>([]);

  // Initial snapshot to allow Cancel/Revert
  const initialSnapshotRef = useRef<FibSettingsData | null>(null);
  const initialAnchorsRef = useRef<{ time: number; price: number }[] | null>(null);

  // Populate state on drawing select or open
  useEffect(() => {
    if (!isOpen || !drawing) return;

    const p = drawing.props || {};
    const rawLevels: FibLevelConfig[] = Array.isArray(p.levels) && p.levels.length > 0
      ? p.levels.map((l: any) => ({
          ratio: Number(l.ratio),
          color: l.color || '#2962ff',
          enabled: l.enabled !== false,
          label: l.label,
        }))
      : (Array.isArray(drawing.levels) && drawing.levels.length > 0
          ? drawing.levels.map((l: any) => ({
              ratio: Number(l.ratio),
              color: l.color || '#2962ff',
              enabled: l.enabled !== false,
              label: l.label,
            }))
          : DEFAULT_FIB_LEVELS);

    setLevels(rawLevels);
    setShowTrendline(p.showTrendline !== false);
    setTrendlineColor(p.trendlineColor || drawing.style?.lineColor || '#2962ff');
    setLineWidth(drawing.style?.lineWidth || 1);
    setLineStyle(drawing.style?.lineStyle || 'solid');
    setExtendLines(p.extendLines || 'none');
    setUseOneColor(!!p.useOneColor);
    setOneColor(p.oneColor || '#2962ff');
    setBackground(p.background !== false && p.showBackground !== false);
    setBackgroundOpacity(Math.round((typeof p.backgroundOpacity === 'number' ? p.backgroundOpacity : 0.06) * 100));
    setReverse(!!p.reverse);
    setShowPrices(!!p.showPrices);
    setShowLevels(p.showLevels !== false);
    setLevelFormat(p.levelFormat || 'values');
    setLabelsAlign(p.labelsAlign || 'right');
    setLabelsVAlign(p.labelsVAlign || 'middle');
    setShowText(p.showText !== false);
    setTextAlign(p.textAlign || 'center');
    setTextVAlign(p.textVAlign || 'middle');
    setFontSize(typeof p.numbersSize === 'number' ? p.numbersSize : 12);
    setLogScale(!!p.logScale);

    if (Array.isArray(drawing.anchors)) {
      setAnchors([...drawing.anchors]);
      initialAnchorsRef.current = [...drawing.anchors];
    }

    const snapshot: FibSettingsData = {
      levels: rawLevels,
      numbersSize: typeof p.numbersSize === 'number' ? p.numbersSize : 12,
      labelsSize: typeof p.labelsSize === 'number' ? p.labelsSize : 12,
      background: p.background !== false,
      backgroundOpacity: typeof p.backgroundOpacity === 'number' ? p.backgroundOpacity : 0.06,
      showPrices: !!p.showPrices,
      showLevels: p.showLevels !== false,
      levelFormat: p.levelFormat || 'values',
      extendLines: p.extendLines || 'none',
      reverse: !!p.reverse,
      labelsAlign: p.labelsAlign || 'right',
      labelsVAlign: p.labelsVAlign || 'middle',
      showTrendline: p.showTrendline !== false,
      trendlineColor: p.trendlineColor || '#2962ff',
      useOneColor: !!p.useOneColor,
      oneColor: p.oneColor || '#2962ff',
      style: {
        lineColor: drawing.style?.lineColor || '#2962ff',
        lineWidth: drawing.style?.lineWidth || 1,
        lineStyle: drawing.style?.lineStyle || 'solid',
      },
    };
    initialSnapshotRef.current = snapshot;
  }, [isOpen, drawing]);

  if (!isOpen || !drawing) return null;

  const handleLevelChange = (index: number, patch: Partial<FibLevelConfig>) => {
    setLevels((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], ...patch };
      return next;
    });
  };

  const handleAddLevel = () => {
    setLevels((prev) => {
      const last = prev[prev.length - 1];
      const nextRatio = last ? Math.round((last.ratio + 0.5) * 100) / 100 : 0.5;
      return [...prev, { ratio: nextRatio, color: oneColor || '#2962ff', enabled: true }];
    });
  };

  const handleRemoveLevel = (index: number) => {
    setLevels((prev) => prev.filter((_, i) => i !== index));
  };

  const getPayload = (): FibSettingsData => ({
    levels,
    numbersSize: fontSize,
    labelsSize: fontSize,
    background,
    backgroundOpacity: background ? backgroundOpacity / 100 : 0,
    showPrices,
    showLevels,
    levelFormat,
    extendLines,
    reverse,
    labelsAlign,
    labelsVAlign,
    showTrendline,
    trendlineColor,
    useOneColor,
    oneColor,
    style: {
      lineColor: useOneColor ? oneColor : trendlineColor,
      lineWidth,
      lineStyle,
    },
  });

  const handleOk = () => {
    if (!drawing) return;
    onApply(drawing.id, getPayload(), anchors);
    onClose();
  };

  const handleCancel = () => {
    if (drawing && initialSnapshotRef.current) {
      onApply(drawing.id, initialSnapshotRef.current, initialAnchorsRef.current || undefined);
    }
    onClose();
  };

  const handleApplyPreset = (preset: FibLevelConfig[]) => {
    setLevels(preset);
    setTemplateDropdownOpen(false);
  };

  // Split levels into 2 columns for exact TradingView layout
  const midPoint = Math.ceil(levels.length / 2);
  const leftCol = levels.slice(0, midPoint);
  const rightCol = levels.slice(midPoint);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-[440px] bg-[#1e222d] border border-[#2a2e39] rounded-lg shadow-2xl text-zinc-200 text-xs font-sans select-none animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#2a2e39] shrink-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm text-white capitalize">
              {drawing.type.replace(/^fib/, 'Fib ')}
            </span>
            <Pencil className="w-3.5 h-3.5 text-zinc-500 hover:text-zinc-300 cursor-pointer" />
          </div>
          <button
            type="button"
            onClick={handleCancel}
            className="p-1 rounded text-zinc-400 hover:text-white hover:bg-[#2a2e39] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex items-center px-4 border-b border-[#2a2e39] gap-6 text-xs font-medium shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('style')}
            className={`py-2.5 transition-colors border-b-2 ${
              activeTab === 'style'
                ? 'border-blue-500 text-white font-semibold'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Style
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('coordinates')}
            className={`py-2.5 transition-colors border-b-2 ${
              activeTab === 'coordinates'
                ? 'border-blue-500 text-white font-semibold'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Coordinates
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('visibility')}
            className={`py-2.5 transition-colors border-b-2 ${
              activeTab === 'visibility'
                ? 'border-blue-500 text-white font-semibold'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Visibility
          </button>
        </div>

        {/* Scrollable Tab Content */}
        <div className="p-4 space-y-3.5 overflow-y-auto flex-1 custom-scrollbar text-zinc-300">
          {activeTab === 'style' && (
            <>
              {/* Trendline & Levels Line */}
              <div className="flex items-center justify-between gap-2 pb-2 border-b border-[#2a2e39]/80">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={showTrendline}
                    onChange={(e) => setShowTrendline(e.target.checked)}
                    className="rounded border-[#363a45] bg-[#2a2e39] text-blue-500 focus:ring-0 focus:outline-none w-3.5 h-3.5"
                  />
                  <span>Trend line</span>
                </label>
                <div className="flex items-center gap-2">
                  <div className="relative flex items-center justify-center w-7 h-6 rounded bg-[#2a2e39] border border-[#363a45] overflow-hidden cursor-pointer">
                    <input
                      type="color"
                      value={trendlineColor}
                      onChange={(e) => setTrendlineColor(e.target.value)}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    />
                    <div className="w-3.5 h-3.5 rounded-sm" style={{ backgroundColor: trendlineColor }} />
                  </div>
                  <div className="px-2 py-1 bg-[#2a2e39] border border-[#363a45] rounded text-[11px] text-zinc-400 font-mono">
                    ---
                  </div>
                </div>
              </div>

              {/* Levels Line & Thickness */}
              <div className="flex items-center justify-between gap-2">
                <span>Levels line</span>
                <div className="flex items-center gap-2">
                  <select
                    value={lineStyle}
                    onChange={(e) => setLineStyle(e.target.value as any)}
                    className="bg-[#2a2e39] border border-[#363a45] rounded px-2 py-1 text-xs text-zinc-200 focus:outline-none"
                  >
                    <option value="solid">—— Solid</option>
                    <option value="dashed">-- Dashed</option>
                    <option value="dotted">·· Dotted</option>
                  </select>
                  <select
                    value={lineWidth}
                    onChange={(e) => setLineWidth(Number(e.target.value))}
                    className="bg-[#2a2e39] border border-[#363a45] rounded px-2 py-1 text-xs text-zinc-200 focus:outline-none"
                  >
                    <option value="1">1px</option>
                    <option value="2">2px</option>
                    <option value="3">3px</option>
                    <option value="4">4px</option>
                  </select>
                </div>
              </div>

              {/* Extend Dropdown */}
              <div className="flex items-center justify-between gap-2 pb-2 border-b border-[#2a2e39]/80">
                <span>Extend</span>
                <select
                  value={extendLines}
                  onChange={(e) => setExtendLines(e.target.value as any)}
                  className="bg-[#2a2e39] border border-[#363a45] rounded px-2.5 py-1 text-xs text-zinc-200 focus:outline-none w-44"
                >
                  <option value="none">Don't extend</option>
                  <option value="right">Extend lines right</option>
                  <option value="left">Extend lines left</option>
                  <option value="both">Extend lines both</option>
                </select>
              </div>

              {/* 2-Column Grid of 24 Levels */}
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 py-1">
                {/* Left Column */}
                <div className="space-y-2">
                  {leftCol.map((lv, idx) => (
                    <div key={`left-${idx}`} className="flex items-center gap-2 group">
                      <input
                        type="checkbox"
                        checked={lv.enabled}
                        onChange={(e) => handleLevelChange(idx, { enabled: e.target.checked })}
                        className="rounded border-[#363a45] bg-[#2a2e39] text-blue-500 focus:ring-0 w-3.5 h-3.5 cursor-pointer"
                      />
                      <input
                        type="number"
                        step="any"
                        value={lv.ratio}
                        onChange={(e) => handleLevelChange(idx, { ratio: parseFloat(e.target.value) || 0 })}
                        className="w-16 bg-[#2a2e39] border border-[#363a45] rounded px-2 py-0.5 text-xs text-zinc-100 font-mono focus:border-blue-500 focus:outline-none"
                      />
                      <div className="relative flex items-center justify-center w-6 h-6 rounded bg-[#2a2e39] border border-[#363a45] overflow-hidden cursor-pointer">
                        <input
                          type="color"
                          value={useOneColor ? oneColor : lv.color}
                          disabled={useOneColor}
                          onChange={(e) => handleLevelChange(idx, { color: e.target.value })}
                          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full disabled:cursor-not-allowed"
                        />
                        <div
                          className="w-3.5 h-3.5 rounded-sm"
                          style={{ backgroundColor: useOneColor ? oneColor : lv.color }}
                        />
                      </div>
                      {levels.length > 2 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveLevel(idx)}
                          className="opacity-0 group-hover:opacity-100 text-zinc-500 hover:text-red-400 p-0.5 transition-opacity"
                          title="Delete level"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                {/* Right Column */}
                <div className="space-y-2">
                  {rightCol.map((lv, idx) => {
                    const realIdx = midPoint + idx;
                    return (
                      <div key={`right-${idx}`} className="flex items-center gap-2 group">
                        <input
                          type="checkbox"
                          checked={lv.enabled}
                          onChange={(e) => handleLevelChange(realIdx, { enabled: e.target.checked })}
                          className="rounded border-[#363a45] bg-[#2a2e39] text-blue-500 focus:ring-0 w-3.5 h-3.5 cursor-pointer"
                        />
                        <input
                          type="number"
                          step="any"
                          value={lv.ratio}
                          onChange={(e) => handleLevelChange(realIdx, { ratio: parseFloat(e.target.value) || 0 })}
                          className="w-16 bg-[#2a2e39] border border-[#363a45] rounded px-2 py-0.5 text-xs text-zinc-100 font-mono focus:border-blue-500 focus:outline-none"
                        />
                        <div className="relative flex items-center justify-center w-6 h-6 rounded bg-[#2a2e39] border border-[#363a45] overflow-hidden cursor-pointer">
                          <input
                            type="color"
                            value={useOneColor ? oneColor : lv.color}
                            disabled={useOneColor}
                            onChange={(e) => handleLevelChange(realIdx, { color: e.target.value })}
                            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full disabled:cursor-not-allowed"
                          />
                          <div
                            className="w-3.5 h-3.5 rounded-sm"
                            style={{ backgroundColor: useOneColor ? oneColor : lv.color }}
                          />
                        </div>
                        {levels.length > 2 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveLevel(realIdx)}
                            className="opacity-0 group-hover:opacity-100 text-zinc-500 hover:text-red-400 p-0.5 transition-opacity"
                            title="Delete level"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* + Add Level Button */}
              <div className="pt-1">
                <button
                  type="button"
                  onClick={handleAddLevel}
                  className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold text-blue-400 hover:text-blue-300 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 rounded transition-colors"
                >
                  <Plus className="w-3 h-3" />
                  Add Level
                </button>
              </div>

              {/* Use one color */}
              <div className="flex items-center justify-between gap-2 pt-2 border-t border-[#2a2e39]/80">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={useOneColor}
                    onChange={(e) => setUseOneColor(e.target.checked)}
                    className="rounded border-[#363a45] bg-[#2a2e39] text-blue-500 focus:ring-0 w-3.5 h-3.5"
                  />
                  <span>Use one color</span>
                </label>
                <div className="relative flex items-center justify-center w-7 h-6 rounded bg-[#2a2e39] border border-[#363a45] overflow-hidden cursor-pointer">
                  <input
                    type="color"
                    value={oneColor}
                    onChange={(e) => {
                      setOneColor(e.target.value);
                      setUseOneColor(true);
                    }}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  />
                  <div className="w-3.5 h-3.5 rounded-sm" style={{ backgroundColor: oneColor }} />
                </div>
              </div>

              {/* Background & Opacity Slider */}
              <div className="flex items-center justify-between gap-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={background}
                    onChange={(e) => setBackground(e.target.checked)}
                    className="rounded border-[#363a45] bg-[#2a2e39] text-blue-500 focus:ring-0 w-3.5 h-3.5"
                  />
                  <span>Background</span>
                </label>
                <div className="flex items-center gap-2.5">
                  <input
                    type="range"
                    min="0"
                    max="80"
                    value={background ? backgroundOpacity : 0}
                    disabled={!background}
                    onChange={(e) => setBackgroundOpacity(Number(e.target.value))}
                    className="w-28 h-1.5 bg-[#363a45] rounded-lg appearance-none cursor-pointer accent-blue-500 disabled:opacity-40"
                  />
                  <span className="font-mono text-[11px] text-zinc-400 w-7 text-right">
                    {background ? `${backgroundOpacity}%` : '0%'}
                  </span>
                </div>
              </div>

              {/* Reverse */}
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={reverse}
                    onChange={(e) => setReverse(e.target.checked)}
                    className="rounded border-[#363a45] bg-[#2a2e39] text-blue-500 focus:ring-0 w-3.5 h-3.5"
                  />
                  <span>Reverse</span>
                </label>
              </div>

              {/* Prices */}
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showPrices}
                    onChange={(e) => setShowPrices(e.target.checked)}
                    className="rounded border-[#363a45] bg-[#2a2e39] text-blue-500 focus:ring-0 w-3.5 h-3.5"
                  />
                  <span>Prices</span>
                </label>
              </div>

              {/* Levels & Format Dropdown */}
              <div className="flex items-center justify-between gap-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showLevels}
                    onChange={(e) => setShowLevels(e.target.checked)}
                    className="rounded border-[#363a45] bg-[#2a2e39] text-blue-500 focus:ring-0 w-3.5 h-3.5"
                  />
                  <span>Levels</span>
                </label>
                <select
                  value={levelFormat}
                  onChange={(e) => setLevelFormat(e.target.value as any)}
                  className="bg-[#2a2e39] border border-[#363a45] rounded px-2.5 py-1 text-xs text-zinc-200 focus:outline-none w-32"
                >
                  <option value="values">Values</option>
                  <option value="percentages">Percentages</option>
                </select>
              </div>

              {/* Labels Alignment */}
              <div className="flex items-center justify-between gap-2">
                <span>Labels</span>
                <div className="flex items-center gap-2">
                  <select
                    value={labelsAlign}
                    onChange={(e) => setLabelsAlign(e.target.value as any)}
                    className="bg-[#2a2e39] border border-[#363a45] rounded px-2 py-1 text-xs text-zinc-200 focus:outline-none"
                  >
                    <option value="left">Left</option>
                    <option value="center">Center</option>
                    <option value="right">Right</option>
                  </select>
                  <select
                    value={labelsVAlign}
                    onChange={(e) => setLabelsVAlign(e.target.value as any)}
                    className="bg-[#2a2e39] border border-[#363a45] rounded px-2 py-1 text-xs text-zinc-200 focus:outline-none"
                  >
                    <option value="top">Top</option>
                    <option value="middle">Middle</option>
                    <option value="bottom">Bottom</option>
                  </select>
                </div>
              </div>

              {/* Text Alignment */}
              <div className="flex items-center justify-between gap-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showText}
                    onChange={(e) => setShowText(e.target.checked)}
                    className="rounded border-[#363a45] bg-[#2a2e39] text-blue-500 focus:ring-0 w-3.5 h-3.5"
                  />
                  <span>Text</span>
                </label>
                <div className="flex items-center gap-2">
                  <select
                    value={textAlign}
                    onChange={(e) => setTextAlign(e.target.value as any)}
                    className="bg-[#2a2e39] border border-[#363a45] rounded px-2 py-1 text-xs text-zinc-200 focus:outline-none"
                  >
                    <option value="left">Left</option>
                    <option value="center">Center</option>
                    <option value="right">Right</option>
                  </select>
                  <select
                    value={textVAlign}
                    onChange={(e) => setTextVAlign(e.target.value as any)}
                    className="bg-[#2a2e39] border border-[#363a45] rounded px-2 py-1 text-xs text-zinc-200 focus:outline-none"
                  >
                    <option value="top">Top</option>
                    <option value="middle">Middle</option>
                    <option value="bottom">Bottom</option>
                  </select>
                </div>
              </div>

              {/* Font size */}
              <div className="flex items-center justify-between gap-2">
                <span>Font size</span>
                <select
                  value={fontSize}
                  onChange={(e) => setFontSize(Number(e.target.value))}
                  className="bg-[#2a2e39] border border-[#363a45] rounded px-2.5 py-1 text-xs text-zinc-200 focus:outline-none w-24"
                >
                  {[8, 10, 11, 12, 14, 16, 18, 20, 22, 24].map((sz) => (
                    <option key={sz} value={sz}>
                      {sz}
                    </option>
                  ))}
                </select>
              </div>

              {/* Log Scale Checkbox */}
              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={logScale}
                    onChange={(e) => setLogScale(e.target.checked)}
                    className="rounded border-[#363a45] bg-[#2a2e39] text-blue-500 focus:ring-0 w-3.5 h-3.5"
                  />
                  <span>Fib levels based on log scale</span>
                </label>
              </div>
            </>
          )}

          {activeTab === 'coordinates' && (
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <span className="font-semibold text-white">Point 1</span>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-[11px] text-zinc-400 block mb-1">Price</span>
                    <input
                      type="number"
                      step="any"
                      value={anchors[0]?.price || 0}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        setAnchors((prev) => [{ ...prev[0], price: val }, prev[1]]);
                      }}
                      className="w-full bg-[#2a2e39] border border-[#363a45] rounded px-2.5 py-1.5 text-xs text-zinc-100 font-mono focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <span className="text-[11px] text-zinc-400 block mb-1">Bar / Time</span>
                    <input
                      type="number"
                      value={anchors[0]?.time || 0}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10) || 0;
                        setAnchors((prev) => [{ ...prev[0], time: val }, prev[1]]);
                      }}
                      className="w-full bg-[#2a2e39] border border-[#363a45] rounded px-2.5 py-1.5 text-xs text-zinc-100 font-mono focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-[#2a2e39]">
                <span className="font-semibold text-white">Point 2</span>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-[11px] text-zinc-400 block mb-1">Price</span>
                    <input
                      type="number"
                      step="any"
                      value={anchors[1]?.price || 0}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        setAnchors((prev) => [prev[0], { ...prev[1], price: val }]);
                      }}
                      className="w-full bg-[#2a2e39] border border-[#363a45] rounded px-2.5 py-1.5 text-xs text-zinc-100 font-mono focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <span className="text-[11px] text-zinc-400 block mb-1">Bar / Time</span>
                    <input
                      type="number"
                      value={anchors[1]?.time || 0}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10) || 0;
                        setAnchors((prev) => [prev[0], { ...prev[1], time: val }]);
                      }}
                      className="w-full bg-[#2a2e39] border border-[#363a45] rounded px-2.5 py-1.5 text-xs text-zinc-100 font-mono focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'visibility' && (
            <div className="space-y-3 py-2">
              <span className="text-zinc-400 block mb-2">Display this Fib drawing on timeframes:</span>
              <div className="grid grid-cols-2 gap-2.5">
                {['Seconds', 'Minutes', 'Hours', 'Days', 'Weeks', 'Months'].map((tf) => (
                  <label key={tf} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      defaultChecked
                      className="rounded border-[#363a45] bg-[#2a2e39] text-blue-500 focus:ring-0 w-3.5 h-3.5"
                    />
                    <span>{tf}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-[#2a2e39] bg-[#1e222d] shrink-0">
          <div className="relative">
            <button
              type="button"
              onClick={() => setTemplateDropdownOpen(!templateDropdownOpen)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#2a2e39] hover:bg-[#363a45] border border-[#363a45] rounded text-xs text-zinc-200 transition-colors"
            >
              <span>Template</span>
              <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
            </button>

            {templateDropdownOpen && (
              <div className="absolute bottom-full left-0 mb-1.5 w-56 bg-[#1e222d] border border-[#2a2e39] rounded shadow-2xl py-1 z-50 text-xs text-zinc-300">
                <button
                  type="button"
                  onClick={() => handleApplyPreset(USER_SCREENSHOT_PRESET)}
                  className="w-full text-left px-3 py-2 hover:bg-[#2a2e39] flex items-center justify-between text-orange-400 hover:text-orange-300"
                >
                  <span>Apply CRT-ALGO Preset</span>
                  <Sparkles className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyPreset(DEFAULT_FIB_LEVELS)}
                  className="w-full text-left px-3 py-2 hover:bg-[#2a2e39] flex items-center justify-between text-zinc-300 hover:text-white"
                >
                  <span>TradingView Default</span>
                </button>
                <div className="border-t border-[#2a2e39] my-1" />
                <button
                  type="button"
                  onClick={() => {
                    localStorage.setItem('crt_fib_user_template', JSON.stringify(getPayload()));
                    setTemplateDropdownOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-[#2a2e39] text-zinc-400 hover:text-white"
                >
                  Save as Default
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const saved = localStorage.getItem('crt_fib_user_template');
                    if (saved) {
                      try {
                        const parsed = JSON.parse(saved);
                        if (parsed.levels) setLevels(parsed.levels);
                      } catch (_) {}
                    }
                    setTemplateDropdownOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-[#2a2e39] text-zinc-400 hover:text-white"
                >
                  Apply User Default
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCancel}
              className="px-3.5 py-1.5 rounded bg-transparent hover:bg-[#2a2e39] text-zinc-300 hover:text-white font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleOk}
              className="px-4 py-1.5 rounded bg-blue-600 hover:bg-blue-500 text-white font-semibold transition-colors shadow-sm"
            >
              Ok
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
