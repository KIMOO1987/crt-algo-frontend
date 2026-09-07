import { getMappedSymbol, getSymbolCategory, normalizeSymbol, SYMBOL_MAP } from './symbol-mapper';

// --- API KEYS ---
const FCS_API_KEY = process.env.NEXT_PUBLIC_FCS_API_KEY;
const GOLD_API_KEY = process.env.NEXT_PUBLIC_GOLD_API_KEY;
const EODHD_API_KEY = process.env.NEXT_PUBLIC_EODHD_API_KEY;
const ALPHA_VANTAGE_API_KEY = process.env.NEXT_PUBLIC_ALPHA_VANTAGE_API_KEY;

// --- PRICE CACHE (Last Available Price) ---
const priceCache: Record<string, number> = {};

/**
 * Unified interface for fetching a market quote with multi-provider fallback.
 */
export async function fetchMarketQuote(symbol: string) {
  const category = getSymbolCategory(symbol);
  const cleanSymbol = normalizeSymbol(symbol);

  let price: number | null = null;

  try {
    if (category === 'FOREX') {
      // Primary: FCS API
      price = await fetchFCSQuote(symbol);
      // Backup 1: Alpha Vantage
      if (price === null) price = await fetchAlphaVantageQuote(symbol);
      // Backup 2: Yahoo Finance (Reliable, no API key needed)
      if (price === null) {
        const { fetchYahooQuote } = await import('./yahoo-finance');
        price = await fetchYahooQuote(symbol);
      }
    } else if (category === 'METALS') {
      // Primary: GoldAPI
      price = await fetchGoldAPIQuote(symbol);
      // Backup 1: Alpha Vantage
      if (price === null) price = await fetchAlphaVantageQuote(symbol);
      // Backup 2: Yahoo Finance (Reliable, no API key needed)
      if (price === null) {
        const { fetchYahooQuote } = await import('./yahoo-finance');
        price = await fetchYahooQuote(symbol);
      }
    } else if (category === 'INDICES') {
      // Primary: EODHD
      price = await fetchEODHDQuote(symbol);
      // Backup 1: Alpha Vantage
      if (price === null) price = await fetchAlphaVantageQuote(symbol);
      // Backup 2: Yahoo Finance (Reliable, no API key needed)
      if (price === null) {
        const { fetchYahooQuote } = await import('./yahoo-finance');
        price = await fetchYahooQuote(symbol);
      }
    } else {
      // General Backup (Crypto/Other)
      // Primary for Crypto: Binance
      const clean = normalizeSymbol(symbol);
      const binanceTicker = SYMBOL_MAP[clean]?.binance || (clean.endsWith('USD') ? clean + 'T' : clean + 'USDT');
      try {
        const res = await fetch(`https://api.binance.com/api/v3/ticker/price?symbol=${binanceTicker}`);
        if (res.ok) {
          const data = await res.json();
          if (data.price) price = parseFloat(data.price);
        }
      } catch (err) {}
    }
  } catch (err) {
    console.error(`[MarketData] Error fetching quote for ${symbol}:`, err);
  }

  // Update Cache if we have a price, otherwise return cached
  if (price !== null) {
    priceCache[cleanSymbol] = price;
    return price;
  }

  return priceCache[cleanSymbol] || null;
}

/**
 * Unified interface for fetching candles with deep historical fallback.
 */
export async function fetchMarketCandles(
  symbol: string,
  interval: string = '5',
  opts?: { from?: number; to?: number; limit?: number }
) {
  const category = getSymbolCategory(symbol);
  let candles: any[] = [];

  try {
    // 1. Forex, Metals, and Indices -> Yahoo Finance with deep historical candles
    if (category === 'FOREX' || category === 'METALS' || category === 'INDICES') {
      const { fetchYahooCandles } = await import('./yahoo-finance');
      candles = await fetchYahooCandles(symbol, interval, opts);
      if (candles.length > 0) return candles;
    }

    // 2. Fallback to EODHD for indices if configured
    if (category === 'INDICES') {
      candles = await fetchEODHDCandles(symbol, interval, opts?.limit || 500);
      if (candles.length > 0) return candles;
    }

    // 3. Fallback to Yahoo Finance for any other asset
    if (candles.length === 0) {
      try {
        const { fetchYahooCandles } = await import('./yahoo-finance');
        candles = await fetchYahooCandles(symbol, interval, opts);
        if (candles.length > 0) return candles;
      } catch (err) {}
    }

    // 4. Fallback to Binance (ONLY for Crypto - NEVER for Forex/Metals/Indices)
    if (candles.length === 0 && category === 'CRYPTO') {
      const clean = normalizeSymbol(symbol);
      const binanceTicker = SYMBOL_MAP[clean]?.binance || (clean.endsWith('USD') ? clean + 'T' : clean + 'USDT');
      const limit = opts?.limit || 1000;
      const endpoints = [
        `https://api.binance.com/api/v3/klines?symbol=${binanceTicker}&interval=5m&limit=${limit}`,
        `https://fapi.binance.com/fapi/v1/klines?symbol=${binanceTicker}&interval=5m&limit=${limit}`
      ];
      for (const url of endpoints) {
        try {
          const res = await fetch(url);
          if (!res.ok) continue;
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            candles = data.map((d: any) => ({
              time: d[0] / 1000,
              open: parseFloat(d[1]), high: parseFloat(d[2]), low: parseFloat(d[3]), close: parseFloat(d[4]),
            }));
            break;
          }
        } catch (err) {}
      }
    }
  } catch (err) {
    console.error(`[MarketData] Error fetching candles for ${symbol}:`, err);
  }

  return candles;
}

