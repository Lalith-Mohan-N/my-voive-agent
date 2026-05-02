# VitaVoice Phase 2 — AI Intelligence + Real Tools + Safety

Rewrite the system prompt for production-grade emergency medical use, wire 5 real Retell AI tools to Supabase, add noise/clarification/risk UI to the dashboard, and implement a double-confirmation safety loop.

---

## Step 1: Production-Grade System Prompt v2

**File:** `lib/constants.ts` (replace `VITAVOICE_SYSTEM_PROMPT`)

New prompt must include:
- **Domain expertise**: Indian ambulance context, common EMS shorthands (GCS, HR, BP, SpO2), local hospital names, Hindi/English code-mixing tolerance
- **Urgency classification logic**: Chain-of-thought reasoning before tagging [CRITICAL] / [URGENT] / [MEDIUM] / [LOW]
- **Ambiguity detection**: When vitals or symptoms are unclear, ask ONE targeted clarification instead of guessing
- **Safety-first reasoning**: Double-confirmation for all critical actions (dosages, route changes, hospital decisions)
- **Noise-adaptive behavior**: When confidence < 70%, switch to shorter responses, slower speech, and ask for repeat
- **Few-shot examples**: 3–4 realistic Indian EMS dialogue examples embedded in prompt
- **Tool calling discipline**: Always confirm verbally before/after executing any tool, never silently call tools

---

## Step 2: Define Retell AI Tool Schemas

**Deliverable:** JSON schema file `docs/retell-tool-schemas.json`

Five tools to register in Retell AI Dashboard:

| Tool | Purpose | Key Params |
|---|---|---|
| `create_emergency_case` | Open a new case row in `emergency_cases` | `patient_name`, `location`, `chief_complaint` |
| `log_vitals` | Write vitals to `vitals_log` | `case_id`, `bp`, `spo2`, `heart_rate`, `timestamp` |
| `get_patient_history` | Fetch prior cases/timeline by patient name | `patient_name` |
| `find_nearest_hospital` | Return nearest available hospital (stub) | `location` |
| `notify_supervisor` | Send alert to supervisor channel (stub) | `case_id`, `message` |

All schemas follow Retell AI function-calling format with strict `type: "object"` params and `required` arrays.

---

## Step 3: Build Tool-Calling API Route

**New file:** `app/api/retell/tools/route.ts`

- Receives POST from Retell AI mid-conversation with `{ tool_name, arguments, call_id }`
- Verifies Retell signature
- Routes to tool-specific handler
- Returns JSON result back to Retell within ~1s (Groq latency budget)
- All DB writes use `SUPABASE_SERVICE_ROLE_KEY` (server-side)

**Tool handler logic:**

1. **`create_emergency_case`** — Insert row into `emergency_cases` (status=active, urgency=LOW). Return `{ case_id, created }`.
2. **`log_vitals`** — Insert into `vitals_log`. Trigger realtime dashboard update. Return `{ recorded, vital_id }`.
3. **`get_patient_history`** — Query `emergency_cases` + `case_timeline` by `patient_name` (ILIKE match). Return top 3 prior cases with summaries.
4. **`find_nearest_hospital`** — Stub: query seeded `hospitals` table, sort by rough lat/lng delta vs. passed location string, return top 2 with capacity + specialties.
5. **`notify_supervisor`** — Stub: write a `case_timeline` entry with `event_type='system'` and content=`Supervisor alert: {message}`. If `SUPERVISOR_WEBHOOK_URL` env var exists, POST to it. Return `{ notified }`.

**Double-Confirmation Safety Loop:**
- Tool handler checks a new `pending_confirmations` table (or in-memory map keyed by `call_id`).
- If the tool is marked "critical" (e.g., `notify_supervisor` with CRITICAL urgency, or any future med-admin tool), handler returns: `{ status: "awaiting_confirmation", confirmation_id, repeat_instruction }`.
- Retell agent must ask user to confirm. On second call with `confirm: true`, the tool actually executes.
- Non-critical tools execute immediately.

---

## Step 4: Database Schema Updates

**New migration:** `supabase/migrations/002_phase2_tools_memory.sql`

Additions:
- **`conversation_memory`** table: `id, case_id, role(agent|user), content, reasoning_chain, timestamp`. Stores CoT reasoning and few-turn context for the LLM to reference.
- **`pending_confirmations`** table: `id, call_id, tool_name, payload, status(pending|confirmed|expired), created_at`. Enables double-confirmation safety loop.
- **`risk_predictions`** table: `id, case_id, risk_type, confidence, details, created_at`. Stores `assess_patient_risk` outputs (even though the main tool list has `get_patient_history` instead, the prompt still asks the agent to assess risk internally and log it here).
- Update `case_timeline` `event_type` enum: add `clarification_request`, `tool_call`, `risk_alert`, `confirmation_needed`.
- Enable Realtime on all new tables.
- Add RLS read policies for anon role.

---

## Step 5: Dashboard UI Enhancements

**Update `app/page.tsx` layout:**
- Left column gains a **NoiseLevelIndicator** card (reads `activeCase.noiseLevel`, shows icon + label from `NOISE_CONFIG`)
- Left column gains a **ClarificationPanel** card (subscribes to `case_timeline` where `event_type='clarification_request'`, shows latest agent question waiting for user answer)
- Right column gains a **RiskPredictionCard** (subscribes to `risk_predictions`, shows latest risk assessment with confidence %)

