'use client';

import React from 'react';
import VelaChart from '@/components/chart/VelaChart';

export function mapTfToVela(raw?: string): string {
  if (!raw) return '5';
  const str = String(raw).trim();
  if (!str) return '5';

  // Handle compound alignments like 'M30/H6', 'M5/H1', 'M15/H4', 'H1-H4', etc.
  // In CRT & SFP trading, the first part is the primary execution timeframe!
  const first = str.split(/[\/\-]/)[0].trim().toUpperCase();

  // 1. Check Hour patterns: 'H1', '1H', 'H4', '4H', 'H6', '6H', 'H12', '12H', etc.
  const hMatch = first.match(/^H(\d+)$/) || first.match(/^(\d+)H$/);
  if (hMatch) {
    const hours = parseInt(hMatch[1], 10);
    return String(hours * 60);
  }

  // 2. Check Day / Week patterns
  if (first === 'D' || first === '1D' || first === 'D1' || first === 'DAILY') return 'D';
  if (first === 'W' || first === '1W' || first === 'W1' || first === 'WEEKLY') return 'W';

  // 3. Check Minute patterns: 'M30', '30M', '30m', '30', 'M15', '15M', 'M5', '5M', 'M1', '1M', etc.
  const mMatch = first.match(/^M?(\d+)[M]?$/i);
  if (mMatch) {
    const minutes = parseInt(mMatch[1], 10);
    if (minutes === 60) return '60';
    if (minutes === 120) return '120';
    if (minutes === 240) return '240';
    if (minutes === 360) return '360';
    if (minutes === 720) return '720';
    if (minutes === 1440) return 'D';
    return String(minutes);
  }

  // Fallback checks
  const lower = first.toLowerCase();
  if (lower === '60' || lower === '1h') return '60';
  if (lower === '120' || lower === '2h') return '120';
  if (lower === '240' || lower === '4h') return '240';
  if (lower === '360' || lower === '6h') return '360';
  if (lower === 'd' || lower === '1d') return 'D';
  if (lower === 'w' || lower === '1w') return 'W';

  return '5';
}

export default function SignalChart({
  symbol,
  signal,
  onLoaded,
}: {
  symbol: string;
  signal?: any;
  onLoaded?: () => void;
}) {
  // Check tf_alignment (CRT signals), tf (SFP signals), timeframe, interval
  const rawTf = signal?.tf_alignment || signal?.tf || signal?.timeframe || signal?.time_frame || signal?.interval;
  const tf = mapTfToVela(rawTf);

  return (
    <div className="w-full h-full min-h-[450px] relative bg-[var(--bg-surface)] overflow-hidden rounded-xl">
      <VelaChart
        symbol={symbol}
        timeframe={tf}
        signal={signal}
        showToolbar={true}
        onLoaded={onLoaded}
        className="w-full h-full"
      />
    </div>
  );
}