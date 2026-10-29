'use client';

import { useQuery } from '@tanstack/react-query';
import { reputationReviewService } from '@/services/reputationReviewService';
import type {
  ReputationReviewFilterParams,
  ReputationReviewsResponse,
} from '@/types/reputationReview';

/**
 * useReputationReviews — fetches a driver's reviews filtered by rating,
 * date range, and verified-only status. Refetches automatically when any
 * filter changes.
 */
export function useReputationReviews(
  driverId: string,
  filters: ReputationReviewFilterParams
) {
  const { data, isLoading, error, isFetching } = useQuery<
    ReputationReviewsResponse,
    Error
  >({
    queryKey: ['reputation-reviews', driverId, filters],
    queryFn: ({ signal }) =>
      reputationReviewService.getReviews(driverId, filters, signal),
    enabled: !!driverId,
    staleTime: 30000,
    gcTime: 300000,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
  });

  return {
    reviews: data?.reviews ?? [],
    averageRating: data?.averageRating ?? 0,
    totalCount: data?.totalCount ?? 0,
    isLoading,
    isFetching,
    error: error?.message ?? null,
  };
}
