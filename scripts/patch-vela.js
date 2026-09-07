/**
 * scripts/patch-vela.js
 * Automatically patches @luxalgo/vela in node_modules to:
 * 1. Support custom horizontal (left, center, right) and vertical (top, center, bottom) text alignment
 *    in `labelLayout(d, proj)` for boxes, horizontal lines, trendlines, rays, text, etc.
 * 2. Add Horizontal & Vertical alignment control buttons in DrawingSettingsPopup's `toggleTextPanel`.
 * 3. Enhance Fibonacci tools (Retracement, Extension, etc.) with TradingView-grade capabilities:
 *    - 24+ configurable levels with support for negative ratios (-1, -2, -0.5, etc.) and extensions
 *    - Ability to add/remove custom levels
 *    - Hide background color or adjust background opacity slider
 *    - Format levels: Values (0.618), Percentages (61.8%), Prices, or both
 *    - Extend lines (none, right, left, both)
 *    - Reverse levels
 *    - Labels alignment (left, center, right / top, middle, bottom)
 *    - Trend line toggle and "use one color" support
 *    - TradingView-style 2-column settings dialog in `buildLevels`
 *
 * Runs automatically after `npm install` via "postinstall" in package.json.
 */

const fs = require('fs');
const path = require('path');

const VELA_DIR = path.join(__dirname, '..', 'node_modules', '@luxalgo', 'vela', 'dist');

if (!fs.existsSync(VELA_DIR)) {
  console.log('[patch-vela] @luxalgo/vela not found in node_modules, skipping.');
  process.exit(0);
}

// All target files in @luxalgo/vela/dist
const CORE_FILES = [
  path.join(VELA_DIR, 'chunk-IFJJPXSV.js'),
  path.join(VELA_DIR, 'workspace.cjs'),
  path.join(VELA_DIR, 'widget.cjs'),
  path.join(VELA_DIR, 'index.cjs'),
  path.join(VELA_DIR, 'plugin.cjs'),
  path.join(VELA_DIR, 'vela.global.js'),
];

const UI_FILES = [
  path.join(VELA_DIR, 'chunk-YCD72KGK.js'),
  path.join(VELA_DIR, 'workspace.cjs'),
  path.join(VELA_DIR, 'widget.cjs'),
  path.join(VELA_DIR, 'index.cjs'),
  path.join(VELA_DIR, 'vela.global.js'),
];

// ==========================================
// 1. TEXT ALIGNMENT PATCHES
// ==========================================
const REPLACEMENT_LABEL_LAYOUT = `/* VELA_TEXT_ALIGN_PATCHED */
function labelLayout(d, proj) {
  const text = d.text;
  if (!text) return null;
  const pts = d.handlePoints(proj);
  const lines = text.value.split("\\n").length;
  const lh = labelLineHeight(namedFontSize(text.size));
  const totalH = lh * lines;
  const hAlign = text.hAlign || 'center';
  const vAlign = text.vAlign || 'center';

  switch (d.type) {
    case "text": {
      if (!pts[0]) return null;
      let x = pts[0][0];
      let top = pts[0][1];
      let align = "left";
      if (hAlign === "center") {
        align = "center";
      } else if (hAlign === "right") {
        align = "right";
      } else {
        x += 2;
        align = "left";
      }
      if (vAlign === "top") {
        top += 2;
      } else if (vAlign === "bottom") {
        top -= totalH + 2;
      } else {
        top -= totalH / 2;
      }
      return { x, top, align };
    }
    case "hline": {
      if (!pts[0]) return null;
      const y = pts[0][1];
      const w = proj.width || (typeof window !== "undefined" ? window.innerWidth : 800);
      let x = pts[0][0] + 8;
      let align = "left";
      if (hAlign === "left") {
        x = 12;
        align = "left";
      } else if (hAlign === "right") {
        x = Math.max(20, w - 12);
        align = "right";
      } else if (hAlign === "center") {
        x = w / 2;
        align = "center";
      }
      let top = y - 4 - totalH;
      if (vAlign === "bottom") {
        top = y + 4;
      } else if (vAlign === "center") {
        top = y - totalH / 2;
      }
      return { x, top, align };
    }
    case "trendline":
    case "ray":
    case "extendedline":
    case "infoline":
    case "trendangle": {
      if (pts.length < 2) return null;
      const [x1, y1] = pts[0];
      const [x2, y2] = pts[1];
      const len = Math.hypot(x2 - x1, y2 - y1);
      let x = 0;
      let align = "center";
      if (hAlign === "left") {
        x = -len / 2 + 12;
        align = "left";
      } else if (hAlign === "right") {
        x = len / 2 - 12;
        align = "right";
      } else {
        x = 0;
        align = "center";
      }
      let top = -6 - totalH;
      if (vAlign === "bottom") {
        top = 6;
      } else if (vAlign === "center") {
        top = -totalH / 2;
      }
      return {
        x,
        top,
        align,
        rotate: { angle: uprightLineAngle(x1, y1, x2, y2), cx: (x1 + x2) / 2, cy: (y1 + y2) / 2 }
      };
    }
    case "box": {
      if (pts.length < 2) return null;
      const xMin = Math.min(pts[0][0], pts[1][0]);
      const xMax = Math.max(pts[0][0], pts[1][0]);
      const yMin = Math.min(pts[0][1], pts[1][1]);
      const yMax = Math.max(pts[0][1], pts[1][1]);
      const padX = 8;
      const padY = 6;
      let x = (xMin + xMax) / 2;
      let align = "center";
      if (hAlign === "left") {
        x = xMin + padX;
        align = "left";
      } else if (hAlign === "right") {
        x = xMax - padX;
        align = "right";
      }
      let top = (yMin + yMax) / 2 - totalH / 2;
      if (vAlign === "top") {
        top = yMin + padY;
      } else if (vAlign === "bottom") {
        top = yMax - padY - totalH;
      }
      return { x, top, align };
    }
    default: {
      if (!pts[0]) return null;
      let x = pts[0][0];
      let top = pts[0][1];
      let align = "left";
      if (hAlign === "center") align = "center";
      else if (hAlign === "right") align = "right";
      if (vAlign === "bottom") top += 6;
      else if (vAlign === "top") top -= totalH + 4;
      return { x, top, align };
    }
  }
}`;

