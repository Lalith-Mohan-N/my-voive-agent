// ============================================================
// VitaVoice — Retell AI Tool Handlers
// ============================================================

import { createServerClient } from '@/lib/supabase/server';
import type { RetellToolCallResult } from './types';

type SupabaseClient = ReturnType<typeof createServerClient>;

const CRITICAL_TOOLS = new Set(['notify_supervisor']);

/**
 * Route an incoming Retell tool call to the correct handler.
 */
export async function handleToolCall(
  toolName: string,
  args: Record<string, unknown>,
  callId: string
): Promise<RetellToolCallResult> {
  try {
    switch (toolName) {
      case 'create_emergency_case':
        return await handleCreateEmergencyCase(args, callId);
      case 'log_vitals':
        return await handleLogVitals(args, callId);
      case 'get_patient_history':
        return await handleGetPatientHistory(args);
      case 'find_nearest_hospital':
        return await handleFindNearestHospital(args);
      case 'notify_supervisor':
        return await handleNotifySupervisor(args, callId);
      case 'set_noise_level':
        return await handleSetNoiseLevel(args, callId);
      default:
        return { success: false, error: `Unknown tool: ${toolName}` };
    }
  } catch (err) {
    console.error(`Tool handler error (${toolName}):`, err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Internal tool error',
    };
  }
}

// ─── Helper: resolve case_id from 'current' or call_id ───────

async function resolveCaseId(
  supabase: SupabaseClient,
  rawCaseId: string | undefined,
  callId: string
): Promise<string | null> {
  if (rawCaseId && rawCaseId !== 'current') return rawCaseId;

  const { data } = await (supabase
    .from('emergency_cases') as any)
    .select('id')
    .eq('retell_call_id', callId)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle() as any;

  return data?.id ?? null;
}

// ─── Helper: double-confirmation safety loop ─────────────────

async function checkDoubleConfirmation(
  supabase: SupabaseClient,
  toolName: string,
  callId: string,
  payload: Record<string, unknown>,
  instructionText: string
): Promise<RetellToolCallResult | null> {
  if (!CRITICAL_TOOLS.has(toolName)) return null;

  // Check for existing pending confirmation
  const { data: existing } = await (supabase
    .from('pending_confirmations') as any)
    .select('*')
    .eq('call_id', callId)
    .eq('tool_name', toolName)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle() as any;

  if (existing) {
    // A confirmation exists — check if it was confirmed
    if (existing.status === 'confirmed') {
      // Mark as resolved and allow execution
      await (supabase.from('pending_confirmations') as any)
        .update({ status: 'expired', resolved_at: new Date().toISOString() })
        .eq('id', existing.id);
      return null; // Proceed with execution
    }
    // Still pending — ask again
    return {
      success: false,
      requires_confirmation: true,
      confirmation_id: existing.id,
      instruction_text: existing.instruction_text,
    };
  }

  // No existing confirmation — create one and ask user
  const { data: created } = await (supabase.from('pending_confirmations') as any)
    .insert({
      call_id: callId,
      tool_name: toolName,
      payload,
      status: 'pending',
      instruction_text: instructionText,
    })
    .select('id')
    .single() as any;

  return {
    success: false,
    requires_confirmation: true,
    confirmation_id: created.id,
    instruction_text: instructionText,
  };
}

// ─── Tool: create_emergency_case ─────────────────────────────

