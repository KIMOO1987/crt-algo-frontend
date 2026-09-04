/**
 * OKX DataProvider for Vela Charting Engine
 * Connects to OKX public REST and WebSocket feeds.
 * No API key needed for public market data.
 */

export interface OHLCV {
  time: number; // epoch ms
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

export interface BarRange {
  from: number;
  to: number;
  limit?: number;
}

export interface SymbolDescriptor {
  ticker: string;
  description?: string;
  type?: string;
  default?: boolean;
  prefix?: string;
  provider?: string;
}

const OKX_REST = 'https://www.okx.com';
const OKX_WS = 'wss://ws.okx.com:8443/ws/v5/public';

/** Canonical timeframe to OKX bar string */
const TF_TO_OKX: Record<string, string> = {
  '1': '1m',
  '3': '3m',
  '5': '5m',
  '15': '15m',
  '30': '30m',
  '60': '1H',
  '120': '2H',
  '240': '4H',
  '360': '6H',
  '720': '12H',
  'D': '1D',
  '1D': '1D',
  'W': '1W',
  '1W': '1W',
  'M': '1M',
  '1M': '1M',
};

/** Popular OKX pairs for autocomplete */
const POPULAR_SYMBOLS = [
  { ticker: 'BTC-USDT-SWAP', description: 'Bitcoin Perpetual Swap', type: 'swap' },
  { ticker: 'ETH-USDT-SWAP', description: 'Ethereum Perpetual Swap', type: 'swap' },
  { ticker: 'SOL-USDT-SWAP', description: 'Solana Perpetual Swap', type: 'swap' },
  { ticker: 'XRP-USDT-SWAP', description: 'Ripple Perpetual Swap', type: 'swap' },
  { ticker: 'DOGE-USDT-SWAP', description: 'Dogecoin Perpetual Swap', type: 'swap' },
  { ticker: 'ADA-USDT-SWAP', description: 'Cardano Perpetual Swap', type: 'swap' },
  { ticker: 'AVAX-USDT-SWAP', description: 'Avalanche Perpetual Swap', type: 'swap' },
  { ticker: 'LINK-USDT-SWAP', description: 'Chainlink Perpetual Swap', type: 'swap' },
  { ticker: 'SUI-USDT-SWAP', description: 'Sui Perpetual Swap', type: 'swap' },
  { ticker: 'PEPE-USDT-SWAP', description: 'Pepe Perpetual Swap', type: 'swap' },
  { ticker: 'BTC-USDT', description: 'Bitcoin / USDT Spot', type: 'spot' },
  { ticker: 'ETH-USDT', description: 'Ethereum / USDT Spot', type: 'spot' },
  { ticker: 'SOL-USDT', description: 'Solana / USDT Spot', type: 'spot' },
];

export class OkxProvider {
  /** Map user or internal symbol to OKX instId format */
  static formatInstId(raw: string): string {
    let s = raw.trim().toUpperCase();
    if (s.endsWith('.P')) {
      s = s.slice(0, -2) + '-SWAP';
    }
    if (!s.includes('-')) {
      if (s.endsWith('USDT')) {
        const base = s.slice(0, -4);
        return `${base}-USDT-SWAP`;
      }
      return `${s}-USDT-SWAP`;
    }
    return s;
  }

  info() {
    return {
      name: 'okx',
      displayName: 'OKX Exchange',
      supportedTimeframes: ['1', '3', '5', '15', '30', '60', '120', '240', 'D', 'W', 'M'],
      capabilities: {
        enumerate: true,
        stream: true,
        symbolInfo: true,
      },
    };
  }

  async listSymbols(): Promise<SymbolDescriptor[]> {
    return POPULAR_SYMBOLS.map((s) => ({
      ...s,
      prefix: 'OKX',
      provider: 'okx',
    }));
  }

  async getBars(ticker: string, timeframe: string, range: BarRange): Promise<OHLCV[]> {
    const instId = OkxProvider.formatInstId(ticker);
    const bar = TF_TO_OKX[timeframe] || (timeframe.endsWith('m') ? timeframe : `${timeframe}m`);
    const limit = Math.min(range.limit || 300, 300);

    // OKX returns newest first: [ts, o, h, l, c, vol, ...]
    const url = `${OKX_REST}/api/v5/market/candles?instId=${instId}&bar=${bar}&limit=${limit}`;

    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`OKX HTTP ${res.status}`);
      const json = await res.json();
      if (!json.data || !Array.isArray(json.data)) return [];

      const bars: OHLCV[] = json.data.map((row: string[]) => ({
        time: Number(row[0]),
        open: parseFloat(row[1]),
        high: parseFloat(row[2]),
        low: parseFloat(row[3]),
        close: parseFloat(row[4]),
        volume: parseFloat(row[5] || '0'),
      }));

      // Sort ascending by time (Vela contract requirement)
      bars.sort((a, b) => a.time - b.time);
      return bars;
    } catch (err) {
      console.error(`[OkxProvider] Failed to fetch bars for ${instId}:`, err);
      return [];
    }
  }

  subscribe(ticker: string, timeframe: string, onBar: (bar: OHLCV) => void): () => void {
    const instId = OkxProvider.formatInstId(ticker);
    const bar = TF_TO_OKX[timeframe] || `${timeframe}m`;
    const channel = `candle${bar}`;

    let ws: WebSocket | null = null;
    let pingInterval: any = null;
    let isClosed = false;

    const connect = () => {
      if (isClosed) return;
      try {
        ws = new WebSocket(OKX_WS);

        ws.onopen = () => {
          if (isClosed) {
            ws?.close();
            return;
          }
          const subMsg = JSON.stringify({
            op: 'subscribe',
            args: [{ channel, instId }],
          });
          ws?.send(subMsg);

          // OKX requires a string "ping" every 20-30s
          pingInterval = setInterval(() => {
            if (ws && ws.readyState === WebSocket.OPEN) {
              ws.send('ping');
            }
          }, 20000);
        };

        ws.onmessage = (event) => {
          if (event.data === 'pong') return;
          try {
            const msg = JSON.parse(event.data);
            if (msg.event === 'subscribe' || !msg.data) return;

            // OKX pushes candle arrays: [ts, o, h, l, c, vol, ...]
            for (const row of msg.data) {
              const candle: OHLCV = {
                time: Number(row[0]),
                open: parseFloat(row[1]),
                high: parseFloat(row[2]),
                low: parseFloat(row[3]),
                close: parseFloat(row[4]),
                volume: parseFloat(row[5] || '0'),
              };
              onBar(candle);
            }
          } catch (e) {
            // Ignore parse errors
          }
        };

        ws.onerror = () => {
          // Socket error handled by close/reconnect
        };

        ws.onclose = () => {
          if (pingInterval) clearInterval(pingInterval);
          if (!isClosed) {
            setTimeout(connect, 3000);
          }
        };
      } catch (err) {
        if (!isClosed) setTimeout(connect, 3000);
      }
    };

    connect();

    return () => {
      isClosed = true;
      if (pingInterval) clearInterval(pingInterval);
      if (ws) {
        try {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ op: 'unsubscribe', args: [{ channel, instId }] }));
          }
          ws.close();
        } catch (e) {}
      }
    };
  }
}
