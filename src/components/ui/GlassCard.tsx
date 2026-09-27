import React from 'react';
import { cn } from '@/lib/utils';

export interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'subtle' | 'interactive' | 'hardware';
  glow?: 'none' | 'lime' | 'violet';
  cornerMarkers?: boolean;
}

export const GlassCard = React.forwardRef<HTMLDivElement, GlassCardProps>(
  (
    {
      className,
      variant = 'default',
      cornerMarkers = false,
      children,
      ...props
    },
    ref
  ) => {
    const variants = {
      default: 'bg-white border-2 border-[#111] shadow-neo-lg p-6 sm:p-8 relative',
      subtle: 'bg-white border-2 border-[#111] shadow-neo-sm p-4 sm:p-6 relative',
      interactive:
        'bg-white border-2 border-[#111] shadow-neo-md hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-neo-sm active:translate-x-1 active:translate-y-1 transition-all duration-150 p-6 sm:p-8 cursor-pointer relative',
      hardware:
        'bg-[#0b0914] border-2 border-[#111] shadow-neo-lg text-white p-6 sm:p-8 relative',
    };

    return (
      <div
        ref={ref}
        className={cn(variants[variant], className)}
        {...props}
      >
        {cornerMarkers && (
          <>
            <span className="absolute top-2 left-2 w-1.5 h-1.5 bg-[#111]" />
            <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-[#111]" />
            <span className="absolute bottom-2 left-2 w-1.5 h-1.5 bg-[#111]" />
            <span className="absolute bottom-2 right-2 w-1.5 h-1.5 bg-[#111]" />
          </>
        )}
        {children}
      </div>
    );
  }
);

GlassCard.displayName = 'GlassCard';
