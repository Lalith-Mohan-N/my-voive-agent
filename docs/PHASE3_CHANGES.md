# Phase 3 — Implementation Changelog

This document lists every file created or modified in Phase 3 so judges can see exactly what was built.

---

## New Files

| File | Purpose |
|---|---|
| `app/api/retell/call/route.ts` | Server endpoint that creates a real Retell web call via the Retell SDK and returns `access_token` + `call_id` to the browser |
| `lib/audio/audio-pipeline.ts` | Web Audio API preprocessing chain: noise gate → compressor → normalisation. Provides `initAudioPipeline()`, `closeAudioPipeline()`, and real-time `AudioMetrics` |
| `hooks/useRetellCall.ts` | Browser hook wrapping `retell-client-js-sdk`. Requests mic, runs audio pipeline, POSTs to `/api/retell/call`, registers the live voice conversation |
| `components/dashboard/AudioPipelineVisualizer.tsx` | Live dual-waveform canvas (raw vs processed) + noise-gate/compressor/normalisation metering |
| `app/test-agent/page.tsx` | Full-screen **Agent Test Lab** with live call, audio visualiser, transcript feed, scenario-injection buttons, and capability cards |
| `docs/LLAMA_CUSTOMIZATION.md` | Judge-facing explanation of how Llama 3.1 70B was customised (prompt engineering, tool augmentation, memory, audio pipeline) |
| `docs/PHASE3_CHANGES.md` | This file — precise changelog |

## Modified Files

| File | Change |
|---|---|
| `lib/constants.ts` | Added **STRESSED-SPEECH HANDLING** section to `VITAVOICE_SYSTEM_PROMPT` — slows down responses, repeats keywords, forced-choice only when user panics |
| `types/index.ts` | Added `'registering'` to `CallStatus` union to support Retell Web SDK connection states |
| `components/dashboard/CallControls.tsx` | Added `registering` state UI, error display, and `error` prop |
| `app/page.tsx` | Replaced mocked `setTimeout` call flow with real `useRetellCall` hook integration; added `AudioPipelineVisualizer`; wired `effectiveCallStatus` from Retell |

## Environment Variables Needed

| Variable | Where | Purpose |
|---|---|---|
| `RETELL_API_KEY` | Server + client | Retell SDK authentication |
| `RETELL_AGENT_ID` | Server | Default agent ID for web call creation (or pass `agent_id` in POST body) |
| `SUPABASE_SERVICE_ROLE_KEY` | Server | Tool handlers write to DB |
| `NEXT_PUBLIC_SUPABASE_URL` | Client | Supabase realtime subscriptions |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Client | Supabase realtime subscriptions |

## How to Demo

1. `npm run dev`
2. Open `http://localhost:3000/test-agent`
3. Click **Start Voice Call** → browser requests mic → audio pipeline starts → Retell call created
4. Speak into the mic; watch the **raw vs processed waveforms** update in real time
5. Click **Inject: Siren-drowned vitals** or other scenario buttons to see how the agent would react
6. The live transcript, urgency badge, and noise level all update in real time via Supabase realtime

---

## Architecture Diagram

```
Browser Mic
    |
    v
Web Audio API Pipeline (noise gate → compressor → normalise)
    |
    +---> Raw Analyser ----> AudioPipelineVisualizer (raw waveform)
    |
    +---> Processed Analyser -> AudioPipelineVisualizer (clean waveform)
    |
    v
Retell Web SDK (retell-client-js-sdk)
    |
    v
Retell AI Cloud (Deepgram STT + Groq Llama 3.1 70B + ElevenLabs TTS)
    |
    v
Webhook POST /api/retell/webhook  ──►  Supabase (emergency_cases, case_timeline)
    |
    v
Tool call POST /api/retell/tools  ───►  Supabase (vitals_log, pending_confirmations, ...)
    |
    v
Supabase Realtime  ─────────────────►  Dashboard (LiveTranscript, UrgencyBadge, ...)
```
