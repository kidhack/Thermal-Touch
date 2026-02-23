import { useEffect, useRef, useState, useMemo } from 'react';
import {
  palettes,
  buildColorLUT,
  getBackgroundABGR,
  type PaletteKey,
} from './colorPalettes';

export interface HeatBackgroundProps {
  palette?: PaletteKey;
  brushRadius?: number;
  bleedRadius?: number;
  glowMultiplier?: number; // 0 | 1 | 2 | 4 | 8 | 16 | Infinity
  burnSpeed?: number;      // 0–1 normalized
}

const TARGET_FPS = 60;
const DIFFUSION_FACTOR = 0.5;
const DIFFUSION_ITERS_DESKTOP = 8;
const DIFFUSION_ITERS_MOBILE = 4;

function isMobile(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    'ontouchstart' in window ||
    navigator.maxTouchPoints > 0 ||
    window.innerWidth < 768
  );
}

function getPixelScale(): number {
  return isMobile() ? 4 : 2;
}

/**
 * Build a circular brush kernel with a solid core and cubic-easing bleed zone.
 * Returns an object with a Float32Array of [dx, dy, weight] triples and a count.
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

  for (let dy = -ceil; dy <= ceil; dy++) {
    for (let dx = -ceil; dx <= ceil; dx++) {
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist <= totalR) {
        let weight: number;
        if (dist <= brushGridR) {
          weight = 1;
        } else {
          const t = (dist - brushGridR) / bleedGridR;
          weight = (1 - t) * (1 - t) * (1 - t); // cubic ease-out
        }
        entries.push(dx, dy, weight);
      }
    }
  }
  return { data: new Float32Array(entries), count: entries.length / 3 };
}

/**
 * Convert a normalized burnSpeed (0 = very slow, 1 = instant) to a per-frame
 * exponential decay multiplier. At 0 the half-life is ~30s, at 1 it decays
 * almost instantly.
 */
function burnSpeedToDecay(burnSpeed: number): number {
  const halfLifeFrames = 30 * TARGET_FPS * Math.pow(1 - burnSpeed, 3) + 1;
  return Math.pow(0.5, 1 / halfLifeFrames);
}

/**
 * Convert a normalized burnSpeed to a per-frame heat accumulation rate.
 */
function burnSpeedToAccum(burnSpeed: number): number {
  const base = 1 / (15 * TARGET_FPS);
  return base * (0.5 + burnSpeed * 2);
}

