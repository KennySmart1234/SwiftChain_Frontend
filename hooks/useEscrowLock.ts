'use client';

import { useState, useCallback } from 'react';
import { escrowService, LockEscrowParams } from '@/services/escrowService';

interface UseEscrowLockState {
  isLoading: boolean;
  isSuccess: boolean;
  error: string | null;
  escrowId: string | null;
  transactionHash: string | null;
}

/**
 * Hook for managing escrow lock state and API communication
 * Follows Component → Hook → Service pattern
 */
export function useEscrowLock() {
  const [state, setState] = useState<UseEscrowLockState>({
    isLoading: false,
    isSuccess: false,
    error: null,
    escrowId: null,
    transactionHash: null,
  });

  const lockEscrow = useCallback(async (params: LockEscrowParams) => {
    setState({ isLoading: true, isSuccess: false, error: null, escrowId: null, transactionHash: null });

    try {
      const response = await escrowService.lockEscrow(params);
      setState({
        isLoading: false,
        isSuccess: true,
        error: null,
        escrowId: response.escrowId,
        transactionHash: response.transactionHash,
      });
      return response;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to lock escrow';
      setState({
        isLoading: false,
        isSuccess: false,
        error: errorMessage,
        escrowId: null,
        transactionHash: null,
      });
      throw err;
    }
  }, []);

  const reset = useCallback(() => {
    setState({ isLoading: false, isSuccess: false, error: null, escrowId: null, transactionHash: null });
  }, []);

  return {
    ...state,
    lockEscrow,
    reset,
  };
}
