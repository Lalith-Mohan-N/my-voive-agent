'use client';

import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  variant?: 'default' | 'elevated' | 'urgency';
  urgencyColor?: string;
  id?: string;
}

export function Card({ children, className, variant = 'default', urgencyColor, id }: CardProps) {
  return (
    <div
      id={id}
      className={cn(
        'rounded-2xl border backdrop-blur-md transition-all duration-300',
        variant === 'default' && 'border-white/[0.06] bg-white/[0.03]',
        variant === 'elevated' && 'border-white/[0.08] bg-white/[0.05] shadow-lg shadow-black/20',
        variant === 'urgency' && 'border-2 bg-white/[0.03]',
        className
      )}
      style={variant === 'urgency' && urgencyColor ? { borderColor: urgencyColor } : undefined}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('px-5 pt-5 pb-3', className)}>
      {children}
    </div>
  );
}

export function CardContent({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('px-5 pb-5', className)}>
      {children}
    </div>
  );
}
