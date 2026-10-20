'use client';

import { useQuery } from '@tanstack/react-query';
import { walletService } from '@/services/walletService';
import { TransactionResponse } from '@/types/transaction';

/**
 * useTxTracker — React Query-based polling hook for blockchain transaction status.
 * 
 * Automatically stops polling when the transaction reaches a terminal state
 * (SUCCESS or FAILED). Uses exponential backoff to reduce server load.
 * 
 * @param transactionHash - The blockchain transaction hash to track
 * @returns Query result with transaction status, error, and loading states
 */
export function useTxTracker(transactionHash: string | null) {
  const POLL_INTERVAL = 3000; // 3 seconds initial poll
  const MAX_POLL_INTERVAL = 30000; // 30 seconds max

  const { data, isLoading, error, isFetching, isPending } = useQuery<TransactionResponse, Error>({
    queryKey: ['transaction', transactionHash],
    queryFn: async () => {
      if (!transactionHash) {
        throw new Error('Transaction hash is required');
      }
      return walletService.getTransactionStatus(transactionHash);
    },
    enabled: !!transactionHash,
    // Polling strategy: check if terminal state reached, then stop polling
    refetchInterval: (query) => {
      if (!query.state.data) return POLL_INTERVAL;
      
      // Terminal states - stop polling
      if (query.state.data.status === 'SUCCESS' || query.state.data.status === 'FAILED') {
        return false; // Disable polling for terminal states
      }
      
      // Active polling: increase interval over time (exponential backoff)
      const pollCount = Math.floor((Date.now() - query.state.dataUpdatedAt) / POLL_INTERVAL);
      const interval = Math.min(POLL_INTERVAL * Math.pow(1.5, Math.floor(pollCount / 3)), MAX_POLL_INTERVAL);
      return interval;
    },
    // Stale time and cache duration
    staleTime: 2000, // Consider data stale after 2 seconds
    gcTime: 300000, // Keep in cache for 5 minutes
    retry: (failureCount) => failureCount < 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  const isTerminalState = data?.status === 'SUCCESS' || data?.status === 'FAILED';
  const isPolling = !isTerminalState && isFetching;

  return {
    transactionHash: data?.transactionHash || null,
    status: data?.status || null,
    message: data?.message || '',
    stellarExplorerUrl: data?.stellarExplorerUrl || '',
    isLoading: isPending,
    isPolling,
    error: error?.message || null,
    isTerminalState,
  };
}