const TEXT_PANEL_APPEND_MARKER = 'panel.append(ta.el, tools);';
const TEXT_PANEL_REPLACEMENT = `/* VELA_TEXT_ALIGN_ROW */
    const alignRow = document.createElement("div");
    alignRow.style.cssText = "display:flex;align-items:center;justify-content:space-between;gap:6px;padding-top:4px;border-top:1px dashed var(--vela-border);font-size:11px;";
    
    // H-Align buttons: Left, Center, Right
    const hGroup = document.createElement("div");
    hGroup.style.cssText = "display:flex;align-items:center;background:var(--vela-hover,rgba(255,255,255,0.06));border-radius:4px;padding:2px;gap:2px;";
    const curH = text?.hAlign || "center";
    [
      { id: "left", label: "Left", icon: "⫷" },
      { id: "center", label: "Center", icon: "≡" },
      { id: "right", label: "Right", icon: "⫸" }
    ].forEach((opt) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = opt.icon;
      btn.title = "Align " + opt.label;
      btn.style.cssText = "width:22px;height:20px;display:flex;align-items:center;justify-content:center;border:none;border-radius:3px;cursor:pointer;font-size:11px;font-weight:bold;background:" + (curH === opt.id ? "var(--vela-primary,#f97316)" : "transparent") + ";color:" + (curH === opt.id ? "#fff" : "inherit") + ";";
      btn.addEventListener("click", () => {
        actions.patch({ "text.hAlign": opt.id });
        Array.from(hGroup.children).forEach((c, idx) => {
          const isAct = (idx === (opt.id === "left" ? 0 : opt.id === "center" ? 1 : 2));
          c.style.background = isAct ? "var(--vela-primary,#f97316)" : "transparent";
          c.style.color = isAct ? "#fff" : "inherit";
        });
      });
      hGroup.appendChild(btn);
    });

    // V-Align buttons: Top, Center, Bottom
    const vGroup = document.createElement("div");
    vGroup.style.cssText = "display:flex;align-items:center;background:var(--vela-hover,rgba(255,255,255,0.06));border-radius:4px;padding:2px;gap:2px;";
    const curV = text?.vAlign || "center";
    [
      { id: "top", label: "Top", icon: "⏶" },
      { id: "center", label: "Middle", icon: "▪" },
      { id: "bottom", label: "Bottom", icon: "⏷" }
    ].forEach((opt) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = opt.icon;
      btn.title = "Align " + opt.label;
      btn.style.cssText = "width:22px;height:20px;display:flex;align-items:center;justify-content:center;border:none;border-radius:3px;cursor:pointer;font-size:11px;font-weight:bold;background:" + (curV === opt.id ? "var(--vela-primary,#f97316)" : "transparent") + ";color:" + (curV === opt.id ? "#fff" : "inherit") + ";";
      btn.addEventListener("click", () => {
        actions.patch({ "text.vAlign": opt.id });
        Array.from(vGroup.children).forEach((c, idx) => {
          const isAct = (idx === (opt.id === "top" ? 0 : opt.id === "center" ? 1 : 2));
          c.style.background = isAct ? "var(--vela-primary,#f97316)" : "transparent";
          c.style.color = isAct ? "#fff" : "inherit";
        });
      });
      vGroup.appendChild(btn);
    });

    alignRow.append(hGroup, vGroup);
    panel.append(ta.el, tools, alignRow);`;

