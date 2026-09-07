import { NextResponse } from 'next/server';
import { computeCrtIndicator, CrtBar } from '@/lib/indicators/crt-engine';
import { fetchMarketCandles } from '@/lib/market-data';
import { getSymbolCategory, normalizeSymbol, SYMBOL_MAP } from '@/lib/symbol-mapper';

// Mark as dynamic so Next.js does not pre-render at build time
export const dynamic = 'force-dynamic';

/**
 * Normalizes timeframe string to standard minutes/hours format
 */
function normalizeTf(tf?: string): string {
  if (!tf) return '5';
  const clean = tf.toUpperCase().trim();
  if (clean === '1D' || clean === 'D') return 'D';
  if (clean === '1W' || clean === 'W') return 'W';
  if (clean === '1M' || clean === 'M') return 'M';
  return clean.replace(/[^0-9]/g, '') || '5';
}

/**
 * Fallback to fetch candles if client didn't supply them in request
 */
async function getFallbackCandles(symbol: string, timeframe: string): Promise<CrtBar[]> {
  const cleanSym = normalizeSymbol(symbol);
  const category = getSymbolCategory(cleanSym);

  // 1. Try Binance for Crypto
  if (category === 'CRYPTO') {
    const binanceTicker =
      SYMBOL_MAP[cleanSym]?.binance ||
      (cleanSym.endsWith('USD') ? cleanSym + 'T' : cleanSym.endsWith('USDT') ? cleanSym : `${cleanSym}USDT`);

    const tfMap: Record<string, string> = {
      '1': '1m', '3': '3m', '5': '5m', '15': '15m', '30': '30m',
      '60': '1h', '120': '2h', '240': '4h', 'D': '1d', 'W': '1w',
    };
    const interval = tfMap[timeframe] || '5m';

    try {
      const endpoints = [
        `https://fapi.binance.com/fapi/v1/klines?symbol=${binanceTicker}&interval=${interval}&limit=300`,
        `https://api.binance.com/api/v3/klines?symbol=${binanceTicker}&interval=${interval}&limit=300`,
      ];

      for (const url of endpoints) {
        try {
          const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
          if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data) && data.length > 0) {
              return data.map((d: any) => ({
                time: Number(d[0]),
                open: parseFloat(d[1]),
                high: parseFloat(d[2]),
                low: parseFloat(d[3]),
                close: parseFloat(d[4]),
                volume: parseFloat(d[5]),
              }));
            }
          }
        } catch (_) {}
      }
    } catch (_) {}
  }

  // 2. Multi-asset fallback (Forex/Metals/Indices/Yahoo)
  try {
    const candles = await fetchMarketCandles(cleanSym, timeframe, { limit: 300 });
    if (candles && candles.length > 0) {
      return candles.map((c: any) => ({
        time: Number(c.time) < 1e11 ? Number(c.time) * 1000 : Number(c.time),
        open: Number(c.open),
        high: Number(c.high),
        low: Number(c.low),
        close: Number(c.close),
        volume: c.volume ? Number(c.volume) : undefined,
      }));
    }
  } catch (err) {
    console.error(`[api/indicators/crt] Fallback candle fetch failed for ${symbol}:`, err);
  }

  return [];
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const symbol = body.symbol || 'BTCUSDT';
    const timeframe = normalizeTf(body.timeframe);
    let bars: CrtBar[] = Array.isArray(body.bars) ? body.bars : [];

    // Ensure valid bar structure
    if (bars.length > 0) {
      bars = bars
        .filter((b) => b && typeof b.close === 'number' && !isNaN(b.close) && b.time)
        .map((b) => ({
          time: Number(b.time) < 1e11 ? Number(b.time) * 1000 : Number(b.time),
          open: Number(b.open),
          high: Number(b.high),
          low: Number(b.low),
          close: Number(b.close),
          volume: b.volume !== undefined ? Number(b.volume) : undefined,
        }));
    }

    if (bars.length < 10) {
      bars = await getFallbackCandles(symbol, timeframe);
    }

    if (bars.length < 10) {
      return NextResponse.json(
        { success: false, error: `Insufficient bar data for ${symbol} (${bars.length} bars)` },
        { status: 400 }
      );
    }

    const result = await computeCrtIndicator(symbol, timeframe, bars);

    return NextResponse.json({
      success: true,
      symbol,
      timeframe,
      barsCount: bars.length,
      cached: result.cached || false,
      model: {
        panes: result.panes || [],
        series: result.series || [],
        fills: result.fills || [],
        backgrounds: result.backgrounds || [],
        priceLines: result.priceLines || [],
        boxes: result.boxes || [],
        lines: result.lines || [],
        labels: result.labels || [],
        polylines: result.polylines || [],
        linefills: result.linefills || [],
        tables: result.tables || [],
      },
    });
  } catch (error: any) {
    console.error('[api/indicators/crt] Indicator compute error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to compute indicator' },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get('symbol') || 'BTCUSDT';
    const timeframe = normalizeTf(searchParams.get('timeframe') || '5');

    const bars = await getFallbackCandles(symbol, timeframe);
    if (bars.length < 10) {
      return NextResponse.json(
        { success: false, error: `Insufficient bar data for ${symbol} (${bars.length} bars)` },
        { status: 400 }
      );
    }

    const result = await computeCrtIndicator(symbol, timeframe, bars);

    return NextResponse.json({
      success: true,
      symbol,
      timeframe,
      barsCount: bars.length,
      cached: result.cached || false,
      model: {
        panes: result.panes || [],
        series: result.series || [],
        fills: result.fills || [],
        backgrounds: result.backgrounds || [],
        priceLines: result.priceLines || [],
        boxes: result.boxes || [],
        lines: result.lines || [],
        labels: result.labels || [],
        polylines: result.polylines || [],
        linefills: result.linefills || [],
        tables: result.tables || [],
      },
    });
  } catch (error: any) {
    console.error('[api/indicators/crt] GET error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to compute indicator' },
      { status: 500 }
    );
  }
}
