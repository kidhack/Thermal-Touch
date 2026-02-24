/**
 * Thermal Touch — Interactive heat diffusion effect.
 *
 * Architecture:
 *   1. Palette definitions → buildLUT() → 256-entry color lookup table
 *   2. Brush kernel → precomputed circular weight map
 *   3. Animation loop: sample → diffuse → paint → decay → render
 */

// ═══════════════════════════════════════════════════════════════════════
// PALETTE DEFINITIONS
// ═══════════════════════════════════════════════════════════════════════
//
// Each palette has:
//   - name: display name for the dropdown
//   - bg: hex background color
//   - stops: array of { pos, r, g, b } defining the color gradient
//   - cycling (optional): when true, heat wraps through the spectrum
//
// Non-cycling palettes clamp heat to [0, 1].
// Cycling palettes (rainbow) let heat grow unbounded; the LUT index
// wraps via modulo so colors cycle continuously.

const PALETTES = {
  thermal: {
    name: 'Thermal', bg: '#000000',
    stops: [
      {pos:0,r:0,g:0,b:0},{pos:.1,r:15,g:0,b:50},{pos:.2,r:50,g:0,b:100},
      {pos:.3,r:100,g:0,b:140},{pos:.4,r:160,g:0,b:150},{pos:.5,r:200,g:0,b:100},
      {pos:.6,r:230,g:40,b:40},{pos:.7,r:245,g:100,b:0},{pos:.8,r:255,g:160,b:0},
      {pos:.9,r:255,g:220,b:40},{pos:1,r:255,g:250,b:100}
    ]
  },
  thermalLight: {
    name: 'Thermal Light', bg: '#ffffff',
    stops: [
      {pos:0,r:255,g:255,b:255},{pos:.1,r:255,g:240,b:180},{pos:.2,r:250,g:220,b:160},
      {pos:.3,r:250,g:200,b:130},{pos:.4,r:245,g:180,b:120},{pos:.5,r:240,g:160,b:140},
      {pos:.6,r:230,g:130,b:180},{pos:.7,r:215,g:135,b:215},{pos:.8,r:195,g:145,b:235},
      {pos:.9,r:200,g:165,b:240},{pos:1,r:220,g:195,b:245}
    ]
  },
  nightVision: {
    name: 'Night Vision', bg: '#000000',
    stops: [
      {pos:0,r:0,g:0,b:0},{pos:.1,r:0,g:10,b:0},{pos:.2,r:0,g:30,b:5},
      {pos:.3,r:0,g:60,b:10},{pos:.4,r:0,g:100,b:15},{pos:.5,r:5,g:140,b:20},
      {pos:.6,r:10,g:180,b:30},{pos:.7,r:30,g:210,b:40},{pos:.8,r:60,g:235,b:60},
      {pos:.9,r:120,g:250,b:100},{pos:1,r:180,g:255,b:160}
    ]
  },
  // Full-spectrum hue rotation. Starts and ends at indigo for seamless wrapping.
  rainbowDark: {
    name: 'Rainbow Dark', bg: '#000000', cycling: true,
    stops: [
      {pos:0,r:126,g:61,b:255},{pos:.08,r:97,g:97,b:255},{pos:.16,r:78,g:166,b:255},
      {pos:.24,r:0,g:199,b:166},{pos:.32,r:0,g:255,b:85},{pos:.40,r:85,g:255,b:0},
      {pos:.48,r:170,g:255,b:0},{pos:.56,r:229,g:229,b:26},{pos:.64,r:255,g:170,b:0},
      {pos:.72,r:255,g:85,b:0},{pos:.80,r:255,g:61,b:61},{pos:.88,r:255,g:0,b:115},
      {pos:.93,r:192,g:6,b:234},{pos:1,r:126,g:61,b:255}
    ]
  },
  rainbowLight: {
    name: 'Rainbow Light', bg: '#ffffff', cycling: true,
    stops: [
      {pos:0,r:197,g:168,b:255},{pos:.08,r:184,g:184,b:255},{pos:.16,r:175,g:215,b:255},
      {pos:.24,r:140,g:230,b:215},{pos:.32,r:140,g:255,b:179},{pos:.40,r:179,g:255,b:140},
      {pos:.48,r:217,g:255,b:140},{pos:.56,r:243,g:243,b:152},{pos:.64,r:255,g:217,b:140},
      {pos:.72,r:255,g:179,b:140},{pos:.80,r:255,g:168,b:168},{pos:.88,r:255,g:140,b:192},
      {pos:.93,r:227,g:143,b:246},{pos:1,r:197,g:168,b:255}
    ]
  },
  synthwave: {
    name: 'Synthwave', bg: '#000000',
    stops: [
      {pos:0,r:0,g:0,b:0},{pos:.1,r:20,g:0,b:40},{pos:.2,r:50,g:0,b:80},
      {pos:.3,r:80,g:0,b:140},{pos:.4,r:120,g:0,b:180},{pos:.5,r:0,g:120,b:160},
      {pos:.6,r:0,g:180,b:180},{pos:.7,r:200,g:0,b:160},{pos:.8,r:255,g:40,b:120},
      {pos:.9,r:255,g:100,b:180},{pos:1,r:255,g:180,b:220}
    ]
  }
};

