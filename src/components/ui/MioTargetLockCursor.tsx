import React, { useEffect, useRef, useState } from 'react';
import { playMioDevSound } from '@/lib/sound';

/**
 * MioTargetLockCursor:
 * Swiss Metrology & Cyber-Physical Target-Lock Hardware Cursor.
 * Features 60-120fps hardware-accelerated lerp interpolation,
 * 4-corner reticle snapping, micro-chirp audio on target lock,
 * and zero CPU drag on mobile/touch interfaces.
 */
export const MioTargetLockCursor: React.FC = () => {
  const dotRef = useRef<HTMLDivElement>(null);
  const reticleRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLSpanElement>(null);

  const [isVisible, setIsVisible] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [isPressed, setIsPressed] = useState(false);

  // Position references (avoiding React re-renders on every mouse tick)
  const mousePos = useRef({ x: -100, y: -100 });
  const dotPos = useRef({ x: -100, y: -100 });
  const reticlePos = useRef({ x: -100, y: -100 });
  const isLockedRef = useRef(false);
  const lastSoundTime = useRef(0);
  const rafId = useRef<number | null>(null);

  useEffect(() => {
    // Strict mobile / touch screen bypass (zero overhead on mobile)
    if (typeof window === 'undefined') return;
    const isFinePointer = window.matchMedia('(pointer: fine)').matches;
    if (!isFinePointer || window.innerWidth < 768) return;

    document.body.classList.add('mio-cursor-active');

    const handleMouseMove = (e: MouseEvent) => {
      mousePos.current.x = e.clientX;
      mousePos.current.y = e.clientY;
      if (!isVisible) setIsVisible(true);

      // Check target lock candidates
      const target = e.target as HTMLElement | null;
      if (target) {
        const isInteractive = Boolean(
          target.closest('button') ||
          target.closest('a') ||
          target.closest('[data-target-lock]') ||
          target.closest('input') ||
          target.closest('select') ||
          target.closest('[role="button"]') ||
          window.getComputedStyle(target).cursor === 'pointer'
        );

        if (isInteractive !== isLockedRef.current) {
          isLockedRef.current = isInteractive;
          setIsLocked(isInteractive);

          if (isInteractive) {
            const now = performance.now();
            if (now - lastSoundTime.current > 180) {
              lastSoundTime.current = now;
              playMioDevSound('targetLock');
            }
          }
        }
      }
    };

    const handleMouseDown = () => setIsPressed(true);
    const handleMouseUp = () => setIsPressed(false);

    const handleMouseLeave = () => {
      setIsVisible(false);
      mousePos.current = { x: -100, y: -100 };
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    window.addEventListener('mousedown', handleMouseDown, { passive: true });
    window.addEventListener('mouseup', handleMouseUp, { passive: true });
    document.documentElement.addEventListener('mouseleave', handleMouseLeave);

    // High performance rAF lerp loop
    const renderLoop = () => {
      const targetX = mousePos.current.x;
      const targetY = mousePos.current.y;

      // Tight lerp for central dot
      dotPos.current.x += (targetX - dotPos.current.x) * 0.45;
      dotPos.current.y += (targetY - dotPos.current.y) * 0.45;

      // Fluid inertial lag for the outer target-lock reticle
      const lagFactor = isLockedRef.current ? 0.32 : 0.18;
      reticlePos.current.x += (targetX - reticlePos.current.x) * lagFactor;
      reticlePos.current.y += (targetY - reticlePos.current.y) * lagFactor;

      if (dotRef.current) {
        dotRef.current.style.transform = `translate3d(${dotPos.current.x}px, ${dotPos.current.y}px, 0) translate(-50%, -50%)`;
      }

      if (reticleRef.current) {
        reticleRef.current.style.transform = `translate3d(${reticlePos.current.x}px, ${reticlePos.current.y}px, 0) translate(-50%, -50%)`;
      }

      rafId.current = requestAnimationFrame(renderLoop);
    };

    rafId.current = requestAnimationFrame(renderLoop);

    return () => {
      document.body.classList.remove('mio-cursor-active');
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      document.documentElement.removeEventListener('mouseleave', handleMouseLeave);
      if (rafId.current) cancelAnimationFrame(rafId.current);
    };
  }, [isVisible]);

  if (!isVisible) return null;

  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 pointer-events-none z-[999999] overflow-hidden select-none"
    >
      {/* Precision Center Dot */}
      <div
        ref={dotRef}
        className={`fixed top-0 left-0 w-2 h-2 rounded-full transition-transform will-change-transform ${
          isLocked ? 'bg-white scale-125' : 'bg-[#bdf559]'
        } shadow-[0_0_8px_#bdf559]`}
      />

      {/* Target-Lock Outer Reticle with 4 Precision Chamfers */}
      <div
        ref={reticleRef}
        className={`fixed top-0 left-0 flex items-center justify-center transition-[width,height,opacity,border-color] duration-150 will-change-transform ${
          isLocked
            ? 'w-11 h-11 border-2 border-[#bdf559] bg-[#bdf559]/10'
            : isPressed
            ? 'w-6 h-6 border border-white/60 bg-white/5'
            : 'w-8 h-8 border border-white/30'
        }`}
      >
        {/* Four Swiss Metrology Chamfer Marks */}
        <span className="absolute -top-1 -left-1 w-2 h-2 border-t-2 border-l-2 border-[#bdf559]" />
        <span className="absolute -top-1 -right-1 w-2 h-2 border-t-2 border-r-2 border-[#bdf559]" />
        <span className="absolute -bottom-1 -left-1 w-2 h-2 border-b-2 border-l-2 border-[#bdf559]" />
        <span className="absolute -bottom-1 -right-1 w-2 h-2 border-b-2 border-r-2 border-[#bdf559]" />

        {/* Realtime Target Lock Tag */}
        {isLocked && (
          <span
            ref={labelRef}
            className="absolute -bottom-5 left-1/2 -translate-x-1/2 font-mono text-[8px] font-bold tracking-widest text-[#bdf559] bg-black/90 px-1 py-0.5 whitespace-nowrap border border-[#bdf559]/40 shadow-sm"
          >
            TARGET LOCK // 0.8MS
          </span>
        )}
      </div>
    </div>
  );
};

export default MioTargetLockCursor;
