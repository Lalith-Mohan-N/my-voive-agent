// ============================================================
// VitaVoice — Intent Classification Service
// ============================================================
// Classifies user intent from transcripts to enable smart routing
// and context-aware responses. Uses rule-based classification
// with Groq LLM fallback for complex cases.

export type UserIntent =
  | 'new_emergency'
  | 'vitals_update'
  | 'hospital_request'
  | 'first_aid_request'
  | 'provide_info'
  | 'ask_question'
  | 'confirm'
  | 'deny'
  | 'repeat'
  | 'unclear'
  | 'greeting'
  | 'goodbye';

export interface IntentClassification {
  intent: UserIntent;
  confidence: number;
  entities: Record<string, string>;
  suggestedResponse: string;
}

// Keywords for rule-based classification
const INTENT_KEYWORDS: Record<UserIntent, string[]> = {
  new_emergency: ['emergency', 'help', 'accident', 'injured', 'hurt', 'pain', 'bleeding', 'unconscious', 'not breathing', 'heart attack', 'stroke', 'fall', 'crash', 'burn', 'choking'],
  vitals_update: ['heart rate', 'pulse', 'bp', 'blood pressure', 'oxygen', 'spo2', 'temperature', 'breathing', 'rate', 'conscious', 'alert', 'responsive'],
  hospital_request: ['hospital', 'nearest', 'where', 'clinic', 'medical center', 'doctor', 'emergency room', 'er', 'take', 'go'],
  first_aid_request: ['first aid', 'what should i do', 'how do i', 'help me', 'treatment', 'cpr', 'bleeding', 'bandage', 'position', 'elevate'],
  provide_info: ['name is', 'i am', 'at', 'located', 'years old', 'age', 'symptom', 'complaint', 'allergy', 'medication', 'history'],
  ask_question: ['what', 'when', 'where', 'why', 'how', 'who', 'can you', 'will you', 'is it', 'should i'],
  confirm: ['yes', 'yeah', 'yep', 'sure', 'ok', 'okay', 'correct', 'right', 'confirm', 'agreed', 'affirmative', 'true'],
  deny: ['no', 'nope', 'nah', 'negative', 'wrong', 'incorrect', 'deny', 'cancel', 'stop', "don't"],
  repeat: ['repeat', 'again', 'say again', 'what was that', 'didn\'t hear', 'pardon', 'huh', 'sorry'],
  unclear: ['um', 'uh', 'hmm', 'maybe', 'i think', 'sort of', 'kind of'],
  greeting: ['hello', 'hi', 'hey', 'good morning', 'good afternoon', 'good evening', 'start'],
  goodbye: ['bye', 'goodbye', 'end', 'stop', 'finish', 'done', 'thank', 'thanks'],
};

/**
 * Classify user intent from transcript text.
 * Uses rule-based matching first, can be extended to use Groq LLM.
 */
export function classifyIntent(transcript: string): IntentClassification {
  const lowerTranscript = transcript.toLowerCase().trim();

  // Rule-based classification
  let bestIntent: UserIntent = 'unclear';
  let bestScore = 0;
  const entities: Record<string, string> = {};

  for (const [intent, keywords] of Object.entries(INTENT_KEYWORDS)) {
    let score = 0;
    for (const keyword of keywords) {
      if (lowerTranscript.includes(keyword)) {
        score += keyword.split(' ').length; // Multi-word keywords score higher
      }
    }

    if (score > bestScore) {
      bestScore = score;
      bestIntent = intent as UserIntent;
    }
  }

  // Extract entities based on intent
  extractEntitiesForIntent(lowerTranscript, bestIntent, entities);

  // Calculate confidence
  const confidence = Math.min(bestScore * 0.2 + 0.3, 0.95);

  // Generate suggested response
  const suggestedResponse = generateSuggestedResponse(bestIntent, entities);

  return {
    intent: bestIntent,
    confidence,
    entities,
    suggestedResponse,
  };
}

/**
 * Determine conversation phase based on accumulated context.
 */
export function determineConversationPhase(
  turnCount: number,
  knownFacts: string[]
): 'greeting' | 'triage' | 'vitals' | 'guidance' | 'wrap_up' {
  if (turnCount < 2) return 'greeting';
  if (knownFacts.includes('chief_complaint')) {
    if (knownFacts.includes('heart_rate') || knownFacts.includes('bp_systolic')) {
      if (knownFacts.includes('hospital_recommended')) {
        return 'wrap_up';
      }
      return 'guidance';
    }
    return 'vitals';
  }
  return 'triage';
}

/**
 * Check if the user is providing specific information vs asking questions.
 */
export function isProvidingInfo(transcript: string): boolean {
  const infoPatterns = [
    /\d+\s*(years?\s*old|y\.?o\.?)/i, // Age
    /(?:name|patient)\s*(?:is|was)?\s+([A-Z][a-z]+)/i, // Name
    /(?:at|near|in|location)\s+([^,.]+)/i, // Location
    /\d+\s*\/\s*\d+/i, // Blood pressure
    /(?:heart rate|pulse|hr)\s*(?:is|of)?\s*\d+/i, // Heart rate
    /(?:oxygen|spo2)\s*(?:is|of)?\s*\d+/i, // SpO2
  ];

  return infoPatterns.some((pattern) => pattern.test(transcript));
}

