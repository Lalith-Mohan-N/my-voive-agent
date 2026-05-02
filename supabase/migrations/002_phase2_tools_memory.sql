-- ============================================================
-- VitaVoice Phase 2 — Tool Calling, Memory, Safety, Risk Tables
-- Run this in your Supabase SQL Editor after 001_initial_schema.sql
-- ============================================================

-- ============================================================
-- 1. conversation_memory — Per-session LLM context store
-- ============================================================
CREATE TABLE IF NOT EXISTS conversation_memory (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  case_id UUID NOT NULL REFERENCES emergency_cases(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('agent', 'user', 'system')),
  content TEXT NOT NULL,
  reasoning_chain TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 2. pending_confirmations — Double-confirmation safety loop
-- ============================================================
CREATE TABLE IF NOT EXISTS pending_confirmations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  call_id TEXT NOT NULL,
  case_id UUID REFERENCES emergency_cases(id) ON DELETE CASCADE,
  tool_name TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'expired', 'rejected')),
  instruction_text TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

-- ============================================================
-- 3. risk_predictions — AI-assessed patient risk outputs
-- ============================================================
CREATE TABLE IF NOT EXISTS risk_predictions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  case_id UUID NOT NULL REFERENCES emergency_cases(id) ON DELETE CASCADE,
  risk_type TEXT NOT NULL,
  confidence DECIMAL(4,3) NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  details TEXT NOT NULL,
  recommended_action TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- Indexes for performance
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_conversation_memory_case_id ON conversation_memory(case_id);
CREATE INDEX IF NOT EXISTS idx_conversation_memory_created_at ON conversation_memory(created_at);
CREATE INDEX IF NOT EXISTS idx_pending_confirmations_call_id ON pending_confirmations(call_id);
CREATE INDEX IF NOT EXISTS idx_pending_confirmations_status ON pending_confirmations(status);
CREATE INDEX IF NOT EXISTS idx_risk_predictions_case_id ON risk_predictions(case_id);
CREATE INDEX IF NOT EXISTS idx_risk_predictions_created_at ON risk_predictions(created_at);

-- ============================================================
-- Row Level Security (RLS)
-- ============================================================
ALTER TABLE conversation_memory ENABLE ROW LEVEL SECURITY;
ALTER TABLE pending_confirmations ENABLE ROW LEVEL SECURITY;
ALTER TABLE risk_predictions ENABLE ROW LEVEL SECURITY;

-- Allow anon read access for dashboard
CREATE POLICY "Allow anon read conversation_memory" ON conversation_memory
  FOR SELECT USING (true);

CREATE POLICY "Allow anon read pending_confirmations" ON pending_confirmations
  FOR SELECT USING (true);

CREATE POLICY "Allow anon read risk_predictions" ON risk_predictions
  FOR SELECT USING (true);

-- Allow service role full access (for webhook + tool handler writes)
CREATE POLICY "Allow service role all conversation_memory" ON conversation_memory
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow service role all pending_confirmations" ON pending_confirmations
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow service role all risk_predictions" ON risk_predictions
  FOR ALL USING (true) WITH CHECK (true);

-- ============================================================
-- Enable Realtime for live dashboard updates
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE conversation_memory;
ALTER PUBLICATION supabase_realtime ADD TABLE pending_confirmations;
ALTER PUBLICATION supabase_realtime ADD TABLE risk_predictions;
