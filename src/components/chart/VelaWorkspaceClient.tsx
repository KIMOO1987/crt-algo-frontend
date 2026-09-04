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
  };
  showToolbar?: boolean;
  className?: string;
  onLoaded?: () => void;
}

/**
 * Maps incoming symbol to Vela provider:symbol format
 */
function resolveVelaSymbol(sym: string): string {
  if (!sym) return 'binance:BTCUSDT';
  const clean = sym.trim().toUpperCase();

  // If already prefixed, keep it
  if (clean.includes(':')) return clean.toLowerCase();

  // Non-crypto (Forex, Metals, Indices)
  const nonCrypto = ['XAUUSD', 'XAGUSD', 'EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD', 'GBPJPY', 'EURJPY', 'USDCAD', 'USDCHF', 'US100', 'US500', 'US30'];
  if (nonCrypto.some((item) => clean.startsWith(item))) {
    return `multiasset:${clean}`;
  }

  // OKX Swap/Perp notation
  if (clean.includes('-SWAP') || clean.includes('-USDT')) {
    return `okx:${clean}`;
  }

  // Default to Binance for crypto pairs
  const binanceTicker = clean.endsWith('USDT') ? clean : `${clean}USDT`;
  return `binance:${binanceTicker}`;
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
          let sl = Number(signal.sl);

          const isTp1Hit = signal.status?.includes('TP1') || signal.status === 'WIN';
          if (isTp1Hit && entry) sl = entry;

          try {
            if (entry && !isNaN(entry)) {
              ws.chart.drawings?.add('hline', {
                anchors: [{ time: 0, price: entry }],
                style: { lineColor: '#3b82f6', lineWidth: 2, lineStyle: 'dotted' as any },
                text: { value: 'ENTRY', size: 'small', hAlign: 'left', vAlign: 'top' },
              });
            }
            if (tp1 && !isNaN(tp1)) {
              ws.chart.drawings?.add('hline', {
                anchors: [{ time: 0, price: tp1 }],
                style: { lineColor: '#10b981', lineWidth: 2, lineStyle: 'dashed' as any },
                text: { value: 'TP1', size: 'small', hAlign: 'left', vAlign: 'top' },
              });
            }
            if (tp2 && !isNaN(tp2)) {
              ws.chart.drawings?.add('hline', {
                anchors: [{ time: 0, price: tp2 }],
                style: { lineColor: '#eab308', lineWidth: 2, lineStyle: 'dashed' as any },
                text: { value: 'TP2', size: 'small', hAlign: 'left', vAlign: 'top' },
              });
            }
            if (tp3 && !isNaN(tp3)) {
              ws.chart.drawings?.add('hline', {
                anchors: [{ time: 0, price: tp3 }],
                style: { lineColor: '#06b6d4', lineWidth: 2, lineStyle: 'dashed' as any },
                text: { value: 'TP3', size: 'small', hAlign: 'left', vAlign: 'top' },
              });
            }
            if (tp4 && !isNaN(tp4)) {
              ws.chart.drawings?.add('hline', {
                anchors: [{ time: 0, price: tp4 }],
                style: { lineColor: '#a855f7', lineWidth: 2, lineStyle: 'dashed' as any },
                text: { value: 'TP4', size: 'small', hAlign: 'left', vAlign: 'top' },
              });
            }
            if (sl && !isNaN(sl)) {
              ws.chart.drawings?.add('hline', {
                anchors: [{ time: 0, price: sl }],
                style: { lineColor: '#ef4444', lineWidth: 2, lineStyle: 'solid' as any },
                text: { value: isTp1Hit ? 'SL (BE)' : 'SL', size: 'small', hAlign: 'left', vAlign: 'top' },
              });
            }
          } catch (drawingErr) {
            console.warn('[VelaChart] Drawing signal lines failed:', drawingErr);
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
