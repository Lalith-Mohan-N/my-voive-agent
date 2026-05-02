# VitaVoice v3 — Full Implementation Plan

## Overview

This plan transforms VitaVoice from a single-user demo into a **production-ready EMS voice dispatch system** with doctor registration, live GPS tracking, real hospital data, multilingual support, first aid guidance, and public deployment.

---

## Current Architecture

| Layer | Technology | Status |
|-------|-----------|--------|
| Frontend | Next.js 16 + React 19 + TailwindCSS 4 | ✅ Working |
| Voice SDK | Retell Web Client (browser) | ✅ Connected |
| Agent Config | Retell Conversation Flow (6 tools) | ✅ Active |
| Backend API | Next.js API routes (`/api/retell/*`) | ✅ Working |
| Database | Supabase (PostgreSQL + Realtime) | ✅ Schema ready |
| Audio | Web Audio API noise gate + compressor | ✅ Basic pipeline |

---

## Phase 1 — Agent Performance & Noise Cancellation
> **Priority: CRITICAL** — This is the core problem statement

### Problem
- Agent gets distracted by multiple speakers, sirens, traffic
- Restarts questions from beginning when interrupted
- Responses are too slow (high latency)

### Changes

#### [MODIFY] Retell Agent Configuration (via setup script)
- Set `interruption_sensitivity` to **0.9** (less sensitive to interruptions) on all conversation nodes
- Set `model_choice` to `gpt-4.1-mini` (faster, cheaper) for non-critical nodes and `gpt-4.1` for welcome/triage only
- Reduce `global_prompt` length — shorter prompts = faster LLM response
- Add `ambient_sound: "office"` agent setting to tell Retell to expect noisy environment
- Set `voice_speed: 1.1` for slightly faster agent speech

#### [MODIFY] `lib/audio/audio-pipeline.ts`
- Add **bandpass filter** (300Hz–3400Hz) to isolate human speech frequency
- Increase noise gate threshold from 0.015 → **0.04** for aggressive noise suppression
- Add **WebRTC noise suppression** via `navigator.mediaDevices.getUserMedia({ audio: { noiseSuppression: true, echoCancellation: true, autoGainControl: true } })`
- Add voice activity detection (VAD) to only send audio when primary speaker is active

#### [NEW] `lib/audio/vad-detector.ts`
- Simple energy-based Voice Activity Detector
- Tracks primary speaker energy pattern, suppresses secondary voices
- Uses short-term vs long-term energy comparison

#### [MODIFY] `hooks/useRetellCall.ts`
- Pass enhanced audio constraints with noise suppression enabled
- Feed processed (filtered) MediaStream to Retell instead of raw mic

---

## Phase 2 — Multilingual Auto-Detection
> **Priority: HIGH** — Agent must respond in user's language

### Changes

#### [MODIFY] Retell Agent Configuration
- Set `language` to `multi` on the agent (Retell supports auto-detection)
- Add multilingual instructions to global prompt:
  ```
  LANGUAGE: Respond in the same language the user speaks.
  If user speaks Kannada, reply in Kannada. If Hindi, reply in Hindi.
  If you detect a language switch mid-conversation, switch immediately.
  Supported: English, Hindi, Kannada, Tamil, Telugu, Malayalam, Bengali.
  ```

#### [MODIFY] `scripts/setup-retell-agent.mjs`
- Update agent with `language: 'multi'` setting
- Update global prompt with multilingual instructions

---

## Phase 3 — Real Hospital Data (Live Internet Search)
> **Priority: HIGH** — No fake or seed data

### Problem
- `find_nearest_hospital` currently returns seed data from Supabase
- User expects real, live hospital results

### Changes

#### [NEW] `lib/services/hospital-search.ts`
- Use **Google Places API** (Nearby Search) to find real hospitals
- API: `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location={lat},{lng}&radius=10000&type=hospital&key={API_KEY}`
- Fallback to Supabase seed data if Google API fails
- Cache results for 5 minutes to avoid rate limits

#### [MODIFY] `lib/retell/tool-handlers.ts` → `handleFindNearestHospital`
- Accept `latitude` and `longitude` from device GPS (Phase 6)
- If no GPS, use Google Geocoding API to convert location text → coordinates
- Call `hospital-search.ts` for real results
- Return: hospital name, address, phone, distance, specialties, open status

#### [NEW] `.env.local` additions
```env
GOOGLE_PLACES_API_KEY=your_key_here
```

---

## Phase 4 — First Aid Guidance System
> **Priority: HIGH** — Critical for field paramedics

### Changes

