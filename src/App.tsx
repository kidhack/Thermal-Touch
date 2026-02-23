import { useState, useEffect } from 'react';
import HeatBackground from './HeatBackground';
import ControlPanel from './ControlPanel';
import type { PaletteKey } from './colorPalettes';

export default function App() {
  const [palette, setPalette] = useState<PaletteKey>('thermal');
  const [brushRadius, setBrushRadius] = useState(40);
  const [bleedRadius, setBleedRadius] = useState(16);
  const [glowMultiplier, setGlowMultiplier] = useState(Infinity);
  const [burnSpeed, setBurnSpeed] = useState(0.5);
  const [showHint, setShowHint] = useState(true);

  useEffect(() => {
    const dismiss = () => setShowHint(false);
    window.addEventListener('mousemove', dismiss, { once: true });
    window.addEventListener('touchstart', dismiss, { once: true });
    return () => {
      window.removeEventListener('mousemove', dismiss);
      window.removeEventListener('touchstart', dismiss);
    };
  }, []);

  const isDark =
    palette === 'thermal' ||
    palette === 'nightVision' ||
    palette === 'rainbowDark' ||
    palette === 'synthwave';

  return (
    <>
      <HeatBackground
        palette={palette}
        brushRadius={brushRadius}
        bleedRadius={bleedRadius}
        glowMultiplier={glowMultiplier}
        burnSpeed={burnSpeed}
      />

      <ControlPanel
        palette={palette}
        brushRadius={brushRadius}
        bleedRadius={bleedRadius}
        glowMultiplier={glowMultiplier}
        burnSpeed={burnSpeed}
        onPaletteChange={setPalette}
        onBrushRadiusChange={setBrushRadius}
        onBleedRadiusChange={setBleedRadius}
        onGlowMultiplierChange={setGlowMultiplier}
        onBurnSpeedChange={setBurnSpeed}
      />

      {/* First-interaction hint */}
      {showHint && (
        <div
          className={`fixed inset-0 z-40 flex items-center justify-center pointer-events-none transition-opacity duration-1000 ${
            showHint ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <p
            className={`text-lg tracking-wide ${
              isDark ? 'text-white/30' : 'text-black/20'
            }`}
          >
            Move your cursor to begin
          </p>
        </div>
      )}
    </>
  );
}
