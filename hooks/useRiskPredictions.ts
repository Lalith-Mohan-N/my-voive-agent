'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { RiskPrediction } from '@/types';
import type { RiskPredictionRow } from '@/lib/supabase/types';

function mapRowToPrediction(row: RiskPredictionRow): RiskPrediction {
  return {
    id: row.id,
    caseId: row.case_id,
    riskType: row.risk_type,
    confidence: row.confidence,
    details: row.details,
    recommendedAction: row.recommended_action,
    metadata: row.metadata ?? {},
    createdAt: row.created_at,
  };
}

/**
 * Subscribe to real-time risk predictions for a specific case.
 */
export function useRiskPredictions(caseId: string | null) {
  const [predictions, setPredictions] = useState<RiskPrediction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchInitial = useCallback(async (id: string) => {
    try {
      const supabase = createClient();
      const { data, error: fetchError } = await supabase
        .from('risk_predictions')
        .select('*')
        .eq('case_id', id)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      setPredictions((data ?? []).map(mapRowToPrediction));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch risk predictions');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!caseId) {
      setPredictions([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    fetchInitial(caseId);

    const supabase = createClient();
    const channel = supabase
      .channel(`risk-predictions-${caseId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'risk_predictions',
          filter: `case_id=eq.${caseId}`,
        },
        (payload) => {
          const newPrediction = mapRowToPrediction(payload.new as RiskPredictionRow);
          setPredictions((prev) => [newPrediction, ...prev]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [caseId, fetchInitial]);

  return { predictions, latestPrediction: predictions[0] ?? null, loading, error };
}
