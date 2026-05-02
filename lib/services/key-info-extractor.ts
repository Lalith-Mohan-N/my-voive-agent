// ============================================================
// VitaVoice — Key Information Extractor Service
// ============================================================
// Uses Groq AI to extract structured key findings from conversation
// transcripts. These findings are displayed on the dashboard as
// colored chips for quick reference by doctors and EMS.

import { Groq } from 'groq-sdk';

export interface KeyFinding {
  id: string;
  category: 'patient_info' | 'symptoms' | 'vitals' | 'allergies' | 'medications' | 'mechanism_of_injury' | 'other';
  value: string;
  importance: 'high' | 'medium' | 'low';
  source: string;
  extracted_at: string;
}

export interface ExtractionResult {
  success: boolean;
  findings: KeyFinding[];
  error?: string;
}

const GROQ_MODEL = 'llama-3.1-8b-instant';

/**
 * Extract key findings from a transcript using Groq AI.
 */
export async function extractKeyFindings(
  transcript: string,
  caseId: string
): Promise<ExtractionResult> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey || apiKey === 'your_groq_api_key') {
    return {
      success: false,
      findings: [],
      error: 'Groq API key not configured',
    };
  }

  try {
    const groq = new Groq({ apiKey });

    const prompt = `
You are a medical information extraction system for emergency medical services.
Analyze the following conversation transcript and extract key findings.

TRANSCRIPT:
"""
${transcript}
"""

Extract the following types of information:
1. PATIENT_INFO: Name, age, gender, medical history
2. SYMPTOMS: Current symptoms, chief complaint, pain levels
3. VITALS: Heart rate, BP, SpO2, temperature, GCS if mentioned
4. ALLERGIES: Any allergies mentioned
5. MEDICATIONS: Current medications
6. MECHANISM_OF_INJURY: How the injury/illness occurred
7. OTHER: Any other medically relevant information

For each finding, assign an importance level:
- HIGH: Critical for immediate treatment (allergies, severe vitals, mechanism)
- MEDIUM: Important for context (symptoms, medications)
- LOW: Supplementary information

Return ONLY a JSON array in this exact format:
[
  {
    "category": "patient_info|symptoms|vitals|allergies|medications|mechanism_of_injury|other",
    "value": "concise description",
    "importance": "high|medium|low"
  }
]

If no medically relevant information is found, return an empty array [].
Do not include any other text outside the JSON array.
`;

    const response = await groq.chat.completions.create({
      model: GROQ_MODEL,
      messages: [
        { role: 'system', content: 'You are a medical information extraction AI. Return only valid JSON.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.1,
      max_tokens: 1000,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      return { success: false, findings: [], error: 'Empty response from Groq' };
    }

    // Parse the JSON response
    let parsed: Array<{ category: string; value: string; importance: string }>;
    try {
      // Extract JSON if wrapped in markdown code blocks
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) ||
                       content.match(/```\s*([\s\S]*?)\s*```/) ||
                       [null, content];
      const jsonStr = jsonMatch[1] || content;
      parsed = JSON.parse(jsonStr.trim());
    } catch (parseError) {
      console.error('Failed to parse Groq response:', content);
      return { success: false, findings: [], error: 'Failed to parse AI response' };
    }

    // Validate and transform findings
    const findings: KeyFinding[] = parsed
      .filter((item) => item.category && item.value)
      .map((item, index) => ({
        id: `${caseId}-${Date.now()}-${index}`,
        category: validateCategory(item.category),
        value: item.value.trim(),
        importance: validateImportance(item.importance),
        source: transcript.slice(0, 200), // Store context
        extracted_at: new Date().toISOString(),
      }));

    return { success: true, findings };
  } catch (error) {
    console.error('Key info extraction error:', error);
    return {
      success: false,
      findings: [],
      error: error instanceof Error ? error.message : 'Extraction failed',
    };
  }
}

/**
 * Extract key findings from multiple transcript entries.
 */
export async function extractFindingsFromTranscript(
  transcriptEntries: Array<{ role: string; content: string }>,
  caseId: string
): Promise<ExtractionResult> {
  // Combine transcript entries into a single text
  const combinedTranscript = transcriptEntries
    .map((entry) => `${entry.role}: ${entry.content}`)
    .join('\n');

  return extractKeyFindings(combinedTranscript, caseId);
}

/**
 * Merge new findings with existing ones, avoiding duplicates.
 */
export function mergeFindings(
  existing: KeyFinding[],
  newFindings: KeyFinding[]
): KeyFinding[] {
  const merged = [...existing];

  for (const finding of newFindings) {
    // Check for duplicates (same category and similar value)
    const isDuplicate = merged.some(
      (existing) =>
        existing.category === finding.category &&
        similarity(existing.value, finding.value) > 0.8
    );

    if (!isDuplicate) {
      merged.push(finding);
    }
  }

  return merged;
}

// ─── Helper Functions ──────────────────────────────────────

function validateCategory(category: string): KeyFinding['category'] {
  const validCategories: KeyFinding['category'][] = [
    'patient_info',
    'symptoms',
    'vitals',
    'allergies',
    'medications',
    'mechanism_of_injury',
    'other',
  ];
  return validCategories.includes(category as KeyFinding['category'])
    ? (category as KeyFinding['category'])
    : 'other';
}

function validateImportance(importance: string): KeyFinding['importance'] {
  const validLevels: KeyFinding['importance'][] = ['high', 'medium', 'low'];
  return validLevels.includes(importance as KeyFinding['importance'])
    ? (importance as KeyFinding['importance'])
    : 'low';
}

function similarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase();
  const s2 = str2.toLowerCase();

  // Simple word overlap similarity
  const words1 = new Set(s1.split(/\s+/));
  const words2 = new Set(s2.split(/\s+/));

  const intersection = [...words1].filter((w) => words2.has(w)).length;
  const union = new Set([...words1, ...words2]).size;

  return union === 0 ? 0 : intersection / union;
}

/**
 * Get display label for category.
 */
export function getCategoryLabel(category: KeyFinding['category']): string {
  const labels: Record<KeyFinding['category'], string> = {
    patient_info: 'Patient',
    symptoms: 'Symptoms',
    vitals: 'Vitals',
    allergies: 'Allergies',
    medications: 'Medications',
    mechanism_of_injury: 'Injury',
    other: 'Other',
  };
  return labels[category] || 'Other';
}

/**
 * Get color class for importance level.
 */
export function getImportanceColor(importance: KeyFinding['importance']): string {
  switch (importance) {
    case 'high':
      return 'bg-red-100 text-red-800 border-red-200';
    case 'medium':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'low':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
}
