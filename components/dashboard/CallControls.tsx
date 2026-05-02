'use client';

import { Button } from '@/components/ui/Button';
import { Phone, PhoneOff, FileText } from 'lucide-react';
import type { CallStatus } from '@/types';

interface CallControlsProps {
  callStatus: CallStatus;
  onStartCall: () => void;
  onEndCall: () => void;
  loading?: boolean;
  error?: string | null;
}

export function CallControls({ callStatus, onStartCall, onEndCall, loading, error }: CallControlsProps) {
  return (
    <div id="call-controls" className="flex flex-col gap-3">
      {(callStatus === 'idle' || callStatus === 'ended' || callStatus === 'error') && (
        <Button
          variant="primary"
          size="lg"
          onClick={onStartCall}
          loading={loading}
          className="w-full"
        >
          <Phone className="h-4 w-4" />
          Start Voice Call
        </Button>
      )}

      {callStatus === 'registering' && (
        <Button
          variant="ghost"
          size="lg"
          loading={true}
          disabled={true}
          className="w-full"
        >
          <Phone className="h-4 w-4" />
          Connecting to Retell...
        </Button>
      )}

      {callStatus === 'active' && (
        <Button
          variant="danger"
          size="lg"
          onClick={onEndCall}
          loading={loading}
          className="w-full"
        >
          <PhoneOff className="h-4 w-4" />
          End Call
        </Button>
      )}

      {error && (
        <div className="rounded-lg bg-[#ff3b5c]/10 border border-[#ff3b5c]/20 px-3 py-2 text-xs text-[#ff3b5c]">
          {error}
        </div>
      )}

      {callStatus === 'ended' && (
        <Button variant="ghost" size="md" className="w-full">
          <FileText className="h-4 w-4" />
          View Last Report
        </Button>
      )}
    </div>
  );
}