#### [NEW] `lib/services/firstaid-advisor.ts`
- Uses **Groq API** (already configured) with a specialized medical first aid prompt
- Input: chief complaint, available supplies, patient age category
- Output: step-by-step first aid instructions with dosage adjustments
- Double-checks recommendations by asking Groq to verify its own output
- Age categories: `infant (0-1)`, `child (1-12)`, `teen (13-17)`, `adult (18-64)`, `elderly (65+)`

#### [NEW] Retell Tool: `provide_first_aid`
- Parameters: `chief_complaint`, `has_firstaid_kit` (boolean), `available_items` (string), `patient_age_category`
- Calls `firstaid-advisor.ts` → returns step-by-step guidance
- Agent asks: "Do you have a first aid kit?" → if yes, gives kit-based guidance; if no, asks what's available

#### [MODIFY] Retell Conversation Flow
- Add first aid inquiry after vitals collection node
- New node: "First Aid Assessment" between "Collect Vitals" and "Wrap Up"

#### [MODIFY] `app/api/retell/tools/route.ts`
- Add new tool names to the handler switch

---

## Phase 5 — Doctor Dashboard & Registration
> **Priority: HIGH** — Doctors need their own interface

### Database Schema

#### [NEW] `supabase/migrations/003_doctor_system.sql`

```sql
-- Doctors table
CREATE TABLE IF NOT EXISTS doctors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  phone TEXT,
  specialization TEXT NOT NULL,
  hospital_name TEXT,
  license_number TEXT,
  is_online BOOLEAN DEFAULT FALSE,
  last_seen_at TIMESTAMPTZ,
  push_subscription JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Case-Doctor assignment
CREATE TABLE IF NOT EXISTS case_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  case_id UUID NOT NULL REFERENCES emergency_cases(id),
  doctor_id UUID NOT NULL REFERENCES doctors(id),
  status TEXT DEFAULT 'assigned' CHECK (status IN ('assigned','active','completed','released')),
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  accepted_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

-- Doctor messages
CREATE TABLE IF NOT EXISTS doctor_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  case_id UUID NOT NULL REFERENCES emergency_cases(id),
  doctor_id UUID REFERENCES doctors(id),
  sender_type TEXT NOT NULL CHECK (sender_type IN ('doctor','agent','system')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- New columns on emergency_cases
ALTER TABLE emergency_cases ADD COLUMN IF NOT EXISTS assigned_doctor_id UUID REFERENCES doctors(id);
ALTER TABLE emergency_cases ADD COLUMN IF NOT EXISTS agent_active BOOLEAN DEFAULT TRUE;
ALTER TABLE emergency_cases ADD COLUMN IF NOT EXISTS device_latitude DECIMAL(10,7);
ALTER TABLE emergency_cases ADD COLUMN IF NOT EXISTS device_longitude DECIMAL(10,7);
ALTER TABLE emergency_cases ADD COLUMN IF NOT EXISTS device_speed DECIMAL(6,2);
ALTER TABLE emergency_cases ADD COLUMN IF NOT EXISTS location_updated_at TIMESTAMPTZ;
ALTER TABLE emergency_cases ADD COLUMN IF NOT EXISTS case_number TEXT UNIQUE;
ALTER TABLE emergency_cases ADD COLUMN IF NOT EXISTS case_type TEXT;
ALTER TABLE emergency_cases ADD COLUMN IF NOT EXISTS patient_age_category TEXT;
ALTER TABLE emergency_cases ADD COLUMN IF NOT EXISTS key_findings JSONB DEFAULT '[]';
```

### Frontend Pages

#### [NEW] `app/doctor/login/page.tsx`
- Doctor registration form: name, email, phone, specialization, license, hospital
- Simple email-based login (Supabase magic link)
- Stores doctor profile in `doctors` table

#### [NEW] `app/doctor/dashboard/page.tsx`
- **Available Cases Panel**: All active cases filtered by doctor's specialization
- Each case shows: case number, urgency badge, chief complaint, location, time elapsed
- **"Take Case" button** → assigns doctor, sets `agent_active = false`
- **Notification alerts**: Web Push + audio alarm + vibration (`navigator.vibrate([200,100,200])`)
- **Active Case View** (after taking case):
  - Full transcript from `case_timeline`
  - Patient vitals real-time from `vitals_log`
  - Key findings from AI
  - GPS map showing patient location
  - ETA calculator
  - Text input for doctor messages

#### [NEW] `app/doctor/dashboard/components/`
- `CaseList.tsx` — filterable list of cases
- `CaseCard.tsx` — individual case preview card
- `DoctorCaseView.tsx` — full case detail
- `LiveLocationMap.tsx` — embedded map with patient location
- `DoctorChat.tsx` — text messaging
- `NotificationBell.tsx` — alert indicator

### API Routes

