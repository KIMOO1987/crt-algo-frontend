import fs from 'fs';
import path from 'path';
import { PineEngine } from '@luxalgo/vela-pinets';

export interface CrtBar {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

export interface CrtIndicatorResult {
  panes?: any[];
  series: any[];
  fills?: any[];
  backgrounds?: any[];
  priceLines?: any[];
  lines: any[];
  boxes: any[];
  labels: any[];
  polylines?: any[];
  linefills?: any[];
  tables: any[];
  cached?: boolean;
}

// In-memory caches
let cachedEngine: PineEngine | null = null;
let cachedPrepared: any = null;
let cachedScriptMtime = 0;

// Model result cache: `${symbol}:${timeframe}:${lastBarTime}:${barCount}` -> { result, expiresAt }
const resultMap = new Map<string, { result: CrtIndicatorResult; expiresAt: number }>();
const RESULT_CACHE_TTL_MS = 15000; // 15 seconds

/**
 * Resolves paths to CRT-Algo.pine and KimooCRT_Lib.pine
 */
function findIndicatorPaths(): { crtPath: string; libPath: string } {
  const candidateDirs = [
    path.join(process.cwd(), 'src', 'indicators'),
    path.join(process.cwd(), 'Indicator'),
  ];

  let crtPath = '';
  let libPath = '';

  for (const dir of candidateDirs) {
    const c = path.join(dir, 'CRT-Algo.pine');
    const l = path.join(dir, 'KimooCRT_Lib.pine');
    if (fs.existsSync(c) && fs.existsSync(l)) {
      crtPath = c;
      libPath = l;
      break;
    }
  }

  if (!crtPath || !libPath) {
    throw new Error('Could not locate CRT-Algo.pine or KimooCRT_Lib.pine in indicator directories');
  }

  return { crtPath, libPath };
}

/**
 * Strips //@version= and indicator(...) / library(...) declarations
 */
function removeIndicatorHeader(code: string): string {
  const lines = code.split('\n');
  const result: string[] = [];
  let skippingIndicator = false;
  let parenDepth = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim().startsWith('//@version=')) continue;

    if (!skippingIndicator && /^\s*(indicator|library)\s*\(/.test(line)) {
      skippingIndicator = true;
      for (const ch of line) {
        if (ch === '(') parenDepth++;
        else if (ch === ')') parenDepth--;
      }
      if (parenDepth <= 0) {
        skippingIndicator = false;
        parenDepth = 0;
      }
      continue;
    }

    if (skippingIndicator) {
      for (const ch of line) {
        if (ch === '(') parenDepth++;
        else if (ch === ')') parenDepth--;
      }
      if (parenDepth <= 0) {
        skippingIndicator = false;
        parenDepth = 0;
      }
      continue;
    }

    result.push(line);
  }
  return result.join('\n');
}

/**
 * Unchains multi-line method chaining into individual method calls
 */
function unchainMethods(code: string): string {
  code = code.replace(
    /htf_auto\.Monitor\(([^)]+)\)\s*\.Update\(([^)]+)\)\s*\.FindImbalance\(([^)]+)\)\s*\.DetectSwings\(\)\s*\.ScanPatterns\(([^)]+)\)/g,
    'htf_auto.Monitor($1)\n    htf_auto.Update($2)\n    htf_auto.FindImbalance($3)\n    htf_auto.DetectSwings()\n    htf_auto.ScanPatterns($4)'
  );
  for (let i = 1; i <= 6; i++) {
    const re = new RegExp(
      `htf${i}\\.Monitor\\(([^)]+)\\)\\.Update\\(([^)]+)\\)\\.FindImbalance\\(([^)]+)\\)\\.DetectSwings\\(\\)`,
      'g'
    );
    code = code.replace(
      re,
      `htf${i}.Monitor($1)\n    htf${i}.Update($2)\n    htf${i}.FindImbalance($3)\n    htf${i}.DetectSwings()`
    );
  }
  return code;
}

