export type ReviewSort = 'date_desc' | 'date_asc' | 'rating_desc' | 'rating_asc';
export type ReviewDateRange = 'all' | '7d' | '30d' | '90d';

export interface DriverReview {
  id: string;
  driverId: string;
  reviewerName: string;
  rating: number;
  comment: string;
  createdAt: string;
  verified: boolean;
}

export interface DriverReviewFilters {
  minRating: number | null;
  dateRange: ReviewDateRange;
  verifiedOnly: boolean;
  sort: ReviewSort;
}

export interface DriverReviewsQuery extends DriverReviewFilters {
  page: number;
  pageSize: number;
}

export interface DriverReviewsPage {
  reviews: DriverReview[];
  page: number;
  hasMore: boolean;
  total: number;
}

export interface DriverReputationScore {
  driverId: string;
  score: number;
  totalReviews: number;
  verifiedReviews: number;
  updatedAt: string;
  source: 'on_chain';
}

export interface DriverReviewsPagination {
  loaded: number;
  total: number;
  currentPage: number;
  pageSize: number;
  hasMore: boolean;
}
