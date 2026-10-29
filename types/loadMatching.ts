export type CargoType = 'general' | 'refrigerated' | 'hazardous' | 'oversized' | 'fragile';

export type BidStatus = 'submitted' | 'accepted' | 'rejected' | 'expired';

export interface BulkContract {
  id: string;
  cargoType: CargoType;
  route: string;
  region: string;
  timeline: string;
  baseRate: number; // XLM
  createdAt: string;
}

export interface Bid {
  id: string;
  contractId: string;
  bidAmount: number; // XLM
  proposedTimeline: string;
  status: BidStatus;
  createdAt: string;
}

export interface SubmitBidPayload {
  contractId: string;
  bidAmount: number;
  proposedTimeline: string;
}

export interface LoadMatchingFilters {
  cargoType?: CargoType | 'all';
  region?: string;
  minRate?: number;
  maxRate?: number;
}
