import { getMappedSymbol, getSymbolCategory, normalizeSymbol } from './symbol-mapper';

const FINNHUB_KEY = 'd78oc2pr01qp0fl5vgi0d78oc2pr01qp0fl5vgig';

/**
 * Fetches current quote for a symbol from Finnhub.
 */
export async function fetchFinnhubQuote(symbol: string) {
  const finnhubSymbol = getMappedSymbol(symbol, 'finnhub');
  try {
    const response = await fetch(`https://finnhub.io/api/v1/quote?symbol=${finnhubSymbol}&token=${FINNHUB_KEY}`);
    const data = await response.json();
    if (data.c) {
      return {
        price: data.c,
        change: data.d,
        percent: data.dp,
        high: data.h,
        low: data.l,
        open: data.o
      };
    }
    return null;
  } catch (err) {
    console.error(`Finnhub Quote Fetch Error for ${symbol}:`, err);
    return null;
  }
}

/**
 * Fetches candle data from Finnhub.
 */
export async function fetchFinnhubCandles(symbol: string, interval: string = '5', limit: number = 500) {
  const finnhubSymbol = getMappedSymbol(symbol, 'finnhub');
  const category = getSymbolCategory(symbol);
  
  const endpoint = category === 'FOREX' || category === 'METALS' 
    ? 'forex/candle' 
    : category === 'CRYPTO' 
      ? 'crypto/candle' 
      : 'stock/candle';

  const to = Math.floor(Date.now() / 1000); // UNIX SECONDS
  const intervalSeconds = interval === 'D' ? 86400 : (parseInt(interval) * 60 || 300);
  const from = to - (intervalSeconds * limit);

  try {
    const url = `https://finnhub.io/api/v1/${endpoint}?symbol=${encodeURIComponent(finnhubSymbol)}&resolution=${interval}&from=${from}&to=${to}&token=${FINNHUB_KEY}`;
    const response = await fetch(url);
    const data = await response.json();

    console.log(`[Finnhub Candle Response for ${symbol}]:`, data);

    if (data.s === 'ok') {
      return data.t.map((t: number, i: number) => ({
        time: t,
        open: data.o[i],
        high: data.h[i],
        low: data.l[i],
        close: data.c[i],
      }));
    }
    return [];
  } catch (err) {
    console.error(`Finnhub Candle Fetch Error for ${symbol}:`, err);
    return [];
  }
}
