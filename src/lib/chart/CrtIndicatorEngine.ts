/**
 * CRT-Algo PRO Scripting Engine for Vela Chart
 * Communicates with secured backend calculation engine (/api/indicators/crt)
 * completely keeping proprietary Pine Script code safe on the server.
 */

import type {
  ScriptingEngine,
  EngineCapabilities,
  PreparedScript,
  ExecutionRequest,
  ExecutionHandlers,
  ExecutionSession,
  BarsChangeReason,
} from '@luxalgo/vela/plugin';

export class CrtIndicatorEngine implements ScriptingEngine {
  readonly language = 'crt';

  readonly capabilities: EngineCapabilities = {
    streaming: false,
    visibleRange: false,
    inputs: false,
    props: false,
  };

  async prepare(_source: string, _instanceId: string): Promise<PreparedScript> {
    return {
      language: 'crt',
      inputs: [],
      props: [],
      meta: {
        title: 'CRT-Algo PRO',
        shorttitle: 'CRT',
        overlay: true,
      },
      reactsToViewport: false,
      token: null,
    };
  }

  execute(req: ExecutionRequest, handlers: ExecutionHandlers): ExecutionSession {
    let abortController: AbortController | null = null;
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    let isStopped = false;

    const run = async () => {
      if (isStopped) return;

      if (abortController) {
        abortController.abort();
      }
      abortController = new AbortController();

      try {
        const bars = req.getBars ? req.getBars() : req.bars;
        const rawSymbol = req.market?.symbol || 'BTCUSDT';
        const cleanSymbol = rawSymbol.includes(':') ? rawSymbol.split(':').pop()! : rawSymbol;
        const timeframe = req.market?.timeframe || '5';

        // Cap bars to 300 to optimize network payload and calculation speed
        const payloadBars = bars && bars.length > 0 ? bars.slice(-300) : [];

        const response = await fetch('/api/indicators/crt', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            symbol: cleanSymbol,
            timeframe,
            bars: payloadBars,
          }),
          signal: abortController.signal,
        });

        if (!response.ok) {
          throw new Error(`CRT calculation failed with status ${response.status}`);
        }

        const data = await response.json();
        if (!data.success || !data.model) {
          throw new Error(data.error || 'Invalid CRT indicator response');
        }

        if (!isStopped) {
          handlers.onModel(data.model);
          if (handlers.onDone) handlers.onDone();
        }
      } catch (err: any) {
        if (err?.name === 'AbortError') return;
        console.warn('[CrtIndicatorEngine] Compute warning:', err?.message || err);
        if (handlers.onError) handlers.onError(err);
      }
    };

    // Initial run
    run();

    return {
      stop() {
        isStopped = true;
        if (abortController) {
          abortController.abort();
          abortController = null;
        }
        if (debounceTimer) {
          clearTimeout(debounceTimer);
          debounceTimer = null;
        }
      },
      update(_inputs, _props) {
        run();
      },
      setVisibleRange(_range) {
        // Static indicator, not viewport dependent
      },
      notifyBars(reason?: BarsChangeReason) {
        if (reason === 'backfill') return;
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          run();
        }, 2000);
      },
    };
  }
}
