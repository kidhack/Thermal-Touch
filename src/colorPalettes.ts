export interface ColorStop {
  pos: number;
  r: number;
  g: number;
  b: number;
}

export interface PaletteDefinition {
  name: string;
  stops: ColorStop[];
  background: string; // hex color for the canvas/page background
}

export const palettes: Record<string, PaletteDefinition> = {
  thermal: {
    name: 'Thermal',
    background: '#000000',
    stops: [
      { pos: 0,   r: 0,   g: 0,   b: 0   },
      { pos: 0.1, r: 15,  g: 0,   b: 50  },
      { pos: 0.2, r: 50,  g: 0,   b: 100 },
      { pos: 0.3, r: 100, g: 0,   b: 140 },
      { pos: 0.4, r: 160, g: 0,   b: 150 },
      { pos: 0.5, r: 200, g: 0,   b: 100 },
      { pos: 0.6, r: 230, g: 40,  b: 40  },
      { pos: 0.7, r: 245, g: 100, b: 0   },
      { pos: 0.8, r: 255, g: 160, b: 0   },
      { pos: 0.9, r: 255, g: 220, b: 40  },
      { pos: 1,   r: 255, g: 250, b: 100 },
    ],
  },

  thermalLight: {
    name: 'Thermal Light',
    background: '#ffffff',
    stops: [
      { pos: 0,   r: 255, g: 255, b: 255 },
      { pos: 0.1, r: 230, g: 220, b: 240 },
      { pos: 0.2, r: 210, g: 190, b: 230 },
      { pos: 0.3, r: 200, g: 170, b: 220 },
      { pos: 0.4, r: 220, g: 160, b: 200 },
      { pos: 0.5, r: 230, g: 150, b: 170 },
      { pos: 0.6, r: 240, g: 160, b: 140 },
      { pos: 0.7, r: 245, g: 180, b: 120 },
      { pos: 0.8, r: 250, g: 200, b: 130 },
      { pos: 0.9, r: 250, g: 220, b: 160 },
      { pos: 1,   r: 255, g: 240, b: 180 },
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
      { pos: 1,   r: 180, g: 255, b: 160 },
    ],
  },

  rainbowDark: {
    name: 'Rainbow Dark',
    background: '#000000',
    stops: [
      { pos: 0,    r: 0,   g: 0,   b: 0   },
      { pos: 0.1,  r: 80,  g: 0,   b: 120 },
      { pos: 0.2,  r: 40,  g: 0,   b: 200 },
      { pos: 0.3,  r: 0,   g: 60,  b: 220 },
      { pos: 0.4,  r: 0,   g: 160, b: 180 },
      { pos: 0.5,  r: 0,   g: 200, b: 60  },
      { pos: 0.6,  r: 80,  g: 220, b: 0   },
      { pos: 0.7,  r: 200, g: 220, b: 0   },
      { pos: 0.8,  r: 255, g: 160, b: 0   },
      { pos: 0.9,  r: 255, g: 60,  b: 0   },
      { pos: 1,    r: 255, g: 40,  b: 40  },
    ],
  },

  rainbowLight: {
    name: 'Rainbow Light',
    background: '#ffffff',
    stops: [
      { pos: 0,    r: 255, g: 255, b: 255 },
      { pos: 0.1,  r: 230, g: 210, b: 240 },
      { pos: 0.2,  r: 200, g: 200, b: 250 },
      { pos: 0.3,  r: 180, g: 220, b: 250 },
      { pos: 0.4,  r: 180, g: 240, b: 230 },
      { pos: 0.5,  r: 180, g: 245, b: 200 },
      { pos: 0.6,  r: 210, g: 245, b: 180 },
      { pos: 0.7,  r: 250, g: 240, b: 180 },
      { pos: 0.8,  r: 255, g: 220, b: 180 },
      { pos: 0.9,  r: 255, g: 200, b: 190 },
      { pos: 1,    r: 255, g: 190, b: 200 },
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

/**
 * Build a 256-entry RGBA lookup table (as Uint32Array) from palette color stops.
 * Each entry is packed as ABGR (little-endian) for direct use with Uint32Array
 * views over ImageData pixel buffers.
 */
export function buildColorLUT(stops: ColorStop[]): Uint32Array {
  const lut = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    const t = i / 255;
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
    const r = Math.round(lo.r + (hi.r - lo.r) * frac);
    const g = Math.round(lo.g + (hi.g - lo.g) * frac);
    const b = Math.round(lo.b + (hi.b - lo.b) * frac);
    // Pack as ABGR for little-endian Uint32Array over ImageData
    lut[i] = (255 << 24) | (b << 16) | (g << 8) | r;
  }
  return lut;
}

/**
 * Get the packed ABGR value for the background color of a palette,
 * used to fill pixels with no heat.
 */
export function getBackgroundABGR(palette: PaletteDefinition): number {
  const hex = palette.background.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  return (255 << 24) | (b << 16) | (g << 8) | r;
}
