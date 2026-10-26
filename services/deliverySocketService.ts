/**
 * DeliverySocketService — Service layer for real-time delivery status updates.
 *
 * Encapsulates the native WebSocket connection so the hook layer never
 * touches the socket directly. Follows the singleton pattern to prevent
 * duplicate connections for the same delivery.
 *
 * Upgraded with exponential backoff reconnection, jitter, error recovery,
 * and connection lifecycle reporting.
 */

// Aligned with the canonical status enum in types/delivery.ts
export type DeliveryStatus =
  | 'PENDING'
  | 'ACCEPTED'
  | 'IN_TRANSIT'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'UNKNOWN';

export interface ReconnectConfig {
  maxRetries: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
  jitter: boolean;
}

export const DEFAULT_DELIVERY_RECONNECT_CONFIG: ReconnectConfig = {
  maxRetries: 5,
  initialDelayMs: 1000,
  maxDelayMs: 30000,
  backoffMultiplier: 2,
  jitter: true,
};

export interface DeliverySocketCallbacks {
  onStatusUpdate: (_status: DeliveryStatus) => void;
  onConnected?: () => void;
  onDisconnected?: () => void;
  onError?: (_error: Event | Error) => void;
  onReconnecting?: (_attempt: number, _delayMs: number) => void;
  onMaxRetriesReached?: () => void;
}

class DeliverySocketService {
  private socket: WebSocket | null = null;
  private isIntentionallyClosed = false;
  private reconnectCount = 0;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private activeDeliveryId: string | null = null;
  private activeCallbacks: DeliverySocketCallbacks | null = null;
  private reconnectConfig: ReconnectConfig = DEFAULT_DELIVERY_RECONNECT_CONFIG;

  /**
   * Opens a WebSocket connection scoped to a single delivery.
   * Calls `onConnected` once the connection is established,
   * `onStatusUpdate` on every incoming status event, and
   * automatically reconnects with exponential backoff on unexpected drops.
   */
  connect(
    deliveryId: string,
    callbacks: DeliverySocketCallbacks,
    config?: Partial<ReconnectConfig>,
  ): void {
    // Guard: disconnect any existing connection first
    this.disconnect();

    this.isIntentionallyClosed = false;
    this.reconnectCount = 0;
    this.activeDeliveryId = deliveryId;
    this.activeCallbacks = callbacks;
    this.reconnectConfig = { ...DEFAULT_DELIVERY_RECONNECT_CONFIG, ...config };

    this.openSocket(deliveryId, callbacks);
  }

  private calculateBackoffDelay(attempt: number): number {
    const baseDelay = Math.min(
      this.reconnectConfig.initialDelayMs *
        Math.pow(this.reconnectConfig.backoffMultiplier, attempt),
      this.reconnectConfig.maxDelayMs,
    );

    if (!this.reconnectConfig.jitter) {
      return baseDelay;
    }

    // ±20% jitter
    const jitterFactor = 0.8 + Math.random() * 0.4;
    return Math.round(baseDelay * jitterFactor);
  }

  private scheduleReconnect(): void {
    if (
      this.isIntentionallyClosed ||
      !this.activeDeliveryId ||
      !this.activeCallbacks
    ) {
      return;
    }

    if (this.reconnectCount >= this.reconnectConfig.maxRetries) {
      // eslint-disable-next-line no-console
      console.error(
        '[DeliverySocketService] Max reconnection attempts reached',
      );
      this.activeCallbacks.onMaxRetriesReached?.();
      this.activeCallbacks.onDisconnected?.();
      return;
    }

    const delay = this.calculateBackoffDelay(this.reconnectCount);
    this.reconnectCount += 1;
    this.activeCallbacks.onReconnecting?.(this.reconnectCount, delay);

    // eslint-disable-next-line no-console
    console.log(
      `[DeliverySocketService] Scheduling reconnect attempt ${this.reconnectCount}/${this.reconnectConfig.maxRetries} in ${delay}ms`,
    );

    this.reconnectTimeout = setTimeout(() => {
      this.reconnectTimeout = null;
      if (
        !this.isIntentionallyClosed &&
        this.activeDeliveryId &&
        this.activeCallbacks
      ) {
        this.openSocket(this.activeDeliveryId, this.activeCallbacks);
      }
    }, delay);
  }

  private openSocket(
    deliveryId: string,
    callbacks: DeliverySocketCallbacks,
  ): void {
    const wsUrl =
      process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8080/logistics';

    try {
      this.socket = new WebSocket(`${wsUrl}?deliveryId=${deliveryId}`);

      this.socket.onopen = () => {
        this.reconnectCount = 0;
        callbacks.onConnected?.();
      };

      this.socket.onmessage = (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data as string) as { status?: string };
          if (data?.status) {
            callbacks.onStatusUpdate(data.status as DeliveryStatus);
          }
        } catch (error) {
          // eslint-disable-next-line no-console
          console.error(
            '[DeliverySocketService] Failed to parse message:',
            error,
          );
        }
      };

      this.socket.onerror = (error: Event) => {
        // eslint-disable-next-line no-console
        console.error('[DeliverySocketService] WebSocket error:', error);
        callbacks.onError?.(error);
      };

      this.socket.onclose = () => {
        this.socket = null;
        if (!this.isIntentionallyClosed) {
          this.scheduleReconnect();
        } else {
          callbacks.onDisconnected?.();
        }
      };
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(
        '[DeliverySocketService] Failed to create WebSocket:',
        error,
      );
      callbacks.onError?.(
        error instanceof Error ? error : new Error(String(error)),
      );
      this.scheduleReconnect();
    }
  }

  /**
   * Manually triggers an immediate reconnection attempt for error recovery.
   */
  reconnect(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    if (this.activeDeliveryId && this.activeCallbacks) {
      this.isIntentionallyClosed = false;
      this.reconnectCount = 0;
      this.openSocket(this.activeDeliveryId, this.activeCallbacks);
    }
  }

  /** Cleanly closes the connection, clears timers, and nulls references. */
  disconnect(): void {
    this.isIntentionallyClosed = true;

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.socket) {
      // Remove handlers before closing to avoid stale callbacks firing
      this.socket.onopen = null;
      this.socket.onmessage = null;
      this.socket.onerror = null;
      this.socket.onclose = null;
      this.socket.close();
      this.socket = null;
    }

    this.activeDeliveryId = null;
    this.activeCallbacks = null;
    this.reconnectCount = 0;
  }

  get isConnected(): boolean {
    return this.socket?.readyState === WebSocket.OPEN;
  }

  get isReconnecting(): boolean {
    return this.reconnectTimeout !== null;
  }

  get reconnectAttempts(): number {
    return this.reconnectCount;
  }
}

// Singleton — one service instance shared across the app
export const deliverySocketService = new DeliverySocketService();
