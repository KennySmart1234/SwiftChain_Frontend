'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import {
  driverTrackingService,
  type DriverLocationUpdate,
} from '@/services/driverTrackingService';

export type ConnectionStatus = 'connected' | 'reconnecting' | 'disconnected';

export interface InterpolatedLocation {
  lat: number;
  lng: number;
}

export interface DriverLocationSocketState {
  /** Current interpolated coordinates for the driver. */
  position: InterpolatedLocation;
  /** Connection status to the tracking service. */
  connectionStatus: ConnectionStatus;
  /** Any error message from the connection. */
  error: string | null;
}

interface LocationState {
  current: InterpolatedLocation;
  target: InterpolatedLocation;
  lastUpdateTime: number;
  animationFrameId: number | null;
}

const INTERPOLATION_DURATION_MS = 500; // Smoothly transition over 500ms

/**
 * useDriverLocationSocket — Hook layer for live driver location updates.
 *
 * Wraps the DriverTrackingService, exposing:
 * - Interpolated coordinates that smoothly animate between updates
 * - Connection status (connected/reconnecting/disconnected)
 * - Error state
 *
 * Owns interpolation logic via requestAnimationFrame.
 * Cleans up subscriptions and animation frames on unmount.
 *
 * Following Strict Layered Architecture:
 * Component -> Hook (this) -> Service (driverTrackingService).
 */
export function useDriverLocationSocket(
  driverId: string,
): DriverLocationSocketState {
  const [position, setPosition] = useState<InterpolatedLocation>({
    lat: 0,
    lng: 0,
  });
  const [connectionStatus, setConnectionStatus] =
    useState<ConnectionStatus>('disconnected');
  const [error, setError] = useState<string | null>(null);

  // Mutable state for interpolation — not exposed to caller
  const locationStateRef = useRef<LocationState>({
    current: { lat: 0, lng: 0 },
    target: { lat: 0, lng: 0 },
    lastUpdateTime: Date.now(),
    animationFrameId: null,
  });

  /**
   * Interpolates from current to target position linearly over INTERPOLATION_DURATION_MS.
   * Called on every animation frame.
   */
  const updateInterpolation = useCallback(() => {
    const state = locationStateRef.current;
    const now = Date.now();
    const elapsed = now - state.lastUpdateTime;
    const progress = Math.min(elapsed / INTERPOLATION_DURATION_MS, 1);

    // Linear interpolation
    const newLat =
      state.current.lat +
      (state.target.lat - state.current.lat) * progress;
    const newLng =
      state.current.lng +
      (state.target.lng - state.current.lng) * progress;

    setPosition({ lat: newLat, lng: newLng });

    // If animation is still ongoing, schedule the next frame
    if (progress < 1) {
      state.animationFrameId = requestAnimationFrame(updateInterpolation);
    } else {
      // Animation complete — snap to target and stop
      state.current = { ...state.target };
      state.animationFrameId = null;
    }
  }, []);

  /**
   * Handles incoming location updates from the service.
   * Sets the target and triggers interpolation animation.
   */
  const handleLocationUpdate = useCallback(
    (update: DriverLocationUpdate) => {
      // Only process updates for this driver
      if (update.driverId !== driverId) return;

      const state = locationStateRef.current;

      // Cancel any ongoing animation
      if (state.animationFrameId !== null) {
        cancelAnimationFrame(state.animationFrameId);
      }

      // Update timing and set new target
      state.lastUpdateTime = Date.now();
      state.target = { lat: update.lat, lng: update.lng };

      // Start interpolation animation
      state.animationFrameId = requestAnimationFrame(updateInterpolation);
    },
    [driverId, updateInterpolation],
  );

  /**
   * Handles connection status changes.
   */
  const handleConnectionStatusChange = useCallback(
    (status: ConnectionStatus) => {
      setConnectionStatus(status);
      if (status === 'connected') {
        setError(null);
      }
    },
    [],
  );

  /**
   * Handles error notifications.
   */
  const handleError = useCallback((errorMsg: string) => {
    setError(errorMsg);
  }, []);

  /**
   * Setup and teardown of the WebSocket subscription.
   */
  useEffect(() => {
    // Subscribe to service
    const unsubscribe = driverTrackingService.subscribe({
      onLocationUpdate: handleLocationUpdate,
      onConnected: () => handleConnectionStatusChange('connected'),
      onDisconnected: () => handleConnectionStatusChange('disconnected'),
      onReconnecting: () => handleConnectionStatusChange('reconnecting'),
      onError: handleError,
    });

    // Ensure the service is connected
    if (!driverTrackingService.isConnected) {
      driverTrackingService.connect();
    }

    // Cleanup on unmount
    return () => {
      // Cancel any pending animation frame
      const state = locationStateRef.current;
      if (state.animationFrameId !== null) {
        cancelAnimationFrame(state.animationFrameId);
        state.animationFrameId = null;
      }

      // Unsubscribe from service
      unsubscribe();
    };
  }, [handleLocationUpdate, handleConnectionStatusChange, handleError]);

  return {
    position,
    connectionStatus,
    error,
  };
}