#### [NEW] `app/api/doctors/register/route.ts` — Create doctor profile
#### [NEW] `app/api/doctors/cases/route.ts` — List/take cases
#### [NEW] `app/api/doctors/messages/route.ts` — Send/receive messages

### Agent Behavior When Doctor Connects

#### [MODIFY] `lib/retell/tool-handlers.ts`
- When `agent_active = false`, tool calls return: "A doctor has taken over this case."
- Agent says: "A doctor is now handling your case. They will guide you from here."

#### [NEW] Retell Tool: `check_doctor_status`
- Checks if doctor has taken the case
- If no doctor after 3 minutes, agent provides AI-generated best solution (double-checked via Groq)

---

## Phase 6 — Device GPS Location
> **Priority: MEDIUM** — Auto-detect location instead of asking

### Changes

#### [NEW] `hooks/useDeviceLocation.ts`
- Request `navigator.geolocation.getCurrentPosition()` on call start
- Start `watchPosition()` for continuous tracking
- Returns: `{ latitude, longitude, speed, accuracy, heading }`
- Updates every 5 seconds during active call

#### [MODIFY] `hooks/useRetellCall.ts`
- On call start, get GPS and send to API

#### [NEW] `app/api/location/update/route.ts`
- POST: Update `device_latitude`, `device_longitude`, `device_speed` on active case
- Broadcasts via Supabase Realtime to doctor dashboard

#### [MODIFY] Doctor Dashboard `LiveLocationMap.tsx`
- Real-time dot on map using Leaflet.js (free, no API key)
- Shows speed, heading, estimated arrival time

---

## Phase 7 — Key Info Extraction & Display
> **Priority: MEDIUM** — Smart text extraction from voice

### Changes

#### [NEW] `lib/services/key-info-extractor.ts`
- Uses Groq API to extract structured key findings from transcript
- Output: `[{ category, value, importance }]`
- Categories: patient_info, symptoms, vitals, allergies, medications, mechanism_of_injury

#### [MODIFY] `lib/retell/webhook-handler.ts` → `handleAgentMessage`
- After logging transcript, run key info extractor
- Store in `emergency_cases.key_findings` JSONB

#### [NEW] `components/dashboard/KeyFindings.tsx`
- Colored chips: red (high), yellow (medium), blue (low) importance
- Shows on both user and doctor dashboards

#### Doctor → User messaging
- Doctor types in `DoctorChat.tsx` → stored in `doctor_messages`
- Agent reads to user via tool: `relay_doctor_message`
- If no doctor, agent handles autonomously

---

## Phase 8 — Unique Case Numbers & Categories
> **Priority: LOW** — Better case identification

### Changes

#### [MODIFY] `lib/retell/tool-handlers.ts` → `handleCreateEmergencyCase`
- Generate: `ACC-20260503-001` format case numbers
- Auto-detect case type from complaint text
- Ask age category: "Is the patient adult, teenager, child, or elderly?"

---

## Phase 9 — Production Deployment
> **Priority: HIGH** — Public URL access

### Deployment: **Vercel** (free tier, perfect for Next.js)

1. Push to GitHub
2. Connect to Vercel → set env variables
3. Deploy → `https://vitavoice.vercel.app`
4. Update Retell tool URLs to production URL
5. Works on mobile browsers — no app install needed

### Phone Call Support
- Buy Retell phone number ($2/month)
- Assign VitaVoice agent to that number
- Anyone can call from any phone — no internet needed

---

## Implementation Order

| Order | Phase | Effort | Impact |
|-------|-------|--------|--------|
| 1 | Phase 1 — Noise Cancellation + Speed | 3-4 hrs | 🔴 Critical |
| 2 | Phase 2 — Multilingual | 1 hr | 🔴 Critical |
| 3 | Phase 8 — Case Numbers | 1 hr | 🟡 Quick win |
| 4 | Phase 6 — Device GPS | 2-3 hrs | 🟠 High |
| 5 | Phase 3 — Real Hospitals | 2-3 hrs | 🟠 High |
| 6 | Phase 4 — First Aid | 3-4 hrs | 🟠 High |
| 7 | Phase 5 — Doctor Dashboard | 6-8 hrs | 🟠 High (largest) |
| 8 | Phase 7 — Key Info Extraction | 2-3 hrs | 🟡 Medium |
| 9 | Phase 9 — Deployment | 1-2 hrs | 🟠 High |

**Total estimated: ~22-30 hours**

---

## Open Questions

1. **Google Places API**: Do you have a Google Cloud account for real hospital search?
2. **Doctor Auth**: Simple email login (magic link) or password-based registration?
3. **Phone Calls**: Set up Retell phone number ($2/month) or browser-only for now?
4. **Deployment**: Vercel free tier (10s API timeout) or Vercel Pro ($20/month)?