async function handleCreateEmergencyCase(
  args: Record<string, unknown>,
  callId: string
): Promise<RetellToolCallResult> {
  const supabase = createServerClient();

  const patientName = (args.patient_name as string) || 'Unknown';
  const location = (args.location as string) || 'Unknown';
  const chiefComplaint = (args.chief_complaint as string) || 'Unknown';
  const urgency = (args.urgency_level as string) || 'LOW';

  const { data, error } = await (supabase.from('emergency_cases') as any)
    .insert({
      retell_call_id: callId,
      patient_name: patientName,
      location,
      chief_complaint: chiefComplaint,
      urgency_level: urgency,
      status: 'active',
      noise_level: 'normal',
      noise_adaptive_mode: false,
    })
    .select('id')
    .single() as any;

  if (error) {
    return { success: false, error: `Failed to create case: ${error.message}` };
  }

  // Log creation in timeline
  await (supabase.from('case_timeline') as any).insert({
    case_id: data.id,
    event_type: 'system',
    speaker: 'system',
    content: `Emergency case created for ${patientName} at ${location}. Urgency: ${urgency}.`,
    urgency_tag: urgency as any,
  });

  return {
    success: true,
    data: { case_id: data.id, created: true, urgency },
  };
}

// ─── Tool: log_vitals ────────────────────────────────────────

async function handleLogVitals(
  args: Record<string, unknown>,
  callId: string
): Promise<RetellToolCallResult> {
  const supabase = createServerClient();
  const caseId = await resolveCaseId(supabase, args.case_id as string | undefined, callId);

  if (!caseId) {
    return { success: false, error: 'No active case found for this call.' };
  }

  const insertData: Record<string, unknown> = { case_id: caseId };

  if (args.heart_rate !== undefined) insertData.heart_rate = args.heart_rate;
  if (args.bp_systolic !== undefined) insertData.blood_pressure_systolic = args.bp_systolic;
  if (args.bp_diastolic !== undefined) insertData.blood_pressure_diastolic = args.bp_diastolic;
  if (args.spo2 !== undefined) insertData.spo2 = args.spo2;
  if (args.temperature !== undefined) insertData.temperature = args.temperature;
  if (args.respiratory_rate !== undefined) insertData.respiratory_rate = args.respiratory_rate;
  if (args.gcs !== undefined) insertData.gcs_score = args.gcs;
  if (args.timestamp) insertData.recorded_at = args.timestamp;

  const { data, error } = await (supabase.from('vitals_log') as any)
    .insert(insertData)
    .select('id')
    .single() as any;

  if (error) {
    return { success: false, error: `Failed to log vitals: ${error.message}` };
  }

  // Also log in timeline
  const vitalsSummary = Object.entries(insertData)
    .filter(([k]) => k !== 'case_id' && k !== 'recorded_at')
    .map(([k, v]) => `${k}: ${v}`)
    .join(', ');

  await (supabase.from('case_timeline') as any).insert({
    case_id: caseId,
    event_type: 'vital_logged',
    speaker: 'system',
    content: `Vitals logged: ${vitalsSummary}`,
  });

  return {
    success: true,
    data: { vital_id: data.id, recorded: true },
  };
}

// ─── Tool: get_patient_history ───────────────────────────────

async function handleGetPatientHistory(
  args: Record<string, unknown>
): Promise<RetellToolCallResult> {
  const supabase = createServerClient();
  const patientName = (args.patient_name as string) || '';

  if (!patientName || patientName.length < 2) {
    return { success: false, error: 'Patient name too short for search.' };
  }

  const { data: cases, error } = await (supabase.from('emergency_cases') as any)
    .select('id, patient_name, chief_complaint, urgency_level, created_at, summary')
    .ilike('patient_name', `%${patientName}%`)
    .order('created_at', { ascending: false })
    .limit(3) as any;

  if (error) {
    return { success: false, error: `History lookup failed: ${error.message}` };
  }

  if (!cases || cases.length === 0) {
    return { success: true, data: { found: false, message: 'No prior cases found.' } };
  }

  const history = cases.map((c: any) => ({
    date: c.created_at,
    complaint: c.chief_complaint,
    urgency: c.urgency_level,
    summary: c.summary,
  }));

  return {
    success: true,
    data: { found: true, count: cases.length, history },
  };
}

// ─── Tool: find_nearest_hospital ─────────────────────────────

