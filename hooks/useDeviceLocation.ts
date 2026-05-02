'use client';

import { useState, useCallback, useEffect, useRef } from 'react';

export interface LocationData {
  latitude: number;
  longitude: number;
  accuracy: number;
  speed: number | null;
  heading: number | null;
  altitude: number | null;
  timestamp: number;
}

export interface LocationState {
  location: LocationData | null;
  error: string | null;
  permission: 'unknown' | 'granted' | 'denied' | 'prompt';
  isTracking: boolean;
  lastUpdated: Date | null;
}

export interface UseDeviceLocationReturn {
  state: LocationState;
  startTracking: () => Promise<void>;
  stopTracking: () => void;
  getCurrentPosition: () => Promise<LocationData | null>;
  requestPermission: () => Promise<boolean>;
}

/**
 * Hook for accessing and tracking device GPS location.
 * Used to automatically capture patient/EMS unit location for hospital search.
 */
export function useDeviceLocation(caseId?: string): UseDeviceLocationReturn {
  const [state, setState] = useState<LocationState>({
    location: null,
    error: null,
    permission: 'unknown',
    isTracking: false,
    lastUpdated: null,
  });

  const watchIdRef = useRef<number | null>(null);
  const caseIdRef = useRef(caseId);

  // Keep caseId ref updated
  useEffect(() => {
    caseIdRef.current = caseId;
  }, [caseId]);

  /**
   * Send location update to server for database storage
   */
  const sendLocationToServer = useCallback(async (location: LocationData) => {
    if (!caseIdRef.current) return;

    try {
      await fetch('/api/location/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          case_id: caseIdRef.current,
          latitude: location.latitude,
          longitude: location.longitude,
          accuracy: location.accuracy,
          speed: location.speed,
          heading: location.heading,
        }),
      });
    } catch (err) {
      console.error('Failed to send location to server:', err);
    }
  }, []);

  /**
   * Request location permission from browser
   */
  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!navigator.geolocation) {
      setState((prev) => ({
        ...prev,
        error: 'Geolocation is not supported by this browser.',
        permission: 'denied',
      }));
      return false;
    }

    try {
      // Check if Permissions API is available
      if ((navigator as any).permissions?.query) {
        const result = await (navigator as any).permissions.query({ name: 'geolocation' });
        if (result.state === 'denied') {
          setState((prev) => ({
            ...prev,
            error: 'Location permission denied. Please enable location access in browser settings.',
            permission: 'denied',
          }));
          return false;
        }
      }

      // Try to get position to trigger permission prompt
      await new Promise<void>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          () => resolve(),
          (err) => reject(err),
          { timeout: 10000, enableHighAccuracy: true }
        );
      });

      setState((prev) => ({ ...prev, permission: 'granted', error: null }));
      return true;
    } catch (err) {
      const errorMessage = err instanceof GeolocationPositionError
        ? err.code === 1
          ? 'Location permission denied. Please enable location access.'
          : err.code === 2
          ? 'Location unavailable. Please check your device settings.'
          : 'Location request timed out. Please try again.'
        : 'Failed to request location permission.';

      setState((prev) => ({
        ...prev,
        error: errorMessage,
        permission: 'denied',
      }));
      return false;
    }
  }, []);

  /**
   * Get current position once
   */
  const getCurrentPosition = useCallback(async (): Promise<LocationData | null> => {
    if (!navigator.geolocation) {
      setState((prev) => ({
        ...prev,
        error: 'Geolocation is not supported by this browser.',
      }));
      return null;
    }

    return new Promise((resolve) => {
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

          setState((prev) => ({
            ...prev,
            location,
            permission: 'granted',
            error: null,
            lastUpdated: new Date(),
          }));

          // Send to server if we have a case ID
          sendLocationToServer(location);

          resolve(location);
        },
        (err) => {
          const errorMessage = err.code === 1
            ? 'Location permission denied. Please enable location access.'
            : err.code === 2
            ? 'Location unavailable.'
            : 'Location request timed out.';

          setState((prev) => ({
            ...prev,
            error: errorMessage,
            permission: 'denied',
          }));

          resolve(null);
        },
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 0,
        }
      );
    });
  }, [sendLocationToServer]);

  /**
   * Start continuous location tracking
   */
  const startTracking = useCallback(async () => {
    if (!navigator.geolocation) {
      setState((prev) => ({
        ...prev,
        error: 'Geolocation is not supported by this browser.',
      }));
      return;
    }

    // Stop any existing tracking
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
    }

    setState((prev) => ({ ...prev, isTracking: true, error: null }));

    watchIdRef.current = navigator.geolocation.watchPosition(
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

        setState((prev) => ({
          ...prev,
          location,
          permission: 'granted',
          error: null,
          lastUpdated: new Date(),
        }));

        // Send to server if we have a case ID
        sendLocationToServer(location);
      },
      (err) => {
        const errorMessage = err.code === 1
          ? 'Location permission denied during tracking.'
          : err.code === 2
          ? 'Location became unavailable.'
          : 'Location tracking timed out.';

        setState((prev) => ({
          ...prev,
          error: errorMessage,
          isTracking: false,
        }));
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 5000, // Allow 5 second old cached positions for performance
      }
    );
  }, [sendLocationToServer]);

  /**
   * Stop continuous location tracking
   */
  const stopTracking = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setState((prev) => ({ ...prev, isTracking: false }));
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  return {
    state,
    startTracking,
    stopTracking,
    getCurrentPosition,
    requestPermission,
  };
}

/**
 * Calculate distance between two coordinates in kilometers using Haversine formula
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Format distance for display
 */
export function formatDistance(km: number): string {
  if (km < 1) {
    return `${Math.round(km * 1000)} meters`;
  }
  return `${km.toFixed(1)} km`;
}
