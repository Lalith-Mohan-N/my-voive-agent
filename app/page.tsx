'use client';

import { useState } from 'react';
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
import { Button } from '@/components/ui/Button';
import { Activity, AlertTriangle, Wind, Flame, MapPin } from 'lucide-react';

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

  // Derive effective call status: Retell's browser-side state is the source of truth
  // for the current session. Only fall back to Supabase-driven status when Retell
  // is actively connected (registering/active). If Retell is idle/ended, the user
  // is NOT on a call — even if Supabase has a stale "active" case from a previous session.
  const effectiveCallStatus =
    retellState.status === 'registering'
      ? 'registering'
      : retellState.status === 'active'
        ? 'active'
        : retellState.status === 'error'
          ? 'error'
          : retellState.status === 'ended'
            ? 'ended'
            : 'idle'; // idle — no active call, regardless of Supabase state

  // Scenario injection for demo / judge presentation (mirrors test-agent)
  const [injected, setInjected] = useState<string | null>(null);
  const injectScenario = (scenario: string) => {
    setInjected(scenario);
    console.log('[DASHBOARD] Injected scenario:', scenario);
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <DashboardHeader />

      <main className="flex-1 overflow-auto p-6 space-y-6">
        {/* ─── Top: GPS + Scenario injection bar ─── */}
        <div className="flex flex-col md:flex-row gap-3 items-start md:items-center justify-between">
          {/* GPS pill */}
          <div
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border ${
              retellState.location
                ? 'bg-[#00ff88]/10 border-[#00ff88]/30 text-[#00ff88]'
                : 'bg-white/5 border-white/10 text-white/40'
            }`}
          >
            <MapPin className="h-3 w-3" />
            {retellState.location
              ? `GPS active (${retellState.location.latitude.toFixed(4)}, ${retellState.location.longitude.toFixed(4)})`
              : 'GPS unavailable — enable location services'}
          </div>

          {/* Scenario buttons */}
          <div className="flex flex-wrap gap-2">
            <Button variant="ghost" size="sm" onClick={() => injectScenario('siren')}>
              <Wind className="h-3 w-3 text-[#4dabf7] mr-1" />
              Siren test
            </Button>
            <Button variant="ghost" size="sm" onClick={() => injectScenario('panic')}>
              <AlertTriangle className="h-3 w-3 text-[#ff9f1c] mr-1" />
              Panic test
            </Button>
            <Button variant="ghost" size="sm" onClick={() => injectScenario('cardiac')}>
              <Activity className="h-3 w-3 text-[#ff3b5c] mr-1" />
              Cardiac test
            </Button>
            <Button variant="ghost" size="sm" onClick={() => injectScenario('multi')}>
              <Flame className="h-3 w-3 text-[#ff9f1c] mr-1" />
              Multi-casualty
            </Button>
          </div>
        </div>

        {injected && (
          <div className="rounded-lg bg-[#ff9f1c]/10 border border-[#ff9f1c]/20 px-4 py-2 text-xs text-[#ff9f1c]">
            Scenario injected: <strong className="uppercase">{injected}</strong> — speak into the mic
            or use sample audio to trigger the agent.
          </div>
        )}

        {/* ─── Dashboard grid ─── */}
        <div className="dashboard-grid">
          {/* ─── Left Column ─── */}
          <div className="flex flex-col gap-4 overflow-y-auto custom-scrollbar">
            <CallStatusPanel
              status={effectiveCallStatus}
              startTime={retellState.callStartedAt || activeCase?.createdAt}
              timeoutWarning={retellState.timeoutWarning}
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
            <LiveTranscript caseId={activeCase?.id} entries={entries} loading={transcriptLoading} userRole="user" />
          </div>

          {/* ─── Right Column ─── */}
          <div className="flex flex-col gap-4 overflow-y-auto custom-scrollbar">
            <UrgencyBadge urgency={activeCase?.urgencyLevel ?? 'LOW'} />
            <VitalsGrid vitals={latestVitals} loading={caseLoading} />
            <RiskPredictionCard prediction={latestPrediction} loading={riskLoading} />
          </div>
        </div>
      </main>
    </div>
  );
}
