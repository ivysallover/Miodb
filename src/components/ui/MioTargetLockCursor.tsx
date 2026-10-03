import React, { useEffect, useRef } from 'react';
import { playMioDevSound } from '@/lib/sound';

/**
 * MioTargetLockCursor:
 * Swiss Metrology & Cyber-Physical Target-Lock Hardware Cursor.
 * Zero-re-render architecture: runs 100% in requestAnimationFrame with direct DOM transforms.
 * Auto-disabled on mobile / touch interfaces.
 */
export const MioTargetLockCursor: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const dotRef = useRef<HTMLDivElement>(null);
  const reticleRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLSpanElement>(null);

  const mousePos = useRef({ x: -200, y: -200 });
  const dotPos = useRef({ x: -200, y: -200 });
  const reticlePos = useRef({ x: -200, y: -200 });
  const isLockedRef = useRef(false);
  const isVisibleRef = useRef(false);
  const lastSoundTime = useRef(0);
  const lastCheckTime = useRef(0);
  const rafId = useRef<number | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const isFinePointer = window.matchMedia('(pointer: fine)').matches;
    if (!isFinePointer || window.innerWidth < 768) return;

    document.body.classList.add('mio-cursor-active');

    const handleMouseMove = (e: MouseEvent) => {
      mousePos.current.x = e.clientX;
      mousePos.current.y = e.clientY;

      if (!isVisibleRef.current) {
        isVisibleRef.current = true;
        if (containerRef.current) {
          containerRef.current.style.opacity = '1';
        }
      }

      // Throttle DOM query to every 50ms for maximum frame rate
      const now = performance.now();
      if (now - lastCheckTime.current > 50) {
        lastCheckTime.current = now;
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

            if (reticleRef.current) {
              if (isInteractive) {
                reticleRef.current.classList.add('is-locked');
              } else {
                reticleRef.current.classList.remove('is-locked');
              }
            }
            if (dotRef.current) {
              if (isInteractive) {
                dotRef.current.classList.add('is-locked');
              } else {
                dotRef.current.classList.remove('is-locked');
              }
            }
            if (labelRef.current) {
              labelRef.current.style.display = isInteractive ? 'block' : 'none';
            }

            if (isInteractive && now - lastSoundTime.current > 200) {
              lastSoundTime.current = now;
              playMioDevSound('targetLock');
            }
          }
        }
      }
    };

    const handleMouseDown = () => {
      if (reticleRef.current) reticleRef.current.classList.add('is-pressed');
    };

    const handleMouseUp = () => {
      if (reticleRef.current) reticleRef.current.classList.remove('is-pressed');
    };

    const handleMouseLeave = () => {
      isVisibleRef.current = false;
      if (containerRef.current) {
        containerRef.current.style.opacity = '0';
      }
      mousePos.current = { x: -200, y: -200 };
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    window.addEventListener('mousedown', handleMouseDown, { passive: true });
    window.addEventListener('mouseup', handleMouseUp, { passive: true });
    document.documentElement.addEventListener('mouseleave', handleMouseLeave);

    // 100% hardware-accelerated rAF lerp loop
    const renderLoop = () => {
      if (isVisibleRef.current) {
        const targetX = mousePos.current.x;
        const targetY = mousePos.current.y;

        dotPos.current.x += (targetX - dotPos.current.x) * 0.45;
        dotPos.current.y += (targetY - dotPos.current.y) * 0.45;

        const lag = isLockedRef.current ? 0.35 : 0.2;
        reticlePos.current.x += (targetX - reticlePos.current.x) * lag;
        reticlePos.current.y += (targetY - reticlePos.current.y) * lag;

        if (dotRef.current) {
          dotRef.current.style.transform = `translate3d(${dotPos.current.x}px, ${dotPos.current.y}px, 0) translate(-50%, -50%)`;
        }

        if (reticleRef.current) {
          reticleRef.current.style.transform = `translate3d(${reticlePos.current.x}px, ${reticlePos.current.y}px, 0) translate(-50%, -50%)`;
        }
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
  }, []);

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      style={{ opacity: 0 }}
      className="fixed inset-0 pointer-events-none z-[999999] overflow-hidden select-none transition-opacity duration-200"
    >
      {/* Precision Center Dot */}
      <div
        ref={dotRef}
        className="fixed top-0 left-0 w-2 h-2 rounded-full bg-[#bdf559] shadow-[0_0_8px_#bdf559] will-change-transform [&.is-locked]:bg-white [&.is-locked]:scale-125 transition-colors"
      />

      {/* Target-Lock Outer Reticle with 4 Precision Chamfers */}
      <div
        ref={reticleRef}
        className="fixed top-0 left-0 w-8 h-8 border border-white/30 flex items-center justify-center will-change-transform transition-[width,height,border-color,background-color] duration-150 [&.is-locked]:w-11 [&.is-locked]:h-11 [&.is-locked]:border-2 [&.is-locked]:border-[#bdf559] [&.is-locked]:bg-[#bdf559]/10 [&.is-pressed]:scale-90"
      >
        {/* Four Swiss Metrology Chamfer Marks */}
        <span className="absolute -top-1 -left-1 w-2 h-2 border-t-2 border-l-2 border-[#bdf559]" />
        <span className="absolute -top-1 -right-1 w-2 h-2 border-t-2 border-r-2 border-[#bdf559]" />
        <span className="absolute -bottom-1 -left-1 w-2 h-2 border-b-2 border-l-2 border-[#bdf559]" />
        <span className="absolute -bottom-1 -right-1 w-2 h-2 border-b-2 border-r-2 border-[#bdf559]" />

        {/* Realtime Target Lock Tag */}
        <span
          ref={labelRef}
          style={{ display: 'none' }}
          className="absolute -bottom-5 left-1/2 -translate-x-1/2 font-mono text-[8px] font-bold tracking-widest text-[#bdf559] bg-black/90 px-1 py-0.5 whitespace-nowrap border border-[#bdf559]/40 shadow-sm"
        >
          TARGET LOCK // 0.8MS
        </span>
      </div>
    </div>
  );
};

export default MioTargetLockCursor;