// ═══════════════════════════════════════════════════════════════════════
// CONSTANTS & STATE
// ═══════════════════════════════════════════════════════════════════════

/** Glow multiplier steps — multiples of brush radius. */
const GLOW_STEPS = [0, 1, 2, 4, 8, 16, Infinity];
const GLOW_LABELS = ['0', '1x', '2x', '4x', '8x', '16x', '∞'];
const TARGET_FPS = 60;
const DIFFUSION_FACTOR = 0.5;

// Mutable state (updated by UI controls)
let currentPalette = 'thermal';
let brushRadius = 40;
let maxBleed = 60;
let bleedSliderVal = 30;  // Inverted: higher value = harder brush
let glowIndex = 6;        // Default: ∞ (unlimited glow)
let burnSpeed = 0.5;

/** Get current bleed radius from the inverted slider value. */
function getBleedRadius() { return maxBleed - bleedSliderVal; }

/** Get current glow multiplier from the step index. */
function getGlowMultiplier() { return GLOW_STEPS[glowIndex]; }

function isMobile() { return 'ontouchstart' in window || navigator.maxTouchPoints > 0 || window.innerWidth < 768; }
function getPixelScale() { return isMobile() ? 3 : 2; }
function getDiffusionIters() { return isMobile() ? 4 : 6; }

// ═══════════════════════════════════════════════════════════════════════
// LUT BUILDER
// ═══════════════════════════════════════════════════════════════════════

/**
 * Build a 256-entry ABGR color lookup table from palette stops.
 *
 * For cycling palettes, the first 40 entries (FADE_IN) smoothly
 * blend from the background into the palette's first stop, creating
 * a soft glow edge. The remaining 216 entries map one full color cycle.
 *
 * @param {Array} stops   - Color stops with { pos, r, g, b }
 * @param {boolean} cycling - Whether the palette wraps continuously
 * @param {string} bg     - Hex background color for fade-in blending
 * @returns {Uint32Array}  - 256-entry packed ABGR pixel values
 */
function buildLUT(stops, cycling, bg) {
  bg = bg || '#000000';
  const bgHex = bg.replace('#', '');
  const bgR = parseInt(bgHex.substring(0, 2), 16);
  const bgG = parseInt(bgHex.substring(2, 4), 16);
  const bgB = parseInt(bgHex.substring(4, 6), 16);
  const FADE_IN = cycling ? 40 : 0;
  const lut = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let r, g, b;
    if (i < FADE_IN) {
      // Fade-in: blend from background toward the first color stop
      const fadeT = i / FADE_IN;
      r = Math.round(bgR + (stops[0].r - bgR) * fadeT);
      g = Math.round(bgG + (stops[0].g - bgG) * fadeT);
      b = Math.round(bgB + (stops[0].b - bgB) * fadeT);
    } else {
      // Color region: linear interpolation between surrounding stops
      const t = cycling ? (i - FADE_IN) / (255 - FADE_IN) : i / 255;
      let lo = stops[0], hi = stops[stops.length - 1];
      for (let s = 0; s < stops.length - 1; s++) {
        if (t >= stops[s].pos && t <= stops[s + 1].pos) { lo = stops[s]; hi = stops[s + 1]; break; }
      }
      const range = hi.pos - lo.pos;
      const frac = range > 0 ? (t - lo.pos) / range : 0;
      r = Math.round(lo.r + (hi.r - lo.r) * frac);
      g = Math.round(lo.g + (hi.g - lo.g) * frac);
      b = Math.round(lo.b + (hi.b - lo.b) * frac);
    }
    // Pack as ABGR (little-endian) for Uint32Array pixel access
    lut[i] = (255 << 24) | (b << 16) | (g << 8) | r;
  }
  return lut;
}

