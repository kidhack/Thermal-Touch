# Thermal Touch

An interactive canvas-based heat diffusion effect that responds to mouse and touch input. Move your cursor (or finger on mobile) to paint heat that spreads, glows, and fades in real time.

<!-- Replace with a screenshot or GIF of the effect -->
<!-- ![Thermal Touch Demo](screenshot.gif) -->

**[Live Demo](#)** · **[CodePen](#)** · **[GitHub](https://github.com/kidhack/Thermal-Touch)**

---

## Quick Start

```bash
git clone https://github.com/kidhack/Thermal-Touch.git
cd Thermal-Touch
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser and move your mouse.

---

## How It Works

Thermal Touch runs a real-time heat diffusion simulation on an HTML5 Canvas:

1. **Brush** — A solid disc paints heat at full intensity wherever the cursor moves.
2. **Bleed** — A soft transition zone immediately outside the brush fades from full intensity to zero using cubic easing.
3. **Glow** — Heat diffuses outward over time through iterative neighbor-averaging passes, creating an expanding thermal spread.

Each frame, heat values are mapped through a 256-entry color lookup table (LUT) and rendered via `putImageData`. When the cursor leaves, heat decays exponentially.

The simulation grid runs at half resolution (or quarter on mobile) for performance, then renders at full viewport size with smooth interpolation.

---

## Color Palettes

| Palette | Description |
|---|---|
| **Thermal** | Black → deep purple → magenta → red → orange → yellow. The classic infrared look. |
| **Thermal Light** | Same hue progression in pastel tones on a white background. |
| **Night Vision** | Black → dark green → bright green. Military night-vision aesthetic. |
| **Rainbow Dark** | Full saturated rainbow spectrum on black. |
| **Rainbow Light** | Pastel rainbow on white. |
| **Synthwave** | Deep purple → teal → hot pink on black. Retro neon vibes. |

---

## Usage (React)

The `HeatBackground` component can be used in any React project:

```tsx
import HeatBackground from './HeatBackground';

function App() {
  return (
    <HeatBackground
      palette="thermal"
      brushRadius={40}
      bleedRadius={16}
      glowMultiplier={Infinity}
      burnSpeed={0.5}
    />
  );
}
```

### Props API

| Prop | Type | Default | Description |
|---|---|---|---|
| `palette` | `string` | `'thermal'` | Color palette key. One of: `thermal`, `thermalLight`, `nightVision`, `rainbowDark`, `rainbowLight`, `synthwave`. |
| `brushRadius` | `number` | `40` | Radius of the solid disc in pixels. Range: 2–200. |
| `bleedRadius` | `number` | `16` | Width of the soft fade band past the brush edge in pixels. 0 = hard edge, higher = softer. Range: 0–60. |
| `glowMultiplier` | `number` | `Infinity` | Max diffusion spread as a multiplier of brush radius. Values: `0`, `1`, `2`, `4`, `8`, `16`, `Infinity`. |
| `burnSpeed` | `number` | `0.5` | Decay speed from 0 (very slow, heat lingers ~30s) to 1 (nearly instant fade). |

---

## Usage (Vanilla JS / CodePen)

The [`codepen/index.html`](codepen/index.html) file is a fully self-contained version with zero dependencies. You can:

1. **Open it directly** in a browser — just double-click the file.
2. **Paste into CodePen** — copy the contents into the HTML pane of a new pen.
3. **Embed in any page** — copy the `<canvas>`, `<style>`, and `<script>` blocks into your HTML.

### Minimal embedding example

```html
<!DOCTYPE html>
<html>
<body style="margin:0; background:#000; overflow:hidden;">
  <canvas id="heat" style="position:fixed; inset:0; width:100vw; height:100vh;"></canvas>
  <script>
    // Paste the contents of codepen/index.html's <script> block here
  </script>
</body>
</html>
```

---

## Configuration Reference

| Parameter | Min | Max | Default | Unit |
|---|---|---|---|---|
| Brush Size | 2 | 200 | 40 | px |
| Bleed | 0 (hard) | 60 (soft) | 16 | px |
| Glow | 0 | ∞ | ∞ | × brush radius |
| Burn Speed | 0% (slow) | 100% (instant) | 50% | — |

---

## Mobile Support

Touch input is fully supported. On mobile devices, the simulation automatically runs at lower resolution (4x downscale instead of 2x) and fewer diffusion passes for smooth performance.

---

## Accessibility

The effect respects the `prefers-reduced-motion` media query. When enabled, the canvas is not rendered.

---

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/my-change`)
3. Make your changes
4. Run `npm run build` to verify the build succeeds
5. Open a pull request

---

## Credits

Built by [Kidhack](http://www.abl.design)

Licensed under the [MIT License](LICENSE).
