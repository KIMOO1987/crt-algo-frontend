'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import AccessGuard from '@/components/AccessGuard';
import VelaChart from '@/components/chart/VelaChart';
import ReplayToolbar from '@/components/chart/ReplayToolbar';
import TemplateModal, { ChartTemplate } from '@/components/chart/TemplateModal';
import { Layout, Maximize2, SplitSquareVertical, Grid2X2, History, RotateCcw, Loader2, Bookmark } from 'lucide-react';
import { fetchMarketCandles } from '@/lib/market-data';
import { replayProviderInstance } from '@/lib/chart/providers/ReplayProvider';
import type { OHLCV } from '@/lib/chart/providers/MultiAssetProvider';
import type { VelaWorkspace } from '@luxalgo/vela/workspace';

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

  // --- Workspace & Template State ---
  const [workspaceInstance, setWorkspaceInstance] = useState<VelaWorkspace | null>(null);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [templateCount, setTemplateCount] = useState(0);

  // Refresh saved templates count from localStorage
  const refreshTemplateCount = useCallback(() => {
    try {
      const raw = localStorage.getItem('crt_algo_chart_templates');
      if (raw) {
        const list = JSON.parse(raw);
        if (Array.isArray(list)) {
          setTemplateCount(list.length);
        }
      }
    } catch (_) {}
  }, []);

  useEffect(() => {
    refreshTemplateCount();
  }, [refreshTemplateCount]);

  // Keyboard shortcut: Ctrl+S / Cmd+S to open template save modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        refreshTemplateCount();
        setIsTemplateModalOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [refreshTemplateCount]);

  // --- Replay Mode State ---
  const [isReplayMode, setIsReplayMode] = useState(false);
  const [isLoadingReplay, setIsLoadingReplay] = useState(false);
  const [replayBars, setReplayBars] = useState<OHLCV[]>([]);
  const [replayIndex, setReplayIndex] = useState(0);
  const [initialCutIndex, setInitialCutIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [replaySpeed, setReplaySpeed] = useState(1000); // 1000ms per bar
  const [replaySessionId, setReplaySessionId] = useState(1);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Clean symbol string for provider (e.g. BTCUSDT, XAUUSD)
  const rawSymbol = selectedSymbol.includes(':') ? selectedSymbol.split(':').pop()! : selectedSymbol;

  // Toggle Replay Mode
  const handleToggleReplay = async () => {
    if (isReplayMode) {
      // Exit replay mode
      setIsPlaying(false);
      setIsReplayMode(false);
      setReplayBars([]);
      return;
    }

    // Activate Replay Mode
    setIsLoadingReplay(true);
    try {
      const rawCandles = await fetchMarketCandles(rawSymbol, '15m', { limit: 5000 });
      if (!rawCandles || rawCandles.length < 20) {
        alert('Insufficient historical candles to start Replay Mode for this asset.');
        setIsLoadingReplay(false);
        return;
      }

      const formattedBars: OHLCV[] = rawCandles.map((c: any) => ({
        time: Number(c.time) < 1e11 ? Number(c.time) * 1000 : Number(c.time),
        open: Number(c.open),
        high: Number(c.high),
        low: Number(c.low),
        close: Number(c.close),
        volume: c.volume ? Number(c.volume) : undefined,
      })).filter((b) => !isNaN(b.time) && !isNaN(b.close)).sort((a, b) => a.time - b.time);

      // Start 80 bars in the past so the trader can replay what happened next!
      const cutPoint = Math.max(10, formattedBars.length - 80);
      setReplayBars(formattedBars);
      setInitialCutIndex(cutPoint);
      setReplayIndex(cutPoint);

      // Initialize ReplayProvider with sliced candles up to cutPoint
      replayProviderInstance.setBars(formattedBars.slice(0, cutPoint + 1));
      replayProviderInstance.setTicker(rawSymbol);

      setReplaySessionId((prev) => prev + 1);
      setIsReplayMode(true);
    } catch (err) {
      console.error('[Replay] Failed to load replay candles:', err);
      alert('Could not fetch historical data for replay.');
    } finally {
      setIsLoadingReplay(false);
    }
  };

  // Step forward by 1 candle
  const handleStep = useCallback(() => {
    if (!isReplayMode || replayBars.length === 0) return;
    if (replayIndex >= replayBars.length - 1) {
      setIsPlaying(false);
      return;
    }

    const nextIdx = replayIndex + 1;
    const nextBar = replayBars[nextIdx];
    replayProviderInstance.feedNextBar(nextBar);
    setReplayIndex(nextIdx);
  }, [isReplayMode, replayBars, replayIndex]);

  // Scrub timeline to arbitrary bar index
  const handleScrub = (newIndex: number) => {
    if (!isReplayMode || replayBars.length === 0) return;
    const bounded = Math.max(0, Math.min(newIndex, replayBars.length - 1));
    setIsPlaying(false);
    setReplayIndex(bounded);
    replayProviderInstance.setBars(replayBars.slice(0, bounded + 1));
    setReplaySessionId((prev) => prev + 1);
  };

  // Reset to initial cut point
  const handleReset = () => {
    if (!isReplayMode || replayBars.length === 0) return;
    setIsPlaying(false);
    setReplayIndex(initialCutIndex);
    replayProviderInstance.setBars(replayBars.slice(0, initialCutIndex + 1));
    setReplaySessionId((prev) => prev + 1);
  };

  // Trim future candles from current position (establishes current bar as cut point)
  const handleTrim = () => {
    if (!isReplayMode || replayBars.length === 0) return;
    setIsPlaying(false);
    setInitialCutIndex(replayIndex);
    replayProviderInstance.setBars(replayBars.slice(0, replayIndex + 1));
    setReplaySessionId((prev) => prev + 1);
  };

  // Quick trim: jump back N candles
  const handleQuickTrim = (barsBack: number) => {
    if (!isReplayMode || replayBars.length === 0) return;
    const targetIdx = Math.max(5, replayBars.length - 1 - barsBack);
    setIsPlaying(false);
    setInitialCutIndex(targetIdx);
    setReplayIndex(targetIdx);
    replayProviderInstance.setBars(replayBars.slice(0, targetIdx + 1));
    setReplaySessionId((prev) => prev + 1);
  };

  // Auto-play interval
  useEffect(() => {
    if (!isPlaying || !isReplayMode) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    timerRef.current = setInterval(() => {
      handleStep();
    }, replaySpeed);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, isReplayMode, replaySpeed, handleStep]);

  // Keyboard shortcut: Space to Play/Pause
  useEffect(() => {
    if (!isReplayMode) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.code === 'Space') {
        e.preventDefault();
        setIsPlaying((prev) => !prev);
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        handleStep();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isReplayMode, handleStep]);

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
              <h1 className="text-base font-black tracking-tighter uppercase text-foreground">
                CRT-ALGO<span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-orange-600">PRO</span> TERMINAL
              </h1>
              <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Deep Historical & Replay Charting</p>
            </div>
          </div>

          {/* Quick Select, Replay Toggle & Layout Switches */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Symbol Pills */}
            <div className="hidden lg:flex items-center gap-1.5 bg-black/20 p-1 rounded-lg border border-[var(--glass-border)]">
              {QUICK_SYMBOLS.map((s) => (
                <button
                  key={s.value}
                  onClick={() => {
                    if (isReplayMode) {
                      setIsPlaying(false);
                      setIsReplayMode(false);
                    }
                    setSelectedSymbol(s.value);
                  }}
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

            {/* Bar Replay Mode Toggle */}
            <button
              onClick={handleToggleReplay}
              disabled={isLoadingReplay}
              title="Toggle Bar Replay for Historical Backtesting"
              className={`px-3 py-1.5 rounded-lg border text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm ${
                isReplayMode
                  ? 'bg-orange-500 text-white border-orange-400 shadow-orange-500/20'
                  : 'bg-zinc-800/80 hover:bg-zinc-700 text-zinc-200 border-[var(--glass-border)]'
              }`}
            >
              {isLoadingReplay ? (
                <Loader2 size={15} className="animate-spin text-orange-400" />
              ) : (
                <History size={15} className={isReplayMode ? 'text-white' : 'text-orange-400'} />
              )}
              <span>{isReplayMode ? 'REPLAY ACTIVE' : 'BAR REPLAY'}</span>
            </button>

            {/* Template Manager Button */}
            <button
              onClick={() => {
                refreshTemplateCount();
                setIsTemplateModalOpen(true);
              }}
              title="Save or Load Chart Templates (Ctrl+S)"
              className="px-3 py-1.5 rounded-lg border border-[var(--glass-border)] bg-zinc-800/80 hover:bg-zinc-700 text-zinc-200 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm hover:border-orange-500/50"
            >
              <Bookmark size={15} className="text-orange-400" />
              <span>TEMPLATES</span>
              {templateCount > 0 && (
                <span className="px-1.5 py-0.2 text-[10px] bg-orange-500/20 text-orange-400 rounded-full font-mono font-bold">
                  {templateCount}
                </span>
              )}
            </button>

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

        {/* Replay Toolbar (Appears when Replay Mode is active) */}
        {isReplayMode && (
          <ReplayToolbar
            isPlaying={isPlaying}
            currentIndex={replayIndex}
            totalBars={replayBars.length}
            currentBar={replayBars[replayIndex]}
            speed={replaySpeed}
            onPlayToggle={() => setIsPlaying((prev) => !prev)}
            onStep={handleStep}
            onReset={handleReset}
            onScrub={handleScrub}
            onTrim={handleTrim}
            onQuickTrim={handleQuickTrim}
            onSpeedChange={setReplaySpeed}
            onExit={() => {
              setIsPlaying(false);
              setIsReplayMode(false);
              setReplayBars([]);
            }}
          />
        )}

        {/* Full Viewport Chart Container */}
        <div className="flex-1 w-full rounded-2xl border border-[var(--glass-border)] overflow-hidden shadow-lg bg-[var(--bg-surface)] relative">
          <VelaChart
            key={isReplayMode ? `replay-${selectedSymbol}-${replaySessionId}` : `live-${selectedSymbol}`}
            symbol={isReplayMode ? `replay:${rawSymbol}` : selectedSymbol}
            timeframe="15"
            layout={layoutMode}
            replayMode={isReplayMode}
            showToolbar={true}
            persist={isReplayMode ? false : `crt-chart-${rawSymbol.toLowerCase()}`}
            onWorkspaceReady={(ws) => setWorkspaceInstance(ws)}
            className="w-full h-full"
          />
        </div>

        {/* Chart & Drawing Templates Modal */}
        <TemplateModal
          isOpen={isTemplateModalOpen}
          onClose={() => {
            setIsTemplateModalOpen(false);
            refreshTemplateCount();
          }}
          workspace={workspaceInstance}
          currentSymbol={rawSymbol}
          currentTimeframe="15"
          currentLayout={layoutMode}
          onApplyTemplate={(tpl) => {
            if (tpl.layout !== undefined) {
              setLayoutMode(tpl.layout);
            }
            refreshTemplateCount();
          }}
        />
      </div>
    </AccessGuard>
  );
}
