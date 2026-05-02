/**
 * Unit test: Retell AI tool handlers
 * Tests each tool implementation with mocked Supabase
 */

import { handleToolCall } from '@/lib/retell/tool-handlers';

const mockInsert = jest.fn().mockReturnValue({
  select: jest.fn().mockReturnValue({
    single: jest.fn().mockResolvedValue({
      data: { id: 'case-123' },
      error: null,
    }),
  }),
});

const mockUpdate = jest.fn().mockReturnValue({
  eq: jest.fn().mockResolvedValue({ data: null, error: null }),
});

const mockSelect = jest.fn().mockReturnValue({
  eq: jest.fn().mockReturnValue({
    eq: jest.fn().mockReturnValue({
      order: jest.fn().mockReturnValue({
        limit: jest.fn().mockReturnValue({
          maybeSingle: jest.fn().mockResolvedValue({
            data: { id: 'case-123', noise_level: 'normal', noise_adaptive_mode: false },
            error: null,
          }),
        }),
      }),
    }),
    single: jest.fn().mockResolvedValue({
      data: { id: 'case-123' },
      error: null,
    }),
  }),
  ilike: jest.fn().mockReturnValue({
    order: jest.fn().mockReturnValue({
      limit: jest.fn().mockResolvedValue({
        data: [],
        error: null,
      }),
    }),
  }),
  neq: jest.fn().mockReturnValue({
    order: jest.fn().mockReturnValue({
      limit: jest.fn().mockReturnValue({
        data: [],
        error: null,
      }),
    }),
  }),
  contains: jest.fn().mockReturnValue({
    order: jest.fn().mockReturnValue({
      limit: jest.fn().mockReturnValue({
        data: [],
        error: null,
      }),
    }),
  }),
});

jest.mock('@/lib/supabase/server', () => ({
  createServerClient: () => ({
    from: () => ({
      insert: mockInsert,
      select: mockSelect,
      update: mockUpdate,
      eq: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({ data: null, error: null }),
      }),
    }),
  }),
}));

describe('Tool Handlers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('create_emergency_case', () => {
    it('creates a case with given details', async () => {
      const result = await handleToolCall('create_emergency_case', {
        patient_name: 'Ramesh',
        location: 'NH-44 Koyambedu',
        chief_complaint: 'Chest pain',
        urgency_level: 'URGENT',
      }, 'call-1');

      expect(result.success).toBe(true);
      expect(result.data).toMatchObject({
        case_id: 'case-123',
        created: true,
        urgency: 'URGENT',
      });
    });

    it('defaults to LOW urgency when not provided', async () => {
      const result = await handleToolCall('create_emergency_case', {
        patient_name: 'Unknown',
        location: 'Unknown',
        chief_complaint: 'Unknown',
      }, 'call-1');

      expect(result.success).toBe(true);
      expect(result.data).toMatchObject({ urgency: 'LOW' });
    });
  });

  describe('log_vitals', () => {
    it('logs vitals and returns vital_id', async () => {
      const result = await handleToolCall('log_vitals', {
        case_id: 'current',
        heart_rate: 120,
        bp_systolic: 110,
        bp_diastolic: 70,
        spo2: 98,
      }, 'call-1');

      expect(result.success).toBe(true);
      expect(result.data).toMatchObject({
        vital_id: 'case-123',
        recorded: true,
      });
    });
  });

  describe('get_patient_history', () => {
    it('returns empty history when no matches', async () => {
      const result = await handleToolCall('get_patient_history', {
        patient_name: 'NoMatch',
      }, 'call-1');

      expect(result.success).toBe(true);
      expect(result.data).toMatchObject({ found: false });
    });

    it('rejects short patient names', async () => {
      const result = await handleToolCall('get_patient_history', {
        patient_name: 'A',
      }, 'call-1');

      expect(result.success).toBe(false);
      expect(result.error).toContain('too short');
    });
  });

  describe('find_nearest_hospital', () => {
    it('returns no hospitals when none match', async () => {
      const result = await handleToolCall('find_nearest_hospital', {
        location: 'Chennai',
      }, 'call-1');

      expect(result.success).toBe(true);
      expect(result.data).toMatchObject({ found: false });
    });
  });

  describe('notify_supervisor', () => {
    it('requires double-confirmation for critical tools', async () => {
      const result = await handleToolCall('notify_supervisor', {
        case_id: 'current',
        message: 'CRITICAL: Cardiac arrest',
        urgency: 'CRITICAL',
      }, 'call-1');

      expect(result.success).toBe(false);
      expect(result.requires_confirmation).toBe(true);
      expect(result.confirmation_id).toBeDefined();
    });

    it('rejects empty message', async () => {
      const result = await handleToolCall('notify_supervisor', {
        case_id: 'current',
        message: '',
        urgency: 'URGENT',
      }, 'call-1');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Message required');
    });
  });

  describe('set_noise_level', () => {
    it('updates noise level and activates adaptive mode for high', async () => {
      const result = await handleToolCall('set_noise_level', {
        case_id: 'current',
        level: 'high',
      }, 'call-1');

      expect(result.success).toBe(true);
      expect(result.data).toMatchObject({
        noise_level: 'high',
        adaptive_mode: true,
      });
    });

    it('deactivates adaptive mode for normal', async () => {
      const result = await handleToolCall('set_noise_level', {
        case_id: 'current',
        level: 'normal',
      }, 'call-1');

      expect(result.success).toBe(true);
      expect(result.data).toMatchObject({
        noise_level: 'normal',
        adaptive_mode: false,
      });
    });
  });

  describe('unknown tool', () => {
    it('returns error for unknown tool name', async () => {
      const result = await handleToolCall('fake_tool', {}, 'call-1');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Unknown tool');
    });
  });
});
