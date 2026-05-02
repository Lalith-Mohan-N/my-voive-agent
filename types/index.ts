// ============================================================
// VitaVoice — Shared Application Types
// ============================================================

/** Urgency classification levels for emergency cases */
export type UrgencyLevel = 'CRITICAL' | 'URGENT' | 'MEDIUM' | 'LOW';

/** Call lifecycle states */
export type CallStatus = 'idle' | 'ringing' | 'active' | 'ended' | 'error';

/** Noise environment levels */
export type NoiseLevel = 'low' | 'normal' | 'high' | 'extreme';

/** Case lifecycle states */
export type CaseStatus = 'active' | 'completed' | 'cancelled';

/** Speaker in a conversation */
export type Speaker = 'agent' | 'user' | 'system';

/** Timeline event classification */
export type TimelineEventType =
  | 'transcript'
  | 'status_change'
  | 'vital_logged'
  | 'system'
  | 'urgency_change';

/** A single transcript entry displayed in the live feed */
export interface TranscriptEntry {
  id: string;
  caseId: string;
  eventType: TimelineEventType;
  speaker: Speaker;
  content: string;
  urgencyTag: UrgencyLevel | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}

/** Vital signs reading */
export interface VitalReading {
  id: string;
  caseId: string;
  heartRate: number | null;
  bloodPressureSystolic: number | null;
  bloodPressureDiastolic: number | null;
  spo2: number | null;
  temperature: number | null;
  respiratoryRate: number | null;
  gcsScore: number | null;
  recordedAt: string;
}

/** Emergency case data */
export interface EmergencyCase {
  id: string;
  retellCallId: string | null;
  patientName: string | null;
  patientAge: number | null;
  patientGender: 'male' | 'female' | 'other' | 'unknown' | null;
  location: string | null;
  emsUnit: string | null;
  chiefComplaint: string | null;
  urgencyLevel: UrgencyLevel;
  status: CaseStatus;
  noiseLevel: NoiseLevel;
  noiseAdaptiveMode: boolean;
  callDurationSeconds: number | null;
  summary: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Hospital information */
export interface Hospital {
  id: string;
  name: string;
  address: string;
  city: string;
  phone: string | null;
  emergencyCapacity: 'available' | 'limited' | 'full';
  specialties: string[];
  latitude: number | null;
  longitude: number | null;
}
