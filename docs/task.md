# VitaVoice v3 — Task Checklist

> Master task list for all 9 phases. Check off items as completed.

---

## Phase 1 — Noise Cancellation & Agent Speed 🔴
- [x] Update Retell agent `interruption_sensitivity` to 0.9 on all nodes
- [x] Switch non-critical nodes to `gpt-4.1-mini` for faster responses
- [x] Shorten global prompt to reduce LLM processing time
- [x] Set agent `voice_speed` to 1.1
- [x] Add bandpass filter (300Hz–3400Hz) to `audio-pipeline.ts`
- [x] Increase noise gate threshold to 0.04
- [x] Enable WebRTC noise suppression in getUserMedia constraints
- [x] Create `lib/audio/vad-detector.ts` (Voice Activity Detection)
- [x] Update `useRetellCall.ts` to pass processed audio stream
- [ ] Test with background noise (play siren audio during call)

## Phase 2 — Multilingual Support 🔴
- [x] Update Retell agent `language` to `multi`
- [x] Add multilingual instructions to global prompt
- [x] Update `scripts/setup-retell-agent.mjs` with new settings
- [x] Run setup script to apply changes
- [ ] Test: speak in Kannada and verify agent responds in Kannada
- [ ] Test: speak in Hindi and verify language switch

## Phase 3 — Real Hospital Data 🟠
- [ ] Get Google Cloud account + enable Places API + Geocoding API
- [ ] Add `GOOGLE_PLACES_API_KEY` to `.env.local`
- [ ] Create `lib/services/hospital-search.ts`
  - [ ] Google Places API nearby search integration
  - [ ] Geocoding (location text → lat/lng) fallback
  - [ ] 5-minute cache layer
  - [ ] Fallback to Supabase seed data on failure
- [ ] Modify `handleFindNearestHospital` in `tool-handlers.ts`
  - [ ] Accept lat/lng parameters
  - [ ] Use real Google Places data
  - [ ] Return distance, phone, open status
- [ ] Test: ask agent for nearby hospitals and verify real results

## Phase 4 — First Aid Guidance 🟠
- [ ] Create `lib/services/firstaid-advisor.ts`
  - [ ] Groq API integration with medical first aid prompt
  - [ ] Double-check mechanism (ask Groq to verify its own response)
  - [ ] Age-based dosage adjustment logic
- [ ] Add Retell tool: `provide_first_aid`
  - [ ] Parameters: chief_complaint, has_firstaid_kit, available_items, patient_age_category
  - [ ] Add to tool-handlers.ts switch
  - [ ] Add to setup script for Retell flow
- [ ] Add new conversation flow node: "First Aid Assessment"
- [ ] Update `app/api/retell/tools/route.ts` with new tool
- [ ] Test: tell agent about a wound, answer first aid kit question, verify advice

## Phase 5 — Doctor Dashboard 🟠
### Database
- [ ] Create `supabase/migrations/003_doctor_system.sql`
- [ ] Run migration in Supabase SQL Editor
- [ ] Verify tables: `doctors`, `case_assignments`, `doctor_messages`
- [ ] Verify new columns on `emergency_cases`

### Registration & Auth
- [ ] Create `app/doctor/login/page.tsx` — registration form
- [ ] Create `app/api/doctors/register/route.ts`
- [ ] Set up Supabase magic link or simple email auth
- [ ] Test: register a doctor with specialization

### Dashboard UI
- [ ] Create `app/doctor/dashboard/page.tsx`
- [ ] Create `app/doctor/dashboard/components/CaseList.tsx`
- [ ] Create `app/doctor/dashboard/components/CaseCard.tsx`
- [ ] Create `app/doctor/dashboard/components/DoctorCaseView.tsx`
- [ ] Create `app/doctor/dashboard/components/LiveLocationMap.tsx`
- [ ] Create `app/doctor/dashboard/components/DoctorChat.tsx`
- [ ] Create `app/doctor/dashboard/components/NotificationBell.tsx`
- [ ] Style dashboard with dark theme matching main app

### Case Assignment
- [ ] Create `app/api/doctors/cases/route.ts` (list + take case)
- [ ] Implement "Take Case" button → sets `assigned_doctor_id`, `agent_active = false`
- [ ] Add Supabase Realtime subscription for new cases
- [ ] Test: create case via voice → see it appear on doctor dashboard

