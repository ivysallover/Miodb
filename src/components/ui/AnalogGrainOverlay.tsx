import React from 'react';

/**
 * AnalogGrainOverlay:
 * Low-weight static procedural SVG noise overlay giving the subtle physical
 * tactile paper / matte polycarbonate chassis feel of analog hardware.
 * Strict: non-animated, static tileable SVG, mix-blend-mode: overlay, opacity ~0.038.
 */
export const AnalogGrainOverlay: React.FC = () => {
  return (
    <div
      className="fixed inset-0 pointer-events-none z-10 select-none opacity-[0.022]"
      style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        backgroundRepeat: 'repeat',
        backgroundSize: '160px 160px',
      }}
      aria-hidden="true"
    />
  );
};

export default AnalogGrainOverlay;
