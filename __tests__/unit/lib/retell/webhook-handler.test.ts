import { handleWebhookEvent } from '@/lib/retell/webhook-handler';
import type { RetellWebhookEvent } from '@/lib/retell/types';

// Mock the Supabase server client
const mockInsert = jest.fn().mockReturnValue({
  select: jest.fn().mockReturnValue({
    single: jest.fn().mockResolvedValue({
      data: { id: 'test-case-id' },
      error: null,
    }),
  }),
});

const mockUpdate = jest.fn().mockReturnValue({
  eq: jest.fn().mockResolvedValue({ data: null, error: null }),
});

const mockSelect = jest.fn().mockReturnValue({
  eq: jest.fn().mockReturnValue({
    single: jest.fn().mockResolvedValue({
      data: { id: 'test-case-id' },
      error: null,
    }),
  }),
});

const mockFrom = jest.fn((table: string) => ({
  insert: mockInsert,
  update: mockUpdate,
  select: mockSelect,
}));

jest.mock('@/lib/supabase/server', () => ({
  createServerClient: () => ({
    from: mockFrom,
  }),
}));

describe('handleWebhookEvent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Re-setup mock chain for each test
    mockInsert.mockReturnValue({
      select: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({
          data: { id: 'test-case-id' },
          error: null,
        }),
      }),
    });
  });

  it('handles call_started event', async () => {
    const event: RetellWebhookEvent = {
      event: 'call_started',
      call: {
        call_id: 'retell-call-123',
        agent_id: 'agent-456',
        call_status: 'registered',
      },
    };

    await handleWebhookEvent(event);

    // Should create emergency case
    expect(mockFrom).toHaveBeenCalledWith('emergency_cases');
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        retell_call_id: 'retell-call-123',
        status: 'active',
        urgency_level: 'LOW',
      })
    );

    // Should create initial timeline entry
    expect(mockFrom).toHaveBeenCalledWith('case_timeline');
  });

  it('handles call_ended event', async () => {
    const event: RetellWebhookEvent = {
      event: 'call_ended',
      call: {
        call_id: 'retell-call-123',
        agent_id: 'agent-456',
        call_status: 'ended',
        duration_ms: 45000,
        transcript: 'Patient reports chest pain. HR 110, BP 140/90.',
        transcript_object: [
          { role: 'user', content: 'Patient reports chest pain' },
          { role: 'agent', content: '[URGENT] Assessing vitals' },
        ],
        disconnection_reason: 'agent_hangup',
      },
    };

    await handleWebhookEvent(event);

    // Should look up the case
    expect(mockFrom).toHaveBeenCalledWith('emergency_cases');
    expect(mockSelect).toHaveBeenCalled();
  });

  it('handles call_analyzed event', async () => {
    const event: RetellWebhookEvent = {
      event: 'call_analyzed',
      call: {
        call_id: 'retell-call-123',
        agent_id: 'agent-456',
        call_status: 'ended',
        call_analysis: {
          call_summary: 'Patient assessed for chest pain. Vitals stable.',
          user_sentiment: 'neutral',
          call_successful: true,
        },
      },
    };

    await handleWebhookEvent(event);

    expect(mockFrom).toHaveBeenCalledWith('emergency_cases');
  });

  it('handles unknown event types gracefully', async () => {
    const event = {
      event: 'unknown_event' as any,
      call: {
        call_id: 'test',
        agent_id: 'test',
        call_status: 'ended' as const,
      },
    };

    // Should not throw
    await expect(handleWebhookEvent(event)).resolves.not.toThrow();
  });
});