/** Convert a hex color to a packed ABGR value for canvas background fills. */
function bgABGR(hex) {
  const c = hex.replace('#', '');
  const r = parseInt(c.substring(0, 2), 16);
  const g = parseInt(c.substring(2, 4), 16);
  const b = parseInt(c.substring(4, 6), 16);
  return (255 << 24) | (b << 16) | (g << 8) | r;
}

// ═══════════════════════════════════════════════════════════════════════
// BRUSH KERNEL
// ═══════════════════════════════════════════════════════════════════════

/**
 * Build a circular brush kernel as a flat array of (dx, dy, weight) entries.
 *
 * Two zones controlled by hardness:
 *   - Inside the brush: flat at high hardness, gentle gradient at low
 *     hardness (center=1, edge=innerMinWeight). Always has visible color.
 *   - Outside (bleed zone): cubic fade from edge intensity to 0.
 *
 * @param {number} brushR  - Brush radius in CSS pixels
 * @param {number} bleedR  - Bleed/fade radius in CSS pixels
 * @param {number} scale   - Pixel downscale factor
 */
function buildKernel(brushR, bleedR, scale) {
  const bGrid = brushR / scale, blGrid = bleedR / scale;
  const total = bGrid + blGrid, ceil = Math.ceil(total);
  // Past 50% softness, introduce an inner gradient within the brush disc
  const softness = Math.max(0, (bleedR - 30) / 30);
  const innerMin = 1 - softness * 0.6;
  const entries = [];
  for (let dy = -ceil; dy <= ceil; dy++) {
    for (let dx = -ceil; dx <= ceil; dx++) {
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist <= total) {
        let w;
        if (dist <= bGrid) {
          const t = bGrid > 0 ? dist / bGrid : 0;
          w = 1 - (1 - innerMin) * t * t;
        } else {
          const t = blGrid > 0 ? (dist - bGrid) / blGrid : 1;
          w = innerMin * Math.pow(1 - t, 3);
        }
        entries.push(dx, dy, w);
      }
    }
  }
  return { data: new Float32Array(entries), count: entries.length / 3 };
}

// ═══════════════════════════════════════════════════════════════════════
// BURN SPEED CONVERSION
// ═══════════════════════════════════════════════════════════════════════

/** Fixed decay rate (~30s half-life non-cycling, ~15s for cycling). */
const DECAY_HLF = 60 * TARGET_FPS * Math.pow(0.5, 3) * 4 + 1;
const FIXED_DECAY = Math.pow(0.5, 1 / DECAY_HLF);

/** Convert burn speed (0–1) to per-frame heat accumulation rate. */
function burnAccum(bs) { return (1 / (15 * TARGET_FPS)) * (0.5 + bs * 2); }

// ═══════════════════════════════════════════════════════════════════════
// UI SETUP
// ═══════════════════════════════════════════════════════════════════════

// Populate the palette dropdown
const sel = document.getElementById('palette-select');
for (const [key, pal] of Object.entries(PALETTES)) {
  const opt = document.createElement('option');
  opt.value = key; opt.textContent = pal.name;
  sel.appendChild(opt);
}

// Panel collapse toggle
let collapsed = false;
const panelBody = document.getElementById('panel-body');
const panelFooter = document.getElementById('panel-footer');
const chevron = document.getElementById('chevron');
document.getElementById('panel-header').addEventListener('click', () => {
  collapsed = !collapsed;
  panelBody.style.display = collapsed ? 'none' : '';
  panelFooter.style.display = collapsed ? 'none' : '';
  chevron.style.transform = collapsed ? 'rotate(180deg)' : '';
});

/** Switch panel between dark and light styling based on palette background. */
function updatePanelTheme() {
  const dark = PALETTES[currentPalette].bg === '#000000';
  document.getElementById('panel').classList.toggle('light-mode', !dark);
  document.getElementById('hint').querySelector('span').style.color =
    dark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.2)';
}

