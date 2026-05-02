You are an expert AI Engineer and Full-Stack Developer. We are building **VitaVoice** - a specialized voice-first AI system for high-stress, noisy, hands-busy emergency environments (ambulances, ER, fieldwork).

### Current Status
- Phase 1 is done (basic Retell AI voice call + Next.js dashboard with live transcript)
- We are using Llama 3.1 70B via Groq + Retell AI

### Phase 2 Requirements - Heavy AI Customization

**Main Goal**: Customize the AI agent (Llama 3.1 70B) so that it deeply understands and excels at the problem statement:
- Works reliably in noisy real-world conditions
- Handles urgency and ambiguity intelligently
- Prioritizes speed and correctness over verbosity
- Extremely safe for medical use

### What You Must Do Now:

1. **Create a highly customized System Prompt** for the voice agent that includes:
   - Strong domain knowledge (emergency medicine, Indian ambulance context)
   - Urgency classification logic
   - Ambiguity detection + smart clarification
   - Safety-first reasoning (double confirmation)
   - Noise-adaptive behavior
   - Few-shot examples
   - Structured thinking (Chain-of-Thought)

2. **Define proper Tool Schemas** for Retell AI (real tools only, no fake data):
   - create_emergency_case
   - log_vitals
   - assess_patient_risk
   - get_case_history

3. **Update the dashboard** to show:
   - Current urgency level (color coded)
   - Noise level indicator
   - Clarification requests
   - Risk predictions

4. **Implement conversation memory** using Supabase (store per call/session).

### Output Format You Must Follow:

**First**, give me the complete final System Prompt (very detailed).

**Second**, give me the JSON tool schemas for Retell AI.

**Third**, give me the code changes needed in the existing Next.js project (especially for tool calling webhook and dashboard updates).

**Fourth**, give step-by-step instructions on how to update the prompt in Retell AI.

Focus on making the AI agent truly intelligent and customized for noisy emergency medical scenarios. Do not use generic prompts. Make it production-grade for this specific use case.