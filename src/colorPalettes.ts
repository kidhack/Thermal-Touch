/**
 * Color palette definitions and LUT (lookup table) builder for Thermal Touch.
 *
 * Each palette defines a set of color stops that map heat intensity to RGB.
 * The LUT builder interpolates these stops into a 256-entry array used
 * at render time for fast heat-to-color conversion.
 */

/** A single color stop: position (0–1) along the gradient plus its RGB. */
export interface ColorStop {
  pos: number;
  r: number;
  g: number;
  b: number;
}

/** Definition for one color palette. */
export interface PaletteDefinition {
  name: string;
  stops: ColorStop[];
  /** Hex color for the page/canvas background (e.g. '#000000'). */
  background: string;
  /**
   * When true, heat values above 1.0 wrap through the color spectrum
   * instead of clamping, producing continuous rainbow cycling.
   */
  cycling?: boolean;
}

// ─── Palette Definitions ─────────────────────────────────────────────────────
//
// Non-cycling palettes (thermal, thermalLight, nightVision, synthwave):
//   Heat is clamped to [0, 1]. Low heat → dark/background, high heat → bright.
//
// Cycling palettes (rainbowDark, rainbowLight):
//   Heat grows unbounded. The LUT index wraps, cycling through the full
//   spectrum continuously as heat accumulates. The first and last stops
//   share the same color for seamless wrapping.

export const palettes: Record<string, PaletteDefinition> = {
  thermal: {
    name: 'Thermal',
    background: '#000000',
    stops: [
      { pos: 0,   r: 0,   g: 0,   b: 0   },   // Black (no heat)
      { pos: 0.1, r: 15,  g: 0,   b: 50  },
      { pos: 0.2, r: 50,  g: 0,   b: 100 },
      { pos: 0.3, r: 100, g: 0,   b: 140 },
      { pos: 0.4, r: 160, g: 0,   b: 150 },
      { pos: 0.5, r: 200, g: 0,   b: 100 },
      { pos: 0.6, r: 230, g: 40,  b: 40  },
      { pos: 0.7, r: 245, g: 100, b: 0   },
      { pos: 0.8, r: 255, g: 160, b: 0   },
      { pos: 0.9, r: 255, g: 220, b: 40  },
      { pos: 1,   r: 255, g: 250, b: 100 },   // White-hot
    ],
  },

  thermalLight: {
    name: 'Thermal Light',
    background: '#ffffff',
    stops: [
      { pos: 0,   r: 255, g: 255, b: 255 },   // White (no heat)
      { pos: 0.1, r: 255, g: 240, b: 180 },
      { pos: 0.2, r: 250, g: 220, b: 160 },
      { pos: 0.3, r: 250, g: 200, b: 130 },
      { pos: 0.4, r: 245, g: 180, b: 120 },
      { pos: 0.5, r: 240, g: 160, b: 140 },
      { pos: 0.6, r: 230, g: 130, b: 180 },
      { pos: 0.7, r: 215, g: 135, b: 215 },
      { pos: 0.8, r: 195, g: 145, b: 235 },
      { pos: 0.9, r: 200, g: 165, b: 240 },
      { pos: 1,   r: 220, g: 195, b: 245 },   // Soft lavender
    ],
  },

  nightVision: {
    name: 'Night Vision',
    background: '#000000',
    stops: [
      { pos: 0,   r: 0,   g: 0,   b: 0   },
      { pos: 0.1, r: 0,   g: 10,  b: 0   },
      { pos: 0.2, r: 0,   g: 30,  b: 5   },
      { pos: 0.3, r: 0,   g: 60,  b: 10  },
      { pos: 0.4, r: 0,   g: 100, b: 15  },
      { pos: 0.5, r: 5,   g: 140, b: 20  },
      { pos: 0.6, r: 10,  g: 180, b: 30  },
      { pos: 0.7, r: 30,  g: 210, b: 40  },
      { pos: 0.8, r: 60,  g: 235, b: 60  },
      { pos: 0.9, r: 120, g: 250, b: 100 },
      { pos: 1,   r: 180, g: 255, b: 160 },   // Bright phosphor green
    ],
  },

  // Full-saturation hue rotation. Starts and ends at indigo for seamless wrapping.
  rainbowDark: {
    name: 'Rainbow Dark',
    background: '#000000',
    cycling: true,
    stops: [
      { pos: 0,     r: 126, g: 61,  b: 255 },  // Indigo
      { pos: 0.08,  r: 97,  g: 97,  b: 255 },  // Blue
      { pos: 0.16,  r: 78,  g: 166, b: 255 },  // Sky blue
      { pos: 0.24,  r: 0,   g: 199, b: 166 },  // Teal
      { pos: 0.32,  r: 0,   g: 255, b: 85  },  // Green
      { pos: 0.40,  r: 85,  g: 255, b: 0   },  // Chartreuse
      { pos: 0.48,  r: 170, g: 255, b: 0   },  // Lime
      { pos: 0.56,  r: 229, g: 229, b: 26  },  // Yellow
      { pos: 0.64,  r: 255, g: 170, b: 0   },  // Orange
      { pos: 0.72,  r: 255, g: 85,  b: 0   },  // Red-orange
      { pos: 0.80,  r: 255, g: 61,  b: 61  },  // Red
      { pos: 0.88,  r: 255, g: 0,   b: 115 },  // Magenta
      { pos: 0.93,  r: 192, g: 6,   b: 234 },  // Purple
      { pos: 1,     r: 126, g: 61,  b: 255 },  // Indigo (wraps to pos 0)
    ],
  },

  // Pastel version of rainbowDark for white backgrounds.
  rainbowLight: {
    name: 'Rainbow Light',
    background: '#ffffff',
    cycling: true,
    stops: [
      { pos: 0,     r: 197, g: 168, b: 255 },  // Indigo
      { pos: 0.08,  r: 184, g: 184, b: 255 },  // Blue
      { pos: 0.16,  r: 175, g: 215, b: 255 },  // Sky blue
      { pos: 0.24,  r: 140, g: 230, b: 215 },  // Teal
      { pos: 0.32,  r: 140, g: 255, b: 179 },  // Green
      { pos: 0.40,  r: 179, g: 255, b: 140 },  // Chartreuse
      { pos: 0.48,  r: 217, g: 255, b: 140 },  // Lime
      { pos: 0.56,  r: 243, g: 243, b: 152 },  // Yellow
      { pos: 0.64,  r: 255, g: 217, b: 140 },  // Orange
      { pos: 0.72,  r: 255, g: 179, b: 140 },  // Red-orange
      { pos: 0.80,  r: 255, g: 168, b: 168 },  // Red
      { pos: 0.88,  r: 255, g: 140, b: 192 },  // Magenta
      { pos: 0.93,  r: 227, g: 143, b: 246 },  // Purple
      { pos: 1,     r: 197, g: 168, b: 255 },  // Indigo (wraps)
    ],
  },

  synthwave: {
    name: 'Synthwave',
    background: '#000000',
    stops: [
      { pos: 0,   r: 0,   g: 0,   b: 0   },
      { pos: 0.1, r: 20,  g: 0,   b: 40  },
      { pos: 0.2, r: 50,  g: 0,   b: 80  },
      { pos: 0.3, r: 80,  g: 0,   b: 140 },
      { pos: 0.4, r: 120, g: 0,   b: 180 },
      { pos: 0.5, r: 0,   g: 120, b: 160 },
      { pos: 0.6, r: 0,   g: 180, b: 180 },
      { pos: 0.7, r: 200, g: 0,   b: 160 },
      { pos: 0.8, r: 255, g: 40,  b: 120 },
      { pos: 0.9, r: 255, g: 100, b: 180 },
      { pos: 1,   r: 255, g: 180, b: 220 },
    ],
  },
};

