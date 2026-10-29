'use client';

import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { loadMatchingService } from '@/services/loadMatchingService';
import type { LoadMatchingFilters, SubmitBidPayload } from '@/types/loadMatching';
import { useToast } from '@/hooks/useToast';

export function useLoadMatching() {
  const queryClient = useQueryClient();
  const { success, error: toastError } = useToast();
  const [filters, setFilters] = useState<LoadMatchingFilters>({ cargoType: 'all' });

  const {
    data: contracts = [],
    isLoading: isLoadingContracts,
    error: contractsError,
  } = useQuery({
    queryKey: ['load-matching', 'contracts', filters],
    queryFn: ({ signal }) => loadMatchingService.getContracts(filters, signal),
    staleTime: 30000,
    placeholderData: keepPreviousData,
  });

  const { data: bids = [], isLoading: isLoadingBids } = useQuery({
    queryKey: ['load-matching', 'bids'],
    queryFn: ({ signal }) => loadMatchingService.getBids(signal),
    staleTime: 15000,
  });

  const bidsByContractId = useMemo(() => {
    const map = new Map<string, (typeof bids)[number]>();
    for (const bid of bids) {
      map.set(bid.contractId, bid);
    }
    return map;
  }, [bids]);

  const submitBidMutation = useMutation({
    mutationFn: (payload: SubmitBidPayload) => loadMatchingService.submitBid(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['load-matching', 'bids'] });
      success('Bid submitted', "We'll notify you when the shipper responds.");
    },
    onError: (err) => {
      toastError('Unable to submit bid', err instanceof Error ? err.message : 'Please try again later');
    },
  });

  return {
    contracts,
    bidsByContractId,
    isLoadingContracts,
    isLoadingBids,
    contractsError: contractsError instanceof Error ? contractsError.message : null,
    filters,
    setFilters,
    submitBid: (payload: SubmitBidPayload) => submitBidMutation.mutateAsync(payload),
    isSubmittingBid: submitBidMutation.isPending,
  };
}