/**
 * Detect urgency level from transcript.
 */
export function detectUrgency(transcript: string): 'CRITICAL' | 'URGENT' | 'MEDIUM' | 'LOW' {
  const lower = transcript.toLowerCase();

  const criticalKeywords = ['not breathing', 'no pulse', 'cardiac arrest', 'unconscious', 'severe bleeding', 'not responsive'];
  const urgentKeywords = ['chest pain', 'difficulty breathing', 'severe', 'emergency', 'urgent', 'unconscious', 'stroke', 'heart attack'];
  const mediumKeywords = ['pain', 'injury', 'wound', 'fever', 'vomiting', 'dizzy', 'bleeding'];

  if (criticalKeywords.some((k) => lower.includes(k))) return 'CRITICAL';
  if (urgentKeywords.some((k) => lower.includes(k))) return 'URGENT';
  if (mediumKeywords.some((k) => lower.includes(k))) return 'MEDIUM';
  return 'LOW';
}

/**
 * Detect if user is asking for something to be repeated.
 */
export function isAskingForRepeat(transcript: string): boolean {
  const repeatPatterns = ['repeat', 'say again', 'what was that', 'didn\'t hear', 'pardon', 'huh', 'sorry', 'again'];
  const lower = transcript.toLowerCase();
  return repeatPatterns.some((p) => lower.includes(p));
}

/**
 * Detect confirmation or denial.
 */
export function detectConfirmation(transcript: string): 'yes' | 'no' | 'unknown' {
  const lower = transcript.toLowerCase().trim();

  const yesPatterns = ['yes', 'yeah', 'yep', 'sure', 'ok', 'okay', 'correct', 'right', 'confirm', 'true', 'affirmative', 'that\'s right', 'exactly'];
  const noPatterns = ['no', 'nope', 'nah', 'negative', 'wrong', 'incorrect', 'deny', 'cancel', 'stop', "don't", 'not'];

  if (yesPatterns.some((p) => lower.includes(p))) return 'yes';
  if (noPatterns.some((p) => lower.includes(p))) return 'no';
  return 'unknown';
}

// ─── Helper Functions ──────────────────────────────────────

function extractEntitiesForIntent(
  transcript: string,
  intent: UserIntent,
  entities: Record<string, string>
): void {
  switch (intent) {
    case 'provide_info':
      // Extract name
      const nameMatch = transcript.match(/(?:name|patient)\s*(?:is|was)?\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i);
      if (nameMatch) entities.name = nameMatch[1];

      // Extract age
      const ageMatch = transcript.match(/(\d+)\s*(?:years?\s*old|y\.?o\.?|yo)/i);
      if (ageMatch) entities.age = ageMatch[1];

      // Extract location
      const locMatch = transcript.match(/(?:at|near|in|location)\s+([^,.]+)/i);
      if (locMatch) entities.location = locMatch[1].trim();
      break;

    case 'vitals_update':
      // Extract heart rate
      const hrMatch = transcript.match(/(?:heart rate|pulse|hr)\s*(?:is|was|of)?\s*(\d+)/i);
      if (hrMatch) entities.heart_rate = hrMatch[1];

      // Extract BP
      const bpMatch = transcript.match(/(\d+)\s*\/\s*(\d+)/i);
      if (bpMatch) {
        entities.bp_systolic = bpMatch[1];
        entities.bp_diastolic = bpMatch[2];
      }

      // Extract SpO2
      const spo2Match = transcript.match(/(?:oxygen|spo2)\s*(?:is|was|of)?\s*(\d+)/i);
      if (spo2Match) entities.spo2 = spo2Match[1];
      break;

    case 'new_emergency':
      // Extract emergency type
      const emergencyTypes = ['chest pain', 'breathing', 'bleeding', 'unconscious', 'accident', 'fall', 'burn', 'choking'];
      for (const type of emergencyTypes) {
        if (transcript.includes(type)) {
          entities.emergency_type = type;
          break;
        }
      }
      break;
  }
}

function generateSuggestedResponse(
  intent: UserIntent,
  entities: Record<string, string>
): string {
  const responses: Record<UserIntent, string> = {
    new_emergency: 'I understand this is an emergency. Let me create a case and help you. What is your current location?',
    vitals_update: 'Thank you for the vitals. Any other vital signs to report?',
    hospital_request: 'I will find the nearest suitable hospital for you.',
    first_aid_request: 'I will guide you through first aid steps.',
    provide_info: `Got it. ${entities.name ? `Patient name ${entities.name}. ` : ''}${entities.location ? `Location ${entities.location}. ` : ''}What is the main problem?`,
    ask_question: 'Let me help you with that question.',
    confirm: 'Thank you for confirming.',
    deny: 'Understood. Let me adjust.',
    repeat: 'I will repeat that for you.',
    unclear: 'I did not understand. Could you please repeat or rephrase?',
    greeting: 'Hello, this is VitaVoice Emergency Assistant. Is this a medical emergency?',
    goodbye: 'Stay safe. If you need help again, call back anytime.',
  };

  return responses[intent] || 'I understand. Please continue.';
}