// --- PROVIDER IMPLEMENTATIONS ---

async function fetchFCSQuote(symbol: string) {
  const fcsSymbol = getMappedSymbol(symbol, 'fcs');
  if (!FCS_API_KEY || !fcsSymbol) return null;
  try {
    const res = await fetch(`https://fcsapi.com/api-v3/forex/latest?symbol=${fcsSymbol}&access_key=${FCS_API_KEY}`);
    const data = await res.json();
    if (data.status && data.response?.[0]) {
      return parseFloat(data.response[0].c);
    }
    return null;
  } catch (err) { return null; }
}

async function fetchGoldAPIQuote(symbol: string) {
  const goldSymbol = getMappedSymbol(symbol, 'goldapi');
  if (!GOLD_API_KEY || !goldSymbol) return null;
  try {
    const res = await fetch(`https://www.goldapi.io/api/${goldSymbol}/USD`, {
      headers: { 'x-access-token': GOLD_API_KEY }
    });
    const data = await res.json();
    return data.price || null;
  } catch (err) { return null; }
}

async function fetchEODHDQuote(symbol: string) {
  const eodSymbol = getMappedSymbol(symbol, 'eodhd');
  if (!EODHD_API_KEY || !eodSymbol) return null;
  try {
    const res = await fetch(`https://eodhd.com/api/real-time/${eodSymbol}?api_token=${EODHD_API_KEY}&fmt=json`);
    const data = await res.json();
    return data.close || data.price || null;
  } catch (err) { return null; }
}

async function fetchAlphaVantageQuote(symbol: string) {
  const avSymbol = getMappedSymbol(symbol, 'alphavantage');
  if (!ALPHA_VANTAGE_API_KEY || !avSymbol) return null;
  try {
    // Alpha Vantage uses different functions for Forex vs Stock/Indices
    const category = getSymbolCategory(symbol);
    const func = category === 'FOREX' ? 'CURRENCY_EXCHANGE_RATE' : 'GLOBAL_QUOTE';
    const params = category === 'FOREX' 
      ? `from_currency=${avSymbol.substring(0,3)}&to_currency=${avSymbol.substring(3)}`
      : `symbol=${avSymbol}`;

    const res = await fetch(`https://www.alphavantage.co/query?function=${func}&${params}&apikey=${ALPHA_VANTAGE_API_KEY}`);
    const data = await res.json();
    
    if (category === 'FOREX') {
      return parseFloat(data['Realtime Currency Exchange Rate']?.['5. Exchange Rate']) || null;
    } else {
      return parseFloat(data['Global Quote']?.['05. price']) || null;
    }
  } catch (err) { return null; }
}

async function fetchEODHDCandles(symbol: string, interval: string, limit: number) {
  const eodSymbol = getMappedSymbol(symbol, 'eodhd');
  if (!EODHD_API_KEY || !eodSymbol) return [];
  try {
    // EODHD interval: m, h, d
    const res = await fetch(`https://eodhd.com/api/intraday/${eodSymbol}?api_token=${EODHD_API_KEY}&interval=5m&fmt=json`);
    const data = await res.json();
    if (Array.isArray(data)) {
      return data.slice(-limit).map(d => ({
        time: d.timestamp,
        open: d.open,
        high: d.high,
        low: d.low,
        close: d.close
      }));
    }
    return [];
  } catch (err) { return []; }
}
