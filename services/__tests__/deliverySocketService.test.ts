import {
  deliverySocketService,
  DeliveryStatus,
  DeliverySocketCallbacks,
} from '@/services/deliverySocketService';

// Mock WebSocket
class MockWebSocket {
  readyState: number = WebSocket.CONNECTING;
  onopen: (() => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  onclose: (() => void) | null = null;
  url: string;
  close = jest.fn();

  constructor(url: string) {
    this.url = url;
  }

  simulateOpen() {
    this.readyState = WebSocket.OPEN;
    this.onopen?.();
  }

  simulateMessage(data: string) {
    if (this.onmessage) {
      this.onmessage(new MessageEvent('message', { data }));
    }
  }

  simulateError(error: Event = new Event('error')) {
    this.onerror?.(error);
  }

  simulateClose() {
    this.readyState = WebSocket.CLOSED;
    this.onclose?.();
  }
}

let mockWebSocket: MockWebSocket;
const originalWebSocket = global.WebSocket;

beforeEach(() => {
  deliverySocketService.disconnect();
  jest.clearAllMocks();
  jest.useFakeTimers();

  mockWebSocket = new MockWebSocket('ws://localhost:8080/logistics?deliveryId=del-123');
  (global as any).WebSocket = jest.fn(() => mockWebSocket);
  (global.WebSocket as any).OPEN = 1;
  (global.WebSocket as any).CLOSED = 3;
  (global.WebSocket as any).CONNECTING = 0;

  jest.spyOn(console, 'log').mockImplementation();
  jest.spyOn(console, 'error').mockImplementation();
});

afterEach(() => {
  deliverySocketService.disconnect();
  jest.useRealTimers();
  jest.restoreAllMocks();
  (global.WebSocket as any) = originalWebSocket;
});

describe('DeliverySocketService', () => {
  const DELIVERY_ID = 'del-123';

  describe('connection lifecycle', () => {
    it('opens a WebSocket connection for the delivery ID', () => {
      const callbacks: DeliverySocketCallbacks = {
        onStatusUpdate: jest.fn(),
        onConnected: jest.fn(),
      };

      deliverySocketService.connect(DELIVERY_ID, callbacks);

      expect(global.WebSocket).toHaveBeenCalledWith(
        expect.stringContaining(`deliveryId=${DELIVERY_ID}`),
      );
      expect(deliverySocketService.isConnected).toBe(false);

      mockWebSocket.simulateOpen();

      expect(callbacks.onConnected).toHaveBeenCalledTimes(1);
      expect(deliverySocketService.isConnected).toBe(true);
    });

    it('receives status update messages and dispatches to callback', () => {
      const callbacks: DeliverySocketCallbacks = {
        onStatusUpdate: jest.fn(),
      };

      deliverySocketService.connect(DELIVERY_ID, callbacks);
      mockWebSocket.simulateOpen();

      mockWebSocket.simulateMessage(JSON.stringify({ status: 'IN_TRANSIT' }));

      expect(callbacks.onStatusUpdate).toHaveBeenCalledWith('IN_TRANSIT');
    });

    it('handles malformed JSON messages gracefully without throwing', () => {
      const callbacks: DeliverySocketCallbacks = {
        onStatusUpdate: jest.fn(),
      };

      deliverySocketService.connect(DELIVERY_ID, callbacks);
      mockWebSocket.simulateOpen();

      mockWebSocket.simulateMessage('invalid-json{{{');

      expect(callbacks.onStatusUpdate).not.toHaveBeenCalled();
    });

    it('calls onError callback when WebSocket emits error', () => {
      const callbacks: DeliverySocketCallbacks = {
        onStatusUpdate: jest.fn(),
        onError: jest.fn(),
      };

      deliverySocketService.connect(DELIVERY_ID, callbacks);
      const errorEvent = new Event('error');
      mockWebSocket.simulateError(errorEvent);

      expect(callbacks.onError).toHaveBeenCalledWith(errorEvent);
    });
  });

  describe('reconnection and exponential backoff', () => {
    it('schedules reconnection with backoff on unexpected disconnect', () => {
      const callbacks: DeliverySocketCallbacks = {
        onStatusUpdate: jest.fn(),
        onConnected: jest.fn(),
        onReconnecting: jest.fn(),
      };

      deliverySocketService.connect(DELIVERY_ID, callbacks, {
        initialDelayMs: 1000,
        backoffMultiplier: 2,
        jitter: false,
      });
      mockWebSocket.simulateOpen();

      // Unexpected disconnect
      mockWebSocket.simulateClose();

      expect(callbacks.onReconnecting).toHaveBeenCalledWith(1, 1000);
      expect(deliverySocketService.isReconnecting).toBe(true);
      expect(deliverySocketService.reconnectAttempts).toBe(1);

      // Fast forward by 1000ms to trigger reconnect
      (global.WebSocket as any).mockClear();
      jest.advanceTimersByTime(1000);

      expect(global.WebSocket).toHaveBeenCalledTimes(1);
    });

    it('multiplies backoff delay for subsequent reconnection attempts', () => {
      const callbacks: DeliverySocketCallbacks = {
        onStatusUpdate: jest.fn(),
        onReconnecting: jest.fn(),
      };

      deliverySocketService.connect(DELIVERY_ID, callbacks, {
        initialDelayMs: 1000,
        backoffMultiplier: 2,
        jitter: false,
      });
      mockWebSocket.simulateOpen();

      // Disconnect 1 -> delay 1000ms
      mockWebSocket.simulateClose();
      expect(callbacks.onReconnecting).toHaveBeenLastCalledWith(1, 1000);
      jest.advanceTimersByTime(1000);

      // Disconnect 2 -> delay 2000ms
      mockWebSocket.simulateClose();
      expect(callbacks.onReconnecting).toHaveBeenLastCalledWith(2, 2000);
      jest.advanceTimersByTime(2000);

      // Disconnect 3 -> delay 4000ms
      mockWebSocket.simulateClose();
      expect(callbacks.onReconnecting).toHaveBeenLastCalledWith(3, 4000);
    });

    it('stops reconnecting and calls onMaxRetriesReached after exceeding maxRetries', () => {
      const callbacks: DeliverySocketCallbacks = {
        onStatusUpdate: jest.fn(),
        onMaxRetriesReached: jest.fn(),
        onDisconnected: jest.fn(),
      };

      deliverySocketService.connect(DELIVERY_ID, callbacks, {
        maxRetries: 2,
        initialDelayMs: 100,
        jitter: false,
      });
      mockWebSocket.simulateOpen();

      // Attempt 1
      mockWebSocket.simulateClose();
      jest.advanceTimersByTime(100);

      // Attempt 2
      mockWebSocket.simulateClose();
      jest.advanceTimersByTime(200);

      // Attempt 3 (exceeds maxRetries=2)
      mockWebSocket.simulateClose();

      expect(callbacks.onMaxRetriesReached).toHaveBeenCalledTimes(1);
      expect(callbacks.onDisconnected).toHaveBeenCalled();
      expect(deliverySocketService.isReconnecting).toBe(false);
    });

    it('resets reconnect attempts upon successful connection', () => {
      const callbacks: DeliverySocketCallbacks = {
        onStatusUpdate: jest.fn(),
        onReconnecting: jest.fn(),
        onConnected: jest.fn(),
      };

      deliverySocketService.connect(DELIVERY_ID, callbacks, {
        initialDelayMs: 1000,
        jitter: false,
      });
      mockWebSocket.simulateOpen();

      // Disconnect once
      mockWebSocket.simulateClose();
      expect(deliverySocketService.reconnectAttempts).toBe(1);
      jest.advanceTimersByTime(1000);

      // Reconnection succeeds
      mockWebSocket.simulateOpen();
      expect(deliverySocketService.reconnectAttempts).toBe(0);

      // Next disconnect starts from attempt 1 again
      mockWebSocket.simulateClose();
      expect(callbacks.onReconnecting).toHaveBeenLastCalledWith(1, 1000);
    });

    it('does not attempt reconnect if intentionally disconnected', () => {
      const callbacks: DeliverySocketCallbacks = {
        onStatusUpdate: jest.fn(),
        onDisconnected: jest.fn(),
        onReconnecting: jest.fn(),
      };

      deliverySocketService.connect(DELIVERY_ID, callbacks);
      mockWebSocket.simulateOpen();

      // Clean intentional disconnect
      deliverySocketService.disconnect();

      expect(callbacks.onReconnecting).not.toHaveBeenCalled();
      expect(deliverySocketService.isReconnecting).toBe(false);
      expect(mockWebSocket.close).toHaveBeenCalled();
    });

    it('supports manual error recovery via reconnect()', () => {
      const callbacks: DeliverySocketCallbacks = {
        onStatusUpdate: jest.fn(),
        onConnected: jest.fn(),
      };

      deliverySocketService.connect(DELIVERY_ID, callbacks, { maxRetries: 1 });
      mockWebSocket.simulateOpen();

      // Exceed max retries
      mockWebSocket.simulateClose();
      jest.advanceTimersByTime(1000);
      mockWebSocket.simulateClose();

      (global.WebSocket as any).mockClear();

      // Manual error recovery
      deliverySocketService.reconnect();
      expect(global.WebSocket).toHaveBeenCalledTimes(1);
      mockWebSocket.simulateOpen();
      expect(deliverySocketService.isConnected).toBe(true);
    });
  });
});
