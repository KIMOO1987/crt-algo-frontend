'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import type { VelaWorkspace } from '@luxalgo/vela/workspace';
import { SfpSettings, DEFAULT_SFP_SETTINGS } from './SfpSettingsModal';
import { MtfStatus } from './SfpDashboardTable';

export interface SfpDrawing {
  id: string;
  type: 'trendline' | 'hline' | 'ray' | 'text';
  anchors: Array<{ time: number; price: number }>;
  style?: {
    lineColor?: string;
    lineWidth?: number;
    lineStyle?: 'solid' | 'dashed' | 'dotted';
  };
  text?: {
    value: string;
    color?: string;
    size?: 'tiny' | 'small' | 'normal' | 'large';
    bold?: boolean;
    hAlign?: 'left' | 'center' | 'right';
    vAlign?: 'top' | 'center' | 'bottom';
  };
}

export interface UseSfpIndicatorProps {
  workspace: VelaWorkspace | null;
  symbol: string;
  timeframe?: string;
  replayMode?: boolean;
}

export function useSfpIndicator({
  workspace,
  symbol,
  timeframe = '15',
  replayMode = false,
}: UseSfpIndicatorProps) {
  // Indicator enabled state (default true as requested)
  const [isEnabled, setIsEnabled] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    try {
      const saved = localStorage.getItem('crt_sfp_enabled');
      return saved !== null ? JSON.parse(saved) : true;
    } catch {
      return true;
    }
  });

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Indicator Settings
  const [settings, setSettings] = useState<SfpSettings>(() => {
    if (typeof window === 'undefined') return DEFAULT_SFP_SETTINGS;
    try {
      const saved = localStorage.getItem('crt_sfp_settings');
      return saved ? { ...DEFAULT_SFP_SETTINGS, ...JSON.parse(saved) } : DEFAULT_SFP_SETTINGS;
    } catch {
      return DEFAULT_SFP_SETTINGS;
    }
  });

  const [statuses, setStatuses] = useState<MtfStatus[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Track created drawing IDs for clean updates and removal
  const sfpDrawingIdsRef = useRef<string[]>([]);
  const lastFetchRef = useRef<string>('');

  // Save enabled toggle to localStorage
  const toggleEnabled = useCallback(() => {
    setIsEnabled((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('crt_sfp_enabled', JSON.stringify(next));
      } catch (_) {}
      return next;
    });
  }, []);

  // Save settings to localStorage
  const updateSettings = useCallback((newSettings: SfpSettings) => {
    setSettings(newSettings);
    try {
      localStorage.setItem('crt_sfp_settings', JSON.stringify(newSettings));
    } catch (_) {}
  }, []);

  // Clear all SFP drawings currently on chart
  const clearSfpDrawings = useCallback((ws: VelaWorkspace | null) => {
    if (!ws || !ws.chart || !ws.chart.drawings) return;
    if (sfpDrawingIdsRef.current.length > 0) {
      try {
        ws.chart.drawings.removeMany(sfpDrawingIdsRef.current);
      } catch (err) {
        console.warn('[useSfpIndicator] Failed to remove previous SFP drawings:', err);
      }
      sfpDrawingIdsRef.current = [];
    }
  }, []);

  // Fetch from server and render on chart
  const calculateAndRender = useCallback(
    async (force = false) => {
      if (!workspace || !workspace.chart) return;

      if (!isEnabled || !settings.showSFP) {
        clearSfpDrawings(workspace);
        setStatuses([]);
        return;
      }

      const requestFingerprint = `${symbol}-${timeframe}-${JSON.stringify(settings)}-${replayMode}`;
      if (!force && lastFetchRef.current === requestFingerprint) {
        return;
      }
      lastFetchRef.current = requestFingerprint;

      setIsLoading(true);

      try {
        await workspace.chart.ready();

        const cleanSymbol = symbol.includes(':') ? symbol.split(':').pop()! : symbol;

        // Fetch calculations from protected server-side API route
        const res = await fetch('/api/indicator/sfp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            symbol: cleanSymbol,
            timeframe,
            settings,
          }),
        });

        if (!res.ok) {
          throw new Error(`SFP calculation request failed: ${res.statusText}`);
        }

        const data = await res.json();
        if (!data.success) {
          throw new Error(data.error || 'Failed to calculate SFP');
        }

        // 1. Remove previous SFP drawings
        clearSfpDrawings(workspace);

        // 2. Render new drawings onto Vela chart
        const newIds: string[] = [];
        if (Array.isArray(data.drawings) && (workspace.chart as any).drawings) {
          for (const d of data.drawings as SfpDrawing[]) {
            try {
              const drawingOptions: any = {
                anchors: d.anchors,
                style: d.style,
              };
              if (d.text) {
                drawingOptions.text = d.text;
              }
              const created = (workspace.chart.drawings as any).add(d.type, drawingOptions);
              if (created && (created as any).id) {
                newIds.push((created as any).id);
              }
            } catch (dErr) {
              console.warn('[useSfpIndicator] Failed to add drawing item:', dErr);
            }
          }
        }

        sfpDrawingIdsRef.current = newIds;
        setStatuses(data.dashboard || []);
        setStats(data.stats || null);
      } catch (err) {
        console.error('[useSfpIndicator] Calculation & rendering error:', err);
      } finally {
        setIsLoading(false);
      }
    },
    [workspace, symbol, timeframe, isEnabled, settings, replayMode, clearSfpDrawings]
  );

  // Trigger calculation when workspace, symbol, timeframe, or settings update
  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (workspace && !cancelled) {
        await calculateAndRender(true);
      }
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [workspace, symbol, timeframe, isEnabled, settings, calculateAndRender]);

  // Clean up drawings on unmount
  useEffect(() => {
    return () => {
      if (workspace) {
        clearSfpDrawings(workspace);
      }
    };
  }, [workspace, clearSfpDrawings]);

  return {
    isEnabled,
    toggleEnabled,
    isSettingsOpen,
    openSettings: () => setIsSettingsOpen(true),
    closeSettings: () => setIsSettingsOpen(false),
    settings,
    updateSettings,
    statuses,
    stats,
    isLoading,
    refresh: () => calculateAndRender(true),
  };
}