// ==========================================
// 2. FIBONACCI ENHANCEMENTS
// ==========================================

// Extended 24+ TradingView Default Levels
const REPLACEMENT_FIB_LEVELS_DEF = `/* VELA_EXTENDED_FIB_LEVELS */
var LEVELS = fibLevels([
  { ratio: 0, enabled: true },
  { ratio: 0.236, enabled: true },
  { ratio: 0.382, enabled: true },
  { ratio: 0.5, enabled: true },
  { ratio: 0.618, enabled: true },
  { ratio: 0.786, enabled: true },
  { ratio: 1, enabled: true },
  { ratio: 1.272, enabled: false },
  { ratio: 1.414, enabled: false },
  { ratio: 1.618, enabled: false },
  { ratio: 2, enabled: false },
  { ratio: 2.272, enabled: false },
  { ratio: 2.414, enabled: false },
  { ratio: 2.618, enabled: false },
  { ratio: 3, enabled: false },
  { ratio: 3.272, enabled: false },
  { ratio: 3.618, enabled: false },
  { ratio: 4, enabled: false },
  { ratio: 4.236, enabled: false },
  { ratio: -0.236, enabled: false },
  { ratio: -0.382, enabled: false },
  { ratio: -0.5, enabled: false },
  { ratio: -0.618, enabled: false },
  { ratio: -1, enabled: false }
]);`;

// Enhanced FibLevels Class methods (levelLines, entryLines, fillBands, priceRange)
const REPLACEMENT_FIB_LEVELS_CLASS = `/* VELA_FIB_LEVELS_ENHANCED */
var FibLevels = class extends FibRatios {
  levelLines(proj) {
    const a = this.anchors[0];
    const b = this.anchors[1];
    if (!a || !b) return null;
    const xa = proj.xOf(a.time);
    const xb = proj.xOf(b.time);
    let x1 = Math.min(xa, xb);
    let x2 = Math.max(xa, xb);
    const chartW = proj.width || (typeof window !== "undefined" ? window.innerWidth : 800);
    if (this.extendLines === "right") {
      x2 = chartW;
    } else if (this.extendLines === "left") {
      x1 = 0;
    } else if (this.extendLines === "both") {
      x1 = 0;
      x2 = chartW;
    }
    const delta = this.reverse ? a.price - b.price : b.price - a.price;
    const basePrice = this.reverse ? b.price : a.price;
    const out = [];
    for (const lv of this.levels) {
      if (!lv.enabled) continue;
      const price = basePrice + lv.ratio * delta;
      const y = proj.yOf(price, this.paneId);
      if (y == null) continue;
      const col = (this.useOneColor && this.oneColor) ? this.oneColor : lv.color;
      out.push({ ratio: lv.ratio, color: col, label: lv.label, price, x1, x2, y });
    }
    return out;
  }
  entryLines(proj) {
    const lines = this.levelLines(proj);
    if (!lines) return null;
    const showLevels = this.showLevels !== false;
    const showPrices = this.showPrices === true;
    const levelFormat = this.levelFormat || "values";
    const labelsAlign = this.labelsAlign || "left";
    const labelsVAlign = this.labelsVAlign || "top";

    return lines.map((l) => {
      let ratioStr = "";
      if (showLevels) {
        if (levelFormat === "percentages") {
          ratioStr = \`\${(l.ratio * 100).toFixed(1).replace(/\\.0$/, "")}%\`;
        } else {
          ratioStr = \`\${l.ratio}\`;
        }
      }
      let priceStr = "";
      if (showPrices) {
        priceStr = l.price >= 1 ? l.price.toFixed(2) : l.price.toFixed(4);
      }
      let numberText = "";
      if (ratioStr && priceStr) {
        numberText = \`\${ratioStr} (\${priceStr})\`;
      } else if (ratioStr) {
        numberText = ratioStr;
      } else if (priceStr) {
        numberText = priceStr;
      }

      let numberX = l.x1 + 6;
      let numberAlign = "left";
      if (labelsAlign === "right") {
        numberX = l.x2 - 6;
        numberAlign = "right";
      } else if (labelsAlign === "center") {
        numberX = (l.x1 + l.x2) / 2;
        numberAlign = "center";
      }

      let numberY = l.y - 7;
      if (labelsVAlign === "middle") {
        numberY = l.y;
      } else if (labelsVAlign === "bottom") {
        numberY = l.y + 7;
      }

      return {
        color: l.color,
        label: l.label,
        x1: l.x1,
        y1: l.y,
        x2: l.x2,
        y2: l.y,
        numberText,
        numberX,
        numberY,
        numberAlign,
        labelX: (l.x1 + l.x2) / 2,
        labelY: l.y - 7
      };
    });
  }
  fillBands(proj) {
    if (this.background === false || this.showBackground === false) return [];
    const lines = this.levelLines(proj);
    if (!lines) return [];
    const sorted = [...lines].sort((a, b) => a.y - b.y);
    const bands = [];
    for (let i = 1; i < sorted.length; i += 1) {
      const a = sorted[i - 1];
      const b = sorted[i];
      bands.push({ color: b.color, x: a.x1, y: Math.min(a.y, b.y), w: a.x2 - a.x1, h: Math.abs(b.y - a.y) });
    }
    return bands;
  }
  priceRange() {
    const a = this.anchors[0];
    const b = this.anchors[1];
    if (!a || !b) return null;
    const delta = this.reverse ? a.price - b.price : b.price - a.price;
    const basePrice = this.reverse ? b.price : a.price;
    const prices = this.levels.filter((l) => l.enabled).map((l) => basePrice + l.ratio * delta);
    if (prices.length === 0) return null;
    return { min: Math.min(...prices), max: Math.max(...prices) };
  }
};`;

