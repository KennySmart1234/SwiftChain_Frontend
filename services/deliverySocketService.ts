/**
 * DeliverySocketService — Service layer for real-time delivery status updates.
 *
 * Encapsulates the native WebSocket connection so the hook layer never
 * touches the socket directly. Follows the singleton pattern to prevent
 * duplicate connections for the same delivery.
 */

// Aligned with the canonical status enum in types/delivery.ts
export type DeliveryStatus =
  | 'PENDING'
  | 'ACCEPTED'
  | 'IN_TRANSIT'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'UNKNOWN';

export interface DeliverySocketCallbacks {
  onStatusUpdate: (_status: DeliveryStatus) => void;
  onConnected?: () => void;
  onDisconnected?: () => void;
  onError?: (_error: Event) => void;
}

class DeliverySocketService {
  private socket: WebSocket | null = null;

  /**
   * Opens a WebSocket connection scoped to a single delivery.
   * Calls `onConnected` once the connection is established and
   * `onStatusUpdate` on every incoming status event.
   */
  connect(deliveryId: string, callbacks: DeliverySocketCallbacks): void {
    // Guard: disconnect any existing connection first
    this.disconnect();

    const wsUrl =
      process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8080/logistics';

    this.socket = new WebSocket(`${wsUrl}?deliveryId=${deliveryId}`);

    this.socket.onopen = () => {
      callbacks.onConnected?.();
    };

    this.socket.onmessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data as string) as { status?: string };
        if (data?.status) {
          callbacks.onStatusUpdate(data.status as DeliveryStatus);
        }
      } catch (error) {
        console.error('[DeliverySocketService] Failed to parse message:', error);
      }
    };

    this.socket.onerror = (error: Event) => {
      console.error('[DeliverySocketService] WebSocket error:', error);
      callbacks.onError?.(error);
    };

    this.socket.onclose = () => {
      callbacks.onDisconnected?.();
      this.socket = null;
    };
  }

  /** Cleanly closes the connection and nulls the reference. */
  disconnect(): void {
    if (this.socket) {
      // Remove handlers before closing to avoid stale callbacks firing
      this.socket.onopen = null;
      this.socket.onmessage = null;
      this.socket.onerror = null;
      this.socket.onclose = null;
      this.socket.close();
      this.socket = null;
    }
  }

  get isConnected(): boolean {
    return this.socket?.readyState === WebSocket.OPEN;
  }
}

// Singleton — one service instance shared across the app
export const deliverySocketService = new DeliverySocketService();
