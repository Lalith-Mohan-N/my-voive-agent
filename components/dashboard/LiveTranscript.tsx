'use client';

import { useEffect, useRef, useState } from 'react';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { formatTimestamp } from '@/lib/utils';
import type { TranscriptEntry } from '@/types';
import { Send } from 'lucide-react';

interface LiveTranscriptProps {
  caseId?: string | null;
  entries: TranscriptEntry[];
  loading?: boolean;
  userRole?: 'user' | 'doctor';
}

export function LiveTranscript({ caseId, entries, loading = false, userRole = 'user' }: LiveTranscriptProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

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

      <CardContent className="flex-1 overflow-hidden flex flex-col p-0">
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto px-5 py-4 space-y-3 scroll-smooth custom-scrollbar"
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
              {entry.speaker === 'system' || entry.eventType !== 'transcript' ? (
                <div
                  className={`text-[10px] italic px-3 py-1.5 rounded-full border ${
                    entry.eventType === 'clarification_request'
                      ? 'text-[#ff9f1c] bg-[#ff9f1c]/5 border-[#ff9f1c]/20'
                      : entry.eventType === 'tool_call'
                      ? 'text-[#4dabf7] bg-[#4dabf7]/5 border-[#4dabf7]/20'
                      : entry.eventType === 'risk_alert'
                      ? 'text-[#ff3b5c] bg-[#ff3b5c]/5 border-[#ff3b5c]/20'
                      : entry.eventType === 'confirmation_needed'
                      ? 'text-[#ff9f1c] bg-[#ff9f1c]/5 border-[#ff9f1c]/20 font-bold'
                      : 'text-white/20 bg-white/[0.02] border-white/[0.04]'
                  }`}
                >
                  {entry.eventType === 'clarification_request' && '❓ '}
                  {entry.eventType === 'tool_call' && '🔧 '}
                  {entry.eventType === 'risk_alert' && '⚠️ '}
                  {entry.eventType === 'confirmation_needed' && '🔒 '}
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
                          : entry.speaker === 'doctor'
                          ? 'text-[#c084fc] bg-[#c084fc]/10'
                          : 'text-[#4dabf7] bg-[#4dabf7]/10'
                      }`}
                    >
                      {entry.speaker === 'agent' ? 'VITA' : entry.speaker === 'doctor' ? 'DOC' : 'USER'}
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

        {/* Message Input Area */}
        <div className="flex-shrink-0 border-t border-white/[0.06] p-3 bg-black/20">
          <form 
            onSubmit={async (e) => {
              e.preventDefault();
              if (!message.trim() || !caseId || sending) return;
              setSending(true);
              try {
                await fetch('/api/timeline/message', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ caseId, content: message.trim(), speaker: userRole })
                });
                setMessage('');
              } finally {
                setSending(false);
              }
            }}
            className="flex gap-2"
          >
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              disabled={!caseId || sending}
              placeholder={caseId ? "Type a message..." : "Waiting for case..."}
              className="flex-1 bg-white/5 border border-white/10 rounded-md px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:ring-1 focus:ring-[#4dabf7]/50"
            />
            <button
              type="submit"
              disabled={!message.trim() || !caseId || sending}
              className="bg-[#4dabf7]/20 hover:bg-[#4dabf7]/30 text-[#4dabf7] px-3 py-2 rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      </CardContent>
    </Card>
  );
}
