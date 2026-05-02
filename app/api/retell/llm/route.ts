// ============================================================
// VitaVoice — Custom LLM Endpoint for Retell
// ============================================================
// This replaces Retell's built-in LLM with Groq for intelligent,
// contextual responses that don't repeat questions.

import { NextResponse } from 'next/server';
import { Groq } from 'groq-sdk';
import { createServerClient } from '@/lib/supabase/server';

interface RetellLLMRequest {
  call_id: string;
  agent_id: string;
  transcript: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>;
  metadata?: Record<string, unknown>;
}

interface RetellLLMResponse {
  response: string;
  response_complete?: boolean;
}

const GROQ_MODEL = 'llama-3.1-70b-versatile';

/**
 * POST /api/retell/llm
 * Custom LLM endpoint that Retell calls instead of using built-in LLM.
 */
export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body: RetellLLMRequest = await request.json();
    const { call_id, transcript } = body;

    // Get API key
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey || apiKey === 'your_groq_api_key') {
      return NextResponse.json(
        { response: 'I apologize, but the AI service is not configured properly. Please contact support.' },
        { status: 200 }
      );
    }

    // Get conversation memory from database
    const supabase = createServerClient();
    const { data: caseData } = await (supabase.from('emergency_cases') as any)
      .select('id, location, device_latitude, device_longitude, patient_name, chief_complaint, urgency_level, conversation_memory(case_id, role, content, intent, entities)')
      .eq('retell_call_id', call_id)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle() as any;

    // Build system prompt with memory
    const systemPrompt = buildIntelligentSystemPrompt(caseData);

    // Prepare messages for Groq
    const messages = [
      { role: 'system' as const, content: systemPrompt },
      ...transcript.slice(-10).map((turn) => ({
        role: turn.role === 'assistant' ? 'assistant' as const : 'user' as const,
        content: turn.content,
      })),
    ];

    // Call Groq
    const groq = new Groq({ apiKey });
    const response = await groq.chat.completions.create({
      model: GROQ_MODEL,
      messages,
      temperature: 0.7,
      max_tokens: 400,
    });

    const aiResponse = response.choices[0]?.message?.content?.trim() || '';

    // Store this response in conversation memory
    if (caseData?.id) {
      await (supabase.from('conversation_memory') as any).insert({
        case_id: caseData.id,
        role: 'agent',
        content: aiResponse,
        metadata: { source: 'groq_llm' },
      });
    }

    // Return response to Retell
    const result: RetellLLMResponse = {
      response: aiResponse,
      response_complete: true,
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error('Custom LLM error:', error);
    return NextResponse.json(
      { response: 'I apologize, I am having trouble understanding. Could you please repeat that?' },
      { status: 200 }
    );
  }
}

/**
 * Build system prompt with conversation memory to prevent repeated questions.
 */
function buildIntelligentSystemPrompt(caseData: any): string {
  const knownFacts: string[] = [];

  if (caseData?.location) knownFacts.push(`Location: ${caseData.location}`);
  if (caseData?.device_latitude && caseData?.device_longitude) {
    knownFacts.push(`GPS: ${caseData.device_latitude}, ${caseData.device_longitude}`);
  }
  if (caseData?.patient_name) knownFacts.push(`Patient: ${caseData.patient_name}`);
  if (caseData?.chief_complaint) knownFacts.push(`Complaint: ${caseData.chief_complaint}`);
  if (caseData?.urgency_level) knownFacts.push(`Urgency: ${caseData.urgency_level}`);

  // Extract facts from conversation memory
  const memoryFacts: string[] = [];
  if (caseData?.conversation_memory) {
    for (const turn of caseData.conversation_memory) {
      if (turn.entities) {
        for (const [key, value] of Object.entries(turn.entities)) {
          if (value && !memoryFacts.some((f) => f.includes(key))) {
            memoryFacts.push(`${key}: ${JSON.stringify(value)}`);
          }
        }
      }
    }
  }

  const allFacts = [...knownFacts, ...memoryFacts];

  return `You are VitaVoice, an intelligent emergency medical AI assistant helping during a real emergency call.

CRITICAL RULES - FOLLOW EXACTLY:
1. ALREADY KNOW: ${allFacts.length > 0 ? allFacts.join(', ') : 'Nothing yet'}
2. DO NOT ask about anything listed above - you already know it!
3. Be NATURAL and CONVERSATIONAL - sound human, not robotic
4. Ask ONE question at a time, then wait for response
5. Acknowledge information before asking next question
6. Be empathetic but efficient

CONVERSATION FLOW:
- First: Get location if not known
- Then: Get chief complaint if not known  
- Then: Check if patient is conscious/breathing
- Then: Offer first aid guidance
- Then: Suggest hospitals when appropriate

RESPONSE STYLE:
✓ GOOD: "I understand you're at Central Park. Can you tell me what emergency you're dealing with?"
✗ BAD: "What is your location? What is the emergency? What is the patient's name?"

Respond in 1-3 sentences. Never list multiple questions. Never repeat what you already know.`;
}

/**
 * GET /api/retell/llm
 * Health check.
 */
export async function GET(): Promise<NextResponse> {
  return NextResponse.json({
    status: 'ok',
    service: 'VitaVoice Custom LLM (Groq)',
    timestamp: new Date().toISOString(),
  });
}
