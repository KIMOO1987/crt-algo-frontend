/**
 * scripts/patch-vela.js
 * Automatically patches @luxalgo/vela in node_modules to:
 * 1. Support custom horizontal (left, center, right) and vertical (top, center, bottom) text alignment
 *    in `labelLayout(d, proj)` for boxes, horizontal lines, trendlines, rays, text, and all other drawings.
 * 2. Add Horizontal & Vertical alignment control buttons in DrawingSettingsPopup's `toggleTextPanel`.
 *
 * This script runs automatically after `npm install` via the "postinstall" hook in package.json,
 * ensuring complete compatibility on local dev and in Coolify / Docker builds.
 */

const fs = require('fs');
const path = require('path');

const VELA_DIR = path.join(__dirname, '..', 'node_modules', '@luxalgo', 'vela', 'dist');

if (!fs.existsSync(VELA_DIR)) {
  console.log('[patch-vela] @luxalgo/vela not found in node_modules, skipping.');
  process.exit(0);
}

const TARGET_FILES = [
  path.join(VELA_DIR, 'chunk-YCD72KGK.js'),
  path.join(VELA_DIR, 'workspace.cjs'),
  path.join(VELA_DIR, 'widget.cjs'),
  path.join(VELA_DIR, 'index.cjs'),
  path.join(VELA_DIR, 'vela.global.js'),
];

// Replacement for labelLayout(d, proj)
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

// Replacement snippet for toggleTextPanel
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

let patchedCount = 0;

for (const filePath of TARGET_FILES) {
  if (!fs.existsSync(filePath)) continue;

  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;

  // 1. Patch labelLayout if not already patched
  if (!content.includes('/* VELA_TEXT_ALIGN_PATCHED */')) {
    const layoutRegex = /function labelLayout\(d, proj\) \{[\s\S]*?switch \(d\.type\) \{[\s\S]*?default:[\s\S]*?\}\s*\}/;
    if (layoutRegex.test(content)) {
      content = content.replace(layoutRegex, REPLACEMENT_LABEL_LAYOUT);
      modified = true;
    }
  }

  // 2. Patch toggleTextPanel if not already patched
  if (!content.includes('/* VELA_TEXT_ALIGN_ROW */')) {
    if (content.includes(TEXT_PANEL_APPEND_MARKER)) {
      content = content.replace(TEXT_PANEL_APPEND_MARKER, TEXT_PANEL_REPLACEMENT);
      modified = true;
    }
  }

  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
    patchedCount++;
    console.log(`[patch-vela] Patched: ${path.basename(filePath)}`);
  } else {
    console.log(`[patch-vela] Already patched: ${path.basename(filePath)}`);
  }
}

console.log(`[patch-vela] Completed successfully. Total files updated: ${patchedCount}.`);
