/**
 * MultiAsset DataProvider for Vela Charting Engine
 * Connects Forex, Metals (Gold/Silver), and Indices using CRT-Algo's existing
 * FCS API, GoldAPI, EODHD, and Yahoo Finance services.
 */

import { fetchMarketCandles } from '@/lib/market-data';
import { getSymbolCategory, normalizeSymbol } from '@/lib/symbol-mapper';

export interface OHLCV {
  time: number; // epoch ms
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

export interface BarRange {
  from: number;
  to: number;
  limit?: number;
}

export interface SymbolDescriptor {
  ticker: string;
  description?: string;
  type?: string;
  prefix?: string;
  provider?: string;
}

const SYMBOLS: SymbolDescriptor[] = [
  // Metals
  { ticker: 'XAUUSD', description: 'Gold / US Dollar', type: 'metals', prefix: 'FOREX' },
  { ticker: 'XAGUSD', description: 'Silver / US Dollar', type: 'metals', prefix: 'FOREX' },

  // Forex
  { ticker: 'EURUSD', description: 'Euro / US Dollar', type: 'forex', prefix: 'FX' },
  { ticker: 'GBPUSD', description: 'British Pound / US Dollar', type: 'forex', prefix: 'FX' },
  { ticker: 'USDJPY', description: 'US Dollar / Japanese Yen', type: 'forex', prefix: 'FX' },
  { ticker: 'AUDUSD', description: 'Australian Dollar / US Dollar', type: 'forex', prefix: 'FX' },
  { ticker: 'GBPJPY', description: 'British Pound / Japanese Yen', type: 'forex', prefix: 'FX' },
  { ticker: 'EURJPY', description: 'Euro / Japanese Yen', type: 'forex', prefix: 'FX' },
  { ticker: 'USDCAD', description: 'US Dollar / Canadian Dollar', type: 'forex', prefix: 'FX' },
  { ticker: 'USDCHF', description: 'US Dollar / Swiss Franc', type: 'forex', prefix: 'FX' },

  // Indices
  { ticker: 'US100', description: 'Nasdaq 100 Index', type: 'indices', prefix: 'INDEX' },
  { ticker: 'US500', description: 'S&P 500 Index', type: 'indices', prefix: 'INDEX' },
  { ticker: 'US30', description: 'Dow Jones Industrial Average', type: 'indices', prefix: 'INDEX' },
];

export class MultiAssetProvider {
  info() {
    return {
      name: 'multiasset',
      displayName: 'Global Markets (Forex/Metals/Indices)',
      supportedTimeframes: ['5', '15', '30', '60', '240', 'D'],
      capabilities: {
        enumerate: true,
        stream: false, // Polls getBars periodically
        symbolInfo: true,
      },
    };
  }

  async listSymbols(): Promise<SymbolDescriptor[]> {
    return SYMBOLS.map((s) => ({
      ...s,
      provider: 'multiasset',
    }));
  }

  async getBars(ticker: string, timeframe: string, range: BarRange): Promise<OHLCV[]> {
    const clean = normalizeSymbol(ticker);
    const limit = range.limit || 300;

    try {
      const rawCandles = await fetchMarketCandles(clean, timeframe, limit);
      if (!rawCandles || !Array.isArray(rawCandles)) return [];

      const bars: OHLCV[] = rawCandles.map((c: any) => ({
        // Ensure timestamp is in epoch milliseconds
        time: Number(c.time) < 1e11 ? Number(c.time) * 1000 : Number(c.time),
        open: Number(c.open),
        high: Number(c.high),
        low: Number(c.low),
        close: Number(c.close),
        volume: c.volume ? Number(c.volume) : undefined,
      }));

      // Deduplicate and sort ascending by open-time
      const map = new Map<number, OHLCV>();
      for (const b of bars) {
        if (!isNaN(b.time) && !isNaN(b.close)) {
          map.set(b.time, b);
        }
      }

      return Array.from(map.values()).sort((a, b) => a.time - b.time);
    } catch (err) {
      console.error(`[MultiAssetProvider] Error fetching bars for ${ticker}:`, err);
      return [];
    }
  }
}
