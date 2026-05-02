import {
  parseUrgencyFromText,
  extractVitalsFromText,
  formatTimestamp,
  formatDuration,
  getVitalStatus,
  cn,
} from '@/lib/utils';

describe('cn (className merger)', () => {
  it('merges simple classes', () => {
    expect(cn('foo', 'bar')).toBe('foo bar');
  });

  it('handles conditional classes', () => {
    expect(cn('base', false && 'hidden', true && 'visible')).toBe('base visible');
  });

  it('deduplicates tailwind conflicts', () => {
    expect(cn('px-4', 'px-6')).toBe('px-6');
  });
});

describe('parseUrgencyFromText', () => {
  it('detects explicit [CRITICAL] tag', () => {
    expect(parseUrgencyFromText('[CRITICAL] Patient in cardiac arrest')).toBe('CRITICAL');
  });

  it('detects explicit [URGENT] tag', () => {
    expect(parseUrgencyFromText('[URGENT] Chest pain reported')).toBe('URGENT');
  });

  it('detects explicit [MEDIUM] tag', () => {
    expect(parseUrgencyFromText('[MEDIUM] Minor laceration')).toBe('MEDIUM');
  });

  it('detects explicit [LOW] tag', () => {
    expect(parseUrgencyFromText('[LOW] Routine checkup')).toBe('LOW');
  });

  it('detects critical keywords', () => {
    expect(parseUrgencyFromText('Patient is not breathing, no pulse detected')).toBe('CRITICAL');
  });

  it('detects urgent keywords', () => {
    expect(parseUrgencyFromText('Patient reports severe chest pain')).toBe('URGENT');
  });

  it('returns null when no urgency detected', () => {
    expect(parseUrgencyFromText('Hello, how can I help you today?')).toBeNull();
  });

  it('is case-insensitive for tags', () => {
    expect(parseUrgencyFromText('[critical] Emergency!')).toBe('CRITICAL');
  });

  it('is case-insensitive for keywords', () => {
    expect(parseUrgencyFromText('CARDIAC ARREST in progress')).toBe('CRITICAL');
  });
});

describe('extractVitalsFromText', () => {
  it('extracts heart rate', () => {
    expect(extractVitalsFromText('HR 120')).toEqual({ heartRate: 120 });
  });

  it('extracts heart rate with "is" phrasing', () => {
    expect(extractVitalsFromText('heart rate is 95')).toEqual({ heartRate: 95 });
  });

  it('extracts blood pressure', () => {
    expect(extractVitalsFromText('BP 120/80')).toEqual({
      bloodPressureSystolic: 120,
      bloodPressureDiastolic: 80,
    });
  });

  it('extracts blood pressure with "over"', () => {
    expect(extractVitalsFromText('blood pressure is 140 over 90')).toEqual({
      bloodPressureSystolic: 140,
      bloodPressureDiastolic: 90,
    });
  });

  it('extracts SpO2', () => {
    expect(extractVitalsFromText('SpO2 98%')).toEqual({ spo2: 98 });
  });

  it('extracts temperature', () => {
    expect(extractVitalsFromText('temp 38.5')).toEqual({ temperature: 38.5 });
  });

  it('extracts respiratory rate', () => {
    expect(extractVitalsFromText('RR 18')).toEqual({ respiratoryRate: 18 });
  });

  it('extracts GCS score', () => {
    expect(extractVitalsFromText('GCS 12')).toEqual({ gcsScore: 12 });
  });

  it('rejects invalid GCS scores', () => {
    expect(extractVitalsFromText('GCS 2')).toEqual({});
    expect(extractVitalsFromText('GCS 16')).toEqual({});
  });

  it('extracts multiple vitals from one text', () => {
    const text = 'HR 110, BP 130/85, SpO2 96%, temp 37.2, RR 22, GCS 15';
    const result = extractVitalsFromText(text);
    expect(result.heartRate).toBe(110);
    expect(result.bloodPressureSystolic).toBe(130);
    expect(result.bloodPressureDiastolic).toBe(85);
    expect(result.spo2).toBe(96);
    expect(result.temperature).toBe(37.2);
    expect(result.respiratoryRate).toBe(22);
    expect(result.gcsScore).toBe(15);
  });

  it('returns empty object when no vitals found', () => {
    expect(extractVitalsFromText('Patient is alert and oriented')).toEqual({});
  });
});

describe('formatDuration', () => {
  it('formats seconds as MM:SS', () => {
    expect(formatDuration(65)).toBe('01:05');
  });

  it('formats zero', () => {
    expect(formatDuration(0)).toBe('00:00');
  });

  it('formats hours as HH:MM:SS', () => {
    expect(formatDuration(3661)).toBe('01:01:01');
  });
});

describe('formatTimestamp', () => {
  it('returns a time string', () => {
    const result = formatTimestamp('2024-01-01T10:30:45.000Z');
    expect(result).toBeDefined();
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });
});

describe('getVitalStatus', () => {
  it('returns normal for values within range', () => {
    expect(getVitalStatus(75, 60, 100)).toBe('normal');
  });

  it('returns warning for values slightly outside range', () => {
    expect(getVitalStatus(55, 60, 100)).toBe('warning');
    expect(getVitalStatus(105, 60, 100)).toBe('warning');
  });

  it('returns critical for values far outside range', () => {
    expect(getVitalStatus(40, 60, 100)).toBe('critical');
    expect(getVitalStatus(130, 60, 100)).toBe('critical');
  });

  it('returns normal for null values', () => {
    expect(getVitalStatus(null, 60, 100)).toBe('normal');
  });
});
