import React from 'react';

export type MioPetMood = 'reposo' | 'trabajando' | 'celebrando' | 'anomalia' | 'durmiendo';
export type MioPetMaterial = 'violet' | 'titanium' | 'blackChrome';

export interface MioPet2DProps {
  mood?: MioPetMood;
  material?: MioPetMaterial;
  size?: number;
  className?: string;
  showShadow?: boolean;
}

/**
 * MIO ESPÉCIMEN 01 — 2D Pixel Taxonomy Engine (EXACT SPECIMEN REPLICA)
 * Reconstructed 1:1 from LÁMINA I-IV.
 * 
 * Grid System:
 * - Total grid: 24w x 28h (pixel units).
 * - Chassis: 15u wide x 11u high (x=4 to x=19, y=8 to y=19).
 * - Stepped 1u chamfers on corners: (x4,y8), (x18,y8), (x4,y18), (x18,y18).
 * - Thick black ink contour (1u) with hard 1u-1u offset shadow in #07050e.
 * - Screen: 11u wide x 8u high (x=6 to x=17, y=10 to y=18), recessed obsidian #0E0C19.
 * - Eyes: Adjacent histogram bars with stepped heights [b1,b2,b3].
 * - Mouth: 3x1u baseline.
 * - Feet: 3x2u x 2.
 * - Articulation arms: 1x3u x 2.
 * - Speaker slits: 3 vertical slits at bottom left.
 * - Status pip: 1u x 1u at bottom right.
 */
