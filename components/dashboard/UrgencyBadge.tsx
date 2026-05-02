'use client';

import { Badge } from '@/components/ui/Badge';
import { URGENCY_CONFIG } from '@/lib/constants';
import type { UrgencyLevel } from '@/types';

interface UrgencyBadgeProps {
  urgency: UrgencyLevel;
}

export function UrgencyBadge({ urgency }: UrgencyBadgeProps) {
  const config = URGENCY_CONFIG[urgency];

  return (
    <div
      id="urgency-display"
      className="rounded-2xl border p-5 text-center transition-all duration-500"
      style={{
        borderColor: config.borderColor,
        backgroundColor: config.bgColor,
        boxShadow: `0 0 40px ${config.pulseColor}`,
      }}
    >
      <div className="mb-3">
        <Badge urgency={urgency} size="lg" pulse />
      </div>
      <p className="text-xs text-white/50 leading-relaxed">{config.description}</p>
    </div>
  );
}
