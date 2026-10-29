'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { refundService } from '@/services/refundService';
import type { RefundStatusResponse, RefundStatus } from '@/types/refund';

/**
 * Configuration options for polling behavior and retry logic.
 */
interface UseRefundStatusOptions {
  /**
   * Polling interval in milliseconds while refund is 'processing'.
   * Defaults to 10000ms (10 seconds) as per requirements.
   */
  pollInterval?: number;

  /**
   * Maximum number of retry attempts for failed requests.
   * Defaults to 3.
   */
  maxRetries?: number;

  /**
   * Automatically enable polling on mount.
   * Defaults to true.
   */
  autoStart?: boolean;
}

/**
 * Result object returned by useRefundStatus hook.
 * Provides all necessary data and controls for refund tracking UI.
 */
export interface UseRefundStatusResult {
  /**
   * The current refund status response from backend.
   * Contains status, amount, timeline, and other refund details.
   * Null while loading or before first fetch.
   */
  refundStatus: RefundStatusResponse | null;

  /**
   * True while initial fetch or refetch is in progress.
   */
  isLoading: boolean;

  /**
   * True if an error occurred during fetch or polling.
   */
  isError: boolean;

  /**
   * Error message if isError is true.
   * Null when there is no error.
   */
  error: string | null;

  /**
   * Current refund status state ('pending', 'processing', 'completed', 'failed').
   * Null if no data has been fetched yet.
   * Useful for conditional rendering based on status.
   */
  status: RefundStatus | null;

  /**
   * True if refund is still in 'processing' state and polling is active.
   */
  isPolling: boolean;

  /**
   * Manually refetch the refund status from backend.
   * Resets error state and fetches fresh data.
   * Returns a promise that resolves when fetch completes.
   */
  refetch: () => Promise<void>;

  /**
   * Retry a failed refund via the retry endpoint.
   * Only callable when status is 'failed'.
   * Returns a promise that resolves when retry completes.
   */
  retry: () => Promise<void>;

  /**
   * Stop the polling interval.
   * Useful when component unmounts or user navigates away.
   */
  stopPolling: () => void;

  /**
   * Start polling if it was stopped.
   * Resumes polling if status is still 'processing'.
   */
  startPolling: () => void;
}

/**
 * useRefundStatus — Custom hook for refund status tracking and polling.
 * 
 * Fetches refund status from `/api/refund/mine/{shipmentId}` and polls
 * every 10 seconds while status is 'processing'. Stops polling on terminal
 * states ('completed' or 'failed'). Provides error state with failure reason
 * and manual retry capability.
 * 
 * Strict layered architecture:
 *   Component → Hook (useRefundStatus) → Service (refundService) → API
 * 
 * Features:
 * - Automatic polling for 'processing' status (10s interval)
 * - Manual refetch capability
 * - Retry logic for failed refunds
 * - Error handling with user-friendly messages
 * - Stops polling on terminal states
 * - Cleanup on unmount (clears intervals)
 * 
 * @param shipmentId - The ID of the cancelled shipment to track
 * @param options - Optional configuration for polling and retry behavior
 * @returns UseRefundStatusResult with refund data and control methods
 * 
 * @example
 * ```tsx
 * const {
 *   refundStatus,
 *   isLoading,
 *   error,
 *   isPolling,
 *   refetch,
 *   retry,
 * } = useRefundStatus(shipmentId);
 *
 * if (isLoading) return <p>Loading refund status...</p>;
 * if (error) return <p>Error: {error}</p>;
 *
 * return (
 *   <div>
 *     <p>Status: {refundStatus?.status}</p>
 *     <p>Amount: {refundStatus?.amount} {refundStatus?.currency}</p>
 *     <p>Expected: {refundStatus?.expectedCompletionTime}</p>
 *     {isPolling && <p>Polling for updates...</p>}
 *     {refundStatus?.status === 'failed' && (
 *       <button onClick={retry}>Retry Refund</button>
 *     )}
 *   </div>
 * );
 * ```
 */
