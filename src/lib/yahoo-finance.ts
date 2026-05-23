import { normalizeSymbol } from './symbol-mapper';

/**
 * Fetches candle data from our local Yahoo Proxy to avoid CORS issues.
 */
export async function fetchYahooCandles(symbol: string, interval: string = '5m', range: string = '5d') {
  const clean = normalizeSymbol(symbol);
  
  // Map internal symbol to Yahoo Ticker
  let yahooSymbol = clean;
  if (['XAUUSD', 'GOLD'].includes(clean)) yahooSymbol = 'GC=F';
  else if (['XAGUSD', 'SILVER'].includes(clean)) yahooSymbol = 'SI=F';
  else if (clean === 'US100') yahooSymbol = '%5ENDX';
  else if (clean === 'US500') yahooSymbol = '%5EGSPC';
  else if (clean === 'US30') yahooSymbol = '%5EDJI';
  else if (!clean.includes('=X')) {
    const forexPairs = ['EURUSD', 'GBPUSD', 'USDJPY', 'GBPJPY', 'AUDUSD', 'EURJPY', 'NZDUSD', 'CHFJPY', 'USDCAD', 'USDCHF'];
    if (forexPairs.includes(clean)) yahooSymbol = `${clean}=X`;
  }

  try {
    // CALL OUR INTERNAL PROXY ROUTE
    const url = `/api/yahoo?symbol=${yahooSymbol}&interval=${interval}&range=${range}`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.error) throw new Error(data.error);

    const result = data.chart.result[0];
    const timestamps = result.timestamp;
    const quotes = result.indicators.quote[0];

    return timestamps.map((t: number, i: number) => ({
      time: t,
      open: quotes.open[i],
      high: quotes.high[i],
      low: quotes.low[i],
      close: quotes.close[i],
    })).filter((candle: any) => candle.open !== null);
  } catch (err) {
    console.warn(`[Yahoo Proxy] Failed to fetch candles for ${symbol}:`, err);
    return [];
  }
}
