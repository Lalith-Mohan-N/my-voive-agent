'use client';

import { Button } from '@/components/ui/Button';
import { Phone, PhoneOff, FileText } from 'lucide-react';
import type { CallStatus } from '@/types';

interface CallControlsProps {
  callStatus: CallStatus;
  onStartCall: () => void;
  onEndCall: () => void;
  loading?: boolean;
}

export function CallControls({ callStatus, onStartCall, onEndCall, loading }: CallControlsProps) {
  return (
    <div id="call-controls" className="flex flex-col gap-3">
      {callStatus === 'idle' || callStatus === 'ended' ? (
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
      ) : callStatus === 'active' ? (
        <Button
          variant="danger"
          size="lg"
          onClick={onEndCall}
          loading={loading}
          className="w-full"
        >
          <PhoneOff className="h-4 w-4" />
          End Call & Generate Report
        </Button>
      ) : null}

      {callStatus === 'ended' && (
        <Button variant="ghost" size="md" className="w-full">
          <FileText className="h-4 w-4" />
          View Last Report
        </Button>
      )}
    </div>
  );
}
