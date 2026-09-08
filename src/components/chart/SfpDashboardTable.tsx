'use client';

import React, { useState } from 'react';
import { MtfStatus } from '@/server/indicators/sfp-engine';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface SfpDashboardTableProps {
  statuses: MtfStatus[];
  position?: 'top_right' | 'top_left' | 'bottom_right' | 'bottom_left';
  size?: 'tiny' | 'small' | 'normal' | 'large';
  bgColor?: string;
  textColor?: string;
}

export default function SfpDashboardTable({
  statuses,
  position = 'top_right',
  size = 'small',
  bgColor = 'rgba(15, 15, 15, 0.85)',
  textColor = '#ffffff',
}: SfpDashboardTableProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  if (!statuses || statuses.length === 0) return null;

  // Positioning class mapping
  const positionClasses = {
    top_right: 'top-14 right-4',
    top_left: 'top-14 left-16',
    bottom_right: 'bottom-8 right-4',
    bottom_left: 'bottom-8 left-16',
  }[position] || 'top-14 right-4';

  // Size configuration
  const sizeStyles = {
    tiny: { text: 'text-[9px]', cellPx: 'px-1 py-0.5', emoji: 'text-[9px]' },
    small: { text: 'text-[10px]', cellPx: 'px-1.5 py-1', emoji: 'text-[11px]' },
    normal: { text: 'text-xs', cellPx: 'px-2 py-1', emoji: 'text-xs' },
    large: { text: 'text-sm', cellPx: 'px-2.5 py-1.5', emoji: 'text-sm' },
  }[size] || { text: 'text-[10px]', cellPx: 'px-1.5 py-1', emoji: 'text-[11px]' };

  return (
    <div
      className={`absolute z-30 pointer-events-auto select-none rounded-xl border border-zinc-700/60 backdrop-blur-md shadow-2xl overflow-hidden transition-all duration-200 ${positionClasses}`}
      style={{ backgroundColor: bgColor }}
    >
      {/* Title Bar */}
      <div className="flex items-center justify-between px-2.5 py-1 border-b border-zinc-800/80 bg-black/30">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
          <span className="text-[10px] font-mono font-bold tracking-wider uppercase text-zinc-300">
            MTF SFP MODEL
          </span>
        </div>
        <button
          onClick={() => setIsCollapsed((prev) => !prev)}
          className="text-zinc-400 hover:text-white p-0.5 rounded cursor-pointer"
          title={isCollapsed ? 'Expand MTF Table' : 'Collapse MTF Table'}
        >
          {isCollapsed ? <ChevronDown size={12} /> : <ChevronUp size={12} />}
        </button>
      </div>

      {/* Table Body */}
      {!isCollapsed && (
        <div className="overflow-x-auto">
          <table className="border-collapse text-center">
            <thead>
              <tr className="bg-zinc-800/50 border-b border-zinc-800 text-zinc-400 font-mono font-bold">
                {statuses.map((item) => (
                  <th
                    key={item.timeframe}
                    className={`border-r border-zinc-800 last:border-r-0 ${sizeStyles.text} ${sizeStyles.cellPx}`}
                    style={{ color: textColor }}
                  >
                    {item.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                {statuses.map((item) => {
                  const statusColor =
                    item.status === 'Confirm'
                      ? item.bias === 1
                        ? 'text-emerald-400'
                        : 'text-rose-400'
                      : item.status === 'Unconfirmed'
                      ? 'text-amber-400'
                      : 'text-zinc-500';

                  return (
                    <td
                      key={item.timeframe}
                      className={`border-r border-zinc-800 last:border-r-0 font-bold ${sizeStyles.emoji} ${sizeStyles.cellPx} ${statusColor}`}
                      title={`${item.label}: ${item.status}${item.bias !== 0 ? ` (${item.bias === 1 ? 'Bullish' : 'Bearish'})` : ''}`}
                    >
                      {item.emoji}
                    </td>
                  );
                })}
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
