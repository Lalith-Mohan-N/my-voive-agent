'use client';

import { Card, CardContent } from '@/components/ui/Card';
import { NOISE_CONFIG } from '@/lib/constants';
import type { NoiseLevel } from '@/types';

interface NoiseLevelIndicatorProps {
  level: NoiseLevel;
}

const NOISE_COLORS: Record<NoiseLevel, { bg: string; border: string; text: string }> = {
  low: { bg: 'bg-[#00ff88]/10', border: 'border-[#00ff88]/20', text: 'text-[#00ff88]' },
  normal: { bg: 'bg-white/[0.03]', border: 'border-white/[0.06]', text: 'text-white/60' },
  high: { bg: 'bg-[#ff9f1c]/10', border: 'border-[#ff9f1c]/20', text: 'text-[#ff9f1c]' },
  extreme: { bg: 'bg-[#ff3b5c]/10', border: 'border-[#ff3b5c]/20', text: 'text-[#ff3b5c]' },
};

export function NoiseLevelIndicator({ level }: NoiseLevelIndicatorProps) {
  const config = NOISE_CONFIG[level];
  const colors = NOISE_COLORS[level];

  return (
    <Card variant="elevated" id="noise-level-indicator">
      <CardContent className="pt-5">
        <h2 className="text-sm font-bold text-white mb-3">Environment</h2>
        <div className={`flex items-center gap-3 rounded-xl border p-3 ${colors.bg} ${colors.border}`}>
          <span className="text-2xl">{config.icon}</span>
          <div>
            <div className={`text-sm font-bold ${colors.text}`}>{config.label}</div>
            <div className="text-[10px] text-white/40">{config.description}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
