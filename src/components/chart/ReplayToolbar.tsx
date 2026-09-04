'use client';

import React from 'react';
import { Play, Pause, StepForward, RotateCcw, X, FastForward, Clock } from 'lucide-react';
import type { OHLCV } from '@/lib/chart/providers/MultiAssetProvider';

export interface ReplayToolbarProps {
  isPlaying: boolean;
  currentIndex: number;
  totalBars: number;
  currentBar?: OHLCV | null;
  speed: number;
  onPlayToggle: () => void;
  onStep: () => void;
  onReset: () => void;
  onScrub: (index: number) => void;
  onSpeedChange: (speed: number) => void;
  onExit: () => void;
}

export default function ReplayToolbar({
  isPlaying,
  currentIndex,
  totalBars,
  currentBar,
  speed,
  onPlayToggle,
  onStep,
  onReset,
  onScrub,
  onSpeedChange,
  onExit,
}: ReplayToolbarProps) {
  const formattedDate = currentBar?.time
    ? new Date(currentBar.time).toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '---';

  const progressPercent = totalBars > 1 ? (currentIndex / (totalBars - 1)) * 100 : 0;

  return (
    <div className="w-full flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 bg-zinc-900/95 border border-orange-500/30 rounded-xl shadow-xl backdrop-blur-md text-white animate-in fade-in slide-in-from-top-2 duration-300">
      {/* Left: Replay Status & Timestamp */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-orange-500/20 border border-orange-500/40 rounded-lg text-orange-400 text-[10px] font-black uppercase tracking-wider">
          <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
          BAR REPLAY MODE
        </div>

        <div className="flex items-center gap-2 text-xs font-mono text-zinc-300">
          <Clock size={14} className="text-zinc-500" />
          <span>{formattedDate}</span>
        </div>

        {currentBar && (
          <div className="hidden md:flex items-center gap-2 text-[11px] font-mono text-zinc-400">
            <span>C: <strong className="text-zinc-100">{Number(currentBar.close).toFixed(2)}</strong></span>
          </div>
        )}
      </div>

      {/* Center: Controls (Rewind, Play/Pause, Step) */}
      <div className="flex items-center gap-2">
        <button
          onClick={onReset}
          title="Reset to Cut Point"
          className="p-1.5 hover:bg-white/10 rounded-lg text-zinc-400 hover:text-white transition-colors cursor-pointer"
        >
          <RotateCcw size={16} />
        </button>

        <button
          onClick={onPlayToggle}
          title={isPlaying ? "Pause Replay (Space)" : "Play Replay (Space)"}
          className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 text-xs font-bold transition-all cursor-pointer shadow-sm ${
            isPlaying
              ? 'bg-amber-500 hover:bg-amber-600 text-black'
              : 'bg-orange-500 hover:bg-orange-600 text-white'
          }`}
        >
          {isPlaying ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" />}
          <span>{isPlaying ? 'PAUSE' : 'PLAY'}</span>
        </button>

        <button
          onClick={onStep}
          disabled={currentIndex >= totalBars - 1}
          title="Step Forward (+1 Candle)"
          className="px-2.5 py-1.5 bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-white/5 border border-white/10 rounded-lg text-xs font-bold text-zinc-200 hover:text-white transition-all flex items-center gap-1 cursor-pointer"
        >
          <StepForward size={14} />
          <span className="hidden sm:inline">+1 Bar</span>
        </button>

        {/* Speed Selector */}
        <div className="flex items-center bg-black/40 border border-white/10 rounded-lg p-0.5 ml-1">
          {[
            { label: '0.5s', val: 500 },
            { label: '1s', val: 1000 },
            { label: '2s', val: 2000 },
          ].map((s) => (
            <button
              key={s.val}
              onClick={() => onSpeedChange(s.val)}
              className={`px-2 py-0.5 text-[10px] font-bold rounded transition-all cursor-pointer ${
                speed === s.val
                  ? 'bg-orange-500 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Right: Timeline Scrubber & Exit */}
      <div className="flex items-center gap-3 w-full md:w-auto mt-2 md:mt-0">
        <div className="flex-1 md:w-44 flex items-center gap-2">
          <input
            type="range"
            min={0}
            max={Math.max(0, totalBars - 1)}
            value={currentIndex}
            onChange={(e) => onScrub(Number(e.target.value))}
            className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-orange-500"
          />
          <span className="text-[10px] font-mono text-zinc-400 shrink-0">
            {currentIndex + 1}/{totalBars}
          </span>
        </div>

        <button
          onClick={onExit}
          title="Exit Replay Mode"
          className="p-1.5 hover:bg-red-500/20 text-zinc-400 hover:text-red-400 rounded-lg transition-colors cursor-pointer"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
