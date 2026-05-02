'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { EmergencyCase } from '@/types';
import type { EmergencyCaseRow } from '@/lib/supabase/types';

/** Map DB row to app-level EmergencyCase */
function mapRowToCase(row: EmergencyCaseRow): EmergencyCase {
  return {
    id: row.id,
    retellCallId: row.retell_call_id,
    patientName: row.patient_name,
    patientAge: row.patient_age,
    patientGender: row.patient_gender,
    location: row.location,
    emsUnit: row.ems_unit,
    chiefComplaint: row.chief_complaint,
    urgencyLevel: row.urgency_level,
    status: row.status,
    noiseLevel: row.noise_level,
    noiseAdaptiveMode: row.noise_adaptive_mode,
    callDurationSeconds: row.call_duration_seconds,
    summary: row.summary,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Subscribe to real-time updates for the most recent active case.
 */
export function useRealtimeCase() {
  const [activeCase, setActiveCase] = useState<EmergencyCase | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchActiveCase = useCallback(async () => {
    try {
      const supabase = createClient();
      const { data, error: fetchError } = await supabase
        .from('emergency_cases')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (fetchError) throw fetchError;
      setActiveCase(data ? mapRowToCase(data) : null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch case');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchActiveCase();

    const supabase = createClient();
    const channel = supabase
      .channel('active-case')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'emergency_cases' },
        (payload) => {
          setActiveCase(mapRowToCase(payload.new as EmergencyCaseRow));
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'emergency_cases' },
        (payload) => {
          const updated = mapRowToCase(payload.new as EmergencyCaseRow);
          setActiveCase((prev) => {
            if (prev && prev.id === updated.id) {
              return updated.status === 'active' ? updated : null;
            }
            if (updated.status === 'active') return updated;
            return prev;
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchActiveCase]);

  return { activeCase, loading, error };
}
