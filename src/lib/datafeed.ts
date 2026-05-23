import { SYMBOL_MAP, normalizeSymbol } from './symbol-mapper';

/**
 * Implements resolveSymbol for TradingView Charting Library.
 */
export function resolveSymbol(symbolName: string) {
  const normalized = normalizeSymbol(symbolName);
  const mapped = SYMBOL_MAP[normalized];

  if (!mapped) {
    // Default fallback
    return {
      name: symbolName,
      ticker: symbolName,
      session: "24x7",
      timezone: "Etc/UTC",
      minmov: 1,
      pricescale: 100,
      has_intraday: true,
      supported_resolutions: ["1", "5", "15", "30", "60", "1D", "1W"],
      type: "crypto"
    };
  }

  return {
    name: normalized,
    ticker: mapped.tradingview,
    session: "24x7",
    timezone: "Etc/UTC",
    minmov: 1,
    pricescale: normalized.includes('JPY') || normalized === 'XAUUSD' ? 1000 : 100000,
    has_intraday: true,
    supported_resolutions: ["1", "5", "15", "30", "60", "1D", "1W"],
    type: normalized === 'XAUUSD' ? 'metal' : (normalized.length === 6 ? 'forex' : 'index')
  };
}
