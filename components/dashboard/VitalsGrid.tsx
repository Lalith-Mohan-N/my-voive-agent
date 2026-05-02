'use client';

import { Card, CardContent } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { VITAL_RANGES } from '@/lib/constants';
import { getVitalStatus } from '@/lib/utils';
import type { VitalReading } from '@/types';
import { Heart, Activity, Wind, Thermometer, Waves, Brain } from 'lucide-react';

interface VitalsGridProps {
  vitals: VitalReading | null;
  loading?: boolean;
}

const ICON_MAP: Record<string, React.ElementType> = {
  Heart, Activity, Wind, Thermometer, Waves, Brain,
};

const STATUS_COLORS = {
  normal: { text: 'text-[#00ff88]', bg: 'bg-[#00ff88]/10', border: 'border-[#00ff88]/20' },
  warning: { text: 'text-[#ff9f1c]', bg: 'bg-[#ff9f1c]/10', border: 'border-[#ff9f1c]/20' },
  critical: { text: 'text-[#ff3b5c]', bg: 'bg-[#ff3b5c]/10', border: 'border-[#ff3b5c]/20' },
};

interface VitalCardProps {
  label: string;
  value: number | null;
  unit: string;
  icon: string;
  min: number;
  max: number;
}

function VitalCard({ label, value, unit, icon, min, max }: VitalCardProps) {
  const status = getVitalStatus(value, min, max);
  const colors = STATUS_COLORS[status];
  const IconComponent = ICON_MAP[icon] || Heart;

  return (
    <div className={`rounded-xl border p-3 ${colors.border} ${colors.bg} transition-all duration-300`}>
      <div className="flex items-center gap-2 mb-2">
        <IconComponent className={`h-3.5 w-3.5 ${colors.text}`} />
        <span className="text-[10px] text-white/40 uppercase tracking-wider font-medium">{label}</span>
      </div>
      <div className="flex items-baseline gap-1">
        <span className={`text-2xl font-bold font-mono tabular-nums ${colors.text}`}>
          {value !== null ? value : '--'}
        </span>
        <span className="text-[10px] text-white/30">{unit}</span>
      </div>
      <div className="text-[9px] text-white/20 mt-1">
        Normal: {min}–{max}
      </div>
    </div>
  );
}

export function VitalsGrid({ vitals, loading = false }: VitalsGridProps) {
  if (loading) {
    return (
      <Card variant="elevated" id="vitals-grid">
        <CardContent className="pt-5">
          <h2 className="text-sm font-bold text-white mb-4">Vital Signs</h2>
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-xl border border-white/[0.06] p-3">
                <Skeleton className="h-3 w-16 mb-2" />
                <Skeleton className="h-7 w-12" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card variant="elevated" id="vitals-grid">
      <CardContent className="pt-5">
        <h2 className="text-sm font-bold text-white mb-4">Vital Signs</h2>
        <div className="grid grid-cols-2 gap-3">
          <VitalCard
            label={VITAL_RANGES.heartRate.label}
            value={vitals?.heartRate ?? null}
            unit={VITAL_RANGES.heartRate.unit}
            icon={VITAL_RANGES.heartRate.icon}
            min={VITAL_RANGES.heartRate.min}
            max={VITAL_RANGES.heartRate.max}
          />
          <VitalCard
            label={VITAL_RANGES.spo2.label}
            value={vitals?.spo2 ?? null}
            unit={VITAL_RANGES.spo2.unit}
            icon={VITAL_RANGES.spo2.icon}
            min={VITAL_RANGES.spo2.min}
            max={VITAL_RANGES.spo2.max}
          />
          <VitalCard
            label={VITAL_RANGES.bloodPressureSystolic.label}
            value={vitals?.bloodPressureSystolic ?? null}
            unit={VITAL_RANGES.bloodPressureSystolic.unit}
            icon={VITAL_RANGES.bloodPressureSystolic.icon}
            min={VITAL_RANGES.bloodPressureSystolic.min}
            max={VITAL_RANGES.bloodPressureSystolic.max}
          />
          <VitalCard
            label={VITAL_RANGES.temperature.label}
            value={vitals?.temperature ?? null}
            unit={VITAL_RANGES.temperature.unit}
            icon={VITAL_RANGES.temperature.icon}
            min={VITAL_RANGES.temperature.min}
            max={VITAL_RANGES.temperature.max}
          />
          <VitalCard
            label={VITAL_RANGES.respiratoryRate.label}
            value={vitals?.respiratoryRate ?? null}
            unit={VITAL_RANGES.respiratoryRate.unit}
            icon={VITAL_RANGES.respiratoryRate.icon}
            min={VITAL_RANGES.respiratoryRate.min}
            max={VITAL_RANGES.respiratoryRate.max}
          />
          <VitalCard
            label={VITAL_RANGES.gcsScore.label}
            value={vitals?.gcsScore ?? null}
            unit={VITAL_RANGES.gcsScore.unit}
            icon={VITAL_RANGES.gcsScore.icon}
            min={VITAL_RANGES.gcsScore.min}
            max={VITAL_RANGES.gcsScore.max}
          />
        </div>
      </CardContent>
    </Card>
  );
}
