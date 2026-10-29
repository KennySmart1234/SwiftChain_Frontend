import { isAxiosError } from 'axios';
import api from '@/lib/api';
import type {
  CargoApproval,
  CargoApprovalApiResponse,
  SubmitCargoSignatureRequest,
} from '@/types/cargoApproval';

/** Backend conflict states the approval flow reacts to. */
export type CargoApprovalErrorCode = 'already_signed' | 'expired' | 'unauthorized_signer' | 'unknown';

const STATUS_CODES: Record<number, CargoApprovalErrorCode> = {
  403: 'unauthorized_signer',
  409: 'already_signed',
  410: 'expired',
};

export class CargoApprovalServiceError extends Error {
  readonly status: number | null;
  readonly code: CargoApprovalErrorCode;

  constructor(message: string, status: number | null) {
    super(message);
    this.name = 'CargoApprovalServiceError';
    this.status = status;
    this.code = (status !== null && STATUS_CODES[status]) || 'unknown';
  }
}

function toServiceError(error: unknown, fallback: string): CargoApprovalServiceError {
  if (error instanceof CargoApprovalServiceError) return error;
  if (isAxiosError<{ message?: string }>(error)) {
    return new CargoApprovalServiceError(
      error.response?.data?.message ?? fallback,
      error.response?.status ?? null,
    );
  }
  return new CargoApprovalServiceError(error instanceof Error ? error.message : fallback, null);
}

function unwrap<T>(response: CargoApprovalApiResponse<T>, fallback: string): T {
  if (!response.success || response.data === undefined) {
    throw new CargoApprovalServiceError(response.message ?? fallback, null);
  }
  return response.data;
}

const approvalsPath = (escrowId: string) => `/escrow/${encodeURIComponent(escrowId)}/approvals`;

/**
 * cargoApprovalService — multi-signature approvals for high-value cargo escrows.
 * Hooks call this; components never call this directly.
 */
export const cargoApprovalService = {
  /** Loads the signer set, weights, threshold and approval window. */
  async getApproval(escrowId: string, signal?: AbortSignal): Promise<CargoApproval> {
    const fallback = 'Unable to load approval details. Please try again.';
    try {
      const { data } = await api.get<CargoApprovalApiResponse<CargoApproval>>(
        approvalsPath(escrowId),
        { signal },
      );
      return unwrap(data, fallback);
    } catch (error) {
      throw toServiceError(error, fallback);
    }
  },

  /** Submits a signed envelope and returns the updated approval state. */
  async submitSignature(
    escrowId: string,
    request: SubmitCargoSignatureRequest,
  ): Promise<CargoApproval> {
    const fallback = 'Unable to submit your signature. Please try again.';
    try {
      const { data } = await api.post<CargoApprovalApiResponse<CargoApproval>>(
        `${approvalsPath(escrowId)}/signatures`,
        request,
      );
      return unwrap(data, fallback);
    } catch (error) {
      throw toServiceError(error, fallback);
    }
  },
};