// Dismiss the "Move your cursor" hint on first interaction
let hintDismissed = false;
function dismissHint() {
  if (hintDismissed) return;
  hintDismissed = true;
  document.getElementById('hint').classList.add('hidden');
}
window.addEventListener('mousemove', dismissHint, { once: true });
window.addEventListener('touchstart', dismissHint, { once: true });

// ═══════════════════════════════════════════════════════════════════════
// HEAT ENGINE SETUP
// ═══════════════════════════════════════════════════════════════════════

const canvas = document.getElementById('heat');
const ctx = canvas.getContext('2d', { alpha: false, willReadFrequently: false });

let pixelScale = getPixelScale();
let baseDiffIters = getDiffusionIters();
let gridW = Math.ceil(window.innerWidth / pixelScale);
let gridH = Math.ceil(window.innerHeight / pixelScale);

// Core simulation buffers
let heat = new Float32Array(gridW * gridH);           // Heat intensity per grid cell
let heatSwap = new Float32Array(gridW * gridH);       // Scratch buffer for diffusion
let glowMaskGrid = new Float32Array(gridW * gridH);   // Persistent glow visibility mask
canvas.width = gridW;
canvas.height = gridH;

// Build initial LUT, background color, and brush kernel
let colorLUT = buildLUT(PALETTES[currentPalette].stops, !!PALETTES[currentPalette].cycling, PALETTES[currentPalette].bg);
let bgColor = bgABGR(PALETTES[currentPalette].bg);
let kernel = buildKernel(brushRadius, getBleedRadius(), pixelScale);

// Reusable render buffers — allocated once, recreated only on resize.
// Avoids per-frame GC pressure that tanks Safari performance.
let imgData = ctx.createImageData(gridW, gridH);
let px32 = new Uint32Array(imgData.data.buffer);

// Pointer state (updated by mouse/touch handlers)
const pointer = { x: -9999, y: -9999, active: false };

/** Rebuild LUT, background, and kernel when any parameter changes. */
function rebuildEngine() {
  colorLUT = buildLUT(PALETTES[currentPalette].stops, !!PALETTES[currentPalette].cycling, PALETTES[currentPalette].bg);
  bgColor = bgABGR(PALETTES[currentPalette].bg);
  document.body.style.background = PALETTES[currentPalette].bg;
  kernel = buildKernel(brushRadius, getBleedRadius(), pixelScale);
  updatePanelTheme();
}

// ═══════════════════════════════════════════════════════════════════════
// EVENT HANDLERS
// ═══════════════════════════════════════════════════════════════════════

// Resize: rebuild grid buffers, preserving existing heat data
window.addEventListener('resize', () => {
  pixelScale = getPixelScale();
  baseDiffIters = getDiffusionIters();
  const nw = Math.ceil(window.innerWidth / pixelScale);
  const nh = Math.ceil(window.innerHeight / pixelScale);
  const nh2 = new Float32Array(nw * nh);
  const ng = new Float32Array(nw * nh);
  for (let y = 0; y < Math.min(gridH, nh); y++)
    for (let x = 0; x < Math.min(gridW, nw); x++) {
      nh2[y * nw + x] = heat[y * gridW + x];
      ng[y * nw + x] = glowMaskGrid[y * gridW + x];
    }
  gridW = nw; gridH = nh;
  heat = nh2; glowMaskGrid = ng; heatSwap = new Float32Array(gridW * gridH);
  canvas.width = gridW; canvas.height = gridH;
  imgData = ctx.createImageData(gridW, gridH);
  px32 = new Uint32Array(imgData.data.buffer);
  kernel = buildKernel(brushRadius, getBleedRadius(), pixelScale);
});

// Pointer tracking
window.addEventListener('mousemove', e => { pointer.x = e.clientX; pointer.y = e.clientY; pointer.active = true; });
document.addEventListener('mouseleave', () => { pointer.active = false; });
window.addEventListener('blur', () => { pointer.active = false; });
canvas.addEventListener('touchstart', e => { if (e.touches.length) { pointer.x = e.touches[0].clientX; pointer.y = e.touches[0].clientY; pointer.active = true; } }, { passive: true });
canvas.addEventListener('touchmove', e => { e.preventDefault(); if (e.touches.length) { pointer.x = e.touches[0].clientX; pointer.y = e.touches[0].clientY; pointer.active = true; } }, { passive: false });
canvas.addEventListener('touchend', () => { pointer.active = false; });

