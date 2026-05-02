'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { TranscriptEntry } from '@/types';
import type { CaseTimelineRow } from '@/lib/supabase/types';

/** Map DB row to app-level TranscriptEntry */
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
 * Subscribe to real-time transcript entries for a specific case.
 * Returns live-updating transcript array.
 */
export function useRealtimeTranscript(caseId: string | null) {
  const [entries, setEntries] = useState<TranscriptEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchInitial = useCallback(async (id: string) => {
    try {
      const supabase = createClient();
      const { data, error: fetchError } = await supabase
        .from('case_timeline')
        .select('*')
        .eq('case_id', id)
        .order('created_at', { ascending: true });

      if (fetchError) throw fetchError;
      setEntries((data ?? []).map(mapRowToEntry));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch transcript');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!caseId) {
      setEntries([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    fetchInitial(caseId);

    const supabase = createClient();
    const channel = supabase
      .channel(`transcript-${caseId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'case_timeline',
          filter: `case_id=eq.${caseId}`,
        },
        (payload) => {
          const newEntry = mapRowToEntry(payload.new as CaseTimelineRow);
          setEntries((prev) => [...prev, newEntry]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [caseId, fetchInitial]);

  return { entries, loading, error };
}
