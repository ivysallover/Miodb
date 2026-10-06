import React, { useEffect, useRef, useState } from 'react';

export interface FlipTextProps {
  children: React.ReactNode;
  as?: React.ElementType;
  className?: string;
  /** Seconds to wait after entering the viewport. */
  delayOffset?: number;
  delay?: number;
  // Kept so older call sites keep compiling; they no longer do anything.
  characters?: string;
  speed?: number;
  autoPlay?: boolean;
  frontFaceClassName?: string;
  secondFaceClassName?: string;
  gradient?: boolean | 'violet-to-lime';
}

/**
 * Headline reveal. The text rises into place once, when it enters the viewport.
 * (The name is historical: this used to scramble glyphs, which read as noise on long headlines.)
 */
export const FlipText: React.FC<FlipTextProps> = ({
  children,
  as: Component = 'span',
  className = '',
  delayOffset = 0,
  delay = 0,
}) => {
  const ref = useRef<HTMLElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setShown(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setShown(true);
          io.disconnect();
        }
      },
      { rootMargin: '0px 0px -8% 0px' }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <Component
      ref={ref}
      className={className}
      style={{
        display: 'inline-block',
        opacity: shown ? 1 : 0,
        transform: shown ? 'none' : 'translateY(0.35em)',
        transition: `opacity 700ms cubic-bezier(0.23,1,0.32,1) ${(delayOffset || delay) * 1000}ms, transform 700ms cubic-bezier(0.23,1,0.32,1) ${(delayOffset || delay) * 1000}ms`,
      }}
    >
      {children}
    </Component>
  );
};

export default FlipText;