// Control bindings — update state and rebuild as needed
sel.addEventListener('change', () => { currentPalette = sel.value; rebuildEngine(); });
document.getElementById('brush-slider').addEventListener('input', e => {
  brushRadius = +e.target.value;
  document.getElementById('brush-val').textContent = brushRadius + 'px';
  kernel = buildKernel(brushRadius, getBleedRadius(), pixelScale);
});
document.getElementById('bleed-slider').addEventListener('input', e => {
  bleedSliderVal = (+e.target.value / 20) * maxBleed;
  document.getElementById('hardness-val').textContent = Math.round((bleedSliderVal / maxBleed) * 100) + '%';
  kernel = buildKernel(brushRadius, getBleedRadius(), pixelScale);
});
document.getElementById('glow-slider').addEventListener('input', e => {
  glowIndex = +e.target.value;
  document.getElementById('glow-val').textContent = GLOW_LABELS[glowIndex];
});
document.getElementById('burn-slider').addEventListener('input', e => {
  burnSpeed = +e.target.value / 100;
  document.getElementById('burn-val').textContent = Math.round(burnSpeed * 100) + '%';
});

// ═══════════════════════════════════════════════════════════════════════
// ANIMATION LOOP
// ═══════════════════════════════════════════════════════════════════════
//
// Each frame:
//   1. Sample existing heat under the pointer to determine paint intensity
//   2. Run diffusion passes (heat spreads to neighbors)
//   3. Paint heat under the pointer using the brush kernel
//   4. Update the glow mask (if glow is limited)
//   5. Decay heat and glow when pointer is inactive
//   6. Render heat values to the canvas via the color LUT

let lastTime = 0, fracIters = 0;

