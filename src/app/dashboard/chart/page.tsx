'use client';

import React, { useState } from 'react';
import AccessGuard from '@/components/AccessGuard';
import VelaChart from '@/components/chart/VelaChart';
import { Layout, Maximize2, SplitSquareVertical, Grid2X2 } from 'lucide-react';

const QUICK_SYMBOLS = [
  { label: 'BTC/USDT', value: 'binance:BTCUSDT' },
  { label: 'ETH/USDT', value: 'binance:ETHUSDT' },
  { label: 'SOL/USDT', value: 'binance:SOLUSDT' },
  { label: 'OKX:BTC-SWAP', value: 'okx:BTC-USDT-SWAP' },
  { label: 'GOLD (XAUUSD)', value: 'multiasset:XAUUSD' },
  { label: 'NASDAQ (US100)', value: 'multiasset:US100' },
  { label: 'EUR/USD', value: 'multiasset:EURUSD' },
];

export default function ProChartPage() {
  const [selectedSymbol, setSelectedSymbol] = useState('binance:BTCUSDT');
  const [layoutMode, setLayoutMode] = useState<string | false>(false);

  return (
    <AccessGuard requiredTier={0} tierName="Free">
      <div className="flex flex-col h-[calc(100vh-80px)] w-full p-2 md:p-4 gap-3 bg-[var(--bg-canvas)]">
        {/* Header Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 rounded-xl border border-[var(--glass-border)] bg-[var(--glass-bg)] backdrop-blur-md shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-500">
              <Layout size={20} />
            </div>
            <div>
              <h1 className="text-base font-extrabold tracking-tight text-foreground">Pro Trading Terminal</h1>
              <p className="text-[11px] text-zinc-400 font-medium">Native WebGL2 Charting powered by Vela</p>
            </div>
          </div>

          {/* Quick Select & Layout Switches */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Symbol Pills */}
            <div className="hidden lg:flex items-center gap-1.5 bg-black/20 p-1 rounded-lg border border-[var(--glass-border)]">
              {QUICK_SYMBOLS.map((s) => (
                <button
                  key={s.value}
                  onClick={() => setSelectedSymbol(s.value)}
                  className={`px-2.5 py-1 text-xs font-bold rounded-md transition-all cursor-pointer ${
                    selectedSymbol === s.value
                      ? 'bg-orange-500 text-white shadow-sm'
                      : 'text-zinc-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>

            {/* Layout Toggles */}
            <div className="flex items-center gap-1 bg-black/20 p-1 rounded-lg border border-[var(--glass-border)]">
              <button
                onClick={() => setLayoutMode(false)}
                title="Single Chart"
                className={`p-1.5 rounded-md transition-all cursor-pointer ${
                  layoutMode === false ? 'bg-orange-500 text-white' : 'text-zinc-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Maximize2 size={16} />
              </button>
              <button
                onClick={() => setLayoutMode('2h')}
                title="2-Chart Split (HTF / LTF)"
                className={`p-1.5 rounded-md transition-all cursor-pointer ${
                  layoutMode === '2h' ? 'bg-orange-500 text-white' : 'text-zinc-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <SplitSquareVertical size={16} />
              </button>
              <button
                onClick={() => setLayoutMode('4')}
                title="4-Chart Grid"
                className={`p-1.5 rounded-md transition-all cursor-pointer ${
                  layoutMode === '4' ? 'bg-orange-500 text-white' : 'text-zinc-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Grid2X2 size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* Full Viewport Chart Container */}
        <div className="flex-1 w-full rounded-2xl border border-[var(--glass-border)] overflow-hidden shadow-lg bg-[var(--bg-surface)] relative">
          <VelaChart
            symbol={selectedSymbol}
            timeframe="15"
            layout={layoutMode}
            showToolbar={true}
            className="w-full h-full"
          />
        </div>
      </div>
    </AccessGuard>
  );
}
