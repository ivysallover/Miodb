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
 * Built strictly on the 15u x 19u specimen grid from LÁMINA I-IV.
 * Pure SVG, zero external dependencies, razor-sharp pixel rendering.
 */
export const MioPet2D: React.FC<MioPet2DProps> = ({
  mood = 'reposo',
  material = 'violet',
  size = 180,
  className = '',
  showShadow = true,
}) => {
  // Unit size on the internal coordinate system (15 cols x 19 rows)
  const U = 10;
  const WIDTH = 18 * U;  // with margins & side arms
  const HEIGHT = 21 * U; // with antenna and shadow

  // Color schemes based on material selection
  const materialThemes = {
    violet: {
      chassis: '#7647eb',
      chassisDark: '#5e32d1',
      feet: '#5127be',
      border: '#07050e',
      screen: '#0e0c19',
      arm: '#1b1827',
    },
    titanium: {
      chassis: '#9292a0',
      chassisDark: '#787886',
      feet: '#5e5e6c',
      border: '#07050e',
      screen: '#0e0c19',
      arm: '#1b1827',
    },
    blackChrome: {
      chassis: '#22202e',
      chassisDark: '#171520',
      feet: '#12101a',
      border: '#050408',
      screen: '#0a0812',
      arm: '#0b0914',
    },
  };

  const currentMat = materialThemes[material] || materialThemes.violet;
  const limeColor = '#bdf559';
  const anomalyAntennaColor = '#d946ef'; // Magenta / violet emissive for anomaly state

  // Eye histogram bars per state: [bar1, bar2, bar3]
  // In grid units: heights are 1u, 2u, 3u, or 4u
  const eyeBarsByMood: Record<MioPetMood, { left: number[]; right: number[] }> = {
    reposo: { left: [2, 3, 2], right: [2, 3, 2] },
    trabajando: { left: [1, 2, 3], right: [3, 2, 1] },
    celebrando: { left: [2, 3, 4], right: [2, 3, 4] },
    anomalia: { left: [2, 2, 2], right: [2, 2, 4] },
    durmiendo: { left: [1, 1, 1], right: [1, 1, 1] },
  };

  const { left: leftEye, right: rightEye } = eyeBarsByMood[mood];

  // Antenna color based on mood
  const antennaColor = mood === 'anomalia' ? anomalyAntennaColor : limeColor;

  // Arms position based on mood:
  // Reposo / Trabajando / Durmiendo: middle sides
  // Celebrando: arms raised!
  const isArmsUp = mood === 'celebrando';

  return (
    <svg
      width={size}
      height={(size * HEIGHT) / WIDTH}
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      className={`select-none ${className}`}
      style={{ imageRendering: 'pixelated' }}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* 1. DROP SHADOW (offset by 1u x 1u in pure #07050e black ink) */}
      {showShadow && (
        <g fill="#07050e">
          {/* Main chassis shadow */}
          <rect x={2 * U + 6} y={5 * U + 6} width={13 * U} height={10 * U} />
          {/* Left foot shadow */}
          <rect x={4 * U + 6} y={15 * U + 6} width={3 * U} height={2 * U} />
          {/* Right foot shadow */}
          <rect x={10 * U + 6} y={15 * U + 6} width={3 * U} height={2 * U} />
          {/* Antenna shadow */}
          <rect x={7 * U + 6} y={1 * U + 6} width={3 * U} height={3 * U} />
        </g>
      )}

      {/* 2. OUTER BLACK CONTOUR (Machine-pressed contour) */}
      <g fill={currentMat.border}>
        {/* Chassis contour */}
        <rect x={2 * U} y={5 * U} width={13 * U} height={10 * U} />
        {/* Antenna Stem contour */}
        <rect x={8 * U} y={3 * U} width={1 * U} height={2 * U} />
        {/* Antenna Box contour */}
        <rect x={7 * U} y={1 * U} width={3 * U} height={3 * U} />
        {/* Left Foot contour */}
        <rect x={4 * U} y={15 * U} width={3 * U} height={2 * U} />
        {/* Right Foot contour */}
        <rect x={10 * U} y={15 * U} width={3 * U} height={2 * U} />
        {/* Left Arm contour */}
        <rect x={1 * U} y={(isArmsUp ? 4 : 8) * U} width={1 * U} height={3 * U} />
        {/* Right Arm contour */}
        <rect x={15 * U} y={(isArmsUp ? 4 : 8) * U} width={1 * U} height={3 * U} />
      </g>

      {/* 3. COLORED METALLIC CHASSIS BODY */}
      <rect x={2.5 * U} y={5.5 * U} width={12 * U} height={9 * U} fill={currentMat.chassis} />
      {/* Chassis bottom chamfer / bevel accent */}
      <rect x={2.5 * U} y={13.5 * U} width={12 * U} height={1 * U} fill={currentMat.chassisDark} />

      {/* 4. FEET (Darker metal) */}
      <rect x={4.5 * U} y={15 * U} width={2 * U} height={1.5 * U} fill={currentMat.feet} />
      <rect x={10.5 * U} y={15 * U} width={2 * U} height={1.5 * U} fill={currentMat.feet} />

      {/* 5. ARTICULATION ARMS (Black Chrome) */}
      <rect x={1.2 * U} y={(isArmsUp ? 4.2 : 8.2) * U} width={0.6 * U} height={2.6 * U} fill={currentMat.arm} />
      <rect x={15.2 * U} y={(isArmsUp ? 4.2 : 8.2) * U} width={0.6 * U} height={2.6 * U} fill={currentMat.arm} />

      {/* 6. ANTENNA */}
      {/* Stem */}
      <rect x={8.2 * U} y={3 * U} width={0.6 * U} height={2 * U} fill={currentMat.arm} />
      {/* Core Cube */}
      <rect x={7.3 * U} y={1.3 * U} width={2.4 * U} height={2.4 * U} fill={antennaColor} />
      {/* Internal emitter pip */}
      <circle cx={8.5 * U} cy={2.5 * U} r={0.3 * U} fill="#0e0c19" />

      {/* 7. OBSIDIAN SCREEN (Recessed cavity: 9u x 6.5u) */}
      <rect x={3.5 * U} y={6.5 * U} width={10 * U} height={6 * U} fill={currentMat.screen} />
      {/* Inner Screen top bezel reflection hairline */}
      <line x1={3.5 * U} y1={6.5 * U} x2={13.5 * U} y2={6.5 * U} stroke="rgba(255,255,255,0.15)" strokeWidth={1} />

      {/* 8. EYES: HISTOGRAM BARS */}
      {/* Left Eye: 3 bars starting at x=4.5u */}
      {leftEye.map((h, i) => {
        const barHeight = h * 0.8 * U;
        const x = (4.5 + i * 1.1) * U;
        const y = 9.8 * U - barHeight;
        return (
          <rect
            key={`l-eye-${i}`}
            x={x}
            y={y}
            width={0.8 * U}
            height={barHeight}
            fill={limeColor}
          />
        );
      })}

      {/* Right Eye: 3 bars starting at x=9.3u */}
      {rightEye.map((h, i) => {
        const barHeight = h * 0.8 * U;
        const x = (9.3 + i * 1.1) * U;
        const y = 9.8 * U - barHeight;
        return (
          <rect
            key={`r-eye-${i}`}
            x={x}
            y={y}
            width={0.8 * U}
            height={barHeight}
            fill={limeColor}
          />
        );
      })}

      {/* 9. MOUTH / BASELINE INDICATOR */}
      {mood === 'durmiendo' ? (
        // Sleeping: flat baseline
        <rect x={7 * U} y={10.8 * U} width={3 * U} height={0.3 * U} fill={limeColor} opacity={0.6} />
      ) : mood === 'anomalia' ? (
        // Anomaly: jagged / alert mouth
        <g fill={limeColor}>
          <rect x={6.5 * U} y={10.6 * U} width={1 * U} height={0.5 * U} />
          <rect x={7.5 * U} y={11.0 * U} width={1 * U} height={0.5 * U} />
          <rect x={8.5 * U} y={10.6 * U} width={1 * U} height={0.5 * U} />
          <rect x={9.5 * U} y={11.0 * U} width={1 * U} height={0.5 * U} />
        </g>
      ) : mood === 'celebrando' ? (
        // Celebrating: smile curve
        <g fill={limeColor}>
          <rect x={6.8 * U} y={10.5 * U} width={0.6 * U} height={0.6 * U} />
          <rect x={7.4 * U} y={10.8 * U} width={2.2 * U} height={0.6 * U} />
          <rect x={9.6 * U} y={10.5 * U} width={0.6 * U} height={0.6 * U} />
        </g>
      ) : (
        // Reposo & Trabajando: Clean 3x1u data baseline
        <rect x={7 * U} y={10.6 * U} width={3 * U} height={0.7 * U} fill={limeColor} />
      )}

      {/* 10. SPEAKER SLITS (3 vertical lines on chassis lower left) */}
      <rect x={3.5 * U} y={13.2 * U} width={0.4 * U} height={1.1 * U} fill={currentMat.border} />
      <rect x={4.3 * U} y={13.2 * U} width={0.4 * U} height={1.1 * U} fill={currentMat.border} />
      <rect x={5.1 * U} y={13.2 * U} width={0.4 * U} height={1.1 * U} fill={currentMat.border} />

      {/* 11. STATUS PIP (Small 1u square at lower right of chassis) */}
      <rect x={12.2 * U} y={13.2 * U} width={0.9 * U} height={0.9 * U} fill={antennaColor} />

      {/* 12. SLEEP "Z z" INDICATOR (Only for durmiendo state) */}
      {mood === 'durmiendo' && (
        <g fill="#a78bfa" className="animate-pulse" style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>
          <text x={14.5 * U} y={4.5 * U} fontSize="14">Z</text>
          <text x={16 * U} y={2.8 * U} fontSize="10">z</text>
        </g>
      )}
    </svg>
  );
};
