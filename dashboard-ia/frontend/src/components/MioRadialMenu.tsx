'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Eye, 
  EyeOff, 
  Volume2, 
  VolumeX, 
  Maximize2,
  Minimize2,
  ArrowUp,
  UploadCloud,
  Settings, 
  X,
} from 'lucide-react';
import { playMioDevSound } from '@/lib/sound';
import toast from 'react-hot-toast';

export interface RadialOption {
  id: string;
  label: string;
  shortLabel: string;
  icon: React.ReactNode;
  angleDeg: number; // Polar angle in degrees (pointing into viewport from bottom-right)
  action: () => void;
  isActive?: boolean;
}

interface MioRadialMenuProps {
  radius?: number; // default: 124px
  staggerMs?: number; // default: 28ms
}

export default function MioRadialMenu({
  radius = 124,
  staggerMs = 28,
}: MioRadialMenuProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [aimIndex, setAimIndex] = useState<number | null>(null);
  const [isColorblind, setIsColorblind] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [mounted, setMounted] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const originRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const isDraggingRef = useRef(false);
  const hasMovedRef = useRef(false);
  const aimIndexRef = useRef<number | null>(null);

  // Keep ref in sync for pointerup closures
  aimIndexRef.current = aimIndex;

  // Initialize preferences
  useEffect(() => {
    setMounted(true);
    if (typeof window !== 'undefined') {
      const cb = localStorage.getItem('mio_colorblind_mode') === 'true';
      setIsColorblind(cb);
      if (cb) document.documentElement.classList.add('colorblind-mode');

      const snd = localStorage.getItem('mio_sound_enabled');
      setSoundEnabled(snd !== 'false');

      const handleCbEvent = (e: any) => {
        setIsColorblind(Boolean(e.detail?.enabled));
      };
      window.addEventListener('mio:colorblind-changed', handleCbEvent);

      const handleFsChange = () => {
        setIsFullscreen(Boolean(document.fullscreenElement));
      };
      document.addEventListener('fullscreenchange', handleFsChange);

      return () => {
        window.removeEventListener('mio:colorblind-changed', handleCbEvent);
        document.removeEventListener('fullscreenchange', handleFsChange);
      };
    }
  }, []);

  const playSound = useCallback((type: 'buttonA' | 'buttonB' | 'toggle') => {
    if (soundEnabled) {
      try {
        playMioDevSound(type);
      } catch {}
    }
  }, [soundEnabled]);

  // Actions
  const toggleColorblind = useCallback(() => {
    const next = !isColorblind;
    setIsColorblind(next);
    try {
      localStorage.setItem('mio_colorblind_mode', String(next));
      if (next) {
        document.documentElement.classList.add('colorblind-mode');
        toast.success('Modo Daltonismo y Alto Contraste ACTIVADO', { icon: '👁️' });
      } else {
        document.documentElement.classList.remove('colorblind-mode');
        toast('Modo visual estándar restablecido', { icon: '🎨' });
      }
      window.dispatchEvent(new CustomEvent('mio:colorblind-changed', { detail: { enabled: next } }));
    } catch (e) {
      console.warn(e);
    }
    playSound('toggle');
  }, [isColorblind, playSound]);

  const toggleSound = useCallback(() => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    try {
      localStorage.setItem('mio_sound_enabled', String(next));
      if (next) {
        toast.success('Efectos de sonido ACTIVADOS', { icon: '🔊' });
        try { playMioDevSound('buttonA'); } catch {}
      } else {
        toast('Efectos de sonido silenciados', { icon: '🔇' });
      }
    } catch (e) {
      console.warn(e);
    }
  }, [soundEnabled]);

  const toggleFullscreen = useCallback(() => {
    playSound('toggle');
    try {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen?.().catch(() => {});
        toast.success('Modo Presentación (Pantalla Completa)', { icon: '🖥️' });
      } else {
        document.exitFullscreen?.().catch(() => {});
        toast('Modo Presentación finalizado', { icon: '🪟' });
      }
    } catch (e) {
      console.warn(e);
    }
  }, [playSound]);

  const scrollToTop = useCallback(() => {
    playSound('buttonA');
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      toast('Inicio de la página', { icon: '⬆️' });
    }
  }, [playSound]);

  const handleNewAnalysis = useCallback(() => {
    playSound('buttonA');
    if (typeof window !== 'undefined') {
      if (window.location.pathname === '/dashboard') {
        window.dispatchEvent(new CustomEvent('mio:reset-dashboard'));
        window.scrollTo({ top: 0, behavior: 'smooth' });
        toast.success('Listo para un nuevo análisis', { icon: '📂' });
      } else {
        try { localStorage.removeItem('mio_active_analysis'); } catch {}
        router.push('/dashboard?new=1');
      }
    }
  }, [playSound, router]);

  // The 5 fan options fanning from 180° (horizontal left) to 270° (vertical up)
  // High-utility tools spaced cleanly with zero overlapping
  const options: RadialOption[] = [
    {
      id: 'new-analysis',
      label: 'Nuevo Análisis (Subir archivo)',
      shortLabel: 'Nuevo',
      icon: <UploadCloud className="w-5 h-5 text-gray-950 stroke-[2.2]" />,
      angleDeg: 180, // Left
      action: handleNewAnalysis,
    },
    {
      id: 'colorblind',
      label: isColorblind ? 'Modo Daltonismo: ACTIVO' : 'Activar Modo Daltonismo',
      shortLabel: 'Daltonismo',
      icon: isColorblind ? <Eye className="w-5 h-5 text-gray-950 stroke-[2.5]" /> : <EyeOff className="w-5 h-5 text-gray-700 stroke-[2]" />,
      angleDeg: 202.5,
      action: toggleColorblind,
      isActive: isColorblind,
    },
    {
      id: 'fullscreen',
      label: isFullscreen ? 'Salir de Pantalla Completa' : 'Modo Presentación (Pantalla Completa)',
      shortLabel: 'Presentación',
      icon: isFullscreen ? <Minimize2 className="w-5 h-5 text-gray-950 stroke-[2.2]" /> : <Maximize2 className="w-5 h-5 text-gray-950 stroke-[2.2]" />,
      angleDeg: 225, // Center diagonal
      action: toggleFullscreen,
      isActive: isFullscreen,
    },
    {
      id: 'sound',
      label: soundEnabled ? 'Audio Web: ACTIVADO' : 'Audio Web: SILENCIADO',
      shortLabel: 'Sonido',
      icon: soundEnabled ? <Volume2 className="w-5 h-5 text-gray-950 stroke-[2.5]" /> : <VolumeX className="w-5 h-5 text-gray-700 stroke-[2]" />,
      angleDeg: 247.5,
      action: toggleSound,
      isActive: soundEnabled,
    },
    {
      id: 'scroll-top',
      label: 'Volver Arriba (Inicio)',
      shortLabel: 'Arriba',
      icon: <ArrowUp className="w-5 h-5 text-gray-950 stroke-[2.5]" />,
      angleDeg: 270, // Straight Up
      action: scrollToTop,
    },
  ];

  // Gestures & Physics
  const handlePointerDown = (e: React.PointerEvent) => {
    // Only respond to primary mouse or touch
    if (e.button !== 0) return;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    // Core center position
    originRef.current = {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    };
    isDraggingRef.current = true;
    hasMovedRef.current = false;
    
    // Open fan immediately on press
    if (!isOpen) {
      setIsOpen(true);
      playSound('buttonA');
    }
  };

  useEffect(() => {
    const handleGlobalPointerMove = (e: PointerEvent) => {
      if (!isDraggingRef.current) return;
      const dx = e.clientX - originRef.current.x;
      const dy = e.clientY - originRef.current.y;
      const dist = Math.hypot(dx, dy);

      // Core deadzone threshold (tap vs drag)
      if (dist < 18) {
        setAimIndex(null);
        return;
      }

      hasMovedRef.current = true;

      // Polar angle in degrees (0 to 360)
      let deg = Math.atan2(dy, dx) * (180 / Math.PI);
      if (deg < 0) deg += 360;

      // Find nearest option by angle
      let bestIdx = 0;
      let minDiff = Infinity;
      options.forEach((opt, idx) => {
        let diff = Math.abs(opt.angleDeg - deg);
        if (diff > 180) diff = 360 - diff;
        if (diff < minDiff) {
          minDiff = diff;
          bestIdx = idx;
        }
      });

      if (aimIndexRef.current !== bestIdx) {
        setAimIndex(bestIdx);
        playSound('buttonB');
      }
    };

    const handleGlobalPointerUp = () => {
      if (!isDraggingRef.current) return;
      isDraggingRef.current = false;

      // If user dragged to an option and released: commit immediately
      if (hasMovedRef.current && aimIndexRef.current !== null) {
        const selected = options[aimIndexRef.current];
        if (selected) {
          selected.action();
        }
        setIsOpen(false);
        setAimIndex(null);
      } else if (!hasMovedRef.current) {
        // Plain tap on the core: leaves menu open or toggles
      }
    };

    window.addEventListener('pointermove', handleGlobalPointerMove);
    window.addEventListener('pointerup', handleGlobalPointerUp);
    return () => {
      window.removeEventListener('pointermove', handleGlobalPointerMove);
      window.removeEventListener('pointerup', handleGlobalPointerUp);
    };
  }, [options, playSound]);

  // Click outside to close when left open
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setAimIndex(null);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
        setAimIndex(null);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  if (!mounted) return null;

  return (
    <div 
      ref={containerRef}
      className="fixed bottom-6 right-6 z-50 select-none touch-none"
      aria-label="Menú Radial de Utilidades y Accesibilidad MIO"
    >
      {/* Tooltip banner for aimed or hovered option */}
      {isOpen && aimIndex !== null && (
        <div 
          className="absolute right-16 bottom-16 pointer-events-none z-50 animate-in fade-in zoom-in-95 duration-100"
          role="status"
          aria-live="polite"
        >
          <div className="bg-[#111] text-white border-2 border-mio-lime px-3.5 py-1.5 shadow-[4px_4px_0px_rgba(0,0,0,0.8)] flex items-center gap-2 whitespace-nowrap">
            <span className="w-2 h-2 rounded-full bg-mio-lime animate-ping" />
            <span className="font-mono text-xs font-black uppercase tracking-wider">
              {options[aimIndex].label}
            </span>
          </div>
        </div>
      )}

      {/* Fan Options Arc */}
      <div 
        className={`absolute inset-0 pointer-events-none transition-all duration-300 ${isOpen ? 'pointer-events-auto' : ''}`}
      >
        {options.map((opt, i) => {
          const rad = (opt.angleDeg * Math.PI) / 180;
          const x = Math.round(Math.cos(rad) * radius);
          const y = Math.round(Math.sin(rad) * radius);
          const isAimed = aimIndex === i;

          return (
            <button
              key={opt.id}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                opt.action();
                setIsOpen(false);
                setAimIndex(null);
              }}
              onMouseEnter={() => {
                setAimIndex(i);
                playSound('buttonB');
              }}
              onMouseLeave={() => setAimIndex(null)}
              aria-label={opt.label}
              style={{
                left: '50%',
                top: '50%',
                transform: isOpen 
                  ? `translate(calc(-50% + ${x}px), calc(-50% + ${y}px)) scale(${isAimed ? 1.2 : 1})` 
                  : 'translate(-50%, -50%) scale(0.2)',
                opacity: isOpen ? 1 : 0,
                transition: `transform 260ms cubic-bezier(0.34, 1.56, 0.64, 1), opacity 200ms ease, background-color 150ms ease`,
                transitionDelay: isOpen ? `${i * staggerMs}ms` : '0ms',
              }}
              className={`absolute w-10 h-10 rounded-full border-2 border-[#111] shadow-[2.5px_2.5px_0px_#111] flex items-center justify-center transition-all focus-visible:ring-2 focus-visible:ring-mio-violet focus-visible:outline-none ${
                isAimed 
                  ? 'bg-mio-lime border-mio-violet shadow-[4px_4px_0px_#111] z-30' 
                  : opt.isActive 
                    ? 'bg-mio-lime/40 border-[#111] hover:bg-mio-lime z-20' 
                    : 'bg-white hover:bg-[#faf8f5] z-10'
              }`}
            >
              {opt.icon}
              {opt.isActive && (
                <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-mio-lime border border-[#111] rounded-full" />
              )}
            </button>
          );
        })}
      </div>

      {/* Core Trigger Button (Bencho-inspired press & drag or click) */}
      <button
        type="button"
        onPointerDown={handlePointerDown}
        onClick={() => {
          if (!hasMovedRef.current) {
            setIsOpen(!isOpen);
            playSound('buttonA');
          }
        }}
        aria-expanded={isOpen}
        aria-haspopup="true"
        aria-label="Abrir Menú Radial de Configuración y Accesibilidad MIO"
        className={`relative w-14 h-14 rounded-full border-[2.5px] border-[#111] shadow-[4px_4px_0px_#111] flex items-center justify-center transition-all duration-200 cursor-pointer active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0px_#111] focus-visible:ring-2 focus-visible:ring-mio-violet focus-visible:outline-none ${
          isOpen
            ? 'bg-gray-950 text-mio-lime rotate-90 border-[#111]'
            : isColorblind 
              ? 'bg-[#ffe500] text-black hover:bg-[#ffea33]' 
              : 'bg-mio-lime text-gray-950 hover:bg-[#c8ff6a]'
        }`}
        title="Menú Radial MIO (Accesibilidad & Ajustes)"
      >
        {isOpen ? (
          <X className="w-6 h-6 stroke-[3]" />
        ) : (
          <Settings className="w-6 h-6 stroke-[2.5] transition-transform group-hover:rotate-45" />
        )}

        {/* Status indicator dot if colorblind mode is active */}
        {!isOpen && isColorblind && (
          <span 
            className="absolute -top-1 -right-1 w-4 h-4 bg-[#0033bb] border-2 border-white rounded-full flex items-center justify-center text-[8px] font-black text-white"
            title="Modo Daltonismo Activo"
          >
            ✓
          </span>
        )}
      </button>
    </div>
  );
}
