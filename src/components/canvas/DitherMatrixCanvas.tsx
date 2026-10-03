import React, { useRef, useEffect } from 'react';
import { startGatedLoop } from '@/lib/renderGate';

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

    let width = 0;
    let height = 0;
    let mousePxX = -1000;
    let mousePxY = -1000;
    let targetMousePxX = -1000;
    let targetMousePxY = -1000;
    let isMouseOver = false;
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
      const clientX = e.clientX;
      const clientY = e.clientY;
      // Active whenever mouse is within or near the canvas bounding box
      if (
        clientX >= rect.left - 40 &&
        clientX <= rect.right + 40 &&
        clientY >= rect.top - 40 &&
        clientY <= rect.bottom + 40
      ) {
        isMouseOver = true;
        targetMousePxX = clientX - rect.left;
        targetMousePxY = clientY - rect.top;
      } else {
        isMouseOver = false;
      }
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

      // Smooth cursor lerp for silky tactile feel
      if (isMouseOver) {
        mousePxX += (targetMousePxX - mousePxX) * 0.22;
        mousePxY += (targetMousePxY - mousePxY) * 0.22;
      } else {
        mousePxX += (-1000 - mousePxX) * 0.08;
        mousePxY += (-1000 - mousePxY) * 0.08;
      }

      const cols = Math.ceil(width / step);
      const rows = Math.ceil(height / step);

      // Render flowing dithered halftone topography wave
      for (let c = 0; c < cols; c++) {
        for (let r = 0; r < rows; r++) {
          const x = c * step;
          const y = r * step;

          // Wave equation creating the diagonal sweeping dither cloud
          const normX = c / cols;
          const normY = r / rows;

          const wave =
            Math.sin(normX * 5.0 - time * 0.8 + scrollYOffset * 2.0) * 0.5 +
            Math.cos(normY * 4.0 + time * 0.6) * 0.3 +
            Math.sin((normX + normY) * 6.0 + time) * 0.4;

          // High-sensitivity mouse reactive spotlight & kinetic ripples
          const distToMouse = Math.hypot(x - mousePxX, y - mousePxY);
          const mouseRadius = 180;
          const mouseProximity = Math.max(0, 1.0 - distToMouse / mouseRadius);
          const mouseWave = Math.sin(distToMouse * 0.06 - time * 4.5) * mouseProximity * 0.45;
          const mouseFactor = mouseProximity * 1.1 + mouseWave;

          const totalIntensity = wave + mouseFactor;

          // Dither threshold logic
          if (totalIntensity > 0.15) {
            const alpha = Math.min(1, Math.max(0.12, (totalIntensity - 0.15) * 1.6));
            
            // Interactive mouse expansion & color excitation
            const isNearMouse = mouseProximity > 0.15;
            const currentSize = isNearMouse ? pixelSize + mouseProximity * 2.2 : pixelSize;
            const offset = (currentSize - pixelSize) / 2;

            if (mouseProximity > 0.3 || totalIntensity > 0.68) {
              ctx.fillStyle = accentColor;
              ctx.globalAlpha = Math.min(1, alpha * 1.25);
              ctx.fillRect(x - offset, y - offset, currentSize, currentSize);
            } else {
              ctx.fillStyle = dotColor;
              ctx.globalAlpha = alpha * 0.85;
              ctx.fillRect(x, y, pixelSize - 1, pixelSize - 1);
            }
          }
        }
      }

      ctx.globalAlpha = 1.0;
    };

    // Gated: the wave only computes while the canvas is on screen and the tab is visible.
    const stopLoop = startGatedLoop(canvas, draw);

    return () => {
      stopLoop();
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
