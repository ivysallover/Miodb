import React, { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

export interface DitherShaderProps {
  src?: string;
  gridSize?: number;
  ditherMode?: 'bayer' | 'noise' | 'halftone';
  colorMode?: 'grayscale' | 'duotone' | 'rgb';
  invert?: boolean;
  animated?: boolean;
  animationSpeed?: number;
  primaryColor?: string;
  secondaryColor?: string;
  threshold?: number;
  className?: string;
  children?: React.ReactNode;
}

// 4x4 Bayer Matrix for standard ordered dithering
const BAYER_4X4 = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
];

export const DitherShader: React.FC<DitherShaderProps> = ({
  src,
  gridSize = 2,
  ditherMode = 'bayer',
  colorMode = 'duotone',
  invert = false,
  animated = false,
  animationSpeed = 0.02,
  primaryColor = '#07070a',
  secondaryColor = '#7647eb',
  threshold = 0.5,
  className = '',
  children,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const imgRef = useRef<HTMLImageElement | null>(null);

  // Parse hex to RGB
  const hexToRgb = (hex: string) => {
    const cleanHex = hex.replace('#', '');
    const num = parseInt(
      cleanHex.length === 3
        ? cleanHex
            .split('')
            .map((c) => c + c)
            .join('')
        : cleanHex,
      16
    );
    return {
      r: (num >> 16) & 255,
      g: (num >> 8) & 255,
      b: num & 255,
    };
  };

  useEffect(() => {
    if (!src) return;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = src;
    img.onload = () => {
      imgRef.current = img;
      setImageLoaded(true);
    };
  }, [src]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    let animId: number;
    let time = 0;

    const render = () => {
      const w = canvas.width;
      const h = canvas.height;
      if (w === 0 || h === 0) return;

      // Draw source image if loaded
      if (imgRef.current && imageLoaded) {
        ctx.drawImage(imgRef.current, 0, 0, w, h);
      } else if (!children) {
        // Fallback procedural placeholder
        ctx.fillStyle = '#111118';
        ctx.fillRect(0, 0, w, h);
      }

      const imgData = ctx.getImageData(0, 0, w, h);
      const data = imgData.data;

      const pCol = hexToRgb(primaryColor);
      const sCol = hexToRgb(secondaryColor);

      const step = Math.max(1, Math.floor(gridSize));
      const animOffset = animated ? Math.sin(time) * 0.08 : 0;

      for (let y = 0; y < h; y += step) {
        for (let x = 0; x < w; x += step) {
          const idx = (y * w + x) * 4;
          const r = data[idx];
          const g = data[idx + 1];
          const b = data[idx + 2];

          // Perceived luminance
          let lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
          if (invert) lum = 1.0 - lum;

          let isDithered = false;

          if (ditherMode === 'bayer') {
            const bX = (x / step) % 4;
            const bY = (y / step) % 4;
            const bayerVal = (BAYER_4X4[bY][bX] + 0.5) / 16.0;
            isDithered = lum + animOffset > threshold + (bayerVal - 0.5) * 0.7;
          } else {
            // Halftone or noise
            const noise = (Math.random() - 0.5) * 0.4;
            isDithered = lum + animOffset + noise > threshold;
          }

          // Pick target color
          let outR: number, outG: number, outB: number;
          if (colorMode === 'duotone') {
            const target = isDithered ? sCol : pCol;
            outR = target.r;
            outG = target.g;
            outB = target.b;
          } else if (colorMode === 'grayscale') {
            const val = isDithered ? 255 : 0;
            outR = val;
            outG = val;
            outB = val;
          } else {
            outR = isDithered ? r : Math.floor(r * 0.2);
            outG = isDithered ? g : Math.floor(g * 0.2);
            outB = isDithered ? b : Math.floor(b * 0.2);
          }

          // Fill the block of size `step`
          for (let dy = 0; dy < step && y + dy < h; dy++) {
            for (let dx = 0; dx < step && x + dx < w; dx++) {
              const pIdx = ((y + dy) * w + (x + dx)) * 4;
              data[pIdx] = outR;
              data[pIdx + 1] = outG;
              data[pIdx + 2] = outB;
              data[pIdx + 3] = 255;
            }
          }
        }
      }

      ctx.putImageData(imgData, 0, 0);

      if (animated) {
        time += animationSpeed;
        animId = requestAnimationFrame(render);
      }
    };

    // Size canvas to container
    const container = containerRef.current;
    if (container) {
      canvas.width = container.clientWidth || 600;
      canvas.height = container.clientHeight || 400;
    }

    render();

    return () => {
      if (animId) cancelAnimationFrame(animId);
    };
  }, [
    imageLoaded,
    gridSize,
    ditherMode,
    colorMode,
    invert,
    animated,
    animationSpeed,
    primaryColor,
    secondaryColor,
    threshold,
    src,
  ]);

  return (
    <div ref={containerRef} className={cn('relative overflow-hidden', className)}>
      <canvas ref={canvasRef} className="w-full h-full block" />
      {children && <div className="absolute inset-0 z-10 pointer-events-none">{children}</div>}
    </div>
  );
};

export default DitherShader;
