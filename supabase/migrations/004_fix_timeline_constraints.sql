-- ============================================================
-- VitaVoice Fix — Allow doctor speaker and message event type
-- in case_timeline so doctor texts appear in the live transcript.
-- ============================================================

-- Drop existing CHECK constraints on speaker and event_type
ALTER TABLE case_timeline
DROP CONSTRAINT IF EXISTS case_timeline_speaker_check;

ALTER TABLE case_timeline
DROP CONSTRAINT IF EXISTS case_timeline_event_type_check;

-- Re-add with broader allowed values
ALTER TABLE case_timeline
ADD CONSTRAINT case_timeline_speaker_check
CHECK (speaker IN ('agent', 'user', 'system', 'doctor'));

ALTER TABLE case_timeline
ADD CONSTRAINT case_timeline_event_type_check
CHECK (event_type IN (
  'transcript',
  'status_change',
  'vital_logged',
  'system',
  'urgency_change',
  'clarification_request',
  'tool_call',
  'risk_alert',
  'confirmation_needed',
  'message'
));
