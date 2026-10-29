import { apiClient } from './api';
import type { BulkContract, Bid, SubmitBidPayload, LoadMatchingFilters } from '@/types/loadMatching';

export const loadMatchingService = {
  getContracts: async (filters?: LoadMatchingFilters, signal?: AbortSignal): Promise<BulkContract[]> => {
    const params: Record<string, string> = {};
    if (filters?.cargoType && filters.cargoType !== 'all') params.cargoType = filters.cargoType;
    if (filters?.region) params.region = filters.region;
    if (filters?.minRate !== undefined) params.minRate = String(filters.minRate);
    if (filters?.maxRate !== undefined) params.maxRate = String(filters.maxRate);

    const { data } = await apiClient.get<BulkContract[]>('/driver/load-matching/contracts', {
      params,
      signal,
    });
    return data;
  },

  submitBid: async (payload: SubmitBidPayload): Promise<Bid> => {
    const { data } = await apiClient.post<Bid>('/driver/load-matching/bids', payload);
    return data;
  },

  getBids: async (signal?: AbortSignal): Promise<Bid[]> => {
    const { data } = await apiClient.get<Bid[]>('/driver/load-matching/bids', { signal });
    return data;
  },
};