async function handleFindNearestHospital(
  args: Record<string, unknown>
): Promise<RetellToolCallResult> {
  const supabase = createServerClient();
  const location = (args.location as string) || '';
  const requiredSpecialty = (args.required_specialty as string) || '';

  // Stub: fetch all available hospitals from seed data
  let query = (supabase.from('hospitals') as any)
    .select('*')
    .neq('emergency_capacity', 'full')
    .order('created_at', { ascending: false });

  if (requiredSpecialty) {
    query = query.contains('specialties', [requiredSpecialty]);
  }

  const { data: hospitals, error } = await query.limit(5) as any;

  if (error) {
    return { success: false, error: `Hospital lookup failed: ${error.message}` };
  }

  if (!hospitals || hospitals.length === 0) {
    return {
      success: true,
      data: { found: false, message: 'No available hospitals match criteria.' },
    };
  }

  // Stub distance sorting — just return top 2
  const results = hospitals.slice(0, 2).map((h: any) => ({
    name: h.name,
    address: h.address,
    city: h.city,
    phone: h.phone,
    capacity: h.emergency_capacity,
    specialties: h.specialties,
  }));

  return {
    success: true,
    data: { found: true, location_query: location, hospitals: results },
  };
}

// ─── Tool: notify_supervisor ─────────────────────────────────

async function handleNotifySupervisor(
  args: Record<string, unknown>,
  callId: string
): Promise<RetellToolCallResult> {
  const supabase = createServerClient();
  const caseId = await resolveCaseId(supabase, args.case_id as string | undefined, callId);
  const message = (args.message as string) || '';
  const urgency = (args.urgency as string) || 'URGENT';

  if (!message) {
    return { success: false, error: 'Message required for supervisor notification.' };
  }

  // Double-confirmation for critical tool
  const confirmation = await checkDoubleConfirmation(
    supabase,
    'notify_supervisor',
    callId,
    { case_id: caseId, message, urgency },
    `Send supervisor alert: "${message}". Confirm? Say yes or no.`
  );

  if (confirmation) return confirmation;

  // Log as timeline event
  if (caseId) {
    await (supabase.from('case_timeline') as any).insert({
      case_id: caseId,
      event_type: 'system',
      speaker: 'system',
      content: `Supervisor alert [${urgency}]: ${message}`,
      urgency_tag: urgency as any,
    });
  }

  // Attempt external webhook if configured
  const supervisorWebhook = process.env.SUPERVISOR_WEBHOOK_URL;
  let externalNotified = false;
  if (supervisorWebhook) {
    try {
      const resp = await fetch(supervisorWebhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ case_id: caseId, call_id: callId, message, urgency, timestamp: new Date().toISOString() }),
      });
      externalNotified = resp.ok;
    } catch {
      externalNotified = false;
    }
  }

  return {
    success: true,
    data: {
      notified: true,
      external_webhook: externalNotified,
      case_id: caseId,
      message,
    },
  };
}

// ─── Tool: set_noise_level ───────────────────────────────────

async function handleSetNoiseLevel(
  args: Record<string, unknown>,
  callId: string
): Promise<RetellToolCallResult> {
  const supabase = createServerClient();
  const level = (args.level as 'low' | 'normal' | 'high' | 'extreme') || 'normal';
  const caseId = await resolveCaseId(supabase, args.case_id as string | undefined, callId);

  if (!caseId) {
    return { success: false, error: 'No active case found for this call.' };
  }

  const isAdaptive = level === 'high' || level === 'extreme';

  const { error } = await (supabase.from('emergency_cases') as any)
    .update({
      noise_level: level,
      noise_adaptive_mode: isAdaptive,
    })
    .eq('id', caseId) as any;

  if (error) {
    return { success: false, error: `Failed to update noise level: ${error.message}` };
  }

  // Also write a memory entry for context
  await (supabase.from('conversation_memory') as any).insert({
    case_id: caseId,
    role: 'system',
    content: `Noise level updated to ${level}. Adaptive mode: ${isAdaptive}.`,
  });

  return {
    success: true,
    data: { noise_level: level, adaptive_mode: isAdaptive, case_id: caseId },
  };
}
