import React, { useRef, useEffect } from 'react';

interface AsciiOverlayProps {
  enabled?: boolean;
  opacity?: number;
  className?: string;
  charColor?: string;
}

export const AsciiOverlay: React.FC<AsciiOverlayProps> = ({
  enabled = true,
  opacity = 0.22,
  className = '',
  charColor = '#bdf559',
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!enabled) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    const chars = ' .:;+=xX$#@';

    const resize = () => {
      canvas.width = canvas.parentElement?.clientWidth || 600;
      canvas.height = canvas.parentElement?.clientHeight || 400;
    };

    resize();
    window.addEventListener('resize', resize);

    const cellWidth = 12;
    const cellHeight = 16;
    ctx.font = '10px monospace';

    let frame = 0;
    const draw = () => {
      frame++;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = charColor;
      const cols = Math.floor(canvas.width / cellWidth);
      const rows = Math.floor(canvas.height / cellHeight);

      // Render subtle ASCII glyph field with undulating digital wave
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const wave = Math.sin(c * 0.2 + frame * 0.03) * Math.cos(r * 0.2 + frame * 0.02);
          if (wave > 0.4) {
            const charIdx = Math.floor(((wave - 0.4) / 0.6) * (chars.length - 1));
            const char = chars[charIdx] || '.';
            ctx.globalAlpha = Math.min(1, Math.max(0.1, (wave - 0.4) * 1.5));
            ctx.fillText(char, c * cellWidth, r * cellHeight);
          }
        }
      }

      animId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
    };
  }, [enabled, charColor]);

  if (!enabled) return null;

  return (
    <div
      className={`absolute inset-0 pointer-events-none overflow-hidden select-none z-20 ${className}`}
      style={{ opacity }}
    >
      <canvas ref={canvasRef} className="w-full h-full block" />
      {/* Scanline CRT overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-20"
        style={{
          backgroundImage:
            'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0, 0, 0, 0.5) 2px, rgba(0, 0, 0, 0.5) 4px)',
        }}
      />
    </div>
  );
};

export default AsciiOverlay;
