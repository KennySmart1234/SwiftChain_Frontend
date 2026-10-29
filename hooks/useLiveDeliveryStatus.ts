import { useState, useEffect, useCallback } from 'react';
import {
  deliverySocketService,
  DeliveryStatus,
  ReconnectConfig,
} from '../services/deliverySocketService';

export interface LiveDeliveryStatusResult {
  status: DeliveryStatus;
  isConnected: boolean;
  isReconnecting: boolean;
  reconnectAttempts: number;
  error: string | null;
  reconnect: () => void;
}

/**
 * useLiveDeliveryStatus — Hook layer for real-time delivery status.
 *
 * Follows the Component -> Hook -> Service pattern:
 * - Opens a WebSocket connection via `deliverySocketService` on mount.
 * - Handles automatic reconnection with exponential backoff on drop.
 * - Exposes status, isConnected, isReconnecting, error, and manual reconnect.
 * - Cleans up the connection on unmount or when `deliveryId` changes.
 *
 * @param deliveryId - The ID of the delivery to track.
 * @param config - Optional reconnection configuration overrides.
 * @returns Reactive status and connection state with error recovery.
 */
export const useLiveDeliveryStatus = (
  deliveryId: string,
  config?: Partial<ReconnectConfig>,
): LiveDeliveryStatusResult => {
  const [status, setStatus] = useState<DeliveryStatus>('PENDING');
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isReconnecting, setIsReconnecting] = useState<boolean>(false);
  const [reconnectAttempts, setReconnectAttempts] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);

  const reconnect = useCallback(() => {
    deliverySocketService.reconnect();
  }, []);

  useEffect(() => {
    if (!deliveryId) return;

    deliverySocketService.connect(
      deliveryId,
      {
        onConnected: () => {
          setIsConnected(true);
          setIsReconnecting(false);
          setReconnectAttempts(0);
          setError(null);
        },
        onStatusUpdate: (newStatus) => {
          setStatus(newStatus);
        },
        onReconnecting: (attempt) => {
          setIsConnected(false);
          setIsReconnecting(true);
          setReconnectAttempts(attempt);
        },
        onDisconnected: () => {
          setIsConnected(false);
          setIsReconnecting(false);
        },
        onError: (err) => {
          setIsConnected(false);
          setError(
            err instanceof Error
              ? err.message
              : 'Delivery tracking connection error',
          );
        },
        onMaxRetriesReached: () => {
          setIsConnected(false);
          setIsReconnecting(false);
          setError('Max reconnection attempts reached. Click to retry.');
        },
      },
      config,
    );

    return () => {
      deliverySocketService.disconnect();
      setIsConnected(false);
      setIsReconnecting(false);
      setReconnectAttempts(0);
      setError(null);
    };
  }, [deliveryId, config]);

  return {
    status,
    isConnected,
    isReconnecting,
    reconnectAttempts,
    error,
    reconnect,
  };
};
