// ============================================================
// VitaVoice — First Aid Guidance Service
// ============================================================
// Provides step-by-step first aid instructions using Groq AI.
// Double-checks recommendations for safety.

import { Groq } from 'groq-sdk';

export type AgeCategory = 'infant' | 'child' | 'teen' | 'adult' | 'elderly';

export interface FirstAidRequest {
  chiefComplaint: string;
  hasFirstAidKit: boolean;
  availableItems?: string;
  patientAgeCategory: AgeCategory;
}

export interface FirstAidStep {
  step: number;
  instruction: string;
  warning?: string;
  duration?: string;
}

export interface FirstAidResponse {
  success: boolean;
  immediateActions: string[];
  steps: FirstAidStep[];
  warnings: string[];
  whenToSeekHelp: string[];
  disclaimer: string;
  error?: string;
}

const GROQ_MODEL = 'llama-3.1-8b-instant';

/**
 * Get first aid guidance from Groq AI.
 * Double-checks the response to ensure safety.
 */
export async function getFirstAidGuidance(
  request: FirstAidRequest
): Promise<FirstAidResponse> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey || apiKey === 'your_groq_api_key') {
    return {
      success: false,
      immediateActions: [],
      steps: [],
      warnings: [],
      whenToSeekHelp: [],
      disclaimer: '',
      error: 'Groq API key not configured',
    };
  }

  try {
    const groq = new Groq({ apiKey });

    const prompt = buildPrompt(request);

    // Get initial guidance
    const response = await groq.chat.completions.create({
      model: GROQ_MODEL,
      messages: [
        {
          role: 'system',
          content: `You are a certified first aid instructor. Provide clear, step-by-step first aid guidance.
CRITICAL SAFETY RULES:
- Always advise calling emergency services for serious conditions
- Never provide medication dosages
- Never suggest invasive procedures
- Always include when to seek professional help
- Include warnings for actions that could cause harm

Respond in JSON format only.`,
        },
        { role: 'user', content: prompt },
      ],
      temperature: 0.2,
      max_tokens: 1500,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      return {
        success: false,
        immediateActions: [],
        steps: [],
        warnings: [],
        whenToSeekHelp: [],
        disclaimer: '',
        error: 'Empty response from AI',
      };
    }

    // Parse the response
    let guidance: FirstAidResponse;
    try {
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) ||
                       content.match(/```\s*([\s\S]*?)\s*```/) ||
                       [null, content];
      const jsonStr = jsonMatch[1] || content;
      guidance = JSON.parse(jsonStr.trim());
    } catch {
      // Fallback parsing if JSON fails
      guidance = parseNonJsonResponse(content);
    }

    // Double-check safety with a second pass
    const verified = await verifySafety(guidance, request, groq);

    return {
      ...verified,
      disclaimer: 'This guidance is for informational purposes only and does not replace professional medical advice. Call emergency services immediately for serious conditions.',
    };
  } catch (error) {
    console.error('First aid guidance error:', error);
    return {
      success: false,
      immediateActions: [],
      steps: [],
      warnings: [],
      whenToSeekHelp: ['Contact emergency services immediately'],
      disclaimer: 'Error generating guidance. Please contact emergency services.',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Verify the safety of generated first aid guidance.
 */
async function verifySafety(
  guidance: FirstAidResponse,
  request: FirstAidRequest,
  groq: Groq
): Promise<FirstAidResponse> {
  const verificationPrompt = `
Review this first aid guidance for safety:

CHIEF COMPLAINT: ${request.chiefComplaint}
PATIENT AGE: ${request.patientAgeCategory}

GUIDANCE TO VERIFY:
${JSON.stringify(guidance, null, 2)}

Check for:
1. Any advice that could cause harm
2. Missing emergency warnings
3. Age-inappropriate instructions
4. Missing "when to seek help" guidance

Return the guidance with any safety corrections as valid JSON in the same format.
`;

  try {
    const verifyResponse = await groq.chat.completions.create({
      model: GROQ_MODEL,
      messages: [
        { role: 'system', content: 'You are a safety reviewer for first aid content. Verify and correct if needed.' },
        { role: 'user', content: verificationPrompt },
      ],
      temperature: 0.1,
      max_tokens: 1500,
    });

    const content = verifyResponse.choices[0]?.message?.content;
    if (!content) return guidance;

    try {
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) ||
                       content.match(/```\s*([\s\S]*?)\s*```/) ||
                       [null, content];
      const jsonStr = jsonMatch[1] || content;
      return JSON.parse(jsonStr.trim());
    } catch {
      return guidance;
    }
  } catch {
    return guidance;
  }
}

function buildPrompt(request: FirstAidRequest): string {
  const ageGuidance: Record<AgeCategory, string> = {
    infant: 'Patient is an INFANT (0-1 years). Use infant-appropriate techniques.',
    child: 'Patient is a CHILD (1-12 years). Use child-appropriate techniques.',
    teen: 'Patient is a TEENAGER (13-17 years). Use adolescent-appropriate techniques.',
    adult: 'Patient is an ADULT (18-64 years).',
    elderly: 'Patient is ELDERLY (65+ years). Consider age-related factors.',
  };

  const kitGuidance = request.hasFirstAidKit
    ? `First aid kit is available. Items: ${request.availableItems || 'standard kit contents'}`
    : 'No first aid kit available. Use household items if appropriate.';

  return `
Provide first aid guidance for:

SITUATION: ${request.chiefComplaint}
${ageGuidance[request.patientAgeCategory]}
${kitGuidance}

Respond with this exact JSON structure:
{
  "success": true,
  "immediateActions": ["List immediate actions to take"],
  "steps": [
    {
      "step": 1,
      "instruction": "Detailed instruction for this step",
      "warning": "Any warnings for this step (optional)",
      "duration": "How long to perform this step (optional)"
    }
  ],
  "warnings": ["General warnings"],
  "whenToSeekHelp": ["When to call emergency services"]
}

Include 3-8 clear steps. Be specific and actionable. Prioritize safety.
`;
}

function parseNonJsonResponse(content: string): FirstAidResponse {
  const steps: FirstAidStep[] = [];
  const warnings: string[] = [];
  const whenToSeekHelp: string[] = [];
  const immediateActions: string[] = [];

  const lines = content.split('\n');
  let stepNumber = 0;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Match step numbers (1. or Step 1:)
    const stepMatch = trimmed.match(/^(?:step\s*)?(\d+)[:.)]?\s*(.+)/i);
    if (stepMatch) {
      stepNumber++;
      steps.push({
        step: stepNumber,
        instruction: stepMatch[2],
      });
      continue;
    }

    // Match warnings
    if (trimmed.toLowerCase().includes('warning') || trimmed.toLowerCase().includes('caution')) {
      warnings.push(trimmed.replace(/warning|caution/i, '').trim());
      continue;
    }

    // Match emergency/when to seek help
    if (trimmed.toLowerCase().includes('emergency') || trimmed.toLowerCase().includes('call') || trimmed.toLowerCase().includes('seek help')) {
      whenToSeekHelp.push(trimmed);
      continue;
    }

    // Immediate actions
    if (trimmed.toLowerCase().includes('immediately') || trimmed.toLowerCase().includes('right away')) {
      immediateActions.push(trimmed);
    }
  }

  return {
    success: true,
    immediateActions: immediateActions.length > 0 ? immediateActions : ['Assess the situation calmly'],
    steps: steps.length > 0 ? steps : [{ step: 1, instruction: 'Call emergency services for guidance' }],
    warnings: warnings.length > 0 ? warnings : ['This is general guidance only'],
    whenToSeekHelp: whenToSeekHelp.length > 0 ? whenToSeekHelp : ['Seek professional medical help immediately'],
    disclaimer: '',
  };
}

/**
 * Format first aid guidance for voice output.
 */
export function formatForVoice(guidance: FirstAidResponse): string {
  const parts: string[] = [];

  if (guidance.immediateActions.length > 0) {
    parts.push('Immediate actions:');
    guidance.immediateActions.forEach((action) => parts.push(action));
  }

  parts.push('Here are the steps:');
  guidance.steps.forEach((step) => {
    parts.push(`Step ${step.step}: ${step.instruction}`);
    if (step.warning) {
      parts.push(`Warning: ${step.warning}`);
    }
    if (step.duration) {
      parts.push(`Continue for ${step.duration}`);
    }
  });

  if (guidance.warnings.length > 0) {
    parts.push('Important warnings:');
    guidance.warnings.forEach((warning) => parts.push(warning));
  }

  parts.push('When to seek professional help:');
  guidance.whenToSeekHelp.forEach((item) => parts.push(item));

  return parts.join('. ');
}