/**
 * Dynamically loads and pre-processes the Pine scripts into a combined runnable script.
 */
function loadAndInlineScripts(): { combined: string; maxMtime: number } {
  const { crtPath, libPath } = findIndicatorPaths();
  const crtStat = fs.statSync(crtPath);
  const libStat = fs.statSync(libPath);
  const maxMtime = Math.max(crtStat.mtimeMs, libStat.mtimeMs);

  const libCode = fs.readFileSync(libPath, 'utf8');
  let crtCode = fs.readFileSync(crtPath, 'utf8');

  // Normalize unusual unicode whitespace characters (e.g. U+2007 figure spaces used in TV formatting)
  crtCode = crtCode.replace(/[\u2000-\u200b\u00a0\ufeff]/g, ' ');
  let cleanLibCode = libCode.replace(/[\u2000-\u200b\u00a0\ufeff]/g, ' ');

  // Fix local variable `type` collision in KimooCRT_Lib
  cleanLibCode = cleanLibCode
    .replace(/\bint\s+type\s*=\s*val\s*%\s*10/g, 'int imb_type = val % 10')
    .replace(/\bif\s+type\s*==\s*1/g, 'if imb_type == 1')
    .replace(/\belse\s+if\s+type\s*==\s*2/g, 'else if imb_type == 2');

  // Fix invalid 2-arg time(tf, 'America/New_York') where timezone was passed into session parameter
  cleanLibCode = cleanLibCode.replace(
    "time(candleSet.settings.htf, 'America/New_York')",
    "time(candleSet.settings.htf)"
  );

  // Unchain method calls
  crtCode = unchainMethods(crtCode);

  // Replace double-property access htfX.settings.prop with single-property SettingsHTFX.prop
  crtCode = crtCode
    .replace(/\bhtf1\.settings\./g, 'SettingsHTF1.')
    .replace(/\bhtf2\.settings\./g, 'SettingsHTF2.')
    .replace(/\bhtf3\.settings\./g, 'SettingsHTF3.')
    .replace(/\bhtf4\.settings\./g, 'SettingsHTF4.')
    .replace(/\bhtf5\.settings\./g, 'SettingsHTF5.')
    .replace(/\bhtf6\.settings\./g, 'SettingsHTF6.')
    .replace(/\bhtf_auto\.settings\./g, 'SettingsHTFAuto.');

  // Fix syminfo.ticker(sym) -> sym
  crtCode = crtCode.replace(/syminfo\.ticker\(([^)]+)\)/g, '$1');

  // Fix array.from(0.0, 0.0, 0.0, 0.0) so pinets types it as float instead of int
  crtCode = crtCode.replace(/array\.from\(\s*0\.0\s*,\s*0\.0\s*,\s*0\.0\s*,\s*0\.0\s*\)/g, 'array.new_float(4, 0.0)');

  // Fix parameter shadowing in f_main_process
  crtCode = crtCode
    .replace(
      'f_main_process(_tf_ok,_tf_ok_V, _val_ses, op,cls,hi,lo,ti,cyc_txt,arr_sesy,arr_sesz)=>',
      'f_main_process(_tf_ok,_tf_ok_V, _val_ses, op,cls,hi,lo,ti,cyc_txt,_mp_arr_sesy,_mp_arr_sesz)=>'
    )
    .replace('txt0 := array.get(arr_sesy,_val_ses)', 'txt0 := array.get(_mp_arr_sesy,_val_ses)')
    .replace('txtz  = array.get(arr_sesz,_val_ses)', 'txtz  = array.get(_mp_arr_sesz,_val_ses)');

  const cleanLib = removeIndicatorHeader(cleanLibCode).replace(/^export\s+/gm, '');

  const cleanCRT = removeIndicatorHeader(crtCode)
    .replace(/import\s+KIMOOO1987\/KIMOO_Core_Lib\/13\s+as\s+Lib/g, '// inlined lib')
    .replace(/Lib\./g, '');

  const combined = `//@version=6
indicator("CRT-Algo + SFP (+Ultimate)", overlay=true, max_boxes_count=500, max_lines_count=500, max_labels_count=500, max_bars_back=5000)

// === INLINED KIMOO CRT LIB ===
${cleanLib}

// === CRT ALGO MAIN CODE ===
${cleanCRT}
`;

  return { combined, maxMtime };
}

