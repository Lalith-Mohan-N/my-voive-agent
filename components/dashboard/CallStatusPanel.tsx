'use client';

import { Card, CardContent } from '@/components/ui/Card';
import { StatusDot } from '@/components/ui/StatusDot';
import { formatDuration } from '@/lib/utils';
import type { CallStatus } from '@/types';
import { useEffect, useState } from 'react';

interface CallStatusPanelProps {
  status: CallStatus;
  startTime?: string | number | null;
  timeoutWarning?: boolean;
}

const STATUS_DISPLAY: Record<CallStatus, { label: string; description: string; dotStatus: 'active' | 'critical' | 'idle' | 'warning' }> = {
  idle: { label: 'Standby', description: 'Waiting for incoming call...', dotStatus: 'idle' },
  registering: { label: 'Connecting', description: 'Registering with voice service...', dotStatus: 'warning' },
  ringing: { label: 'Incoming', description: 'Call connecting...', dotStatus: 'warning' },
  active: { label: 'Active Call', description: 'VitaVoice is listening...', dotStatus: 'active' },
  ended: { label: 'Call Ended', description: 'Call completed successfully', dotStatus: 'idle' },
  error: { label: 'Error', description: 'Connection issue detected', dotStatus: 'critical' },
};

const FALLBACK_DISPLAY = { label: 'Unknown', description: 'Unknown status', dotStatus: 'idle' as const };

export function CallStatusPanel({ status, startTime, timeoutWarning }: CallStatusPanelProps) {
  const [elapsed, setElapsed] = useState(0);
  const display = STATUS_DISPLAY[status] ?? FALLBACK_DISPLAY;

  useEffect(() => {
    if (status !== 'active' || !startTime) {
      setElapsed(0);
      return;
    }
    
    let startMs = 0;
    if (typeof startTime === 'number') {
      startMs = startTime;
    } else {
      // Ensure UTC parsing if Z is missing
      const parseStr = startTime.endsWith('Z') || startTime.includes('+') ? startTime : `${startTime}Z`;
      startMs = new Date(parseStr).getTime();
    }
    
    const tick = () => setElapsed(Math.max(0, Math.floor((Date.now() - startMs) / 1000)));
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [status, startTime]);

  return (
    <Card variant="elevated" id="call-status-panel">
      <CardContent className="pt-5">
        <div className="flex items-center gap-3 mb-4">
          <StatusDot status={display.dotStatus} size="lg" />
          <div>
            <h2 className="text-sm font-bold text-white">{display.label}</h2>
            <p className="text-xs text-white/40">{display.description}</p>
          </div>
        </div>

        {status === 'active' && (
          <div className="flex items-center justify-center py-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
            <div className="text-center">
              <div className="text-3xl font-mono font-bold text-[#00ff88] tabular-nums tracking-wider">
                {formatDuration(elapsed)}
              </div>
              <div className="text-[10px] text-white/30 mt-1 uppercase tracking-widest">Duration</div>
            </div>
          </div>
        )}

        {/* Timeout warning — call approaching 30-minute limit */}
        {status === 'active' && timeoutWarning && (
          <div className="mt-3 rounded-lg bg-[#ff9f1c]/10 border border-[#ff9f1c]/30 px-3 py-2 text-xs text-[#ff9f1c] animate-pulse">
            ⚠ Call approaching 30-minute limit. Will auto-end soon.
          </div>
        )}

        {status === 'idle' && (
          <div className="flex items-center justify-center py-6 rounded-xl border border-dashed border-white/[0.08]">
            <div className="text-center">
              <div className="text-2xl mb-1">🎙️</div>
              <p className="text-xs text-white/30">No active call</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

