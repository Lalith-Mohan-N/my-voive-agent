'use client';

import { cn } from '@/lib/utils';

interface StatusDotProps {
  status: 'active' | 'critical' | 'idle' | 'warning';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const STATUS_COLORS = {
  active: 'bg-[#00ff88]',
  critical: 'bg-[#ff3b5c]',
  warning: 'bg-[#ff9f1c]',
  idle: 'bg-white/30',
};

const PING_COLORS = {
  active: 'bg-[#00ff88]',
  critical: 'bg-[#ff3b5c]',
  warning: 'bg-[#ff9f1c]',
  idle: '',
};

export function StatusDot({ status, size = 'md', className }: StatusDotProps) {
  const shouldPing = status !== 'idle';

  return (
    <span className={cn('relative inline-flex', className)}>
      {shouldPing && (
        <span
          className={cn(
            'absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping',
            PING_COLORS[status]
          )}
        />
      )}
      <span
        className={cn(
          'relative inline-flex rounded-full',
          STATUS_COLORS[status],
          size === 'sm' && 'h-2 w-2',
          size === 'md' && 'h-2.5 w-2.5',
          size === 'lg' && 'h-3 w-3'
        )}
      />
    </span>
  );
}
