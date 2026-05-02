// ============================================================
// VitaVoice — Retell Response Enhancer
// ============================================================
// Uses Groq AI to generate intelligent, contextual responses
// when Retell's built-in LLM is too scripted.

import { Groq } from 'groq-sdk';

export interface ResponseContext {
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>;
  knownFacts: Record<string, unknown>;
  currentIntent: string;
  userMessage: string;
}

export interface EnhancedResponse {
  response: string;
  shouldUseTool?: string;
  toolArgs?: Record<string, unknown>;
}

const GROQ_MODEL = 'llama-3.1-70b-versatile';

/**
 * Generate an intelligent response using Groq AI.
 * This makes the agent sound natural and prevents repeated questions.
 */
export async function generateIntelligentResponse(
  context: ResponseContext
): Promise<EnhancedResponse> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey || apiKey === 'your_groq_api_key') {
    return {
      response: 'I apologize, but I am having trouble understanding. Could you please tell me your location and what emergency you are experiencing?',
    };
  }

  const groq = new Groq({ apiKey });

  const systemPrompt = buildSystemPrompt(context.knownFacts);

  const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
    { role: 'system', content: systemPrompt },
    ...context.conversationHistory.slice(-5).map((turn) => ({
      role: turn.role === 'assistant' ? 'assistant' as const : 'user' as const,
      content: turn.content,
    })),
    { role: 'user', content: context.userMessage },
  ];

  const response = await groq.chat.completions.create({
    model: GROQ_MODEL,
    messages,
    temperature: 0.7,
    max_tokens: 300,
  });

  const content = response.choices[0]?.message?.content || '';

  // Parse response for tool calls
  const toolCall = parseToolCall(content);

  return {
    response: toolCall.cleanedContent || content,
    shouldUseTool: toolCall.toolName,
    toolArgs: toolCall.args,
  };
}

function buildSystemPrompt(knownFacts: Record<string, unknown>): string {
  const factsList = Object.entries(knownFacts)
    .filter(([, value]) => value !== undefined && value !== null)
    .map(([key, value]) => `- ${key}: ${JSON.stringify(value)}`)
    .join('\n');

  return `You are VitaVoice, an intelligent emergency medical AI assistant helping during emergencies.

CRITICAL RULES:
1. You MUST NOT ask questions about information you already know (listed below)
2. Be conversational and natural - sound like a helpful human, not a robot
3. Acknowledge information the user provides before asking follow-up questions
4. Provide calm, empathetic guidance
5. If location is known, offer to find hospitals
6. If symptoms are described, offer first aid guidance

INFORMATION YOU ALREADY KNOW (DO NOT ASK AGAIN):
${factsList || '- No information gathered yet'}

EMERGENCY PROTOCOL:
- First: Get location and chief complaint
- Then: Gather vital signs if available
- Then: Provide first aid or hospital recommendations
- Stay: On call until help arrives

Respond naturally in 1-2 sentences. Do not sound scripted.`;
}

function parseToolCall(content: string): {
  toolName?: string;
  args?: Record<string, unknown>;
  cleanedContent: string;
} {
  // Check for tool call markers like [TOOL: find_nearest_hospital] or {{hospital_search}}
  const toolMatch = content.match(/\[TOOL:\s*(\w+)\]/);
  if (toolMatch) {
    const toolName = toolMatch[1];
    const cleanedContent = content.replace(/\[TOOL:\s*\w+\]/, '').trim();

    // Extract args based on tool
    const args: Record<string, unknown> = {};

    if (toolName === 'find_nearest_hospital') {
      // Try to extract location from the message
      const locationMatch = content.match(/(?:in|at|near|location)\s+([^,.]+)/i);
      if (locationMatch) {
        args.location = locationMatch[1].trim();
      }
    }

    if (toolName === 'provide_first_aid') {
      const complaintMatch = content.match(/(?:for|with|having|complaint)\s+([^,.]+)/i);
      if (complaintMatch) {
        args.chief_complaint = complaintMatch[1].trim();
      }
      args.has_firstaid_kit = content.toLowerCase().includes('kit');
    }

    return { toolName, args, cleanedContent };
  }

  return { cleanedContent: content };
}

/**
 * Check if we should route to a tool based on user intent.
 */
export function shouldRouteToTool(
  intent: string,
  entities: Record<string, unknown>
): { tool: string; args: Record<string, unknown> } | null {
  // Hospital request
  if (intent === 'hospital_request' || intent === 'location_request') {
    return {
      tool: 'find_nearest_hospital',
      args: {
        location: entities.location || '',
        required_specialty: entities.specialty || '',
      },
    };
  }

  // First aid request
  if (intent === 'firstaid_request' || intent === 'symptom_report') {
    return {
      tool: 'provide_first_aid',
      args: {
        chief_complaint: entities.chief_complaint || entities.symptoms || '',
        has_firstaid_kit: true,
        patient_age_category: entities.patient_age_category || 'adult',
      },
    };
  }

  // Vitals logging
  if (intent === 'vitals_update') {
    return {
      tool: 'log_vitals',
      args: {
        heart_rate: entities.heart_rate,
        bp_systolic: entities.bp_systolic,
        bp_diastolic: entities.bp_diastolic,
        spo2: entities.spo2,
      },
    };
  }

  return null;
}
