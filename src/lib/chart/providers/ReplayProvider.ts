import type { OHLCV, BarRange } from './MultiAssetProvider';

/**
 * Replay Data Provider for Vela Engine.
 * Allows interactive historical backtesting, bar scrubbing,
 * and step-by-step or auto-play candle playback.
 */
export class ReplayProvider {
  private bars: OHLCV[] = [];
  private subscribers: Set<(bar: OHLCV) => void> = new Set();
  private ticker: string = 'REPLAY';
  private pricescale: number = 100;

  constructor(initialBars: OHLCV[] = []) {
    this.bars = initialBars;
  }

  setBars(bars: OHLCV[]) {
    this.bars = [...bars];
  }

  getLoadedBars(): OHLCV[] {
    return this.bars;
  }

  setTicker(ticker: string, pricescale = 100) {
    this.ticker = ticker;
    this.pricescale = pricescale;
  }

  async getBars(ticker: string, timeframe: string, range: BarRange): Promise<OHLCV[]> {
    return this.bars;
  }

  async getSymbolInfo(ticker: string) {
    return {
      ticker: ticker || this.ticker,
      description: `${ticker || this.ticker} (Replay)`,
      type: 'replay',
      pricescale: this.pricescale,
      minmov: 1,
    };
  }

  subscribe(ticker: string, timeframe: string, onBar: (bar: OHLCV) => void): () => void {
    this.subscribers.add(onBar);
    return () => {
      this.subscribers.delete(onBar);
    };
  }

  /**
   * Pushes the next candle into the chart live stream.
   * Vela animates and paints this new bar immediately!
   */
  feedNextBar(bar: OHLCV) {
    this.bars.push(bar);
    this.subscribers.forEach((cb) => {
      try {
        cb(bar);
      } catch (err) {
        console.error('[ReplayProvider] Error feeding bar:', err);
      }
    });
  }
}

export const replayProviderInstance = new ReplayProvider();
