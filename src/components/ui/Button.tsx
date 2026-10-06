import React from 'react';
import { cn } from '@/lib/utils';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'violet' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const baseStyles =
      'inline-flex items-center justify-center font-sans select-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mio-lime focus-visible:ring-offset-2 focus-visible:ring-offset-[#06050a] transition-all duration-200 active:scale-[0.98]';

    const variants = {
      primary:
        'bg-mio-lime hover:bg-mio-lime-hover text-[#05040a] font-black rounded-mio-sm shadow-[0_0_24px_rgba(189,245,89,0.35)] hover:shadow-[0_0_35px_rgba(189,245,89,0.5)] border border-mio-lime/80',
      secondary:
        'bg-white/[0.05] hover:bg-white/[0.1] text-white font-bold rounded-mio-sm border border-white/[0.12] backdrop-blur-xl hover:border-white/[0.25] shadow-[0_4px_20px_rgba(0,0,0,0.3)]',
      violet:
        'bg-mio-violet hover:bg-mio-violet-light text-white font-bold rounded-mio-sm shadow-[0_0_24px_rgba(118,71,235,0.4)] border border-mio-violet-light/50',
      outline:
        'border border-white/20 text-white bg-transparent font-bold hover:bg-white/[0.06] rounded-mio-sm',
      ghost:
        'text-gray-300 hover:text-white hover:bg-white/[0.06] font-semibold rounded-mio-sm',
    };

    const sizes = {
      sm: 'text-xs px-3.5 py-1.5 min-h-[36px] gap-1.5',
      md: 'text-sm px-5 py-2.5 min-h-[44px] gap-2 font-bold',
      lg: 'text-base px-7 py-3.5 min-h-[50px] gap-2.5 font-black',
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        {...props}
      >
        {isLoading && (
          <svg
            className="animate-spin -ml-1 mr-2 h-4 w-4 text-current"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
