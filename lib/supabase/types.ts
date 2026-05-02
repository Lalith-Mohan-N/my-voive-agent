// ============================================================
// VitaVoice — Supabase Database Type Definitions
// ============================================================

export interface Database {
  public: {
    Tables: {
      emergency_cases: {
        Row: {
          id: string;
          retell_call_id: string | null;
          patient_name: string | null;
          patient_age: number | null;
          patient_gender: 'male' | 'female' | 'other' | 'unknown' | null;
          location: string | null;
          ems_unit: string | null;
          chief_complaint: string | null;
          urgency_level: 'CRITICAL' | 'URGENT' | 'MEDIUM' | 'LOW';
          status: 'active' | 'completed' | 'cancelled';
          noise_level: 'low' | 'normal' | 'high' | 'extreme';
          noise_adaptive_mode: boolean;
          call_duration_seconds: number | null;
          summary: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          retell_call_id?: string | null;
          patient_name?: string | null;
          patient_age?: number | null;
          patient_gender?: 'male' | 'female' | 'other' | 'unknown' | null;
          location?: string | null;
          ems_unit?: string | null;
          chief_complaint?: string | null;
          urgency_level?: 'CRITICAL' | 'URGENT' | 'MEDIUM' | 'LOW';
          status?: 'active' | 'completed' | 'cancelled';
          noise_level?: 'low' | 'normal' | 'high' | 'extreme';
          noise_adaptive_mode?: boolean;
          call_duration_seconds?: number | null;
          summary?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          retell_call_id?: string | null;
          patient_name?: string | null;
          patient_age?: number | null;
          patient_gender?: 'male' | 'female' | 'other' | 'unknown' | null;
          location?: string | null;
          ems_unit?: string | null;
          chief_complaint?: string | null;
          urgency_level?: 'CRITICAL' | 'URGENT' | 'MEDIUM' | 'LOW';
          status?: 'active' | 'completed' | 'cancelled';
          noise_level?: 'low' | 'normal' | 'high' | 'extreme';
          noise_adaptive_mode?: boolean;
          call_duration_seconds?: number | null;
          summary?: string | null;
          updated_at?: string;
        };
      };
      case_timeline: {
        Row: {
          id: string;
          case_id: string;
          event_type: 'transcript' | 'status_change' | 'vital_logged' | 'system' | 'urgency_change' | 'clarification_request' | 'tool_call' | 'risk_alert' | 'confirmation_needed';
          speaker: 'agent' | 'user' | 'system' | null;
          content: string;
          urgency_tag: 'CRITICAL' | 'URGENT' | 'MEDIUM' | 'LOW' | null;
          metadata: Record<string, unknown>;
          created_at: string;
        };
        Insert: {
          id?: string;
          case_id: string;
          event_type: 'transcript' | 'status_change' | 'vital_logged' | 'system' | 'urgency_change' | 'clarification_request' | 'tool_call' | 'risk_alert' | 'confirmation_needed';
          speaker?: 'agent' | 'user' | 'system' | null;
          content: string;
          urgency_tag?: 'CRITICAL' | 'URGENT' | 'MEDIUM' | 'LOW' | null;
          metadata?: Record<string, unknown>;
          created_at?: string;
        };
        Update: {
          case_id?: string;
          event_type?: 'transcript' | 'status_change' | 'vital_logged' | 'system' | 'urgency_change' | 'clarification_request' | 'tool_call' | 'risk_alert' | 'confirmation_needed';
          speaker?: 'agent' | 'user' | 'system' | null;
          content?: string;
          urgency_tag?: 'CRITICAL' | 'URGENT' | 'MEDIUM' | 'LOW' | null;
          metadata?: Record<string, unknown>;
        };
      };
      vitals_log: {
        Row: {
          id: string;
          case_id: string;
          heart_rate: number | null;
          blood_pressure_systolic: number | null;
          blood_pressure_diastolic: number | null;
          spo2: number | null;
          temperature: number | null;
          respiratory_rate: number | null;
          gcs_score: number | null;
          recorded_at: string;
        };
        Insert: {
          id?: string;
          case_id: string;
          heart_rate?: number | null;
          blood_pressure_systolic?: number | null;
          blood_pressure_diastolic?: number | null;
          spo2?: number | null;
          temperature?: number | null;
          respiratory_rate?: number | null;
          gcs_score?: number | null;
          recorded_at?: string;
        };
        Update: {
          case_id?: string;
          heart_rate?: number | null;
          blood_pressure_systolic?: number | null;
          blood_pressure_diastolic?: number | null;
          spo2?: number | null;
          temperature?: number | null;
          respiratory_rate?: number | null;
          gcs_score?: number | null;
        };
      };
      hospitals: {
        Row: {
          id: string;
          name: string;
          address: string;
          city: string;
          phone: string | null;
          emergency_capacity: 'available' | 'limited' | 'full';
          specialties: string[];
          latitude: number | null;
          longitude: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          address: string;
          city: string;
          phone?: string | null;
          emergency_capacity?: 'available' | 'limited' | 'full';
          specialties?: string[];
          latitude?: number | null;
          longitude?: number | null;
        };
        Update: {
          name?: string;
          address?: string;
          city?: string;
          phone?: string | null;
          emergency_capacity?: 'available' | 'limited' | 'full';
          specialties?: string[];
          latitude?: number | null;
          longitude?: number | null;
        };
      };
      conversation_memory: {
        Row: {
          id: string;
          case_id: string;
          role: 'agent' | 'user' | 'system';
          content: string;
          reasoning_chain: string | null;
          metadata: Record<string, unknown>;
          created_at: string;
        };
        Insert: {
          id?: string;
          case_id: string;
          role: 'agent' | 'user' | 'system';
          content: string;
          reasoning_chain?: string | null;
          metadata?: Record<string, unknown>;
          created_at?: string;
        };
        Update: {
          case_id?: string;
          role?: 'agent' | 'user' | 'system';
          content?: string;
          reasoning_chain?: string | null;
          metadata?: Record<string, unknown>;
        };
      };
      pending_confirmations: {
        Row: {
          id: string;
          call_id: string;
          case_id: string | null;
          tool_name: string;
          payload: Record<string, unknown>;
          status: 'pending' | 'confirmed' | 'expired' | 'rejected';
          instruction_text: string | null;
          created_at: string;
          resolved_at: string | null;
        };
        Insert: {
          id?: string;
          call_id: string;
          case_id?: string | null;
          tool_name: string;
          payload?: Record<string, unknown>;
          status?: 'pending' | 'confirmed' | 'expired' | 'rejected';
          instruction_text?: string | null;
          created_at?: string;
          resolved_at?: string | null;
        };
        Update: {
          call_id?: string;
          case_id?: string | null;
          tool_name?: string;
          payload?: Record<string, unknown>;
          status?: 'pending' | 'confirmed' | 'expired' | 'rejected';
          instruction_text?: string | null;
          resolved_at?: string | null;
        };
      };
      risk_predictions: {
        Row: {
          id: string;
          case_id: string;
          risk_type: string;
          confidence: number;
          details: string;
          recommended_action: string | null;
          metadata: Record<string, unknown>;
          created_at: string;
        };
        Insert: {
          id?: string;
          case_id: string;
          risk_type: string;
          confidence: number;
          details: string;
          recommended_action?: string | null;
          metadata?: Record<string, unknown>;
          created_at?: string;
        };
        Update: {
          case_id?: string;
          risk_type?: string;
          confidence?: number;
          details?: string;
          recommended_action?: string | null;
          metadata?: Record<string, unknown>;
        };
      };
    };
  };
}

/** Convenience type aliases */
export type EmergencyCaseRow = Database['public']['Tables']['emergency_cases']['Row'];
export type CaseTimelineRow = Database['public']['Tables']['case_timeline']['Row'];
export type VitalsLogRow = Database['public']['Tables']['vitals_log']['Row'];
export type HospitalRow = Database['public']['Tables']['hospitals']['Row'];
export type ConversationMemoryRow = Database['public']['Tables']['conversation_memory']['Row'];
export type PendingConfirmationRow = Database['public']['Tables']['pending_confirmations']['Row'];
export type RiskPredictionRow = Database['public']['Tables']['risk_predictions']['Row'];
