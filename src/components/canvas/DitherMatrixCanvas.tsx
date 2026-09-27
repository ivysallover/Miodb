import React, { useRef, useEffect } from 'react';

interface DitherMatrixCanvasProps {
  className?: string;
  dotColor?: string;
  accentColor?: string;
}

/**
 * DitherMatrixCanvas:
 * Interactive 2D Canvas rendering the iconic Legency / Teenage Engineering
 * dithered pixel matrix wave (Image 1 & Image 3 in user request).
 */
export const DitherMatrixCanvas: React.FC<DitherMatrixCanvasProps> = ({
  className = '',
  dotColor = '#4338ca',
  accentColor = '#7647eb',
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let width = 0;
    let height = 0;
    let mouseX = 0.5;
    let mouseY = 0.5;
    let scrollYOffset = 0;

    const resize = () => {
      width = canvas.parentElement?.clientWidth || window.innerWidth;
      height = canvas.parentElement?.clientHeight || 600;
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.scale(dpr, dpr);
    };

    resize();
    window.addEventListener('resize', resize);

    const onMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouseX = (e.clientX - rect.left) / rect.width;
      mouseY = (e.clientY - rect.top) / rect.height;
    };

    const onScroll = () => {
      scrollYOffset = window.scrollY * 0.001;
    };

    window.addEventListener('mousemove', onMouseMove, { passive: true });
    window.addEventListener('scroll', onScroll, { passive: true });

    const pixelSize = 6;
    const gap = 3;
    const step = pixelSize + gap;
    let time = 0;

    const draw = () => {
      time += 0.02;
      ctx.clearRect(0, 0, width, height);

      const cols = Math.ceil(width / step);
      const rows = Math.ceil(height / step);

      // Render flowing dithered halftone topography wave
      for (let c = 0; c < cols; c++) {
        for (let r = 0; r < rows; r++) {
          const x = c * step;
          const y = r * step;

          // Wave equation creating the diagonal sweeping dither cloud seen in Image 1
          const normX = c / cols;
          const normY = r / rows;

          const wave =
            Math.sin(normX * 5.0 - time * 0.8 + scrollYOffset * 2.0) * 0.5 +
            Math.cos(normY * 4.0 + time * 0.6) * 0.3 +
            Math.sin((normX + normY) * 6.0 + time) * 0.4;

          // Mouse influence
          const distToMouse = Math.hypot(normX - mouseX, normY - mouseY);
          const mouseEffect = Math.max(0, 1.0 - distToMouse * 3.0) * 0.4;

          const totalIntensity = wave + mouseEffect;

          // Dither threshold logic (Bayer-like distribution)
          if (totalIntensity > 0.15) {
            const alpha = Math.min(1, Math.max(0.1, (totalIntensity - 0.15) * 1.6));
            
            // Color grading: rich royal violet to electric neon blue/violet
            if (totalIntensity > 0.65) {
              ctx.fillStyle = accentColor;
              ctx.globalAlpha = alpha;
              ctx.fillRect(x, y, pixelSize, pixelSize);
            } else {
              ctx.fillStyle = dotColor;
              ctx.globalAlpha = alpha * 0.8;
              ctx.fillRect(x, y, pixelSize - 1, pixelSize - 1);
            }
          }
        }
      }

      ctx.globalAlpha = 1.0;
      animId = requestAnimationFrame(draw);
    };

    animId = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('scroll', onScroll);
    };
  }, [dotColor, accentColor]);

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 w-full h-full pointer-events-none ${className}`}
      aria-hidden="true"
    />
  );
};

export default DitherMatrixCanvas;
