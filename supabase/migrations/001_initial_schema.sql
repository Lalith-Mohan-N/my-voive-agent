-- ============================================================
-- VitaVoice Phase 1 — Database Schema
-- Run this in your Supabase SQL Editor
-- ============================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 1. emergency_cases — Core case tracking
-- ============================================================
CREATE TABLE IF NOT EXISTS emergency_cases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  retell_call_id TEXT UNIQUE,
  patient_name TEXT,
  patient_age INTEGER,
  patient_gender TEXT CHECK (patient_gender IN ('male', 'female', 'other', 'unknown')),
  location TEXT,
  ems_unit TEXT,
  chief_complaint TEXT,
  urgency_level TEXT NOT NULL DEFAULT 'LOW' CHECK (urgency_level IN ('CRITICAL', 'URGENT', 'MEDIUM', 'LOW')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
  noise_level TEXT DEFAULT 'normal' CHECK (noise_level IN ('low', 'normal', 'high', 'extreme')),
  noise_adaptive_mode BOOLEAN DEFAULT FALSE,
  call_duration_seconds INTEGER,
  summary TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 2. case_timeline — Event log / transcript per case
-- ============================================================
CREATE TABLE IF NOT EXISTS case_timeline (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  case_id UUID NOT NULL REFERENCES emergency_cases(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('transcript', 'status_change', 'vital_logged', 'system', 'urgency_change')),
  speaker TEXT CHECK (speaker IN ('agent', 'user', 'system')),
  content TEXT NOT NULL,
  urgency_tag TEXT CHECK (urgency_tag IN ('CRITICAL', 'URGENT', 'MEDIUM', 'LOW', NULL)),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 3. vitals_log — Structured vital sign readings
-- ============================================================
CREATE TABLE IF NOT EXISTS vitals_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  case_id UUID NOT NULL REFERENCES emergency_cases(id) ON DELETE CASCADE,
  heart_rate INTEGER,
  blood_pressure_systolic INTEGER,
  blood_pressure_diastolic INTEGER,
  spo2 INTEGER,
  temperature DECIMAL(4,1),
  respiratory_rate INTEGER,
  gcs_score INTEGER CHECK (gcs_score >= 3 AND gcs_score <= 15),
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 4. hospitals — Nearby hospital seed data
-- ============================================================
CREATE TABLE IF NOT EXISTS hospitals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  phone TEXT,
  emergency_capacity TEXT CHECK (emergency_capacity IN ('available', 'limited', 'full')),
  specialties TEXT[] DEFAULT '{}',
  latitude DECIMAL(10, 7),
  longitude DECIMAL(10, 7),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- Indexes for performance
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_case_timeline_case_id ON case_timeline(case_id);
CREATE INDEX IF NOT EXISTS idx_case_timeline_created_at ON case_timeline(created_at);
CREATE INDEX IF NOT EXISTS idx_vitals_log_case_id ON vitals_log(case_id);
CREATE INDEX IF NOT EXISTS idx_emergency_cases_status ON emergency_cases(status);
CREATE INDEX IF NOT EXISTS idx_emergency_cases_retell_call_id ON emergency_cases(retell_call_id);

-- ============================================================
-- Updated_at trigger
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON emergency_cases
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- Row Level Security (RLS)
-- ============================================================
ALTER TABLE emergency_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE case_timeline ENABLE ROW LEVEL SECURITY;
ALTER TABLE vitals_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE hospitals ENABLE ROW LEVEL SECURITY;

-- Allow anon read access for dashboard
CREATE POLICY "Allow anon read emergency_cases" ON emergency_cases
  FOR SELECT USING (true);

CREATE POLICY "Allow anon read case_timeline" ON case_timeline
  FOR SELECT USING (true);

CREATE POLICY "Allow anon read vitals_log" ON vitals_log
  FOR SELECT USING (true);

CREATE POLICY "Allow anon read hospitals" ON hospitals
  FOR SELECT USING (true);

-- Allow service role full access (for webhook writes)
CREATE POLICY "Allow service role all emergency_cases" ON emergency_cases
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow service role all case_timeline" ON case_timeline
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow service role all vitals_log" ON vitals_log
  FOR ALL USING (true) WITH CHECK (true);

-- ============================================================
-- Enable Realtime for live dashboard updates
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE emergency_cases;
ALTER PUBLICATION supabase_realtime ADD TABLE case_timeline;
ALTER PUBLICATION supabase_realtime ADD TABLE vitals_log;

-- ============================================================
-- Seed hospital data (Indian hospitals)
-- ============================================================
INSERT INTO hospitals (name, address, city, phone, emergency_capacity, specialties, latitude, longitude)
VALUES
  ('Apollo Hospital', 'Greams Road, Thousand Lights', 'Chennai', '+91-44-28293333', 'available', ARRAY['trauma', 'cardiology', 'neurology'], 13.0601900, 80.2518900),
  ('AIIMS Delhi', 'Sri Aurobindo Marg, Ansari Nagar', 'New Delhi', '+91-11-26588500', 'limited', ARRAY['trauma', 'burns', 'neurosurgery'], 28.5672300, 77.2100000),
  ('Fortis Hospital', 'Sector 62, Phase VIII, Mohali', 'Chandigarh', '+91-172-4692222', 'available', ARRAY['cardiology', 'orthopedics', 'emergency'], 30.7046000, 76.7179000),
  ('Manipal Hospital', 'HAL Airport Road', 'Bangalore', '+91-80-25024444', 'available', ARRAY['trauma', 'neurology', 'pediatrics'], 12.9592000, 77.6474000),
  ('Lilavati Hospital', 'A-791, Bandra Reclamation', 'Mumbai', '+91-22-26751000', 'limited', ARRAY['cardiology', 'emergency', 'orthopedics'], 19.0509000, 72.8294000);
