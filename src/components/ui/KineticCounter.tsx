import React, { useEffect, useRef, useState } from 'react';
import { gsap } from '@/lib/gsap';

export interface KineticCounterProps {
  value: number;
  duration?: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  useGrouping?: boolean; // format with thousands comma
  className?: string;
}

/**
 * KineticCounter: Smooth rolling number reveal on scroll entry
 */
export const KineticCounter: React.FC<KineticCounterProps> = ({
  value,
  duration = 1.6,
  decimals = 0,
  prefix = '',
  suffix = '',
  useGrouping = false,
  className = '',
}) => {
  const [displayValue, setDisplayValue] = useState<string>('0');
  const elementRef = useRef<HTMLSpanElement>(null);
  const animatedValue = useRef<{ val: number }>({ val: 0 });
  const hasAnimated = useRef<boolean>(false);

  useEffect(() => {
    const el = elementRef.current;
    if (!el) return;

    // If already animated into view, animate directly to new value on prop change
    if (hasAnimated.current) {
      gsap.to(animatedValue.current, {
        val: value,
        duration: Math.min(0.8, duration),
        ease: 'power2.out',
        onUpdate: () => {
          const current = animatedValue.current.val;
          let formatted = current.toFixed(decimals);
          if (useGrouping) {
            const parts = formatted.split('.');
            parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
            formatted = parts.join('.');
          }
          setDisplayValue(formatted);
        },
      });
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !hasAnimated.current) {
            hasAnimated.current = true;
            observer.disconnect();

            gsap.to(animatedValue.current, {
              val: value,
              duration,
              ease: 'power3.out',
              onUpdate: () => {
                const current = animatedValue.current.val;
                let formatted = current.toFixed(decimals);
                if (useGrouping) {
                  const parts = formatted.split('.');
                  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
                  formatted = parts.join('.');
                }
                setDisplayValue(formatted);
              },
            });
          }
        });
      },
      { threshold: 0.2 }
    );

    observer.observe(el);

    return () => {
      observer.disconnect();
    };
  }, [value, duration, decimals, useGrouping]);

  return (
    <span ref={elementRef} className={className}>
      {prefix}
      {displayValue}
      {suffix}
    </span>
  );
};