// Enhanced FibRatios writeProps & readProps
const REPLACEMENT_FIB_RATIOS_PROPS = `/* VELA_FIB_RATIOS_PROPS_ENHANCED */
  writeProps() {
    return {
      levels: this.levels.map((l) => ({ ...l })),
      numbersSize: this.numbersSize,
      labelsSize: this.labelsSize,
      background: this.background,
      backgroundOpacity: this.backgroundOpacity,
      showPrices: this.showPrices,
      showLevels: this.showLevels,
      levelFormat: this.levelFormat,
      extendLines: this.extendLines,
      reverse: this.reverse,
      labelsAlign: this.labelsAlign,
      labelsVAlign: this.labelsVAlign,
      showTrendline: this.showTrendline,
      trendlineColor: this.trendlineColor,
      useOneColor: this.useOneColor,
      oneColor: this.oneColor,
    };
  }
  readProps(props) {
    if (Array.isArray(props.levels)) {
      const parsed = props.levels
        .filter((l) => l && typeof l.ratio === "number")
        .map((l) => ({
          ratio: l.ratio,
          color: typeof l.color === "string" ? l.color : "#38c0fd",
          enabled: l.enabled !== false,
          ...(typeof l.label === "string" && l.label ? { label: l.label } : {})
        }));
      if (parsed.length) this.levels = parsed;
    }
    if (typeof props.numbersSize === "string" || typeof props.numbersSize === "number") this.numbersSize = props.numbersSize;
    if (typeof props.labelsSize === "string" || typeof props.labelsSize === "number") this.labelsSize = props.labelsSize;
    if (typeof props.background === "boolean") this.background = props.background;
    if (typeof props.backgroundOpacity === "number") this.backgroundOpacity = props.backgroundOpacity;
    if (typeof props.showPrices === "boolean") this.showPrices = props.showPrices;
    if (typeof props.showLevels === "boolean") this.showLevels = props.showLevels;
    if (typeof props.levelFormat === "string") this.levelFormat = props.levelFormat;
    if (typeof props.extendLines === "string") this.extendLines = props.extendLines;
    if (typeof props.reverse === "boolean") this.reverse = props.reverse;
    if (typeof props.labelsAlign === "string") this.labelsAlign = props.labelsAlign;
    if (typeof props.labelsVAlign === "string") this.labelsVAlign = props.labelsVAlign;
    if (typeof props.showTrendline === "boolean") this.showTrendline = props.showTrendline;
    if (typeof props.trendlineColor === "string") this.trendlineColor = props.trendlineColor;
    if (typeof props.useOneColor === "boolean") this.useOneColor = props.useOneColor;
    if (typeof props.oneColor === "string") this.oneColor = props.oneColor;
  }`;

