'use client';

import { Card, CardContent } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import type { TranscriptEntry } from '@/types';
import { MessageCircleQuestion } from 'lucide-react';

interface ClarificationPanelProps {
  clarification: TranscriptEntry | null;
  loading?: boolean;
}

export function ClarificationPanel({ clarification, loading = false }: ClarificationPanelProps) {
  if (loading) {
    return (
      <Card variant="elevated" id="clarification-panel">
        <CardContent className="pt-5">
          <h2 className="text-sm font-bold text-white mb-3">Clarification Needed</h2>
          <Skeleton lines={2} />
        </CardContent>
      </Card>
    );
  }

  if (!clarification) {
    return (
      <Card variant="elevated" id="clarification-panel">
        <CardContent className="pt-5">
          <h2 className="text-sm font-bold text-white mb-3">Clarification Needed</h2>
          <div className="text-center py-4">
            <MessageCircleQuestion className="h-6 w-6 mx-auto text-white/20 mb-2" />
            <p className="text-xs text-white/30">No pending clarifications</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card variant="elevated" id="clarification-panel">
      <CardContent className="pt-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-white">Clarification Needed</h2>
          <span className="animate-pulse h-2 w-2 rounded-full bg-[#ff9f1c]" />
        </div>

        <div className="rounded-xl border border-[#ff9f1c]/20 bg-[#ff9f1c]/5 p-3">
          <div className="flex items-start gap-2">
            <MessageCircleQuestion className="h-4 w-4 text-[#ff9f1c] flex-shrink-0 mt-0.5" />
            <p className="text-xs text-white/80 leading-relaxed">{clarification.content}</p>
          </div>
          <div className="mt-2 text-[10px] text-white/30 font-mono">
            {new Date(clarification.createdAt).toLocaleTimeString('en-IN', {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
              hour12: false,
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
