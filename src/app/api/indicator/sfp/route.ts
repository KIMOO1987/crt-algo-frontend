import { NextRequest, NextResponse } from 'next/server';
import { calculateSFP, SfpSettings } from '@/server/indicators/sfp-engine';
import { fetchMarketCandles } from '@/lib/market-data';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { symbol, timeframe = '15', settings = {} } = body;
    let bars = body.bars;

    // If client didn't supply candles directly, fetch server-side
    if (!bars || !Array.isArray(bars) || bars.length === 0) {
      if (!symbol) {
        return NextResponse.json(
          { error: 'Either bars array or a symbol is required' },
          { status: 400 }
        );
      }

      const cleanSymbol = symbol.includes(':') ? symbol.split(':').pop()! : symbol;
      const rawCandles = await fetchMarketCandles(cleanSymbol, timeframe, { limit: 2500 });

      if (rawCandles && Array.isArray(rawCandles)) {
        bars = rawCandles.map((c: any) => ({
          time: Number(c.time) < 1e11 ? Number(c.time) * 1000 : Number(c.time),
          open: Number(c.open),
          high: Number(c.high),
          low: Number(c.low),
          close: Number(c.close),
          volume: Number(c.volume || 0),
        }));
      } else {
        bars = [];
      }
    }

    // Execute server-side SFP calculation engine
    const result = calculateSFP(bars, settings as Partial<SfpSettings>);

    return NextResponse.json({
      success: true,
      symbol,
      timeframe,
      barsEvaluated: bars.length,
      drawings: result.drawings,
      dashboard: result.dashboard,
      stats: result.stats,
    });
  } catch (error: any) {
    console.error('[API/indicator/sfp] Calculation error:', error);
    return NextResponse.json(
      {
        error: 'Failed to calculate SFP indicator',
        message: error?.message || String(error),
      },
      { status: 500 }
    );
  }
}
