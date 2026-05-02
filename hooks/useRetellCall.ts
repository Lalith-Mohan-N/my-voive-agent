'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { initAudioPipeline, closeAudioPipeline, type AudioMetrics } from '@/lib/audio/audio-pipeline';
import type { LocationData } from './useDeviceLocation';

type RetellConnectionState = 'idle' | 'registering' | 'active' | 'ended' | 'error';

export interface RetellCallState {
  status: RetellConnectionState;
  error: string | null;
  callId: string | null;
  caseId: string | null;
  accessToken: string | null;
  audioMetrics: AudioMetrics | null;
  micPermission: 'unknown' | 'granted' | 'denied';
  location: LocationData | null;
}

export interface UseRetellCallReturn {
  state: RetellCallState;
  startCall: () => Promise<void>;
  endCall: () => Promise<void>;
  updateCaseId: (caseId: string) => void;
}

/**
 * Browser-side hook that wraps the Retell Web SDK + our audio pipeline.
 * Creates a real voice call via POST /api/retell/call, wires mic through
 * noise-gate/compressor/normalisation, then registers with Retell.
 */
export function useRetellCall(onMetrics?: (m: AudioMetrics) => void): UseRetellCallReturn {
  const [state, setState] = useState<RetellCallState>({
    status: 'idle',
    error: null,
    callId: null,
    caseId: null,
    accessToken: null,
    audioMetrics: null,
    micPermission: 'unknown',
    location: null,
  });

  const retellRef = useRef<any>(null);
  const cleanupRef = useRef<(() => void) | null>(null);

  // Metrics callback wrapper that updates local state too
  const handleMetrics = useCallback(
    (m: AudioMetrics) => {
      setState((prev: RetellCallState) => ({ ...prev, audioMetrics: m }));
      onMetrics?.(m);
    },
    [onMetrics]
  );

  const startCall = useCallback(async () => {
    try {
      setState((prev: RetellCallState) => ({ ...prev, status: 'registering', error: null }));

      // 1. Request mic with WebRTC noise suppression enabled
      // Browser-level processing runs BEFORE our custom pipeline,
      // giving two layers of noise reduction for field environments.
      const micStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000,
          channelCount: 1,
        },
      });
      setState((prev: RetellCallState) => ({ ...prev, micPermission: 'granted' }));

      // 2. Run through our preprocessing pipeline
      const processedStream = await initAudioPipeline(micStream, handleMetrics);

      // 3. Ask server to create a Retell web call
      const res = await fetch('/api/retell/call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ metadata: { source: 'vitavoice-dashboard' } }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to create call');
      }

      const { access_token, call_id } = data;

      // 4. Dynamically import Retell Web SDK (browser-only)
      const { RetellWebClient } = await import('retell-client-js-sdk');
      const client = new RetellWebClient();
      retellRef.current = client;

      // Register with Retell using our access token
      await client.startCall({
        accessToken: access_token,
        captureDeviceId: 'default',
      });

      // 5. Get GPS location for hospital search
      let location: LocationData | null = null;
      try {
        if (navigator.geolocation) {
          const position = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              enableHighAccuracy: true,
              timeout: 10000,
              maximumAge: 60000,
            });
          });
          location = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            speed: position.coords.speed,
            heading: position.coords.heading,
            altitude: position.coords.altitude,
            timestamp: position.timestamp,
          };
        }
      } catch {
        // GPS not available, continue without it
        console.log('GPS not available, will use location text fallback');
      }

      setState((prev) => ({
        ...prev,
        status: 'active',
        error: null,
        callId: call_id,
        accessToken: access_token,
        audioMetrics: null,
        micPermission: 'granted',
        location,
      }));

      // Listen for call end
      const onEnded = () => {
        closeAudioPipeline();
        setState((prev: RetellCallState) => ({
          ...prev,
          status: 'ended',
          callId: null,
          accessToken: null,
        }));
      };
      client.on('call_ended', onEnded);
      client.on('error', (err: unknown) => {
        console.error('Retell client error:', err);
        const errMsg = err instanceof Error ? err.message : String(err);
        setState((prev: RetellCallState) => ({ ...prev, status: 'error', error: errMsg }));
      });

      cleanupRef.current = () => {
        client.off('call_ended', onEnded);
      };
    } catch (err) {
      console.error('Failed to start call:', err);
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('Permission') || msg.includes('denied')) {
        setState((prev: RetellCallState) => ({ ...prev, status: 'error', error: msg, micPermission: 'denied' }));
      } else {
        setState((prev: RetellCallState) => ({ ...prev, status: 'error', error: msg }));
      }
      closeAudioPipeline();
    }
  }, [handleMetrics]);

  const updateCaseId = useCallback((caseId: string) => {
    setState((prev) => ({ ...prev, caseId }));

    // If we have location, send it to server
    if (state.location) {
      fetch('/api/location/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          case_id: caseId,
          latitude: state.location.latitude,
          longitude: state.location.longitude,
          accuracy: state.location.accuracy,
          speed: state.location.speed,
          heading: state.location.heading,
        }),
      }).catch((err) => console.error('Failed to send location:', err));
    }
  }, [state.location]);

  const endCall = useCallback(async () => {
    try {
      retellRef.current?.stopCall?.();
    } catch {
      // ignore
    }
    cleanupRef.current?.();
    cleanupRef.current = null;
    await closeAudioPipeline();
    setState((prev: RetellCallState) => ({
      ...prev,
      status: 'ended',
      callId: null,
      caseId: null,
      accessToken: null,
      location: null,
    }));
  }, []);

  // Auto-cleanup on unmount
  useEffect(() => {
    return () => {
      endCall();
    };
  }, [endCall]);

  return { state, startCall, endCall, updateCaseId };
}
