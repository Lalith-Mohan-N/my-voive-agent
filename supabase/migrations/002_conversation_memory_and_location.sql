-- ============================================================
-- VitaVoice Phase 2 — Conversation Memory & Location Tracking
-- ============================================================

-- Add device location columns to emergency_cases
ALTER TABLE emergency_cases
ADD COLUMN IF NOT EXISTS device_latitude DECIMAL(10, 7),
ADD COLUMN IF NOT EXISTS device_longitude DECIMAL(10, 7),
ADD COLUMN IF NOT EXISTS device_speed DECIMAL(6, 2),
ADD COLUMN IF NOT EXISTS device_heading DECIMAL(5, 2),
ADD COLUMN IF NOT EXISTS location_accuracy DECIMAL(8, 2),
ADD COLUMN IF NOT EXISTS location_updated_at TIMESTAMPTZ;

-- Create conversation_memory table for context tracking
CREATE TABLE IF NOT EXISTS conversation_memory (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  case_id UUID NOT NULL REFERENCES emergency_cases(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'agent', 'system')),
  content TEXT NOT NULL,
  intent TEXT,
  entities JSONB DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index for fast conversation lookups
CREATE INDEX IF NOT EXISTS idx_conversation_memory_case_id ON conversation_memory(case_id);
CREATE INDEX IF NOT EXISTS idx_conversation_memory_created_at ON conversation_memory(created_at);

-- Add RLS policies
ALTER TABLE conversation_memory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anon read conversation_memory" ON conversation_memory
  FOR SELECT USING (true);

CREATE POLICY "Allow service role all conversation_memory" ON conversation_memory
  FOR ALL USING (true) WITH CHECK (true);

-- Enable Realtime for conversation memory
ALTER PUBLICATION supabase_realtime ADD TABLE conversation_memory;

-- Add key_findings column to emergency_cases for AI-extracted info
ALTER TABLE emergency_cases
ADD COLUMN IF NOT EXISTS key_findings JSONB DEFAULT '[]';

-- Add patient_age_category column
ALTER TABLE emergency_cases
ADD COLUMN IF NOT EXISTS patient_age_category TEXT CHECK (patient_age_category IN ('infant', 'child', 'teen', 'adult', 'elderly'));

-- Add case_number column with unique constraint
ALTER TABLE emergency_cases
ADD COLUMN IF NOT EXISTS case_number TEXT UNIQUE;

-- Add case_type column
ALTER TABLE emergency_cases
ADD COLUMN IF NOT EXISTS case_type TEXT;

-- Add assigned_doctor_id column
ALTER TABLE emergency_cases
ADD COLUMN IF NOT EXISTS assigned_doctor_id UUID;

-- Add agent_active column to track if AI agent is handling the case
ALTER TABLE emergency_cases
ADD COLUMN IF NOT EXISTS agent_active BOOLEAN DEFAULT TRUE;
