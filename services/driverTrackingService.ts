/**
 * DriverTrackingService — Service layer for live driver location updates via WebSocket.
 *
 * Owns the raw WebSocket connection lifecycle (connect, send, receive, close, reconnect-with-backoff).
 * No React, no rendering concerns — pure connection management.
 *
 * Exposes a clean subscribe/unsubscribe interface for the hook layer to consume,
 * without leaking raw WebSocket API details (readyState, onmessage, etc.).
 */

export interface DriverLocationUpdate {
  driverId: string;
  lat: number;
  lng: number;
  timestamp: number;
}

export interface DriverTrackingSubscriber {
  onLocationUpdate(update: DriverLocationUpdate): void;
  onConnected?(): void;
  onDisconnected?(): void;
  onReconnecting?(): void;
  onError?(error: string): void;
}

interface ReconnectConfig {
  maxRetries: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
}

const DEFAULT_RECONNECT_CONFIG: ReconnectConfig = {
  maxRetries: 5,
  initialDelayMs: 1000,
  maxDelayMs: 30000,
  backoffMultiplier: 2,
};

class DriverTrackingService {
  private socket: WebSocket | null = null;
  private subscribers: Set<DriverTrackingSubscriber> = new Set();
  private reconnectCount = 0;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private reconnectConfig: ReconnectConfig;
  private isIntentionallyClosed = false;
  private url: string;

  constructor(
    url: string = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:4000',
  ) {
    this.url = url;
    this.reconnectConfig = DEFAULT_RECONNECT_CONFIG;
  }

  /**
   * Subscribes to driver location updates.
   * Returns an unsubscribe function for cleanup.
   */
  subscribe(subscriber: DriverTrackingSubscriber): () => void {
    this.subscribers.add(subscriber);

    // If already connected, notify immediately
    if (this.socket?.readyState === WebSocket.OPEN) {
      subscriber.onConnected?.();
    }

    // Return unsubscribe function
    return () => {
      this.subscribers.delete(subscriber);

      // If no more subscribers, close the connection
      if (this.subscribers.size === 0) {
        this.close();
      }
    };
  }

  /**
   * Establishes a WebSocket connection to the driver tracking endpoint.
   * Called automatically when the first subscriber is added.
   */
  connect(): void {
    if (this.socket) {
      return;
    }

    this.isIntentionallyClosed = false;

    // Construct the WebSocket URL — append '/driver-tracking' path for live updates
    const wsUrl = `${this.url}/driver-tracking`;

    try {
      this.socket = new WebSocket(wsUrl);

      this.socket.onopen = () => {
        // eslint-disable-next-line no-console
        console.log('[DriverTrackingService] Connected to driver tracking endpoint');
        this.reconnectCount = 0;
        this.notifySubscribers('connected');
      };

      this.socket.onmessage = (event: MessageEvent) => {
        this.handleMessage(event.data);
      };

      this.socket.onerror = (event: Event) => {
        // eslint-disable-next-line no-console
        console.error('[DriverTrackingService] WebSocket error:', event);
        this.notifySubscribers('error', 'WebSocket connection error');
      };

      this.socket.onclose = () => {
        // eslint-disable-next-line no-console
        console.log('[DriverTrackingService] Connection closed');
        this.socket = null;

        if (!this.isIntentionallyClosed && this.subscribers.size > 0) {
          this.scheduleReconnect();
        } else {
          this.notifySubscribers('disconnected');
        }
      };
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('[DriverTrackingService] Failed to create WebSocket:', error);
      this.notifySubscribers('error', 'Failed to create WebSocket connection');
      this.scheduleReconnect();
    }
  }

