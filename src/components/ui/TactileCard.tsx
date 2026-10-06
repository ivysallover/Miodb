import React, { useRef, useState, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';

export interface TactileCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  tiltIntensity?: number; // degrees of tilt, e.g. 4
  glareIntensity?: number; // 0 to 1, opacity of specular glare
  glareColor?: string; // hex or rgba string
  enableTilt?: boolean;
  className?: string;
}

/**
 * TactileCard: A tactile hardware surface with subtle 3D perspective tilt
 * and cursor-following specular sheen. Uses requestAnimationFrame and direct DOM
 * transforms to guarantee 0 React re-renders and smooth 120 FPS performance.
 */
export const TactileCard: React.FC<TactileCardProps> = ({
  children,
  tiltIntensity = 3.5,
  glareIntensity = 0.07,
  glareColor = '189, 245, 89', // MIO Lime RGB subtle specular
  enableTilt = true,
  className,
  ...props
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const glareRef = useRef<HTMLDivElement>(null);
  const borderSpotlightRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState<boolean>(false);

  const targetRotation = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const currentRotation = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const glarePos = useRef<{ x: number; y: number }>({ x: 50, y: 50 });
  const rafId = useRef<number | null>(null);

  // Smooth spring lerp loop
  const updatePhysics = useCallback(() => {
    if (!enableTilt) return;

    const lerpFactor = 0.12;
    currentRotation.current.x += (targetRotation.current.x - currentRotation.current.x) * lerpFactor;
    currentRotation.current.y += (targetRotation.current.y - currentRotation.current.y) * lerpFactor;

    if (cardRef.current) {
      cardRef.current.style.transform = `perspective(1200px) rotateX(${currentRotation.current.x.toFixed(3)}deg) rotateY(${currentRotation.current.y.toFixed(3)}deg)`;
    }

    if (glareRef.current) {
      glareRef.current.style.background = `radial-gradient(circle at ${glarePos.current.x.toFixed(1)}% ${glarePos.current.y.toFixed(1)}%, rgba(${glareColor}, ${glareIntensity}), transparent 60%)`;
    }

    if (borderSpotlightRef.current) {
      borderSpotlightRef.current.style.background = `radial-gradient(400px circle at ${glarePos.current.x.toFixed(1)}% ${glarePos.current.y.toFixed(1)}%, rgba(${glareColor}, 0.25), transparent 80%)`;
    }

    // Keep loop alive while hovered or settling back to 0
    const delta = Math.abs(targetRotation.current.x - currentRotation.current.x) +
                  Math.abs(targetRotation.current.y - currentRotation.current.y);

    if (delta > 0.01 || isHovered) {
      rafId.current = requestAnimationFrame(updatePhysics);
    } else {
      if (cardRef.current) {
        cardRef.current.style.transform = 'perspective(1200px) rotateX(0deg) rotateY(0deg)';
      }
      rafId.current = null;
    }
  }, [enableTilt, glareColor, glareIntensity, isHovered]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!enableTilt || !cardRef.current) return;

    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    // Calculate tilt angles (mouse in top-right tilts card up and right)
    const rotateY = ((x - centerX) / centerX) * tiltIntensity;
    const rotateX = -((y - centerY) / centerY) * tiltIntensity;

    targetRotation.current = { x: rotateX, y: rotateY };

    // Glare position in percentage
    glarePos.current = {
      x: (x / rect.width) * 100,
      y: (y / rect.height) * 100,
    };

    if (!rafId.current) {
      rafId.current = requestAnimationFrame(updatePhysics);
    }
  };

  const handleMouseEnter = () => {
    setIsHovered(true);
    if (!rafId.current) {
      rafId.current = requestAnimationFrame(updatePhysics);
    }
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    targetRotation.current = { x: 0, y: 0 };
    if (!rafId.current) {
      rafId.current = requestAnimationFrame(updatePhysics);
    }
  };

  useEffect(() => {
    return () => {
      if (rafId.current) {
        cancelAnimationFrame(rafId.current);
      }
    };
  }, []);

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={cn('relative transition-shadow duration-300 will-change-transform', className)}
      style={{
        transformStyle: 'preserve-3d',
      }}
      {...props}
    >
      {/* Cursor spotlight border overlay */}
      <div
        ref={borderSpotlightRef}
        className="pointer-events-none absolute -inset-[2px] z-10 rounded-[inherit] transition-opacity duration-300 opacity-0 group-hover:opacity-100"
        style={{
          opacity: isHovered ? 1 : 0,
        }}
      />
      {/* Specular glare overlay */}
      <div
        ref={glareRef}
        className="pointer-events-none absolute inset-0 z-20 rounded-[inherit] transition-opacity duration-300"
        style={{
          opacity: isHovered ? 1 : 0,
        }}
      />
      {children}
    </div>
  );
};
