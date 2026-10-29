import { apiClient } from './api';
import {
  Contract,
  Bid,
  SubmitBidPayload,
  SubmitBidResponse,
} from '../types/bidding';

/**
 * biddingService — all driver rate-negotiation and bid-submission API calls.
 * Follows the Strict Layered Architecture: Component -> Hook -> Service.
 */
export const biddingService = {
  /** Fetch every contract currently open for bidding. */
  getContracts: async (): Promise<Contract[]> => {
    const { data } = await apiClient.get<Contract[]>('/driver/bidding/contracts');
    return data;
  },

  /** Submit a bid against a contract with a proposed rate and timeline. */
  submitBid: async (payload: SubmitBidPayload): Promise<SubmitBidResponse> => {
    const { data } = await apiClient.post<SubmitBidResponse>(
      '/driver/bidding/bids',
      payload
    );
    return data;
  },

  /** Fetch the authenticated driver's bid history (all statuses). */
  getBidHistory: async (): Promise<Bid[]> => {
    const { data } = await apiClient.get<Bid[]>('/driver/bidding/history');
    return data;
  },
};