  /**
   * Schedules a reconnection attempt with exponential backoff.
   */
  private scheduleReconnect(): void {
    if (this.reconnectCount >= this.reconnectConfig.maxRetries) {
      // eslint-disable-next-line no-console
      console.error('[DriverTrackingService] Max reconnection attempts reached');
      this.notifySubscribers('error', 'Max reconnection attempts reached');
      return;
    }

    // Calculate backoff delay
    const delay = Math.min(
      this.reconnectConfig.initialDelayMs *
        Math.pow(this.reconnectConfig.backoffMultiplier, this.reconnectCount),
      this.reconnectConfig.maxDelayMs,
    );

    this.reconnectCount += 1;
    this.notifySubscribers('reconnecting');

    // eslint-disable-next-line no-console
    console.log(
      `[DriverTrackingService] Scheduling reconnect attempt ${this.reconnectCount}/${this.reconnectConfig.maxRetries} in ${delay}ms`,
    );

    this.reconnectTimeout = setTimeout(() => {
      this.reconnectTimeout = null;
      this.connect();
    }, delay);
  }

  /**
   * Parses and handles an incoming WebSocket message.
   */
  private handleMessage(data: string): void {
    try {
      const parsed = JSON.parse(data) as unknown;

      // Support both single updates and batched updates
      const updates = Array.isArray(parsed) ? parsed : [parsed];

      for (const update of updates) {
        if (this.isValidUpdate(update)) {
          this.notifyLocationUpdate(update as DriverLocationUpdate);
        }
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('[DriverTrackingService] Failed to parse message:', error);
      this.notifySubscribers('error', 'Failed to parse incoming message');
    }
  }

  /**
   * Validates that a message conforms to the expected DriverLocationUpdate shape.
   */
  private isValidUpdate(update: unknown): boolean {
    if (!update || typeof update !== 'object') return false;
    const u = update as Partial<DriverLocationUpdate>;
    return (
      typeof u.driverId === 'string' &&
      typeof u.lat === 'number' &&
      Number.isFinite(u.lat) &&
      typeof u.lng === 'number' &&
      Number.isFinite(u.lng) &&
      typeof u.timestamp === 'number'
    );
  }

  /**
   * Notifies all subscribers of a location update.
   */
  private notifyLocationUpdate(update: DriverLocationUpdate): void {
    for (const subscriber of this.subscribers) {
      try {
        subscriber.onLocationUpdate(update);
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('[DriverTrackingService] Subscriber error:', error);
      }
    }
  }

  /**
   * Notifies all subscribers of connection state changes or errors.
   */
  private notifySubscribers(
    event: 'connected' | 'disconnected' | 'reconnecting' | 'error',
    errorMessage?: string,
  ): void {
    for (const subscriber of this.subscribers) {
      try {
        switch (event) {
          case 'connected':
            subscriber.onConnected?.();
            break;
          case 'disconnected':
            subscriber.onDisconnected?.();
            break;
          case 'reconnecting':
            subscriber.onReconnecting?.();
            break;
          case 'error':
            subscriber.onError?.(errorMessage || 'Unknown error');
            break;
        }
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('[DriverTrackingService] Subscriber callback error:', error);
      }
    }
  }

  /**
   * Gracefully closes the connection and clears reconnection timers.
   */
  close(): void {
    this.isIntentionallyClosed = true;

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.socket) {
      // Remove handlers to prevent stale callbacks
      this.socket.onopen = null;
      this.socket.onmessage = null;
      this.socket.onerror = null;
      this.socket.onclose = null;
      this.socket.close();
      this.socket = null;
    }

    this.reconnectCount = 0;
    this.subscribers.clear();
  }

  /**
   * Returns the current connection state.
   */
  get isConnected(): boolean {
    return this.socket?.readyState === WebSocket.OPEN;
  }

  /**
   * Returns whether a reconnection is in progress.
   */
  get isReconnecting(): boolean {
    return this.reconnectTimeout !== null;
  }

  /**
   * Returns the number of active subscribers.
   */
  get subscriberCount(): number {
    return this.subscribers.size;
  }
}

/**
 * Singleton instance of the driver tracking service.
 * Shared across the entire application to maintain a single WebSocket connection.
 */
export const driverTrackingService = new DriverTrackingService();