function tick(time) {
  if (lastTime === 0) lastTime = time;
  const dt = Math.min((time - lastTime) / (1000 / TARGET_FPS), 3);
  lastTime = time;

  // Cycling palettes accumulate higher heat, decay 2x faster
  const isCycPal = !!PALETTES[currentPalette].cycling;
  let decay = Math.pow(FIXED_DECAY, dt * (isCycPal ? 2 : 1));
  if (!pointer.active) decay = Math.pow(decay, 2);  // 2x faster when not painting
  const accum = burnAccum(burnSpeed) * dt;
  const gx = Math.floor(pointer.x / pixelScale);
  const gy = Math.floor(pointer.y / pixelScale);

  // Glow mask configuration
  const glowMult = getGlowMultiplier();
  const glowMaxGrid = glowMult === Infinity ? Infinity
    : (brushRadius + getBleedRadius() + glowMult * brushRadius) / pixelScale;
  const glowFadeStart = glowMaxGrid > 0 ? glowMaxGrid * 0.7 : 0;

  // ── 1. Sample heat under pointer ────────────────────────────────────

  let paintVal = 0;
  if (pointer.active) {
    const kd = kernel.data, kc = kernel.count;
    let sum = 0, cnt = 0;
    for (let i = 0; i < kc; i++) {
      const off = i * 3;
      if (kd[off + 2] < 1) continue;  // Only sample solid-core cells
      const sx = gx + (kd[off] | 0), sy = gy + (kd[off + 1] | 0);
      if (sx >= 0 && sx < gridW && sy >= 0 && sy < gridH) { sum += heat[sy * gridW + sx]; cnt++; }
    }
    const rawPaint = (cnt > 0 ? sum / cnt : 0) + accum;
    const isCycling = !!PALETTES[currentPalette].cycling;
    // Clamp to 1 for non-cycling; let grow unbounded for cycling palettes
    paintVal = isCycling ? rawPaint : Math.min(1, rawPaint);
  }

  // ── 2. Diffusion: spread heat to neighboring cells ──────────────────

  // Scale diffusion with burn speed so higher Rate = faster glow spread
  fracIters += baseDiffIters * (0.5 + burnSpeed * 1.5) * dt;
  const passes = Math.floor(fracIters);
  fracIters -= passes;
  let src = heat, dst = heatSwap;
  for (let p = 0; p < passes; p++) {
    for (let y = 0; y < gridH; y++) {
      const row = y * gridW;
      for (let x = 0; x < gridW; x++) {
        const idx = row + x;
        const c = src[idx];
        const l = x > 0 ? src[idx - 1] : c;
        const r = x < gridW - 1 ? src[idx + 1] : c;
        const u = y > 0 ? src[idx - gridW] : c;
        const d = y < gridH - 1 ? src[idx + gridW] : c;
        dst[idx] = c + ((l + r + u + d) * 0.25 - c) * DIFFUSION_FACTOR;
      }
    }
    const tmp = src; src = dst; dst = tmp;
  }
  if (src !== heat) heat.set(src);

  const useGlow = glowMaxGrid !== Infinity;
  const screenDiag = Math.sqrt(gridW * gridW + gridH * gridH);
  const glowPaintR = useGlow ? Math.min(Math.ceil(glowMaxGrid), Math.ceil(screenDiag)) : 0;

  // ── 3. Decay: fade all heat every frame ─────────────────────────────
  // Runs before painting so the brush replenishes its area while
  // surrounding diffused heat still cools naturally.
  for (let i = 0, len = heat.length; i < len; i++) heat[i] *= decay;
  if (useGlow) {
    for (let i = 0, len = glowMaskGrid.length; i < len; i++) glowMaskGrid[i] *= decay;
  }

  // ── 4. Paint heat + update glow mask ────────────────────────────────

  if (pointer.active) {
    const kd = kernel.data, kc = kernel.count;
    for (let i = 0; i < kc; i++) {
      const off = i * 3;
      const px = gx + (kd[off] | 0), py = gy + (kd[off + 1] | 0);
      if (px >= 0 && px < gridW && py >= 0 && py < gridH) {
        const idx = py * gridW + px;
        const v = paintVal * kd[off + 2];
        if (v > heat[idx]) heat[idx] = v;  // Max-blend
      }
    }
    if (useGlow) {
      const yMin = Math.max(0, gy - glowPaintR);
      const yMax = Math.min(gridH - 1, gy + glowPaintR);
      const xMin = Math.max(0, gx - glowPaintR);
      const xMax = Math.min(gridW - 1, gx + glowPaintR);
      for (let y2 = yMin; y2 <= yMax; y2++) {
        const dyM = y2 - gy;
        for (let x2 = xMin; x2 <= xMax; x2++) {
          const dxM = x2 - gx;
          const dist = Math.sqrt(dxM * dxM + dyM * dyM);
          if (dist <= glowMaxGrid) {
            const idx = y2 * gridW + x2;
            let mval = 1;
            if (dist > glowFadeStart) {
              const t2 = (dist - glowFadeStart) / (glowMaxGrid - glowFadeStart);
              mval = Math.pow(1 - t2, 3);  // Cubic fade at glow edge
            }
            if (mval > glowMaskGrid[idx]) glowMaskGrid[idx] = mval;
          }
        }
      }
    }
  }

  // ── 5. Render: map heat to colors via the LUT ──────────────────────

  const isCyc = !!PALETTES[currentPalette].cycling;
  const FADE_IN_R = isCyc ? 40 : 0;        // LUT entries reserved for fade-in
  const COLOR_RNG = 256 - FADE_IN_R;        // Remaining entries for color cycling
  for (let i = 0, len = heat.length; i < len; i++) {
    const v = heat[i] * (useGlow ? Math.min(1, glowMaskGrid[i]) : 1);
    const threshold = isCyc ? 0.015 : 0.002;
    if (v > threshold) {
      let idx;
      if (isCyc) {
        const raw = (v * 255) | 0;
        idx = raw <= FADE_IN_R ? raw : FADE_IN_R + (((raw - FADE_IN_R) >> 2) % COLOR_RNG);
      } else {
        idx = Math.min(255, (v * 255) | 0);
      }
      px32[i] = colorLUT[idx];
    }
    else { px32[i] = bgColor; if (heat[i] < 0) heat[i] = 0; }
  }
  ctx.putImageData(imgData, 0, 0);
  requestAnimationFrame(tick);
}

// ═══════════════════════════════════════════════════════════════════════
// START
// ═══════════════════════════════════════════════════════════════════════

updatePanelTheme();
requestAnimationFrame(tick);
