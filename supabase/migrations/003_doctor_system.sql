-- ============================================================
-- VitaVoice Phase 5 — Doctor Dashboard System
-- ============================================================

-- Doctors table with password authentication
CREATE TABLE IF NOT EXISTS doctors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  phone TEXT,
  specialization TEXT NOT NULL,
  hospital_name TEXT,
  license_number TEXT,
  password_hash TEXT NOT NULL,
  is_online BOOLEAN DEFAULT FALSE,
  last_seen_at TIMESTAMPTZ,
  push_subscription JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Case-Doctor assignment tracking
CREATE TABLE IF NOT EXISTS case_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  case_id UUID NOT NULL REFERENCES emergency_cases(id),
  doctor_id UUID NOT NULL REFERENCES doctors(id),
  status TEXT DEFAULT 'assigned' CHECK (status IN ('assigned', 'active', 'completed', 'released')),
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  accepted_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

-- Doctor messages for text communication
CREATE TABLE IF NOT EXISTS doctor_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  case_id UUID NOT NULL REFERENCES emergency_cases(id),
  doctor_id UUID REFERENCES doctors(id),
  sender_type TEXT NOT NULL CHECK (sender_type IN ('doctor', 'agent', 'system')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_doctors_email ON doctors(email);
CREATE INDEX IF NOT EXISTS idx_doctors_specialization ON doctors(specialization);
CREATE INDEX IF NOT EXISTS idx_doctors_is_online ON doctors(is_online);
CREATE INDEX IF NOT EXISTS idx_case_assignments_doctor_id ON case_assignments(doctor_id);
CREATE INDEX IF NOT EXISTS idx_case_assignments_case_id ON case_assignments(case_id);
CREATE INDEX IF NOT EXISTS idx_doctor_messages_case_id ON doctor_messages(case_id);
CREATE INDEX IF NOT EXISTS idx_doctor_messages_created_at ON doctor_messages(created_at);

-- Add foreign key reference to emergency_cases
ALTER TABLE emergency_cases
ADD COLUMN IF NOT EXISTS assigned_doctor_id UUID REFERENCES doctors(id);

-- RLS Policies for doctors
ALTER TABLE doctors ENABLE ROW LEVEL SECURITY;
ALTER TABLE case_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE doctor_messages ENABLE ROW LEVEL SECURITY;

-- Allow service role full access
CREATE POLICY "Allow service role all doctors" ON doctors
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow service role all case_assignments" ON case_assignments
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow service role all doctor_messages" ON doctor_messages
  FOR ALL USING (true) WITH CHECK (true);

-- Enable Realtime for doctor tables
ALTER PUBLICATION supabase_realtime ADD TABLE doctors;
ALTER PUBLICATION supabase_realtime ADD TABLE case_assignments;
ALTER PUBLICATION supabase_realtime ADD TABLE doctor_messages;

-- Create function to generate case numbers
CREATE OR REPLACE FUNCTION generate_case_number()
RETURNS TEXT AS $$
DECLARE
  new_number TEXT;
  date_part TEXT;
  seq_num INTEGER;
BEGIN
  date_part := TO_CHAR(NOW(), 'YYYYMMDD');
  
  -- Get the next sequence number for today
  SELECT COUNT(*) + 1 INTO seq_num
  FROM emergency_cases
  WHERE created_at >= CURRENT_DATE;
  
  new_number := 'ACC-' || date_part || '-' || LPAD(seq_num::TEXT, 3, '0');
  RETURN new_number;
END;
$$ LANGUAGE plpgsql;
