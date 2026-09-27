import React, { useEffect, useRef } from 'react';

interface MioRippleBackgroundProps {
  className?: string;
}

interface RippleWave {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  speed: number;
  colorType: 'lime' | 'violet';
  intensity: number;
}

interface CellState {
  energy: number;
  colorType: 'lime' | 'violet';
}

export const MioRippleBackground: React.FC<MioRippleBackgroundProps> = ({ className = '' }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let width = 0;
    let height = 0;

    // Grilla grande de alto impacto visual
    const GRID_SIZE = 52;
    const BOX_SIZE = 42;
    const CORNER_RADIUS = 3;

    // Almacén de activación por celda: clave `${col}_${row}`
    const cellStates = new Map<string, CellState>();
    const ripples: RippleWave[] = [];

    const handleResize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      const rect = parent.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = rect.width;
      height = rect.height;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);
    };

    handleResize();
    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(canvas.parentElement || canvas);

    let lastMoveTime = 0;
    let waveCounter = 0;

    const triggerRipple = (clientX: number, clientY: number, isClick: boolean) => {
      const rect = canvas.getBoundingClientRect();
      const x = clientX - rect.left;
      const y = clientY - rect.top;

      if (x < -20 || x > width + 20 || y < -20 || y > height + 20) return;

      waveCounter++;
      const colorType: 'lime' | 'violet' = waveCounter % 2 === 0 ? 'lime' : 'violet';

      ripples.push({
        x,
        y,
        radius: 0,
        maxRadius: Math.max(width, height) * 0.95,
        speed: isClick ? 420 : 320,
        colorType,
        intensity: isClick ? 1.0 : 0.85,
      });

      // Límite para evitar saturación de bucle
      if (ripples.length > 8) {
        ripples.shift();
      }
    };

    const handlePointerMove = (e: PointerEvent) => {
      const now = performance.now();
      if (now - lastMoveTime > 90) {
        lastMoveTime = now;
        triggerRipple(e.clientX, e.clientY, false);
      }
    };

    const handlePointerDown = (e: PointerEvent) => {
      triggerRipple(e.clientX, e.clientY, true);
    };

    const parentEl = canvas.parentElement;
    if (parentEl) {
      parentEl.addEventListener('pointermove', handlePointerMove, { passive: true });
      parentEl.addEventListener('pointerdown', handlePointerDown, { passive: true });
    }

    let lastTime = performance.now();

    // Helper para rectángulos con esquinas redondeadas
    const drawRoundedBox = (x: number, y: number, w: number, h: number, r: number) => {
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.arcTo(x + w, y, x + w, y + h, r);
      ctx.arcTo(x + w, y + h, x, y + h, r);
      ctx.arcTo(x, y + h, x, y, r);
      ctx.arcTo(x, y, x + w, y, r);
      ctx.closePath();
    };

    const render = (time: number) => {
      animId = requestAnimationFrame(render);
      const delta = Math.min((time - lastTime) / 1000, 0.1);
      lastTime = time;

      ctx.clearRect(0, 0, width, height);

      // Fondo base oscuro profundo (#090812)
      ctx.fillStyle = '#090812';
      ctx.fillRect(0, 0, width, height);

      const cols = Math.ceil(width / GRID_SIZE) + 1;
      const rows = Math.ceil(height / GRID_SIZE) + 1;

      // 1. Expandir ondas activas
      for (let i = ripples.length - 1; i >= 0; i--) {
        const rip = ripples[i];
        rip.radius += rip.speed * delta;

        // La onda viaja activando las celdas que cruzan su frente (métrica de Chebyshev para onda cuadrada)
        const waveThickness = 48;

        for (let c = 0; c < cols; c++) {
          const px = c * GRID_SIZE + GRID_SIZE / 2;
          for (let r = 0; r < rows; r++) {
            const py = r * GRID_SIZE + GRID_SIZE / 2;

            const dist = Math.max(Math.abs(px - rip.x), Math.abs(py - rip.y));
            const waveDelta = Math.abs(dist - rip.radius);

            if (waveDelta < waveThickness) {
              const impact = (1 - waveDelta / waveThickness) * rip.intensity;
              const cellKey = `${c}_${r}`;
              const current = cellStates.get(cellKey);

              const newEnergy = Math.min(1.0, Math.max(current?.energy || 0, impact));
              // Asignar color alternado o el color de la onda
              const cellColor = (c + r) % 2 === 0 ? rip.colorType : rip.colorType === 'lime' ? 'violet' : 'lime';

              cellStates.set(cellKey, {
                energy: newEnergy,
                colorType: cellColor,
              });
            }
          }
        }

        if (rip.radius >= rip.maxRadius) {
          ripples.splice(i, 1);
        }
      }

      // 2. Renderizar cada cuadrado de la grilla
      for (let c = 0; c < cols; c++) {
        const px = c * GRID_SIZE + (GRID_SIZE - BOX_SIZE) / 2;
        for (let r = 0; r < rows; r++) {
          const py = r * GRID_SIZE + (GRID_SIZE - BOX_SIZE) / 2;
          const cellKey = `${c}_${r}`;
          const state = cellStates.get(cellKey);

          let energy = state ? state.energy : 0;

          // Decaimiento suave de vuelta a escala de grises (~2.2 segundos de fundido)
          if (state && state.energy > 0) {
            state.energy = Math.max(0, state.energy - delta * 0.45);
            energy = state.energy;
          }

          if (energy <= 0.01) {
            // ESTADO POR DEFECTO (SIN INTERACCIÓN):
            // Cuadrados grandes en escala de blanco/negro/grises puros — CERO tinte de color
            ctx.fillStyle = 'rgba(255, 255, 255, 0.055)';
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
            ctx.lineWidth = 1;
            drawRoundedBox(px, py, BOX_SIZE, BOX_SIZE, CORNER_RADIUS);
            ctx.fill();
            ctx.stroke();
          } else {
            // ESTADO ACTIVADO (TRANSFORMACIÓN A TONOS DE MARCA LIMA / VIOLETA):
            const isLime = state?.colorType === 'lime';
            const scale = 1.0 + energy * 0.08;
            const currentSize = BOX_SIZE * scale;
            const offsetX = px - (currentSize - BOX_SIZE) / 2;
            const offsetY = py - (currentSize - BOX_SIZE) / 2;

            ctx.save();

            if (isLime) {
              // MIO Lime (#bdf559)
              ctx.fillStyle = `rgba(189, 245, 89, ${0.12 + energy * 0.68})`;
              ctx.strokeStyle = `rgba(189, 245, 89, ${0.35 + energy * 0.65})`;
              ctx.lineWidth = 1.5;
              ctx.shadowColor = '#bdf559';
              ctx.shadowBlur = 14 * energy;
            } else {
              // MIO Violet (#7647eb)
              ctx.fillStyle = `rgba(118, 71, 235, ${0.18 + energy * 0.72})`;
              ctx.strokeStyle = `rgba(167, 139, 250, ${0.4 + energy * 0.6})`;
              ctx.lineWidth = 1.5;
              ctx.shadowColor = '#7647eb';
              ctx.shadowBlur = 16 * energy;
            }

            drawRoundedBox(offsetX, offsetY, currentSize, currentSize, CORNER_RADIUS);
            ctx.fill();
            ctx.stroke();

            ctx.restore();
          }
        }
      }
    };

    animId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animId);
      resizeObserver.disconnect();
      if (parentEl) {
        parentEl.removeEventListener('pointermove', handlePointerMove);
        parentEl.removeEventListener('pointerdown', handlePointerDown);
      }
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 w-full h-full pointer-events-none select-none ${className}`}
      aria-hidden="true"
    />
  );
};

export default MioRippleBackground;
