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
  { ticker: 'XPTUSD', description: 'Platinum / US Dollar', type: 'metals', prefix: 'FOREX' },
  { ticker: 'XCUUSD', description: 'Copper / US Dollar', type: 'metals', prefix: 'FOREX' },

  // Forex
  { ticker: 'EURUSD', description: 'Euro / US Dollar', type: 'forex', prefix: 'FX' },
  { ticker: 'GBPUSD', description: 'British Pound / US Dollar', type: 'forex', prefix: 'FX' },
  { ticker: 'USDJPY', description: 'US Dollar / Japanese Yen', type: 'forex', prefix: 'FX' },
  { ticker: 'AUDUSD', description: 'Australian Dollar / US Dollar', type: 'forex', prefix: 'FX' },
  { ticker: 'GBPJPY', description: 'British Pound / Japanese Yen', type: 'forex', prefix: 'FX' },
  { ticker: 'EURJPY', description: 'Euro / Japanese Yen', type: 'forex', prefix: 'FX' },
  { ticker: 'USDCAD', description: 'US Dollar / Canadian Dollar', type: 'forex', prefix: 'FX' },
  { ticker: 'USDCHF', description: 'US Dollar / Swiss Franc', type: 'forex', prefix: 'FX' },
  { ticker: 'NZDUSD', description: 'New Zealand Dollar / US Dollar', type: 'forex', prefix: 'FX' },
  { ticker: 'CHFJPY', description: 'Swiss Franc / Japanese Yen', type: 'forex', prefix: 'FX' },
  { ticker: 'GBPAUD', description: 'British Pound / Australian Dollar', type: 'forex', prefix: 'FX' },
  { ticker: 'EURAUD', description: 'Euro / Australian Dollar', type: 'forex', prefix: 'FX' },

  // Indices
  { ticker: 'US100', description: 'Nasdaq 100 Index', type: 'indices', prefix: 'INDEX' },
  { ticker: 'US500', description: 'S&P 500 Index', type: 'indices', prefix: 'INDEX' },
  { ticker: 'US30', description: 'Dow Jones Industrial Average', type: 'indices', prefix: 'INDEX' },
  { ticker: 'GER40', description: 'Germany 40 DAX Index', type: 'indices', prefix: 'INDEX' },
  { ticker: 'UK100', description: 'FTSE 100 Index', type: 'indices', prefix: 'INDEX' },
];

export class MultiAssetProvider {
  info() {
    return {
      name: 'multiasset',
      displayName: 'Global Markets (Forex/Metals/Indices)',
      supportedTimeframes: ['1', '3', '5', '15', '30', '60', '120', '240', 'D', 'W'],
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

  async getSymbolInfo(ticker: string) {
    const clean = normalizeSymbol(ticker);
    const category = getSymbolCategory(clean);
    const s = SYMBOLS.find((x) => x.ticker === clean) || {
      ticker: clean,
      description: `${clean} (${category})`,
      type: category.toLowerCase(),
      prefix: category === 'FOREX' ? 'FX' : category === 'METALS' ? 'FOREX' : 'INDEX',
    };

    let tickSize = 0.00001;
    let priceScale = 100000;

    if (category === 'METALS') {
      tickSize = 0.01;
      priceScale = 100;
    } else if (category === 'INDICES') {
      tickSize = 0.1;
      priceScale = 10;
    } else if (clean.includes('JPY')) {
      tickSize = 0.001;
      priceScale = 1000;
    }

    return {
      ticker: clean,
      tickerid: `MULTIASSET:${clean}`,
      prefix: s.prefix || 'MARKETS',
      description: s.description || clean,
      type: s.type || 'forex',
      basecurrency: clean.slice(0, 3),
      currency: clean.slice(3) || 'USD',
      mintick: tickSize,
      pricescale: priceScale,
      timezone: 'Etc/UTC',
      session: '24x7',
    };
  }

  async getBars(ticker: string, timeframe: string, range: BarRange): Promise<OHLCV[]> {
    const clean = normalizeSymbol(ticker);

    try {
      const rawCandles = await fetchMarketCandles(clean, timeframe, {
        from: range.from,
        to: range.to,
        limit: range.limit || 5000,
      });

      if (!rawCandles || !Array.isArray(rawCandles)) return [];

      const bars: OHLCV[] = rawCandles.map((c: any) => ({
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
