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
  "OPUSD": { "tradingview": "BINANCE:OPUSDT", "oanda": "OPUSD", "forexcom": "OPUSD", "binance": "OPUSDT", "alphavantage": "OP", "yahoo": "OP-USD", "finnhub": "" },
  "SUIUSD": { "tradingview": "BINANCE:SUIUSDT", "oanda": "SUIUSD", "forexcom": "SUIUSD", "binance": "SUIUSDT", "finnhub": "" },
  "PEPEUSD": { "tradingview": "BINANCE:PEPEUSDT", "oanda": "PEPEUSD", "forexcom": "PEPEUSD", "binance": "PEPEUSDT", "finnhub": "" },
  "AAVEUSD": { "tradingview": "BINANCE:AAVEUSDT", "oanda": "AAVEUSD", "forexcom": "AAVEUSD", "binance": "AAVEUSDT", "finnhub": "" },
  "FETUSD": { "tradingview": "BINANCE:FETUSDT", "oanda": "FETUSD", "forexcom": "FETUSD", "binance": "FETUSDT", "finnhub": "" },
  "WIFUSD": { "tradingview": "BINANCE:WIFUSDT", "oanda": "WIFUSD", "forexcom": "WIFUSD", "binance": "WIFUSDT", "finnhub": "" },
  "BONKUSD": { "tradingview": "BINANCE:BONKUSDT", "oanda": "BONKUSD", "forexcom": "BONKUSD", "binance": "BONKUSDT", "finnhub": "" },
  "ARBUSD": { "tradingview": "BINANCE:ARBUSDT", "oanda": "ARBUSD", "forexcom": "ARBUSD", "binance": "ARBUSDT", "finnhub": "" },
  "SHIBUSD": { "tradingview": "BINANCE:SHIBUSDT", "oanda": "SHIBUSD", "forexcom": "SHIBUSD", "binance": "SHIBUSDT", "finnhub": "" },
  "RENDERUSD": { "tradingview": "BINANCE:RENDERUSDT", "oanda": "RENDERUSD", "forexcom": "RENDERUSD", "binance": "RENDERUSDT", "finnhub": "" },
  "LDOUSD": { "tradingview": "BINANCE:LDOUSDT", "oanda": "LDOUSD", "forexcom": "LDOUSD", "binance": "LDOUSDT", "finnhub": "" },
  "RUNEUSD": { "tradingview": "BINANCE:RUNEUSDT", "oanda": "RUNEUSD", "forexcom": "RUNEUSD", "binance": "RUNEUSDT", "finnhub": "" },
  "GRTUSD": { "tradingview": "BINANCE:GRTUSDT", "oanda": "GRTUSD", "forexcom": "GRTUSD", "binance": "GRTUSDT", "finnhub": "" },
  "BILLUSD": { "tradingview": "BINANCE:BILLUSDT", "oanda": "BILLUSD", "forexcom": "BILLUSD", "binance": "BILLUSDT", "finnhub": "" },
  "USDCUSD": { "tradingview": "BINANCE:USDCUSDT", "oanda": "USDCUSD", "forexcom": "USDCUSD", "binance": "USDCUSDT", "finnhub": "" },
  "OPGUSD": { "tradingview": "BINANCE:OPGUSDT", "oanda": "OPGUSD", "forexcom": "OPGUSD", "binance": "OPGUSDT", "finnhub": "" },
  "HYPEUSD": { "tradingview": "BINANCE:HYPEUSDT", "oanda": "HYPEUSD", "forexcom": "HYPEUSD", "binance": "HYPEUSDT", "finnhub": "" },
  "XAUTUSD": { "tradingview": "BINANCE:XAUTUSDT", "oanda": "XAUTUSD", "forexcom": "XAUTUSD", "binance": "XAUTUSDT", "finnhub": "" },
  "MNTUSD": { "tradingview": "BINANCE:MNTUSDT", "oanda": "MNTUSD", "forexcom": "MNTUSD", "binance": "MNTUSDT", "finnhub": "" },
  "USDEUSD": { "tradingview": "BINANCE:USDEUSDT", "oanda": "USDEUSD", "forexcom": "USDEUSD", "binance": "USDEUSDT", "finnhub": "" },
  "MONUSD": { "tradingview": "BINANCE:MONUSDT", "oanda": "MONUSD", "forexcom": "MONUSD", "binance": "MONUSDT", "finnhub": "" },
  "BSBUSD": { "tradingview": "BINANCE:BSBUSDT", "oanda": "BSBUSD", "forexcom": "BSBUSD", "binance": "BSBUSDT", "finnhub": "" },
  "ASTERUSD": { "tradingview": "BINANCE:ASTERUSDT", "oanda": "ASTERUSD", "forexcom": "ASTERUSD", "binance": "ASTERUSDT", "finnhub": "" },
  "CCUSD": { "tradingview": "BINANCE:CCUSDT", "oanda": "CCUSD", "forexcom": "CCUSD", "binance": "CCUSDT", "finnhub": "" },
  "XPLUSD": { "tradingview": "BINANCE:XPLUSDT", "oanda": "XPLUSD", "forexcom": "XPLUSD", "binance": "XPLUSDT", "finnhub": "" },
  "ENAUSD": { "tradingview": "BINANCE:ENAUSDT", "oanda": "ENAUSD", "forexcom": "ENAUSD", "binance": "ENAUSDT", "finnhub": "" },
  "HUSD": { "tradingview": "BINANCE:HUSDT", "oanda": "HUSD", "forexcom": "HUSD", "binance": "HUSDT", "finnhub": "" },
  "TONUSD": { "tradingview": "BINANCE:TONUSDT", "oanda": "TONUSD", "forexcom": "TONUSD", "binance": "TONUSDT", "finnhub": "" },
  "IPUSD": { "tradingview": "BINANCE:IPUSDT", "oanda": "IPUSD", "forexcom": "IPUSD", "binance": "IPUSDT", "finnhub": "" },
  "LITUSD": { "tradingview": "BINANCE:LITUSDT", "oanda": "LITUSD", "forexcom": "LITUSD", "binance": "LITUSDT", "finnhub": "" },
  "STABLEUSD": { "tradingview": "BINANCE:STABLEUSDT", "oanda": "STABLEUSD", "forexcom": "STABLEUSD", "binance": "STABLEUSDT", "finnhub": "" },
  "PENGUUSD": { "tradingview": "BINANCE:PENGUUSDT", "oanda": "PENGUUSD", "forexcom": "PENGUUSD", "binance": "PENGUUSDT", "finnhub": "" },
  "ONDOUSD": { "tradingview": "BINANCE:ONDOUSDT", "oanda": "ONDOUSD", "forexcom": "ONDOUSD", "binance": "ONDOUSDT", "finnhub": "" },
  "WLDUSD": { "tradingview": "BINANCE:WLDUSDT", "oanda": "WLDUSD", "forexcom": "WLDUSD", "binance": "WLDUSDT", "finnhub": "" },
  "VVVUSD": { "tradingview": "BINANCE:VVVUSDT", "oanda": "VVVUSD", "forexcom": "VVVUSD", "binance": "VVVUSDT", "finnhub": "" },
  "BBSOLUSD": { "tradingview": "BINANCE:BBSOLUSDT", "oanda": "BBSOLUSD", "forexcom": "BBSOLUSD", "binance": "BBSOLUSDT", "finnhub": "" },
  "USD1USD": { "tradingview": "BINANCE:USD1USDT", "oanda": "USD1USD", "forexcom": "USD1USD", "binance": "USD1USDT", "finnhub": "" },
  "NEXUSD": { "tradingview": "BINANCE:NEXUSDT", "oanda": "NEXUSD", "forexcom": "NEXUSD", "binance": "NEXUSDT", "finnhub": "" },
  "BGBUSD": { "tradingview": "BINANCE:BGBUSDT", "oanda": "BGBUSD", "forexcom": "BGBUSD", "binance": "BGBUSDT", "finnhub": "" },
  "SKYAIUSD": { "tradingview": "BINANCE:SKYAIUSDT", "oanda": "SKYAIUSD", "forexcom": "SKYAIUSD", "binance": "SKYAIUSDT", "finnhub": "" },
  "RIVERUSD": { "tradingview": "BINANCE:RIVERUSDT", "oanda": "RIVERUSD", "forexcom": "RIVERUSD", "binance": "RIVERUSDT", "finnhub": "" },
  "UMXMUSD": { "tradingview": "BINANCE:UMXMUSDT", "oanda": "UMXMUSD", "forexcom": "UMXMUSD", "binance": "UMXMUSDT", "finnhub": "" },
  "GENIUSUSD": { "tradingview": "BINANCE:GENIUSUSDT", "oanda": "GENIUSUSD", "forexcom": "GENIUSUSD", "binance": "GENIUSUSDT", "finnhub": "" },
  "LABUSD": { "tradingview": "BINANCE:LABUSDT", "oanda": "LABUSD", "forexcom": "LABUSD", "binance": "LABUSDT", "finnhub": "" },
  "USDGOUSD": { "tradingview": "BINANCE:USDGOUSDT", "oanda": "USDGOUSD", "forexcom": "USDGOUSD", "binance": "USDGOUSDT", "finnhub": "" },
  "PAXGUSD": { "tradingview": "BINANCE:PAXGUSDT", "oanda": "PAXGUSD", "forexcom": "PAXGUSD", "binance": "PAXGUSDT", "finnhub": "" },
  "ESPORTSUSD": { "tradingview": "BINANCE:ESPORTSUSDT", "oanda": "ESPORTSUSD", "forexcom": "ESPORTSUSD", "binance": "ESPORTSUSDT", "finnhub": "" },
  "XMRUSD": { "tradingview": "BINANCE:XMRUSDT", "oanda": "XMRUSD", "forexcom": "XMRUSD", "binance": "XMRUSDT", "finnhub": "" },
  "DASHUSD": { "tradingview": "BINANCE:DASHUSDT", "oanda": "DASHUSD", "forexcom": "DASHUSD", "binance": "DASHUSDT", "finnhub": "" },
  "ZESTUSD": { "tradingview": "BINANCE:ZESTUSDT", "oanda": "ZESTUSD", "forexcom": "ZESTUSD", "binance": "ZESTUSDT", "finnhub": "" },
  "BLENDUSD": { "tradingview": "BINANCE:BLENDUSDT", "oanda": "BLENDUSD", "forexcom": "BLENDUSD", "binance": "BLENDUSDT", "finnhub": "" },
  "PIEVERSEUSD": { "tradingview": "BINANCE:PIEVERSEUSDT", "oanda": "PIEVERSEUSD", "forexcom": "PIEVERSEUSD", "binance": "PIEVERSEUSDT", "finnhub": "" },
  "NXTUSD": { "tradingview": "BINANCE:NXTUSDT", "oanda": "NXTUSD", "forexcom": "NXTUSD", "binance": "NXTUSDT", "finnhub": "" },
  "UBUSD": { "tradingview": "BINANCE:UBUSDT", "oanda": "UBUSD", "forexcom": "UBUSD", "binance": "UBUSDT", "finnhub": "" },
  "FDUSDUSD": { "tradingview": "BINANCE:FDUSDUSDT", "oanda": "FDUSDUSD", "forexcom": "FDUSDUSD", "binance": "FDUSDUSDT", "finnhub": "" },
  "ZECUSD": { "tradingview": "BINANCE:ZECUSDT", "oanda": "ZECUSD", "forexcom": "ZECUSD", "binance": "ZECUSDT", "finnhub": "" },
  "BEATUSD": { "tradingview": "BINANCE:BEATUSDT", "oanda": "BEATUSD", "forexcom": "BEATUSD", "binance": "BEATUSDT", "finnhub": "" },
  "VIRTUALUSD": { "tradingview": "BINANCE:VIRTUALUSDT", "oanda": "VIRTUALUSD", "forexcom": "VIRTUALUSD", "binance": "VIRTUALUSDT", "finnhub": "" },
  "ICPUSD": { "tradingview": "BINANCE:ICPUSDT", "oanda": "ICPUSD", "forexcom": "ICPUSD", "binance": "ICPUSDT", "finnhub": "" },
  "USDPUSD": { "tradingview": "BINANCE:USDPUSDT", "oanda": "USDPUSD", "forexcom": "USDPUSD", "binance": "USDPUSDT", "finnhub": "" },
  "TUSDUSD": { "tradingview": "BINANCE:TUSDUSDT", "oanda": "TUSDUSD", "forexcom": "TUSDUSD", "binance": "TUSDUSDT", "finnhub": "" },
  "BSUSD": { "tradingview": "BINANCE:BSUSDT", "oanda": "BSUSD", "forexcom": "BSUSD", "binance": "BSUSDT", "finnhub": "" },
  "SKYUSD": { "tradingview": "BINANCE:SKYUSDT", "oanda": "SKYUSD", "forexcom": "SKYUSD", "binance": "SKYUSDT", "finnhub": "" },
  "TIAUSD": { "tradingview": "BINANCE:TIAUSDT", "oanda": "TIAUSD", "forexcom": "TIAUSD", "binance": "TIAUSDT", "finnhub": "" },
  "POPCATUSD": { "tradingview": "BINANCE:POPCATUSDT", "oanda": "POPCATUSD", "forexcom": "POPCATUSD", "binance": "POPCATUSDT", "finnhub": "" },
  "CHZUSD": { "tradingview": "BINANCE:CHZUSDT", "oanda": "CHZUSD", "forexcom": "CHZUSD", "binance": "CHZUSDT", "finnhub": "" },
  "PUMPUSD": { "tradingview": "BINANCE:PUMPUSDT", "oanda": "PUMPUSD", "forexcom": "PUMPUSD", "binance": "PUMPUSDT", "finnhub": "" },
  "OKBUSD": { "tradingview": "OKX:OKBUSDT", "oanda": "OKBUSD", "forexcom": "OKBUSD", "binance": "OKBUSDT", "finnhub": "" },
  "TRUMPUSD": { "tradingview": "BINANCE:TRUMPUSDT", "oanda": "TRUMPUSD", "forexcom": "TRUMPUSD", "binance": "TRUMPUSDT", "finnhub": "" },
  "DYDXUSD": { "tradingview": "BINANCE:DYDXUSDT", "oanda": "DYDXUSD", "forexcom": "DYDXUSD", "binance": "DYDXUSDT", "finnhub": "" },
  "KAITOUSD": { "tradingview": "BINANCE:KAITOUSDT", "oanda": "KAITOUSD", "forexcom": "KAITOUSD", "binance": "KAITOUSDT", "finnhub": "" },
  "GMTUSD": { "tradingview": "BINANCE:GMTUSDT", "oanda": "GMTUSD", "forexcom": "GMTUSD", "binance": "GMTUSDT", "finnhub": "" },
  "ORDERUSD": { "tradingview": "BINANCE:ORDERUSDT", "oanda": "ORDERUSD", "forexcom": "ORDERUSD", "binance": "ORDERUSDT", "finnhub": "" },
  "YGGUSD": { "tradingview": "BINANCE:YGGUSDT", "oanda": "YGGUSD", "forexcom": "YGGUSD", "binance": "YGGUSDT", "finnhub": "" },
  "EGLDUSD": { "tradingview": "BINANCE:EGLDUSDT", "oanda": "EGLDUSD", "forexcom": "EGLDUSD", "binance": "EGLDUSDT", "finnhub": "" }
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

  // Remove perp suffixes like .P, -P, .PERP, -PERP
  clean = clean.replace(/[\.\-](P|PERP)$/i, '');

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
    "ETH": "ETHUSD",
    "ESPO": "ESPORTSUSD"
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
