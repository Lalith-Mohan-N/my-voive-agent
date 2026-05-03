# VitaVoice — Development Guide

## Prerequisites

| Requirement | Version | Purpose |
|------------|---------|---------|
| Node.js | 20+ | Runtime |
| npm | 10+ | Package manager |
| Supabase Account | — | Database + Realtime |
| Retell AI Account | — | Voice orchestration |
| Groq API Key | — | LLM inference |

## Environment Setup

### 1. Environment Variables

```bash
cp .env.local.example .env.local
```

Fill in each value:

| Variable | Where to Get It |
|----------|----------------|
| `RETELL_API_KEY` | [Retell AI Dashboard](https://dashboard.retellai.com) → API Keys |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API → URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Project Settings → API → anon/public |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API → service_role |
| `GROQ_API_KEY` | [Groq Console](https://console.groq.com) → API Keys |
| `RETELL_AGENT_ID` | Retell AI Dashboard → Agents → copy agent ID |

### 2. Database Setup

1. Open your Supabase Dashboard → **SQL Editor**
2. Copy the contents of `supabase/migrations/001_initial_schema.sql`
3. Paste and execute the SQL
4. Verify tables were created in **Table Editor**
5. Go to **Database → Replication** and confirm Realtime is enabled for:
   - `emergency_cases`
   - `case_timeline`
   - `vitals_log`

### 3. Install Dependencies

```bash
npm install
```

### 4. Start Development Server

```bash
npm run dev
```

Dashboard will be available at `http://localhost:3000`.

---

## Webhook Development (ngrok)

Retell AI needs to send webhooks to your server. During local development, use ngrok:

```bash
# Install ngrok
npm install -g ngrok

# Expose local port
ngrok http 3000
```

Then configure the ngrok URL in your Retell AI Dashboard:
- Go to **Agent Settings → Webhooks**
- Set webhook URL to: `https://your-id.ngrok.io/api/retell/webhook`

---

## Project Architecture

### Data Flow

```
User speaks → Retell AI (orchestration)
  → Deepgram Nova-3 (STT with noise reduction)
  → Groq Llama 3.1 70B (LLM processing)
  → ElevenLabs Flash v2.5 (TTS)
  → User hears response

Retell AI → Webhook POST /api/retell/webhook
  → Verify signature
  → Process event (call_started / call_ended / call_analyzed)
  → Write to Supabase (emergency_cases, case_timeline, vitals_log)

Supabase Realtime → Dashboard (WebSocket)
  → useRealtimeCase() — active case updates
  → useRealtimeTranscript() — live transcript entries
  → useCallStatus() — vitals + call state
```

### Key Design Decisions

1. **Server-side webhook handler** — Uses `SUPABASE_SERVICE_ROLE_KEY` to bypass RLS for writes from the webhook route. The browser client uses the `anon` key with read-only RLS policies.

2. **Singleton Supabase clients** — Browser client is a singleton to avoid creating multiple WebSocket connections. Server client is created fresh per-request.

3. **Urgency detection** — Dual approach: explicit tags `[CRITICAL]` from the LLM system prompt, plus keyword-based fallback detection for common medical emergencies.

4. **Vitals extraction** — Regex-based pattern matching extracts vital signs from transcript text (HR, BP, SpO2, Temp, RR, GCS).

---

## Common Errors

### `Missing Supabase environment variables` at runtime

**Symptom:**
```
Error: Missing Supabase environment variables. Ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set.
```

**Cause:** `.env.local` does not exist or the variables are empty.

**Fix:**
```bash
cp .env.local.example .env.local
# Then open .env.local and paste real values from your Supabase project dashboard:
# NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
# NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
# SUPABASE_SERVICE_ROLE_KEY=eyJ...
```
Restart the dev server after editing `.env.local` — Next.js does **not** hot-reload env changes.

### `RETELL_AGENT_ID` not found when starting a call

**Symptom:** `POST /api/retell/call` returns `{"error":"Missing agent_id"}` or a 500.

**Fix:** Add `RETELL_AGENT_ID=your_agent_id_here` to `.env.local`. You can find the agent ID in the Retell AI Dashboard under **Agents** → your agent name.

---

## Testing

### Running Tests

```bash
# All tests
npm test

# Watch mode (re-runs on file changes)
npm run test:watch

# Coverage report
npm run test:coverage
```

### Test Structure

```
__tests__/
├── unit/
│   ├── lib/
│   │   ├── retell/webhook-handler.test.ts  # Webhook event processing
│   │   ├── retell/client.test.ts           # SDK client + verification
│   │   └── utils.test.ts                   # Utility functions
│   ├── components/
│   │   ├── UrgencyBadge.test.tsx           # Urgency display
│   │   ├── LiveTranscript.test.tsx         # Transcript feed
│   │   ├── CallStatusPanel.test.tsx        # Call state display
│   │   └── VitalsGrid.test.tsx             # Vitals rendering
│   └── hooks/
│       └── useRealtimeTranscript.test.ts   # Realtime subscription
└── integration/
    ├── webhook-endpoint.test.ts            # Full webhook flow
    └── realtime-subscription.test.ts       # DB → UI flow
```

### Writing Tests

- **Unit tests** mock Supabase and Retell SDK calls
- **Integration tests** test the full flow from API request to DB write
- Use `@testing-library/react` for component tests
- All tests use `jest-environment-jsdom`

---

## Code Conventions

### File Naming
- Components: `PascalCase.tsx` (e.g., `LiveTranscript.tsx`)
- Hooks: `camelCase.ts` with `use` prefix (e.g., `useRealtimeTranscript.ts`)
- Utilities: `camelCase.ts` (e.g., `utils.ts`)
- Types: `camelCase.ts` (e.g., `types.ts`)

### Component Patterns
- All interactive components are `'use client'`
- UI primitives in `components/ui/` — generic, reusable
- Dashboard components in `components/dashboard/` — feature-specific
- Props interfaces defined alongside the component

### Type Safety
- Strict TypeScript (`strict: true` in tsconfig)
- Database types in `lib/supabase/types.ts` mirror the SQL schema
- Shared app types in `types/index.ts`
- Always use explicit return types for exported functions

---

## Debugging Tips

### Webhook Issues
1. Check ngrok terminal for incoming requests
2. Check browser Network tab (won't show webhooks — use server logs)
3. Add `console.log` in `app/api/retell/webhook/route.ts`
4. Verify Supabase tables have data via Table Editor

### Realtime Not Working
1. Ensure Realtime is enabled in Supabase Dashboard → Database → Replication
2. Check browser console for WebSocket errors
3. Verify `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are correct
4. Check RLS policies allow SELECT for anon role

### Build Errors
```bash
# Type-check without building
npx tsc --noEmit

# Clear Next.js cache
rm -rf .next
npm run dev
```

---

## Deployment (Netlify)

1. Push to GitHub
2. Import project in [Netlify Dashboard](https://app.netlify.com)
3. Netlify will automatically detect the `netlify.toml` configuration for SPA redirects and Next.js setup.
4. Add all environment variables from `.env.local` in the Netlify site settings.
5. Set the webhook URL in Retell AI Dashboard to your Netlify URL:
   `https://your-app.netlify.app/api/retell/webhook`
6. Deploy
