'use client';

import React from 'react';
import VelaChart from '@/components/chart/VelaChart';

export default function SignalChart({
  symbol,
  signal,
  onLoaded,
}: {
  symbol: string;
  signal?: any;
  onLoaded?: () => void;
}) {
  return (
    <div className="w-full h-full min-h-[450px] relative bg-[var(--bg-surface)] overflow-hidden rounded-xl">
      <VelaChart
        symbol={symbol}
        timeframe="5"
        signal={signal}
        showToolbar={true}
        onLoaded={onLoaded}
        className="w-full h-full"
      />
    </div>
  );
}