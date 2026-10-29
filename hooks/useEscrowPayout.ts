import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { escrowService } from '@/services/escrowService';
import { escrowPayoutService } from '@/services/escrowPayoutService';
import { calculatePayoutBreakdown } from '@/lib/payoutBreakdown';
import { useToast } from '@/hooks/useToast';

/** How often the fee quote is refreshed so the net payout tracks escrow changes. */
const FEE_QUOTE_REFRESH_MS = 15_000;

/**
 * Hook to manage escrow payout state and actions by interacting with a Soroban contract.
 *
 * @param escrowId The ID (contract address) of the escrow.
 */
export const useEscrowPayout = (escrowId: string) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const queryKey = ['escrowPayout', escrowId];

  const {
    data: escrowDetails,
    isLoading,
    error,
  } = useQuery({
    queryKey,
    queryFn: () => escrowService.getEscrowDetails(escrowId),
    enabled: !!escrowId, // Only run query if escrowId is provided
    staleTime: 1000 * 30, // Data is fresh for 30 seconds
  });

  const feeQuoteKey = ['escrowPayoutFeeQuote', escrowId];
  const {
    data: feeQuote,
    isLoading: isFeeBreakdownLoading,
    error: feeBreakdownError,
  } = useQuery({
    queryKey: feeQuoteKey,
    queryFn: () => escrowPayoutService.getPayoutFeeQuote(escrowId),
    enabled: !!escrowId,
    refetchInterval: FEE_QUOTE_REFRESH_MS,
  });

  const feeBreakdown = useMemo(
    () => (feeQuote ? calculatePayoutBreakdown(feeQuote) : null),
    [feeQuote],
  );

  // mutateAsync so callers can await the promise and catch errors directly
  // (fire-and-forget mutate() returns void, swallowing mutation errors).
  const { mutateAsync: releaseFunds, isPending: isReleasing } = useMutation({
    mutationFn: () => escrowService.releaseFunds(escrowId),
    onSuccess: (data) => {
      toast({
        title: 'Funds Released Successfully',
        description: `Transaction: ${data.transactionHash.substring(0, 10)}...`,
      });
      // Refetch the escrow details to update the UI state
      queryClient.invalidateQueries({ queryKey });
      queryClient.invalidateQueries({ queryKey: feeQuoteKey });
    },
    onError: (err: Error) => {
      toast({
        title: 'Failed to Release Funds',
        description: err.message || 'An unknown error occurred.',
        variant: 'destructive',
      });
    },
  });

  const canRelease =
    escrowDetails &&
    !escrowDetails.isReleased &&
    escrowDetails.currentSignatures >= escrowDetails.requiredSignatures;

  return {
    isLoading: isLoading || isReleasing,
    error: error?.message || null,
    requiredSignatures: escrowDetails?.requiredSignatures ?? 0,
    currentSignatures: escrowDetails?.currentSignatures ?? 0,
    signers: escrowDetails?.signers ?? [],
    isReleased: escrowDetails?.isReleased ?? false,
    canRelease: canRelease ?? false,
    releaseFunds,
    feeBreakdown,
    isFeeBreakdownLoading,
    feeBreakdownError: feeBreakdownError?.message || null,
  };
};