import React, { useRef, useEffect, useState } from 'react';
import { useSmoothScroll } from '@/app/providers/SmoothScrollProvider';
import { playMioDevSound } from '@/lib/sound';

interface TelemetryItem {
  id: string;
  label: string;
  tag: string;
  sparkType: 'accuracy' | 'latency' | 'outlier' | 'clustering' | 'runtime' | 'loss' | 'throughput' | 'integrity';
}

const TELEMETRY_ITEMS: TelemetryItem[] = [
  { id: 't1', label: 'R²: 0.984', tag: 'ACCURACY', sparkType: 'accuracy' },
  { id: 't2', label: 'LATENCY: 8ms', tag: 'PIPELINE', sparkType: 'latency' },
  { id: 't3', label: 'SKU-402: +4.8σ', tag: 'ISOLATION FOREST', sparkType: 'outlier' },
  { id: 't4', label: 'K-MEANS: 3 SEGMENTS', tag: 'CLUSTERING', sparkType: 'clustering' },
  { id: 't5', label: 'LOSS: 0.0018', tag: 'CONVERGENCE', sparkType: 'loss' },
  { id: 't6', label: 'THROUGHPUT: 104K/S', tag: 'INGESTA', sparkType: 'throughput' },
  { id: 't7', label: 'AUTO-ML K-TUNER: 42s', tag: 'RUNTIME', sparkType: 'runtime' },
  { id: 't8', label: 'MIO-DEV 01 // HW-OS v2.6', tag: 'HARDWARE', sparkType: 'integrity' },
];

interface TelemetryMarqueeProps {
  className?: string;
  theme?: 'dark' | 'lime' | 'light';
}

// Interactive Live Mini Sparklines
const MiniSparkline: React.FC<{
  type: TelemetryItem['sparkType'];
  isDark: boolean;
  isHovered: boolean;
}> = ({ type, isDark, isHovered }) => {
  const strokeColor = isDark ? (isHovered ? '#bdf559' : '#a78bfa') : isHovered ? '#000' : '#4c1d95';

  const paths: Record<TelemetryItem['sparkType'], string> = {
    accuracy: 'M 0 14 Q 15 12, 25 6 T 46 2',
    latency: 'M 0 8 L 8 4 L 14 12 L 20 6 L 28 11 L 36 3 L 46 8',
    outlier: 'M 0 10 L 20 10 L 24 1 L 28 14 L 32 10 L 46 10',
    clustering: 'M 0 12 L 14 12 L 14 7 L 28 7 L 28 2 L 46 2',
    loss: 'M 0 2 Q 12 10, 46 13',
    throughput: 'M 0 8 Q 11 2, 23 8 T 46 8',
    runtime: 'M 0 13 Q 10 3, 46 3',
    integrity: 'M 0 8 L 15 8 L 18 2 L 22 14 L 25 8 L 46 8',
  };

  return (
    <svg
      width="46"
      height="16"
      viewBox="0 0 46 16"
      fill="none"
      className={`shrink-0 transition-transform duration-200 ${isHovered ? 'scale-110 drop-shadow-[0_0_6px_#bdf559]' : ''}`}
    >
      <path
        d={paths[type]}
        stroke={strokeColor}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Active telemetry node dot */}
      <circle
        cx="44"
        cy={type === 'loss' ? 13 : type === 'accuracy' || type === 'clustering' || type === 'runtime' ? 2 : 8}
        r="2"
        fill={strokeColor}
        className={isHovered ? 'animate-ping' : ''}
      />
    </svg>
  );
};

