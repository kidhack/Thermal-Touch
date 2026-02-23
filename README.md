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
2. **Hardness** — Controls the softness of the brush edge. At 100% the disc has a sharp border; at lower values a cubic-easing gradient blends the disc smoothly into the background.
3. **Glow** — Heat diffuses outward over time through iterative neighbor-averaging passes, creating an expanding thermal spread. The glow radius can be limited or set to infinite.

Each frame, heat values are mapped through a 256-entry color lookup table (LUT) and rendered via `putImageData`. When the cursor leaves, heat decays exponentially.

The simulation grid runs at half resolution (or quarter on mobile) for performance, then renders at full viewport size with smooth interpolation.

---

## Color Palettes

| Palette | Description |
|---|---|
| **Thermal** | Black → deep purple → magenta → red → orange → yellow. The classic infrared look. |
| **Thermal Light** | Reversed hue progression in pastel tones on a white background, with saturated lavender highlights. |
| **Night Vision** | Black → dark green → bright green. Military night-vision aesthetic. |
| **Rainbow Dark** | Full saturated spectrum cycling from magenta through the full hue wheel on black. |
| **Rainbow Light** | Vibrant pastel rainbow on white. |
| **Synthwave** | Deep purple → teal → hot pink on black. Retro neon vibes. |

Rainbow palettes are **cycling** — heat values grow unbounded and the color index wraps, so the spectrum continuously rotates as you keep painting in one spot.

---

## Project Structure

```
Thermal-Touch/
├── src/
│   ├── main.tsx              # React entry point
│   ├── App.tsx               # Root component, state management
│   ├── HeatBackground.tsx    # Canvas heat simulation + rendering
│   ├── ControlPanel.tsx      # Floating UI controls
│   ├── colorPalettes.ts      # Palette definitions + LUT builder
│   └── index.css             # Tailwind base styles
├── codepen/
│   └── index.html            # Standalone vanilla JS version (no dependencies)
├── package.json
└── README.md
```

---

## Usage (React)

The `HeatBackground` component can be dropped into any React project:

```tsx
import HeatBackground from './HeatBackground';

function App() {
  return (
    <HeatBackground
      palette="thermal"
      brushRadius={40}
      bleedRadius={30}
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
| `brushRadius` | `number` | `40` | Radius of the brush disc in CSS pixels (2–200). |
| `bleedRadius` | `number` | `30` | Softness of the brush edge in pixels. `0` = hard edge, `60` = fully soft gradient. Maps inversely to the "Hardness" slider in the UI. |
| `glowMultiplier` | `number` | `Infinity` | Max diffusion spread as a multiple of brush radius. Values: `0`, `1`, `2`, `4`, `8`, `16`, `Infinity`. |
| `burnSpeed` | `number` | `0.5` | Heat accumulation and decay speed. `0` = very slow (~30s half-life), `1` = nearly instant fade. |

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

## Controls

| Control | Range | Default | Description |
|---|---|---|---|
| Color | Dropdown | Thermal | Choose a color palette |
| Brush | 2–200 px | 40 px | Radius of the brush disc |
| Hardness | 5–100% | 50% | Edge softness (low = soft gradient, high = sharp edge) |
| Glow | 0 – ∞ | ∞ | Max spread distance as a multiple of brush radius |
| Rate | 10–100% | 50% | How fast heat accumulates and decays |

---

## Mobile Support

Touch input is fully supported. On mobile devices the simulation automatically:

- Runs at 4x downscale (instead of 2x on desktop) for smooth frame rates
- Reduces diffusion passes from 8 to 4 per frame
- Disables default touch scrolling on the canvas

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
