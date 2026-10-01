import React from 'react';

export type MioPetMood = 'reposo' | 'trabajando' | 'celebrando' | 'anomalia' | 'durmiendo';
export type MioPetMaterial = 'violet' | 'titanium' | 'blackChrome';

export interface MioPet2DProps {
  mood?: MioPetMood;
  material?: MioPetMaterial;
  size?: number;
  className?: string;
  showShadow?: boolean;
  animateOnHover?: boolean;
  isHovered?: boolean;
  animated?: boolean;
}

/**
 * MIO ESPÉCIMEN 01 — 2D Pixel Taxonomy Engine
 * EXACT 1:1 REPLICA OF USER'S CONCEPT (LÁMINA I & II)
 * With micro-animations tailored to each mood state on hover
 */
export const MioPet2D: React.FC<MioPet2DProps> = ({
  mood = 'reposo',
  material = 'violet',
  size = 180,
  className = '',
  showShadow = true,
  animateOnHover = true,
  isHovered = false,
  animated = false,
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

  const isActive = animated || isHovered;
  const rootClasses = [
    'mio-pet-svg select-none transition-transform duration-200',
    `mood-${mood}`,
    `mat-${material}`,
    animateOnHover ? 'can-hover cursor-pointer' : '',
    isActive ? 'is-active' : '',
    className,
  ].filter(Boolean).join(' ');

  return (
    <svg
      width={size}
      height={(size * HEIGHT) / WIDTH}
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      className={rootClasses}
      style={{ imageRendering: 'pixelated' }}
      xmlns="http://www.w3.org/2000/svg"
    >
      <style>{`
        /* ========================================================
           EMIL KOWALSKI MOTION PRINCIPLES (Strictly GPU-Accelerated)
           Transitions & Keyframes: Transform & Opacity Only
           ======================================================== */
        @media (prefers-reduced-motion: reduce) {
          .mio-pet-svg * {
            animation: none !important;
            transition: none !important;
          }
        }

        .mio-pet-svg .mio-char-group,
        .mio-pet-svg .mio-shadow-group {
          transition: transform 0.24s cubic-bezier(0.23, 1, 0.32, 1);
        }

        .mio-pet-svg .mio-eye-bar,
        .mio-pet-svg .mio-mouth,
        .mio-pet-svg .mio-antenna-cube,
        .mio-pet-svg .mio-arm-left,
        .mio-pet-svg .mio-arm-right,
        .mio-pet-svg .mio-shadow-group {
          transform-box: fill-box;
        }

        /* ========================================================
           01 REPOSO: Gentle idle breath, eye blink & breathing shadow
           ======================================================== */
        .mio-pet-svg.mood-reposo:hover .mio-char-group,
        .mio-pet-svg.mood-reposo.is-active .mio-char-group,
        .group:hover .mio-pet-svg.mood-reposo .mio-char-group {
          animation: mio-reposo-breath 1.8s ease-in-out infinite;
        }
        .mio-pet-svg.mood-reposo:hover .mio-shadow-group,
        .mio-pet-svg.mood-reposo.is-active .mio-shadow-group,
        .group:hover .mio-pet-svg.mood-reposo .mio-shadow-group {
          animation: mio-reposo-shadow 1.8s ease-in-out infinite;
        }
        .mio-pet-svg.mood-reposo:hover .mio-eye-bar,
        .mio-pet-svg.mood-reposo.is-active .mio-eye-bar,
        .group:hover .mio-pet-svg.mood-reposo .mio-eye-bar {
          animation: mio-reposo-blink 3.4s infinite;
        }
        .mio-pet-svg.mood-reposo:hover .mio-antenna-cube,
        .mio-pet-svg.mood-reposo.is-active .mio-antenna-cube,
        .group:hover .mio-pet-svg.mood-reposo .mio-antenna-cube {
          animation: mio-reposo-glow 1.8s ease-in-out infinite;
        }

        @keyframes mio-reposo-breath {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-2.5px); }
        }
        @keyframes mio-reposo-shadow {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(0.95); opacity: 0.75; }
        }
        @keyframes mio-reposo-blink {
          0%, 91%, 100% { transform: scaleY(1); }
          95.5% { transform: scaleY(0.12); }
        }
        @keyframes mio-reposo-glow {
          0%, 100% { filter: drop-shadow(0 0 0px transparent); }
          50% { filter: drop-shadow(0 0 5px rgba(189, 245, 89, 0.85)); }
        }

        /* ========================================================
           02 TRABAJANDO: High-frequency data equalizer & telemetry pip
           ======================================================== */
        .mio-pet-svg.mood-trabajando:hover .mio-char-group,
        .mio-pet-svg.mood-trabajando.is-active .mio-char-group,
        .group:hover .mio-pet-svg.mood-trabajando .mio-char-group {
          animation: mio-work-hum 0.28s ease-in-out infinite;
        }
        .mio-pet-svg.mood-trabajando:hover .mio-shadow-group,
        .mio-pet-svg.mood-trabajando.is-active .mio-shadow-group,
        .group:hover .mio-pet-svg.mood-trabajando .mio-shadow-group {
          animation: mio-work-shadow 0.28s ease-in-out infinite;
        }
        .mio-pet-svg.mood-trabajando:hover .mio-eq-1,
        .mio-pet-svg.mood-trabajando.is-active .mio-eq-1,
        .group:hover .mio-pet-svg.mood-trabajando .mio-eq-1 {
          animation: mio-work-eq-1 0.36s ease-in-out infinite alternate;
        }
        .mio-pet-svg.mood-trabajando:hover .mio-eq-2,
        .mio-pet-svg.mood-trabajando.is-active .mio-eq-2,
        .group:hover .mio-pet-svg.mood-trabajando .mio-eq-2 {
          animation: mio-work-eq-2 0.44s ease-in-out infinite alternate;
        }
        .mio-pet-svg.mood-trabajando:hover .mio-eq-3,
        .mio-pet-svg.mood-trabajando.is-active .mio-eq-3,
        .group:hover .mio-pet-svg.mood-trabajando .mio-eq-3 {
          animation: mio-work-eq-3 0.30s ease-in-out infinite alternate;
        }
        .mio-pet-svg.mood-trabajando:hover .mio-status-pip,
        .mio-pet-svg.mood-trabajando.is-active .mio-status-pip,
        .group:hover .mio-pet-svg.mood-trabajando .mio-status-pip {
          animation: mio-work-pip 0.15s steps(2, end) infinite;
        }

        @keyframes mio-work-hum {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-1px); }
        }
        @keyframes mio-work-shadow {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(0.98); opacity: 0.88; }
        }
        @keyframes mio-work-eq-1 {
          0% { transform: scaleY(0.65); }
          100% { transform: scaleY(1.55); }
        }
        @keyframes mio-work-eq-2 {
          0% { transform: scaleY(1.45); }
          100% { transform: scaleY(0.55); }
        }
        @keyframes mio-work-eq-3 {
          0% { transform: scaleY(0.75); }
          100% { transform: scaleY(1.35); }
        }
        @keyframes mio-work-pip {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.15; }
        }

        /* ========================================================
           03 CELEBRANDO: Cheerful hop, smile pulse & bright antenna bloom
           (Arms remain solidly attached to chassis, leaping in sync)
           ======================================================== */
        .mio-pet-svg.mood-celebrando:hover .mio-char-group,
        .mio-pet-svg.mood-celebrando.is-active .mio-char-group,
        .group:hover .mio-pet-svg.mood-celebrando .mio-char-group {
          animation: mio-celeb-hop 0.65s cubic-bezier(0.23, 1, 0.32, 1) infinite;
        }
        .mio-pet-svg.mood-celebrando:hover .mio-antenna-cube,
        .mio-pet-svg.mood-celebrando.is-active .mio-antenna-cube,
        .group:hover .mio-pet-svg.mood-celebrando .mio-antenna-cube {
          animation: mio-celeb-antenna 0.65s cubic-bezier(0.23, 1, 0.32, 1) infinite;
        }
        .mio-pet-svg.mood-celebrando:hover .mio-mouth,
        .mio-pet-svg.mood-celebrando.is-active .mio-mouth,
        .group:hover .mio-pet-svg.mood-celebrando .mio-mouth {
          animation: mio-celeb-smile 0.65s cubic-bezier(0.23, 1, 0.32, 1) infinite;
        }
        .mio-pet-svg.mood-celebrando:hover .mio-shadow-group,
        .mio-pet-svg.mood-celebrando.is-active .mio-shadow-group,
        .group:hover .mio-pet-svg.mood-celebrando .mio-shadow-group {
          animation: mio-celeb-shadow 0.65s cubic-bezier(0.23, 1, 0.32, 1) infinite;
        }

        @keyframes mio-celeb-hop {
          0%, 100% { transform: translateY(0); }
          40% { transform: translateY(-7px); }
          60% { transform: translateY(-5px); }
          80% { transform: translateY(0); }
        }
        @keyframes mio-celeb-shadow {
          0%, 100% { opacity: 1; transform: scale(1); }
          40% { opacity: 0.42; transform: scale(0.84); }
          60% { opacity: 0.55; transform: scale(0.89); }
          80% { opacity: 1; transform: scale(1); }
        }
        @keyframes mio-celeb-antenna {
          0%, 100% { filter: drop-shadow(0 0 2px rgba(189, 245, 89, 0.5)); transform: scale(1); }
          40% { filter: drop-shadow(0 0 8px rgba(189, 245, 89, 0.95)); transform: scale(1.1); }
        }
        @keyframes mio-celeb-smile {
          0%, 100% { transform: scale(1); }
          40% { transform: scale(1.1); }
        }

        /* ========================================================
           04 ANOMALÍA: Glitch jitter, shadow glitch, strobe & spike
           ======================================================== */
        .mio-pet-svg.mood-anomalia:hover .mio-char-group,
        .mio-pet-svg.mood-anomalia.is-active .mio-char-group,
        .group:hover .mio-pet-svg.mood-anomalia .mio-char-group {
          animation: mio-anom-glitch 0.22s steps(2, end) infinite;
        }
        .mio-pet-svg.mood-anomalia:hover .mio-shadow-group,
        .mio-pet-svg.mood-anomalia.is-active .mio-shadow-group,
        .group:hover .mio-pet-svg.mood-anomalia .mio-shadow-group {
          animation: mio-anom-shadow 0.22s steps(2, end) infinite;
        }
        .mio-pet-svg.mood-anomalia:hover .mio-antenna-cube,
        .mio-pet-svg.mood-anomalia.is-active .mio-antenna-cube,
        .group:hover .mio-pet-svg.mood-anomalia .mio-antenna-cube {
          animation: mio-anom-strobe 0.16s steps(2, end) infinite;
        }
        .mio-pet-svg.mood-anomalia:hover .mio-status-pip,
        .mio-pet-svg.mood-anomalia.is-active .mio-status-pip,
        .group:hover .mio-pet-svg.mood-anomalia .mio-status-pip {
          animation: mio-anom-pip 0.14s steps(2, end) infinite;
        }
        .mio-pet-svg.mood-anomalia:hover .mio-mouth,
        .mio-pet-svg.mood-anomalia.is-active .mio-mouth,
        .group:hover .mio-pet-svg.mood-anomalia .mio-mouth {
          animation: mio-anom-mouth 0.22s steps(2, end) infinite;
        }
        .mio-pet-svg.mood-anomalia:hover .mio-eye-spike,
        .mio-pet-svg.mood-anomalia.is-active .mio-eye-spike,
        .group:hover .mio-pet-svg.mood-anomalia .mio-eye-spike {
          animation: mio-anom-spike 0.22s steps(2, end) infinite;
        }

        @keyframes mio-anom-glitch {
          0%, 100% { transform: translate(0, 0); }
          20% { transform: translate(-2px, 0); }
          40% { transform: translate(2px, 0); }
          60% { transform: translate(-1.5px, 0.5px); }
          80% { transform: translate(1px, -0.5px); }
        }
        @keyframes mio-anom-shadow {
          0%, 100% { transform: translate(0, 0); }
          20% { transform: translate(-2px, 0); }
          40% { transform: translate(2px, 0); }
          60% { transform: translate(-1.5px, 0.5px); }
          80% { transform: translate(1px, -0.5px); }
        }
        @keyframes mio-anom-strobe {
          0%, 100% { opacity: 1; filter: drop-shadow(0 0 6px #FFFFFF); }
          50% { opacity: 0.3; filter: none; }
        }
        @keyframes mio-anom-pip {
          0%, 100% { fill: #E879F9; }
          50% { fill: #FFFFFF; }
        }
        @keyframes mio-anom-mouth {
          0%, 100% { transform: scaleX(1); }
          35% { transform: scaleX(1.1) translateX(-0.5px); }
          70% { transform: scaleX(0.9) translateX(0.5px); }
        }
        @keyframes mio-anom-spike {
          0%, 100% { transform: scaleY(1); }
          50% { transform: scaleY(1.15); filter: drop-shadow(0 0 3px #BDF559); }
        }

        /* ========================================================
           05 DURMIENDO: Slow heavy breathing, expanding shadow & Z's
           ======================================================== */
        .mio-pet-svg.mood-durmiendo:hover .mio-char-group,
        .mio-pet-svg.mood-durmiendo.is-active .mio-char-group,
        .group:hover .mio-pet-svg.mood-durmiendo .mio-char-group {
          animation: mio-sleep-breath 2.4s ease-in-out infinite;
        }
        .mio-pet-svg.mood-durmiendo:hover .mio-shadow-group,
        .mio-pet-svg.mood-durmiendo.is-active .mio-shadow-group,
        .group:hover .mio-pet-svg.mood-durmiendo .mio-shadow-group {
          animation: mio-sleep-shadow 2.4s ease-in-out infinite;
        }
        .mio-pet-svg.mood-durmiendo:hover .mio-z-big,
        .mio-pet-svg.mood-durmiendo.is-active .mio-z-big,
        .group:hover .mio-pet-svg.mood-durmiendo .mio-z-big {
          animation: mio-sleep-z1 2.2s linear infinite;
        }
        .mio-pet-svg.mood-durmiendo:hover .mio-z-small,
        .mio-pet-svg.mood-durmiendo.is-active .mio-z-small,
        .group:hover .mio-pet-svg.mood-durmiendo .mio-z-small {
          animation: mio-sleep-z2 2.2s linear infinite;
          animation-delay: 0.8s;
        }
        .mio-pet-svg.mood-durmiendo:hover .mio-mouth,
        .mio-pet-svg.mood-durmiendo.is-active .mio-mouth,
        .group:hover .mio-pet-svg.mood-durmiendo .mio-mouth {
          animation: mio-sleep-mouth 2.4s ease-in-out infinite;
        }

        @keyframes mio-sleep-breath {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(1.5px); }
        }
        @keyframes mio-sleep-shadow {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.03); opacity: 0.95; }
        }
        @keyframes mio-sleep-z1 {
          0% { transform: translate(0, 0) scale(0.8); opacity: 0; }
          20% { opacity: 0.95; }
          75% { opacity: 0.8; }
          100% { transform: translate(5px, -18px) scale(1.2); opacity: 0; }
        }
        @keyframes mio-sleep-z2 {
          0% { transform: translate(0, 0) scale(0.7); opacity: 0; }
          25% { opacity: 0.9; }
          75% { opacity: 0.75; }
          100% { transform: translate(7px, -22px) scale(1.1); opacity: 0; }
        }
        @keyframes mio-sleep-mouth {
          0%, 100% { opacity: 0.35; }
          50% { opacity: 0.75; }
        }
      `}</style>

      {/* ========================================================
          1. HARD 1U DROP SHADOW (offset +1u, +1u in pure #07050E)
          ======================================================== */}
      {showShadow && (
        <g
          className="mio-shadow-group"
          fill={p.shadow}
          style={{ transformOrigin: '50% 50%' }}
        >
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
          2. RIGID CHARACTER GROUP (Moves together as monolithic body)
          ======================================================== */}
      <g
        className="mio-char-group"
        style={{ transformOrigin: '50% 100%' }}
      >
        {/* A. HARD BLACK INK CONTOUR (1u thick stepped outline) */}
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
          <rect
            className="mio-arm-left"
            style={{ transformOrigin: '100% 0%' }}
            x={CX - 1 * U}
            y={isCelebrating ? CY + 2 * U : CY + 4 * U}
            width={1 * U}
            height={3 * U}
          />
          {/* Right arm contour (1u x 3u) */}
          <rect
            className="mio-arm-right"
            style={{ transformOrigin: '0% 0%' }}
            x={CX + 15 * U}
            y={isCelebrating ? CY + 2 * U : CY + 4 * U}
            width={1 * U}
            height={3 * U}
          />
        </g>

        {/* B. METALLIC CHASSIS BODY (Violet #7647EB) */}
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

        {/* Arms fills (1u x 3u - Lime green tabs matching concept) */}
        <rect
          className="mio-arm-left"
          style={{ transformOrigin: '100% 0%' }}
          x={CX - 0.8 * U}
          y={isCelebrating ? CY + 2.2 * U : CY + 4.2 * U}
          width={0.6 * U}
          height={2.6 * U}
          fill={isSleeping ? SLEEP_DIM : p.arm}
        />
        <rect
          className="mio-arm-right"
          style={{ transformOrigin: '0% 0%' }}
          x={CX + 15.2 * U}
          y={isCelebrating ? CY + 2.2 * U : CY + 4.2 * U}
          width={0.6 * U}
          height={2.6 * U}
          fill={isSleeping ? SLEEP_DIM : p.arm}
        />

        {/* C. ANTENNA: 3x3u solid cube on 1x2u stem (NO DOT!) */}
        {/* Stem fill (Dark chrome / black) */}
        <rect x={CX + 7.2 * U} y={CY - 1.8 * U} width={0.6 * U} height={1.8 * U} fill="#151320" />
        {/* Antenna Cube fill (clean solid block, NO DOT) */}
        <rect
          className="mio-antenna-cube"
          style={{ transformOrigin: '50% 100%' }}
          x={CX + 6.3 * U}
          y={CY - 4.7 * U}
          width={2.4 * U}
          height={2.4 * U}
          fill={antennaColor}
        />

        {/* D. RECESSED OBSIDIAN SCREEN (11u x 8u - #0E0C19) */}
        <path d={getScreenPath()} fill={p.screen} />

        {/* E. EYES: HISTOGRAM BARS IN HIGH RELIEF */}
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
                className={`mio-eye-bar mio-eq-${i + 1}`}
                style={{ transformOrigin: '50% 100%' }}
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
            const isSpike = isAnomaly && i === 2;
            return (
              <rect
                key={`r-bar-${i}`}
                className={`mio-eye-bar mio-eq-${3 - i} ${isSpike ? 'mio-eye-spike' : ''}`}
                style={{ transformOrigin: '50% 100%' }}
                x={barX}
                y={barY}
                width={barW}
                height={barH}
                fill={LIMA}
              />
            );
          })}
        </g>

        {/* F. MOUTH / BASELINE INDICATOR (3u x 1u) */}
        {isSleeping ? (
          <rect
            className="mio-mouth"
            style={{ transformOrigin: '50% 50%' }}
            x={SX + 4 * U}
            y={SY + 6.4 * U}
            width={3 * U}
            height={0.3 * U}
            fill={LIMA}
            opacity={0.4}
          />
        ) : isAnomaly ? (
          <g className="mio-mouth" style={{ transformOrigin: '50% 50%' }} fill={LIMA}>
            <rect x={SX + 3.6 * U} y={SY + 6.2 * U} width={0.9 * U} height={0.6 * U} />
            <rect x={SX + 4.5 * U} y={SY + 6.7 * U} width={0.9 * U} height={0.6 * U} />
            <rect x={SX + 5.4 * U} y={SY + 6.2 * U} width={0.9 * U} height={0.6 * U} />
            <rect x={SX + 6.3 * U} y={SY + 6.7 * U} width={0.9 * U} height={0.6 * U} />
          </g>
        ) : isCelebrating ? (
          <g className="mio-mouth" style={{ transformOrigin: '50% 50%' }} fill={LIMA}>
            <rect x={SX + 3.8 * U} y={SY + 6.1 * U} width={0.7 * U} height={0.7 * U} />
            <rect x={SX + 4.5 * U} y={SY + 6.5 * U} width={2.0 * U} height={0.7 * U} />
            <rect x={SX + 6.5 * U} y={SY + 6.1 * U} width={0.7 * U} height={0.7 * U} />
          </g>
        ) : (
          <rect
            className="mio-mouth"
            style={{ transformOrigin: '50% 50%' }}
            x={SX + 4 * U}
            y={SY + 6.3 * U}
            width={3 * U}
            height={0.9 * U}
            fill={LIMA}
          />
        )}

        {/* G. SPEAKER SLITS (3 vertical lines on chassis lower left) */}
        <rect x={CX + 2.4 * U} y={CY + 9.8 * U} width={0.4 * U} height={1.2 * U} fill={p.border} />
        <rect x={CX + 3.2 * U} y={CY + 9.8 * U} width={0.4 * U} height={1.2 * U} fill={p.border} />
        <rect x={CX + 4.0 * U} y={CY + 9.8 * U} width={0.4 * U} height={1.2 * U} fill={p.border} />

        {/* H. STATUS PIP (1u x 1u at chassis lower right) */}
        <rect
          className="mio-status-pip"
          x={CX + 13.2 * U}
          y={CY + 9.8 * U}
          width={1 * U}
          height={1 * U}
          fill={antennaColor}
        />

        {/* I. SLEEP "Z z" INDICATOR (Durmiendo) */}
        {isSleeping && (
          <g fill="#A78BFA" style={{ fontFamily: 'monospace', fontWeight: 900 }}>
            <text
              className="mio-z-big"
              style={{ transformOrigin: `${CX + 16 * U}px ${CY - 1.5 * U}px` }}
              x={CX + 15.5 * U}
              y={CY - 1 * U}
              fontSize="17"
              fill="#A78BFA"
            >
              Z
            </text>
            <text
              className="mio-z-small"
              style={{ transformOrigin: `${CX + 17.5 * U}px ${CY - 3.5 * U}px` }}
              x={CX + 17.2 * U}
              y={CY - 3 * U}
              fontSize="12"
              fill="#A78BFA"
            >
              z
            </text>
          </g>
        )}
      </g>
    </svg>
  );
};
