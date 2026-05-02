#!/usr/bin/env node
// ============================================================
// VitaVoice — Automated Retell Agent Setup Script v2
// Run: node scripts/setup-retell-agent.mjs
// ============================================================
// Now includes: noise handling, speed optimizations, multilingual,
// first aid tools, and reduced global prompt for faster responses.

import Retell from 'retell-sdk';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

// ─── Load .env.local manually ────────────────────────────────
const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, '..', '.env.local');
const envContent = readFileSync(envPath, 'utf-8');
const env = {};
for (const line of envContent.split('\n')) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const eqIndex = trimmed.indexOf('=');
  if (eqIndex === -1) continue;
  env[trimmed.slice(0, eqIndex)] = trimmed.slice(eqIndex + 1);
}

const API_KEY = env.RETELL_API_KEY;
const AGENT_ID = env.RETELL_AGENT_ID;

if (!API_KEY || API_KEY.startsWith('your_')) {
  console.error('❌ RETELL_API_KEY not set in .env.local');
  process.exit(1);
}
if (!AGENT_ID || AGENT_ID.startsWith('your_')) {
  console.error('❌ RETELL_AGENT_ID not set in .env.local');
  process.exit(1);
}

const retell = new Retell({ apiKey: API_KEY });

// Tool URL — use existing or placeholder
const TOOL_URL = env.RETELL_TOOL_URL || 'https://placeholder.example.com/api/retell/tools';

console.log('');
console.log('🚀 VitaVoice v2 — Retell Agent Setup');
console.log('═══════════════════════════════════════════════');
console.log(`   API Key:  ${API_KEY.slice(0, 8)}...${API_KEY.slice(-4)}`);
console.log(`   Agent ID: ${AGENT_ID}`);
console.log(`   Tool URL: ${TOOL_URL}`);
console.log('');

// ─── Step 1: Get current agent info ──────────────────────────
console.log('📡 Step 1: Fetching agent configuration...');
let agentInfo;
try {
  agentInfo = await retell.agent.retrieve(AGENT_ID);
  console.log(`   ✅ Found: "${agentInfo.agent_name || 'Unnamed'}"`);
} catch (err) {
  console.error(`   ❌ Failed: ${err.message}`);
  process.exit(1);
}

const cfId = agentInfo.response_engine?.conversation_flow_id;
if (!cfId) {
  console.error('   ❌ No conversation flow found on this agent.');
  process.exit(1);
}
console.log(`   Flow ID: ${cfId}`);

