'use client';

import dynamic from 'next/dynamic';
import React from 'react';
import type { VelaChartProps } from './VelaWorkspaceClient';

const DynamicVela = dynamic(() => import('./VelaWorkspaceClient'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full min-h-[450px] flex flex-col items-center justify-center bg-[var(--bg-surface)] text-zinc-400">
      <div className="w-7 h-7 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mb-2" />
      <span className="text-xs font-mono">Loading Vela Charting Engine...</span>
    </div>
  ),
});

export default function VelaChart(props: VelaChartProps) {
  return <DynamicVela {...props} />;
}
