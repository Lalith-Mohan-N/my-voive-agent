'use client';

import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { CallStatusPanel } from '@/components/dashboard/CallStatusPanel';
import { LiveTranscript } from '@/components/dashboard/LiveTranscript';
import { UrgencyBadge } from '@/components/dashboard/UrgencyBadge';
import { VitalsGrid } from '@/components/dashboard/VitalsGrid';
import { CaseInfoCard } from '@/components/dashboard/CaseInfoCard';
import { CallControls } from '@/components/dashboard/CallControls';
import { NoiseLevelIndicator } from '@/components/dashboard/NoiseLevelIndicator';
import { RiskPredictionCard } from '@/components/dashboard/RiskPredictionCard';
import { ClarificationPanel } from '@/components/dashboard/ClarificationPanel';
import { AudioPipelineVisualizer } from '@/components/dashboard/AudioPipelineVisualizer';
import { useRealtimeCase } from '@/hooks/useRealtimeCase';
import { useRealtimeTranscript } from '@/hooks/useRealtimeTranscript';
import { useCallStatus } from '@/hooks/useCallStatus';
import { useRiskPredictions } from '@/hooks/useRiskPredictions';
import { usePendingClarifications } from '@/hooks/usePendingClarifications';
import { useRetellCall } from '@/hooks/useRetellCall';

export default function DashboardPage() {
  const { activeCase, loading: caseLoading } = useRealtimeCase();
  const { entries, loading: transcriptLoading } = useRealtimeTranscript(activeCase?.id ?? null);
  const { callStatus, latestVitals } = useCallStatus(
    activeCase?.status ?? null,
    activeCase?.id ?? null
  );
  const { latestPrediction, loading: riskLoading } = useRiskPredictions(activeCase?.id ?? null);
  const { latestClarification, loading: clarificationLoading } = usePendingClarifications(
    activeCase?.id ?? null
  );

  // Real Retell Web SDK + audio pipeline hook
  const { state: retellState, startCall, endCall } = useRetellCall();

  // Derive effective call status: if Retell is registering/active, use that;
  // otherwise fall back to the Supabase-driven status from webhook lifecycle.
  const effectiveCallStatus =
    retellState.status === 'registering'
      ? 'registering'
      : retellState.status === 'active'
        ? 'active'
        : retellState.status === 'error'
          ? 'error'
          : callStatus;

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <DashboardHeader />

      <main className="dashboard-grid flex-1 overflow-hidden">
        {/* ─── Left Column: Status + Environment + Case + Controls + Clarifications ─── */}
        <div className="flex flex-col gap-4 overflow-y-auto custom-scrollbar">
          <CallStatusPanel
            status={effectiveCallStatus}
            startTime={activeCase?.createdAt}
          />
          <AudioPipelineVisualizer
            metrics={retellState.audioMetrics}
            isActive={effectiveCallStatus === 'active' || effectiveCallStatus === 'registering'}
          />
          <NoiseLevelIndicator level={activeCase?.noiseLevel ?? 'normal'} />
          <CaseInfoCard activeCase={activeCase} loading={caseLoading} />
          <ClarificationPanel
            clarification={latestClarification}
            loading={clarificationLoading}
          />
          <CallControls
            callStatus={effectiveCallStatus}
            onStartCall={startCall}
            onEndCall={endCall}
            loading={retellState.status === 'registering'}
            error={retellState.error}
          />
        </div>

        {/* ─── Center: Live Transcript ─── */}
        <div className="overflow-hidden">
          <LiveTranscript entries={entries} loading={transcriptLoading} />
        </div>

        {/* ─── Right Column: Urgency + Vitals + Risk ─── */}
        <div className="flex flex-col gap-4 overflow-y-auto custom-scrollbar">
          <UrgencyBadge urgency={activeCase?.urgencyLevel ?? 'LOW'} />
          <VitalsGrid vitals={latestVitals} loading={caseLoading} />
          <RiskPredictionCard prediction={latestPrediction} loading={riskLoading} />
        </div>
      </main>
    </div>
  );
}