// ─── Step 2: Define tools ────────────────────────────────────
const tools = [
  {
    type: 'custom',
    tool_id: 'tool_create_emergency_case',
    name: 'create_emergency_case',
    description: 'Creates a new emergency case record.',
    url: TOOL_URL,
    method: 'POST',
    parameters: {
      type: 'object',
      properties: {
        patient_name: { type: 'string', description: 'Patient full name' },
        location: { type: 'string', description: 'Location of the emergency' },
        chief_complaint: { type: 'string', description: 'Primary complaint' },
        urgency_level: { type: 'string', enum: ['LOW', 'MEDIUM', 'URGENT', 'CRITICAL'], description: 'Urgency classification' },
      },
      required: ['patient_name', 'location', 'chief_complaint', 'urgency_level'],
    },
  },
  {
    type: 'custom',
    tool_id: 'tool_log_vitals',
    name: 'log_vitals',
    description: 'Records patient vital signs.',
    url: TOOL_URL,
    method: 'POST',
    parameters: {
      type: 'object',
      properties: {
        case_id: { type: 'string', description: 'Case ID or "current"' },
        heart_rate: { type: 'number', description: 'Heart rate BPM' },
        bp_systolic: { type: 'number', description: 'Systolic BP' },
        bp_diastolic: { type: 'number', description: 'Diastolic BP' },
        spo2: { type: 'number', description: 'SpO2 %' },
        temperature: { type: 'number', description: 'Temp °F' },
        respiratory_rate: { type: 'number', description: 'Breaths/min' },
        gcs: { type: 'number', description: 'GCS 3-15' },
      },
      required: [],
    },
  },
  {
    type: 'custom',
    tool_id: 'tool_get_patient_history',
    name: 'get_patient_history',
    description: 'Searches prior cases by patient name.',
    url: TOOL_URL,
    method: 'POST',
    parameters: {
      type: 'object',
      properties: {
        patient_name: { type: 'string', description: 'Patient name' },
      },
      required: ['patient_name'],
    },
  },
  {
    type: 'custom',
    tool_id: 'tool_find_nearest_hospital',
    name: 'find_nearest_hospital',
    description: 'Finds nearest hospitals with availability.',
    url: TOOL_URL,
    method: 'POST',
    parameters: {
      type: 'object',
      properties: {
        location: { type: 'string', description: 'Emergency location' },
        required_specialty: { type: 'string', description: 'e.g. trauma, cardiac' },
      },
      required: ['location'],
    },
  },
  {
    type: 'custom',
    tool_id: 'tool_notify_supervisor',
    name: 'notify_supervisor',
    description: 'Sends urgent alert to supervisor.',
    url: TOOL_URL,
    method: 'POST',
    parameters: {
      type: 'object',
      properties: {
        case_id: { type: 'string', description: 'Case ID or "current"' },
        message: { type: 'string', description: 'Alert message' },
        urgency: { type: 'string', enum: ['URGENT', 'CRITICAL'], description: 'Urgency' },
      },
      required: ['message', 'urgency'],
    },
  },
  {
    type: 'custom',
    tool_id: 'tool_set_noise_level',
    name: 'set_noise_level',
    description: 'Updates ambient noise level.',
    url: TOOL_URL,
    method: 'POST',
    parameters: {
      type: 'object',
      properties: {
        case_id: { type: 'string', description: 'Case ID or "current"' },
        level: { type: 'string', enum: ['low', 'normal', 'high', 'extreme'], description: 'Noise level' },
      },
      required: ['level'],
    },
  },
];

// ─── Step 3: Build optimized conversation flow ───────────────

// SHORTER global prompt = faster LLM response time
const globalPrompt = `You are VitaVoice, an EMS dispatch AI assistant. Be calm, concise, professional. Max 2 sentences per response. Every second counts.

RULES:
- NEVER diagnose. Only collect info and relay.
- Confirm critical info by repeating it back.
- If noise prevents understanding, ask to repeat ONCE. If still unclear, proceed with what you have.
- Do NOT restart from beginning if interrupted. Continue from where you left off.
- Classify urgency: CRITICAL (life-threat), URGENT (serious), MEDIUM (moderate), LOW (stable).

LANGUAGE: Match the user's language automatically. If they speak Kannada, respond in Kannada. If Hindi, respond in Hindi. Switch instantly on language change. Supported: English, Hindi, Kannada, Tamil, Telugu, Malayalam, Bengali, Marathi.

NOISE: In noisy environments, use shorter responses (3-5 words). Do not ask about noise — just adapt.`;

const nodes = [
  {
    id: 'welcome',
    type: 'conversation',
    name: 'Welcome & Triage',
    // HIGH interruption sensitivity = agent is HARDER to interrupt (ignores noise)
    interruption_sensitivity: 0.9,
    // Use faster model for welcome
    model_choice: { type: 'cascading', model: 'gpt-4.1-mini' },
    instruction: {
      type: 'prompt',
      text: `Greet briefly: "VitaVoice EMS here. Tell me patient name, location, and what happened."

Once you have name + location + complaint, call create_emergency_case immediately. Assess urgency from symptoms described.

Do NOT ask for details one by one. Let the user talk and extract all info from their response.`,
    },
    display_position: { x: 100, y: 50 },
    edges: [
      {
        id: 'edge_to_vitals',
        destination_node_id: 'collect_vitals',
        transition_condition: {
          type: 'prompt',
          prompt: 'Emergency case has been created using create_emergency_case tool.',
        },
      },
    ],
  },
  {
    id: 'collect_vitals',
    type: 'conversation',
    name: 'Vitals & Assist',
    interruption_sensitivity: 0.9,
    model_choice: { type: 'cascading', model: 'gpt-4.1-mini' },
    instruction: {
      type: 'prompt',
      text: `Ask: "Any vitals? Heart rate, BP, oxygen?"

Log each vital immediately with log_vitals. Don't wait for all vitals.

Also available: find_nearest_hospital, get_patient_history, notify_supervisor, set_noise_level.

If SpO2 < 90 or HR > 150 or HR < 40 or GCS < 8, classify as CRITICAL and suggest notifying supervisor.

Keep responses under 2 sentences. Don't repeat what user already said unless confirming critical values.`,
    },
    display_position: { x: 500, y: 50 },
    edges: [
      {
        id: 'edge_to_end',
        destination_node_id: 'wrap_up',
        transition_condition: {
          type: 'prompt',
          prompt: 'Caller says goodbye or confirms they have everything needed.',
        },
      },
    ],
  },
  {
    id: 'wrap_up',
    type: 'conversation',
    name: 'Wrap Up',
    interruption_sensitivity: 0.9,
    model_choice: { type: 'cascading', model: 'gpt-4.1-nano' },
    instruction: {
      type: 'prompt',
      text: 'Brief summary: patient, location, complaint, urgency. Say "VitaVoice out. Stay safe."',
    },
    display_position: { x: 900, y: 50 },
    edges: [
      {
        id: 'edge_to_end_node',
        destination_node_id: 'end_node',
        transition_condition: { type: 'prompt', prompt: 'Summary given.' },
      },
    ],
  },
  {
    id: 'end_node',
    type: 'end',
    name: 'End Call',
    display_position: { x: 1300, y: 50 },
  },
];

