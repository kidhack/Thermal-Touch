/**
 * HeatBackground — full-screen interactive heat diffusion canvas.
 *
 * This component renders a 2D heat simulation on an HTML5 Canvas.
 * The user paints heat with their mouse or finger, and it spreads
 * outward via diffusion. Heat values are mapped to colors through
 * a 256-entry lookup table (LUT) built from the active palette.
 *
 * Key concepts:
 *   - Heat grid: A downscaled Float32Array representing heat intensity
 *     at each pixel. Desktop uses 2x downscale, mobile uses 4x.
 *   - Brush kernel: A precomputed circular weight map that determines
 *     how heat is deposited under the cursor.
 *   - Diffusion: Each frame, heat spreads to neighboring cells via
 *     a 4-neighbor averaging pass (repeated several times per frame).
 *   - Glow mask: An optional secondary grid that limits how far the
 *     visible glow can extend from where heat was painted.
 *   - Cycling: For rainbow palettes, heat values grow unbounded and
 *     the LUT index wraps, producing continuous color cycling.
 */

import { useEffect, useRef, useState, useMemo } from 'react';
import {
  palettes,
  buildColorLUT,
  getBackgroundABGR,
  type PaletteKey,
} from './colorPalettes';

export interface HeatBackgroundProps {
  palette?: PaletteKey;
  brushRadius?: number;     // Radius of the solid brush disc in CSS pixels
  bleedRadius?: number;     // Fade zone outside the brush disc (0 = hard edge)
  glowMultiplier?: number;  // Max glow distance as multiple of brush radius (Infinity = unlimited)
  burnSpeed?: number;       // 0–1 normalized: how fast heat accumulates and decays
}

// ─── Constants ───────────────────────────────────────────────────────────────

const TARGET_FPS = 60;
const DIFFUSION_FACTOR = 0.5;           // How much each cell blends toward its neighbors per pass
const DIFFUSION_ITERS_DESKTOP = 6;      // Diffusion passes (lower for smooth 60fps)
const DIFFUSION_ITERS_MOBILE = 4;       // Fewer passes on mobile for performance

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isMobile(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    'ontouchstart' in window ||
    navigator.maxTouchPoints > 0 ||
    window.innerWidth < 768
  );
}

/** Resolution scale: mobile 3x downscale, desktop 2x for smooth 60fps in Chrome/Safari. */
function getPixelScale(): number {
  return isMobile() ? 3 : 2;
}

// ─── Brush Kernel ────────────────────────────────────────────────────────────

/**
 * Build a circular brush kernel with hardness control.
 *
 * The kernel is a list of (dx, dy, weight) entries describing the
 * heat intensity at each grid cell relative to the brush center.
 *
 * Hardness controls two zones:
 *   - Inside the brush disc: at high hardness, intensity is flat (weight=1).
 *     At low hardness, intensity gently grades from 1.0 at center down to
 *     a still-visible level at the brush edge — creating a richer gradient
 *     that shows more of the color spectrum.
 *   - Outside the brush disc (bleed zone): always fades from the edge
 *     intensity down to 0 with cubic easing.
 *
 * This keeps visible color all the way to the brush edge at any hardness.
 */
function buildBrushKernel(
  brushRadius: number,
  bleedRadius: number,
  pixelScale: number,
) {
  const brushGridR = brushRadius / pixelScale;
  const bleedGridR = bleedRadius / pixelScale;
  const totalR = brushGridR + bleedGridR;
  const ceil = Math.ceil(totalR);
  const entries: number[] = [];

  // Past 50% softness, introduce an inner gradient within the brush disc.
  // innerMinWeight is the intensity at the brush edge — always > 0 so
  // the brush has visible color all the way out.
  const softness = Math.max(0, (bleedRadius - 30) / 30);
  const innerMinWeight = 1 - softness * 0.6;

  for (let dy = -ceil; dy <= ceil; dy++) {
    for (let dx = -ceil; dx <= ceil; dx++) {
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist <= totalR) {
        let weight: number;
        if (dist <= brushGridR) {
          // Inside brush: grade from 1.0 at center to innerMinWeight at edge
          const t = brushGridR > 0 ? dist / brushGridR : 0;
          weight = 1 - (1 - innerMinWeight) * t * t;
        } else {
          // Bleed zone: fade from innerMinWeight to 0 with cubic easing
          const t = bleedGridR > 0 ? (dist - brushGridR) / bleedGridR : 1;
          weight = innerMinWeight * (1 - t) * (1 - t) * (1 - t);
        }
        entries.push(dx, dy, weight);
      }
    }
  }
  return { data: new Float32Array(entries), count: entries.length / 3 };
}