export type PaletteKey = keyof typeof palettes;

// ─── LUT Builder ─────────────────────────────────────────────────────────────

/**
 * Build a 256-entry color lookup table from palette stops.
 *
 * Each entry is packed as ABGR (little-endian) for direct use with
 * Uint32Array views over ImageData pixel buffers.
 *
 * For cycling palettes, the first 40 entries (FADE_IN) blend from the
 * background color into the palette's first stop. This creates a soft
 * edge where diffused heat fades into the background.
 *
 * @param stops    - Array of color stops defining the gradient
 * @param cycling  - Whether this palette wraps (rainbow mode)
 * @param background - Hex background color for the fade-in blend
 * @returns 256-entry Uint32Array of packed ABGR pixel values
 */
export function buildColorLUT(
  stops: ColorStop[],
  cycling = false,
  background = '#000000',
): Uint32Array {
  const lut = new Uint32Array(256);

  // Parse background hex to RGB for fade-in blending
  const bgHex = background.replace('#', '');
  const bgR = parseInt(bgHex.substring(0, 2), 16);
  const bgG = parseInt(bgHex.substring(2, 4), 16);
  const bgB = parseInt(bgHex.substring(4, 6), 16);

  // Cycling palettes reserve the first 40 entries for a soft fade-in
  const FADE_IN = cycling ? 40 : 0;

  for (let i = 0; i < 256; i++) {
    let r: number, g: number, b: number;

    if (i < FADE_IN) {
      // Fade-in region: blend from background toward the first stop
      const fadeT = i / FADE_IN;
      const firstStop = stops[0];
      r = Math.round(bgR + (firstStop.r - bgR) * fadeT);
      g = Math.round(bgG + (firstStop.g - bgG) * fadeT);
      b = Math.round(bgB + (firstStop.b - bgB) * fadeT);
    } else {
      // Color region: linearly interpolate between surrounding stops
      const t = cycling ? (i - FADE_IN) / (255 - FADE_IN) : i / 255;

      let lo = stops[0];
      let hi = stops[stops.length - 1];
      for (let s = 0; s < stops.length - 1; s++) {
        if (t >= stops[s].pos && t <= stops[s + 1].pos) {
          lo = stops[s];
          hi = stops[s + 1];
          break;
        }
      }
      const range = hi.pos - lo.pos;
      const frac = range > 0 ? (t - lo.pos) / range : 0;
      r = Math.round(lo.r + (hi.r - lo.r) * frac);
      g = Math.round(lo.g + (hi.g - lo.g) * frac);
      b = Math.round(lo.b + (hi.b - lo.b) * frac);
    }

    // Pack as ABGR for little-endian Uint32Array pixel access
    lut[i] = (255 << 24) | (b << 16) | (g << 8) | r;
  }
  return lut;
}

/**
 * Get the packed ABGR value for a palette's background color.
 * Used to fill canvas pixels that have no heat.
 */
export function getBackgroundABGR(palette: PaletteDefinition): number {
  const hex = palette.background.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  return (255 << 24) | (b << 16) | (g << 8) | r;
}