**New components:**
- `components/dashboard/NoiseLevelIndicator.tsx` — color-coded badge + icon from constants
- `components/dashboard/ClarificationPanel.tsx` — shows pending clarification with a "Resolved" timestamp when answered
- `components/dashboard/RiskPredictionCard.tsx` — shows risk type, confidence bar, and detail text

**Updates to existing components:**
- `CaseInfoCard.tsx` — add noise adaptive mode badge inline
- `UrgencyBadge.tsx` — already color-coded; no change needed
- `LiveTranscript.tsx` — render new event types (`tool_call`, `risk_alert`, `confirmation_needed`) with distinct styling

---

## Step 6: Update Hooks & Types

**`types/index.ts`**:
- Add `RiskPrediction` interface
- Add `ConversationMemoryEntry` interface
- Add `PendingConfirmation` interface
- Add new `TimelineEventType` variants

**`lib/supabase/types.ts`**:
- Mirror all new tables and enum expansions for strict TypeScript

**`hooks/useRealtimeCase.ts`**:
- Also subscribe to `noise_level` and `noise_adaptive_mode` changes so UI reflects agent-detected noise updates

**New hook:** `hooks/useRiskPredictions(caseId)` — realtime subscription to `risk_predictions`

**New hook:** `hooks/usePendingClarifications(caseId)` — realtime subscription to `case_timeline` filtered by `clarification_request`

---

## Step 7: Webhook Handler Updates

**`lib/retell/webhook-handler.ts`**:
- On `call_started`, also insert an initial `conversation_memory` row with system context
- On `call_ended`, summarize the full `conversation_memory` into `emergency_cases.summary`
- On `agent_message` (if Retell sends it), parse for `[CRITICAL]`, `[URGENT]`, etc. and update case urgency in real time (not just at call end)
- Detect agent-detected noise mentions (e.g., agent says "Noisy environment detected") and update `noise_level` / `noise_adaptive_mode` on the case row

---

## Step 8: Conversation Memory Implementation

**Per-session memory strategy:**
- Every `agent_message` and `user_message` from Retell is appended to `conversation_memory` via the tools API or webhook
- On each new tool call, the tool handler fetches the last N (e.g., 10) memory entries for that `case_id` and includes them in the tool result metadata so the LLM has context
- This avoids paying for a full context window rebuild while keeping the agent coherent across a 10–15 minute ambulance call

---

## Step 9: Testing & Validation

**New tests:**
- `__tests__/unit/lib/retell/tool-handlers.test.ts` — each tool handler with mocked Supabase
- `__tests__/integration/tool-calling-endpoint.test.ts` — full POST → tool execution → DB write → realtime broadcast
- `__tests__/unit/components/NoiseLevelIndicator.test.tsx`
- `__tests__/unit/components/RiskPredictionCard.test.tsx`

**Existing test updates:**
- Update webhook-handler tests to cover `agent_message` urgency updates

---

## Step 10: Retell AI Configuration Instructions

Documented in `docs/PHASE2_RETELL_SETUP.md`:
1. Copy the System Prompt v2 into Retell Dashboard → Agent → System Prompt
2. Register each of the 5 tool schemas in Retell Dashboard → Agent → Tools
3. Set Tool Endpoint URL to `https://your-app.com/api/retell/tools`
4. Enable "Always confirm tool calls verbally" in Retell settings (aligns with our safety loop)
5. Set LLM to `llama-3.1-70b` via Groq in Retell model settings
6. Test with a sample call: say "Patient is unconscious, BP 80/50, HR 140" → verify `create_emergency_case` + `log_vitals` fire and dashboard updates live

---

## Files Changed Summary

| File | Action |
|---|---|
| `lib/constants.ts` | Rewrite `VITAVOICE_SYSTEM_PROMPT` |
| `app/api/retell/tools/route.ts` | **New** — tool execution endpoint |
| `lib/retell/tool-handlers.ts` | **New** — 5 tool implementations |
| `lib/retell/types.ts` | Add tool request/response types |
| `lib/retell/webhook-handler.ts` | Add `agent_message` handling, memory writes |
| `supabase/migrations/002_phase2_tools_memory.sql` | **New** — schema additions |
| `lib/supabase/types.ts` | Add new table types |
| `types/index.ts` | Add new app-level interfaces |
| `app/page.tsx` | Add new dashboard panels |
| `components/dashboard/NoiseLevelIndicator.tsx` | **New** |
| `components/dashboard/ClarificationPanel.tsx` | **New** |
| `components/dashboard/RiskPredictionCard.tsx` | **New** |
| `components/dashboard/LiveTranscript.tsx` | Style new event types |
| `components/dashboard/CaseInfoCard.tsx` | Show noise badge |
| `hooks/useRiskPredictions.ts` | **New** |
| `hooks/usePendingClarifications.ts` | **New** |
| `hooks/useRealtimeCase.ts` | Subscribe to noise updates |
| `docs/retell-tool-schemas.json` | **New** — schemas to paste into Retell |
| `docs/PHASE2_RETELL_SETUP.md` | **New** — configuration walkthrough |

---

## Open Dependency Notes

- No new npm packages required (uses existing `retell-sdk`, `@supabase/supabase-js`)
- `find_nearest_hospital` stub requires no API key; to go live, user can swap in Google Maps / MapMyIndia API
- `notify_supervisor` stub uses env var `SUPERVISOR_WEBHOOK_URL`; if unset, it logs to timeline only
