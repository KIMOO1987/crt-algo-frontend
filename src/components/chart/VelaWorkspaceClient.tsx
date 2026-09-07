'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useTheme } from 'next-themes';
import { VelaWorkspace } from '@luxalgo/vela/workspace';
import { BinanceProvider } from '@luxalgo/vela/providers/binance';
import { OkxProvider } from '@/lib/chart/providers/OkxProvider';
import { MultiAssetProvider } from '@/lib/chart/providers/MultiAssetProvider';

import { getSymbolCategory, normalizeSymbol } from '@/lib/symbol-mapper';
import { mapTfToVela } from '@/components/SignalChart';
import { replayProviderInstance } from '@/lib/chart/providers/ReplayProvider';
import FibSettingsModal, { FibSettingsData } from './FibSettingsModal';
import { SlidersHorizontal } from 'lucide-react';

export interface VelaChartProps {
  symbol?: string;
  timeframe?: string;
  layout?: string | false;
  replayMode?: boolean;
  signal?: {
    symbol?: string;
    entry_price?: number | string;
    tp?: number | string;
    tp_secondary?: number | string;
    tp2?: number | string;
    tp3?: number | string;
    tp4?: number | string;
    sl?: number | string;
    status?: string;
    side?: string;
    created_at?: string;
    tf?: string;
    tf_alignment?: string;
    timeframe?: string;
    time_frame?: string;
    interval?: string;
    [key: string]: any;
  };
  showToolbar?: boolean;
  className?: string;
  persist?: boolean | string;
  onLoaded?: () => void;
  onWorkspaceReady?: (ws: VelaWorkspace) => void;
}

/**
 * Maps incoming symbol to Vela provider:symbol format
 */
export function resolveVelaSymbol(sym: string): string {
  if (!sym) return 'binance:BTCUSDT';
  let clean = sym.trim().toUpperCase();

  // 1. If already prefixed (e.g. 'binance:btcusdt', 'okx:...', 'multiasset:...'), preserve it
  if (clean.includes(':')) {
    const [p, t] = clean.split(':');
    return `${p.toLowerCase()}:${t}`;
  }

  // 2. Normalize and check asset category
  const normalized = normalizeSymbol(clean);
  const category = getSymbolCategory(normalized);

  // 3. Non-crypto (Forex, Metals, Indices) ALWAYS route to multiasset with canonical ticker
  // NEVER append USDT or route non-crypto to Binance!
  if (category === 'FOREX' || category === 'METALS' || category === 'INDICES') {
    return `multiasset:${normalized}`;
  }

  // 4. OKX Swap/Perp notation (e.g. BTC-USDT-SWAP, BTC-USDT)
  if (clean.includes('-SWAP') || clean.includes('-USDT')) {
    return `okx:${clean}`;
  }

  // 5. Handle crypto perpetual futures ending in .P (e.g. LTCUSDT.P, BTCUSDT.P, LTC.P)
  if (clean.endsWith('.P')) {
    const base = clean.slice(0, -2);
    if (base.endsWith('USDT')) {
      return `binance:${base}.P`;
    }
    if (base.endsWith('USD')) {
      return `binance:${base.slice(0, -3)}USDT.P`;
    }
    return `binance:${base}USDT.P`;
  }

  // 6. Crypto ending in USDT
  if (clean.endsWith('USDT')) {
    return `binance:${clean}`;
  }

  // 7. Crypto ending in USD (e.g. BTCUSD -> BTCUSDT)
  if (clean.endsWith('USD')) {
    return `binance:${clean.slice(0, -3)}USDT`;
  }

  // 8. Generic crypto fallback (e.g. BTC -> BTCUSDT)
  return `binance:${clean}USDT`;
}

