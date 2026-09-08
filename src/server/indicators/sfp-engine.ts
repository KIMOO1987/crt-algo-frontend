/**
 * src/server/indicators/sfp-engine.ts
 *
 * Server-Side Swing Failure Pattern (SFP) Engine
 * Exact 1:1 mathematical & algorithmic implementation of Indicator/SFP.pine.
 *
 * Kept strictly on the server-side to protect proprietary indicator algorithms
 * from client-side reverse engineering, inspection, or extraction.
 */

export interface OHLCV {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

export interface SfpSettings {
  // Module Selection
  showSFP: boolean;
  enableMTFEntry: boolean;

  // Swing Failure Pattern Settings
  len2: number;
  bullSFP: boolean;
  bearSFP: boolean;
  dSwingLine: boolean;
  dOpposLine: boolean;
  dSFP_Line: boolean;
  dSFP_Label: boolean;
  colBl: string;
  colBr: string;
  colBl2: string;
  colBr2: string;

  // Fib Levels Customization
  showSFPFib: boolean;
  showSFPFibHistory: boolean;
  colFib: string;
  styleFib: 'solid' | 'dashed' | 'dotted';
  widthFib: number;

  // MTF Dashboard Settings
  tablePosInput: 'top_right' | 'top_left' | 'bottom_right' | 'bottom_left';
  tableSizeInput: 'tiny' | 'small' | 'normal' | 'large';
  dashboardBg: string;
  dashboardText: string;
}

export const DEFAULT_SFP_SETTINGS: SfpSettings = {
  showSFP: true,
  enableMTFEntry: true,

  len2: 5,
  bullSFP: true,
  bearSFP: true,
  dSwingLine: true,
  dOpposLine: true,
  dSFP_Line: true,
  dSFP_Label: true,
  colBl: '#089981',
  colBr: '#f23645',
  colBl2: 'rgba(8, 153, 129, 0.5)',
  colBr2: 'rgba(242, 54, 69, 0.5)',

  showSFPFib: true,
  showSFPFibHistory: false,
  colFib: '#0c3299',
  styleFib: 'dotted',
  widthFib: 1,

  tablePosInput: 'top_right',
  tableSizeInput: 'small',
  dashboardBg: 'rgba(15, 15, 15, 0.85)',
  dashboardText: '#ffffff',
};

export interface SfpDrawing {
  id: string;
  type: 'trendline' | 'hline' | 'ray' | 'text';
  anchors: Array<{ time: number; price: number }>;
  style?: {
    lineColor?: string;
    lineWidth?: number;
    lineStyle?: 'solid' | 'dashed' | 'dotted';
  };
  text?: {
    value: string;
    color?: string;
    size?: 'tiny' | 'small' | 'normal' | 'large';
    bold?: boolean;
    hAlign?: 'left' | 'center' | 'right';
    vAlign?: 'top' | 'center' | 'bottom';
  };
}

export interface MtfStatus {
  timeframe: string;
  label: string;
  bias: number; // 1 = Bullish, -1 = Bearish, 0 = Neutral
  status: 'Confirm' | 'Unconfirmed' | 'Waiting';
  emoji: '🟢' | '🔴' | '🟡' | '⚪';
}

export interface SfpEngineResult {
  drawings: SfpDrawing[];
  dashboard: MtfStatus[];
  stats: {
    totalBullishSfp: number;
    totalBearishSfp: number;
    confirmedBullishSfp: number;
    confirmedBearishSfp: number;
    activeBullishSfp: boolean;
    activeBearishSfp: boolean;
  };
}

interface PivotPoint {
  barIndex: number;
  time: number;
  price: number;
}

interface ActiveSfpPattern {
  direction: 'bullish' | 'bearish';
  swingBar: number;
  swingTime: number;
  swingPrice: number;
  oppBar: number;
  oppTime: number;
  oppPrice: number;
  sweepBar: number;
  sweepTime: number;
  sfpPrice: number;
  active: boolean;
  confirmed: boolean;
  confirmedBar?: number;
  confirmedTime?: number;
  endBar: number;
  endTime: number;
}

/**
 * Executes the complete SFP detection logic on a series of OHLCV bars.
 */
export function calculateSFP(
  bars: OHLCV[],
  userSettings: Partial<SfpSettings> = {}
): SfpEngineResult {
  const s: SfpSettings = { ...DEFAULT_SFP_SETTINGS, ...userSettings };
  const drawings: SfpDrawing[] = [];

  if (!bars || bars.length < s.len2 + 2) {
    return {
      drawings: [],
      dashboard: getEmptyMtfDashboard(),
      stats: {
        totalBullishSfp: 0,
        totalBearishSfp: 0,
        confirmedBullishSfp: 0,
        confirmedBearishSfp: 0,
        activeBullishSfp: false,
        activeBearishSfp: false,
      },
    };
  }

  const len = bars.length;
  const len2 = Math.max(1, s.len2);

  // Stats accumulators
  let totalBullishSfp = 0;
  let totalBearishSfp = 0;
  let confirmedBullishSfp = 0;
  let confirmedBearishSfp = 0;

  // Patterns list
  const confirmedBearishPatterns: ActiveSfpPattern[] = [];
  const confirmedBullishPatterns: ActiveSfpPattern[] = [];
  let activeBearishPattern: ActiveSfpPattern | null = null;
  let activeBullishPattern: ActiveSfpPattern | null = null;

  // Swings tracker
  let lastHighSwing: PivotPoint | null = null;
  let lastLowSwing: PivotPoint | null = null;

  // Calculate bar duration ms estimate for extensions
  const barMs = bars.length > 1 ? bars[bars.length - 1].time - bars[bars.length - 2].time : 900000;

  // -------------------------------------------------------------
  // MAIN HISTORICAL BAR LOOP
  // -------------------------------------------------------------
  for (let i = len2 + 1; i < len; i++) {
    const barNum = i;
    const currentBar = bars[i];

    // 1. Pivot High Detection: pivothigh(len2, 1)
    // Pivot candidate is at index i - 1
    const pCandidate = i - 1;
    let isPivotHigh = true;
    for (let k = 1; k <= len2; k++) {
      if (bars[pCandidate - k].high >= bars[pCandidate].high) {
        isPivotHigh = false;
        break;
      }
    }
    // rightBars = 1: check that bar[i].high < candidate.high
    if (isPivotHigh && currentBar.high < bars[pCandidate].high) {
      lastHighSwing = {
        barIndex: pCandidate,
        time: bars[pCandidate].time,
        price: bars[pCandidate].high,
      };
    }

    // 2. Pivot Low Detection: pivotlow(len2, 1)
    let isPivotLow = true;
    for (let k = 1; k <= len2; k++) {
      if (bars[pCandidate - k].low <= bars[pCandidate].low) {
        isPivotLow = false;
        break;
      }
    }
    if (isPivotLow && currentBar.low > bars[pCandidate].low) {
      lastLowSwing = {
        barIndex: pCandidate,
        time: bars[pCandidate].time,
        price: bars[pCandidate].low,
      };
    }

    // -------------------------------------------------------------
    // MODULE: BEARISH SFP
    // -------------------------------------------------------------
    if (s.showSFP && s.bearSFP && lastHighSwing) {
      const swingPrice = lastHighSwing.price;
      const swingBar = lastHighSwing.barIndex;
      const swingTime = lastHighSwing.time;

      // Bearish SFP Sweep Trigger:
      // close < swingPrice and open < swingPrice and high > swingPrice
      if (
        currentBar.close < swingPrice &&
        currentBar.open < swingPrice &&
        currentBar.high > swingPrice
      ) {
        totalBearishSfp++;

        // Calculate opposition price (lowest low between swingBar and sweep bar)
        let oppPrice = swingPrice;
        let oppBar = barNum;
        let oppTime = currentBar.time;

        for (let counter = 1; counter <= barNum - swingBar - 1; counter++) {
          const checkIdx = barNum - counter;
          if (bars[checkIdx] && bars[checkIdx].low < oppPrice) {
            oppPrice = bars[checkIdx].low;
            oppBar = checkIdx;
            oppTime = bars[checkIdx].time;
          }
        }

        activeBearishPattern = {
          direction: 'bearish',
          swingBar,
          swingTime,
          swingPrice,
          oppBar,
          oppTime,
          oppPrice,
          sweepBar: barNum,
          sweepTime: currentBar.time,
          sfpPrice: currentBar.high,
          active: true,
          confirmed: false,
          endBar: barNum,
          endTime: currentBar.time,
        };
      }

      // Track active Bearish SFP pattern
      if (activeBearishPattern && activeBearishPattern.active) {
        if (!activeBearishPattern.confirmed) {
          activeBearishPattern.endBar = barNum;
          activeBearishPattern.endTime = currentBar.time;

          // Check Confirmation: close < oppPrice
          if (currentBar.close < activeBearishPattern.oppPrice) {
            activeBearishPattern.confirmed = true;
            activeBearishPattern.confirmedBar = barNum;
            activeBearishPattern.confirmedTime = currentBar.time;
            confirmedBearishSfp++;
            confirmedBearishPatterns.push({ ...activeBearishPattern });
          }
        }

        // Check Invalidation: barNum - swingBar > 500 or close > swingPrice
        if (
          barNum - activeBearishPattern.swingBar > 500 ||
          currentBar.close > activeBearishPattern.swingPrice
        ) {
          activeBearishPattern.active = false;
        }
      }
    }

    // -------------------------------------------------------------
    // MODULE: BULLISH SFP
    // -------------------------------------------------------------
    if (s.showSFP && s.bullSFP && lastLowSwing) {
      const swingPrice = lastLowSwing.price;
      const swingBar = lastLowSwing.barIndex;
      const swingTime = lastLowSwing.time;

      // Bullish SFP Sweep Trigger:
      // close > swingPrice and open > swingPrice and low < swingPrice
      if (
        currentBar.close > swingPrice &&
        currentBar.open > swingPrice &&
        currentBar.low < swingPrice
      ) {
        totalBullishSfp++;

        // Calculate opposition price (highest high between swingBar and sweep bar)
        let oppPrice = swingPrice;
        let oppBar = barNum;
        let oppTime = currentBar.time;

        for (let counter = 1; counter <= barNum - swingBar - 1; counter++) {
          const checkIdx = barNum - counter;
          if (bars[checkIdx] && bars[checkIdx].high > oppPrice) {
            oppPrice = bars[checkIdx].high;
            oppBar = checkIdx;
            oppTime = bars[checkIdx].time;
          }
        }

        activeBullishPattern = {
          direction: 'bullish',
          swingBar,
          swingTime,
          swingPrice,
          oppBar,
          oppTime,
          oppPrice,
          sweepBar: barNum,
          sweepTime: currentBar.time,
          sfpPrice: currentBar.low,
          active: true,
          confirmed: false,
          endBar: barNum,
          endTime: currentBar.time,
        };
      }

      // Track active Bullish SFP pattern
      if (activeBullishPattern && activeBullishPattern.active) {
        if (!activeBullishPattern.confirmed) {
          activeBullishPattern.endBar = barNum;
          activeBullishPattern.endTime = currentBar.time;

          // Check Confirmation: close > oppPrice
          if (currentBar.close > activeBullishPattern.oppPrice) {
            activeBullishPattern.confirmed = true;
            activeBullishPattern.confirmedBar = barNum;
            activeBullishPattern.confirmedTime = currentBar.time;
            confirmedBullishSfp++;
            confirmedBullishPatterns.push({ ...activeBullishPattern });
          }
        }

        // Check Invalidation: barNum - swingBar > 500 or close < swingPrice
        if (
          barNum - activeBullishPattern.swingBar > 500 ||
          currentBar.close < activeBullishPattern.swingPrice
        ) {
          activeBullishPattern.active = false;
        }
      }
    }
  }

  // -------------------------------------------------------------
  // GENERATE DRAWINGS FOR VELA CHART
  // -------------------------------------------------------------
  const allPatternsToRender: ActiveSfpPattern[] = [];

  // Add confirmed patterns
  allPatternsToRender.push(...confirmedBearishPatterns);
  allPatternsToRender.push(...confirmedBullishPatterns);

  // Add currently active unconfirmed patterns if still active
  if (activeBearishPattern && activeBearishPattern.active && !activeBearishPattern.confirmed) {
    allPatternsToRender.push(activeBearishPattern);
  }
  if (activeBullishPattern && activeBullishPattern.active && !activeBullishPattern.confirmed) {
    allPatternsToRender.push(activeBullishPattern);
  }

  // Sort by sweep time
  allPatternsToRender.sort((a, b) => a.sweepTime - b.sweepTime);

  // Determine which patterns get Fib levels (if showSFPFibHistory is false, only latest confirmed)
  const latestConfirmedBearish = confirmedBearishPatterns[confirmedBearishPatterns.length - 1];
  const latestConfirmedBullish = confirmedBullishPatterns[confirmedBullishPatterns.length - 1];

  const FIB_LEVELS = [1.0, 0.0, -1.0, -2.0, -2.5, -3.0, -4.0, -4.5];

  let drawId = 0;

  for (const pat of allPatternsToRender) {
    const isBull = pat.direction === 'bullish';
    const mainColor = isBull ? s.colBl : s.colBr;
    const wickColor = isBull ? s.colBl2 : s.colBr2;
    const isConfirmed = pat.confirmed;

    // 1. Swing Line (Horizontal solid line at swingPrice from swingBar to endBar)
    if (s.dSwingLine) {
      drawings.push({
        id: `sfp-swing-${drawId++}`,
        type: 'trendline',
        anchors: [
          { time: pat.swingTime, price: pat.swingPrice },
          { time: pat.endTime, price: pat.swingPrice },
        ],
        style: {
          lineColor: mainColor,
          lineWidth: 1,
          lineStyle: 'solid',
        },
      });
    }

    // 2. Confirmation / Opposition Line (Horizontal dotted line at oppPrice)
    if (s.dOpposLine) {
      drawings.push({
        id: `sfp-opp-${drawId++}`,
        type: 'trendline',
        anchors: [
          { time: pat.oppTime, price: pat.oppPrice },
          { time: pat.endTime, price: pat.oppPrice },
        ],
        style: {
          lineColor: mainColor,
          lineWidth: 1,
          lineStyle: 'dotted',
        },
      });
    }

    // 3. SFP Wick Line (Vertical thick line from sweep wick tip to swingPrice)
    if (s.dSFP_Line) {
      drawings.push({
        id: `sfp-wick-${drawId++}`,
        type: 'trendline',
        anchors: [
          { time: pat.sweepTime, price: pat.sfpPrice },
          { time: pat.sweepTime, price: pat.swingPrice },
        ],
        style: {
          lineColor: wickColor,
          lineWidth: 3,
          lineStyle: 'solid',
        },
      });
    }

    // 4. SFP Label at sweep candle
    if (s.dSFP_Label) {
      const labelText = isConfirmed
        ? (isBull ? '▲\nSFP' : 'SFP\n▼')
        : 'SFP';

      drawings.push({
        id: `sfp-lbl-${drawId++}`,
        type: 'text',
        anchors: [{ time: pat.sweepTime, price: pat.sfpPrice }],
        text: {
          value: labelText,
          color: mainColor,
          size: 'normal',
          bold: true,
          hAlign: 'center',
          vAlign: isBull ? 'top' : 'bottom',
        },
      });
    }

    // 5. Fibonacci Extension Levels on Confirmation
    if (s.showSFPFib && isConfirmed) {
      const shouldDrawFib =
        s.showSFPFibHistory ||
        (isBull ? pat === latestConfirmedBullish : pat === latestConfirmedBearish);

      if (shouldDrawFib) {
        const fibEnd = pat.endTime + 12 * barMs;

        if (!isBull) {
          // Bearish Fibs: bearRng = sfpPrice - oppPrice; fibPrice = oppPrice + lvl * bearRng
          const bearRng = pat.sfpPrice - pat.oppPrice;
          for (const lvl of FIB_LEVELS) {
            const fibPrice = pat.oppPrice + lvl * bearRng;
            drawings.push({
              id: `sfp-fib-bear-${drawId++}`,
              type: 'trendline',
              anchors: [
                { time: pat.swingTime, price: fibPrice },
                { time: fibEnd, price: fibPrice },
              ],
              style: {
                lineColor: s.colFib,
                lineWidth: s.widthFib,
                lineStyle: s.styleFib,
              },
              text: {
                value: ` ${lvl}`,
                color: s.colFib,
                size: 'small',
                hAlign: 'right',
                vAlign: 'center',
              },
            });
          }
        } else {
          // Bullish Fibs: bullRng = oppPrice - sfpPrice; fibPrice = oppPrice - lvl * bullRng
          const bullRng = pat.oppPrice - pat.sfpPrice;
          for (const lvl of FIB_LEVELS) {
            const fibPrice = pat.oppPrice - lvl * bullRng;
            drawings.push({
              id: `sfp-fib-bull-${drawId++}`,
              type: 'trendline',
              anchors: [
                { time: pat.swingTime, price: fibPrice },
                { time: fibEnd, price: fibPrice },
              ],
              style: {
                lineColor: s.colFib,
                lineWidth: s.widthFib,
                lineStyle: s.styleFib,
              },
              text: {
                value: ` ${lvl}`,
                color: s.colFib,
                size: 'small',
                hAlign: 'right',
                vAlign: 'center',
              },
            });
          }
        }
      }
    }
  }

  // -------------------------------------------------------------
  // MODULE: MTF ENTRY MODEL DASHBOARD (10 TIMEFRAMES)
  // -------------------------------------------------------------
  const dashboard = s.enableMTFEntry
    ? calculateMtfDashboard(bars)
    : getEmptyMtfDashboard();

  return {
    drawings,
    dashboard,
    stats: {
      totalBullishSfp,
      totalBearishSfp,
      confirmedBullishSfp,
      confirmedBearishSfp,
      activeBullishSfp: !!activeBullishPattern?.active,
      activeBearishSfp: !!activeBearishPattern?.active,
    },
  };
}

/**
 * Calculates unified MTF entry model state across 10 timeframes:
 * 1W, 1D, 6H (360), 4H (240), 1H (60), 30m, 15m, 5m, 3m, 1m
 */
function calculateMtfDashboard(bars: OHLCV[]): MtfStatus[] {
  const TF_DEFS = [
    { tf: '1W', label: '1W', minutes: 10080 },
    { tf: '1D', label: '1D', minutes: 1440 },
    { tf: '360', label: '6H', minutes: 360 },
    { tf: '240', label: '4H', minutes: 240 },
    { tf: '60', label: '1H', minutes: 60 },
    { tf: '30', label: '30m', minutes: 30 },
    { tf: '15', label: '15m', minutes: 15 },
    { tf: '5', label: '5m', minutes: 5 },
    { tf: '3', label: '3m', minutes: 3 },
    { tf: '1', label: '1m', minutes: 1 },
  ];

  return TF_DEFS.map((def) => {
    // Aggregate base bars into the target timeframe resolution
    const htfBars = aggregateToTf(bars, def.minutes);
    const { bias, status } = evaluateSingleTf(htfBars);

    const emoji =
      status === 'Confirm'
        ? (bias === 1 ? '🟢' : '🔴')
        : (status === 'Unconfirmed' ? '🟡' : '⚪');

    return {
      timeframe: def.tf,
      label: def.label,
      bias,
      status,
      emoji,
    };
  });
}

/**
 * Evaluates f_tf_calc() for a single timeframe's bars:
 * Exactly reproduces lines 274-374 of SFP.pine.
 */
function evaluateSingleTf(bars: OHLCV[]): { bias: number; status: 'Confirm' | 'Unconfirmed' | 'Waiting' } {
  if (!bars || bars.length < 10) {
    return { bias: 0, status: 'Waiting' };
  }

  let highSwing_price: number | null = null;
  let lowSwing_price: number | null = null;

  let sfp_bear_lvl: number | null = null;
  let sfp_bull_lvl: number | null = null;

  let sfp_bear_active = false;
  let bear_opp_price: number | null = null;
  let sfp_bull_active = false;
  let bull_opp_price: number | null = null;

  let sfp_status: 'Confirm' | 'Unconfirmed' | 'Waiting' = 'Waiting';
  let bias = 0;
  let sfp_level: number | null = null;

  for (let i = 6; i < bars.length; i++) {
    const current = bars[i];
    const pCand = i - 1;

    // Pivot High
    let isPH = true;
    for (let k = 1; k <= 5; k++) {
      if (bars[pCand - k].high >= bars[pCand].high) {
        isPH = false;
        break;
      }
    }
    if (isPH && current.high < bars[pCand].high) {
      highSwing_price = bars[pCand].high;
    }

    // Pivot Low
    let isPL = true;
    for (let k = 1; k <= 5; k++) {
      if (bars[pCand - k].low <= bars[pCand].low) {
        isPL = false;
        break;
      }
    }
    if (isPL && current.low > bars[pCand].low) {
      lowSwing_price = bars[pCand].low;
    }

    // Sweeps
    const sfp_bear_sweep =
      highSwing_price !== null &&
      current.close < highSwing_price &&
      current.open < highSwing_price &&
      current.high > highSwing_price;

    const sfp_bull_sweep =
      lowSwing_price !== null &&
      current.close > lowSwing_price &&
      current.open > lowSwing_price &&
      current.low < lowSwing_price;

    if (sfp_bear_sweep) {
      sfp_bear_lvl = current.high;
      sfp_bear_active = true;
      bear_opp_price = current.low;
      for (let j = 1; j <= 50; j++) {
        const checkIdx = i - j;
        if (bars[checkIdx] && bars[checkIdx].low < bear_opp_price) {
          bear_opp_price = bars[checkIdx].low;
          break;
        }
      }
    }

    if (sfp_bull_sweep) {
      sfp_bull_lvl = current.low;
      sfp_bull_active = true;
      bull_opp_price = current.high;
      for (let j = 1; j <= 50; j++) {
        const checkIdx = i - j;
        if (bars[checkIdx] && bars[checkIdx].high > bull_opp_price) {
          bull_opp_price = bars[checkIdx].high;
          break;
        }
      }
    }

    let sfp_bear_confirmed = false;
    let sfp_bull_confirmed = false;

    if (sfp_bear_active) {
      if (bear_opp_price !== null && current.close < bear_opp_price) {
        sfp_bear_confirmed = true;
        sfp_bear_active = false;
      } else if (sfp_bear_lvl !== null && current.close > sfp_bear_lvl) {
        sfp_bear_active = false;
      }
    }

    if (sfp_bull_active) {
      if (bull_opp_price !== null && current.close > bull_opp_price) {
        sfp_bull_confirmed = true;
        sfp_bull_active = false;
      } else if (sfp_bull_lvl !== null && current.close < sfp_bull_lvl) {
        sfp_bull_active = false;
      }
    }

    if (sfp_bull_confirmed) {
      sfp_status = 'Confirm';
      bias = 1;
      sfp_level = sfp_bull_lvl;
    } else if (sfp_bear_confirmed) {
      sfp_status = 'Confirm';
      bias = -1;
      sfp_level = sfp_bear_lvl;
    }

    if (sfp_status === 'Confirm') {
      if (bias === 1 && sfp_level !== null && current.close < sfp_level) {
        sfp_status = 'Waiting';
        bias = 0;
        sfp_level = null;
      } else if (bias === -1 && sfp_level !== null && current.close > sfp_level) {
        sfp_status = 'Waiting';
        bias = 0;
        sfp_level = null;
      }
    }
  }

  let out_status: 'Confirm' | 'Unconfirmed' | 'Waiting' = sfp_status;
  let out_bias: number = bias;
  if (sfp_bull_active) {
    out_status = 'Unconfirmed';
    out_bias = 1;
  } else if (sfp_bear_active) {
    out_status = 'Unconfirmed';
    out_bias = -1;
  }

  return { bias: out_bias, status: out_status };
}

/**
 * Aggregates a time series of candles into higher timeframe buckets (in minutes).
 */
function aggregateToTf(bars: OHLCV[], targetMinutes: number): OHLCV[] {
  if (!bars || bars.length === 0) return [];
  if (targetMinutes <= 1) return bars;

  const bucketMs = targetMinutes * 60 * 1000;
  const buckets = new Map<number, OHLCV>();

  for (const b of bars) {
    const key = Math.floor(b.time / bucketMs) * bucketMs;
    const cur = buckets.get(key);
    if (!cur) {
      buckets.set(key, {
        time: key,
        open: b.open,
        high: b.high,
        low: b.low,
        close: b.close,
        volume: b.volume || 0,
      });
    } else {
      cur.high = Math.max(cur.high, b.high);
      cur.low = Math.min(cur.low, b.low);
      cur.close = b.close;
      cur.volume = (cur.volume || 0) + (b.volume || 0);
    }
  }

  return Array.from(buckets.values()).sort((a, b) => a.time - b.time);
}

function getEmptyMtfDashboard(): MtfStatus[] {
  const TF_DEFS = [
    { tf: '1W', label: '1W' },
    { tf: '1D', label: '1D' },
    { tf: '360', label: '6H' },
    { tf: '240', label: '4H' },
    { tf: '60', label: '1H' },
    { tf: '30', label: '30m' },
    { tf: '15', label: '15m' },
    { tf: '5', label: '5m' },
    { tf: '3', label: '3m' },
    { tf: '1', label: '1m' },
  ];

  return TF_DEFS.map((d) => ({
    timeframe: d.tf,
    label: d.label,
    bias: 0,
    status: 'Waiting',
    emoji: '⚪',
  }));
}
