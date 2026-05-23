export interface SymbolMapEntry {
  tradingview: string;
  finnhub: string;
  oanda: string;
  forexcom: string;
  binance?: string;
  fcs?: string;
  goldapi?: string;
  eodhd?: string;
  alphavantage?: string;
  yahoo?: string;
}

export const SYMBOL_MAP: Record<string, SymbolMapEntry> = {
  // --- FOREX ---
  "EURUSD": { "tradingview": "FX:EURUSD", "oanda": "EURUSD", "forexcom": "EURUSD", "fcs": "EUR/USD", "alphavantage": "EURUSD", "finnhub": "" },
  "GBPUSD": { "tradingview": "FX:GBPUSD", "oanda": "GBPUSD", "forexcom": "GBPUSD", "fcs": "GBP/USD", "alphavantage": "GBPUSD", "finnhub": "" },
  "USDJPY": { "tradingview": "FX:USDJPY", "oanda": "USDJPY", "forexcom": "USDJPY", "fcs": "USD/JPY", "alphavantage": "USDJPY", "finnhub": "" },
  "GBPJPY": { "tradingview": "FX:GBPJPY", "oanda": "GBPJPY", "forexcom": "GBPJPY", "fcs": "GBP/JPY", "alphavantage": "GBPJPY", "finnhub": "" },
  "AUDUSD": { "tradingview": "FX:AUDUSD", "oanda": "AUDUSD", "forexcom": "AUDUSD", "fcs": "AUD/USD", "alphavantage": "AUDUSD", "finnhub": "" },
  "EURJPY": { "tradingview": "FX:EURJPY", "oanda": "EURJPY", "forexcom": "EURJPY", "fcs": "EUR/JPY", "alphavantage": "EURJPY", "finnhub": "" },
  "NZDUSD": { "tradingview": "FX:NZDUSD", "oanda": "NZDUSD", "forexcom": "NZDUSD", "fcs": "NZD/USD", "alphavantage": "NZDUSD", "finnhub": "" },
  "CHFJPY": { "tradingview": "FX:CHFJPY", "oanda": "CHFJPY", "forexcom": "CHFJPY", "fcs": "CHF/JPY", "alphavantage": "CHFJPY", "finnhub": "" },
  "USDCAD": { "tradingview": "FX:USDCAD", "oanda": "USDCAD", "forexcom": "USDCAD", "fcs": "USD/CAD", "alphavantage": "USDCAD", "finnhub": "" },
  "USDCHF": { "tradingview": "FX:USDCHF", "oanda": "USDCHF", "forexcom": "USDCHF", "fcs": "USD/CHF", "alphavantage": "USDCHF", "finnhub": "" },

  // --- INDICES ---
  "US100": { "tradingview": "NASDAQ:NDX", "oanda": "NAS100", "forexcom": "US100", "eodhd": "NDX.INDX", "yahoo": "^IXIC", "finnhub": "" },
  "US500": { "tradingview": "SP:SPX", "oanda": "US500", "forexcom": "US500", "eodhd": "GSPC.INDX", "yahoo": "^GSPC", "finnhub": "" },
  "US30": { "tradingview": "TVC:DJI", "oanda": "US30", "forexcom": "US30", "eodhd": "DJI.INDX", "yahoo": "^DJI", "finnhub": "" },

  // --- METALS ---
  "XAUUSD": { "tradingview": "XAUUSD", "oanda": "XAUUSD", "forexcom": "XAUUSD", "goldapi": "XAU", "alphavantage": "GOLD", "finnhub": "" },
  "XAGUSD": { "tradingview": "XAGUSD", "oanda": "XAGUSD", "forexcom": "XAGUSD", "goldapi": "XAG", "alphavantage": "SILVER", "finnhub": "" },
  "XPTUSD": { "tradingview": "XPTUSD", "oanda": "XPTUSD", "forexcom": "XPTUSD", "goldapi": "XPT", "finnhub": "" },
  "XCUUSD": { "tradingview": "XCUUSD", "oanda": "XCUUSD", "forexcom": "XCUUSD", "goldapi": "XCU", "finnhub": "" },

  // --- CRYPTO ---
  "BTCUSD": { "tradingview": "BINANCE:BTCUSDT", "oanda": "BTCUSD", "forexcom": "BTCUSD", "binance": "BTCUSDT", "alphavantage": "BTC", "yahoo": "BTC-USD", "finnhub": "" },
  "ETHUSD": { "tradingview": "BINANCE:ETHUSDT", "oanda": "ETHUSD", "forexcom": "ETHUSD", "binance": "ETHUSDT", "alphavantage": "ETH", "yahoo": "ETH-USD", "finnhub": "" },
  "SOLUSD": { "tradingview": "BINANCE:SOLUSDT", "oanda": "SOLUSD", "forexcom": "SOLUSD", "binance": "SOLUSDT", "alphavantage": "SOL", "yahoo": "SOL-USD", "finnhub": "" },
  "XRPUSD": { "tradingview": "BINANCE:XRPUSDT", "oanda": "XRPUSD", "forexcom": "XRPUSD", "binance": "XRPUSDT", "alphavantage": "XRP", "yahoo": "XRP-USD", "finnhub": "" },
  "BNBUSD": { "tradingview": "BINANCE:BNBUSDT", "oanda": "BNBUSD", "forexcom": "BNBUSD", "binance": "BNBUSDT", "alphavantage": "BNB", "yahoo": "BNB-USD", "finnhub": "" },
  "TAOUSD": { "tradingview": "BINANCE:TAOUSDT", "oanda": "TAOUSD", "forexcom": "TAOUSD", "binance": "TAOUSDT", "finnhub": "" },
  "ADAUSD": { "tradingview": "BINANCE:ADAUSDT", "oanda": "ADAUSD", "forexcom": "ADAUSD", "binance": "ADAUSDT", "alphavantage": "ADA", "yahoo": "ADA-USD", "finnhub": "" },
  "DOGEUSD": { "tradingview": "BINANCE:DOGEUSDT", "oanda": "DOGEUSD", "forexcom": "DOGEUSD", "binance": "DOGEUSDT", "alphavantage": "DOGE", "yahoo": "DOGE-USD", "finnhub": "" },
  "AVAXUSD": { "tradingview": "BINANCE:AVAXUSDT", "oanda": "AVAXUSD", "forexcom": "AVAXUSD", "binance": "AVAXUSDT", "alphavantage": "AVAX", "yahoo": "AVAX-USD", "finnhub": "" },
  "DOTUSD": { "tradingview": "BINANCE:DOTUSDT", "oanda": "DOTUSD", "forexcom": "DOTUSD", "binance": "DOTUSDT", "alphavantage": "DOT", "yahoo": "DOT-USD", "finnhub": "" },
  "NEARUSD": { "tradingview": "BINANCE:NEARUSDT", "oanda": "NEARUSD", "forexcom": "NEARUSD", "binance": "NEARUSDT", "alphavantage": "NEAR", "yahoo": "NEAR-USD", "finnhub": "" },
  "LTCUSD": { "tradingview": "BINANCE:LTCUSDT", "oanda": "LTCUSD", "forexcom": "LTCUSD", "binance": "LTCUSDT", "alphavantage": "LTC", "yahoo": "LTC-USD", "finnhub": "" },
  "TRXUSD": { "tradingview": "BINANCE:TRXUSDT", "oanda": "TRXUSD", "forexcom": "TRXUSD", "binance": "TRXUSDT", "alphavantage": "TRX", "yahoo": "TRX-USD", "finnhub": "" },
  "LINKUSD": { "tradingview": "BINANCE:LINKUSDT", "oanda": "LINKUSD", "forexcom": "LINKUSD", "binance": "LINKUSDT", "alphavantage": "LINK", "yahoo": "LINK-USD", "finnhub": "" },
  "BCHUSD": { "tradingview": "BINANCE:BCHUSDT", "oanda": "BCHUSD", "forexcom": "BCHUSD", "binance": "BCHUSDT", "alphavantage": "BCH", "yahoo": "BCH-USD", "finnhub": "" },
  "ATOMUSD": { "tradingview": "BINANCE:ATOMUSDT", "oanda": "ATOMUSD", "forexcom": "ATOMUSD", "binance": "ATOMUSDT", "alphavantage": "ATOM", "yahoo": "ATOM-USD", "finnhub": "" },
  "UNIUSD": { "tradingview": "BINANCE:UNIUSDT", "oanda": "UNIUSD", "forexcom": "UNIUSD", "binance": "UNIUSDT", "alphavantage": "UNI", "yahoo": "UNI-USD", "finnhub": "" },
  "APTUSD": { "tradingview": "BINANCE:APTUSDT", "oanda": "APTUSD", "forexcom": "APTUSD", "binance": "APTUSDT", "alphavantage": "APT", "yahoo": "APT-USD", "finnhub": "" },
  "INJUSD": { "tradingview": "BINANCE:INJUSDT", "oanda": "INJUSD", "forexcom": "INJUSD", "binance": "INJUSDT", "alphavantage": "INJ", "yahoo": "INJ-USD", "finnhub": "" },
  "OPUSD": { "tradingview": "BINANCE:OPUSDT", "oanda": "OPUSD", "forexcom": "OPUSD", "binance": "OPUSDT", "alphavantage": "OP", "yahoo": "OP-USD", "finnhub": "" }
};

