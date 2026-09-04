import { normalizeSymbol } from './symbol-mapper';

/**
 * Fetches candle data from our local Yahoo Proxy to avoid CORS issues.
 */
export function mapToYahooSymbol(symbol: string): string {
  const clean = normalizeSymbol(symbol);

  // Metals
  if (['XAUUSD', 'GOLD', 'XAU'].includes(clean)) return 'GC=F';
  if (['XAGUSD', 'SILVER', 'XAG'].includes(clean)) return 'SI=F';
  if (clean === 'XPTUSD') return 'PL=F';
  if (clean === 'XCUUSD') return 'HG=F';

  // Indices
  if (['US100', 'NAS100', 'NDX', 'USTEC'].includes(clean)) return '^NDX';
  if (['US500', 'SPX', 'SPX500'].includes(clean)) return '^GSPC';
  if (['US30', 'DJI', 'WALLSTREET'].includes(clean)) return '^DJI';
  if (['GER40', 'DAX'].includes(clean)) return '^GDAXI';
  if (['UK100', 'FTSE'].includes(clean)) return '^FTSE';

  // Forex
  const forexPairs = [
    'EURUSD', 'GBPUSD', 'USDJPY', 'GBPJPY', 'AUDUSD', 'EURJPY',
    'NZDUSD', 'CHFJPY', 'USDCAD', 'USDCHF', 'GBPAUD', 'EURAUD'
  ];
  if (forexPairs.includes(clean)) return `${clean}=X`;

  if (!clean.includes('=X') && clean.length === 6 && !clean.endsWith('USD')) {
    return `${clean}=X`;
  }

  return clean;
}

export function mapIntervalToYahoo(timeframe: string): string {
  const t = (timeframe || '5').trim().toLowerCase();
  if (t === '1' || t === '1m') return '1m';
  if (t === '2' || t === '2m') return '2m';
  if (t === '3' || t === '3m' || t === '5' || t === '5m') return '5m';
  if (t === '15' || t === '15m') return '15m';
  if (t === '30' || t === '30m') return '30m';
  if (t === '60' || t === '1h') return '60m';
  if (t === '120' || t === '2h' || t === '240' || t === '4h') return '60m';
  if (t === 'd' || t === '1d') return '1d';
  if (t === 'w' || t === '1w') return '1wk';
  return '5m';
}

/**
 * Fetches latest market quote via Yahoo Proxy (no API key needed)
 */
export async function fetchYahooQuote(symbol: string): Promise<number | null> {
  const yahooSymbol = mapToYahooSymbol(symbol);
  try {
    const url = `/api/yahoo?symbol=${encodeURIComponent(yahooSymbol)}&interval=1m&range=1d`;
    const response = await fetch(url);
    if (!response.ok) return null;
    const data = await response.json();
    const result = data?.chart?.result?.[0];
    if (!result) return null;

    if (result.meta?.regularMarketPrice) {
      return Number(result.meta.regularMarketPrice);
    }

    const quotes = result.indicators?.quote?.[0];
    if (quotes?.close && quotes.close.length > 0) {
      for (let i = quotes.close.length - 1; i >= 0; i--) {
        if (quotes.close[i] !== null && !isNaN(quotes.close[i])) {
          return Number(quotes.close[i]);
        }
      }
    }
    return null;
  } catch (err) {
    return null;
  }
}

/**
 * Fetches candle data from our local Yahoo Proxy with deep historical reach.
 */
export async function fetchYahooCandles(
  symbol: string,
  timeframe: string = '5',
  opts?: { from?: number; to?: number; range?: string }
) {
  const yahooSymbol = mapToYahooSymbol(symbol);
  const interval = mapIntervalToYahoo(timeframe);

  let query = `symbol=${encodeURIComponent(yahooSymbol)}&interval=${interval}`;
  if (opts?.from && opts?.to) {
    const p1 = Math.floor(opts.from / 1000);
    const p2 = Math.floor(opts.to / 1000);
    query += `&period1=${p1}&period2=${p2}`;
  } else if (opts?.range) {
    query += `&range=${opts.range}`;
  }

  try {
    const url = `/api/yahoo?${query}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();

    if (data.error) throw new Error(data.error);

    const result = data?.chart?.result?.[0];
    if (!result || !result.timestamp || !result.indicators?.quote?.[0]) return [];

    const timestamps = result.timestamp;
    const quotes = result.indicators.quote[0];

    const candles: any[] = [];
    for (let i = 0; i < timestamps.length; i++) {
      const open = quotes.open[i];
      const high = quotes.high[i];
      const low = quotes.low[i];
      const close = quotes.close[i];

      if (open !== null && high !== null && low !== null && close !== null && !isNaN(close)) {
        candles.push({
          time: timestamps[i],
          open: Number(open),
          high: Number(high),
          low: Number(low),
          close: Number(close),
          volume: quotes.volume?.[i] ? Number(quotes.volume[i]) : undefined,
        });
      }
    }

    return candles;
  } catch (err) {
    console.warn(`[Yahoo Proxy] Failed to fetch candles for ${symbol}:`, err);
    return [];
  }
}
