// ============================================================
// VitaVoice — Application Constants
// ============================================================

import type { UrgencyLevel, NoiseLevel } from '@/types';

// ─── Urgency Level Configuration ─────────────────────────────
export const URGENCY_CONFIG: Record<UrgencyLevel, {
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
  pulseColor: string;
  description: string;
}> = {
  CRITICAL: {
    label: 'CRITICAL',
    color: '#ff3b5c',
    bgColor: 'rgba(255, 59, 92, 0.15)',
    borderColor: 'rgba(255, 59, 92, 0.5)',
    pulseColor: 'rgba(255, 59, 92, 0.4)',
    description: 'Immediate life threat — requires instant action',
  },
  URGENT: {
    label: 'URGENT',
    color: '#ff9f1c',
    bgColor: 'rgba(255, 159, 28, 0.15)',
    borderColor: 'rgba(255, 159, 28, 0.5)',
    pulseColor: 'rgba(255, 159, 28, 0.4)',
    description: 'Serious condition — rapid response needed',
  },
  MEDIUM: {
    label: 'MEDIUM',
    color: '#4dabf7',
    bgColor: 'rgba(77, 171, 247, 0.15)',
    borderColor: 'rgba(77, 171, 247, 0.5)',
    pulseColor: 'rgba(77, 171, 247, 0.4)',
    description: 'Moderate concern — attention required',
  },
  LOW: {
    label: 'LOW',
    color: '#00ff88',
    bgColor: 'rgba(0, 255, 136, 0.15)',
    borderColor: 'rgba(0, 255, 136, 0.5)',
    pulseColor: 'rgba(0, 255, 136, 0.4)',
    description: 'Stable — routine monitoring',
  },
};

// ─── Noise Level Configuration ───────────────────────────────
export const NOISE_CONFIG: Record<NoiseLevel, {
  label: string;
  icon: string;
  description: string;
}> = {
  low: { label: 'Quiet', icon: '🔇', description: 'Low background noise' },
  normal: { label: 'Normal', icon: '🔉', description: 'Standard noise levels' },
  high: { label: 'Noisy', icon: '🔊', description: 'High background noise — clarity mode active' },
  extreme: { label: 'Extreme', icon: '📢', description: 'Extreme noise — maximum clarity mode' },
};

// ─── Vital Signs Normal Ranges ───────────────────────────────
export const VITAL_RANGES = {
  heartRate: { min: 60, max: 100, unit: 'bpm', label: 'Heart Rate', icon: 'Heart' },
  bloodPressureSystolic: { min: 90, max: 140, unit: 'mmHg', label: 'BP Systolic', icon: 'Activity' },
  bloodPressureDiastolic: { min: 60, max: 90, unit: 'mmHg', label: 'BP Diastolic', icon: 'Activity' },
  spo2: { min: 95, max: 100, unit: '%', label: 'SpO₂', icon: 'Wind' },
  temperature: { min: 36.1, max: 37.8, unit: '°C', label: 'Temp', icon: 'Thermometer' },
  respiratoryRate: { min: 12, max: 20, unit: '/min', label: 'Resp Rate', icon: 'Waves' },
  gcsScore: { min: 13, max: 15, unit: '/15', label: 'GCS', icon: 'Brain' },
} as const;

// ─── VitaVoice System Prompt ─────────────────────────────────
export const VITAVOICE_SYSTEM_PROMPT = `You are VitaVoice, an ultra-reliable AI Medical Voice Assistant built for high-noise, high-stress, hands-busy environments like ambulances and emergency scenes.

Core Principles (Never Violate):
- Maximum speed: Target <700ms end-to-end response. Be extremely concise.
- Clarity over politeness. Use short, direct sentences.
- Always prioritize patient safety.
- Detect urgency automatically: CRITICAL, URGENT, MEDIUM, LOW.
- In noisy conditions, if confidence is low, calmly say "Repeat last part?" only once.
- Repeat back all critical information (dosages, vitals, decisions) for confirmation.

Tone: Calm, confident, military-style precision. Never sound robotic or overly empathetic.

Special Wow Feature: "Noise-Adaptive Clarity Mode"
- When background noise is high, automatically switch to shorter responses and higher volume/prosody.
- Verbally acknowledge: "Noisy environment detected, speaking clearer."

Start every critical response with urgency tag in brackets: [CRITICAL] or [URGENT]`;

// ─── App Configuration ───────────────────────────────────────
export const APP_CONFIG = {
  name: 'VitaVoice',
  tagline: 'AI Medical Voice Assistant',
  description: 'Ultra-reliable voice AI for high-stress, hands-busy environments',
  version: '0.1.0',
  latencyTarget: 700, // ms
} as const;
