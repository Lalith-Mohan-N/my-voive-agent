# VitaVoice — Phase 1: Core Voice Loop + Live Dashboard

## Background

VitaVoice is an ultra-low latency, noise-resilient AI medical voice assistant designed for high-stress, hands-busy environments (ambulances, ER, field). Phase 1 establishes the **Core Voice Loop** and a **Live Dashboard** with real-time transcript, call status, and urgency color coding.

**Existing state**: Fresh Next.js 16.2.4 project (App Router) with Tailwind CSS v4, pnpm, React 19. No application code written yet — just the scaffold.

---

## User Review Required

> [!IMPORTANT]
> **API Keys Required** — You must provide valid API keys in `.env.local` before the app can function:
> - `RETELL_API_KEY` — from [Retell AI Dashboard](https://dashboard.retellai.com)
> - `NEXT_PUBLIC_SUPABASE_URL` — from Supabase project settings
> - `NEXT_PUBLIC_SUPABASE_ANON_KEY` — from Supabase project settings
> - `SUPABASE_SERVICE_ROLE_KEY` — for server-side operations
> - `GROQ_API_KEY` — from [Groq Console](https://console.groq.com)

> [!WARNING]
> **Supabase Table Setup** — The SQL migration file will be created but must be executed manually in your Supabase Dashboard SQL Editor (or via Supabase CLI) to create the required tables and enable Realtime replication.

## Open Questions

> [!IMPORTANT]
> 1. **Retell AI Agent ID** — Do you already have a Retell AI agent created? If not, the code will include a setup script to create one programmatically via the SDK.
> 2. **Supabase Project** — Do you have an existing Supabase project, or should I include instructions for creating one?
> 3. **Deployment** — Should I configure Vercel deployment settings, or is local dev sufficient for now?

---

## Proposed Project Structure

```
my-voive-agent/
├── app/
│   ├── layout.tsx                          # Root layout — dark theme, Inter font
│   ├── page.tsx                            # Main dashboard page
│   ├── globals.css                         # Design system — dark medical theme
│   ├── favicon.ico
│   └── api/
│       └── retell/
│           └── webhook/
│               └── route.ts               # Retell AI webhook handler (POST)
├── components/
│   ├── dashboard/
│   │   ├── DashboardHeader.tsx            # App header with logo + status
│   │   ├── CallStatusPanel.tsx            # Call state indicator (active/idle/ended)
│   │   ├── LiveTranscript.tsx             # Real-time scrolling transcript
│   │   ├── UrgencyBadge.tsx               # Color-coded urgency tag component
│   │   ├── VitalsGrid.tsx                 # Vital signs display grid
│   │   ├── CaseInfoCard.tsx               # Active emergency case details
│   │   └── CallControls.tsx               # Start/End call controls
│   └── ui/
│       ├── Card.tsx                        # Reusable card component
│       ├── Badge.tsx                       # Reusable badge component
│       ├── Button.tsx                      # Reusable button component
│       ├── Skeleton.tsx                    # Loading skeleton component
│       └── StatusDot.tsx                   # Animated status indicator
├── lib/
│   ├── supabase/
│   │   ├── client.ts                      # Browser Supabase client
│   │   ├── server.ts                      # Server-side Supabase client
│   │   └── types.ts                       # Database type definitions
│   ├── retell/
│   │   ├── client.ts                      # Retell SDK client wrapper
│   │   ├── webhook-handler.ts             # Webhook event processing logic
│   │   └── types.ts                       # Retell event type definitions
│   ├── constants.ts                       # App-wide constants (urgency levels, etc.)
│   └── utils.ts                           # Utility functions
├── hooks/
│   ├── useRealtimeTranscript.ts           # Supabase realtime for transcripts
│   ├── useRealtimeCase.ts                 # Supabase realtime for case updates
│   └── useCallStatus.ts                   # Call status management hook
├── types/
│   └── index.ts                           # Shared TypeScript type definitions
├── supabase/
│   └── migrations/
│       └── 001_initial_schema.sql         # Database schema + RLS + Realtime
├── __tests__/
│   ├── unit/
│   │   ├── lib/
│   │   │   ├── retell/webhook-handler.test.ts
│   │   │   ├── retell/client.test.ts
│   │   │   └── utils.test.ts
│   │   ├── components/
│   │   │   ├── UrgencyBadge.test.tsx
│   │   │   ├── LiveTranscript.test.tsx
│   │   │   ├── CallStatusPanel.test.tsx
│   │   │   └── VitalsGrid.test.tsx
│   │   └── hooks/
│   │       └── useRealtimeTranscript.test.ts
│   └── integration/
│       ├── webhook-endpoint.test.ts       # Full POST → DB write flow
│       └── realtime-subscription.test.ts  # Supabase realtime event flow
├── docs/                                  # Existing docs (untouched)
├── public/
├── .env.local.example                     # Template for env vars
├── .gitignore
├── jest.config.ts                         # Jest configuration
├── jest.setup.ts                          # Jest setup file
├── README.md                              # Project README
├── DEVELOPMENT.md                         # Development guide
├── next.config.ts
├── package.json
├── tsconfig.json
└── postcss.config.mjs
```

---

## Proposed Changes

### 1. Database Layer (Supabase)

#### [NEW] [001_initial_schema.sql](file:///c:/Users/Lenovo/my-voive-agent/supabase/migrations/001_initial_schema.sql)

SQL migration that creates:
- **`emergency_cases`** — Stores case metadata (patient name, location, urgency, status, noise level)
- **`case_timeline`** — Event log per case (transcript entries, status changes, vital entries)
- **`vitals_log`** — Structured vital sign readings (HR, BP, SpO2, temp, GCS)
- **`hospitals`** — Seed data for nearby hospitals
- Row Level Security (RLS) policies for anon key access
- Enable Realtime replication on `emergency_cases`, `case_timeline`, `vitals_log`

---

### 2. Supabase Client Layer

#### [NEW] [types.ts](file:///c:/Users/Lenovo/my-voive-agent/lib/supabase/types.ts)

Full TypeScript type definitions generated from the database schema. Includes `Database`, `Tables`, and row types for `emergency_cases`, `case_timeline`, `vitals_log`, `hospitals`.

#### [NEW] [client.ts](file:///c:/Users/Lenovo/my-voive-agent/lib/supabase/client.ts)

Browser-side Supabase client using `@supabase/supabase-js` `createClient` with `NEXT_PUBLIC_*` env vars. Singleton pattern.

#### [NEW] [server.ts](file:///c:/Users/Lenovo/my-voive-agent/lib/supabase/server.ts)

Server-side Supabase client using service role key for privileged operations (webhook writes).

---

### 3. Retell AI Integration

#### [NEW] [types.ts](file:///c:/Users/Lenovo/my-voive-agent/lib/retell/types.ts)

TypeScript types for Retell webhook events: `call_started`, `call_ended`, `call_analyzed`, `agent_message`, `transcript_update`. Maps the JSON payloads.

#### [NEW] [client.ts](file:///c:/Users/Lenovo/my-voive-agent/lib/retell/client.ts)

Retell SDK wrapper — initializes the SDK client, exposes `verify()` for webhook signature validation, and helper to create/list calls.

#### [NEW] [webhook-handler.ts](file:///c:/Users/Lenovo/my-voive-agent/lib/retell/webhook-handler.ts)

Core business logic for processing Retell webhook events:
- `call_started` → Create `emergency_cases` row + initial timeline entry
- `call_ended` → Update case status to `completed`, log summary
- `agent_message` / transcript updates → Insert into `case_timeline`
- Urgency detection from transcript content (regex for [CRITICAL], [URGENT], etc.)
- Vitals extraction and logging to `vitals_log`

#### [NEW] [route.ts](file:///c:/Users/Lenovo/my-voive-agent/app/api/retell/webhook/route.ts)

Next.js App Router API route handler:
- `POST` — Receives Retell webhook, verifies signature via `x-retell-signature` header, delegates to `webhook-handler.ts`, returns 200
- Proper error handling with structured error responses

---

### 4. Shared Types & Utilities

#### [NEW] [types/index.ts](file:///c:/Users/Lenovo/my-voive-agent/types/index.ts)

Shared application types: `UrgencyLevel` enum, `CallStatus` enum, `TranscriptEntry`, `VitalReading`, `EmergencyCase`.

#### [NEW] [lib/constants.ts](file:///c:/Users/Lenovo/my-voive-agent/lib/constants.ts)

Constants: urgency level colors/labels, vital sign normal ranges, system prompt text for VitaVoice.

#### [NEW] [lib/utils.ts](file:///c:/Users/Lenovo/my-voive-agent/lib/utils.ts)

Utility functions: `cn()` for classname merging, `formatTimestamp()`, `parseUrgencyFromText()`, `extractVitalsFromText()`.

---

### 5. React Hooks (Realtime)

#### [NEW] [hooks/useRealtimeTranscript.ts](file:///c:/Users/Lenovo/my-voive-agent/hooks/useRealtimeTranscript.ts)

Custom hook subscribing to `case_timeline` Supabase Realtime `INSERT` events filtered by `case_id`. Returns live transcript array and loading state.

#### [NEW] [hooks/useRealtimeCase.ts](file:///c:/Users/Lenovo/my-voive-agent/hooks/useRealtimeCase.ts)

Custom hook subscribing to `emergency_cases` Realtime `UPDATE` events for the active case. Returns case data (urgency, status, patient info).

#### [NEW] [hooks/useCallStatus.ts](file:///c:/Users/Lenovo/my-voive-agent/hooks/useCallStatus.ts)

Custom hook managing call lifecycle state (idle → ringing → active → ended). Derives from realtime case updates.

---

### 6. UI Components

#### [NEW] [components/ui/Card.tsx](file:///c:/Users/Lenovo/my-voive-agent/components/ui/Card.tsx)
Glassmorphism card with dark backdrop blur, subtle border glow. Variants: default, elevated, urgency-bordered.

#### [NEW] [components/ui/Badge.tsx](file:///c:/Users/Lenovo/my-voive-agent/components/ui/Badge.tsx)
Color-coded badge for urgency levels. Uses constants for CRITICAL (red pulse), URGENT (amber), MEDIUM (blue), LOW (green).

#### [NEW] [components/ui/Button.tsx](file:///c:/Users/Lenovo/my-voive-agent/components/ui/Button.tsx)
Styled button with variants: primary (neon green), danger (red), ghost. Includes loading state with spinner.

#### [NEW] [components/ui/Skeleton.tsx](file:///c:/Users/Lenovo/my-voive-agent/components/ui/Skeleton.tsx)
Animated loading skeleton with shimmer effect for loading states.

#### [NEW] [components/ui/StatusDot.tsx](file:///c:/Users/Lenovo/my-voive-agent/components/ui/StatusDot.tsx)
Animated pulsing dot for live status indication (green = active, red = critical, gray = idle).

---

### 7. Dashboard Components

#### [NEW] [components/dashboard/DashboardHeader.tsx](file:///c:/Users/Lenovo/my-voive-agent/components/dashboard/DashboardHeader.tsx)
App header: VitaVoice logo with heartbeat animation, connection status indicator, current time.

#### [NEW] [components/dashboard/CallStatusPanel.tsx](file:///c:/Users/Lenovo/my-voive-agent/components/dashboard/CallStatusPanel.tsx)
Large status card showing current call state with animated transitions. Displays call duration timer when active.

#### [NEW] [components/dashboard/LiveTranscript.tsx](file:///c:/Users/Lenovo/my-voive-agent/components/dashboard/LiveTranscript.tsx)
Scrolling transcript feed with auto-scroll to bottom. Each entry shows speaker (Agent/User), timestamp, urgency tags highlighted inline. Noise-adaptive clarity mode indicator.

#### [NEW] [components/dashboard/UrgencyBadge.tsx](file:///c:/Users/Lenovo/my-voive-agent/components/dashboard/UrgencyBadge.tsx)
Prominent urgency display — large badge with pulsing animation for CRITICAL/URGENT levels.

#### [NEW] [components/dashboard/VitalsGrid.tsx](file:///c:/Users/Lenovo/my-voive-agent/components/dashboard/VitalsGrid.tsx)
2×3 grid of vital sign cards (HR, BP, SpO2, Temp, GCS, RR). Each shows value, unit, normal range indicator (green/yellow/red), and last updated timestamp.

#### [NEW] [components/dashboard/CaseInfoCard.tsx](file:///c:/Users/Lenovo/my-voive-agent/components/dashboard/CaseInfoCard.tsx)
Active case details: patient info, location, case ID, EMS unit, case start time.

#### [NEW] [components/dashboard/CallControls.tsx](file:///c:/Users/Lenovo/my-voive-agent/components/dashboard/CallControls.tsx)
Call control buttons: "Start Call" (initiates Retell call), "End Call & Generate Report". Uses Retell Web SDK for browser-based calling.

---

### 8. Page & Layout Updates

#### [MODIFY] [globals.css](file:///c:/Users/Lenovo/my-voive-agent/app/globals.css)

Complete overhaul to dark medical theme design system:
- CSS custom properties for the dark palette (blacks, deep blues, neon green `#00ff88`)
- Urgency color tokens (critical red, urgent amber, medium blue, low green)
- Glassmorphism utility classes
- Keyframe animations (pulse, glow, heartbeat, shimmer, slide-in)
- Scrollbar styling for the transcript feed
- Typography scale

#### [MODIFY] [layout.tsx](file:///c:/Users/Lenovo/my-voive-agent/app/layout.tsx)

- Replace Geist fonts with Inter (body) + JetBrains Mono (monospace)
- Update metadata: title "VitaVoice | AI Medical Voice Assistant", description
- Force dark mode via `className="dark"` on `<html>`
- Add proper `<meta>` tags for SEO

#### [MODIFY] [page.tsx](file:///c:/Users/Lenovo/my-voive-agent/app/page.tsx)

Complete rewrite — becomes the main dashboard:
- Server component that fetches initial case data from Supabase
- Renders the dashboard layout grid:
  - Left column: CallStatusPanel + CaseInfoCard + CallControls
  - Center: LiveTranscript (largest area)
  - Right column: UrgencyBadge + VitalsGrid

---

### 9. Configuration Updates

#### [MODIFY] [package.json](file:///c:/Users/Lenovo/my-voive-agent/package.json)

Add dependencies:
- `retell-sdk` — Retell AI server SDK
- `retell-client-js-sdk` — Retell browser client
- `groq-sdk` — Groq LLM client  
- `framer-motion` — animations
- `clsx` + `tailwind-merge` — className utilities

Add dev dependencies:
- `jest` + `@jest/globals` — test runner
- `ts-jest` — TypeScript Jest transformer
- `@testing-library/react` + `@testing-library/jest-dom` — component testing
- `jest-environment-jsdom` — browser environment for tests

Add scripts:
- `"test"` → `jest`
- `"test:watch"` → `jest --watch`
- `"test:coverage"` → `jest --coverage`

#### [NEW] [.env.local.example](file:///c:/Users/Lenovo/my-voive-agent/.env.local.example)

Template showing all required environment variables with placeholder values.

#### [MODIFY] [next.config.ts](file:///c:/Users/Lenovo/my-voive-agent/next.config.ts)

Add `serverExternalPackages: ['retell-sdk']` for Node.js SDK compatibility.

---

### 10. Testing

#### [NEW] [jest.config.ts](file:///c:/Users/Lenovo/my-voive-agent/jest.config.ts)
Jest configuration with `ts-jest`, path aliases matching `tsconfig.json`, jsdom environment for component tests.

#### [NEW] [jest.setup.ts](file:///c:/Users/Lenovo/my-voive-agent/jest.setup.ts)
Jest setup importing `@testing-library/jest-dom` matchers.

#### Unit Tests

| Test File | Coverage |
|-----------|----------|
| `webhook-handler.test.ts` | All event types (call_started, call_ended, transcript), urgency detection, vitals extraction, error handling |
| `client.test.ts` | SDK initialization, signature verification mock |
| `utils.test.ts` | `parseUrgencyFromText`, `extractVitalsFromText`, `formatTimestamp`, `cn` |
| `UrgencyBadge.test.tsx` | Renders correct color/label per urgency level |
| `LiveTranscript.test.tsx` | Renders entries, auto-scrolls, handles empty state |
| `CallStatusPanel.test.tsx` | Renders each call state correctly |
| `VitalsGrid.test.tsx` | Renders vitals with correct range indicators |
| `useRealtimeTranscript.test.ts` | Subscription setup/teardown, state updates |

#### Integration Tests

| Test File | Coverage |
|-----------|----------|
| `webhook-endpoint.test.ts` | Full POST → signature verify → DB write → 200 response |
| `realtime-subscription.test.ts` | DB insert triggers realtime event → hook state update |

---

### 11. Documentation

#### [MODIFY] [README.md](file:///c:/Users/Lenovo/my-voive-agent/README.md)

Complete rewrite:
- Project overview & architecture diagram (mermaid)
- Tech stack breakdown
- Quick start guide (env setup, DB migration, run dev)
- Project structure tree
- API endpoint documentation
- Phase roadmap

#### [NEW] [DEVELOPMENT.md](file:///c:/Users/Lenovo/my-voive-agent/DEVELOPMENT.md)

Comprehensive development guide:
- Prerequisites (Node 20+, pnpm, Supabase account, Retell AI account, Groq API key)
- Environment setup step-by-step
- Database setup (running migrations, enabling Realtime)
- Local development workflow (ngrok for webhooks)
- Testing guide (unit, integration, coverage)
- Code style & conventions
- Debugging tips
- Deployment guide (Vercel)

---

## Verification Plan

### Automated Tests
```bash
pnpm test              # Run all unit + integration tests
pnpm test:coverage     # Generate coverage report
```

**Target: >80% coverage** on `lib/retell/`, `lib/utils.ts`, and all component render tests passing.

### Manual Verification
1. **Build check**: `pnpm build` — ensures no TypeScript errors and all imports resolve
2. **Dev server**: `pnpm dev` — dashboard loads with dark theme, loading states display correctly
3. **Visual**: Dashboard shows dark medical theme with neon green accents, glassmorphism cards, proper urgency color coding
4. **Webhook**: POST to `/api/retell/webhook` with mock payload → returns 200 and data appears in Supabase

### Browser Verification
- Open dashboard at `http://localhost:3000`
- Verify dark theme renders correctly
- Verify loading skeletons appear for transcript/vitals when no data
- Verify all components are responsive

---

## Execution Order

1. Install dependencies (`package.json` + `pnpm install`)
2. Database schema (`supabase/migrations/`)
3. Type definitions (`types/`, `lib/supabase/types.ts`, `lib/retell/types.ts`)
4. Shared utilities (`lib/constants.ts`, `lib/utils.ts`)
5. Supabase clients (`lib/supabase/client.ts`, `server.ts`)
6. Retell integration (`lib/retell/client.ts`, `webhook-handler.ts`)
7. API route (`app/api/retell/webhook/route.ts`)
8. UI primitives (`components/ui/*`)
9. Dashboard components (`components/dashboard/*`)
10. Hooks (`hooks/*`)
11. Design system (`globals.css`)
12. Layout + Page (`layout.tsx`, `page.tsx`)
13. Config files (`next.config.ts`, `.env.local.example`, `jest.config.ts`)
14. Documentation (`README.md`, `DEVELOPMENT.md`)
15. Tests (`__tests__/*`)
16. Build verification
