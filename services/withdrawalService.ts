import { isAxiosError } from 'axios';
import api from '@/lib/api';
import type {
  StellarNetwork,
  WithdrawalApiResponse,
  WithdrawalQuote,
  WithdrawalReceipt,
  WithdrawalRequest,
} from '@/types/withdrawal';

function toError(error: unknown, fallback: string): Error {
  if (isAxiosError<{ message?: string }>(error)) {
    return new Error(error.response?.data?.message ?? fallback);
  }
  return error instanceof Error ? error : new Error(fallback);
}

function unwrap<T>(response: WithdrawalApiResponse<T>, fallback: string): T {
  if (!response.success || response.data === undefined) {
    throw new Error(response.message ?? fallback);
  }
  return response.data;
}

/**
 * withdrawalService — Stellar withdrawal quotes and submissions from the wallet API.
 * Hooks call this; components never call this directly.
 *
 * The backend is the source of truth for balance, fees, minimums and exchange
 * rates; the client only validates for immediate feedback.
 */
export const withdrawalService = {
  async getQuote(network: StellarNetwork, signal?: AbortSignal): Promise<WithdrawalQuote> {
    const fallback = 'Unable to estimate withdrawal fees. Please try again.';
    try {
      const { data } = await api.get<WithdrawalApiResponse<WithdrawalQuote>>(
        '/wallet/withdrawals/quote',
        { params: { network }, signal },
      );
      return unwrap(data, fallback);
    } catch (error) {
      throw toError(error, fallback);
    }
  },

  async submitWithdrawal(request: WithdrawalRequest): Promise<WithdrawalReceipt> {
    const fallback = 'Withdrawal failed. Please try again.';
    try {
      const { data } = await api.post<WithdrawalApiResponse<WithdrawalReceipt>>(
        '/wallet/withdrawals',
        { ...request, destination: request.destination.trim() },
      );
      return unwrap(data, fallback);
    } catch (error) {
      throw toError(error, fallback);
    }
  },
};
