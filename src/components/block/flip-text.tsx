"use client";

import React, { ElementType, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

const DEFAULT_GLYPHS = '0123456789ABCDEF!@#$%^&*<>~_+/\\=[]{}?';

// Helper to recursively extract text from string or React elements
const extractTextFromChildren = (children: React.ReactNode): string => {
  if (children == null) return '';
  if (typeof children === 'string') return children;
  if (typeof children === 'number') return String(children);
  if (Array.isArray(children)) return children.map(extractTextFromChildren).join('');
  if (React.isValidElement(children)) {
    const props = (children as React.ReactElement).props as { children?: React.ReactNode };
    if (props && props.children != null) {
      return extractTextFromChildren(props.children);
    }
  }
  return '';
};

export interface FlipTextProps {
  /**
   * Content to animate (string or nested inline elements)
   */
  children: React.ReactNode;
  /**
   * HTML tag to render as
   * @default "span"
   */
  as?: ElementType;
  /**
   * Wrapper class
   */
  className?: string;
  /**
   * Characters pool for scrambling
   */
  characters?: string;
  /**
   * Interval speed in milliseconds between scramble frames (high-frequency)
   * @default 16
   */
  speed?: number;
  /**
   * Optional initial delay offset in seconds before entrance scramble starts
   * @default 0
   */
  delayOffset?: number;
  /**
   * Alias for delayOffset in seconds
   * @default 0
   */
  delay?: number;
  /**
   * Whether to animate on load when entering the viewport
   * @default true
   */
  autoPlay?: boolean;
  /**
   * Stagger delay duration (kept for backwards compatibility)
   */
  staggerDuration?: number;
  /**
   * Rotate direction (kept for backwards compatibility)
   */
  rotateDirection?: 'top' | 'bottom' | 'right' | 'left';
  /**
   * Front face class (kept for backwards compatibility)
   */
  frontFaceClassName?: string;
  /**
   * Second face class (kept for backwards compatibility)
   */
  secondFaceClassName?: string;
  /**
   * Gradient preset (kept for backwards compatibility)
   */
  gradient?: boolean | 'violet-to-lime';
}

/**
 * FlipText / ScrambleText (Hacker Decryption / Cypher Scramble Text):
 * Fast, electric cybernetic decoding text effect.
 * Immediately bursts into cypher glyphs and rapidly resolves character-by-character.
 * Guaranteed zero-freeze execution on initial load and scroll.
 */
export const FlipText: React.FC<FlipTextProps> = ({
  children,
  as: Component = 'span',
  className,
  characters = DEFAULT_GLYPHS,
  speed = 16,
  delayOffset = 0,
  delay = 0,
  autoPlay = true,
  ...props
}) => {
  const containerRef = useRef<HTMLElement>(null);
  const isStartedRef = useRef<boolean>(false);
  const intervalRef = useRef<any>(null);

  const targetText = useMemo(() => {
    return extractTextFromChildren(children);
  }, [children]);

  const [displayText, setDisplayText] = useState<string>(targetText);

  // Keep latest values in refs to avoid closure stale state
  const targetTextRef = useRef(targetText);
  targetTextRef.current = targetText;
  const speedRef = useRef(speed);
  speedRef.current = speed;
  const charactersRef = useRef(characters);
  charactersRef.current = characters;

  const startScramble = useCallback(() => {
    const text = targetTextRef.current;
    if (!text) return;
    if (intervalRef.current) clearInterval(intervalRef.current);
    isStartedRef.current = true;

    const chars = text.split('');
    const totalLength = chars.length;
    let iteration = 0;
    // Calibrated for electric snappy speed: ~0.3s - 0.4s
    const maxIterations = Math.max(Math.round(totalLength * 0.8), 16);
    const pool = charactersRef.current;

    // Immediately display frame 0 scrambled characters!
    const frame0 = chars
      .map((char) => {
        if (char === ' ' || char === '\n' || char === '\t') return char;
        return pool[Math.floor(Math.random() * pool.length)];
      })
      .join('');
    setDisplayText(frame0);

    intervalRef.current = setInterval(() => {
      iteration++;
      const revealedLength = Math.floor((iteration / maxIterations) * totalLength);

      const nextText = chars
        .map((char, index) => {
          if (char === ' ' || char === '\n' || char === '\t') return char;
          if (index < revealedLength) return char;
          return pool[Math.floor(Math.random() * pool.length)];
        })
        .join('');

      setDisplayText(nextText);

      if (iteration >= maxIterations) {
        if (intervalRef.current) clearInterval(intervalRef.current);
        intervalRef.current = null;
        setDisplayText(text);
      }
    }, speedRef.current);
  }, []);

  const effectiveDelay = delayOffset || delay || 0;

  useEffect(() => {
    if (!autoPlay) return;

    const el = containerRef.current;
    if (!el) return;

    let timer: any = null;

    const scheduleStart = () => {
      const delayMs = Math.round(effectiveDelay * 1000);
      if (delayMs <= 0) {
        startScramble();
      } else {
        timer = setTimeout(() => {
          startScramble();
        }, delayMs);
      }
    };

    // 1. Direct viewport check on mount (Never misses hero elements)
    const rect = el.getBoundingClientRect();
    const isVisibleNow =
      rect.top < window.innerHeight + 120 && rect.bottom > -120;

    if (isVisibleNow) {
      scheduleStart();
      return () => {
        if (timer) clearTimeout(timer);
        if (intervalRef.current) clearInterval(intervalRef.current);
        isStartedRef.current = false;
      };
    }

    // 2. IntersectionObserver for lower sections
    if (typeof IntersectionObserver !== 'undefined') {
      const observer = new IntersectionObserver(
        (entries) => {
          if (entries[0]?.isIntersecting) {
            observer.disconnect();
            scheduleStart();
          }
        },
        { rootMargin: '160px 0px 160px 0px', threshold: 0.01 }
      );

      observer.observe(el);
      return () => {
        observer.disconnect();
        if (timer) clearTimeout(timer);
        if (intervalRef.current) clearInterval(intervalRef.current);
        isStartedRef.current = false;
      };
    } else {
      scheduleStart();
    }

    return () => {
      if (timer) clearTimeout(timer);
      if (intervalRef.current) clearInterval(intervalRef.current);
      isStartedRef.current = false;
    };
  }, [autoPlay, effectiveDelay, startScramble]);

  return (
    <Component
      ref={containerRef}
      className={cn('inline select-none', className)}
      {...props}
    >
      <span className="sr-only">{targetText}</span>
      <span aria-hidden="true">{displayText}</span>
    </Component>
  );
};

export default FlipText;