// Enhanced paintFibRatios in UI files
const REPLACEMENT_PAINT_FIB_RATIOS = `/* VELA_PAINT_FIB_RATIOS_ENHANCED */
  paintFibRatios(ctx, d, proj, theme) {
    const lines = d.entryLines(proj);
    if (!lines || lines.length === 0) return;

    if (d.showTrendline !== false && d.anchors && d.anchors.length >= 2) {
      const y0 = proj.yOf(d.anchors[0].price, d.paneId);
      const y1 = proj.yOf(d.anchors[1].price, d.paneId);
      if (y0 != null && y1 != null) {
        ctx.save();
        ctx.setLineDash([4, 4]);
        ctx.strokeStyle = d.trendlineColor || theme.textColor;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(proj.xOf(d.anchors[0].time), y0);
        ctx.lineTo(proj.xOf(d.anchors[1].time), y1);
        ctx.stroke();
        ctx.restore();
      }
    }

    const bgOpacity = typeof d.backgroundOpacity === "number" ? d.backgroundOpacity : (d.background === false || d.showBackground === false ? 0 : 0.06);
    if (bgOpacity > 0) {
      for (const band of d.fillBands(proj)) {
        ctx.save();
        ctx.globalAlpha = bgOpacity * ctx.globalAlpha;
        ctx.fillStyle = band.color;
        ctx.fillRect(band.x, band.y, band.w, band.h);
        ctx.restore();
      }
    }

    ctx.textBaseline = "middle";
    const numSize = typeof d.numbersSize === "number" ? d.numbersSize : (typeof namedFontSize === "function" ? namedFontSize(d.numbersSize) : 12);
    const lblSize = typeof d.labelsSize === "number" ? d.labelsSize : (typeof namedFontSize === "function" ? namedFontSize(d.labelsSize) : 12);
    const numFont = \`\${numSize}px \${theme.fontFamily || "sans-serif"}\`;
    const lblFont = \`\${lblSize}px \${theme.fontFamily || "sans-serif"}\`;
    for (const l of lines) {
      this.stroke(ctx, { ...d.style, lineColor: l.color }, () => {
        ctx.moveTo(l.x1, l.y1);
        ctx.lineTo(l.x2, l.y2);
      });
      if (l.numberText) {
        ctx.fillStyle = l.color;
        ctx.font = numFont;
        ctx.textAlign = l.numberAlign;
        ctx.fillText(l.numberText, l.numberX, l.numberY);
      }
      if (l.label) {
        ctx.font = lblFont;
        ctx.textAlign = "center";
        ctx.fillText(l.label, l.labelX, l.labelY);
      }
    }
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
  }`;

