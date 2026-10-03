import React, { useRef, useState, useEffect } from 'react';
import { playMioDevSound, MioDevSoundType } from '@/lib/sound';
import { cn } from '@/lib/utils';

interface MioMagneticButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  magneticStrength?: number; // 0 to 1, default 0.28
  soundType?: MioDevSoundType;
  className?: string;
  asChild?: boolean;
}

/**
 * MioMagneticButton:
 * High-performance magnetic button wrapper inspired by Emil Kowalski and Lusion.
 * Physically attracts toward the cursor on proximity, springs back with elastic damping,
 * and executes mechanical sinking (translate(2px, 2px)) on click according to BRANDING.md.
 */
export const MioMagneticButton: React.FC<MioMagneticButtonProps> = ({
  children,
  magneticStrength = 0.26,
  soundType = 'select',
  className = '',
  onClick,
  onMouseEnter,
  onMouseLeave,
  disabled,
  ...props
}) => {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);
  const isFinePointer = useRef(true);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      isFinePointer.current = window.matchMedia('(pointer: fine)').matches;
    }
  }, []);

  const handlePointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!isFinePointer.current || disabled) return;
    const btn = buttonRef.current;
    if (!btn) return;

    const rect = btn.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const deltaX = (e.clientX - centerX) * magneticStrength;
    const deltaY = (e.clientY - centerY) * magneticStrength;

    // Constrain maximum displacement to maintain layout stability
    const maxShift = 14;
    const clampedX = Math.max(-maxShift, Math.min(maxShift, deltaX));
    const clampedY = Math.max(-maxShift, Math.min(maxShift, deltaY));

    setOffset({ x: clampedX, y: clampedY });
  };

  const handlePointerEnter = (e: React.PointerEvent<HTMLButtonElement>) => {
    setIsHovered(true);
    if (onMouseEnter) onMouseEnter(e);
  };

  const handlePointerLeave = (e: React.PointerEvent<HTMLButtonElement>) => {
    setIsHovered(false);
    setOffset({ x: 0, y: 0 });
    if (onMouseLeave) onMouseLeave(e);
  };

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (soundType) {
      playMioDevSound(soundType);
    }
    if (onClick) onClick(e);
  };

  return (
    <button
      ref={buttonRef}
      disabled={disabled}
      data-target-lock="true"
      onPointerMove={handlePointerMove}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
      onClick={handleClick}
      style={{
        transform: isHovered
          ? `translate3d(${offset.x}px, ${offset.y}px, 0)`
          : 'translate3d(0px, 0px, 0)',
        transition: isHovered
          ? 'transform 100ms cubic-bezier(0.2, 0.8, 0.2, 1)'
          : 'transform 360ms cubic-bezier(0.34, 1.56, 0.64, 1)',
      }}
      className={cn(
        'btn-mechanical select-none inline-flex items-center justify-center relative will-change-transform cursor-pointer',
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
};

export default MioMagneticButton;
