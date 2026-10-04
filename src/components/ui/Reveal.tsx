import React, { useEffect, useRef } from 'react';
import { gsap } from '@/lib/gsap';

interface RevealProps {
  children: React.ReactNode;
  className?: string;
  /** seconds */
  delay?: number;
  /** direction the panel opens from */
  from?: 'top' | 'left';
}

/**
 * MIO's reveal grammar: a hard rectangular wipe (clip-path), never a soft fade.
 * It plays once when the block enters the viewport, then clears itself so shadows,
 * hover states and layout are untouched. Skipped for prefers-reduced-motion.
 */
export const Reveal: React.FC<RevealProps> = ({ children, className = '', delay = 0, from = 'top' }) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    // The "open" inset is negative so hard offset shadows are not clipped mid-animation.
    const closed = from === 'left' ? 'inset(-16px 100% -16px -16px)' : 'inset(-16px -16px 100% -16px)';
    const open = 'inset(-16px -16px -16px -16px)';

    const tween = gsap.fromTo(
      el,
      { clipPath: closed },
      {
        clipPath: open,
        duration: 0.85,
        delay,
        ease: 'expo.out',
        immediateRender: false,
        clearProps: 'clipPath',
        scrollTrigger: { trigger: el, start: 'top bottom-=60px', once: true },
      }
    );
    return () => {
      tween.scrollTrigger?.kill();
      tween.kill();
    };
  }, [delay, from]);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
};

export default Reveal;