export default function HeatBackground({
  palette: paletteKey = 'thermal',
  brushRadius: brushRadiusPx = 40,
  bleedRadius: bleedRadiusPx = 16,
  glowMultiplier = Infinity,
  burnSpeed = 0.5,
}: HeatBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pointerRef = useRef({ x: -9999, y: -9999, active: false });
  const [prefersReducedMotion] = useState(
    () =>
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );

  const paletteDef = palettes[paletteKey] ?? palettes.thermal;
  const colorLUT = useMemo(() => buildColorLUT(paletteDef.stops), [paletteDef]);
  const bgABGR = useMemo(() => getBackgroundABGR(paletteDef), [paletteDef]);

  useEffect(() => {
    document.body.style.backgroundColor = paletteDef.background;
  }, [paletteDef.background]);

  useEffect(() => {
    if (prefersReducedMotion) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    const pixelScale = getPixelScale();
    const mobile = isMobile();
    const diffusionIters = mobile ? DIFFUSION_ITERS_MOBILE : DIFFUSION_ITERS_DESKTOP;

    let gridW = Math.ceil(window.innerWidth / pixelScale);
    let gridH = Math.ceil(window.innerHeight / pixelScale);
    let heat = new Float32Array(gridW * gridH);
    let heatSwap = new Float32Array(gridW * gridH);
    canvas.width = gridW;
    canvas.height = gridH;

    let kernel = buildBrushKernel(brushRadiusPx, bleedRadiusPx, pixelScale);
    const decayRate = burnSpeedToDecay(burnSpeed);
    const accumRate = burnSpeedToAccum(burnSpeed);

    const glowMaxGrid =
      glowMultiplier === Infinity
        ? Infinity
        : (brushRadiusPx + bleedRadiusPx + glowMultiplier * brushRadiusPx) / pixelScale;
    const glowFadeStart = glowMaxGrid > 0 ? glowMaxGrid * 0.7 : 0;

    const onResize = () => {
      const newW = Math.ceil(window.innerWidth / pixelScale);
      const newH = Math.ceil(window.innerHeight / pixelScale);
      const newHeat = new Float32Array(newW * newH);
      for (let y = 0; y < Math.min(gridH, newH); y++) {
        for (let x = 0; x < Math.min(gridW, newW); x++) {
          newHeat[y * newW + x] = heat[y * gridW + x];
        }
      }
      gridW = newW;
      gridH = newH;
      heat = newHeat;
      heatSwap = new Float32Array(gridW * gridH);
      canvas.width = gridW;
      canvas.height = gridH;
    };

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
    canvas.addEventListener('touchmove', onTouchMove, { passive: false });
    canvas.addEventListener('touchstart', onTouchStart, { passive: true });
    canvas.addEventListener('touchend', onPointerLeave);

    let lastGx = -9999;
    let lastGy = -9999;

    let frameId = 0;
    let lastTime = 0;
    let fracIters = 0;

    const tick = (time: number) => {
      if (lastTime === 0) lastTime = time;
      const dt = Math.min((time - lastTime) / (1000 / TARGET_FPS), 3);
      lastTime = time;

      const ptr = pointerRef.current;
      const gx = Math.floor(ptr.x / pixelScale);
      const gy = Math.floor(ptr.y / pixelScale);

      // Sample heat under pointer to determine paint intensity
      let paintIntensity = 0;
      if (ptr.active) {
        const kd = kernel.data;
        const kc = kernel.count;
        let sum = 0;
        let cnt = 0;
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
        paintIntensity = (cnt > 0 ? sum / cnt : 0) + accumRate * dt;
      }

      // Diffusion passes
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
            dst[idx] = c + ((l + r + u + d) * 0.25 - c) * DIFFUSION_FACTOR;
          }
        }
        const tmp = src;
        src = dst;
        dst = tmp;
      }
      if (src !== heat) heat.set(src);

      // Paint heat under pointer
      if (ptr.active) {
        lastGx = gx;
        lastGy = gy;
        const kd = kernel.data;
        const kc = kernel.count;
        for (let i = 0; i < kc; i++) {
          const off = i * 3;
          const px = gx + (kd[off] | 0);
          const py = gy + (kd[off + 1] | 0);
          if (px >= 0 && px < gridW && py >= 0 && py < gridH) {
            const idx = py * gridW + px;
            const val = paintIntensity * kd[off + 2];
            if (val > heat[idx]) heat[idx] = val;
          }
        }
      } else {
        // Exponential decay when pointer is inactive
        const decay = Math.pow(decayRate, dt);
        for (let i = 0, len = heat.length; i < len; i++) {
          heat[i] *= decay;
        }
      }

      // Glow masking: attenuate heat beyond the glow radius with soft falloff
      if (glowMaxGrid !== Infinity && lastGx > -9999) {
        for (let y = 0; y < gridH; y++) {
          for (let x = 0; x < gridW; x++) {
            const idx = y * gridW + x;
            if (heat[idx] < 0.001) continue;
            const dx = x - lastGx;
            const dy = y - lastGy;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist > glowMaxGrid) {
              heat[idx] = 0;
            } else if (dist > glowFadeStart) {
              const t = (dist - glowFadeStart) / (glowMaxGrid - glowFadeStart);
              const fade = (1 - t) * (1 - t) * (1 - t);
              heat[idx] *= fade;
            }
          }
        }
      }

      // Find max for normalization
      let maxVal = 1;
      for (let i = 0, len = heat.length; i < len; i++) {
        if (heat[i] > maxVal) maxVal = heat[i];
      }
      const scale = 255 / maxVal;

      // Render to canvas via ImageData
      const imageData = ctx.createImageData(gridW, gridH);
      const pixels = new Uint32Array(imageData.data.buffer);
      for (let i = 0, len = heat.length; i < len; i++) {
        const v = heat[i];
        if (v > 0.002) {
          pixels[i] = colorLUT[(v * scale) | 0];
        } else {
          pixels[i] = bgABGR;
          if (heat[i] < 0) heat[i] = 0;
        }
      }
      ctx.putImageData(imageData, 0, 0);

      frameId = requestAnimationFrame(tick);
    };

    frameId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseleave', onPointerLeave);
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