// Enhanced buildLevels in DrawingSettingsDialog (TradingView-Style)
const REPLACEMENT_BUILD_LEVELS = `/* VELA_BUILD_LEVELS_TRADINGVIEW */
  buildLevels(grid, drawing, actions) {
    const isMach = typeof MachFigure !== "undefined" && drawing instanceof MachFigure;
    if (isMach) {
      const mach = drawing;
      grid.appendChild(fieldRow({
        label: "Show ratio labels",
        bool: true,
        toggle: {
          checked: mach.showRatios !== false,
          onChange: (v) => actions.patch({ showRatios: v })
        }
      }));
      return;
    }

    grid.innerHTML = "";
    grid.style.cssText = "display:flex;flex-direction:column;gap:10px;padding:12px 16px;max-height:480px;overflow-y:auto;";

    // Top: Trend line & Extend lines
    const topBar = document.createElement("div");
    topBar.style.cssText = "display:flex;align-items:center;justify-content:space-between;gap:10px;padding-bottom:8px;border-bottom:1px solid var(--vela-border);";

    const tlLabel = document.createElement("label");
    tlLabel.style.cssText = "display:flex;align-items:center;gap:6px;font-size:12px;cursor:pointer;";
    const tlCheck = document.createElement("input");
    tlCheck.type = "checkbox";
    tlCheck.checked = drawing.showTrendline !== false;
    tlCheck.onchange = () => actions.patch({ showTrendline: tlCheck.checked });
    tlLabel.append(tlCheck, document.createTextNode("Trend line"));

    const extWrap = document.createElement("div");
    extWrap.style.cssText = "display:flex;align-items:center;gap:6px;font-size:12px;";
    const extLabel = document.createElement("span");
    extLabel.textContent = "Extend:";
    const extSelect = document.createElement("select");
    extSelect.style.cssText = "background:var(--vela-hover,rgba(255,255,255,0.08));color:inherit;border:1px solid var(--vela-border);border-radius:4px;padding:2px 6px;font-size:12px;";
    [
      { value: "none", label: "Don't extend" },
      { value: "right", label: "Extend lines right" },
      { value: "left", label: "Extend lines left" },
      { value: "both", label: "Extend lines both" }
    ].forEach(opt => {
      const el = document.createElement("option");
      el.value = opt.value;
      el.textContent = opt.label;
      if ((drawing.extendLines || "none") === opt.value) el.selected = true;
      extSelect.appendChild(el);
    });
    extSelect.onchange = () => actions.patch({ extendLines: extSelect.value });
    extWrap.append(extLabel, extSelect);
    topBar.append(tlLabel, extWrap);
    grid.appendChild(topBar);

    // 2-Column Grid of Levels
    const gridContainer = document.createElement("div");
    gridContainer.style.cssText = "display:grid;grid-template-columns:1fr 1fr;gap:6px 12px;";

    const levels = drawing.levels || [];
    levels.forEach((lv, i) => {
      const row = document.createElement("div");
      row.style.cssText = "display:flex;align-items:center;gap:6px;background:var(--vela-hover,rgba(255,255,255,0.03));padding:3px 6px;border-radius:4px;";

      const chk = document.createElement("input");
      chk.type = "checkbox";
      chk.checked = !!lv.enabled;
      chk.style.cursor = "pointer";
      chk.onchange = () => actions.patch({ [\`levels.\${i}.enabled\`]: chk.checked });

      const num = document.createElement("input");
      num.type = "text";
      num.value = String(lv.ratio);
      num.style.cssText = "width:54px;background:var(--vela-bg-input,rgba(0,0,0,0.3));color:inherit;border:1px solid var(--vela-border);border-radius:3px;padding:2px 4px;font-size:11px;font-family:monospace;";
      num.onchange = () => {
        const parsed = parseFloat(num.value);
        if (!isNaN(parsed)) {
          actions.patch({ [\`levels.\${i}.ratio\`]: parsed });
        }
      };

      const col = document.createElement("input");
      col.type = "color";
      col.value = lv.color || "#38c0fd";
      col.style.cssText = "width:22px;height:20px;padding:0;border:none;border-radius:3px;cursor:pointer;background:transparent;";
      col.onchange = () => actions.patch({ [\`levels.\${i}.color\`]: col.value });

      row.append(chk, num, col);
      gridContainer.appendChild(row);
    });
    grid.appendChild(gridContainer);

    // Add Level Button
    const addBtn = document.createElement("button");
    addBtn.type = "button";
    addBtn.textContent = "+ Add Level";
    addBtn.style.cssText = "align-self:flex-start;background:transparent;color:var(--vela-primary,#f97316);border:1px dashed var(--vela-primary,#f97316);border-radius:4px;padding:3px 8px;font-size:11px;cursor:pointer;font-weight:600;margin-top:2px;";
    addBtn.onclick = () => {
      const nextRatio = levels.length > 0 ? Math.round((levels[levels.length - 1].ratio + 0.5) * 100) / 100 : 0.5;
      const newLv = { ratio: nextRatio, color: "#38c0fd", enabled: true };
      const newLevels = [...levels, newLv];
      actions.patch({ levels: newLevels });
      this.buildLevels(grid, drawing, actions);
    };
    grid.appendChild(addBtn);

    // Background & One Color
    const bgRow = document.createElement("div");
    bgRow.style.cssText = "display:flex;align-items:center;justify-content:space-between;gap:10px;padding-top:8px;border-top:1px solid var(--vela-border);font-size:12px;";

    const bgWrap = document.createElement("div");
    bgWrap.style.cssText = "display:flex;align-items:center;gap:6px;";
    const bgCheck = document.createElement("input");
    bgCheck.type = "checkbox";
    bgCheck.checked = drawing.background !== false && drawing.showBackground !== false;
    bgCheck.onchange = () => actions.patch({ background: bgCheck.checked, showBackground: bgCheck.checked });

    const bgText = document.createElement("span");
    bgText.textContent = "Background";

    const bgSlider = document.createElement("input");
    bgSlider.type = "range";
    bgSlider.min = "0";
    bgSlider.max = "80";
    bgSlider.value = String(Math.round((typeof drawing.backgroundOpacity === "number" ? drawing.backgroundOpacity : 0.06) * 100));
    bgSlider.style.cssText = "width:70px;cursor:pointer;";
    bgSlider.oninput = () => actions.patch({ backgroundOpacity: Number(bgSlider.value) / 100 });

    bgWrap.append(bgCheck, bgText, bgSlider);

    const oneColWrap = document.createElement("div");
    oneColWrap.style.cssText = "display:flex;align-items:center;gap:6px;";
    const oneColCheck = document.createElement("input");
    oneColCheck.type = "checkbox";
    oneColCheck.checked = !!drawing.useOneColor;
    oneColCheck.onchange = () => actions.patch({ useOneColor: oneColCheck.checked });
    const oneColText = document.createElement("span");
    oneColText.textContent = "Use one color";
    const oneColInput = document.createElement("input");
    oneColInput.type = "color";
    oneColInput.value = drawing.oneColor || "#38c0fd";
    oneColInput.style.cssText = "width:20px;height:18px;border:none;padding:0;cursor:pointer;background:transparent;";
    oneColInput.onchange = () => actions.patch({ oneColor: oneColInput.value, useOneColor: true });
    oneColWrap.append(oneColCheck, oneColText, oneColInput);

    bgRow.append(bgWrap, oneColWrap);
    grid.appendChild(bgRow);

    // Reverse, Prices, Levels format
    const botRow1 = document.createElement("div");
    botRow1.style.cssText = "display:flex;align-items:center;justify-content:space-between;gap:8px;font-size:12px;";

    const revWrap = document.createElement("label");
    revWrap.style.cssText = "display:flex;align-items:center;gap:6px;cursor:pointer;";
    const revCheck = document.createElement("input");
    revCheck.type = "checkbox";
    revCheck.checked = !!drawing.reverse;
    revCheck.onchange = () => actions.patch({ reverse: revCheck.checked });
    revWrap.append(revCheck, document.createTextNode("Reverse"));

    const priceWrap = document.createElement("label");
    priceWrap.style.cssText = "display:flex;align-items:center;gap:6px;cursor:pointer;";
    const priceCheck = document.createElement("input");
    priceCheck.type = "checkbox";
    priceCheck.checked = !!drawing.showPrices;
    priceCheck.onchange = () => actions.patch({ showPrices: priceCheck.checked });
    priceWrap.append(priceCheck, document.createTextNode("Prices"));

    const lvWrap = document.createElement("div");
    lvWrap.style.cssText = "display:flex;align-items:center;gap:6px;";
    const lvCheck = document.createElement("input");
    lvCheck.type = "checkbox";
    lvCheck.checked = drawing.showLevels !== false;
    lvCheck.onchange = () => actions.patch({ showLevels: lvCheck.checked });
    const lvSelect = document.createElement("select");
    lvSelect.style.cssText = "background:var(--vela-hover,rgba(255,255,255,0.08));color:inherit;border:1px solid var(--vela-border);border-radius:4px;padding:2px 4px;font-size:11px;";
    [
      { value: "values", label: "Values" },
      { value: "percentages", label: "Percentages" }
    ].forEach(opt => {
      const el = document.createElement("option");
      el.value = opt.value;
      el.textContent = opt.label;
      if ((drawing.levelFormat || "values") === opt.value) el.selected = true;
      lvSelect.appendChild(el);
    });
    lvSelect.onchange = () => actions.patch({ levelFormat: lvSelect.value });
    lvWrap.append(lvCheck, lvSelect);

    botRow1.append(revWrap, priceWrap, lvWrap);
    grid.appendChild(botRow1);

    // Labels Alignment Row
    const botRow2 = document.createElement("div");
    botRow2.style.cssText = "display:flex;align-items:center;justify-content:space-between;gap:8px;font-size:12px;padding-top:6px;border-top:1px dashed var(--vela-border);";

    const alignH = document.createElement("div");
    alignH.style.cssText = "display:flex;align-items:center;gap:4px;";
    const lblH = document.createElement("span");
    lblH.textContent = "Labels:";
    const selH = document.createElement("select");
    selH.style.cssText = "background:var(--vela-hover,rgba(255,255,255,0.08));color:inherit;border:1px solid var(--vela-border);border-radius:4px;padding:2px 4px;font-size:11px;";
    ["left", "center", "right"].forEach(pos => {
      const o = document.createElement("option");
      o.value = pos;
      o.textContent = pos.charAt(0).toUpperCase() + pos.slice(1);
      if ((drawing.labelsAlign || "left") === pos) o.selected = true;
      selH.appendChild(o);
    });
    selH.onchange = () => actions.patch({ labelsAlign: selH.value });
    alignH.append(lblH, selH);

    const alignV = document.createElement("div");
    alignV.style.cssText = "display:flex;align-items:center;gap:4px;";
    const selV = document.createElement("select");
    selV.style.cssText = "background:var(--vela-hover,rgba(255,255,255,0.08));color:inherit;border:1px solid var(--vela-border);border-radius:4px;padding:2px 4px;font-size:11px;";
    ["top", "middle", "bottom"].forEach(pos => {
      const o = document.createElement("option");
      o.value = pos;
      o.textContent = pos.charAt(0).toUpperCase() + pos.slice(1);
      if ((drawing.labelsVAlign || "top") === pos) o.selected = true;
      selV.appendChild(o);
    });
    selV.onchange = () => actions.patch({ labelsVAlign: selV.value });
    alignV.append(selV);

    botRow2.append(alignH, alignV);
    grid.appendChild(botRow2);
  }`;

