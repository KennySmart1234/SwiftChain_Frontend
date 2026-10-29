'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { biddingService } from '@/services/biddingService';
import { Contract, Bid, SubmitBidPayload, SubmitBidResponse } from '@/types/bidding';
import { useToast } from '@/hooks/useToast';

const BID_STATUS_POLL_INTERVAL = 10000; // 10 seconds

/**
 * useBidding — the single hook for the driver bidding board.
 *
 * Fetches available contracts, submits bids, and polls bid history so
 * status changes (accepted/rejected by the shipper) surface without a
 * manual refresh. Polling pauses automatically once every bid in the
 * history has reached a terminal state.
 */
export function useBidding() {
  const queryClient = useQueryClient();
  const { success, error: toastError } = useToast();

  const {
    data: contracts = [],
    isLoading: isLoadingContracts,
    error: contractsError,
    refetch: refetchContracts,
  } = useQuery<Contract[], Error>({
    queryKey: ['bidding', 'contracts'],
    queryFn: () => biddingService.getContracts(),
    staleTime: 30000,
    gcTime: 300000,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
  });

  const {
    data: bids = [],
    isLoading: isLoadingBids,
    error: bidsError,
    isFetching: isPollingBids,
  } = useQuery<Bid[], Error>({
    queryKey: ['bidding', 'history'],
    queryFn: () => biddingService.getBidHistory(),
    staleTime: 5000,
    gcTime: 300000,
    retry: 2,
    // Stop polling once every fetched bid has reached a terminal state.
    refetchInterval: (query) => {
      const data = query.state.data;
      if (!data || data.length === 0) return BID_STATUS_POLL_INTERVAL;
      const hasPending = data.some((bid) => bid.status === 'pending');
      return hasPending ? BID_STATUS_POLL_INTERVAL : false;
    },
  });

  const submitBidMutation = useMutation<SubmitBidResponse, Error, SubmitBidPayload>({
    mutationFn: (payload) => biddingService.submitBid(payload),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['bidding', 'history'] });
      success(
        'Bid submitted',
        `Confirmation ${response.confirmationId} — we'll notify you when the shipper responds.`
      );
    },
    onError: (err) => {
      toastError(
        'Unable to submit bid',
        err instanceof Error ? err.message : 'Please try again later'
      );
    },
  });

  const submitBid = async (
    contractId: string,
    bidAmount: number,
    proposedTimeline: string
  ): Promise<SubmitBidResponse> => {
    return submitBidMutation.mutateAsync({ contractId, bidAmount, proposedTimeline });
  };

  return {
    contracts,
    bids,
    isLoadingContracts,
    isLoadingBids,
    isPollingBids,
    isSubmittingBid: submitBidMutation.isPending,
    contractsError: contractsError?.message ?? null,
    bidsError: bidsError?.message ?? null,
    submitBid,
    refetchContracts,
  };
}
