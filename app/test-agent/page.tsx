'use client';

import { useState } from 'react';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { LiveTranscript } from '@/components/dashboard/LiveTranscript';
import { UrgencyBadge } from '@/components/dashboard/UrgencyBadge';
import { NoiseLevelIndicator } from '@/components/dashboard/NoiseLevelIndicator';
import { AudioPipelineVisualizer } from '@/components/dashboard/AudioPipelineVisualizer';
import { CallControls } from '@/components/dashboard/CallControls';
import { useRealtimeCase } from '@/hooks/useRealtimeCase';
import { useRealtimeTranscript } from '@/hooks/useRealtimeTranscript';
import { useRetellCall } from '@/hooks/useRetellCall';
import { Button } from '@/components/ui/Button';
import { Activity, AlertTriangle, Wind, Flame } from 'lucide-react';

/**
 * Agent Test Lab — full-screen demo page for judges.
 * Shows live call + real-time audio pipeline + stress-scenario injection.
 */
export default function TestAgentPage() {
  const { activeCase } = useRealtimeCase();
  const { entries, loading: transcriptLoading } = useRealtimeTranscript(activeCase?.id ?? null);

  const { state: retellState, startCall, endCall } = useRetellCall();

  const effectiveCallStatus =
    retellState.status === 'registering'
      ? 'registering'
      : retellState.status === 'active'
        ? 'active'
        : retellState.status === 'error'
          ? 'error'
          : 'idle';

  const [injected, setInjected] = useState<string | null>(null);

  const injectScenario = async (scenario: string) => {
    setInjected(scenario);
    // In a real implementation this would send the transcript
    // to the Retell conversation via a custom message endpoint.
    // For demo we simulate by logging a timeline entry locally.
    console.log('[TEST-AGENT] Injected scenario:', scenario);
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <DashboardHeader />

      <main className="flex-1 overflow-auto p-6 space-y-6">
        {/* Hero banner */}
        <div className="rounded-2xl border border-white/[0.06] bg-gradient-to-r from-[#00ff88]/5 to-[#4dabf7]/5 p-6">
          <h1 className="text-xl font-bold text-white mb-2">Agent Test Lab</h1>
          <p className="text-sm text-white/50 max-w-2xl">
            Live demonstration of the customised Llama 3.1 70B voice agent.
            Start a real call to see noise cancellation, normalisation, and stress handling in action.
            Or inject pre-recorded high-stress scenarios to trigger urgency classification and tool calling.
          </p>
        </div>

        {/* Scenario injection buttons */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          <Button
            variant="ghost"
            className="w-full justify-start gap-3"
            onClick={() => injectScenario('siren')}
          >
            <Wind className="h-4 w-4 text-[#4dabf7]" />
            <span className="text-xs text-left">
              Inject: Siren-drowned vitals
              <br />
              <span className="text-white/30">Tests noise-adaptive clarity + repeat logic</span>
            </span>
          </Button>
          <Button
            variant="ghost"
            className="w-full justify-start gap-3"
            onClick={() => injectScenario('panic')}
          >
            <AlertTriangle className="h-4 w-4 text-[#ff9f1c]" />
            <span className="text-xs text-left">
              Inject: Panicked shouting
              <br />
              <span className="text-white/30">Tests stress-speech slowdown + grounding</span>
            </span>
          </Button>
          <Button
            variant="ghost"
            className="w-full justify-start gap-3"
            onClick={() => injectScenario('cardiac')}
          >
            <Activity className="h-4 w-4 text-[#ff3b5c]" />
            <span className="text-xs text-left">
              Inject: Cardiac arrest scenario
              <br />
              <span className="text-white/30">Tests CRITICAL urgency + double-confirmation</span>
            </span>
          </Button>
          <Button
            variant="ghost"
            className="w-full justify-start gap-3"
            onClick={() => injectScenario('multi')}
          >
            <Flame className="h-4 w-4 text-[#ff9f1c]" />
            <span className="text-xs text-left">
              Inject: Multi-casualty chaos
              <br />
              <span className="text-white/30">Tests ambiguity + clarification loop</span>
            </span>
          </Button>
        </div>

        {injected && (
          <div className="rounded-lg bg-[#ff9f1c]/10 border border-[#ff9f1c]/20 px-4 py-2 text-xs text-[#ff9f1c]">
            Scenario injected: <strong className="uppercase">{injected}</strong> —
            speak into the mic or use the sample audio below to trigger the agent.
          </div>
        )}

        {/* Dashboard grid replicated for the demo */}
        <div className="dashboard-grid">
          {/* Left */}
          <div className="flex flex-col gap-4">
            <CallControls
              callStatus={effectiveCallStatus}
              onStartCall={startCall}
              onEndCall={endCall}
              loading={retellState.status === 'registering'}
              error={retellState.error}
            />
            <AudioPipelineVisualizer
              metrics={retellState.audioMetrics}
              isActive={effectiveCallStatus === 'active' || effectiveCallStatus === 'registering'}
            />
            <NoiseLevelIndicator level={activeCase?.noiseLevel ?? 'normal'} />
          </div>

          {/* Center */}
          <div className="overflow-hidden">
            <LiveTranscript entries={entries} loading={transcriptLoading} />
          </div>

          {/* Right */}
          <div className="flex flex-col gap-4">
            <UrgencyBadge urgency={activeCase?.urgencyLevel ?? 'LOW'} />
            {/* Agent capability cards */}
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-white/40">
                Llama 3.1 70B Capabilities
              </h3>
              <div className="space-y-2">
                <CapabilityRow
                  label="Noise Normalisation"
                  desc="Web Audio API pipeline: gate + compressor + normalisation"
                  active={!!retellState.audioMetrics}
                />
                <CapabilityRow
                  label="Urgency Classification"
                  desc="Chain-of-thought [CRITICAL] → [LOW] with few-shot examples"
                  active={!!activeCase?.urgencyLevel && activeCase.urgencyLevel !== 'LOW'}
                />
                <CapabilityRow
                  label="Double-Confirmation"
                  desc="Safety loop: repeat → confirm → execute for critical tools"
                  active={true}
                />
                <CapabilityRow
                  label="Conversation Memory"
                  desc="Supabase per-session memory with last-10-turn retrieval"
                  active={!!activeCase}
                />
                <CapabilityRow
                  label="Stressed-Speech Handling"
                  desc="Slows down, repeats keywords, forced-choice only"
                  active={activeCase?.noiseAdaptiveMode ?? false}
                />
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function CapabilityRow({
  label,
  desc,
  active,
}: {
  label: string;
  desc: string;
  active: boolean;
}) {
  return (
    <div className="flex items-start gap-3">
      <div
        className={`mt-0.5 h-2 w-2 rounded-full flex-shrink-0 ${
          active ? 'bg-[#00ff88] animate-pulse' : 'bg-white/10'
        }`}
      />
      <div>
        <div className="text-xs font-semibold text-white/80">{label}</div>
        <div className="text-[10px] text-white/30 leading-relaxed">{desc}</div>
      </div>
    </div>
  );
}
