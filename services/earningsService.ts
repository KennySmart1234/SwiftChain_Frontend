import { isAxiosError } from 'axios';
import api from '@/lib/api';
import type {
  EarningsApiResponse,
  EarningsSummary,
  PayoutHistoryPage,
  PayoutHistoryParams,
} from '@/types/earnings';

export const DEFAULT_PAYOUT_PAGE_SIZE = 10;

export class EarningsServiceError extends Error {
  readonly status: number | null;

  constructor(message: string, status: number | null) {
    super(message);
    this.name = 'EarningsServiceError';
    this.status = status;
  }
}

function toServiceError(error: unknown, fallback: string): EarningsServiceError {
  if (error instanceof EarningsServiceError) return error;
  if (isAxiosError<{ message?: string }>(error)) {
    return new EarningsServiceError(
      error.response?.data?.message ?? fallback,
      error.response?.status ?? null,
    );
  }
  return new EarningsServiceError(error instanceof Error ? error.message : fallback, null);
}

function unwrap<T>(response: EarningsApiResponse<T>, fallback: string): T {
  if (!response.success || response.data === undefined) {
    throw new EarningsServiceError(response.message ?? fallback, null);
  }
  return response.data;
}

/**
 * earningsService — driver earnings and payout history from the wallet API.
 * Hooks call this; components never call this directly.
 */
export const earningsService = {
  async getEarningsSummary(signal?: AbortSignal): Promise<EarningsSummary> {
    const fallback = 'Unable to load earnings. Please try again.';
    try {
      const { data } = await api.get<EarningsApiResponse<EarningsSummary>>('/wallet/earnings', {
        signal,
      });
      return unwrap(data, fallback);
    } catch (error) {
      throw toServiceError(error, fallback);
    }
  },

  async getPayoutHistory(
    { cursor, limit = DEFAULT_PAYOUT_PAGE_SIZE }: PayoutHistoryParams = {},
    signal?: AbortSignal,
  ): Promise<PayoutHistoryPage> {
    const fallback = 'Unable to load payout history. Please try again.';
    try {
      const { data } = await api.get<EarningsApiResponse<PayoutHistoryPage>>(
        '/wallet/earnings/payouts',
        { params: cursor ? { cursor, limit } : { limit }, signal },
      );
      const page = unwrap(data, fallback);
      return { items: page.items ?? [], nextCursor: page.nextCursor ?? null };
    } catch (error) {
      throw toServiceError(error, fallback);
    }
  },
};