export const MioPet2D: React.FC<MioPet2DProps> = ({
  mood = 'reposo',
  material = 'violet',
  size = 180,
  className = '',
  showShadow = true,
}) => {
  // Unit scale for SVG viewport: 24 x 28 grid
  const U = 10;
  const W = 24 * U;
  const H = 28 * U;

  // Material Palettes strictly aligned with LÁMINA IV
  const PALETTES = {
    violet: {
      chassis: '#7647EB',
      chassisDark: '#5e34cc',
      feet: '#4623a8',
      screen: '#0E0C19',
      border: '#07050E',
      shadow: '#07050E',
      arm: '#151320',
    },
    titanium: {
      chassis: '#8E8E9C',
      chassisDark: '#757582',
      feet: '#545460',
      screen: '#0E0C19',
      border: '#07050E',
      shadow: '#07050E',
      arm: '#151320',
    },
    blackChrome: {
      chassis: '#1E1C27',
      chassisDark: '#13111A',
      feet: '#0D0C13',
      screen: '#07060B',
      border: '#040306',
      shadow: '#040306',
      arm: '#0A090F',
    },
  };

  const p = PALETTES[material] || PALETTES.violet;
  const LIMA = '#BDF559';
  const VIOLET_EMISSIVE = '#D946EF';

  // Eye histogram bar heights [bar1, bar2, bar3] in grid units (each bar is 1u wide)
  // Heights range from 1 to 4 units
  const eyeStates: Record<MioPetMood, { left: number[]; right: number[] }> = {
    reposo: { left: [2, 3, 2], right: [2, 3, 2] },
    trabajando: { left: [1, 2, 3], right: [3, 2, 1] },
    celebrando: { left: [2, 3, 4], right: [2, 3, 4] },
    anomalia: { left: [2, 2, 2], right: [2, 2, 4] },
    durmiendo: { left: [1, 1, 1], right: [1, 1, 1] },
  };

  const { left: leftBars, right: rightBars } = eyeStates[mood] || eyeStates.reposo;
  const isSleeping = mood === 'durmiendo';
  const isAnomaly = mood === 'anomalia';
  const isCelebrating = mood === 'celebrando';

  const antennaLightColor = isAnomaly ? VIOLET_EMISSIVE : isSleeping ? '#7a9f3b' : LIMA;

  // Geometry Coordinates (in units):
  // Chassis outer: x from 4 to 19 (15u), y from 7 to 18 (11u)
  // Corner notches: (4,7), (18,7), (4,17), (18,17) cut out
  const chassisPath = `
    M ${5 * U} ${7 * U}
    H ${18 * U}
    V ${8 * U}
    H ${19 * U}
    V ${17 * U}
    H ${18 * U}
    V ${18 * U}
    H ${5 * U}
    V ${17 * U}
    H ${4 * U}
    V ${8 * U}
    H ${5 * U}
    Z
  `;

  // Screen: x from 6 to 17 (11u), y from 9 to 16 (7u)
  const screenPath = `
    M ${7 * U} ${9 * U}
    H ${16 * U}
    V ${10 * U}
    H ${17 * U}
    V ${15 * U}
    H ${16 * U}
    V ${16 * U}
    H ${7 * U}
    V ${15 * U}
    H ${6 * U}
    V ${10 * U}
    H ${7 * U}
    Z
  `;

  return (
    <svg
      width={size}
      height={(size * H) / W}
      viewBox={`0 0 ${W} ${H}`}
      className={`select-none ${className}`}
      style={{ imageRendering: 'pixelated' }}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* ========================================================
          1. HARD OFFSET DROP SHADOW (1u right, 1u down = +10px, +10px)
          ======================================================== */}
      {showShadow && (
        <g fill={p.shadow} transform={`translate(${U}, ${U})`}>
          {/* Chassis shadow */}
          <path d={chassisPath} />
          {/* Antenna stem shadow */}
          <rect x={11 * U} y={5 * U} width={1 * U} height={2 * U} />
          {/* Antenna cube shadow */}
          <rect x={10 * U} y={2 * U} width={3 * U} height={3 * U} />
          {/* Left foot shadow */}
          <rect x={6 * U} y={18 * U} width={3 * U} height={2 * U} />
          {/* Right foot shadow */}
          <rect x={14 * U} y={18 * U} width={3 * U} height={2 * U} />
          {/* Left arm shadow */}
          <rect x={3 * U} y={(isCelebrating ? 9 : 11) * U} width={1 * U} height={3 * U} />
          {/* Right arm shadow */}
          <rect x={19 * U} y={(isCelebrating ? 9 : 11) * U} width={1 * U} height={3 * U} />
        </g>
      )}

      {/* ========================================================
          2. OUTER HARD BLACK CONTOUR (1u thick stepped outline)
          ======================================================== */}
      <g fill={p.border}>
        {/* Chassis stepped border */}
        <path d={chassisPath} />
        {/* Antenna stem border */}
        <rect x={11 * U} y={5 * U} width={1 * U} height={2 * U} />
        {/* Antenna box border */}
        <rect x={10 * U} y={2 * U} width={3 * U} height={3 * U} />
        {/* Left Foot border */}
        <rect x={6 * U} y={18 * U} width={3 * U} height={2 * U} />
        {/* Right Foot border */}
        <rect x={14 * U} y={18 * U} width={3 * U} height={2 * U} />
        {/* Left Arm border */}
        <rect x={3 * U} y={(isCelebrating ? 9 : 11) * U} width={1 * U} height={3 * U} />
        {/* Right Arm border */}
        <rect x={19 * U} y={(isCelebrating ? 9 : 11) * U} width={1 * U} height={3 * U} />
      </g>

      {/* ========================================================
          3. METALLIC CHASSIS BODY (Inset 0.5u to preserve black outline)
          ======================================================== */}
      {/* Main body fill */}
      <path
        d={`
          M ${5.5 * U} ${7.5 * U}
          H ${17.5 * U}
          V ${8.5 * U}
          H ${18.5 * U}
          V ${16.5 * U}
          H ${17.5 * U}
          V ${17.5 * U}
          H ${5.5 * U}
          V ${16.5 * U}
          H ${4.5 * U}
          V ${8.5 * U}
          H ${5.5 * U}
          Z
        `}
        fill={p.chassis}
      />

      {/* Chassis bottom chamfer shadow accent (darker metal rim) */}
      <rect x={5 * U} y={16.5 * U} width={13 * U} height={1 * U} fill={p.chassisDark} />

      {/* Feet (Inner fill) */}
      <rect x={6.5 * U} y={18 * U} width={2 * U} height={1.5 * U} fill={p.feet} />
      <rect x={14.5 * U} y={18 * U} width={2 * U} height={1.5 * U} fill={p.feet} />

      {/* Articulation Arms (Inner fill - Black chrome) */}
      <rect x={3.2 * U} y={(isCelebrating ? 9.2 : 11.2) * U} width={0.6 * U} height={2.6 * U} fill={p.arm} />
      <rect x={19.2 * U} y={(isCelebrating ? 9.2 : 11.2) * U} width={0.6 * U} height={2.6 * U} fill={p.arm} />

      {/* ========================================================
          4. ANTENNA (3x3u with inner pip)
          ======================================================== */}
      {/* Stem */}
      <rect x={11.2 * U} y={5 * U} width={0.6 * U} height={2 * U} fill={p.arm} />
      {/* Antenna Box (Cube) */}
      <rect x={10.4 * U} y={2.4 * U} width={2.2 * U} height={2.2 * U} fill={antennaLightColor} />
      {/* Center signal pip */}
      <circle cx={11.5 * U} cy={3.5 * U} r={0.35 * U} fill="#0E0C19" />

      {/* ========================================================
          5. RECESSED OBSIDIAN SCREEN (11u x 7u)
          ======================================================== */}
      <path d={screenPath} fill={p.screen} />
      {/* Top bevel hairline reflection */}
      <line
        x1={7 * U}
        y1={9.2 * U}
        x2={16 * U}
        y2={9.2 * U}
        stroke="rgba(255,255,255,0.18)"
        strokeWidth={1}
      />

      {/* ========================================================
          6. EYES: HISTOGRAM BARS (Connected stepped frequencies)
          ======================================================== */}
      {/* Left Eye: 3 adjacent bars at x = 7.5u, 8.5u, 9.5u */}
      {leftBars.map((height, i) => {
        const barW = 1 * U;
        const barH = height * U;
        const barX = (7.5 + i) * U;
        const barY = 14 * U - barH; // baseline at y=14
        return (
          <g key={`l-bar-${i}`}>
            <rect x={barX} y={barY} width={barW} height={barH} fill={LIMA} />
            {/* Subtle vertical divider between histogram bins */}
            {i > 0 && <line x1={barX} y1={barY} x2={barX} y2={14 * U} stroke="#0E0C19" strokeWidth={0.8} />}
          </g>
        );
      })}

      {/* Right Eye: 3 adjacent bars at x = 12.5u, 13.5u, 14.5u */}
      {rightBars.map((height, i) => {
        const barW = 1 * U;
        const barH = height * U;
        const barX = (12.5 + i) * U;
        const barY = 14 * U - barH;
        return (
          <g key={`r-bar-${i}`}>
            <rect x={barX} y={barY} width={barW} height={barH} fill={LIMA} />
            {i > 0 && <line x1={barX} y1={barY} x2={barX} y2={14 * U} stroke="#0E0C19" strokeWidth={0.8} />}
          </g>
        );
      })}

      {/* ========================================================
          7. MOUTH / BASELINE INDICATOR
          ======================================================== */}
      {isSleeping ? (
        // Durmiendo: flat faint baseline
        <rect x={10 * U} y={15 * U} width={3 * U} height={0.4 * U} fill={LIMA} opacity={0.5} />
      ) : isAnomaly ? (
        // Anomalía: jagged alert wave
        <g fill={LIMA}>
          <rect x={9.5 * U} y={14.8 * U} width={1 * U} height={0.6 * U} />
          <rect x={10.5 * U} y={15.3 * U} width={1 * U} height={0.6 * U} />
          <rect x={11.5 * U} y={14.8 * U} width={1 * U} height={0.6 * U} />
          <rect x={12.5 * U} y={15.3 * U} width={1 * U} height={0.6 * U} />
        </g>
      ) : isCelebrating ? (
        // Celebrando: open smile curve
        <g fill={LIMA}>
          <rect x={9.8 * U} y={14.7 * U} width={0.7 * U} height={0.7 * U} />
          <rect x={10.5 * U} y={15.2 * U} width={2 * U} height={0.7 * U} />
          <rect x={12.5 * U} y={14.7 * U} width={0.7 * U} height={0.7 * U} />
        </g>
      ) : (
        // Reposo & Trabajando: Standard 3x1u data baseline
        <rect x={10 * U} y={14.9 * U} width={3 * U} height={0.8 * U} fill={LIMA} />
      )}

      {/* ========================================================
          8. SPEAKER SLITS (3 vertical lines on chassis lower left)
          ======================================================== */}
      <rect x={5.5 * U} y={16.8 * U} width={0.5 * U} height={1.2 * U} fill={p.border} />
      <rect x={6.5 * U} y={16.8 * U} width={0.5 * U} height={1.2 * U} fill={p.border} />
      <rect x={7.5 * U} y={16.8 * U} width={0.5 * U} height={1.2 * U} fill={p.border} />

      {/* ========================================================
          9. STATUS PIP (1u x 1u at chassis lower right)
          ======================================================== */}
      <rect x={16.2 * U} y={16.8 * U} width={1 * U} height={1 * U} fill={antennaLightColor} />

      {/* ========================================================
          10. SLEEP "Z z" INDICATOR (Durmiendo)
          ======================================================== */}
      {isSleeping && (
        <g fill="#A78BFA" style={{ fontFamily: 'monospace', fontWeight: 900 }}>
          <text x={19 * U} y={7 * U} fontSize="18" fill="#A78BFA">Z</text>
          <text x={20.8 * U} y={4.5 * U} fontSize="13" fill="#A78BFA">z</text>
        </g>
      )}
    </svg>
  );
};
