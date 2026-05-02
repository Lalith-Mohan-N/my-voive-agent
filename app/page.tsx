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
import { useRealtimeCase } from '@/hooks/useRealtimeCase';
import { useRealtimeTranscript } from '@/hooks/useRealtimeTranscript';
import { useCallStatus } from '@/hooks/useCallStatus';
import { useRiskPredictions } from '@/hooks/useRiskPredictions';
import { usePendingClarifications } from '@/hooks/usePendingClarifications';
import { useState, useCallback } from 'react';

export default function DashboardPage() {
  const { activeCase, loading: caseLoading } = useRealtimeCase();
  const { entries, loading: transcriptLoading } = useRealtimeTranscript(activeCase?.id ?? null);
  const { callStatus, setCallStatus, latestVitals } = useCallStatus(
    activeCase?.status ?? null,
    activeCase?.id ?? null
  );
  const { latestPrediction, loading: riskLoading } = useRiskPredictions(activeCase?.id ?? null);
  const { latestClarification, loading: clarificationLoading } = usePendingClarifications(
    activeCase?.id ?? null
  );
  const [controlLoading, setControlLoading] = useState(false);

  const handleStartCall = useCallback(async () => {
    setControlLoading(true);
    try {
      // In production, this would initiate a Retell call via their Web SDK
      // For now, we set the status to show the UI transition
      setCallStatus('ringing');
      setTimeout(() => {
        setCallStatus('active');
        setControlLoading(false);
      }, 2000);
    } catch (error) {
      console.error('Failed to start call:', error);
      setCallStatus('error');
      setControlLoading(false);
    }
  }, [setCallStatus]);

  const handleEndCall = useCallback(async () => {
    setControlLoading(true);
    try {
      setCallStatus('ended');
    } catch (error) {
      console.error('Failed to end call:', error);
    } finally {
      setControlLoading(false);
    }
  }, [setCallStatus]);

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <DashboardHeader />

      <main className="dashboard-grid flex-1 overflow-hidden">
        {/* ─── Left Column: Status + Environment + Case + Controls + Clarifications ─── */}
        <div className="flex flex-col gap-4 overflow-y-auto custom-scrollbar">
          <CallStatusPanel
            status={callStatus}
            startTime={activeCase?.createdAt}
          />
          <NoiseLevelIndicator level={activeCase?.noiseLevel ?? 'normal'} />
          <CaseInfoCard activeCase={activeCase} loading={caseLoading} />
          <ClarificationPanel
            clarification={latestClarification}
            loading={clarificationLoading}
          />
          <CallControls
            callStatus={callStatus}
            onStartCall={handleStartCall}
            onEndCall={handleEndCall}
            loading={controlLoading}
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
