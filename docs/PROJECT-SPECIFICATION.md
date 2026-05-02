# VitaVoice - Full Project Specification

**Problem**: Voice Interfaces for High-Stress / Hands-Busy Environments

**Unique Value Proposition**:
The safest, fastest, and most noise-resilient voice AI medical assistant with Predictive Risk Radar.

**Core Wow Features**:
1. Noise-Adaptive Clarity Mode
2. Double-Confirmation Safety Loop for critical actions
3. Predictive Risk Radar (unique - shows future risk with time)

**Tech Stack**:
- Voice: Retell AI + Deepgram + Groq + ElevenLabs
- Backend: Supabase
- Frontend: Next.js 15 + shadcn/ui + Tailwind + framer-motion

**Non-functional Requirements**:
- End-to-end latency < 800ms
- Must handle Indian English + background noise (sirens, traffic)
- All actions must be saved in real database
- Dashboard must update live

**Success Criteria**:
- Live voice call works smoothly
- Dashboard shows real updates
- Predictive Risk Radar works
- UI looks professional and attractive to judges