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
 *
 * GPS is fetched eagerly on mount so location is available immediately
 * when a call starts — the agent never has to ask "where are you?"
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
  const locationRef = useRef<LocationData | null>(null);

  // Metrics callback wrapper that updates local state too
  const handleMetrics = useCallback(
    (m: AudioMetrics) => {
      setState((prev: RetellCallState) => ({ ...prev, audioMetrics: m }));
      onMetrics?.(m);
    },
    [onMetrics]
  );

  /**
   * Eagerly fetch GPS once on mount so it is ready before the user presses Start Call.
   */
  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const location: LocationData = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          speed: position.coords.speed,
          heading: position.coords.heading,
          altitude: position.coords.altitude,
          timestamp: position.timestamp,
        };
        locationRef.current = location;
        setState((prev) => ({ ...prev, location }));
      },
      () => {
        // Silently fail — we will try again during startCall
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  }, []);

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

      // 3. Ask server to create a Retell web call — include GPS if already known
      const payload: Record<string, unknown> = {
        metadata: { source: 'vitavoice-dashboard' },
      };
      if (locationRef.current) {
        payload.latitude = locationRef.current.latitude;
        payload.longitude = locationRef.current.longitude;
        payload.accuracy = locationRef.current.accuracy;
      }
      const res = await fetch('/api/retell/call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
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

      // 5. Refresh GPS location in case the user moved
      let location: LocationData | null = locationRef.current;
      try {
        if (navigator.geolocation) {
          const position = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              enableHighAccuracy: true,
              timeout: 5000,
              maximumAge: 30000,
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
          locationRef.current = location;
        }
      } catch {
        // GPS not available, continue with cached or null
        console.log('GPS refresh failed, using cached location if any');
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

    // Auto-send cached GPS to server so the case record is updated immediately
    const loc = locationRef.current ?? state.location;
    if (loc) {
      fetch('/api/location/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          case_id: caseId,
          latitude: loc.latitude,
          longitude: loc.longitude,
          accuracy: loc.accuracy,
          speed: loc.speed,
          heading: loc.heading,
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
    setState((prev: RetellCallState) => ({
      ...prev,
      status: 'ended',
      callId: null,
      caseId: null,
      accessToken: null,
      location: null,
    }));
    await closeAudioPipeline();
  }, []);

  // Auto-cleanup on unmount
  useEffect(() => {
    return () => {
      endCall();
    };
  }, [endCall]);

  return { state, startCall, endCall, updateCaseId };
}