export const TelemetryMarquee: React.FC<TelemetryMarqueeProps> = ({
  className = '',
  theme = 'dark',
}) => {
  const isDark = theme === 'dark';
  const isLime = theme === 'lime';
  const { lenis } = useSmoothScroll();
  const containerRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const [isContainerHovered, setIsContainerHovered] = useState(false);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const xPos = useRef(0);
  const velocityBoost = useRef(0);
  const rafId = useRef<number | null>(null);

  useEffect(() => {
    if (!lenis) return;

    const handleScroll = (e: { velocity: number }) => {
      const clampedVelocity = Math.max(-25, Math.min(25, e.velocity));
      velocityBoost.current = clampedVelocity * 0.45;
    };

    lenis.on('scroll', handleScroll);
    return () => {
      lenis.off('scroll', handleScroll);
    };
  }, [lenis]);

  const isVisibleRef = useRef(true);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        isVisibleRef.current = entry.isIntersecting;
      },
      { threshold: 0 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    let lastTime = performance.now();

    const loop = (now: number) => {
      const dt = Math.min(32, now - lastTime) / 16.666;
      lastTime = now;

      if (!isContainerHovered && isVisibleRef.current) {
        const baseSpeed = 0.85;
        velocityBoost.current *= 0.92;

        const delta = (baseSpeed + Math.abs(velocityBoost.current)) * dt;
        xPos.current -= delta;

        const halfWidth = track.scrollWidth / 2;
        if (halfWidth > 0 && Math.abs(xPos.current) >= halfWidth) {
          xPos.current += halfWidth;
        }

        track.style.transform = `translate3d(${xPos.current.toFixed(2)}px, 0, 0)`;
      }

      rafId.current = requestAnimationFrame(loop);
    };

    rafId.current = requestAnimationFrame(loop);

    return () => {
      if (rafId.current) cancelAnimationFrame(rafId.current);
    };
  }, [isContainerHovered]);

  const handleItemHover = (idx: number) => {
    setHoveredIdx(idx);
    playMioDevSound('tick');
  };

  return (
    <div
      ref={containerRef}
      data-target-lock="data"
      onMouseEnter={() => setIsContainerHovered(true)}
      onMouseLeave={() => {
        setIsContainerHovered(false);
        setHoveredIdx(null);
      }}
      className={`w-full h-10 border-y flex items-center overflow-hidden select-none cursor-crosshair group ${
        isDark ? 'bg-black/40 border-white/[0.08] text-zinc-300' : isLime ? 'bg-[#bdf559]/15 border-[#bdf559]/30 text-zinc-900' : 'bg-zinc-100/60 border-black/[0.08] text-zinc-800'
      } ${className}`}
      aria-label="Telemetría de modelos MIO en vivo con sparklines"
    >
      <div
        ref={trackRef}
        className="flex shrink-0 items-center will-change-transform"
      >
        {/* Strip 1 */}
        <div className="flex shrink-0 items-center gap-9 pr-9 whitespace-nowrap">
          {TELEMETRY_ITEMS.map((item, idx) => {
            const isHovered = hoveredIdx === idx;
            return (
              <div
                key={`s1-${item.id}`}
                onMouseEnter={() => handleItemHover(idx)}
                className={`flex items-center gap-3 font-mono text-xs font-bold tracking-wider transition-all duration-150 ${
                  isHovered ? 'scale-105 brightness-125' : ''
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full transition-transform ${
                    isDark
                      ? isHovered
                        ? 'bg-[#bdf559] shadow-[0_0_8px_#bdf559] scale-125'
                        : 'bg-[#bdf559] shadow-[0_0_4px_#bdf559]'
                      : 'bg-black'
                  }`}
                />
                
                {/* Live SVG Sparkline */}
                <MiniSparkline type={item.sparkType} isDark={isDark} isHovered={isHovered} />

                <span className={isDark ? (isHovered ? 'text-[#bdf559] font-black' : 'text-gray-100') : 'text-black'}>
                  {item.label}
                </span>

                <span
                  className={`text-[9px] px-2 py-0.5 border uppercase font-black transition-colors ${
                    isDark
                      ? isHovered
                        ? 'border-[#bdf559] bg-[#bdf559]/20 text-[#bdf559]'
                        : 'border-gray-800 bg-white/5 text-zinc-400'
                      : 'border-black bg-black text-[#bdf559]'
                  }`}
                >
                  {item.tag}
                </span>

                <span className="text-gray-600 font-normal">///</span>
              </div>
            );
          })}
        </div>

        {/* Strip 2 (Continuous replica) */}
        <div className="flex shrink-0 items-center gap-9 pr-9 whitespace-nowrap" aria-hidden="true">
          {TELEMETRY_ITEMS.map((item, idx) => {
            const isHovered = hoveredIdx === idx + 100;
            return (
              <div
                key={`s2-${item.id}`}
                onMouseEnter={() => handleItemHover(idx + 100)}
                className={`flex items-center gap-3 font-mono text-xs font-bold tracking-wider transition-all duration-150 ${
                  isHovered ? 'scale-105 brightness-125' : ''
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full transition-transform ${
                    isDark
                      ? isHovered
                        ? 'bg-[#bdf559] shadow-[0_0_8px_#bdf559] scale-125'
                        : 'bg-[#bdf559] shadow-[0_0_4px_#bdf559]'
                      : 'bg-black'
                  }`}
                />

                <MiniSparkline type={item.sparkType} isDark={isDark} isHovered={isHovered} />

                <span className={isDark ? (isHovered ? 'text-[#bdf559] font-black' : 'text-gray-100') : 'text-black'}>
                  {item.label}
                </span>

                <span
                  className={`text-[9px] px-2 py-0.5 border uppercase font-black transition-colors ${
                    isDark
                      ? isHovered
                        ? 'border-[#bdf559] bg-[#bdf559]/20 text-[#bdf559]'
                        : 'border-gray-800 bg-white/5 text-zinc-400'
                      : 'border-black bg-black text-[#bdf559]'
                  }`}
                >
                  {item.tag}
                </span>

                <span className="text-gray-600 font-normal">///</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default TelemetryMarquee;
