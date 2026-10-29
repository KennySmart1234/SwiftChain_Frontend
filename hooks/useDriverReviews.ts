'use client';

import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { driverReviewService } from '@/services/driverReviewService';
import type {
  DriverReputationScore,
  DriverReview,
  DriverReviewFilters,
  DriverReviewsPagination,
} from '@/types/driverReview';

export const REVIEWS_PAGE_SIZE = 6;

export interface UseDriverReviewsResult {
  reviews: DriverReview[];
  reputation: DriverReputationScore | null;
  pagination: DriverReviewsPagination;
  isLoading: boolean;
  error: string | null;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage: () => void;
  refetch: () => void;
}

/**
 * useDriverReviews - paginated (load more) driver reviews with server-side
 * filtering and sorting. Components consume this hook, never the service.
 */
export function useDriverReviews(
  driverId: string,
  filters: DriverReviewFilters,
): UseDriverReviewsResult {
  const query = useInfiniteQuery({
    queryKey: ['driver-reviews', driverId, filters],
    queryFn: ({ pageParam, signal }) =>
      driverReviewService.getDriverReviews(
        driverId,
        { ...filters, page: pageParam, pageSize: REVIEWS_PAGE_SIZE },
        signal,
      ),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.hasMore ? last.page + 1 : undefined),
    enabled: Boolean(driverId),
  });
  const reputationQuery = useQuery({
    queryKey: ['driver-reputation', driverId],
    queryFn: ({ signal }) =>
      driverReviewService.getDriverReputation(driverId, signal),
    enabled: Boolean(driverId),
  });
  const reviews = query.data?.pages.flatMap((page) => page.reviews) ?? [];
  const total = query.data?.pages[0]?.total ?? 0;
  const queryError = query.error ?? reputationQuery.error;

  return {
    reviews,
    reputation: reputationQuery.data ?? null,
    pagination: {
      loaded: reviews.length,
      total,
      currentPage: query.data?.pages.length ?? 0,
      pageSize: REVIEWS_PAGE_SIZE,
      hasMore: Boolean(query.hasNextPage),
    },
    isLoading: query.isLoading || reputationQuery.isLoading,
    error: queryError
      ? queryError instanceof Error && queryError.message
        ? queryError.message
        : 'Failed to load reviews'
      : null,
    hasNextPage: Boolean(query.hasNextPage),
    isFetchingNextPage: query.isFetchingNextPage,
    fetchNextPage: () => {
      void query.fetchNextPage();
    },
    refetch: () => {
      void query.refetch();
      void reputationQuery.refetch();
    },
  };
}
