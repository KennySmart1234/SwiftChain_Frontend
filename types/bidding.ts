/** A logistics contract open for driver bidding. */
export interface Contract {
  id: string;
  pickupAddress: string;
  dropoffAddress: string;
  packageDescription: string;
  estimatedDistance: number; // km
  suggestedRate: number; // XLM
  region: string;
  expiresAt: string; // ISO timestamp
  createdAt: string;
}

export type BidStatus = 'pending' | 'accepted' | 'rejected' | 'expired' | 'withdrawn';

/** A driver's bid against a contract. */
export interface Bid {
  id: string;
  contractId: string;
  bidAmount: number; // XLM
  proposedTimeline: string;
  status: BidStatus;
  createdAt: string;
  updatedAt: string;
}

export interface SubmitBidPayload {
  contractId: string;
  bidAmount: number;
  proposedTimeline: string;
}

export interface SubmitBidResponse {
  bid: Bid;
  confirmationId: string;
}
