'use client';

import { cn } from '@/lib/utils';
import { URGENCY_CONFIG } from '@/lib/constants';
import type { UrgencyLevel } from '@/types';

interface BadgeProps {
  urgency: UrgencyLevel;
  size?: 'sm' | 'md' | 'lg';
  pulse?: boolean;
  className?: string;
}

export function Badge({ urgency, size = 'md', pulse, className }: BadgeProps) {
  const config = URGENCY_CONFIG[urgency];
  const shouldPulse = pulse ?? (urgency === 'CRITICAL' || urgency === 'URGENT');

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 font-mono font-bold tracking-wider rounded-full',
        size === 'sm' && 'px-2 py-0.5 text-[10px]',
        size === 'md' && 'px-3 py-1 text-xs',
        size === 'lg' && 'px-4 py-1.5 text-sm',
        shouldPulse && 'animate-urgency-pulse',
        className
      )}
      style={{
        color: config.color,
        backgroundColor: config.bgColor,
        borderWidth: '1px',
        borderColor: config.borderColor,
        '--pulse-color': config.pulseColor,
      } as React.CSSProperties}
    >
      {shouldPulse && (
        <span
          className="inline-block h-1.5 w-1.5 rounded-full animate-ping"
          style={{ backgroundColor: config.color }}
        />
      )}
      {config.label}
    </span>
  );
}
