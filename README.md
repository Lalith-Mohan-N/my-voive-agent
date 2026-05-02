# VitaVoice — AI Medical Voice Assistant

> Ultra-reliable voice AI for high-stress, hands-busy medical environments.
> Real-time emergency case management with noise-adaptive clarity.

![Phase](https://img.shields.io/badge/Phase-1%20Core%20Voice%20Loop-00ff88)
![Next.js](https://img.shields.io/badge/Next.js-16.2.4-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178c6)
![License](https://img.shields.io/badge/License-Private-red)

---

## Overview

VitaVoice is an AI-powered medical voice assistant designed for Emergency Medical Services (EMS). It operates in high-noise environments (ambulances, ERs, field scenes) and provides:

- **Ultra-low latency** voice interactions (<700ms target)
- **Noise-Adaptive Clarity Mode** — automatically detects noisy environments and adapts
- **Real-time live dashboard** — transcript, vitals, urgency tracking
- **Automated urgency classification** — CRITICAL, URGENT, MEDIUM, LOW

## Architecture

```
┌─────────────────────────────────────────────────┐
│                  Browser Dashboard               │
│         (Next.js 16 + Tailwind + React 19)       │
│                                                   │
│  ┌────────────┐ ┌──────────┐ ┌───────────────┐  │
│  │Call Status  │ │Transcript│ │ Vitals + Urgency│ │
│  │  Panel     │ │  (Live)  │ │    Grid        │  │
│  └────────────┘ └──────────┘ └───────────────┘  │
│           ↕ Supabase Realtime (WebSocket)         │
└──────────────────────┬──────────────────────────┘
                       │
┌──────────────────────┴──────────────────────────┐
│              Supabase (PostgreSQL)                │
│  ┌──────────────┐ ┌──────────┐ ┌────────────┐   │
│  │emergency_cases│ │case_     │ │vitals_log  │   │
│  │              │ │timeline  │ │            │   │
│  └──────────────┘ └──────────┘ └────────────┘   │
└──────────────────────┬──────────────────────────┘
                       │ Webhook POST
┌──────────────────────┴──────────────────────────┐
│           Retell AI (Voice Orchestration)         │
│                                                   │
│    Deepgram Nova-3 → Groq Llama 3.1 → ElevenLabs │
│      (STT)            (LLM)           (TTS)      │
└──────────────────────────────────────────────────┘
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Voice Orchestration | Retell AI |
| Speech-to-Text | Deepgram Nova-3 |
| LLM | Groq + Llama 3.1 70B |
| Text-to-Speech | ElevenLabs Flash v2.5 |
| Frontend | Next.js 16 + React 19 + Tailwind CSS 4 |
| Database | Supabase (PostgreSQL + Realtime) |
| Animations | Framer Motion + CSS Keyframes |
| Hosting | Vercel + Supabase |

## Quick Start

### Prerequisites

- Node.js 20+
- npm or pnpm
- Supabase account
- Retell AI account
- Groq API key

### Setup

```bash
# 1. Clone the repo
git clone https://github.com/Lalith-Mohan-N/my-voive-agent.git
cd my-voive-agent

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp .env.local.example .env.local
# Edit .env.local with your API keys

# 4. Run the database migration
# Copy contents of supabase/migrations/001_initial_schema.sql
# and run it in your Supabase SQL Editor

# 5. Start the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the dashboard.

## Project Structure

```
├── app/
│   ├── api/retell/webhook/route.ts    # Retell webhook handler
│   ├── globals.css                     # Dark medical theme
│   ├── layout.tsx                      # Root layout
│   └── page.tsx                        # Main dashboard
├── components/
│   ├── dashboard/                      # Dashboard-specific components
│   │   ├── DashboardHeader.tsx
│   │   ├── CallStatusPanel.tsx
│   │   ├── LiveTranscript.tsx
│   │   ├── UrgencyBadge.tsx
│   │   ├── VitalsGrid.tsx
│   │   ├── CaseInfoCard.tsx
│   │   └── CallControls.tsx
│   └── ui/                            # Reusable UI primitives
│       ├── Card.tsx
│       ├── Badge.tsx
│       ├── Button.tsx
│       ├── Skeleton.tsx
│       └── StatusDot.tsx
├── hooks/                             # React hooks (realtime)
│   ├── useRealtimeTranscript.ts
│   ├── useRealtimeCase.ts
│   └── useCallStatus.ts
├── lib/                               # Core libraries
│   ├── supabase/                      # Supabase clients + types
│   ├── retell/                        # Retell SDK + webhook logic
│   ├── constants.ts                   # App constants
│   └── utils.ts                       # Utility functions
├── types/                             # Shared TypeScript types
├── supabase/migrations/               # SQL migrations
├── __tests__/                         # Unit + integration tests
└── docs/                              # Project documentation
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/retell/webhook` | Retell AI webhook receiver |
| `GET` | `/api/retell/webhook` | Webhook health check |

## Phase Roadmap

| Phase | Feature | Status |
|-------|---------|--------|
| 1 | Core Voice Loop + Live Dashboard | ✅ Current |
| 2 | Double-Confirmation Safety Loop | 🔜 Planned |
| 3 | Predictive Risk Radar | 🔜 Planned |

## Testing

```bash
npm test              # Run all tests
npm run test:watch    # Watch mode
npm run test:coverage # Coverage report
```

## License

Private — All rights reserved.