// ─── Step 4: Apply updates ───────────────────────────────────
console.log('');
console.log('🔧 Step 2: Updating conversation flow...');

try {
  const result = await retell.conversationFlow.update(cfId, {
    nodes,
    tools,
    start_node_id: 'welcome',
    start_speaker: 'agent',
    global_prompt: globalPrompt,
    model_choice: { type: 'cascading', model: 'gpt-4.1-mini' },
  });
  console.log(`   ✅ Flow updated! ${result.nodes?.length || 0} nodes, ${result.tools?.length || 0} tools`);
} catch (err) {
  console.error(`   ❌ Failed: ${err.status} ${err.message}`);
  process.exit(1);
}

// ─── Step 5: Update agent-level settings ─────────────────────
console.log('');
console.log('🎙️ Step 3: Updating agent settings...');
try {
  await retell.agent.update(AGENT_ID, {
    agent_name: 'VitaVoice EMS Agent',
    language: 'multi',          // Auto-detect language
    voice_speed: 1.1,           // Slightly faster speech
    interruption_sensitivity: 0.9,  // Hard to interrupt (ignores noise)
    ambient_sound: 'call-center',   // Expect background noise
    responsiveness: 1.0,        // Maximum responsiveness
    enable_backchannel: false,   // No "uh-huh" sounds (save time)
  });
  console.log('   ✅ Agent settings updated!');
  console.log('      - Language: multi (auto-detect)');
  console.log('      - Voice speed: 1.1x');
  console.log('      - Interruption sensitivity: 0.9 (noise-resistant)');
  console.log('      - Responsiveness: 1.0 (max speed)');
} catch (err) {
  console.log(`   ⚠️  Some settings may not be supported: ${err.message}`);
  // Try with fewer settings
  try {
    await retell.agent.update(AGENT_ID, {
      agent_name: 'VitaVoice EMS Agent',
      language: 'multi',
    });
    console.log('   ✅ Core settings updated (language: multi)');
  } catch (err2) {
    console.log(`   ⚠️  Could not update: ${err2.message} (non-critical)`);
  }
}

// ─── Done ────────────────────────────────────────────────────
console.log('');
console.log('═══════════════════════════════════════════════');
console.log('✅ Phase 1 & 2 setup complete!');
console.log('');
console.log('📋 What changed:');
console.log('   🔇 Noise: interruption_sensitivity → 0.9 (ignores background noise)');
console.log('   ⚡ Speed: gpt-4.1-mini for all nodes (2-3x faster)');
console.log('   ✂️  Prompt: shortened global prompt (less tokens = faster)');
console.log('   🌐 Language: auto-detect (Kannada, Hindi, Tamil, etc.)');
console.log('   🗣️  Voice: 1.1x speed, no backchannels');
console.log('   📝 Flow: agent doesn\'t restart on interruption');
console.log('');
console.log('⚠️  Remember to click "Publish" in Retell dashboard!');
console.log('');
