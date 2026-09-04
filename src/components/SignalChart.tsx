'use client';

import React from 'react';
import VelaChart from '@/components/chart/VelaChart';

function mapTfToVela(tf?: string): string {
  if (!tf) return '5';
  const clean = tf.trim().toLowerCase();
  if (clean === '1m' || clean === '1') return '1';
  if (clean === '3m' || clean === '3') return '3';
  if (clean === '5m' || clean === '5') return '5';
  if (clean === '15m' || clean === '15') return '15';
  if (clean === '30m' || clean === '30') return '30';
  if (clean === '1h' || clean === '60') return '60';
  if (clean === '2h' || clean === '120') return '120';
  if (clean === '4h' || clean === '240') return '240';
  if (clean === '6h' || clean === '360') return '360';
  if (clean === '12h' || clean === '720') return '720';
  if (clean === '1d' || clean === 'd') return 'D';
  if (clean === '1w' || clean === 'w') return 'W';
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
  const tf = mapTfToVela(signal?.tf);

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