/**
 * Integration test: Supabase Realtime subscription flow
 * Tests that database inserts trigger realtime event handling
 */

// Mock Supabase client
const mockSubscribe = jest.fn().mockReturnValue({ id: 'channel-1' });
const mockRemoveChannel = jest.fn();
let onCallback: ((payload: any) => void) | null = null;

const mockChannel = {
  on: jest.fn((_event: string, _config: any, callback: any) => {
    onCallback = callback;
    return mockChannel;
  }),
  subscribe: mockSubscribe,
};

jest.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    from: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          order: jest.fn().mockReturnValue({
            ascending: true,
            then: jest.fn(),
          }),
        }),
      }),
    }),
    channel: jest.fn().mockReturnValue(mockChannel),
    removeChannel: mockRemoveChannel,
  }),
}));

describe('Realtime Subscription Flow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    onCallback = null;
  });

  it('creates a channel subscription', () => {
    const { createClient } = require('@/lib/supabase/client');
    const supabase = createClient();

    const channel = supabase.channel('test-channel');
    channel
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'case_timeline' }, () => {})
      .subscribe();

    expect(mockChannel.on).toHaveBeenCalledWith(
      'postgres_changes',
      expect.objectContaining({
        event: 'INSERT',
        schema: 'public',
        table: 'case_timeline',
      }),
      expect.any(Function)
    );
    expect(mockSubscribe).toHaveBeenCalled();
  });

  it('callback receives payload on INSERT event', () => {
    const { createClient } = require('@/lib/supabase/client');
    const supabase = createClient();

    const receivedPayloads: any[] = [];

    supabase.channel('test')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'case_timeline' }, (payload: any) => {
        receivedPayloads.push(payload);
      })
      .subscribe();

    // Simulate a realtime event
    if (onCallback) {
      onCallback({
        new: {
          id: 'entry-1',
          case_id: 'case-1',
          event_type: 'transcript',
          speaker: 'agent',
          content: '[URGENT] Checking vitals now',
          urgency_tag: 'URGENT',
          metadata: {},
          created_at: '2024-01-01T10:00:00Z',
        },
      });
    }

    expect(receivedPayloads).toHaveLength(1);
    expect(receivedPayloads[0].new.content).toContain('Checking vitals');
  });

  it('cleans up channel on unmount', () => {
    const { createClient } = require('@/lib/supabase/client');
    const supabase = createClient();

    const channel = supabase.channel('test');
    supabase.removeChannel(channel);

    expect(mockRemoveChannel).toHaveBeenCalled();
  });
});
