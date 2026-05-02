// ============================================================
// VitaVoice — Utility Functions
// ============================================================

import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { UrgencyLevel } from '@/types';

/**
 * Merge Tailwind CSS classes with conflict resolution.
 * Combines clsx for conditional classes with tailwind-merge for deduplication.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/**
 * Parse urgency level from transcript text.
 * Looks for explicit tags like [CRITICAL], [URGENT] or keyword-based detection.
 */
export function parseUrgencyFromText(text: string): UrgencyLevel | null {
  const upper = text.toUpperCase();

  // Check for explicit urgency tags
  if (upper.includes('[CRITICAL]')) return 'CRITICAL';
  if (upper.includes('[URGENT]')) return 'URGENT';
  if (upper.includes('[MEDIUM]')) return 'MEDIUM';
  if (upper.includes('[LOW]')) return 'LOW';

  // Keyword-based detection
  const criticalKeywords = [
    'cardiac arrest', 'not breathing', 'no pulse', 'unresponsive',
    'severe hemorrhage', 'anaphylaxis', 'stroke', 'choking',
    'massive bleeding', 'code blue',
  ];
  const urgentKeywords = [
    'chest pain', 'difficulty breathing', 'severe pain',
    'head injury', 'fracture', 'seizure', 'unconscious',
    'high fever', 'allergic reaction', 'burns',
  ];

  const lowerText = text.toLowerCase();

  if (criticalKeywords.some((kw) => lowerText.includes(kw))) return 'CRITICAL';
  if (urgentKeywords.some((kw) => lowerText.includes(kw))) return 'URGENT';

  return null;
}

/**
 * Extract vital signs from transcript text using pattern matching.
 * Returns an object with any vitals found.
 */
export function extractVitalsFromText(text: string): {
  heartRate?: number;
  bloodPressureSystolic?: number;
  bloodPressureDiastolic?: number;
  spo2?: number;
  temperature?: number;
  respiratoryRate?: number;
  gcsScore?: number;
} {
  const vitals: Record<string, number> = {};

  // Heart rate: "HR 120", "heart rate 120", "pulse 120"
  const hrMatch = text.match(/(?:hr|heart\s*rate|pulse)\s*(?:is|:)?\s*(\d{2,3})/i);
  if (hrMatch) vitals.heartRate = parseInt(hrMatch[1], 10);

  // Blood pressure: "BP 120/80", "blood pressure 120 over 80"
  const bpMatch = text.match(/(?:bp|blood\s*pressure)\s*(?:is|:)?\s*(\d{2,3})\s*[/over]+\s*(\d{2,3})/i);
  if (bpMatch) {
    vitals.bloodPressureSystolic = parseInt(bpMatch[1], 10);
    vitals.bloodPressureDiastolic = parseInt(bpMatch[2], 10);
  }

  // SpO2: "SpO2 98", "oxygen sat 98", "O2 sat 98%"
  const spo2Match = text.match(/(?:spo2|sp\s*o2|oxygen\s*sat|o2\s*sat)\s*(?:is|:)?\s*(\d{2,3})\s*%?/i);
  if (spo2Match) vitals.spo2 = parseInt(spo2Match[1], 10);

  // Temperature: "temp 38.5", "temperature 101.2"
  const tempMatch = text.match(/(?:temp|temperature)\s*(?:is|:)?\s*(\d{2,3}(?:\.\d)?)/i);
  if (tempMatch) vitals.temperature = parseFloat(tempMatch[1]);

  // Respiratory rate: "RR 18", "resp rate 18", "breathing rate 18"
  const rrMatch = text.match(/(?:rr|resp(?:iratory)?\s*rate|breathing\s*rate)\s*(?:is|:)?\s*(\d{1,2})/i);
  if (rrMatch) vitals.respiratoryRate = parseInt(rrMatch[1], 10);

  // GCS: "GCS 15", "Glasgow 12"
  const gcsMatch = text.match(/(?:gcs|glasgow)\s*(?:score|is|:)?\s*(\d{1,2})/i);
  if (gcsMatch) {
    const score = parseInt(gcsMatch[1], 10);
    if (score >= 3 && score <= 15) vitals.gcsScore = score;
  }

  return vitals;
}

/**
 * Format a timestamp for display in the transcript.
 */
export function formatTimestamp(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

/**
 * Format call duration from seconds to MM:SS or HH:MM:SS.
 */
export function formatDuration(seconds: number): string {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hrs > 0) {
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Determine if a vital reading is within normal range.
 * Returns 'normal', 'warning', or 'critical'.
 */
export function getVitalStatus(
  value: number | null,
  min: number,
  max: number
): 'normal' | 'warning' | 'critical' {
  if (value === null) return 'normal';
  if (value < min * 0.8 || value > max * 1.2) return 'critical';
  if (value < min || value > max) return 'warning';
  return 'normal';
}
