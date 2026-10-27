import axios from 'axios';
import type {
  DriverReputationScore,
  DriverReviewsPage,
  DriverReviewsQuery,
} from '@/types/driverReview';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? '';

/**
 * driverReviewService - fetches a driver's paginated reviews from the backend.
 * Hooks call this; components never call it directly.
 */
export const driverReviewService = {
  async getDriverReviews(
    driverId: string,
    query: DriverReviewsQuery,
    signal?: AbortSignal,
  ): Promise<DriverReviewsPage> {
    const { data } = await axios.get<DriverReviewsPage>(
      `${API_BASE_URL}/api/fleet/drivers/${driverId}/reviews`,
      {
        params: {
          page: query.page,
          pageSize: query.pageSize,
          sort: query.sort,
          dateRange: query.dateRange,
          verifiedOnly: query.verifiedOnly,
          ...(query.minRating ? { minRating: query.minRating } : {}),
        },
        signal,
      },
    );
    return data;
  },

  async getDriverReputation(
    driverId: string,
    signal?: AbortSignal,
  ): Promise<DriverReputationScore> {
    const { data } = await axios.get<DriverReputationScore>(
      `${API_BASE_URL}/api/fleet/drivers/${driverId}/reputation`,
      { signal },
    );
    return data;
  },
};
