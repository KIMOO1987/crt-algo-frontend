"use client";

import { useEffect, useRef, useState } from 'react';
import { createChart, ColorType, LineStyle, CandlestickSeries } from 'lightweight-charts';
import { normalizeSymbol, getSymbolCategory, SYMBOL_MAP } from '@/lib/symbol-mapper';

export default function SignalChart({ symbol, signal, onLoaded }: { symbol: string, signal?: any, onLoaded?: () => void }) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      layout: { background: { type: ColorType.Solid, color: '#05070a' }, textColor: '#d1d5db', fontSize: 11 },
      grid: { vertLines: { color: 'rgba(255, 255, 255, 0.02)' }, horzLines: { color: 'rgba(255, 255, 255, 0.02)' } },
      crosshair: { mode: 1 },
      timeScale: { timeVisible: true, secondsVisible: false },
      width: chartContainerRef.current.clientWidth,
      height: chartContainerRef.current.clientHeight,
    });

    const series = chart.addSeries(CandlestickSeries, {
      upColor: '#10b981', downColor: '#ef4444', borderVisible: false,
      wickUpColor: '#10b981', wickDownColor: '#ef4444',
    });

    // --- ADD PRICE LINES ---
    if (signal) {
      const entry = Number(signal.entry_price);
      const tp1 = Number(signal.tp);
      const tp2 = Number(signal.tp_secondary);
      let sl = Number(signal.sl);
      const isTp1Hit = signal.status?.includes('TP1') || signal.status === 'WIN';
      if (isTp1Hit && entry) sl = entry;

      if (entry) series.createPriceLine({ price: entry, color: '#3b82f6', lineWidth: 2, lineStyle: LineStyle.Dotted, title: 'ENTRY', axisLabelVisible: true });
      if (tp1) series.createPriceLine({ price: tp1, color: '#10b981', lineWidth: 2, lineStyle: LineStyle.Dashed, title: 'TP1', axisLabelVisible: true });
      if (tp2) series.createPriceLine({ price: tp2, color: '#eab308', lineWidth: 2, lineStyle: LineStyle.Dashed, title: 'TP2', axisLabelVisible: true });
      if (sl) series.createPriceLine({ price: sl, color: '#ef4444', lineWidth: 2, lineStyle: LineStyle.Solid, title: isTp1Hit ? 'SL (BE)' : 'SL', axisLabelVisible: true });
    }

    const fetchData = async () => {
      setLoading(true);
      try {
        const { fetchMarketCandles } = await import('@/lib/market-data');
        const formattedData = await fetchMarketCandles(symbol, '5', 500);

        if (formattedData.length > 0) {
          series.setData(formattedData);
          chart.timeScale().fitContent();
        } else {
          // Final Fallback: Show Levels on Empty Grid
          const now = Math.floor(Date.now() / 1000);
          series.setData([{ time: now, open: 0, high: 0, low: 0, close: 0 } as any]);
          chart.timeScale().setVisibleRange({ from: (now - 3600) as any, to: (now + 3600) as any });
        }
      } catch (err) {
        console.error("[Chart] Fatal fetch error:", err);
      } finally {
        setLoading(false);
        if (onLoaded) onLoaded();
      }
    };

    fetchData();

    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({ width: chartContainerRef.current.clientWidth, height: chartContainerRef.current.clientHeight });
      }
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, [symbol, signal]);

  return (
    <div className="w-full h-[400px] md:h-[500px] lg:h-full lg:min-h-[450px] relative bg-[#05070a] group overflow-hidden">
      {loading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-[#05070a]/50 backdrop-blur-sm">
          <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}


      <div ref={chartContainerRef} className="w-full h-full" />
    </div>
  );
}