// ─── Burn Speed Conversion ───────────────────────────────────────────────────

/**
 * Fixed per-frame decay multiplier. Decoupled from the Rate slider.
 * ~30s half-life for non-cycling, ~15s effective for cycling (2x faster).
 */
const DECAY_HALF_LIFE_FRAMES = 60 * TARGET_FPS * Math.pow(0.5, 3) * 4 + 1; // ~1801 frames (~30s)
const FIXED_DECAY_RATE = Math.pow(0.5, 1 / DECAY_HALF_LIFE_FRAMES);

/**
 * Convert burn speed (0–1) to a per-frame heat accumulation rate.
 * Higher speed = more heat deposited per frame while the pointer is active.
 */
function burnSpeedToAccum(burnSpeed: number): number {
  const base = 1 / (15 * TARGET_FPS);
  return base * (0.5 + burnSpeed * 2);
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function HeatBackground({
  palette: paletteKey = 'thermal',
  brushRadius: brushRadiusPx = 40,
  bleedRadius: bleedRadiusPx = 16,
  glowMultiplier = Infinity,
  burnSpeed = 0.5,
}: HeatBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pointerRef = useRef({ x: -9999, y: -9999, active: false });

  // Respect user's motion preference (skip the entire effect)
  const [prefersReducedMotion] = useState(
    () =>
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );

  // Build color LUT and background pixel value from the active palette
  const paletteDef = palettes[paletteKey] ?? palettes.thermal;
  const colorLUT = useMemo(
    () => buildColorLUT(paletteDef.stops, !!paletteDef.cycling, paletteDef.background),
    [paletteDef],
  );
  const bgABGR = useMemo(() => getBackgroundABGR(paletteDef), [paletteDef]);

  // Sync the page background color with the palette
  useEffect(() => {
    document.body.style.backgroundColor = paletteDef.background;
  }, [paletteDef.background]);

  // ─── Main Effect: Canvas Setup + Animation Loop ──────────────────────────

  useEffect(() => {
    if (prefersReducedMotion) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false, willReadFrequently: false });
    if (!ctx) return;

    const pixelScale = getPixelScale();
    const mobile = isMobile();
    // Scale diffusion passes with burn speed so higher Rate = faster glow spread
    const baseDiffusion = mobile ? DIFFUSION_ITERS_MOBILE : DIFFUSION_ITERS_DESKTOP;
    const diffusionIters = baseDiffusion * (0.5 + burnSpeed * 1.5);

    // Heat grid dimensions (downscaled from screen size)
    let gridW = Math.ceil(window.innerWidth / pixelScale);
    let gridH = Math.ceil(window.innerHeight / pixelScale);

    // Core simulation buffers
    let heat = new Float32Array(gridW * gridH);       // Current heat values
    let heatSwap = new Float32Array(gridW * gridH);   // Scratch buffer for diffusion
    let glowMask = new Float32Array(gridW * gridH);   // Persistent glow visibility mask
    canvas.width = gridW;
    canvas.height = gridH;

    let kernel = buildBrushKernel(brushRadiusPx, bleedRadiusPx, pixelScale);
    const accumRate = burnSpeedToAccum(burnSpeed);

    // Reusable render buffers — allocated once, recreated only on resize.
    // Avoids per-frame GC pressure that tanks Safari performance.
    let imageData = ctx.createImageData(gridW, gridH);
    let pixels = new Uint32Array(imageData.data.buffer);

    // Cycling palette config: determines LUT wrapping behavior
    const isCycling = !!paletteDef.cycling;
    const FADE_IN = isCycling ? 40 : 0;       // LUT entries reserved for background fade
    const COLOR_RANGE = 256 - FADE_IN;         // Remaining LUT entries for color cycling

    // Glow mask config: limits visible glow to a radius around painted areas
    const useGlowMask = glowMultiplier !== Infinity;
    const glowMaxGrid = useGlowMask
      ? (brushRadiusPx + bleedRadiusPx + glowMultiplier * brushRadiusPx) / pixelScale
      : 0;
    const glowFadeStart = glowMaxGrid * 0.7;   // Glow starts fading at 70% of max radius
    const screenDiag = Math.sqrt(gridW * gridW + gridH * gridH);
    const glowPaintR = Math.min(Math.ceil(glowMaxGrid), Math.ceil(screenDiag));

    // ─── Resize Handler ──────────────────────────────────────────────────

    const onResize = () => {
      const newW = Math.ceil(window.innerWidth / pixelScale);
      const newH = Math.ceil(window.innerHeight / pixelScale);
      const newHeat = new Float32Array(newW * newH);
      const newGlow = new Float32Array(newW * newH);
      // Copy existing heat and glow data into resized buffers
      for (let y = 0; y < Math.min(gridH, newH); y++) {
        for (let x = 0; x < Math.min(gridW, newW); x++) {
          newHeat[y * newW + x] = heat[y * gridW + x];
          newGlow[y * newW + x] = glowMask[y * gridW + x];
        }
      }
      gridW = newW;
      gridH = newH;
      heat = newHeat;
      glowMask = newGlow;
      heatSwap = new Float32Array(gridW * gridH);
      canvas.width = gridW;
      canvas.height = gridH;
      imageData = ctx.createImageData(gridW, gridH);
      pixels = new Uint32Array(imageData.data.buffer);
    };

    // ─── Pointer Event Handlers ──────────────────────────────────────────

    const onPointerMove = (e: MouseEvent | Touch) => {
      pointerRef.current.x = e.clientX;
      pointerRef.current.y = e.clientY;
      pointerRef.current.active = true;
    };
    const onMouseMove = (e: MouseEvent) => onPointerMove(e);
    const onTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      if (e.touches.length > 0) onPointerMove(e.touches[0]);
    };
    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length > 0) onPointerMove(e.touches[0]);
    };
    const onPointerLeave = () => {
      pointerRef.current.active = false;
    };

    window.addEventListener('resize', onResize);
    window.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseleave', onPointerLeave);
    window.addEventListener('blur', onPointerLeave);
    canvas.addEventListener('touchmove', onTouchMove, { passive: false });
    canvas.addEventListener('touchstart', onTouchStart, { passive: true });
    canvas.addEventListener('touchend', onPointerLeave);

    // ─── Animation Loop ─────────────────────────────────────────────────

    let frameId = 0;
    let lastTime = 0;
    let fracIters = 0;  // Fractional diffusion iterations carried between frames

    const tick = (time: number) => {
      if (lastTime === 0) lastTime = time;
      const dt = Math.min((time - lastTime) / (1000 / TARGET_FPS), 3);
      lastTime = time;

      const ptr = pointerRef.current;
      const gx = Math.floor(ptr.x / pixelScale);
      const gy = Math.floor(ptr.y / pixelScale);

      // ── 1. Sample heat under pointer to set paint intensity ──────────

      let paintIntensity = 0;
      if (ptr.active) {
        const kd = kernel.data;
        const kc = kernel.count;
        let sum = 0;
        let cnt = 0;
        // Average existing heat under the brush's solid core (weight = 1)
        for (let i = 0; i < kc; i++) {
          const off = i * 3;
          if (kd[off + 2] < 1) continue;
          const sx = gx + (kd[off] | 0);
          const sy = gy + (kd[off + 1] | 0);
          if (sx >= 0 && sx < gridW && sy >= 0 && sy < gridH) {
            sum += heat[sy * gridW + sx];
            cnt++;
          }
        }
        // Paint intensity = existing heat + accumulation rate
        // For non-cycling palettes, clamp to 1.0 to prevent normalization issues.
        // For cycling palettes, let heat grow unbounded for continuous color cycling.
        const raw = (cnt > 0 ? sum / cnt : 0) + accumRate * dt;
        paintIntensity = isCycling ? raw : Math.min(1, raw);
      }

      // ── 2. Diffusion: spread heat to neighboring cells ───────────────

      fracIters += diffusionIters * dt;
      const iters = Math.floor(fracIters);
      fracIters -= iters;

      let src = heat;
      let dst = heatSwap;
      for (let pass = 0; pass < iters; pass++) {
        for (let y = 0; y < gridH; y++) {
          const row = y * gridW;
          for (let x = 0; x < gridW; x++) {
            const idx = row + x;
            const c = src[idx];
            const l = x > 0 ? src[idx - 1] : c;
            const r = x < gridW - 1 ? src[idx + 1] : c;
            const u = y > 0 ? src[idx - gridW] : c;
            const d = y < gridH - 1 ? src[idx + gridW] : c;
            // Blend cell toward the average of its 4 neighbors
            dst[idx] = c + ((l + r + u + d) * 0.25 - c) * DIFFUSION_FACTOR;
          }
        }
        const tmp = src;
        src = dst;
        dst = tmp;
      }
      if (src !== heat) heat.set(src);

      // ── 3. Decay: fade all heat every frame ─────────────────────────
      // Runs before painting so the brush can replenish the area it covers.
      // When pointer is inactive, decay faster so the diffused edges contract
      // quickly instead of lingering.
      let decay = Math.pow(FIXED_DECAY_RATE, dt * (isCycling ? 2 : 1));
      if (!ptr.active) decay = Math.pow(decay, 2);  // 2x faster when not painting
      for (let i = 0, len = heat.length; i < len; i++) {
        heat[i] *= decay;
      }
      if (useGlowMask) {
        for (let i = 0, len = glowMask.length; i < len; i++) {
          glowMask[i] *= decay;
        }
      }

      // ── 4. Paint heat under pointer using the brush kernel ───────────
      // Painting after decay means the brush area stays at full intensity
      // while heat radiates outward and cools at the edges.

      if (ptr.active) {
        const kd = kernel.data;
        const kc = kernel.count;
        for (let i = 0; i < kc; i++) {
          const off = i * 3;
          const px = gx + (kd[off] | 0);
          const py = gy + (kd[off + 1] | 0);
          if (px >= 0 && px < gridW && py >= 0 && py < gridH) {
            const idx = py * gridW + px;
            const val = paintIntensity * kd[off + 2];
            if (val > heat[idx]) heat[idx] = val;  // Max-blend (don't reduce existing heat)
          }
        }

        // Update glow mask where heat was painted (only when glow is limited)
        if (useGlowMask) {
          const yMin = Math.max(0, gy - glowPaintR);
          const yMax = Math.min(gridH - 1, gy + glowPaintR);
          const xMin = Math.max(0, gx - glowPaintR);
          const xMax = Math.min(gridW - 1, gx + glowPaintR);
          for (let y = yMin; y <= yMax; y++) {
            const dyM = y - gy;
            for (let x = xMin; x <= xMax; x++) {
              const dxM = x - gx;
              const dist = Math.sqrt(dxM * dxM + dyM * dyM);
              if (dist <= glowMaxGrid) {
                const idx = y * gridW + x;
                let val = 1;
                if (dist > glowFadeStart) {
                  const t = (dist - glowFadeStart) / (glowMaxGrid - glowFadeStart);
                  val = (1 - t) * (1 - t) * (1 - t);  // Cubic fade at glow edge
                }
                if (val > glowMask[idx]) glowMask[idx] = val;
              }
            }
          }
        }
      }

      // ── 5. Render: map heat values to colors via the LUT ─────────────

      for (let i = 0, len = heat.length; i < len; i++) {
        const v = heat[i] * (useGlowMask ? Math.min(1, glowMask[i]) : 1);
        const threshold = isCycling ? 0.015 : 0.002;
        if (v > threshold) {
          let idx: number;
          if (isCycling) {
            const raw = (v * 255) | 0;
            if (raw <= FADE_IN) {
              idx = raw;
            } else {
              idx = FADE_IN + (((raw - FADE_IN) >> 2) % COLOR_RANGE);
            }
          } else {
            idx = Math.min(255, (v * 255) | 0);
          }
          pixels[i] = colorLUT[idx];
        } else {
          pixels[i] = bgABGR;
          if (heat[i] < 0) heat[i] = 0;
        }
      }
      ctx.putImageData(imageData, 0, 0);

      frameId = requestAnimationFrame(tick);
    };

    frameId = requestAnimationFrame(tick);

    // ─── Cleanup ─────────────────────────────────────────────────────────

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseleave', onPointerLeave);
      window.removeEventListener('blur', onPointerLeave);
      canvas.removeEventListener('touchmove', onTouchMove);
      canvas.removeEventListener('touchstart', onTouchStart);
      canvas.removeEventListener('touchend', onPointerLeave);
    };
  }, [
    paletteKey,
    brushRadiusPx,
    bleedRadiusPx,
    glowMultiplier,
    burnSpeed,
    colorLUT,
    bgABGR,
    prefersReducedMotion,
  ]);

  if (prefersReducedMotion) return null;

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 0,
        pointerEvents: 'auto',
        imageRendering: 'auto',
        touchAction: 'none',
      }}
    />
  );
}
