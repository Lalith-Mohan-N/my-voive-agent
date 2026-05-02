# How the Llama 3.1 70B Agent Was Customised

## What "Training" Means Here

VitaVoice does **not** fine-tune the 70-billion-parameter Llama 3.1 model itself (that would require months of GPU cluster time). Instead, we **deeply customise** its behaviour for emergency-medicine voice use through four production-grade techniques that together act as a domain-specific "training layer" on top of the base model.

---

## 1. Production-Grade System Prompt (Domain Conditioning)

The system prompt in `lib/constants.ts` (→ `VITAVOICE_SYSTEM_PROMPT`) is **~3,000 tokens** of dense medical conditioning:

| Section | Purpose |
|---|---|
| **Core Identity** | Establishes the agent as a "medical teammate," sets 700 ms latency target, defines military-style precision tone |
| **Urgency Classification** | Forces chain-of-thought reasoning before every response, tags [CRITICAL] / [URGENT] / [MEDIUM] / [LOW] |
| **Ambiguity Detection** | Explicitly forbids guessing vitals; asks ONE targeted clarification |
| **Safety Loop** | Double-confirmation for all critical actions (dosages, route changes, hospital selection) |
| **Noise-Adaptive** | Switches to 5-word responses, louder prosody when confidence < 70 % |
| **Stressed-Speech** | Slows down when user panics, repeats keywords, uses forced-choice only |
| **Tool Discipline** | Agent must confirm verbally before/after every tool call |
| **Few-Shot Examples** | 4 realistic Indian EMS dialogues embedded directly in prompt (cardiac arrest, shock, ambiguity, noise) |

This prompt is loaded into Retell AI's **System Prompt** field and passed to Groq's `llama-3.1-70b` endpoint on every turn.

---

## 2. Tool-Augmented Generation (Function Calling)

Llama 3.1 70B via Groq supports structured JSON function calling. We registered **6 real tools** in Retell AI's dashboard:

- `create_emergency_case`
- `log_vitals`
- `get_patient_history`
- `find_nearest_hospital`
- `notify_supervisor`
- `set_noise_level`

Each tool schema includes strict `type: "object"` params, `required` arrays, and descriptive enums. The agent decides **when** to call them based on the conversation flow, and our backend (`app/api/retell/tools/route.ts`) executes them against Supabase within **< 1 s**.

This is the equivalent of giving the model "hands and eyes" — it can read/write real patient data instead of hallucinating.

---

## 3. Per-Session Conversation Memory

Every agent and user utterance is stored in the `conversation_memory` table. On each new tool call, the tool handler fetches the **last 10 entries** for that `case_id` and includes them in the tool result metadata.

This gives Llama 3.1 70B **short-term memory** across a 10–15 minute ambulance call without paying for a full context-window rebuild every turn.

---

## 4. Web Audio Pre-Processing Pipeline (Client-Side)

Before the user's voice even reaches Retell / Deepgram, it passes through a **Web Audio API** chain in the browser:

```
Mic → Analyser (raw visual) → Noise Gate → Compressor → Gain Normalisation → Analyser (processed visual) → Retell
```

- **Noise Gate**: mutes signal below RMS threshold (-36 dB) to suppress siren rumble
- **Dynamics Compressor**: 12:1 ratio, -24 dB threshold — flattens shouted peaks so stressed speech is level
- **Normalisation Gain**: +1.2x boost after compression for consistent input level

The dual real-time waveform display proves the pipeline is working: judges can *see* the raw siren noise and the cleaned waveform side-by-side.

---

## Why Llama 3.1 70B Specifically?

| Requirement | Why Llama 3.1 70B |
|---|---|
| **Speed** | Groq inference runs at **~600 tokens/s** — sub-second voice responses |
| **Context** | 128K context window fits the full system prompt + few-shots + tool history |
| **Safety** | 70B has strong medical reasoning from pre-training on clinical literature |
| **Cost** | Groq pricing is ~$0.59 / 1M input tokens — affordable for hackathon/demo volume |
| **Tool calling** | Native OpenAI-compatible function-calling schema support |
| **Open weight** | Judges can inspect/reproduce the stack; not a black-box API |

---

## How to Reproduce

1. Create an agent in the [Retell AI Dashboard](https://www.retellai.com/)
2. Paste `VITAVOICE_SYSTEM_PROMPT` from `lib/constants.ts` into the System Prompt field
3. Set LLM to **Groq → llama-3.1-70b**
4. Register the 6 tool schemas from `docs/retell-tool-schemas.json`
5. Set the tool endpoint URL to `https://your-app.com/api/retell/tools`
6. Start a call from the VitaVoice dashboard (`/test-agent`) and speak

The agent will classify urgency, ask clarifications, call tools, and adapt to noise — all using the customised prompt + memory + tool stack described above.
