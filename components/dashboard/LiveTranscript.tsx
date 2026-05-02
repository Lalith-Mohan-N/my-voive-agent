'use client';

import { useEffect, useRef } from 'react';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { formatTimestamp } from '@/lib/utils';
import type { TranscriptEntry } from '@/types';

interface LiveTranscriptProps {
  entries: TranscriptEntry[];
  loading?: boolean;
}

export function LiveTranscript({ entries, loading = false }: LiveTranscriptProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new entries arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [entries]);

  return (
    <Card variant="elevated" className="flex flex-col h-full" id="live-transcript">
      <CardHeader className="flex-shrink-0 border-b border-white/[0.06]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-[#00ff88] animate-pulse" />
            <h2 className="text-sm font-bold text-white">Live Transcript</h2>
          </div>
          <span className="text-[10px] text-white/30 font-mono">
            {entries.length} {entries.length === 1 ? 'entry' : 'entries'}
          </span>
        </div>
      </CardHeader>

      <CardContent className="flex-1 overflow-hidden p-0">
        <div
          ref={scrollRef}
          className="h-full overflow-y-auto px-5 py-4 space-y-3 scroll-smooth custom-scrollbar"
          style={{ maxHeight: 'calc(100vh - 320px)' }}
        >
          {loading && (
            <div className="space-y-4 py-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex gap-3">
                  <Skeleton className="h-6 w-16 flex-shrink-0" />
                  <Skeleton className="h-6 flex-1" />
                </div>
              ))}
            </div>
          )}

          {!loading && entries.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="text-4xl mb-3 opacity-30">💬</div>
              <p className="text-sm text-white/30">Transcript will appear here</p>
              <p className="text-xs text-white/20 mt-1">Start a call to begin</p>
            </div>
          )}

          {entries.map((entry) => (
            <div
              key={entry.id}
              className={`flex gap-3 animate-slide-in ${
                entry.speaker === 'system' ? 'justify-center' : ''
              }`}
            >
              {entry.speaker === 'system' ? (
                <div className="text-[10px] text-white/20 italic px-3 py-1 rounded-full bg-white/[0.02] border border-white/[0.04]">
                  {entry.content}
                </div>
              ) : (
                <>
                  {/* Speaker label */}
                  <div className="flex-shrink-0 pt-0.5">
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                        entry.speaker === 'agent'
                          ? 'text-[#00ff88] bg-[#00ff88]/10'
                          : 'text-[#4dabf7] bg-[#4dabf7]/10'
                      }`}
                    >
                      {entry.speaker === 'agent' ? 'VITA' : 'USER'}
                    </span>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white/80 leading-relaxed break-words">
                      {entry.content}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] text-white/20 font-mono">
                        {formatTimestamp(entry.createdAt)}
                      </span>
                      {entry.urgencyTag && (
                        <Badge urgency={entry.urgencyTag} size="sm" />
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
