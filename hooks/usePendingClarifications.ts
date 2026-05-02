'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { TranscriptEntry } from '@/types';
import type { CaseTimelineRow } from '@/lib/supabase/types';

function mapRowToEntry(row: CaseTimelineRow): TranscriptEntry {
  return {
    id: row.id,
    caseId: row.case_id,
    eventType: row.event_type,
    speaker: row.speaker ?? 'system',
    content: row.content,
    urgencyTag: row.urgency_tag ?? null,
    metadata: row.metadata ?? {},
    createdAt: row.created_at,
  };
}

/**
 * Subscribe to clarification_request events in the case timeline.
 */
export function usePendingClarifications(caseId: string | null) {
  const [clarifications, setClarifications] = useState<TranscriptEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchInitial = useCallback(async (id: string) => {
    try {
      const supabase = createClient();
      const { data, error: fetchError } = await supabase
        .from('case_timeline')
        .select('*')
        .eq('case_id', id)
        .eq('event_type', 'clarification_request')
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      setClarifications((data ?? []).map(mapRowToEntry));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch clarifications');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!caseId) {
      setClarifications([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    fetchInitial(caseId);

    const supabase = createClient();
    const channel = supabase
      .channel(`clarifications-${caseId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'case_timeline',
          filter: `case_id=eq.${caseId}`,
        },
        (payload) => {
          const row = payload.new as CaseTimelineRow;
          if (row.event_type === 'clarification_request') {
            const entry = mapRowToEntry(row);
            setClarifications((prev) => [entry, ...prev]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [caseId, fetchInitial]);

  return { clarifications, latestClarification: clarifications[0] ?? null, loading, error };
}