// ==========================================
// APPLY PATCHES
// ==========================================

let totalPatched = 0;

// 1. Patch Core Files (FibLevels, FibRatios, Default Levels)
for (const filePath of CORE_FILES) {
  if (!fs.existsSync(filePath)) continue;
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;

  // A. Default LEVELS
  if (!content.includes('/* VELA_EXTENDED_FIB_LEVELS */')) {
    const levelsRegex = /var LEVELS = fibLevels\(\[0, 0\.236, 0\.382, 0\.5, 0\.618, 0\.786, 1\]\);/;
    if (levelsRegex.test(content)) {
      content = content.replace(levelsRegex, REPLACEMENT_FIB_LEVELS_DEF);
      modified = true;
    }
  }

  // B. FibLevels class
  if (!content.includes('/* VELA_FIB_LEVELS_ENHANCED */')) {
    const fibLevelsClassRegex = /var FibLevels = class extends FibRatios \{[\s\S]*?priceRange\(\) \{[\s\S]*?\}\s*\};/;
    if (fibLevelsClassRegex.test(content)) {
      content = content.replace(fibLevelsClassRegex, REPLACEMENT_FIB_LEVELS_CLASS);
      modified = true;
    }
  }

  // C. FibRatios writeProps & readProps
  if (content.includes('/* VELA_FIB_RATIOS_PROPS_ENHANCED */')) {
    const currentPatchRegex = /\/\* VELA_FIB_RATIOS_PROPS_ENHANCED \*\/[\s\S]*?if \(typeof props\.oneColor === "string"\) this\.oneColor = props\.oneColor;\s*\}/;
    if (currentPatchRegex.test(content)) {
      content = content.replace(currentPatchRegex, REPLACEMENT_FIB_RATIOS_PROPS);
      modified = true;
    }
  } else {
    const propsRegex = /writeProps\(\)\s*\{\s*return\s*\{\s*levels:\s*this\.levels\.map\(\(l\) => \(\{ \.\.\.l \}\)\), numbersSize: this\.numbersSize, labelsSize: this\.labelsSize \};\s*\}\s*readProps\(props\) \{[\s\S]*?if \(isFibSize\(props\.labelsSize\)\) this\.labelsSize = props\.labelsSize;\s*\}/;
    if (propsRegex.test(content)) {
      content = content.replace(propsRegex, REPLACEMENT_FIB_RATIOS_PROPS);
      modified = true;
    }
  }

  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
    totalPatched++;
    console.log(`[patch-vela] Patched core: ${path.basename(filePath)}`);
  }
}

