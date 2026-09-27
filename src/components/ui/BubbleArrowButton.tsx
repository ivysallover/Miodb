import React from 'react';
import { cn } from '@/lib/utils';

export interface BubbleArrowButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: 'primary' | 'dark' | 'light' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  asLink?: boolean;
  href?: string;
  className?: string;
  onClick?: () => void;
}

export const BubbleArrowButton: React.FC<BubbleArrowButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  asLink = false,
  href,
  className,
  onClick,
  disabled,
  ...props
}) => {
  // Color configuration inspired by Legency Media & Apple design
  const variantStyles = {
    primary: {
      btn: 'text-zinc-950',
      content: 'bg-[#bdf559] text-zinc-950 group-hover:bg-[#cbff6e]',
      arrow: 'bg-zinc-950 text-[#bdf559]',
    },
    dark: {
      btn: 'text-white',
      content: 'bg-zinc-900 text-white border border-white/10 group-hover:bg-zinc-800',
      arrow: 'bg-white text-zinc-950',
    },
    light: {
      btn: 'text-zinc-950',
      content: 'bg-zinc-100 text-zinc-900 border border-zinc-200 group-hover:bg-zinc-200/80',
      arrow: 'bg-zinc-900 text-white',
    },
    outline: {
      btn: 'text-current',
      content: 'bg-transparent border border-current/20 text-current group-hover:bg-current/[0.06]',
      arrow: 'bg-current text-white',
    },
  };

  const sizeStyles = {
    sm: {
      height: 'h-10',
      fontSize: 'text-xs',
      px: 'px-4',
      arrowSize: 'w-10 h-10',
      shift: 'group-hover:translate-x-0 -translate-x-10',
    },
    md: {
      height: 'h-12',
      fontSize: 'text-sm',
      px: 'px-6',
      arrowSize: 'w-12 h-12',
      shift: 'group-hover:translate-x-0 -translate-x-12',
    },
    lg: {
      height: 'h-14',
      fontSize: 'text-base',
      px: 'px-7',
      arrowSize: 'w-14 h-14',
      shift: 'group-hover:translate-x-0 -translate-x-14',
    },
  };

  const v = variantStyles[variant];
  const s = sizeStyles[size];

  const arrowSvg = (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="w-4 h-4 transition-transform duration-500 ease-out group-hover:rotate-45"
    >
      <polyline points="7 17 17 7" />
      <polyline points="7 7 17 7 17 17" />
    </svg>
  );

  const inner = (
    <span
      className={cn(
        'group relative inline-flex items-center overflow-hidden rounded-full font-medium transition-transform duration-300 active:scale-[0.98] select-none cursor-pointer',
        s.height,
        v.btn,
        disabled && 'opacity-50 pointer-events-none',
        className
      )}
    >
      {/* Expanding Leading Arrow Bubble */}
      <span
        className={cn(
          'flex items-center justify-center rounded-full shrink-0 transition-all duration-500 ease-[cubic-bezier(0.625,0.05,0,1)] scale-0 group-hover:scale-100 z-10',
          s.arrowSize,
          v.arrow
        )}
        aria-hidden="true"
      >
        {arrowSvg}
      </span>

      {/* Button Content Capsule with Smooth Horizontal Shift */}
      <span
        className={cn(
          'flex items-center justify-center rounded-full h-full font-medium tracking-tight whitespace-nowrap transition-transform duration-500 ease-[cubic-bezier(0.625,0.05,0,1)]',
          s.px,
          s.fontSize,
          s.shift,
          v.content
        )}
      >
        <span>{children}</span>
      </span>

      {/* Trailing Arrow Bubble that shrinks/recedes on hover */}
      <span
        className={cn(
          'absolute right-0 flex items-center justify-center rounded-full shrink-0 transition-all duration-500 ease-[cubic-bezier(0.625,0.05,0,1)] scale-100 group-hover:scale-0 z-0',
          s.arrowSize,
          v.arrow
        )}
        aria-hidden="true"
      >
        {arrowSvg}
      </span>
    </span>
  );

  if (asLink && href) {
    return (
      <a href={href} className="inline-block no-underline">
        {inner}
      </a>
    );
  }

  return (
    <button type="button" onClick={onClick} disabled={disabled} {...props} className="bg-transparent border-0 p-0 m-0">
      {inner}
    </button>
  );
};

export default BubbleArrowButton;
