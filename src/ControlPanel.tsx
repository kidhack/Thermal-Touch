/**
 * ControlPanel — floating control palette for adjusting effect parameters.
 *
 * Positioned in the upper-left corner with a frosted-glass style.
 * Adapts its color scheme (dark/light) based on the active palette's
 * background color. Collapsible to stay out of the way.
 *
 * Controls:
 *   - Color: dropdown to pick a palette (Thermal, Night Vision, etc.)
 *   - Brush: slider for the brush disc radius (2–200 px)
 *   - Hardness: segmented slider (5% steps) controlling edge softness
 *   - Glow: stepped slider for max glow radius (0, 1x–16x, ∞)
 *   - Rate: slider for heat accumulation/decay speed (10–100%)
 */

import { useState } from 'react';
import { Github, ChevronDown, ChevronUp } from 'lucide-react';
import { palettes, type PaletteKey } from './colorPalettes';

/** Glow multiplier steps — multiples of brush radius, plus "off" and "unlimited". */
const GLOW_STEPS = [
  { label: '0', value: 0 },
  { label: '1x', value: 1 },
  { label: '2x', value: 2 },
  { label: '4x', value: 4 },
  { label: '8x', value: 8 },
  { label: '16x', value: 16 },
  { label: '∞', value: Infinity },
];

interface ControlPanelProps {
  palette: PaletteKey;
  brushRadius: number;
  bleedRadius: number;
  glowMultiplier: number;
  burnSpeed: number;
  onPaletteChange: (key: PaletteKey) => void;
  onBrushRadiusChange: (val: number) => void;
  onBleedRadiusChange: (val: number) => void;
  onGlowMultiplierChange: (val: number) => void;
  onBurnSpeedChange: (val: number) => void;
}

/** True if the palette uses a dark background (black). */
function isDarkPalette(key: PaletteKey): boolean {
  return palettes[key]?.background === '#000000';
}

export default function ControlPanel({
  palette,
  brushRadius,
  bleedRadius,
  glowMultiplier,
  burnSpeed,
  onPaletteChange,
  onBrushRadiusChange,
  onBleedRadiusChange,
  onGlowMultiplierChange,
  onBurnSpeedChange,
}: ControlPanelProps) {
  const [collapsed, setCollapsed] = useState(false);
  const dark = isDarkPalette(palette);

  // Adaptive styling: swap between light and dark text/borders
  const textColor = dark ? 'text-white' : 'text-gray-900';
  const textMuted = dark ? 'text-white/60' : 'text-gray-500';
  const borderColor = dark ? 'border-white/15' : 'border-black/10';
  const bgPanel = dark
    ? 'bg-black/30 backdrop-blur-md'
    : 'bg-white/40 backdrop-blur-md';
  const selectBg = dark ? 'bg-white/10' : 'bg-black/5';
  const sliderTrack = dark ? 'bg-white/20' : 'bg-black/15';
  const hoverColor = dark ? 'hover:text-white' : 'hover:text-gray-900';

  const glowIndex = GLOW_STEPS.findIndex((s) => s.value === glowMultiplier);

  // Hardness is the inverse of bleedRadius: high hardness = low bleed
  const maxBleed = 60;
  const bleedSliderVal = maxBleed - bleedRadius;

  return (
    <div
      className={`fixed top-4 left-4 z-50 rounded-xl border ${borderColor} ${bgPanel} ${textColor} select-none`}
      style={{ width: 260 }}
    >
      {/* Collapsible Header */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className={`w-full flex items-center justify-between px-4 py-3 ${textColor}`}
      >
        <span className="text-sm font-semibold tracking-wide">
          Thermal Touch
        </span>
        {collapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
      </button>

      {!collapsed && (
        <>
          <div className={`border-t ${borderColor} px-4 py-3 space-y-4`}>
            {/* Color Palette Dropdown */}
            <div>
              <label className={`block text-xs ${textMuted} mb-1`}>Color</label>
              <select
                value={palette}
                onChange={(e) => onPaletteChange(e.target.value as PaletteKey)}
                className={`w-full rounded-md ${selectBg} border ${borderColor} px-2 py-1.5 text-sm ${textColor} focus:outline-none`}
                style={{ backgroundColor: 'transparent' }}
              >
                {Object.entries(palettes).map(([key, def]) => (
                  <option key={key} value={key} className="bg-gray-900 text-white">
                    {def.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Brush Radius Slider (2–200px) */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className={`text-xs ${textMuted}`}>Brush</label>
                <span className={`text-xs ${textMuted} tabular-nums`}>
                  {brushRadius}px
                </span>
              </div>
              <input
                type="range"
                min={2}
                max={200}
                value={brushRadius}
                onChange={(e) => onBrushRadiusChange(Number(e.target.value))}
                className={`w-full h-1 rounded-full appearance-none ${sliderTrack} [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-md`}
              />
            </div>

            {/* Hardness Slider (5–100% in 5% increments) */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className={`text-xs ${textMuted}`}>Hardness</label>
                <span className={`text-xs ${textMuted} tabular-nums`}>
                  {Math.round((bleedSliderVal / maxBleed) * 100)}%
                </span>
              </div>
              <input
                type="range"
                min={1}
                max={20}
                step={1}
                value={Math.max(1, Math.round((bleedSliderVal / maxBleed) * 20))}
                onChange={(e) =>
                  onBleedRadiusChange(maxBleed - (Number(e.target.value) / 20) * maxBleed)
                }
                className={`w-full h-1 rounded-full appearance-none ${sliderTrack} [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-md`}
              />
            </div>

            {/* Glow Radius Slider (0, 1x, 2x, 4x, 8x, 16x, ∞) */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className={`text-xs ${textMuted}`}>Glow</label>
                <span className={`text-xs ${textMuted} tabular-nums`}>
                  {GLOW_STEPS[glowIndex >= 0 ? glowIndex : GLOW_STEPS.length - 1].label}
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={GLOW_STEPS.length - 1}
                step={1}
                value={glowIndex >= 0 ? glowIndex : GLOW_STEPS.length - 1}
                onChange={(e) =>
                  onGlowMultiplierChange(GLOW_STEPS[Number(e.target.value)].value)
                }
                className={`w-full h-1 rounded-full appearance-none ${sliderTrack} [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-md`}
              />
            </div>

            {/* Rate Slider (10–100% in 10% increments) */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className={`text-xs ${textMuted}`}>Rate</label>
                <span className={`text-xs ${textMuted} tabular-nums`}>
                  {Math.round(burnSpeed * 100)}%
                </span>
              </div>
              <input
                type="range"
                min={10}
                max={100}
                step={10}
                value={Math.round(burnSpeed * 100)}
                onChange={(e) => onBurnSpeedChange(Number(e.target.value) / 100)}
                className={`w-full h-1 rounded-full appearance-none ${sliderTrack} [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-md`}
              />
            </div>
          </div>

          {/* Footer with GitHub link and attribution */}
          <div
            className={`border-t ${borderColor} px-4 py-2.5 flex items-center justify-between`}
          >
            <a
              href="https://github.com/kidhack/Thermal-Touch"
              target="_blank"
              rel="noopener noreferrer"
              className={`flex items-center gap-1.5 text-xs ${textMuted} ${hoverColor} transition-colors`}
            >
              <Github size={14} />
              <span>GitHub</span>
            </a>
            <a
              href="https://www.abl.design"
              target="_blank"
              rel="noopener noreferrer"
              className={`text-xs ${textMuted} ${hoverColor} transition-colors`}
            >
              Built by ABL
            </a>
          </div>
        </>
      )}
    </div>
  );
}
