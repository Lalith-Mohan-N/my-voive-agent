# VitaVoice - System Architecture & Workflow

## Project Goal
Ultra-low latency, noise-resilient voice agent for high-stress hands-busy environments (Emergency Medical Services).

## High-Level Architecture
Browser / Mobile Dashboard  ←→ Supabase Realtime
↑
WebSocket / API
↓
Retell AI (Voice Orchestration)
↓
Deepgram Nova-3 → Groq LLM → ElevenLabs TTS
↓
Tool Calling → Supabase Edge Functions / Direct


text

## Tech Stack
- **Voice Layer**: Retell AI + Deepgram + Groq + ElevenLabs
- **Backend/DB**: Supabase (PostgreSQL + Realtime + Auth)
- **Frontend**: Next.js 15 + Tailwind + shadcn/ui + framer-motion
- **Hosting**: Vercel (Frontend) + Supabase

## Key Tables (Supabase)
- emergency_cases
- vitals_log
- case_timeline
- hospitals (seed some real hospitals)

## Unique Differentiators (Wow Factors)
1. Noise-Adaptive Clarity Mode (Phase 1)
2. Double-Confirmation Safety Loop (Phase 2)
3. Predictive Risk Radar with time estimation (Phase 3) ← This is very unique

## UI/UX Requirements
- Dark medical theme (blacks, deep blues, neon green accents)
- Live scrolling transcript
- Vital signs grid with color coding
- Predictive Risk Radar component (circular visual)
- One-tap "End Call & Generate Report"
- Mobile responsive

## Non-Functional Requirements
- End-to-end latency target: <600ms
- Must work with background noise (sirens, traffic, shouting)
- All data saved in real database (no fake values)
- Live updates on dashboard when agent logs vitals or creates case