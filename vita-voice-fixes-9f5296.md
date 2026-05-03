# VitaVoice Dashboard & Agent Fixes

Fix case details display, vitals updates, doctor messaging, agent speed, location handling, dev URLs, and global deployment.

## Issues & Fixes

### 1. Text messages missing in center panel (doctor + user)
- **Root cause**: `case_timeline` DB CHECK constraints reject `speaker='doctor'` and `event_type='message'`, so the doctor-messages API silently fails its timeline insert. `useRealtimeTranscript` only reads `case_timeline`, so doctor texts never appear.
- **Fixes**:
  - Add migration `004_fix_timeline_constraints.sql` to allow `'doctor'` in `speaker` and `'message'` in `event_type`.
  - Update `Speaker` and `TimelineEventType` types in `types/index.ts`.
  - Update `LiveTranscript.tsx` to render `'doctor'` entries with a distinct label (e.g., "DOC" in teal/purple).

### 2. Case details not printing after giving info
- **Root cause**: The `agent_override` in `app/api/retell/call/route.ts` sets `language: 'en-IN'` (overriding the agent's `'multi'` config) and `responsiveness: 0.5` + `voice_speed: 0.9`, making the agent sluggish and potentially mis-routing the conversation flow.
- **Fixes**:
  - Change `voice_speed: 1.2`, `responsiveness: 1.0`, `enable_backchannel: false`.
  - Remove `language: 'en-IN'` override so the agent keeps its `'multi'` / `'en-IN'` setup from the script.
  - Update `retell_llm_dynamic_variables` so that when GPS is missing the prompt explicitly tells the agent to ask for the user's address/location verbally.

### 3. Vitals not updating when spoken
- **Root cause**: same sluggish agent settings; the `log_vitals` tool handler is correct but the agent may not be triggering it promptly.
- **Fixes**: Agent speed-up (above) plus ensuring the welcome/collect_vitals flow instructions in the setup script are clear that vitals should be logged immediately.

### 4. Agent not asking for / fetching location
- **Root cause**: `language: 'en-IN'` override blocks multilingual users, and `responsiveness: 0.5` makes the agent hesitate. Browser GPS already exists in `useRetellCall.ts`; when it fails, the agent should verbally ask.
- **Fixes**:
  - Keep browser GPS eager-fetch in `useRetellCall.ts`.
  - In the call route, if `latitude/longitude` are missing, set `suggestedNext` to an explicit location-request prompt.
  - Remove `language` override so the agent matches user's language.

### 5. `npm run dev` should show all links (doctor + user)
- **Root cause**: `package.json` `dev` script is plain `next dev`, which only binds localhost.
- **Fix**: Change `dev` to `next dev --hostname 0.0.0.0 --port 3000` so Next.js prints network URLs accessible from phone/desktop on the same LAN.

### 6. Global deployment (desktop + Android + iOS)
- **Need**: `netlify.toml` missing; deployment config missing.
- **Fixes**:
  - Create `netlify.toml` with SPA redirects, build settings, and headers.
  - Verify `.env.local.example` has no exposed secrets.
  - Deploy via Netlify and provide global URL.

## Files to modify
- `app/api/retell/call/route.ts`
- `components/dashboard/LiveTranscript.tsx`
- `types/index.ts`
- `package.json`
- `supabase/migrations/004_fix_timeline_constraints.sql` (new)
- `netlify.toml` (new)

## Deployment
- Netlify (via `deploy_web_app`), framework: `nextjs`.
