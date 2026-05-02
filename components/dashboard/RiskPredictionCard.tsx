'use client';

import { Card, CardContent } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import type { RiskPrediction } from '@/types';
import { AlertTriangle, Brain } from 'lucide-react';

interface RiskPredictionCardProps {
  prediction: RiskPrediction | null;
  loading?: boolean;
}

function ConfidenceBar({ confidence }: { confidence: number }) {
  const pct = Math.round(confidence * 100);
  let color = 'bg-[#00ff88]';
  if (confidence < 0.5) color = 'bg-[#ff9f1c]';
  if (confidence < 0.3) color = 'bg-[#ff3b5c]';

  return (
    <div className="mt-2">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] text-white/30 uppercase tracking-wider">Confidence</span>
        <span className="text-[10px] font-mono text-white/50">{pct}%</span>
      </div>
      <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
        <div
          className={`h-full rounded-full ${color} transition-all duration-500`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export function RiskPredictionCard({ prediction, loading = false }: RiskPredictionCardProps) {
  if (loading) {
    return (
      <Card variant="elevated" id="risk-prediction">
        <CardContent className="pt-5">
          <h2 className="text-sm font-bold text-white mb-3">Risk Assessment</h2>
          <Skeleton lines={3} />
        </CardContent>
      </Card>
    );
  }

  if (!prediction) {
    return (
      <Card variant="elevated" id="risk-prediction">
        <CardContent className="pt-5">
          <h2 className="text-sm font-bold text-white mb-3">Risk Assessment</h2>
          <div className="text-center py-4">
            <Brain className="h-6 w-6 mx-auto text-white/20 mb-2" />
            <p className="text-xs text-white/30">No risk predictions yet</p>
            <p className="text-[10px] text-white/20 mt-1">Agent will assess as vitals are logged</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card variant="elevated" id="risk-prediction">
      <CardContent className="pt-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-white">Risk Assessment</h2>
          <AlertTriangle className="h-4 w-4 text-[#ff9f1c]" />
        </div>

        <div className="rounded-xl border border-[#ff9f1c]/20 bg-[#ff9f1c]/5 p-3">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#ff9f1c]">
              {prediction.riskType}
            </span>
          </div>
          <p className="text-xs text-white/70 leading-relaxed">{prediction.details}</p>
          <ConfidenceBar confidence={prediction.confidence} />
          {prediction.recommendedAction && (
            <div className="mt-2 pt-2 border-t border-white/[0.06]">
              <span className="text-[10px] text-white/30 uppercase tracking-wider">Recommended Action</span>
              <p className="text-xs text-white/60 mt-0.5">{prediction.recommendedAction}</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
