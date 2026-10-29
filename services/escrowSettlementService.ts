import { isAxiosError } from 'axios';
import { apiClient } from '@/services/api';
import type { SettlementBreakdown, SettlementStatus } from '@/types/settlementBreakdown';

const TERMINAL_STATUSES: ReadonlySet<SettlementStatus> = new Set(['confirmed', 'failed']);

export class SettlementServiceError extends Error {
  readonly status: number | null;

  constructor(message: string, status: number | null) {
    super(message);
    this.name = 'SettlementServiceError';
    this.status = status;
  }
}

function toServiceError(error: unknown): SettlementServiceError {
  if (isAxiosError<{ message?: string }>(error)) {
    const status = error.response?.status ?? null;
    const message =
      error.response?.data?.message ??
      (status === 404
        ? 'Settlement not found for this escrow.'
        : 'Unable to load settlement details. Please try again.');
    return new SettlementServiceError(message, status);
  }
  if (error instanceof Error) {
    return new SettlementServiceError(error.message, null);
  }
  return new SettlementServiceError('Unable to load settlement details. Please try again.', null);
}

/**
 * escrowSettlementService — post-release settlement API communication.
 * Hooks call this; components never call this directly.
 */
export const escrowSettlementService = {
  async getSettlement(escrowId: string, signal?: AbortSignal): Promise<SettlementBreakdown> {
    try {
      const { data } = await apiClient.get<SettlementBreakdown>(
        `/escrow/${encodeURIComponent(escrowId)}/settlement`,
        { signal },
      );
      return data;
    } catch (error) {
      throw toServiceError(error);
    }
  },

  isTerminalStatus(status: SettlementStatus): boolean {
    return TERMINAL_STATUSES.has(status);
  },
};