/**
 * Normalizes any input symbol to the internal standard (e.g. BTCUSD, XAUUSD).
 */
export function normalizeSymbol(symbol: string): string {
  if (!symbol) return "";

  // Clean symbol: remove provider prefixes and special characters
  let clean = symbol.toUpperCase();
  if (clean.includes(':')) {
    clean = clean.split(':')[1];
  }

  // Strip common suffixes
  clean = clean.replace(/USDT$/, '');
  clean = clean.replace(/USD$/, '');
  clean = clean.replace(/[^A-Z0-9]/g, '');

  // Handle common aliases
  const aliasMap: Record<string, string> = {
    "NAS100": "US100",
    "USTEC": "US100",
    "NDX": "US100",
    "DJI": "US30",
    "WALLSTREET": "US30",
    "SPX": "US500",
    "SPX500": "US500",
    "GOLD": "XAUUSD",
    "SILVER": "XAGUSD",
    "XAU": "XAUUSD",
    "XAG": "XAGUSD",
    "BTC": "BTCUSD",
    "ETH": "ETHUSD"
  };

  const base = aliasMap[clean] || clean;

  // If it's a known pair in SYMBOL_MAP, return it
  if (SYMBOL_MAP[base]) return base;

  // Fallback for pairs that might have lost their 'USD'
  if (SYMBOL_MAP[base + "USD"]) return base + "USD";

  return base;
}