export function useRefundStatus(
  shipmentId: string | null,
  options: UseRefundStatusOptions = {}
): UseRefundStatusResult {
  const {
    pollInterval = 10000, // 10 seconds per requirements
    maxRetries = 3,
    autoStart = true,
  } = options;

  // State management
  const [refundStatus, setRefundStatus] = useState<RefundStatusResponse | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPolling, setIsPolling] = useState(false);

  // Refs for polling and retry control
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const retryCountRef = useRef(0);
  const isMountedRef = useRef(true);

  /**
   * Extract user-friendly error message from various error types.
   */
  const getErrorMessage = useCallback((err: unknown): string => {
    if (err instanceof Error) {
      return err.message;
    }
    if (
      err &&
      typeof err === 'object' &&
      'response' in err &&
      (err.response as any)?.data?.message
    ) {
      return (err.response as any).data.message;
    }
    return 'Failed to fetch refund status. Please try again.';
  }, []);

  /**
   * Clear the polling interval if active.
   */
  const clearPolling = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
      setIsPolling(false);
    }
  }, []);

  /**
   * Fetch refund status from backend.
   * Handles loading, error, and polling state management.
   */
  const fetchRefundStatus = useCallback(async (): Promise<void> => {
    if (!shipmentId) return;

    setIsLoading(true);
    setIsError(false);
    setError(null);

    try {
      const response = await refundService.getRefundStatus(shipmentId);

      if (!isMountedRef.current) return;

      setRefundStatus(response);
      retryCountRef.current = 0; // Reset retry count on success

      // Stop polling if terminal state is reached
      if (response.status === 'completed' || response.status === 'failed') {
        clearPolling();
      }
    } catch (err: unknown) {
      if (!isMountedRef.current) return;

      const errorMessage = getErrorMessage(err);
      setIsError(true);
      setError(errorMessage);

      // Attempt retry on transient errors (network issues, timeouts)
      if (retryCountRef.current < maxRetries) {
        retryCountRef.current++;
        // Retry after a short delay
        setTimeout(() => {
          if (isMountedRef.current) {
            void fetchRefundStatus();
          }
        }, 1000);
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [shipmentId, maxRetries, getErrorMessage, clearPolling]);

  /**
   * Start polling for refund status updates.
   * Called automatically when refund is 'processing'.
   */
  const startPollingInternal = useCallback(() => {
    if (
      refundStatus &&
      refundStatus.status === 'processing' &&
      !pollIntervalRef.current
    ) {
      setIsPolling(true);
      pollIntervalRef.current = setInterval(() => {
        if (isMountedRef.current) {
          void fetchRefundStatus();
        }
      }, pollInterval);
    }
  }, [refundStatus, pollInterval, fetchRefundStatus]);

  /**
   * Refetch refund status manually.
   * Exposed to component for manual refresh button.
   */
  const refetch = useCallback(async (): Promise<void> => {
    clearPolling();
    retryCountRef.current = 0;
    await fetchRefundStatus();
  }, [fetchRefundStatus, clearPolling]);

  /**
   * Retry a failed refund operation.
   * Calls the retry endpoint and updates status.
   */
  const retry = useCallback(async (): Promise<void> => {
    if (!shipmentId || refundStatus?.status !== 'failed') return;

    setIsLoading(true);
    setIsError(false);
    setError(null);

    try {
      const response = await refundService.retryRefund(shipmentId);

      if (!isMountedRef.current) return;

      setRefundStatus(response);
      retryCountRef.current = 0;

      // Resume polling if status is now 'processing'
      if (response.status === 'processing') {
        startPollingInternal();
      }
    } catch (err: unknown) {
      if (!isMountedRef.current) return;

      const errorMessage = getErrorMessage(err);
      setIsError(true);
      setError(errorMessage);
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [shipmentId, refundStatus, getErrorMessage, startPollingInternal]);

  /**
   * Stop polling manually.
   * Exposed to component for cleanup or navigation.
   */
  const stopPolling = useCallback(() => {
    clearPolling();
  }, [clearPolling]);

  /**
   * Start polling manually.
   * Exposed to component for resuming polling after pause.
   */
  const startPolling = useCallback(() => {
    startPollingInternal();
  }, [startPollingInternal]);

  /**
   * Effect: Initial fetch on mount or when shipmentId changes.
   */
  useEffect(() => {
    if (!shipmentId) return;

    void fetchRefundStatus();
  }, [shipmentId, fetchRefundStatus]);

  /**
   * Effect: Auto-start polling when refund status is 'processing'.
   */
  useEffect(() => {
    if (autoStart && refundStatus?.status === 'processing') {
      startPollingInternal();
    }

    return () => {
      clearPolling();
    };
  }, [refundStatus, autoStart, startPollingInternal, clearPolling]);

  /**
   * Effect: Cleanup on unmount.
   * Clears intervals and prevents state updates after unmount.
   */
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      clearPolling();
    };
  }, [clearPolling]);

  return {
    refundStatus,
    isLoading,
    isError,
    error,
    status: refundStatus?.status ?? null,
    isPolling,
    refetch,
    retry,
    stopPolling,
    startPolling,
  };
}
