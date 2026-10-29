import { isAxiosError } from 'axios';
import { apiClient } from '@/services/api';
import type {
  HighValueCargoApproval,
  SubmitHighValueApprovalRequest,
  SubmitHighValueApprovalResponse,
} from '@/types/highValueCargo';

export class HighValueCargoServiceError extends Error {
  readonly status: number | null;

  constructor(message: string, status: number | null) {
    super(message);
    this.name = 'HighValueCargoServiceError';
    this.status = status;
  }
}

function toServiceError(error: unknown, fallback: string): HighValueCargoServiceError {
  if (isAxiosError<{ message?: string }>(error)) {
    return new HighValueCargoServiceError(
      error.response?.data?.message ?? fallback,
      error.response?.status ?? null,
    );
  }
  if (error instanceof Error) {
    return new HighValueCargoServiceError(error.message, null);
  }
  return new HighValueCargoServiceError(fallback, null);
}

const approvalPath = (shipmentId: string) =>
  `/escrow/${encodeURIComponent(shipmentId)}/multisig-approval`;

/**
 * highValueCargoService — multi-signature approval API for high-value shipments.
 * Hooks call this; components never call this directly.
 */
export const highValueCargoService = {
  async getApproval(shipmentId: string, signal?: AbortSignal): Promise<HighValueCargoApproval> {
    try {
      const { data } = await apiClient.get<HighValueCargoApproval>(approvalPath(shipmentId), {
        signal,
      });
      return data;
    } catch (error) {
      throw toServiceError(error, 'Unable to load approval details. Please try again.');
    }
  },

  async submitApproval(
    shipmentId: string,
    request: SubmitHighValueApprovalRequest,
  ): Promise<SubmitHighValueApprovalResponse> {
    try {
      const { data } = await apiClient.post<SubmitHighValueApprovalResponse>(
        `${approvalPath(shipmentId)}/submit`,
        request,
      );
      return data;
    } catch (error) {
      throw toServiceError(error, 'Unable to submit approval. Please try again.');
    }
  },
};
