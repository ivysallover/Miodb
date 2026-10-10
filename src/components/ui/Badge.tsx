import React from 'react';
import { cn } from '@/lib/utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'lime' | 'violet' | 'dark' | 'paper' | 'outline' | 'hardware';
  pulse?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({
  className,
  variant = 'lime',
  pulse = false,
  children,
  ...props
}) => {
  const variants = {
    lime: 'bg-[#bdf559]/15 text-[#bdf559] border border-[#bdf559]/40 font-semibold rounded-full',
    violet: 'bg-[#7647eb]/20 text-[#d8b4fe] border border-[#7647eb]/40 font-medium rounded-full',
    dark: 'bg-white/5 text-zinc-300 border border-white/10 font-medium rounded-full',
    paper: 'bg-white/10 text-white border border-white/15 font-medium rounded-full',
    outline: 'bg-transparent text-zinc-300 border border-white/20 font-medium rounded-full',
    hardware: 'bg-white/[0.06] text-zinc-400 border border-white/15 font-mono text-[10px] tracking-widest uppercase rounded',
  };

  const dots = {
    lime: 'bg-gray-950',
    violet: 'bg-white',
    dark: 'bg-mio-lime',
    paper: 'bg-mio-violet',
    outline: 'bg-gray-950',
    hardware: 'bg-mio-lime',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono uppercase tracking-wider',
        variants[variant],
        className
      )}
      {...props}
    >
      {pulse && (
        <span className="relative flex h-2 w-2">
          <span
            className={cn(
              'animate-ping absolute inline-flex h-full w-full rounded-full opacity-75',
              dots[variant]
            )}
          />
          <span
            className={cn('relative inline-flex rounded-full h-2 w-2', dots[variant])}
          />
        </span>
      )}
      {children}
    </span>
  );
};
