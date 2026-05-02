'use client';

import { cn } from '@/lib/utils';

interface SkeletonProps {
  className?: string;
  lines?: number;
}

export function Skeleton({ className, lines = 1 }: SkeletonProps) {
  if (lines > 1) {
    return (
      <div className="space-y-2">
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className={cn(
              'h-4 rounded-lg bg-white/[0.06] animate-shimmer',
              i === lines - 1 && 'w-3/4',
              className
            )}
          />
        ))}
      </div>
    );
  }

  return (
    <div className={cn('h-4 rounded-lg bg-white/[0.06] animate-shimmer', className)} />
  );
}
