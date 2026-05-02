'use client';

import { Card, CardContent } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { URGENCY_CONFIG } from '@/lib/constants';
import type { EmergencyCase } from '@/types';
import { MapPin, User, Clock, Radio } from 'lucide-react';

interface CaseInfoCardProps {
  activeCase: EmergencyCase | null;
  loading?: boolean;
}

export function CaseInfoCard({ activeCase, loading = false }: CaseInfoCardProps) {
  if (loading) {
    return (
      <Card variant="elevated" id="case-info">
        <CardContent className="pt-5">
          <h2 className="text-sm font-bold text-white mb-4">Case Details</h2>
          <Skeleton lines={4} />
        </CardContent>
      </Card>
    );
  }

  if (!activeCase) {
    return (
      <Card variant="elevated" id="case-info">
        <CardContent className="pt-5">
          <h2 className="text-sm font-bold text-white mb-4">Case Details</h2>
          <div className="text-center py-6">
            <div className="text-2xl mb-2 opacity-30">📋</div>
            <p className="text-xs text-white/30">No active case</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const urgencyColor = URGENCY_CONFIG[activeCase.urgencyLevel].color;

  const fields = [
    { icon: User, label: 'Patient', value: activeCase.patientName || 'Unknown' },
    { icon: MapPin, label: 'Location', value: activeCase.location || 'Not specified' },
    { icon: Radio, label: 'EMS Unit', value: activeCase.emsUnit || 'Unassigned' },
    { icon: Clock, label: 'Started', value: new Date(activeCase.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false }) },
  ];

  return (
    <Card variant="urgency" urgencyColor={urgencyColor} id="case-info">
      <CardContent className="pt-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold text-white">Case Details</h2>
          <span className="text-[10px] font-mono text-white/20">
            {activeCase.id.slice(0, 8)}
          </span>
        </div>

        {activeCase.chiefComplaint && (
          <div className="mb-4 p-3 rounded-lg bg-white/[0.03] border border-white/[0.06]">
            <span className="text-[10px] text-white/30 uppercase tracking-wider">Chief Complaint</span>
            <p className="text-sm text-white/80 mt-1">{activeCase.chiefComplaint}</p>
          </div>
        )}

        <div className="space-y-3">
          {fields.map(({ icon: Icon, label, value }) => (
            <div key={label} className="flex items-center gap-3">
              <Icon className="h-3.5 w-3.5 text-white/20 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <span className="text-[10px] text-white/30 uppercase tracking-wider">{label}</span>
                <p className="text-sm text-white/70 truncate">{value}</p>
              </div>
            </div>
          ))}
        </div>

        {activeCase.noiseAdaptiveMode && (
          <div className="mt-4 flex items-center gap-2 px-3 py-2 rounded-lg bg-[#ff9f1c]/10 border border-[#ff9f1c]/20">
            <span className="text-sm">📢</span>
            <span className="text-[10px] text-[#ff9f1c] font-semibold">Noise-Adaptive Clarity Mode Active</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
