import axios from 'axios';
import type {
  ReputationReviewFilterParams,
  ReputationReviewsResponse,
} from '@/types/reputationReview';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? '';

/**
 * reputationReviewService — fetches driver/customer reviews and feedback,
 * including on-chain verification status, for the reputation reviews grid.
 *
 * Hooks call this; components never call this directly.
 */
export const reputationReviewService = {
  async getReviews(
    driverId: string,
    filters?: ReputationReviewFilterParams,
    signal?: AbortSignal
  ): Promise<ReputationReviewsResponse> {
    const params: Record<string, string> = {};
    if (filters?.rating && filters.rating !== 'all') {
      params.rating = String(filters.rating);
    }
    if (filters?.fromDate) params.fromDate = filters.fromDate;
    if (filters?.toDate) params.toDate = filters.toDate;
    if (filters?.verifiedOnly) params.verifiedOnly = 'true';

    const { data } = await axios.get<ReputationReviewsResponse>(
      `${API_BASE_URL}/fleet/drivers/${driverId}/reviews`,
      { params, signal }
    );
    return data;
  },
};
