/**
 * Unit test: useRealtimeTranscript hook
 * Tests subscription setup/teardown and state updates
 */

import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { useRealtimeTranscript } from '@/hooks/useRealtimeTranscript';

const mockSubscribe = jest.fn().mockReturnValue({ id: 'channel-1' });
const mockRemoveChannel = jest.fn();
let mockOnCallback: ((payload: any) => void) | null = null;

const mockChannel = {
  on: jest.fn((_event: string, _config: any, callback: any) => {
    mockOnCallback = callback;
    return mockChannel;
  }),
  subscribe: mockSubscribe,
};

const mockFrom = jest.fn().mockReturnValue({
  select: jest.fn().mockReturnValue({
    eq: jest.fn().mockReturnValue({
      order: jest.fn().mockResolvedValue({ data: [], error: null }),
    }),
  }),
});

jest.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    from: mockFrom,
    channel: jest.fn().mockReturnValue(mockChannel),
    removeChannel: mockRemoveChannel,
  }),
}));

describe('useRealtimeTranscript', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockOnCallback = null;
  });

  it('returns empty entries when caseId is null', () => {
    const { result } = renderHook(() => useRealtimeTranscript(null));
    expect(result.current.entries).toEqual([]);
    expect(result.current.loading).toBe(false);
  });

  it('sets up a channel subscription for a given caseId', async () => {
    const { result } = renderHook(() => useRealtimeTranscript('case-1'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(mockSubscribe).toHaveBeenCalled();
  });

  it('appends new entries on realtime INSERT event', async () => {
    const { result } = renderHook(() => useRealtimeTranscript('case-1'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(mockOnCallback).not.toBeNull();

    mockOnCallback!({
      new: {
        id: 'entry-1',
        case_id: 'case-1',
        event_type: 'transcript',
        speaker: 'agent',
        content: 'Checking vitals now',
        urgency_tag: null,
        metadata: {},
        created_at: '2024-01-01T10:00:00Z',
      },
    });

    await waitFor(() => {
      expect(result.current.entries).toHaveLength(1);
    });

    expect(result.current.entries[0].content).toBe('Checking vitals now');
    expect(result.current.entries[0].speaker).toBe('agent');
  });

  it('cleans up channel on unmount', async () => {
    const { unmount } = renderHook(() => useRealtimeTranscript('case-1'));

    await waitFor(() => {
      expect(mockSubscribe).toHaveBeenCalled();
    });

    unmount();
    expect(mockRemoveChannel).toHaveBeenCalled();
  });
});