/**
 * Returns the mapped symbol for a specific provider.
 */
export function getMappedSymbol(symbol: string, target: keyof SymbolMapEntry): string {
  const normalized = normalizeSymbol(symbol);
  const entry = SYMBOL_MAP[normalized];

  if (entry) {
    return entry[target] || normalized;
  }

  // Fallback heuristic if not in map
  return normalized;
}

/**
 * Categorizes the symbol.
 */
export function getSymbolCategory(symbol: string) {
  const normalized = normalizeSymbol(symbol);

  const metals = ['XAUUSD', 'XAGUSD', 'XPTUSD', 'XCUUSD', 'GOLD', 'SILVER'];
  if (metals.some(m => normalized.startsWith(m.replace('USD', '')))) {
    return 'METALS';
  }

  const indices = ['US100', 'US30', 'US500', 'GER40', 'UK100', 'SPX500'];
  if (indices.includes(normalized)) {
    return 'INDICES';
  }

  const forexPairs = [
    'EURUSD', 'GBPUSD', 'USDJPY', 'GBPJPY', 'AUDUSD', 'EURJPY', 'NZDUSD', 'CHFJPY',
    'USDCAD', 'USDCHF', 'GBPAUD', 'EURAUD'
  ];
  if (forexPairs.includes(normalized)) {
    return 'FOREX';
  }

  return 'CRYPTO';
}

/**
 * Deduplicates signals based on normalized symbol, side, and "fuzzy" entry price.
 */
export function deduplicateSignals(signals: any[]) {
  if (!signals) return [];

  const sorted = [...signals].sort((a, b) =>
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  const seen = new Set();
  return sorted.filter(s => {
    const normalized = normalizeSymbol(s.symbol);
    const price = Number(s.entry_price || 0);
    const fuzzyEntry = price > 100 ? Math.round(price) : Math.round(price * 10000) / 10000;

    const key = `${normalized}-${s.side}-${fuzzyEntry}`;

    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
