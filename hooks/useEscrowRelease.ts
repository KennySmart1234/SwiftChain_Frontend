import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { escrowService } from '@/services/escrowService';
import type { EscrowDetails } from '@/types/escrow';

export type ReleaseStep = 'idle' | 'confirming' | 'signing' | 'releasing' | 'done';

interface UseEscrowReleaseReturn {
  escrowDetails: EscrowDetails | null;
  step: ReleaseStep;
  isLoading: boolean;
  transactionHash: string | null;
  fetchEscrowDetails: (escrowId: string) => Promise<void>;
  openConfirmDialog: (escrowId: string, deliveryId: string, walletAddress: string) => void;
  confirmAndRelease: (escrowId: string, deliveryId: string, walletAddress: string) => Promise<void>;
  reset: () => void;
}

/**
 * useEscrowRelease — manages the full escrow release flow.
 *
 * Step flow:
 *   idle → confirming (modal shown) → signing (wallet prompt) →
 *   releasing (API in-flight) → done (tx confirmed)
 *
 * On any failure the step resets to idle and an error toast fires.
 */
export function useEscrowRelease(): UseEscrowReleaseReturn {
  const [escrowDetails, setEscrowDetails] = useState<EscrowDetails | null>(null);
  const [step, setStep] = useState<ReleaseStep>('idle');
  const [isLoading, setIsLoading] = useState(false);
  const [transactionHash, setTransactionHash] = useState<string | null>(null);

  const fetchEscrowDetails = useCallback(async (escrowId: string) => {
    setIsLoading(true);
    try {
      const details = await escrowService.getEscrowDetails(escrowId);
      setEscrowDetails(details);
    } catch {
      toast.error('Unable to fetch escrow details. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const openConfirmDialog = useCallback(
    (_escrowId: string, _deliveryId: string, walletAddress: string) => {
      if (!walletAddress) {
        toast.error('No wallet connected. Please connect your wallet first.');
        return;
      }
      setStep('confirming');
    },
    []
  );

  const confirmAndRelease = useCallback(
    async (escrowId: string, deliveryId: string, walletAddress: string) => {
      try {
        setStep('signing');
        toast.info('Please approve the transaction in your wallet…');

        setStep('releasing');
        const result = await escrowService.releaseEscrow({
          escrowId,
          deliveryId,
          walletAddress,
        });

        if (!result.success) {
          throw new Error(result.message ?? 'Release failed.');
        }

        setTransactionHash(result.transactionHash ?? null);
        setStep('done');
        toast.success(
          result.transactionHash
            ? `Payment released! Tx: ${result.transactionHash.slice(0, 12)}…`
            : 'Payment released successfully!'
        );
        setEscrowDetails((prev) =>
          prev ? { ...prev, isReleased: true } : prev
        );
      } catch (err: unknown) {
        setStep('idle');
        const message =
          err instanceof Error
            ? err.message
            : 'Transaction failed or was rejected. Please try again.';
        toast.error(message);
      }
    },
    []
  );

  const reset = useCallback(() => {
    setStep('idle');
    setTransactionHash(null);
  }, []);

  return {
    escrowDetails,
    step,
    isLoading,
    transactionHash,
    fetchEscrowDetails,
    openConfirmDialog,
    confirmAndRelease,
    reset,
  };
}