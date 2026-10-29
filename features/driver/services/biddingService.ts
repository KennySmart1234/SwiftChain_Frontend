import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? '';

export interface OpenContract {
  id: string;
  pickupAddress: string;
  dropoffAddress: string;
  packageDescription: string;
  estimatedDistance: number; // km
  startingPrice: number; // XLM — the contract's asking/reserve price
  region: string;
  /** ISO timestamp after which the contract can no longer receive bids. */
  expiresAt: string;
}

export interface SubmitBidParams {
  contractId: string;
  amount: number;
  driverId: string;
}

export interface SubmitBidResponse {
  bidId: string;
  contractId: string;
  amount: number;
  status: 'pending' | 'accepted' | 'rejected';
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data?: T;
}

/**
 * biddingService — responsible for all bidding-related API communication.
 * Follows the Strict Layered Architecture: Component -> Hook -> Service.
 */
export const biddingService = {
  /**
   * Fetch all open contracts currently accepting driver bids.
   */
  async getOpenContracts(region?: string): Promise<ApiResponse<OpenContract[]>> {
    const params = region ? { region } : {};
    const { data } = await axios.get<ApiResponse<OpenContract[]>>(
      `${API_BASE_URL}/api/driver/contracts/open`,
      { params },
    );
    return data;
  },

  /**
   * Submit a bid for an open contract.
   */
  async submitBid(params: SubmitBidParams): Promise<ApiResponse<SubmitBidResponse>> {
    const { data } = await axios.post<ApiResponse<SubmitBidResponse>>(
      `${API_BASE_URL}/api/driver/contracts/${params.contractId}/bids`,
      { amount: params.amount, driverId: params.driverId },
    );
    return data;
  },
};