// 2. Patch UI Files (labelLayout, toggleTextPanel, paintFibRatios, buildLevels)
for (const filePath of UI_FILES) {
  if (!fs.existsSync(filePath)) continue;
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;

  // A. labelLayout
  if (!content.includes('/* VELA_TEXT_ALIGN_PATCHED */')) {
    const layoutRegex = /function labelLayout\(d, proj\) \{[\s\S]*?switch \(d\.type\) \{[\s\S]*?default:[\s\S]*?\}\s*\}/;
    if (layoutRegex.test(content)) {
      content = content.replace(layoutRegex, REPLACEMENT_LABEL_LAYOUT);
      modified = true;
    }
  }

  // B. toggleTextPanel
  if (!content.includes('/* VELA_TEXT_ALIGN_ROW */')) {
    if (content.includes(TEXT_PANEL_APPEND_MARKER)) {
      content = content.replace(TEXT_PANEL_APPEND_MARKER, TEXT_PANEL_REPLACEMENT);
      modified = true;
    }
  }

  // C. paintFibRatios
  if (content.includes('/* VELA_PAINT_FIB_RATIOS_ENHANCED */')) {
    const currentPaintRegex = /\/\* VELA_PAINT_FIB_RATIOS_ENHANCED \*\/[\s\S]*?ctx\.textBaseline = "alphabetic";\s*\}/;
    if (currentPaintRegex.test(content)) {
      content = content.replace(currentPaintRegex, REPLACEMENT_PAINT_FIB_RATIOS);
      modified = true;
    }
  } else {
    const paintFibRegex = /paintFibRatios\(ctx, d, proj, theme\) \{[\s\S]*?ctx\.textBaseline = "alphabetic";\s*\}/;
    if (paintFibRegex.test(content)) {
      content = content.replace(paintFibRegex, REPLACEMENT_PAINT_FIB_RATIOS);
      modified = true;
    }
  }

  // D. buildLevels in DrawingSettingsDialog
  if (!content.includes('/* VELA_BUILD_LEVELS_TRADINGVIEW */')) {
    const buildLevelsRegex = /buildLevels\(grid, drawing, actions\) \{[\s\S]*?grid\.appendChild\(row\);\s*\}\);\s*\}/;
    if (buildLevelsRegex.test(content)) {
      content = content.replace(buildLevelsRegex, REPLACEMENT_BUILD_LEVELS);
      modified = true;
    }
  }

  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
    totalPatched++;
    console.log(`[patch-vela] Patched UI: ${path.basename(filePath)}`);
  }
}

console.log(`[patch-vela] Completed successfully. Total files updated/verified: ${totalPatched}.`);
