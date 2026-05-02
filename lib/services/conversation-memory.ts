// ============================================================
// VitaVoice — Conversation Memory Service
// ============================================================
// Manages conversation context to prevent the agent from repeating
// questions that have already been answered. Stores and retrieves
// conversation history with key facts extracted.

import { createServerClient } from '@/lib/supabase/server';

export interface ConversationTurn {
  id: string;
  case_id: string;
  role: 'user' | 'agent' | 'system';
  content: string;
  intent?: string;
  entities?: Record<string, unknown>;
  created_at: string;
}

export interface ConversationContext {
  turns: ConversationTurn[];
  facts: Record<string, unknown>;
  askedQuestions: string[];
  currentTopic: string;
  suggestedNextQuestion: string | null;
}

export interface MemoryQueryResult {
  success: boolean;
  context: ConversationContext;
  error?: string;
}

/**
 * Get conversation memory for a case.
 * Retrieves the last N turns and extracts key facts.
 */
export async function getConversationMemory(
  caseId: string,
  limit: number = 10
): Promise<MemoryQueryResult> {
  try {
    const supabase = createServerClient();

    // Get recent conversation turns
    const { data: turns, error } = await (supabase.from('conversation_memory') as any)
      .select('*')
      .eq('case_id', caseId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Failed to get conversation memory:', error);
      return {
        success: false,
        context: createEmptyContext(),
        error: error.message,
      };
    }

    // Extract facts and asked questions from the conversation
    const facts: Record<string, unknown> = {};
    const askedQuestions: string[] = [];
    let currentTopic = 'greeting';

    // Reverse to get chronological order
    const chronologicalTurns = (turns || []).reverse();

    for (const turn of chronologicalTurns) {
      if (turn.role === 'agent' && turn.intent === 'question') {
        askedQuestions.push(turn.content.toLowerCase());
      }

      if (turn.role === 'user' && turn.entities) {
        Object.assign(facts, turn.entities);
      }

      if (turn.intent) {
        currentTopic = turn.intent;
      }
    }

    // Determine what to ask next based on missing facts
    const suggestedNextQuestion = suggestNextQuestion(facts, currentTopic);

    return {
      success: true,
      context: {
        turns: chronologicalTurns,
        facts,
        askedQuestions,
        currentTopic,
        suggestedNextQuestion,
      },
    };
  } catch (error) {
    console.error('Conversation memory error:', error);
    return {
      success: false,
      context: createEmptyContext(),
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Store a conversation turn in memory.
 */
export async function storeConversationTurn(
  caseId: string,
  role: 'user' | 'agent' | 'system',
  content: string,
  metadata?: {
    intent?: string;
    entities?: Record<string, unknown>;
  }
): Promise<boolean> {
  try {
    const supabase = createServerClient();

    const { error } = await (supabase.from('conversation_memory') as any).insert({
      case_id: caseId,
      role,
      content,
      intent: metadata?.intent,
      entities: metadata?.entities,
    });

    if (error) {
      console.error('Failed to store conversation turn:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Store conversation turn error:', error);
    return false;
  }
}

/**
 * Check if a question has already been asked.
 */
export function hasBeenAsked(question: string, askedQuestions: string[]): boolean {
  const normalized = question.toLowerCase().trim();
  return askedQuestions.some((q) =>
    q.includes(normalized) || normalized.includes(q)
  );
}

/**
 * Build a context prompt for the LLM based on conversation history.
 */
export function buildContextPrompt(context: ConversationContext): string {
  const parts: string[] = [];

  // Add conversation history
  if (context.turns.length > 0) {
    parts.push('=== CONVERSATION HISTORY ===');
    for (const turn of context.turns.slice(-5)) {
      const prefix = turn.role === 'user' ? 'User' : turn.role === 'agent' ? 'Agent' : 'System';
      parts.push(`${prefix}: ${turn.content}`);
    }
    parts.push('');
  }

  // Add known facts
  if (Object.keys(context.facts).length > 0) {
    parts.push('=== KNOWN FACTS ===');
    for (const [key, value] of Object.entries(context.facts)) {
      if (value !== undefined && value !== null && value !== '') {
        parts.push(`${key}: ${value}`);
      }
    }
    parts.push('');
  }

  // Add what not to ask again
  if (context.askedQuestions.length > 0) {
    parts.push('=== ALREADY ASKED (DO NOT REPEAT) ===');
    for (const question of context.askedQuestions.slice(-5)) {
      parts.push(`- ${question}`);
    }
    parts.push('');
  }

  // Add suggested next question
  if (context.suggestedNextQuestion) {
    parts.push(`=== SUGGESTED NEXT QUESTION ===`);
    parts.push(context.suggestedNextQuestion);
    parts.push('');
  }

  return parts.join('\n');
}

/**
 * Extract entities from user response.
 */
export function extractEntities(
  content: string,
  context: string
): Record<string, unknown> {
  const entities: Record<string, unknown> = {};
  const lowerContent = content.toLowerCase();

  // Extract patient name
  const nameMatch = content.match(/(?:name is|i am|this is|patient name is)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i);
  if (nameMatch) {
    entities.patient_name = nameMatch[1].trim();
  }

  // Extract age
  const ageMatch = content.match(/(\d+)\s*(?:years?\s*old|y\.?o\.?|yo)/i);
  if (ageMatch) {
    entities.patient_age = parseInt(ageMatch[1], 10);
  }

  // Extract location
  if (lowerContent.includes('at') || lowerContent.includes('near') || lowerContent.includes('in')) {
    const locationMatch = content.match(/(?:at|near|in)\s+([^,.]+)/i);
    if (locationMatch) {
      entities.location = locationMatch[1].trim();
    }
  }

  // Extract vitals
  const hrMatch = content.match(/(?:heart rate|pulse|hr)\s*(?:is|was|of)?\s*(\d+)/i);
  if (hrMatch) {
    entities.heart_rate = parseInt(hrMatch[1], 10);
  }

  const bpMatch = content.match(/(?:blood pressure|bp)\s*(?:is|was|of)?\s*(\d+)\s*\/\s*(\d+)/i);
  if (bpMatch) {
    entities.bp_systolic = parseInt(bpMatch[1], 10);
    entities.bp_diastolic = parseInt(bpMatch[2], 10);
  }

  const spo2Match = content.match(/(?:oxygen|spo2|o2)\s*(?:is|was|of)?\s*(\d+)/i);
  if (spo2Match) {
    const val = parseInt(spo2Match[1], 10);
    if (val <= 100) {
      entities.spo2 = val;
    }
  }

  // Extract symptoms/complaint
  if (context === 'triage' || lowerContent.includes('pain') || lowerContent.includes('hurt')) {
    const symptoms = ['chest pain', 'headache', 'breathing', 'bleeding', 'unconscious', 'fever', 'cough', 'vomiting', 'dizzy', 'nausea', 'injury', 'accident', 'fall', 'burn', 'cut', 'fracture'];
    for (const symptom of symptoms) {
      if (lowerContent.includes(symptom)) {
        entities.symptoms = entities.symptoms || [];
        (entities.symptoms as string[]).push(symptom);
      }
    }
  }

  return entities;
}

// ─── Helper Functions ──────────────────────────────────────

function createEmptyContext(): ConversationContext {
  return {
    turns: [],
    facts: {},
    askedQuestions: [],
    currentTopic: 'greeting',
    suggestedNextQuestion: null,
  };
}

function suggestNextQuestion(
  facts: Record<string, unknown>,
  currentTopic: string
): string | null {
  // Suggest what to ask next based on missing information
  const requiredFacts: Record<string, string[]> = {
    greeting: ['patient_name', 'location'],
    triage: ['chief_complaint', 'symptoms', 'patient_age'],
    vitals: ['heart_rate', 'bp_systolic', 'spo2'],
  };

  const needed = requiredFacts[currentTopic] || [];
  for (const fact of needed) {
    if (!facts[fact]) {
      const questions: Record<string, string> = {
        patient_name: "What is the patient's name?",
        location: "What is your current location?",
        chief_complaint: "What is the main problem or chief complaint?",
        symptoms: "What symptoms is the patient experiencing?",
        patient_age: "What is the patient's age?",
        heart_rate: "What is the patient's heart rate?",
        bp_systolic: "What is the patient's blood pressure?",
        spo2: "What is the patient's oxygen saturation level?",
      };
      return questions[fact] || null;
    }
  }

  return null;
}

/**
 * Build a context prompt for injection into Retell LLM.
 * This tells the agent what it already knows so it doesn't repeat questions.
 */
export function buildRetellContextPrompt(context: ConversationContext): string {
  const parts: string[] = [];

  // Start with what we already know (FACTS)
  if (Object.keys(context.facts).length > 0) {
    parts.push('ALREADY KNOW (do NOT ask again):');
    for (const [key, value] of Object.entries(context.facts)) {
      if (value !== undefined && value !== null) {
        parts.push(`- ${key}: ${JSON.stringify(value)}`);
      }
    }
  }

  // Recent conversation history
  if (context.turns.length > 0) {
    parts.push('\nRECENT CONVERSATION:');
    // Show last 5 turns in chronological order
    const recentTurns = [...context.turns].reverse().slice(-5);
    for (const turn of recentTurns) {
      parts.push(`${turn.role.toUpperCase()}: ${turn.content}`);
    }
  }

  // What NOT to ask
  if (context.askedQuestions.length > 0) {
    parts.push('\nQUESTIONS ALREADY ASKED (do NOT repeat):');
    for (const q of context.askedQuestions.slice(-5)) {
      parts.push(`- ${q}`);
    }
  }

  // What TO ask next
  if (context.suggestedNextQuestion) {
    parts.push(`\nNEXT QUESTION TO ASK: ${context.suggestedNextQuestion}`);
  }

  return parts.join('\n');
}