export default function VelaWorkspaceClient({
  symbol = 'BTCUSDT',
  timeframe = '5',
  layout = false,
  replayMode = false,
  signal,
  showToolbar = true,
  className = 'w-full h-full min-h-[450px]',
  persist,
  onLoaded,
  onWorkspaceReady,
}: VelaChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const workspaceRef = useRef<VelaWorkspace | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDrawing, setSelectedDrawing] = useState<{
    id: string;
    type: string;
    text?: {
      value: string;
      hAlign?: 'left' | 'center' | 'right';
      vAlign?: 'top' | 'center' | 'bottom';
      color?: string;
      size?: string;
      bold?: boolean;
      italic?: boolean;
    };
    anchors?: { time: number; price: number }[];
    props?: Record<string, any>;
    levels?: any[];
    style?: Record<string, any>;
  } | null>(null);
  const [isFibModalOpen, setIsFibModalOpen] = useState(false);
  const selectedDrawingRef = useRef<string | null>(null);
  const { theme } = useTheme();

  useEffect(() => {
    selectedDrawingRef.current = selectedDrawing?.id || null;
  }, [selectedDrawing]);

  useEffect(() => {
    if (!containerRef.current) return;

    const activeTheme = document.documentElement.classList.contains('dark') || theme === 'dark' ? 'dark' : 'light';
    const targetSymbol = resolveVelaSymbol(symbol);
    const cleanSymbol = (symbol.includes(':') ? symbol.split(':').pop()! : symbol).toLowerCase();
    const persistKey = persist !== undefined
      ? persist
      : (replayMode || signal ? false : `crt-chart-${cleanSymbol}`);

    try {
      // Resolve execution timeframe (e.g. M30/H6 -> 30) if signal is present
      const signalTf = signal?.tf_alignment || signal?.tf || signal?.timeframe || signal?.time_frame || signal?.interval;
      const targetTimeframe = (timeframe && timeframe !== '5')
        ? timeframe
        : (signalTf ? mapTfToVela(signalTf) : (timeframe || '5'));

      // Initialize Vela Trading Terminal with deep historical bars
      const ws = new VelaWorkspace(containerRef.current, {
        layout: layout ?? false,
        symbol: targetSymbol,
        timeframe: targetTimeframe,
        bars: 5000, // Deep initial history
        live: !replayMode,
        theme: activeTheme as any,
        drawingToolbar: showToolbar,
        persist: persistKey as any,
        providers: {
          binance: () => new BinanceProvider(),
          okx: () => new OkxProvider() as any,
          multiasset: () => new MultiAssetProvider() as any,
          replay: () => replayProviderInstance as any,
        },
      });

      workspaceRef.current = ws;

      // Handle signal levels when ready
      void ws.chart.ready().then(() => {
        setLoading(false);
        if (onLoaded) onLoaded();
        if (onWorkspaceReady) onWorkspaceReady(ws);

        if (signal) {
          const entry = Number(signal.entry_price);
          const tp1 = Number(signal.tp);
          const tp2 = Number(signal.tp_secondary || signal.tp2);
          const tp3 = Number(signal.tp3);
          const tp4 = Number(signal.tp4);
          const origSl = Number(signal.sl);
          const statusUpper = (signal.status || '').toUpperCase();
          const isTp1Hit =
            statusUpper.includes('TP') ||
            statusUpper.includes('WIN') ||
            statusUpper.includes('BE') ||
            statusUpper.includes('PROFIT');

          // Get visible range to anchor the labels visibly on screen
          const vr = ws.chart.getVisibleRange();
          const labelTime = vr && vr.to > vr.from ? vr.from + (vr.to - vr.from) * 0.12 : Date.now();

          try {
            // 1. ADD FULL-WIDTH HORIZONTAL PRICE LINES WITH CLEAR LABELS
            if (entry && !isNaN(entry)) {
              ws.chart.drawings?.add('hline', {
                anchors: [{ time: labelTime, price: entry }],
                style: { lineColor: '#3b82f6', lineWidth: 2, lineStyle: 'dotted' as any },
                text: { value: `ENTRY: ${entry}`, color: '#3b82f6', size: 'small', bold: true, hAlign: 'left', vAlign: 'top' },
              });
            }
            if (tp1 && !isNaN(tp1)) {
              ws.chart.drawings?.add('hline', {
                anchors: [{ time: labelTime, price: tp1 }],
                style: { lineColor: '#10b981', lineWidth: 2, lineStyle: 'dashed' as any },
                text: { value: `TP1: ${tp1}`, color: '#10b981', size: 'small', bold: true, hAlign: 'left', vAlign: 'top' },
              });
            }
            if (tp2 && !isNaN(tp2)) {
              ws.chart.drawings?.add('hline', {
                anchors: [{ time: labelTime, price: tp2 }],
                style: { lineColor: '#eab308', lineWidth: 2, lineStyle: 'dashed' as any },
                text: { value: `TP2: ${tp2}`, color: '#eab308', size: 'small', bold: true, hAlign: 'left', vAlign: 'top' },
              });
            }
            if (tp3 && !isNaN(tp3)) {
              ws.chart.drawings?.add('hline', {
                anchors: [{ time: labelTime, price: tp3 }],
                style: { lineColor: '#06b6d4', lineWidth: 2, lineStyle: 'dashed' as any },
                text: { value: `TP3: ${tp3}`, color: '#06b6d4', size: 'small', bold: true, hAlign: 'left', vAlign: 'top' },
              });
            }
            if (tp4 && !isNaN(tp4)) {
              ws.chart.drawings?.add('hline', {
                anchors: [{ time: labelTime, price: tp4 }],
                style: { lineColor: '#a855f7', lineWidth: 2, lineStyle: 'dashed' as any },
                text: { value: `TP4: ${tp4}`, color: '#a855f7', size: 'small', bold: true, hAlign: 'left', vAlign: 'top' },
              });
            }

            // Stop Loss drawing: Breakeven if TP1 reached, else regular Stop Loss
            if (isTp1Hit && entry && !isNaN(entry)) {
              // Breakeven line at Entry
              ws.chart.drawings?.add('hline', {
                anchors: [{ time: labelTime, price: entry }],
                style: { lineColor: '#10b981', lineWidth: 2, lineStyle: 'solid' as any },
                text: { value: `SL (BE): ${entry}`, color: '#10b981', size: 'small', bold: true, hAlign: 'left', vAlign: 'bottom' },
              });
              // Original SL dotted reference line
              if (origSl && !isNaN(origSl) && origSl !== entry) {
                ws.chart.drawings?.add('hline', {
                  anchors: [{ time: labelTime, price: origSl }],
                  style: { lineColor: '#ef4444', lineWidth: 1, lineStyle: 'dotted' as any },
                  text: { value: `ORIGINAL SL: ${origSl}`, color: '#ef4444', size: 'small', bold: false, hAlign: 'left', vAlign: 'top' },
                });
              }
            } else if (origSl && !isNaN(origSl)) {
              ws.chart.drawings?.add('hline', {
                anchors: [{ time: labelTime, price: origSl }],
                style: { lineColor: '#ef4444', lineWidth: 2, lineStyle: 'solid' as any },
                text: { value: `SL: ${origSl}`, color: '#ef4444', size: 'small', bold: true, hAlign: 'left', vAlign: 'top' },
              });
            }

            // 2. ADD BUY/SELL POSITION TOOL (Long/Short Risk-Reward Box)
            // Pick TP2 (e.g. 2.5RR target) if present, otherwise TP1
            const mainTarget = tp2 || tp1;
            const posSl = origSl;
            if (entry && posSl && mainTarget && !isNaN(entry) && !isNaN(posSl) && !isNaN(mainTarget)) {
              const signalTime = signal.created_at ? new Date(signal.created_at).getTime() : NaN;
              const hasValidSignalTime = !isNaN(signalTime) && vr && signalTime >= vr.from && signalTime <= vr.to;

              const posStart = hasValidSignalTime
                ? signalTime
                : (vr && vr.to > vr.from ? vr.to - (vr.to - vr.from) * 0.35 : Date.now() - 3600000);
              const posSpan = vr && vr.to > vr.from ? (vr.to - vr.from) * 0.20 : 3600000 * 2;
              const posEnd = posStart + posSpan;

              ws.chart.drawings?.add('position', {
                anchors: [
                  { time: posStart, price: entry },
                  { time: posEnd, price: posSl },
                  { time: posEnd, price: mainTarget },
                ],
                props: {
                  showText: true,
                  showHeader: true,
                  showPrices: true,
                  showLossSize: true,
                  showTargetLabel: true,
                  showStopLabel: true,
                  profitColor: '#10b981',
                  lossColor: '#ef4444',
                },
                style: {
                  lineColor: '#3b82f6',
                  lineWidth: 1,
                },
              });
            }
          } catch (drawingErr) {
            console.warn('[VelaChart] Drawing signal lines/position tool failed:', drawingErr);
          }
        } else if (!replayMode) {
          // Normal/Pro chart mode: restore saved drawings for this asset if present
          try {
            const savedDocRaw = localStorage.getItem(`crt_drawings_${cleanSymbol}`);
            if (savedDocRaw) {
              const savedDoc = JSON.parse(savedDocRaw);
              if (savedDoc && (Array.isArray(savedDoc.drawings) ? savedDoc.drawings.length > 0 : savedDoc.items?.length > 0)) {
                ws.chart.drawings?.fromJSON(savedDoc);
              }
            }
          } catch (err) {
            console.warn('[VelaChart] Error restoring saved drawings:', err);
          }
        }
      });

      // Auto-save drawings to localStorage as user creates, edits, or deletes drawings
      const saveDrawings = () => {
        if (!ws.chart?.drawings || replayMode || signal) return;
        try {
          const doc = ws.chart.drawings.toJSON();
          if (doc) {
            localStorage.setItem(`crt_drawings_${cleanSymbol}`, JSON.stringify(doc));
          }
        } catch (e) {
          console.warn('[VelaChart] Error auto-saving drawings to localStorage:', e);
        }
      };

      const updateSelectedFromChart = (id: string | null) => {
        if (!id || !ws.chart?.drawings) {
          setSelectedDrawing(null);
          return;
        }
        try {
          const all = ws.chart.drawings.all ? ws.chart.drawings.all() : [];
          const d = all.find((x: any) => x.id === id);
          if (d) {
            setSelectedDrawing({
              id: d.id,
              type: d.type || 'drawing',
              text: d.text ? { ...d.text } : { value: '', hAlign: 'center', vAlign: 'center' },
              anchors: (d as any).anchors ? (d as any).anchors.map((p: any) => ({ time: p.time, price: p.price })) : [],
              props: typeof (d as any).writeProps === 'function' ? (d as any).writeProps() : (d as any).props || {},
              levels: (d as any).levels || [],
              style: (d as any).style || {},
            });
          } else {
            setSelectedDrawing(null);
          }
        } catch (_) {
          setSelectedDrawing(null);
        }
      };

      const unsubs: (() => void)[] = [];
      const offState = ws.on('state:changed', saveDrawings);
      if (typeof offState === 'function') unsubs.push(offState);
      const offCreated = ws.chart.on('drawing:created', saveDrawings);
      if (typeof offCreated === 'function') unsubs.push(offCreated);
      const offEdited = ws.chart.on('drawing:edited', ({ id }: { id?: string } = {}) => {
        saveDrawings();
        if (id && selectedDrawingRef.current === id) {
          updateSelectedFromChart(id);
        }
      });
      if (typeof offEdited === 'function') unsubs.push(offEdited);
      const offRemoved = ws.chart.on('drawing:removed', ({ id }: { id?: string } = {}) => {
        saveDrawings();
        if (id && selectedDrawingRef.current === id) {
          setSelectedDrawing(null);
        }
      });
      if (typeof offRemoved === 'function') unsubs.push(offRemoved);
      const offSelected = ws.chart.on('drawing:selected', ({ id }: { id?: string | null } = {}) => {
        updateSelectedFromChart(id || null);
      });
      if (typeof offSelected === 'function') unsubs.push(offSelected);

      const handleBeforeUnload = () => {
        saveDrawings();
      };
      window.addEventListener('beforeunload', handleBeforeUnload);

      return () => {
        window.removeEventListener('beforeunload', handleBeforeUnload);
        saveDrawings();
        setSelectedDrawing(null);
        unsubs.forEach((fn) => {
          try {
            fn();
          } catch (_) {}
        });
        if (workspaceRef.current) {
          try {
            workspaceRef.current.destroy();
          } catch (e) {
            // Ignore destroy errors on unmount
          }
          workspaceRef.current = null;
        }
      };
    } catch (err) {
      console.error('[VelaChart] Error initializing VelaWorkspace:', err);
      setLoading(false);
    }
  }, [symbol, timeframe, signal?.tf, signal?.tf_alignment, layout, theme, replayMode, persist]);

  const handleUpdateAlignment = (
    hAlign?: 'left' | 'center' | 'right',
    vAlign?: 'top' | 'center' | 'bottom'
  ) => {
    if (!selectedDrawing || !workspaceRef.current?.chart?.drawings) return;
    const ws = workspaceRef.current;
    const currentText = selectedDrawing.text || { value: '', hAlign: 'center', vAlign: 'center' };
    const newH = (hAlign ?? currentText.hAlign ?? 'center') as 'left' | 'center' | 'right';
    const newV = (vAlign ?? currentText.vAlign ?? 'center') as 'top' | 'center' | 'bottom';

    const updatedText = {
      ...currentText,
      value: currentText.value || '',
      hAlign: newH,
      vAlign: newV,
    };

    try {
      ws.chart.drawings.update(selectedDrawing.id, {
        text: updatedText as any,
      });
      setSelectedDrawing((prev) => (prev ? { ...prev, text: updatedText } : null));

      const cleanSymbol = (symbol.includes(':') ? symbol.split(':').pop()! : symbol).toLowerCase();
      const doc = ws.chart.drawings.toJSON();
      if (doc) localStorage.setItem(`crt_drawings_${cleanSymbol}`, JSON.stringify(doc));
    } catch (e) {
      console.warn('[VelaChart] Failed to update drawing alignment:', e);
    }
  };

  const handleUpdateTextValue = (val: string) => {
    if (!selectedDrawing || !workspaceRef.current?.chart?.drawings) return;
    const ws = workspaceRef.current;
    const currentText = selectedDrawing.text || { value: '', hAlign: 'center', vAlign: 'center' };
    const updatedText = {
      ...currentText,
      value: val,
    };

    try {
      ws.chart.drawings.update(selectedDrawing.id, {
        text: updatedText as any,
      });
      setSelectedDrawing((prev) => (prev ? { ...prev, text: updatedText } : null));

      const cleanSymbol = (symbol.includes(':') ? symbol.split(':').pop()! : symbol).toLowerCase();
      const doc = ws.chart.drawings.toJSON();
      if (doc) localStorage.setItem(`crt_drawings_${cleanSymbol}`, JSON.stringify(doc));
    } catch (e) {
      console.warn('[VelaChart] Failed to update drawing text:', e);
    }
  };

  const handleApplyFibSettings = (
    id: string,
    updatedProps: FibSettingsData,
    updatedAnchors?: { time: number; price: number }[]
  ) => {
    if (!workspaceRef.current?.chart?.drawings) return;
    const ws = workspaceRef.current;
    try {
      const patch: any = { ...updatedProps };
      if (updatedAnchors && updatedAnchors.length >= 2) {
        patch.anchors = updatedAnchors;
      }
      ws.chart.drawings.update(id, patch);

      // Refresh selected drawing state
      const all = ws.chart.drawings.all ? ws.chart.drawings.all() : [];
      const d = all.find((x: any) => x.id === id);
      if (d) {
        setSelectedDrawing({
          id: d.id,
          type: d.type || 'drawing',
          text: d.text ? { ...d.text } : { value: '', hAlign: 'center', vAlign: 'center' },
          anchors: (d as any).anchors ? (d as any).anchors.map((p: any) => ({ time: p.time, price: p.price })) : [],
          props: typeof (d as any).writeProps === 'function' ? (d as any).writeProps() : (d as any).props || {},
          levels: (d as any).levels || [],
          style: (d as any).style || {},
        });
      }

      // Persist to localStorage
      const cleanSymbol = (symbol.includes(':') ? symbol.split(':').pop()! : symbol).toLowerCase();
      const doc = ws.chart.drawings.toJSON();
      if (doc) localStorage.setItem(`crt_drawings_${cleanSymbol}`, JSON.stringify(doc));
    } catch (e) {
      console.warn('[VelaChart] Failed to apply Fib settings:', e);
    }
  };

  return (
    <div className={`relative ${className} [&_.vela-attribution]:!hidden`}>
      {loading && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-[var(--bg-surface)]/60 backdrop-blur-sm">
          <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mb-2" />
          <span className="text-xs text-zinc-400 font-mono font-medium tracking-wide">Initializing Vela Engine...</span>
        </div>
      )}

      {/* Floating Drawing Text Alignment & Customization Bar */}
      {selectedDrawing && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30 flex flex-wrap items-center gap-2 px-3 py-1.5 bg-zinc-900/90 dark:bg-black/90 backdrop-blur-md border border-zinc-700/80 dark:border-zinc-800 rounded-xl shadow-2xl text-xs text-zinc-200">
          <div className="flex items-center gap-1.5 pr-2 border-r border-zinc-700/60 font-mono text-[10px] uppercase font-bold text-orange-400 select-none">
            <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
            {selectedDrawing.type}
          </div>

          {/* Quick Label Input */}
          <div className="flex items-center">
            <input
              type="text"
              placeholder="Drawing label..."
              value={selectedDrawing.text?.value || ''}
              onChange={(e) => handleUpdateTextValue(e.target.value)}
              className="bg-zinc-800/80 dark:bg-zinc-900 border border-zinc-700/60 rounded px-2 py-0.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500 w-28 md:w-36"
            />
          </div>

          {/* Horizontal Alignment (Left, Center, Right) */}
          <div className="flex items-center gap-0.5 bg-zinc-800/80 dark:bg-zinc-900/90 p-0.5 rounded-lg border border-zinc-700/50">
            <span className="text-[10px] font-semibold text-zinc-400 px-1 select-none">H:</span>
            <button
              type="button"
              title="Align Left"
              onClick={() => handleUpdateAlignment('left', undefined)}
              className={`px-1.5 py-0.5 rounded text-[11px] font-medium transition-all ${
                selectedDrawing.text?.hAlign === 'left'
                  ? 'bg-orange-500 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-700/50'
              }`}
            >
              Left
            </button>
            <button
              type="button"
              title="Align Center"
              onClick={() => handleUpdateAlignment('center', undefined)}
              className={`px-1.5 py-0.5 rounded text-[11px] font-medium transition-all ${
                (selectedDrawing.text?.hAlign === 'center' || !selectedDrawing.text?.hAlign)
                  ? 'bg-orange-500 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-700/50'
              }`}
            >
              Center
            </button>
            <button
              type="button"
              title="Align Right"
              onClick={() => handleUpdateAlignment('right', undefined)}
              className={`px-1.5 py-0.5 rounded text-[11px] font-medium transition-all ${
                selectedDrawing.text?.hAlign === 'right'
                  ? 'bg-orange-500 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-700/50'
              }`}
            >
              Right
            </button>
          </div>

          {/* Vertical Alignment (Top, Center, Bottom) */}
          <div className="flex items-center gap-0.5 bg-zinc-800/80 dark:bg-zinc-900/90 p-0.5 rounded-lg border border-zinc-700/50">
            <span className="text-[10px] font-semibold text-zinc-400 px-1 select-none">V:</span>
            <button
              type="button"
              title="Align Top"
              onClick={() => handleUpdateAlignment(undefined, 'top')}
              className={`px-1.5 py-0.5 rounded text-[11px] font-medium transition-all ${
                selectedDrawing.text?.vAlign === 'top'
                  ? 'bg-orange-500 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-700/50'
              }`}
            >
              Top
            </button>
            <button
              type="button"
              title="Align Middle"
              onClick={() => handleUpdateAlignment(undefined, 'center')}
              className={`px-1.5 py-0.5 rounded text-[11px] font-medium transition-all ${
                (selectedDrawing.text?.vAlign === 'center' || !selectedDrawing.text?.vAlign)
                  ? 'bg-orange-500 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-700/50'
              }`}
            >
              Middle
            </button>
            <button
              type="button"
              title="Align Bottom"
              onClick={() => handleUpdateAlignment(undefined, 'bottom')}
              className={`px-1.5 py-0.5 rounded text-[11px] font-medium transition-all ${
                selectedDrawing.text?.vAlign === 'bottom'
                  ? 'bg-orange-500 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-700/50'
              }`}
            >
              Bottom
            </button>
          </div>

          {/* Fibonacci Settings Dialog Button */}
          {selectedDrawing.type.toLowerCase().includes('fib') && (
            <button
              type="button"
              title="Open Fibonacci Settings"
              onClick={() => setIsFibModalOpen(true)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs shadow-md transition-all ml-1 cursor-pointer"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Fib Settings</span>
            </button>
          )}

          {/* Close / Dismiss Bar */}
          <button
            type="button"
            title="Deselect"
            onClick={() => {
              setSelectedDrawing(null);
              workspaceRef.current?.chart?.drawings?.select?.(null);
            }}
            className="p-1 rounded-md text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors ml-1"
          >
            ✕
          </button>
        </div>
      )}

      {/* TradingView-grade Fibonacci Settings Modal */}
      {isFibModalOpen && selectedDrawing && (
        <FibSettingsModal
          isOpen={isFibModalOpen}
          onClose={() => setIsFibModalOpen(false)}
          drawing={selectedDrawing}
          onApply={handleApplyFibSettings}
        />
      )}

      {/* Official CRT-ALGO PRO Logo on Chart (matching sidebar top) */}
      <div className="absolute bottom-2.5 left-3.5 z-20 flex items-center gap-1.5 pointer-events-none select-none drop-shadow-md">
        <span className="text-sm md:text-base font-black tracking-tighter uppercase text-zinc-900 dark:text-white">
          CRT-ALGO<span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-orange-600">PRO</span>
        </span>
      </div>

      <div ref={containerRef} className="w-full h-full min-h-[450px]" />
    </div>
  );
}
