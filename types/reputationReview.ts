export interface ReputationReview {
  id: string;
  reviewerName: string;
  reviewerAvatarUrl: string | null;
  rating: number; // 1-5
  feedback: string;
  createdAt: string; // ISO timestamp
  /** True when this review's rating/feedback is anchored on-chain (Stellar). */
  isOnChainVerified: boolean;
  onChainTransactionHash: string | null;
}

export type RatingFilter = 'all' | 5 | 4 | 3;

export interface ReputationReviewFilterParams {
  rating?: RatingFilter;
  fromDate?: string;
  toDate?: string;
  verifiedOnly?: boolean;
}

export interface ReputationReviewsResponse {
  reviews: ReputationReview[];
  averageRating: number;
  totalCount: number;
}