### Notifications
- [ ] Implement Web Push notifications (service worker)
- [ ] Add audio alarm for new CRITICAL/URGENT cases
- [ ] Add `navigator.vibrate()` for mobile devices
- [ ] Test: trigger notification when new critical case arrives

### Doctor Takeover
- [ ] Modify tool handlers to check `agent_active` flag
- [ ] Agent announces: "A doctor is now handling your case"
- [ ] Create `check_doctor_status` tool
- [ ] If no doctor after 3 min, agent provides AI solution via Groq
- [ ] Test full flow: call → case created → doctor takes case → agent stops

### Doctor Messaging
- [ ] Create `app/api/doctors/messages/route.ts`
- [ ] Create `relay_doctor_message` Retell tool
- [ ] Agent reads doctor's message to user
- [ ] Test: doctor sends text → user hears it via agent

## Phase 6 — Device GPS Location 🟠
- [ ] Create `hooks/useDeviceLocation.ts`
  - [ ] Request GPS permission on call start
  - [ ] Continuous `watchPosition()` tracking
  - [ ] Return lat, lng, speed, accuracy, heading
- [ ] Create `app/api/location/update/route.ts`
- [ ] Modify `useRetellCall.ts` to send GPS on call start
- [ ] Update `handleCreateEmergencyCase` to accept lat/lng
- [ ] Implement `LiveLocationMap.tsx` with Leaflet.js
  - [ ] Real-time marker on map
  - [ ] Speed display
  - [ ] ETA calculation
- [ ] Test: start call on mobile → verify location appears on doctor dashboard

## Phase 7 — Key Info Extraction 🟡
- [ ] Create `lib/services/key-info-extractor.ts`
  - [ ] Groq API prompt for structured extraction
  - [ ] Categories: patient_info, symptoms, vitals, allergies, medications
- [ ] Modify `webhook-handler.ts` → `handleAgentMessage`
  - [ ] Run extractor after transcript logging
  - [ ] Store in `key_findings` JSONB column
- [ ] Create `components/dashboard/KeyFindings.tsx`
  - [ ] Color-coded chips by importance
- [ ] Add KeyFindings to both user and doctor dashboards
- [ ] Test: mention allergies during call → verify they appear as key findings

## Phase 8 — Case Numbers & Categories 🟡
- [ ] Modify `handleCreateEmergencyCase` in `tool-handlers.ts`
  - [ ] Generate human-readable case number (ACC-YYYYMMDD-NNN)
  - [ ] Auto-detect case type from complaint text
  - [ ] Store `case_number` and `case_type`
- [ ] Update agent prompt to ask for age category
- [ ] Update `CaseInfoCard.tsx` to display case number prominently
- [ ] Test: create case → verify unique readable case number

## Phase 9 — Production Deployment 🟠
- [ ] Create GitHub repository (if not exists)
- [ ] Push all code to GitHub
- [ ] Create Vercel account and connect repo
- [ ] Set all environment variables in Vercel dashboard
- [ ] Deploy to Vercel
- [ ] Update Retell tool URLs to production URL (e.g., `https://vitavoice.vercel.app/api/retell/tools`)
- [ ] Re-run `setup-retell-agent.mjs` with production URLs
- [ ] Publish Retell agent
- [ ] Test on mobile browser (Chrome on Android)
- [ ] Test on desktop browser (Chrome on Windows)
- [ ] (Optional) Buy Retell phone number for real phone calls
- [ ] (Optional) Assign VitaVoice agent to phone number

---

## Final Verification
- [ ] Full end-to-end test: user calls → case created → vitals logged → doctor notified → doctor takes case → agent stops → doctor communicates via text
- [ ] Mobile responsiveness check on doctor dashboard
- [ ] Load test: 3 simultaneous calls
- [ ] Noise cancellation test with loud background audio
- [ ] Multilingual test (English, Hindi, Kannada)
- [ ] First aid guidance test with different scenarios
- [ ] Hospital search with real location
- [ ] GPS tracking on moving device

---

**Total items: ~85 tasks across 9 phases**
