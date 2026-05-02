'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { CallStatus } from '@/types';
import type { VitalReading } from '@/types';
import type { VitalsLogRow } from '@/lib/supabase/types';

function mapRowToVital(row: VitalsLogRow): VitalReading {
  return {
    id: row.id,
    caseId: row.case_id,
    heartRate: row.heart_rate,
    bloodPressureSystolic: row.blood_pressure_systolic,
    bloodPressureDiastolic: row.blood_pressure_diastolic,
    spo2: row.spo2,
    temperature: row.temperature ? Number(row.temperature) : null,
    respiratoryRate: row.respiratory_rate,
    gcsScore: row.gcs_score,
    recordedAt: row.recorded_at,
  };
}

/**
 * Derives call status from case status and tracks latest vitals.
 */
export function useCallStatus(caseStatus: string | null, caseId: string | null) {
  const [callStatus, setCallStatus] = useState<CallStatus>('idle');
  const [latestVitals, setLatestVitals] = useState<VitalReading | null>(null);

  // Derive call status from case status
  useEffect(() => {
    if (!caseStatus) {
      setCallStatus('idle');
      return;
    }
    switch (caseStatus) {
      case 'active':
        setCallStatus('active');
        break;
      case 'completed':
        setCallStatus('ended');
        break;
      case 'cancelled':
        setCallStatus('ended');
        break;
      default:
        setCallStatus('idle');
    }
  }, [caseStatus]);

  // Fetch and subscribe to latest vitals
  const fetchVitals = useCallback(async (id: string) => {
    const supabase = createClient();
    const { data } = await supabase
      .from('vitals_log')
      .select('*')
      .eq('case_id', id)
      .order('recorded_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (data) setLatestVitals(mapRowToVital(data));
  }, []);

  useEffect(() => {
    if (!caseId) {
      setLatestVitals(null);
      return;
    }

    fetchVitals(caseId);

    const supabase = createClient();
    const channel = supabase
      .channel(`vitals-${caseId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'vitals_log',
          filter: `case_id=eq.${caseId}`,
        },
        (payload) => {
          setLatestVitals(mapRowToVital(payload.new as VitalsLogRow));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [caseId, fetchVitals]);

  return { callStatus, setCallStatus, latestVitals };
}