/**
 * Gets or prepares the cached PineEngine instance and prepared script.
 * Automatically invalidates and re-prepares whenever either .pine file is modified!
 */
async function getPreparedEngine(): Promise<{ engine: PineEngine; prepared: any }> {
  const { combined, maxMtime } = loadAndInlineScripts();

  if (cachedEngine && cachedPrepared && cachedScriptMtime === maxMtime) {
    return { engine: cachedEngine, prepared: cachedPrepared };
  }

  const engine = new PineEngine();
  console.log('[crt-engine] Preparing CRT-Algo Pine Script runtime...');
  const t0 = Date.now();
  const prepared = await engine.prepare(combined, 'crt-algo-live');
  console.log(`[crt-engine] Prepared in ${Date.now() - t0}ms (timestamp: ${maxMtime})`);

  cachedEngine = engine;
  cachedPrepared = prepared;
  cachedScriptMtime = maxMtime;

  // Clear stale model results when script changes
  resultMap.clear();

  return { engine, prepared };
}

/**
 * Executes CRT-Algo against the provided market bars and returns visual geometry.
 */
export async function computeCrtIndicator(
  symbol: string,
  timeframe: string,
  bars: CrtBar[]
): Promise<CrtIndicatorResult> {
  if (!bars || bars.length === 0) {
    return { boxes: [], lines: [], labels: [], series: [], tables: [] };
  }

  // Check in-memory result cache
  const lastBar = bars[bars.length - 1];
  const cacheKey = `${symbol}:${timeframe}:${lastBar.time}:${bars.length}`;
  const now = Date.now();
  const cachedEntry = resultMap.get(cacheKey);

  if (cachedEntry && cachedEntry.expiresAt > now) {
    return { ...cachedEntry.result, cached: true };
  }

  const { engine, prepared } = await getPreparedEngine();

  // Cap bars to 300 for calculation performance while maintaining full CRT structure
  const calculationBars = bars.length > 300 ? bars.slice(-300) : bars;

  return new Promise<CrtIndicatorResult>((resolve, reject) => {
    const req = {
      mode: 'static' as const,
      prepared,
      bars: calculationBars,
      getBars: () => calculationBars,
      market: { symbol, timeframe },
      inputs: {},
      props: {},
    };

    let resolved = false;

    engine.execute(req, {
      onModel: (model: any) => {
        if (resolved) return;
        resolved = true;

        const result: CrtIndicatorResult = {
          panes: model.panes || [],
          series: model.series || [],
          fills: model.fills || [],
          backgrounds: model.backgrounds || [],
          priceLines: model.priceLines || [],
          lines: model.lines || [],
          boxes: model.boxes || [],
          labels: model.labels || [],
          polylines: model.polylines || [],
          linefills: model.linefills || [],
          tables: model.tables || [],
        };

        // Cache result
        resultMap.set(cacheKey, {
          result,
          expiresAt: now + RESULT_CACHE_TTL_MS,
        });

        // Prune cache if it grows too large
        if (resultMap.size > 100) {
          const firstKey = resultMap.keys().next().value;
          if (firstKey) resultMap.delete(firstKey);
        }

        resolve(result);
      },
      onError: (err: any) => {
        if (resolved) return;
        resolved = true;
        console.error('[crt-engine] Execution error:', err?.message || err);
        reject(err);
      },
    });
  });
}
