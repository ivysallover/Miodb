import React, { useMemo, useState } from 'react';
import { useMioStore } from '@/utils/useMioStore';
import { DitherShader } from '@/components/ui/dither-shader';
import { MioDevCanvas } from '@/components/canvas/MioDevCanvas';
import { playMioDevSound } from '@/lib/sound';
import { Sliders, Eye } from 'lucide-react';

interface MioDeviceSchematicProps {
  className?: string;
}

export const MioDeviceSchematic: React.FC<MioDeviceSchematicProps> = ({ className = '' }) => {
  const theme = useMioStore((s) => s.theme);
  const isDark = theme === 'dark';

  const [viewMode, setViewMode] = useState<'schematic' | 'console'>('schematic');
  const [dialRotation, setDialRotation] = useState<number>(0);
  const [activeToast, setActiveToast] = useState<string | null>(null);
  const [activeButton, setActiveButton] = useState<'A' | 'B' | null>(null);

  const showToast = (msg: string) => {
    setActiveToast(msg);
    setTimeout(() => {
      setActiveToast((prev) => (prev === msg ? null : prev));
    }, 2400);
  };

  const handleDialClick = () => {
    playMioDevSound('tick');
    setDialRotation((r) => r + 30);
    showToast('HORIZON DIAL // SELECCIONANDO HORIZONTE');
  };

  const handleButtonAClick = () => {
    playMioDevSound('buttonA');
    setActiveButton('A');
    showToast('BOTÓN A // AUTOML LEADERBOARD ACTIVADO');
    setTimeout(() => setActiveButton(null), 300);
  };

  const handleButtonBClick = () => {
    playMioDevSound('buttonB');
    setActiveButton('B');
    showToast('BOTÓN B // EXPLICABILIDAD SHAP SIN SESGOS');
    setTimeout(() => setActiveButton(null), 300);
  };

  const toggleViewMode = () => {
    playMioDevSound('select');
    setViewMode((prev) => (prev === 'schematic' ? 'console' : 'schematic'));
  };

  // High-resolution SVG representing the Silver Machined Ceramic MIO-DEV 01 Hardware
  const schematicSvgDataUri = useMemo(() => {
    const chassisBg = isDark ? '#11101d' : '#e6e6ec';
    const chassisBorder = isDark ? '#2e2c45' : '#c8c8d2';
    const innerBezel = isDark ? '#08080f' : '#14141c';
    const strokeColor = isDark ? '#ffffff' : '#1c1b26';
    const violetColor = isDark ? '#a78bfa' : '#7647eb';
    const limeColor = '#bdf559';
    const silverAccent = isDark ? '#3d3b54' : '#d2d2dc';

    const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 700" width="1000" height="700">
      <defs>
        <linearGradient id="silverChassis" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${isDark ? '#1a1829' : '#f0f0f5'}" />
          <stop offset="50%" stop-color="${chassisBg}" />
          <stop offset="100%" stop-color="${isDark ? '#0d0c17' : '#dcdce4'}" />
        </linearGradient>
        <radialGradient id="dialMetal" cx="40%" cy="40%" r="60%">
          <stop offset="0%" stop-color="${isDark ? '#3b3855' : '#ffffff'}" />
          <stop offset="70%" stop-color="${isDark ? '#1a1828' : '#d8d8e2'}" />
          <stop offset="100%" stop-color="${isDark ? '#0f0e1a' : '#b8b8c5'}" />
        </radialGradient>
      </defs>

      <!-- 1. Outer Machined Unibody Chassis -->
      <rect x="40" y="30" width="920" height="640" rx="36" fill="url(#silverChassis)" stroke="${chassisBorder}" stroke-width="3"/>
      <!-- Inner Precision Chamfer -->
      <rect x="52" y="42" width="896" height="616" rx="28" fill="none" stroke="${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.8)'}" stroke-width="1.8"/>

      <!-- Corner Torx Screws (Machined Silver) -->
      <g stroke="${strokeColor}" stroke-width="1.8" fill="none">
        <circle cx="70" cy="60" r="7"/>
        <line x1="64" y1="60" x2="76" y2="60"/>
        <line x1="70" y1="54" x2="70" y2="66"/>

        <circle cx="930" cy="60" r="7"/>
        <line x1="924" y1="60" x2="936" y2="60"/>
        <line x1="930" y1="54" x2="930" y2="66"/>

        <circle cx="70" cy="640" r="7"/>
        <line x1="64" y1="640" x2="76" y2="640"/>
        <line x1="70" y1="634" x2="70" y2="646"/>

        <circle cx="930" cy="640" r="7"/>
        <line x1="924" y1="640" x2="936" y2="640"/>
        <line x1="930" y1="634" x2="930" y2="646"/>
      </g>

      <!-- Top Hardware Telemetry Badge & Status -->
      <rect x="80" y="65" width="230" height="26" rx="7" fill="${silverAccent}" stroke="${chassisBorder}" stroke-width="1.2"/>
      <text x="96" y="82" font-family="monospace" font-size="11" font-weight="900" fill="${violetColor}">MIO-DEV 01 // SILVER CERAMIC</text>
      
      <!-- LED Pulse Status -->
      <circle cx="330" cy="78" r="4.5" fill="${limeColor}"/>
      <text x="344" y="82" font-family="monospace" font-size="10" font-weight="bold" fill="${strokeColor}" opacity="0.8">SA-EAST NOMINAL</text>

      <!-- Micro-perforated Speaker Grille -->
      <g fill="${strokeColor}" opacity="0.4">
        <circle cx="730" cy="74" r="1.5"/>
        <circle cx="738" cy="74" r="1.5"/>
        <circle cx="746" cy="74" r="1.5"/>
        <circle cx="754" cy="74" r="1.5"/>
        <circle cx="762" cy="74" r="1.5"/>
        <circle cx="770" cy="74" r="1.5"/>
        <circle cx="730" cy="82" r="1.5"/>
        <circle cx="738" cy="82" r="1.5"/>
        <circle cx="746" cy="82" r="1.5"/>
        <circle cx="754" cy="82" r="1.5"/>
        <circle cx="762" cy="82" r="1.5"/>
        <circle cx="770" cy="82" r="1.5"/>
      </g>

      <!-- 2. OLED Display Screen Enclosure (Deep Contrast Mirror) -->
      <rect x="80" y="112" width="600" height="420" rx="20" fill="${innerBezel}" stroke="${chassisBorder}" stroke-width="2.5"/>
      <rect x="84" y="116" width="592" height="412" rx="16" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="1"/>
      
      <!-- Screen Technical Header -->
      <line x1="80" y1="148" x2="680" y2="148" stroke="rgba(255,255,255,0.12)" stroke-width="1"/>
      <text x="100" y="134" font-family="monospace" font-size="11" fill="#a1a1aa">AUTOML // PROPHET + ARIMA (P95)</text>
      <text x="560" y="134" font-family="monospace" font-size="11" font-weight="900" fill="${limeColor}">R²: 0.984</text>

      <!-- P95 Confidence Band (Volumetric Shading) -->
      <path d="M 120 380 Q 220 340, 320 280 T 520 200 L 640 170 L 640 230 Q 520 270, 320 350 T 120 420 Z" fill="${violetColor}" fill-opacity="0.32" stroke="none"/>
      
      <!-- Upper and Lower Dotted Confidence Envelopes -->
      <path d="M 120 380 Q 220 340, 320 280 T 520 200 L 640 170" fill="none" stroke="${violetColor}" stroke-width="1.8" stroke-dasharray="4,4"/>
      <path d="M 120 420 Q 220 380, 320 350 T 520 250 L 640 230" fill="none" stroke="${violetColor}" stroke-width="1.8" stroke-dasharray="4,4"/>

      <!-- Median High-Precision Forecast Line -->
      <path d="M 120 400 Q 220 360, 320 315 T 520 225 L 640 200" fill="none" stroke="${limeColor}" stroke-width="3.8" stroke-linecap="round"/>

      <!-- Active Point & Inspection Beam -->
      <circle cx="520" cy="225" r="6" fill="${limeColor}" stroke="#ffffff" stroke-width="2"/>
      <line x1="520" y1="225" x2="520" y2="470" stroke="rgba(255,255,255,0.2)" stroke-width="1" stroke-dasharray="3,3"/>
      
      <!-- Screen Bottom Telemetry Bar -->
      <line x1="80" y1="468" x2="680" y2="468" stroke="rgba(255,255,255,0.12)" stroke-width="1"/>
      <text x="100" y="498" font-family="monospace" font-size="28" font-weight="900" fill="#ffffff">$104,800</text>
      <text x="254" y="492" font-family="monospace" font-size="12" font-weight="bold" fill="${limeColor}">+38.2% YoY</text>
      <text x="254" y="508" font-family="monospace" font-size="10" fill="#a1a1aa">Banda: [$98.4k — $111.2k]</text>
      <text x="490" y="498" font-family="monospace" font-size="12" font-weight="bold" fill="${violetColor}">0 ANOMALÍAS</text>

      <!-- 3. Hardware Controls: Rotary Horizon Dial, Buttons A & B (Right Side) -->
      <!-- Silver Knurled Dial -->
      <g transform="translate(800, 200) rotate(${dialRotation})">
        <circle cx="0" cy="0" r="56" fill="url(#dialMetal)" stroke="${chassisBorder}" stroke-width="2.5"/>
        <circle cx="0" cy="0" r="44" fill="none" stroke="${strokeColor}" stroke-width="1.5" stroke-dasharray="3,3"/>
        <line x1="-32" y1="0" x2="32" y2="0" stroke="${strokeColor}" stroke-width="3" stroke-linecap="round"/>
        <circle cx="0" cy="0" r="8" fill="${violetColor}"/>
      </g>
      <text x="800" y="276" text-anchor="middle" font-family="monospace" font-size="9" font-weight="bold" fill="${strokeColor}" opacity="0.8">HORIZON DIAL</text>

      <!-- Button A: Machined Lime Pill -->
      <g transform="translate(840, 360)">
        <circle cx="0" cy="0" r="27" fill="${limeColor}" stroke="${strokeColor}" stroke-width="2.5"/>
        <circle cx="0" cy="0" r="23" fill="none" stroke="rgba(255,255,255,0.5)" stroke-width="1"/>
        <text x="0" y="7" text-anchor="middle" font-family="monospace" font-size="19" font-weight="900" fill="#000000">A</text>
        <text x="0" y="44" text-anchor="middle" font-family="monospace" font-size="9" font-weight="bold" fill="${strokeColor}" opacity="0.8">AUTOML</text>
      </g>

      <!-- Button B: Machined Electric Violet Pill -->
      <g transform="translate(760, 420)">
        <circle cx="0" cy="0" r="27" fill="${violetColor}" stroke="${strokeColor}" stroke-width="2.5"/>
        <circle cx="0" cy="0" r="23" fill="none" stroke="rgba(255,255,255,0.4)" stroke-width="1"/>
        <text x="0" y="7" text-anchor="middle" font-family="monospace" font-size="19" font-weight="900" fill="#ffffff">B</text>
        <text x="0" y="44" text-anchor="middle" font-family="monospace" font-size="9" font-weight="bold" fill="${strokeColor}" opacity="0.8">SHAP</text>
      </g>

      <!-- Tactile D-Pad (Bottom Left) -->
      <g transform="translate(200, 595)">
        <rect x="-46" y="-15" width="92" height="30" rx="6" fill="${silverAccent}" stroke="${strokeColor}" stroke-width="2"/>
        <rect x="-15" y="-46" width="30" height="92" rx="6" fill="${silverAccent}" stroke="${strokeColor}" stroke-width="2"/>
        <circle cx="0" cy="0" r="6" fill="${strokeColor}" opacity="0.4"/>
      </g>

      <!-- START / SELECT Precision Hardware Pills -->
      <g transform="translate(420, 595)">
        <rect x="-35" y="-7" width="32" height="14" rx="7" fill="${silverAccent}" stroke="${strokeColor}" stroke-width="1.8" transform="rotate(-25)"/>
        <rect x="15" y="-7" width="32" height="14" rx="7" fill="${silverAccent}" stroke="${strokeColor}" stroke-width="1.8" transform="rotate(-25)"/>
        <text x="-24" y="24" font-family="monospace" font-size="8" font-weight="bold" fill="${strokeColor}" opacity="0.7">SELECT</text>
        <text x="26" y="24" font-family="monospace" font-size="8" font-weight="bold" fill="${strokeColor}" opacity="0.7">START</text>
      </g>
    </svg>
    `;

    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  }, [isDark, dialRotation]);

  return (
    <div
      className={`relative select-none transition-transform duration-700 ease-out group ${className}`}
      style={{
        // Fixed perspective angled towards the right and bleeding off-screen (Emil Compliance: no free 3D rotation)
        transform: 'perspective(1200px) rotateY(-8deg) rotateX(12deg) rotateZ(8deg)',
        transformOrigin: 'center center',
      }}
    >
      <div className="relative overflow-hidden rounded-3xl border border-black/10 dark:border-white/20 shadow-[0_35px_90px_-20px_rgba(0,0,0,0.35)] dark:shadow-[0_35px_90px_-20px_rgba(0,0,0,0.8)] backdrop-blur-sm">
        
        {viewMode === 'schematic' ? (
          <div className="relative">
            {/* Bayer Dither Shader applying the exact requested filter */}
            <DitherShader
              src={schematicSvgDataUri}
              gridSize={2}
              ditherMode="bayer"
              colorMode="duotone"
              invert={false}
              animated={true}
              animationSpeed={0.012}
              primaryColor={isDark ? '#07070a' : '#f0f0f5'}
              secondaryColor={isDark ? '#7647eb' : '#602cd1'}
              threshold={0.46}
              className="w-[520px] sm:w-[680px] lg:w-[780px] h-[360px] sm:h-[460px] lg:h-[520px]"
            />

            {/* Tactile Clickable Hotspots overlaying the schematic for interactive feel */}
            {/* Rotary Dial Hotspot */}
            <button
              type="button"
              onClick={handleDialClick}
              title="Girar Horizon Dial"
              className="absolute cursor-pointer rounded-full border border-transparent hover:border-[#7647eb]/40 hover:bg-[#7647eb]/10 transition-all active:scale-95"
              style={{
                right: '16%',
                top: '23%',
                width: '12%',
                height: '18%',
              }}
            />

            {/* Button A (AutoML) Hotspot */}
            <button
              type="button"
              onClick={handleButtonAClick}
              title="Pulsar Botón A (AutoML)"
              className={`absolute cursor-pointer rounded-full border border-transparent hover:border-[#bdf559]/60 hover:bg-[#bdf559]/20 transition-all active:scale-90 ${
                activeButton === 'A' ? 'ring-4 ring-[#bdf559]' : ''
              }`}
              style={{
                right: '12%',
                top: '46%',
                width: '8%',
                height: '12%',
              }}
            />

            {/* Button B (SHAP) Hotspot */}
            <button
              type="button"
              onClick={handleButtonBClick}
              title="Pulsar Botón B (SHAP)"
              className={`absolute cursor-pointer rounded-full border border-transparent hover:border-[#7647eb]/60 hover:bg-[#7647eb]/20 transition-all active:scale-90 ${
                activeButton === 'B' ? 'ring-4 ring-[#7647eb]' : ''
              }`}
              style={{
                right: '20%',
                top: '55%',
                width: '8%',
                height: '12%',
              }}
            />
          </div>
        ) : (
          <div className="w-[520px] sm:w-[680px] lg:w-[780px] p-2 sm:p-4 bg-zinc-950/40 backdrop-blur-md">
            <MioDevCanvas />
          </div>
        )}

        {/* Top Hardware Telemetry Bar with View Toggle Switch */}
        <div className="absolute top-4 left-4 right-4 z-20 flex items-center justify-between pointer-events-auto">
          {/* Hardware ID Badge */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/90 dark:bg-black/75 backdrop-blur-md border border-black/10 dark:border-white/15 text-[11px] font-mono text-zinc-950 dark:text-white shadow-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-[#bdf559] animate-pulse" />
            <span className="font-semibold">MIO-DEV 01</span>
            <span className="text-zinc-400">·</span>
            <span className="text-[#7647eb] dark:text-[#a78bfa]">SILVER CERAMIC</span>
          </div>

          {/* Interactive Switch: Dither Schematic vs Live Interactive Station */}
          <button
            type="button"
            onClick={toggleViewMode}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/90 dark:bg-black/75 backdrop-blur-md border border-black/10 dark:border-white/15 text-[11px] font-mono text-zinc-900 dark:text-zinc-200 hover:text-black dark:hover:text-white transition-all shadow-sm cursor-pointer active:scale-95"
          >
            {viewMode === 'schematic' ? (
              <>
                <Sliders className="w-3.5 h-3.5 text-[#bdf559]" />
                <span>MODO CONSOLA</span>
              </>
            ) : (
              <>
                <Eye className="w-3.5 h-3.5 text-[#7647eb]" />
                <span>ESQUEMA DITHER</span>
              </>
            )}
          </button>
        </div>

        {/* Haptic Telemetry Feedback Toast */}
        {activeToast && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 px-4 py-1.5 rounded-full bg-zinc-950/90 text-white border border-[#bdf559]/40 backdrop-blur-md text-xs font-mono tracking-wide shadow-lg animate-in fade-in slide-in-from-bottom-2 duration-200">
            <span className="text-[#bdf559] font-bold">●</span> {activeToast}
          </div>
        )}
      </div>
    </div>
  );
};

export default MioDeviceSchematic;

