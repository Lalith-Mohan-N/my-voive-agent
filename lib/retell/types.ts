// ============================================================
// VitaVoice — Retell AI Event Type Definitions
// ============================================================

/** Retell webhook event types */
export type RetellEventType =
  | 'call_started'
  | 'call_ended'
  | 'call_analyzed'
  | 'agent_message';

/** Base webhook event structure */
export interface RetellWebhookEvent {
  event: RetellEventType;
  call: RetellCallData;
}

/** Call data sent with every Retell webhook */
export interface RetellCallData {
  call_id: string;
  agent_id: string;
  call_status: 'registered' | 'ongoing' | 'ended' | 'error';
  start_timestamp?: number;
  end_timestamp?: number;
  duration_ms?: number;
  transcript?: string;
  transcript_object?: RetellTranscriptEntry[];
  recording_url?: string;
  disconnection_reason?: string;
  call_analysis?: RetellCallAnalysis;
  metadata?: Record<string, unknown>;
  retell_llm_dynamic_variables?: Record<string, unknown>;
}

/** Individual transcript entry from Retell */
export interface RetellTranscriptEntry {
  role: 'agent' | 'user';
  content: string;
  words?: RetellWord[];
}

/** Word-level transcript data */
export interface RetellWord {
  word: string;
  start: number;
  end: number;
}

/** Call analysis data from Retell */
export interface RetellCallAnalysis {
  call_summary?: string;
  user_sentiment?: 'positive' | 'neutral' | 'negative';
  call_successful?: boolean;
  custom_analysis_data?: Record<string, unknown>;
}

/** Response we send back to Retell for webhook */
export interface RetellWebhookResponse {
  received: boolean;
  error?: string;
}
