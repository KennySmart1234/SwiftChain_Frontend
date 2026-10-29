/**
 * Tests for DriverTrackingService
 *
 * Covers:
 * - WebSocket connection lifecycle
 * - Reconnection with exponential backoff
 * - Message parsing and validation
 * - Subscriber notification
 * - Cleanup and resource management
 */

import {
  driverTrackingService,
  type DriverLocationUpdate,
  type DriverTrackingSubscriber,
} from '@/services/driverTrackingService';

// Mock WebSocket
class MockWebSocket {
  readyState: number = WebSocket.CLOSED;
  onopen: (() => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  onclose: (() => void) | null = null;

  constructor(url: string) {
    this.url = url;
  }

  url: string;
  close = jest.fn();

  // Simulate opening connection
  simulateOpen() {
    this.readyState = WebSocket.OPEN;
    this.onopen?.();
  }

  // Simulate receiving a message
  simulateMessage(data: string) {
    if (this.onmessage) {
      this.onmessage(new MessageEvent('message', { data }));
    }
  }

  // Simulate connection error
  simulateError(error: Event) {
    this.onerror?.(error);
  }

  // Simulate connection close
  simulateClose() {
    this.readyState = WebSocket.CLOSED;
    this.onclose?.();
  }
}

let mockWebSocket: MockWebSocket;
const originalWebSocket = global.WebSocket;

beforeEach(() => {
  // Reset service before each test
  driverTrackingService.close();

  // Mock WebSocket
  mockWebSocket = new MockWebSocket('ws://localhost:4000/driver-tracking');
  (global as any).WebSocket = jest.fn(() => mockWebSocket);
  (global.WebSocket as any).OPEN = 1;
  (global.WebSocket as any).CLOSED = 3;

  // Mock timers
  jest.useFakeTimers();

  // Suppress console logs during tests
  jest.spyOn(console, 'log').mockImplementation();
  jest.spyOn(console, 'error').mockImplementation();
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
  (global.WebSocket as any) = originalWebSocket;
});

describe('DriverTrackingService', () => {
  describe('subscribe and connect', () => {
    it('should subscribe a subscriber', () => {
      const subscriber: DriverTrackingSubscriber = {
        onLocationUpdate: jest.fn(),
        onConnected: jest.fn(),
      };

      driverTrackingService.subscribe(subscriber);

      expect(driverTrackingService.subscriberCount).toBe(1);
    });

    it('should return an unsubscribe function', () => {
      const subscriber: DriverTrackingSubscriber = {
        onLocationUpdate: jest.fn(),
      };

      const unsubscribe = driverTrackingService.subscribe(subscriber);
      expect(typeof unsubscribe).toBe('function');

      unsubscribe();
      expect(driverTrackingService.subscriberCount).toBe(0);
    });

    it('should close connection when last subscriber unsubscribes', () => {
      const subscriber1: DriverTrackingSubscriber = {
        onLocationUpdate: jest.fn(),
      };
      const subscriber2: DriverTrackingSubscriber = {
        onLocationUpdate: jest.fn(),
      };

      const unsubscribe1 = driverTrackingService.subscribe(subscriber1);
      const unsubscribe2 = driverTrackingService.subscribe(subscriber2);

      expect(driverTrackingService.subscriberCount).toBe(2);

      unsubscribe1();
      expect(driverTrackingService.subscriberCount).toBe(1);

      unsubscribe2();
      expect(driverTrackingService.subscriberCount).toBe(0);
    });

    it('should establish WebSocket connection on subscribe', () => {
      const subscriber: DriverTrackingSubscriber = {
        onLocationUpdate: jest.fn(),
      };

      driverTrackingService.subscribe(subscriber);
      driverTrackingService.connect();

      expect(global.WebSocket).toHaveBeenCalledWith(
        'ws://localhost:4000/driver-tracking',
      );
    });

    it('should notify subscriber when connected', () => {
      const subscriber: DriverTrackingSubscriber = {
        onLocationUpdate: jest.fn(),
        onConnected: jest.fn(),
      };

      driverTrackingService.subscribe(subscriber);
      driverTrackingService.connect();
      mockWebSocket.simulateOpen();

      expect(subscriber.onConnected).toHaveBeenCalled();
    });

    it('should not create multiple connections', () => {
      const subscriber: DriverTrackingSubscriber = {
        onLocationUpdate: jest.fn(),
      };

      driverTrackingService.subscribe(subscriber);
      driverTrackingService.connect();
      driverTrackingService.connect();

      expect(global.WebSocket).toHaveBeenCalledTimes(1);
    });
  });

  describe('message parsing and validation', () => {
    it('should parse and forward valid location update messages', () => {
      const subscriber: DriverTrackingSubscriber = {
        onLocationUpdate: jest.fn(),
      };

      driverTrackingService.subscribe(subscriber);
      driverTrackingService.connect();
      mockWebSocket.simulateOpen();

      const message: DriverLocationUpdate = {
        driverId: 'drv-123',
        lat: 6.5244,
        lng: 3.3792,
        timestamp: 1000,
      };

      mockWebSocket.simulateMessage(JSON.stringify(message));

      expect(subscriber.onLocationUpdate).toHaveBeenCalledWith(message);
    });

    it('should support batch updates (array of messages)', () => {
      const subscriber: DriverTrackingSubscriber = {
        onLocationUpdate: jest.fn(),
      };

      driverTrackingService.subscribe(subscriber);
      driverTrackingService.connect();
      mockWebSocket.simulateOpen();

      const messages: DriverLocationUpdate[] = [
        {
          driverId: 'drv-123',
          lat: 6.5244,
          lng: 3.3792,
          timestamp: 1000,
        },
        {
          driverId: 'drv-456',
          lat: 6.5300,
          lng: 3.3800,
          timestamp: 1001,
        },
      ];

      mockWebSocket.simulateMessage(JSON.stringify(messages));

      expect(subscriber.onLocationUpdate).toHaveBeenCalledTimes(2);
      expect(subscriber.onLocationUpdate).toHaveBeenCalledWith(messages[0]);
      expect(subscriber.onLocationUpdate).toHaveBeenCalledWith(messages[1]);
    });

    it('should reject invalid messages with missing fields', () => {
      const subscriber: DriverTrackingSubscriber = {
        onLocationUpdate: jest.fn(),
        onError: jest.fn(),
      };

      driverTrackingService.subscribe(subscriber);
      driverTrackingService.connect();
      mockWebSocket.simulateOpen();

      mockWebSocket.simulateMessage(JSON.stringify({ driverId: 'drv-123' }));

      expect(subscriber.onLocationUpdate).not.toHaveBeenCalled();
    });

    it('should reject messages with non-finite coordinates', () => {
      const subscriber: DriverTrackingSubscriber = {
        onLocationUpdate: jest.fn(),
      };

      driverTrackingService.subscribe(subscriber);
      driverTrackingService.connect();
      mockWebSocket.simulateOpen();

      mockWebSocket.simulateMessage(
        JSON.stringify({
          driverId: 'drv-123',
          lat: NaN,
          lng: 3.3792,
          timestamp: 1000,
        }),
      );

      expect(subscriber.onLocationUpdate).not.toHaveBeenCalled();
    });

    it('should handle malformed JSON gracefully', () => {
      const subscriber: DriverTrackingSubscriber = {
        onLocationUpdate: jest.fn(),
        onError: jest.fn(),
      };

      driverTrackingService.subscribe(subscriber);
      driverTrackingService.connect();
      mockWebSocket.simulateOpen();

      mockWebSocket.simulateMessage('{ invalid json }');

      expect(subscriber.onLocationUpdate).not.toHaveBeenCalled();
      expect(subscriber.onError).toHaveBeenCalled();
    });
  });

  describe('reconnection with backoff', () => {
    it('should schedule reconnection on disconnect', () => {
      const subscriber: DriverTrackingSubscriber = {
        onLocationUpdate: jest.fn(),
        onReconnecting: jest.fn(),
      };

      driverTrackingService.subscribe(subscriber);
      driverTrackingService.connect();
      mockWebSocket.simulateOpen();

      // Simulate disconnect
      mockWebSocket.simulateClose();

      expect(subscriber.onReconnecting).toHaveBeenCalled();
      expect(driverTrackingService.isReconnecting).toBe(true);
    });

    it('should use exponential backoff for reconnection attempts', () => {
      const subscriber: DriverTrackingSubscriber = {
        onLocationUpdate: jest.fn(),
      };

      driverTrackingService.subscribe(subscriber);
      driverTrackingService.connect();
      mockWebSocket.simulateOpen();

      (global.WebSocket as any).mockClear();

      // First reconnect after 1000ms
      mockWebSocket.simulateClose();
      jest.advanceTimersByTime(1000);

      // Simulate second disconnect after 2000ms (backoff * 2)
      mockWebSocket.simulateClose();
      jest.advanceTimersByTime(2000);

      // Should have attempted reconnect twice
      expect(global.WebSocket).toHaveBeenCalledTimes(2);
    });

    it('should cap backoff delay at maxDelayMs', () => {
      const subscriber: DriverTrackingSubscriber = {
        onLocationUpdate: jest.fn(),
      };

      driverTrackingService.subscribe(subscriber);
      driverTrackingService.connect();
      mockWebSocket.simulateOpen();

      // Simulate multiple disconnects to trigger backoff growth
      for (let i = 0; i < 6; i++) {
        mockWebSocket.simulateClose();
        jest.advanceTimersByTime(35000); // Move past max delay
      }

      // After 5 retries, should stop
      expect(driverTrackingService.isReconnecting).toBe(false);
    });

    it('should reset reconnection count on successful connection', () => {
      const subscriber: DriverTrackingSubscriber = {
        onLocationUpdate: jest.fn(),
      };

      driverTrackingService.subscribe(subscriber);
      driverTrackingService.connect();
      mockWebSocket.simulateOpen();

      // Disconnect and trigger reconnect
      mockWebSocket.simulateClose();
      jest.advanceTimersByTime(1000);

      // Simulate successful reconnection
      mockWebSocket.simulateOpen();

      // Next disconnect should use initial backoff, not backoff^2
      mockWebSocket.simulateClose();

      expect(driverTrackingService.isReconnecting).toBe(true);
    });

    it('should not reconnect if intentionally closed', () => {
      const subscriber: DriverTrackingSubscriber = {
        onLocationUpdate: jest.fn(),
        onReconnecting: jest.fn(),
      };

      driverTrackingService.subscribe(subscriber);
      driverTrackingService.connect();
      mockWebSocket.simulateOpen();

      // Intentionally close
      driverTrackingService.close();
      mockWebSocket.simulateClose();

      expect(subscriber.onReconnecting).not.toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should notify subscribers of WebSocket errors', () => {
      const subscriber: DriverTrackingSubscriber = {
        onLocationUpdate: jest.fn(),
        onError: jest.fn(),
      };

      driverTrackingService.subscribe(subscriber);
      driverTrackingService.connect();
      mockWebSocket.simulateOpen();

      const error = new Event('error');
      mockWebSocket.simulateError(error);

      expect(subscriber.onError).toHaveBeenCalled();
    });

    it('should handle subscriber callback errors without affecting others', () => {
      const subscriber1: DriverTrackingSubscriber = {
        onLocationUpdate: jest.fn(() => {
          throw new Error('Subscriber 1 error');
        }),
      };

      const subscriber2: DriverTrackingSubscriber = {
        onLocationUpdate: jest.fn(),
      };

      driverTrackingService.subscribe(subscriber1);
      driverTrackingService.subscribe(subscriber2);
      driverTrackingService.connect();
      mockWebSocket.simulateOpen();

      const message: DriverLocationUpdate = {
        driverId: 'drv-123',
        lat: 6.5244,
        lng: 3.3792,
        timestamp: 1000,
      };

      mockWebSocket.simulateMessage(JSON.stringify(message));

      // Subscriber 2 should still be called despite subscriber 1 throwing
      expect(subscriber2.onLocationUpdate).toHaveBeenCalledWith(message);
    });
  });

  describe('connection state queries', () => {
    it('should report isConnected correctly', () => {
      const subscriber: DriverTrackingSubscriber = {
        onLocationUpdate: jest.fn(),
      };

      expect(driverTrackingService.isConnected).toBe(false);

      driverTrackingService.subscribe(subscriber);
      driverTrackingService.connect();

      expect(driverTrackingService.isConnected).toBe(false);

      mockWebSocket.simulateOpen();

      expect(driverTrackingService.isConnected).toBe(true);

      mockWebSocket.simulateClose();

      expect(driverTrackingService.isConnected).toBe(false);
    });

    it('should report subscriberCount correctly', () => {
      const sub1: DriverTrackingSubscriber = {
        onLocationUpdate: jest.fn(),
      };
      const sub2: DriverTrackingSubscriber = {
        onLocationUpdate: jest.fn(),
      };

      const unsub1 = driverTrackingService.subscribe(sub1);
      expect(driverTrackingService.subscriberCount).toBe(1);

      const unsub2 = driverTrackingService.subscribe(sub2);
      expect(driverTrackingService.subscriberCount).toBe(2);

      unsub1();
      expect(driverTrackingService.subscriberCount).toBe(1);

      unsub2();
      expect(driverTrackingService.subscriberCount).toBe(0);
    });
  });

  describe('cleanup', () => {
    it('should clear all subscribers on close', () => {
      const subscriber: DriverTrackingSubscriber = {
        onLocationUpdate: jest.fn(),
      };

      driverTrackingService.subscribe(subscriber);
      expect(driverTrackingService.subscriberCount).toBe(1);

      driverTrackingService.close();
      expect(driverTrackingService.subscriberCount).toBe(0);
    });

    it('should clear reconnection timeout on close', () => {
      const subscriber: DriverTrackingSubscriber = {
        onLocationUpdate: jest.fn(),
      };

      driverTrackingService.subscribe(subscriber);
      driverTrackingService.connect();
      mockWebSocket.simulateOpen();

      mockWebSocket.simulateClose();
      expect(driverTrackingService.isReconnecting).toBe(true);

      driverTrackingService.close();
      expect(driverTrackingService.isReconnecting).toBe(false);
    });

    it('should call close on WebSocket', () => {
      const subscriber: DriverTrackingSubscriber = {
        onLocationUpdate: jest.fn(),
      };

      driverTrackingService.subscribe(subscriber);
      driverTrackingService.connect();
      mockWebSocket.simulateOpen();

      driverTrackingService.close();

      expect(mockWebSocket.close).toHaveBeenCalled();
    });
  });
});
