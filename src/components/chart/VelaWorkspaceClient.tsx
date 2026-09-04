'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useTheme } from 'next-themes';
import { VelaWorkspace } from '@luxalgo/vela/workspace';
import { BinanceProvider } from '@luxalgo/vela/providers/binance';
import { OkxProvider } from '@/lib/chart/providers/OkxProvider';
import { MultiAssetProvider } from '@/lib/chart/providers/MultiAssetProvider';

export interface VelaChartProps {
  symbol?: string;
  timeframe?: string;
  layout?: string | false;
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
  };
  showToolbar?: boolean;
  className?: string;
  onLoaded?: () => void;
}

/**
 * Maps incoming symbol to Vela provider:symbol format
 */
export function resolveVelaSymbol(sym: string): string {
  if (!sym) return 'binance:BTCUSDT';
  let clean = sym.trim().toUpperCase();

  // 1. If already prefixed (e.g. 'binance:btcusdt', 'okx:...'), preserve it
  if (clean.includes(':')) {
    const [p, t] = clean.split(':');
    return `${p.toLowerCase()}:${t}`;
  }

  // 2. Non-crypto (Forex, Metals, Indices)
  const nonCrypto = ['XAUUSD', 'XAGUSD', 'EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD', 'GBPJPY', 'EURJPY', 'USDCAD', 'USDCHF', 'US100', 'US500', 'US30'];
  if (nonCrypto.some((item) => clean.startsWith(item))) {
    return `multiasset:${clean}`;
  }

  // 3. OKX Swap/Perp notation (e.g. BTC-USDT-SWAP, BTC-USDT)
  if (clean.includes('-SWAP') || clean.includes('-USDT')) {
    return `okx:${clean}`;
  }

  // 4. Handle crypto perpetual futures ending in .P (e.g. LTCUSDT.P, BTCUSDT.P, LTC.P)
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

  // 5. Crypto ending in USDT
  if (clean.endsWith('USDT')) {
    return `binance:${clean}`;
  }

  // 6. Crypto ending in USD (e.g. BTCUSD -> BTCUSDT)
  if (clean.endsWith('USD')) {
    return `binance:${clean.slice(0, -3)}USDT`;
  }

  // 7. Generic crypto fallback (e.g. BTC -> BTCUSDT)
  return `binance:${clean}USDT`;
}

export default function VelaWorkspaceClient({
  symbol = 'BTCUSDT',
  timeframe = '5',
  layout = false,
  signal,
  showToolbar = true,
  className = 'w-full h-full min-h-[450px]',
  onLoaded,
}: VelaChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const workspaceRef = useRef<VelaWorkspace | null>(null);
  const [loading, setLoading] = useState(true);
  const { theme } = useTheme();

  useEffect(() => {
    if (!containerRef.current) return;

    const activeTheme = document.documentElement.classList.contains('dark') || theme === 'dark' ? 'dark' : 'light';
    const targetSymbol = resolveVelaSymbol(symbol);

    try {
      // Initialize Vela Trading Terminal
      const ws = new VelaWorkspace(containerRef.current, {
        layout: layout ?? false,
        symbol: targetSymbol,
        timeframe: timeframe || '5',
        live: true,
        theme: activeTheme as any,
        drawingToolbar: showToolbar,
        persist: false, // Don't cache state in temporary modals/views
        providers: {
          binance: () => new BinanceProvider(),
          okx: () => new OkxProvider() as any,
          multiasset: () => new MultiAssetProvider() as any,
        },
      });

      workspaceRef.current = ws;

      // Handle signal levels when ready
      void ws.chart.ready().then(() => {
        setLoading(false);
        if (onLoaded) onLoaded();

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
        }
      });
    } catch (err) {
      console.error('[VelaChart] Error initializing VelaWorkspace:', err);
      setLoading(false);
    }

    return () => {
      if (workspaceRef.current) {
        try {
          workspaceRef.current.destroy();
        } catch (e) {
          // Ignore destroy errors on unmount
        }
        workspaceRef.current = null;
      }
    };
  }, [symbol, timeframe, layout, theme]);

  return (
    <div className={`relative ${className}`}>
      {loading && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-[var(--bg-surface)]/60 backdrop-blur-sm">
          <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mb-2" />
          <span className="text-xs text-zinc-400 font-mono font-medium tracking-wide">Initializing Vela Engine...</span>
        </div>
      )}
      <div ref={containerRef} className="w-full h-full min-h-[450px]" />
    </div>
  );
}
