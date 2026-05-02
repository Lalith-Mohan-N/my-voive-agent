// ============================================================
// VitaVoice — Retell Webhook Event Handler
// ============================================================

import { createServerClient } from '@/lib/supabase/server';
import type { Database } from '@/lib/supabase/types';
import { parseUrgencyFromText, extractVitalsFromText } from '@/lib/utils';
import type { RetellWebhookEvent, RetellCallAnalysis } from './types';

type TablesInsert<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert'];
type TablesUpdate<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update'];

/**
 * Process a Retell AI webhook event.
 * Routes to the appropriate handler based on event type.
 */
export async function handleWebhookEvent(event: RetellWebhookEvent): Promise<void> {
  switch (event.event) {
    case 'call_started':
      await handleCallStarted(event);
      break;
    case 'call_ended':
      await handleCallEnded(event);
      break;
    case 'call_analyzed':
      await handleCallAnalyzed(event);
      break;
    default:
      console.log(`Unhandled event type: ${event.event}`);
  }
}

/** Handle call_started: create emergency case + initial timeline entry */
async function handleCallStarted(event: RetellWebhookEvent): Promise<void> {
  const supabase = createServerClient();
  const { call } = event;

  // Create the emergency case
  const { data: caseData, error: caseError } = await (supabase
    .from('emergency_cases') as any)
    .insert({
      retell_call_id: call.call_id,
      status: 'active',
      urgency_level: 'LOW',
      noise_level: 'normal',
    })
    .select('id')
    .single() as any;

  if (caseError) {
    console.error('Failed to create emergency case:', caseError);
    throw new Error(`Failed to create case: ${caseError.message}`);
  }

  // Add initial timeline entry
  await (supabase.from('case_timeline') as any).insert({
    case_id: caseData.id,
    event_type: 'system',
    speaker: 'system',
    content: 'Call started — VitaVoice connected.',
  });
}

/** Handle call_ended: update case status and log summary */
async function handleCallEnded(event: RetellWebhookEvent): Promise<void> {
  const supabase = createServerClient();
  const { call } = event;

  // Find the case by retell_call_id
  const { data: caseData } = await (supabase
    .from('emergency_cases') as any)
    .select('id')
    .eq('retell_call_id', call.call_id)
    .single() as any;

  if (!caseData) {
    console.error('Case not found for call_id:', call.call_id);
    return;
  }

  // Process transcript for urgency and vitals
  let highestUrgency: string = 'LOW';
  if (call.transcript) {
    const detected = parseUrgencyFromText(call.transcript);
    if (detected) highestUrgency = detected;

    const vitals = extractVitalsFromText(call.transcript);
    if (Object.keys(vitals).length > 0) {
      await (supabase.from('vitals_log') as any).insert({
        case_id: caseData.id,
        heart_rate: vitals.heartRate ?? null,
        blood_pressure_systolic: vitals.bloodPressureSystolic ?? null,
        blood_pressure_diastolic: vitals.bloodPressureDiastolic ?? null,
        spo2: vitals.spo2 ?? null,
        temperature: vitals.temperature ?? null,
        respiratory_rate: vitals.respiratoryRate ?? null,
        gcs_score: vitals.gcsScore ?? null,
      });
    }
  }

  // Process individual transcript entries
  if (call.transcript_object?.length) {
    const timelineEntries = call.transcript_object.map((entry) => ({
      case_id: caseData.id,
      event_type: 'transcript' as const,
      speaker: entry.role as 'agent' | 'user',
      content: entry.content,
      urgency_tag: parseUrgencyFromText(entry.content),
    }));

    await (supabase.from('case_timeline') as any).insert(timelineEntries);
  }

  // Calculate duration
  const durationSeconds = call.duration_ms
    ? Math.round(call.duration_ms / 1000)
    : null;

  // Update the case
  await (supabase
    .from('emergency_cases') as any)
    .update({
      status: 'completed',
      urgency_level: highestUrgency as 'CRITICAL' | 'URGENT' | 'MEDIUM' | 'LOW',
      call_duration_seconds: durationSeconds,
      summary: call.transcript ?? null,
    })
    .eq('id', caseData.id);

  // Add end timeline entry
  await (supabase.from('case_timeline') as any).insert({
    case_id: caseData.id,
    event_type: 'system',
    speaker: 'system',
    content: `Call ended. Duration: ${durationSeconds ?? 0}s. Reason: ${call.disconnection_reason ?? 'unknown'}.`,
  });
}

/** Handle call_analyzed: update case with analysis data */
async function handleCallAnalyzed(event: RetellWebhookEvent): Promise<void> {
  const supabase = createServerClient();
  const { call } = event;

  if (!call.call_analysis) return;

  const { data: caseData } = await (supabase
    .from('emergency_cases') as any)
    .select('id')
    .eq('retell_call_id', call.call_id)
    .single() as any;

  if (!caseData) return;

  await (supabase.from('case_timeline') as any).insert({
    case_id: caseData.id,
    event_type: 'system',
    speaker: 'system',
    content: `Call analysis complete. Summary: ${call.call_analysis.call_summary ?? 'N/A'}`,
    metadata: { analysis: call.call_analysis as RetellCallAnalysis },
  });
}
