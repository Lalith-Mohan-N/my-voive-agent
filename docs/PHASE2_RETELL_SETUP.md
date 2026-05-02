# VitaVoice Phase 2 — Retell AI Configuration Guide

## Prerequisites

- Phase 1 database migration (`001_initial_schema.sql`) already executed in Supabase
- Phase 2 migration (`002_phase2_tools_memory.sql`) executed in Supabase SQL Editor
- Environment variables set in `.env.local`:
  - `RETELL_API_KEY`
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `GROQ_API_KEY`

---

## Step 1: Update the System Prompt in Retell Dashboard

1. Open [Retell AI Dashboard](https://dashboard.retellai.com)
2. Go to **Agents** → Select your VitaVoice agent
3. Replace the existing System Prompt with the contents of `lib/constants.ts` (`VITAVOICE_SYSTEM_PROMPT`)
4. Ensure the prompt includes the 6 tool names so the LLM knows it can call them

---

## Step 2: Register Tool Schemas

1. In Retell Dashboard → Agent → **Tools**
2. For each tool in `docs/retell-tool-schemas.json`, click **Add Tool**
3. Paste the JSON schema for each tool:
   - `create_emergency_case`
   - `log_vitals`
   - `get_patient_history`
   - `find_nearest_hospital`
   - `notify_supervisor`
   - `set_noise_level`
4. Set **Tool Endpoint URL** to:
   - Production: `https://your-app.vercel.app/api/retell/tools`
   - Local dev (via ngrok): `https://your-id.ngrok.io/api/retell/tools`
5. Enable **Always confirm tool calls verbally** (aligns with our double-confirmation safety loop)

---

## Step 3: Configure LLM Settings

1. Set **Model** to `llama-3.1-70b` via Groq
2. Set **Base URL** to `https://api.groq.com/openai/v1`
3. Add your Groq API key in Retell Dashboard → Settings → LLM Keys
4. Set **Response Latency Target** to `700ms`
5. Enable **STT Noise Reduction** (Deepgram Nova-3 handles this automatically)

---

## Step 4: Configure Webhooks

1. Retell Dashboard → Agent → **Webhooks**
2. Set **Webhook URL** to:
   - Production: `https://your-app.vercel.app/api/retell/webhook`
   - Local dev: `https://your-id.ngrok.io/api/retell/webhook`
3. Select events:
   - `call_started`
   - `call_ended`
   - `call_analyzed`
   - `agent_message`

---

## Step 5: Test the Full Flow

### Test 1: Create Emergency Case
Say: *"Patient Ramesh, chest pain on NH-44 near Koyambedu"*

Expected:
- Agent responds with `[URGENT]` tag
- Agent calls `create_emergency_case`
- Dashboard shows new case with patient name, location, complaint

### Test 2: Log Vitals
Say: *"Heart rate 140, BP 80 over 50, SpO2 92"*

Expected:
- Agent asks for confirmation: "Confirm BP eighty over fifty?"
- After "yes", agent calls `log_vitals`
- VitalsGrid updates in real time with color-coded warnings

### Test 3: Noise Adaptation
Say: *(garbled)* or explicitly: *"It's very noisy here"*

Expected:
- Agent says: "Noisy environment. Speaking clearer."
- Agent calls `set_noise_level` with `high`
- Dashboard NoiseLevelIndicator turns orange
- CaseInfoCard shows "Noise-Adaptive Clarity Mode Active"

### Test 4: Double-Confirmation (Supervisor Alert)
Say: *"This is critical, notify supervisor now"*

Expected:
- Agent asks: "Send supervisor alert: [message]. Confirm? Say yes or no."
- If you say "yes", `notify_supervisor` executes
- If you say "no", agent aborts and asks again
- A `pending_confirmations` row is created in Supabase

### Test 5: Patient History
Say: *"Check history for patient Sharma"*

Expected:
- Agent calls `get_patient_history`
- Returns up to 3 prior cases from `emergency_cases` table

### Test 6: Find Hospital
Say: *"Nearest trauma hospital"*

Expected:
- Agent calls `find_nearest_hospital` with `required_specialty: 'trauma'`
- Returns top 2 available hospitals from seeded data

---

## Troubleshooting

### Tool calls not reaching the endpoint
- Verify ngrok/Vercel URL is correct and publicly accessible
- Check Retell Dashboard → Logs for tool call attempts
- Add `console.log` in `app/api/retell/tools/route.ts`

### Dashboard not updating live
- Ensure Supabase Realtime is enabled for all tables in `002_phase2_tools_memory.sql`
- Check browser console for WebSocket errors
- Verify `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### Double-confirmation not working
- Ensure `notify_supervisor` is listed in `CRITICAL_TOOLS` in `lib/retell/tool-handlers.ts`
- Check `pending_confirmations` table for stuck `pending` rows

### Noise level not updating
- Confirm `set_noise_level` tool is registered in Retell Dashboard
- Verify agent is actually calling it (check Retell Logs)
- Test the tool endpoint directly with curl:
  ```bash
  curl -X POST https://your-app.com/api/retell/tools \
    -H "Content-Type: application/json" \
    -d '{"call_id":"test","tool_name":"set_noise_level","arguments":{"level":"high"}}'
  ```
