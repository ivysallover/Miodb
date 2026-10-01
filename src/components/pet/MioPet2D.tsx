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
 * MIO ESPÉCIMEN 01 — 2D Pixel Taxonomy Engine
 * EXACT 1:1 REPLICA OF USER'S CONCEPT (LÁMINA I & II)
 * 
 * Grid System (1 unit = 1 pixel in specimen grid):
 * - Canvas width: 21u, height: 21u (origin offset for antenna and shadow)
 * - Chassis: Exactly 15u wide x 11u high
 * - Screen: Exactly 11u wide x 8u high (Obsidiana #0E0C19)
 * - Bevel frame: 2u on left/right, 1.5u on top/bottom
 * - Left Eye (3u): 3 adjacent histogram bars, 1u wide each
 * - Center Gap: 3u
 * - Right Eye (3u): 3 adjacent histogram bars, 1u wide each
 * - Mouth: 3u x 1u centered below the 3u gap
 * - Antenna: Stem 1u x 2u, Cube 3u x 3u (NO DOT! Solid lime #BDF559)
 * - Arms: 1u x 3u on sides
 * - Feet: 3u x 2u each
 * - Speaker slits: 3 vertical black lines (1u x 1.5u) at bottom left
 * - Status pip: 1u x 1u lime square at bottom right
 * - Stepped 1u diagonal cuts on outer corners
 * - Offset shadow: 1u right, 1u down
 */
export const MioPet2D: React.FC<MioPet2DProps> = ({
  mood = 'reposo',
  material = 'violet',
  size = 180,
  className = '',
  showShadow = true,
}) => {
  // 1 Grid unit = 10px in SVG space
  const U = 10;
  const WIDTH = 21 * U;
  const HEIGHT = 22 * U;

  // Base coordinates:
  // Chassis starts at x = 3u, y = 6u.
  // Chassis bounds: x from 3u to 18u (width 15u), y from 6u to 17u (height 11u).
  const CX = 3 * U;
  const CY = 6 * U;

  // Palettes exactly from LÁMINA IV
  const PALETTES = {
    violet: {
      chassis: '#7647EB',
      chassisDark: '#5E34CC',
      feet: '#4623A8',
      screen: '#0E0C19',
      border: '#07050E',
      shadow: '#07050E',
      arm: '#BDF559', // Lime green articulation tabs as in LÁMINA I & II
    },
    titanium: {
      chassis: '#8E8E9C',
      chassisDark: '#757582',
      feet: '#545460',
      screen: '#0E0C19',
      border: '#07050E',
      shadow: '#07050E',
      arm: '#BDF559',
    },
    blackChrome: {
      chassis: '#1E1C27',
      chassisDark: '#13111A',
      feet: '#0D0C13',
      screen: '#07060B',
      border: '#040306',
      shadow: '#040306',
      arm: '#BDF559',
    },
  };

  const p = PALETTES[material] || PALETTES.violet;
  const LIMA = '#BDF559';
  const ANOMALY_WHITE = '#FFFFFF';
  const SLEEP_DIM = '#556B2F';

  // Eye histogram bar heights [bar1, bar2, bar3] in units (max 4u)
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

  // Antenna color (white for anomaly as in Lámina II, otherwise lime #BDF559)
  const antennaColor = isAnomaly ? ANOMALY_WHITE : isSleeping ? '#6e8f32' : LIMA;

  // Screen bounds (11u x 8u):
  // x from 5u to 16u (CX + 2u to CX + 13u)
  // y from 7.5u to 15.5u (CY + 1.5u to CY + 9.5u)
  const SX = CX + 2 * U;
  const SY = CY + 1.5 * U;
  const SW = 11 * U;
  const SH = 8 * U;

  // Eye baseline inside screen: y = SY + 5.5u
  const EYE_BASELINE = SY + 5.5 * U;

  // Left Eye starts at SX + 1u = CX + 3u (width 3u)
  const LEFT_EYE_X = SX + 1 * U;
  // Right Eye starts at SX + 7u = CX + 9u (width 3u)
  const RIGHT_EYE_X = SX + 7 * U;

  // Stepped chamfer polygon for chassis (15u x 11u with 1u corner cuts)
  const getChassisPath = (ox = 0, oy = 0) => `
    M ${CX + 1 * U + ox} ${CY + oy}
    H ${CX + 14 * U + ox}
    V ${CY + 1 * U + oy}
    H ${CX + 15 * U + ox}
    V ${CY + 10 * U + oy}
    H ${CX + 14 * U + ox}
    V ${CY + 11 * U + oy}
    H ${CX + 1 * U + ox}
    V ${CY + 10 * U + oy}
    H ${CX + ox}
    V ${CY + 1 * U + oy}
    H ${CX + 1 * U + ox}
    Z
  `;

  // Stepped chamfer polygon for screen (11u x 8u with 0.8u corner cuts)
  const getScreenPath = (ox = 0, oy = 0) => `
    M ${SX + 0.8 * U + ox} ${SY + oy}
    H ${SX + (11 - 0.8) * U + ox}
    V ${SY + 0.8 * U + oy}
    H ${SX + 11 * U + ox}
    V ${SY + (8 - 0.8) * U + oy}
    H ${SX + (11 - 0.8) * U + ox}
    V ${SY + 8 * U + oy}
    H ${SX + 0.8 * U + ox}
    V ${SY + (8 - 0.8) * U + oy}
    H ${SX + ox}
    V ${SY + 0.8 * U + oy}
    H ${SX + 0.8 * U + ox}
    Z
  `;

  return (
    <svg
      width={size}
      height={(size * HEIGHT) / WIDTH}
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      className={`select-none ${className}`}
      style={{ imageRendering: 'pixelated' }}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* ========================================================
          1. HARD 1U DROP SHADOW (offset +1u, +1u in pure #07050E)
          ======================================================== */}
      {showShadow && (
        <g fill={p.shadow}>
          {/* Chassis shadow */}
          <path d={getChassisPath(1 * U, 1 * U)} />
          {/* Antenna stem shadow */}
          <rect x={CX + 7 * U + 1 * U} y={CY - 2 * U + 1 * U} width={1 * U} height={2 * U} />
          {/* Antenna cube shadow */}
          <rect x={CX + 6 * U + 1 * U} y={CY - 5 * U + 1 * U} width={3 * U} height={3 * U} />
          {/* Left foot shadow (3u x 2u) */}
          <rect x={CX + 3 * U + 1 * U} y={CY + 11 * U + 1 * U} width={3 * U} height={2 * U} />
          {/* Right foot shadow (3u x 2u) */}
          <rect x={CX + 9 * U + 1 * U} y={CY + 11 * U + 1 * U} width={3 * U} height={2 * U} />
          {/* Left arm shadow (1u x 3u) */}
          <rect x={CX - 1 * U + 1 * U} y={(isCelebrating ? CY + 2 * U : CY + 4 * U) + 1 * U} width={1 * U} height={3 * U} />
          {/* Right arm shadow (1u x 3u) */}
          <rect x={CX + 15 * U + 1 * U} y={(isCelebrating ? CY + 2 * U : CY + 4 * U) + 1 * U} width={1 * U} height={3 * U} />
        </g>
      )}

      {/* ========================================================
          2. HARD BLACK INK CONTOUR (1u thick stepped outline)
          ======================================================== */}
      <g fill={p.border}>
        {/* Chassis contour */}
        <path d={getChassisPath()} />
        {/* Antenna stem contour (1u x 2u) */}
        <rect x={CX + 7 * U} y={CY - 2 * U} width={1 * U} height={2 * U} />
        {/* Antenna cube contour (3u x 3u) */}
        <rect x={CX + 6 * U} y={CY - 5 * U} width={3 * U} height={3 * U} />
        {/* Left foot contour (3u x 2u) */}
        <rect x={CX + 3 * U} y={CY + 11 * U} width={3 * U} height={2 * U} />
        {/* Right foot contour (3u x 2u) */}
        <rect x={CX + 9 * U} y={CY + 11 * U} width={3 * U} height={2 * U} />
        {/* Left arm contour (1u x 3u) */}
        <rect x={CX - 1 * U} y={isCelebrating ? CY + 2 * U : CY + 4 * U} width={1 * U} height={3 * U} />
        {/* Right arm contour (1u x 3u) */}
        <rect x={CX + 15 * U} y={isCelebrating ? CY + 2 * U : CY + 4 * U} width={1 * U} height={3 * U} />
      </g>

      {/* ========================================================
          3. METALLIC CHASSIS BODY (Violet #7647EB)
          ======================================================== */}
      {/* Inset chassis body */}
      <rect
        x={CX + 0.6 * U}
        y={CY + 0.6 * U}
        width={13.8 * U}
        height={9.8 * U}
        fill={p.chassis}
      />

      {/* Feet fills (3u x 2u) */}
      <rect x={CX + 3.4 * U} y={CY + 11 * U} width={2.2 * U} height={1.6 * U} fill={p.feet} />
      <rect x={CX + 9.4 * U} y={CY + 11 * U} width={2.2 * U} height={1.6 * U} fill={p.feet} />

      {/* Arms fills (1u x 3u - Black chrome) */}
      <rect
        x={CX - 0.8 * U}
        y={isCelebrating ? CY + 2.2 * U : CY + 4.2 * U}
        width={0.6 * U}
        height={2.6 * U}
        fill={p.arm}
      />
      <rect
        x={CX + 15.2 * U}
        y={isCelebrating ? CY + 2.2 * U : CY + 4.2 * U}
        width={0.6 * U}
        height={2.6 * U}
        fill={p.arm}
      />

      {/* ========================================================
          4. ANTENNA (3x3u solid cube on 1x2u stem - ZERO DOTS!)
          ======================================================== */}
      {/* Stem fill (Dark chrome / black) */}
      <rect x={CX + 7.2 * U} y={CY - 1.8 * U} width={0.6 * U} height={1.8 * U} fill="#151320" />
      {/* Antenna Cube fill (clean solid block, NO DOT) */}
      <rect
        x={CX + 6.3 * U}
        y={CY - 4.7 * U}
        width={2.4 * U}
        height={2.4 * U}
        fill={antennaColor}
      />

      {/* ========================================================
          5. RECESSED OBSIDIAN SCREEN (11u x 8u - #0E0C19)
          ======================================================== */}
      <path d={getScreenPath()} fill={p.screen} />

      {/* ========================================================
          6. EYES: HISTOGRAM BARS (Connected stepped frequencies)
          ======================================================== */}
      {/* Left Eye: 3 adjacent bars at SX + 1u (width 3u total) */}
      <g>
        {leftBars.map((h, i) => {
          const barW = 1 * U;
          const barH = h * U;
          const barX = LEFT_EYE_X + i * barW;
          const barY = EYE_BASELINE - barH;
          return (
            <rect
              key={`l-bar-${i}`}
              x={barX}
              y={barY}
              width={barW}
              height={barH}
              fill={LIMA}
            />
          );
        })}
      </g>

      {/* Right Eye: 3 adjacent bars at SX + 7u (width 3u total) */}
      <g>
        {rightBars.map((h, i) => {
          const barW = 1 * U;
          const barH = h * U;
          const barX = RIGHT_EYE_X + i * barW;
          const barY = EYE_BASELINE - barH;
          return (
            <rect
              key={`r-bar-${i}`}
              x={barX}
              y={barY}
              width={barW}
              height={barH}
              fill={LIMA}
            />
          );
        })}
      </g>

      {/* ========================================================
          7. MOUTH / BASELINE INDICATOR (3u x 1u)
          ======================================================== */}
      {isSleeping ? (
        // Durmiendo: faint thin baseline
        <rect x={SX + 4 * U} y={SY + 6.4 * U} width={3 * U} height={0.3 * U} fill={LIMA} opacity={0.4} />
      ) : isAnomaly ? (
        // Anomalía: alert wave / zigzag mouth
        <g fill={LIMA}>
          <rect x={SX + 3.6 * U} y={SY + 6.2 * U} width={0.9 * U} height={0.6 * U} />
          <rect x={SX + 4.5 * U} y={SY + 6.7 * U} width={0.9 * U} height={0.6 * U} />
          <rect x={SX + 5.4 * U} y={SY + 6.2 * U} width={0.9 * U} height={0.6 * U} />
          <rect x={SX + 6.3 * U} y={SY + 6.7 * U} width={0.9 * U} height={0.6 * U} />
        </g>
      ) : isCelebrating ? (
        // Celebrando: open smile curve
        <g fill={LIMA}>
          <rect x={SX + 3.8 * U} y={SY + 6.1 * U} width={0.7 * U} height={0.7 * U} />
          <rect x={SX + 4.5 * U} y={SY + 6.5 * U} width={2.0 * U} height={0.7 * U} />
          <rect x={SX + 6.5 * U} y={SY + 6.1 * U} width={0.7 * U} height={0.7 * U} />
        </g>
      ) : (
        // Reposo & Trabajando: Clean 3u x 1u solid rectangle centered under the gap
        <rect x={SX + 4 * U} y={SY + 6.3 * U} width={3 * U} height={0.9 * U} fill={LIMA} />
      )}

      {/* ========================================================
          8. SPEAKER SLITS (3 vertical lines on chassis lower left)
          ======================================================== */}
      <rect x={CX + 2.4 * U} y={CY + 9.8 * U} width={0.4 * U} height={1.2 * U} fill={p.border} />
      <rect x={CX + 3.2 * U} y={CY + 9.8 * U} width={0.4 * U} height={1.2 * U} fill={p.border} />
      <rect x={CX + 4.0 * U} y={CY + 9.8 * U} width={0.4 * U} height={1.2 * U} fill={p.border} />

      {/* ========================================================
          9. STATUS PIP (1u x 1u at chassis lower right)
          ======================================================== */}
      <rect x={CX + 13.2 * U} y={CY + 9.8 * U} width={1 * U} height={1 * U} fill={antennaColor} />

      {/* ========================================================
          10. SLEEP "Z z" INDICATOR (Durmiendo)
          ======================================================== */}
      {isSleeping && (
        <g fill="#A78BFA" style={{ fontFamily: 'monospace', fontWeight: 900 }}>
          <text x={CX + 15.5 * U} y={CY - 1 * U} fontSize="17" fill="#A78BFA">Z</text>
          <text x={CX + 17.2 * U} y={CY - 3 * U} fontSize="12" fill="#A78BFA">z</text>
        </g>
      )}
    </svg>
  );
};
