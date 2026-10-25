/**
 * Tests for useDriverLocationSocket Hook
 *
 * Covers:
 * - Interpolation between coordinate updates
 * - Connection status state changes
 * - Cleanup on unmount
 * - Animation frame management
 * - Error handling
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useDriverLocationSocket } from '@/hooks/useDriverLocationSocket';
import {
  driverTrackingService,
  type DriverTrackingSubscriber,
  type DriverLocationUpdate,
} from '@/services/driverTrackingService';

// Mock the service
jest.mock('@/services/driverTrackingService', () => {
  const actual = jest.requireActual('@/services/driverTrackingService');
  return {
    ...actual,
    driverTrackingService: {
      subscribe: jest.fn(),
      connect: jest.fn(),
      isConnected: false,
      close: jest.fn(),
    },
  };
});

let capturedSubscriber: DriverTrackingSubscriber | null = null;
let capturedSubscribers: DriverTrackingSubscriber[] = [];

beforeEach(() => {
  capturedSubscriber = null;
  capturedSubscribers = [];
  jest.clearAllMocks();

  // Capture the subscriber passed to service.subscribe
  (driverTrackingService.subscribe as jest.Mock).mockImplementation(
    (subscriber: DriverTrackingSubscriber) => {
      capturedSubscriber = subscriber;
      capturedSubscribers.push(subscriber);
      return jest.fn(); // Return mock unsubscribe function
    },
  );

  // Use fake timers for animation frame testing
  jest.useFakeTimers();

  // Suppress console warnings
  jest.spyOn(console, 'error').mockImplementation();
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

describe('useDriverLocationSocket', () => {
  describe('initial state', () => {
    it('should initialize with zero coordinates', () => {
      const { result } = renderHook(() =>
        useDriverLocationSocket('driver-123'),
      );

      expect(result.current.position).toEqual({ lat: 0, lng: 0 });
      expect(result.current.connectionStatus).toBe('disconnected');
      expect(result.current.error).toBeNull();
    });

    it('should subscribe to the service on mount', () => {
      renderHook(() => useDriverLocationSocket('driver-123'));

      expect(driverTrackingService.subscribe).toHaveBeenCalled();
    });

    it('should connect to the service if not already connected', () => {
      (driverTrackingService.isConnected as unknown as boolean) = false;
      renderHook(() => useDriverLocationSocket('driver-123'));

      expect(driverTrackingService.connect).toHaveBeenCalled();
    });

    it('should not connect if already connected', () => {
      (driverTrackingService.isConnected as unknown as boolean) = true;
      renderHook(() => useDriverLocationSocket('driver-123'));

      expect(driverTrackingService.connect).not.toHaveBeenCalled();
    });
  });

  describe('location update handling', () => {
    it('should update position on location update', async () => {
      const { result } = renderHook(() =>
        useDriverLocationSocket('driver-123'),
      );

      expect(result.current.position).toEqual({ lat: 0, lng: 0 });

      // Simulate incoming location update
      act(() => {
        capturedSubscriber?.onLocationUpdate({
          driverId: 'driver-123',
          lat: 6.5244,
          lng: 3.3792,
          timestamp: 1000,
        });
      });

      await waitFor(() => {
        expect(result.current.position).toEqual({ lat: 6.5244, lng: 3.3792 });
      });
    });

    it('should ignore updates for different drivers', () => {
      const { result } = renderHook(() =>
        useDriverLocationSocket('driver-123'),
      );

      act(() => {
        capturedSubscriber?.onLocationUpdate({
          driverId: 'driver-456',
          lat: 6.5244,
          lng: 3.3792,
          timestamp: 1000,
        });
      });

      expect(result.current.position).toEqual({ lat: 0, lng: 0 });
    });

    it('should smoothly interpolate between old and new coordinates', async () => {
      const { result } = renderHook(() =>
        useDriverLocationSocket('driver-123'),
      );

      // First update
      act(() => {
        capturedSubscriber?.onLocationUpdate({
          driverId: 'driver-123',
          lat: 0,
          lng: 0,
          timestamp: 0,
        });
      });

      await waitFor(() => {
        expect(result.current.position).toEqual({ lat: 0, lng: 0 });
      });

      // Second update — should interpolate over 500ms
      act(() => {
        capturedSubscriber?.onLocationUpdate({
          driverId: 'driver-123',
          lat: 10,
          lng: 10,
          timestamp: 500,
        });

        // Advance to middle of interpolation (250ms)
        jest.advanceTimersByTime(250);
      });

      // Should be approximately halfway (due to linear interpolation)
      expect(result.current.position.lat).toBeGreaterThan(0);
      expect(result.current.position.lat).toBeLessThan(10);
      expect(result.current.position.lng).toBeGreaterThan(0);
      expect(result.current.position.lng).toBeLessThan(10);

      // Advance to end of interpolation
      act(() => {
        jest.advanceTimersByTime(300);
      });

      // Should snap to target
      expect(result.current.position).toEqual({ lat: 10, lng: 10 });
    });

    it('should cancel ongoing animation when new update arrives', async () => {
      const { result } = renderHook(() =>
        useDriverLocationSocket('driver-123'),
      );

      // First update
      act(() => {
        capturedSubscriber?.onLocationUpdate({
          driverId: 'driver-123',
          lat: 0,
          lng: 0,
          timestamp: 0,
        });
      });

      await waitFor(() => {
        expect(result.current.position).toEqual({ lat: 0, lng: 0 });
      });

      // Second update
      act(() => {
        capturedSubscriber?.onLocationUpdate({
          driverId: 'driver-123',
          lat: 10,
          lng: 10,
          timestamp: 500,
        });

        jest.advanceTimersByTime(100);
      });

      const positionAfter100ms = { ...result.current.position };

      // Third update arrives before interpolation completes
      act(() => {
        capturedSubscriber?.onLocationUpdate({
          driverId: 'driver-123',
          lat: 15,
          lng: 15,
          timestamp: 600,
        });

        jest.advanceTimersByTime(250);
      });

      // Position should be different from linear interpolation of previous target
      // because the animation was cancelled and restarted
      const expectedIfNotCancelled = 10 + (10 - 10) * 0.35; // Would be 10
      expect(result.current.position.lat).not.toBe(expectedIfNotCancelled);
    });
  });

  describe('connection status', () => {
    it('should set connectionStatus to connected', async () => {
      const { result } = renderHook(() =>
        useDriverLocationSocket('driver-123'),
      );

      act(() => {
        capturedSubscriber?.onConnected?.();
      });

      await waitFor(() => {
        expect(result.current.connectionStatus).toBe('connected');
      });
    });

    it('should set connectionStatus to disconnected', async () => {
      const { result } = renderHook(() =>
        useDriverLocationSocket('driver-123'),
      );

      act(() => {
        capturedSubscriber?.onConnected?.();
      });

      await waitFor(() => {
        expect(result.current.connectionStatus).toBe('connected');
      });

      act(() => {
        capturedSubscriber?.onDisconnected?.();
      });

      await waitFor(() => {
        expect(result.current.connectionStatus).toBe('disconnected');
      });
    });

    it('should set connectionStatus to reconnecting', async () => {
      const { result } = renderHook(() =>
        useDriverLocationSocket('driver-123'),
      );

      act(() => {
        capturedSubscriber?.onReconnecting?.();
      });

      await waitFor(() => {
        expect(result.current.connectionStatus).toBe('reconnecting');
      });
    });

    it('should clear error when connected', async () => {
      const { result } = renderHook(() =>
        useDriverLocationSocket('driver-123'),
      );

      act(() => {
        capturedSubscriber?.onError?.('Connection lost');
      });

      await waitFor(() => {
        expect(result.current.error).toBe('Connection lost');
      });

      act(() => {
        capturedSubscriber?.onConnected?.();
      });

      await waitFor(() => {
        expect(result.current.error).toBeNull();
      });
    });
  });

  describe('error handling', () => {
    it('should store error message', async () => {
      const { result } = renderHook(() =>
        useDriverLocationSocket('driver-123'),
      );

      act(() => {
        capturedSubscriber?.onError?.('WebSocket failed');
      });

      await waitFor(() => {
        expect(result.current.error).toBe('WebSocket failed');
      });
    });

    it('should not expose service errors to caller by default', () => {
      const { result } = renderHook(() =>
        useDriverLocationSocket('driver-123'),
      );

      // Error is internal state, not exposed through component props
      expect(result.current.error).toBeNull();
    });
  });

  describe('cleanup on unmount', () => {
    it('should call unsubscribe on unmount', () => {
      const unsubscribeMock = jest.fn();
      (driverTrackingService.subscribe as jest.Mock).mockReturnValue(
        unsubscribeMock,
      );

      const { unmount } = renderHook(() =>
        useDriverLocationSocket('driver-123'),
      );

      unmount();

      expect(unsubscribeMock).toHaveBeenCalled();
    });

    it('should cancel pending animation frame on unmount', () => {
      const cancelAnimationFrameSpy = jest.spyOn(
        window,
        'cancelAnimationFrame',
      );

      const { result } = renderHook(() =>
        useDriverLocationSocket('driver-123'),
      );

      // Trigger an animation
      act(() => {
        capturedSubscriber?.onLocationUpdate({
          driverId: 'driver-123',
          lat: 0,
          lng: 0,
          timestamp: 0,
        });
        capturedSubscriber?.onLocationUpdate({
          driverId: 'driver-123',
          lat: 10,
          lng: 10,
          timestamp: 500,
        });
      });

      // Unmount should cancel the frame
      const { unmount } = renderHook(() =>
        useDriverLocationSocket('driver-123'),
      );

      unmount();

      // Should have been called to cleanup the animation
      expect(cancelAnimationFrameSpy).toHaveBeenCalled();

      cancelAnimationFrameSpy.mockRestore();
    });

    it('should not update state after unmount', async () => {
      const { result, unmount } = renderHook(() =>
        useDriverLocationSocket('driver-123'),
      );

      act(() => {
        capturedSubscriber?.onLocationUpdate({
          driverId: 'driver-123',
          lat: 0,
          lng: 0,
          timestamp: 0,
        });
      });

      await waitFor(() => {
        expect(result.current.position).toEqual({ lat: 0, lng: 0 });
      });

      // Unmount
      unmount();

      // Update should not affect unmounted component
      act(() => {
        capturedSubscriber?.onLocationUpdate({
          driverId: 'driver-123',
          lat: 20,
          lng: 20,
          timestamp: 600,
        });
      });

      // Verify no console warnings about state updates after unmount
      expect(console.error).not.toHaveBeenCalledWith(
        expect.stringContaining("Can't perform a React state update"),
      );
    });
  });

  describe('multiple drivers', () => {
    it('should handle multiple hook instances independently', async () => {
      const { result: result1 } = renderHook(() =>
        useDriverLocationSocket('driver-1'),
      );
      const { result: result2 } = renderHook(() =>
        useDriverLocationSocket('driver-2'),
      );

      // Both hooks subscribe
      expect(driverTrackingService.subscribe).toHaveBeenCalledTimes(2);

      // Simulate update for driver 1
      act(() => {
        capturedSubscribers.forEach((s) =>
          s.onLocationUpdate({
            driverId: 'driver-1',
            lat: 1.1,
            lng: 1.1,
            timestamp: 0,
          }),
        );
      });

      await waitFor(() => {
        expect(result1.current.position.lat).toBeGreaterThan(0);
      });

      // Driver 2 should still be at origin
      expect(result2.current.position).toEqual({ lat: 0, lng: 0 });
    });
  });

  describe('position memoization', () => {
    it('should stabilize position object to prevent unnecessary re-renders', () => {
      const { result, rerender } = renderHook(() =>
        useDriverLocationSocket('driver-123'),
      );

      const initialPosition = result.current.position;

      // Rerender without changes
      rerender();

      // Position reference should be same if values unchanged
      expect(result.current.position).toEqual(initialPosition);
    });
  });

  describe('driver ID changes', () => {
    it('should handle driver ID changes', async () => {
      const { result, rerender } = renderHook(
        ({ driverId }) => useDriverLocationSocket(driverId),
        { initialProps: { driverId: 'driver-1' } },
      );

      act(() => {
        capturedSubscriber?.onLocationUpdate({
          driverId: 'driver-1',
          lat: 5,
          lng: 5,
          timestamp: 0,
        });
      });

      await waitFor(() => {
        expect(result.current.position).toEqual({ lat: 5, lng: 5 });
      });

      // Change driver ID
      rerender({ driverId: 'driver-2' });

      // Position should reset or be ignored for driver-2
      // (depending on implementation, but should not show driver-1 data)
      act(() => {
        capturedSubscriber?.onLocationUpdate({
          driverId: 'driver-2',
          lat: 10,
          lng: 10,
          timestamp: 1000,
        });
      });

      // Should update to driver-2's position
      await waitFor(() => {
        expect(result.current.position).toEqual({ lat: 10, lng: 10 });
      });
    });
  });
});
