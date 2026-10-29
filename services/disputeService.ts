import axios from 'axios';
import type {
  FileDisputeParams,
  DisputeCaseResponse,
  EvidenceUploadResponse,
  FreezeResponse,
  DisputeStatusResponse,
  ResolutionResponse,
} from '@/types/dispute';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? '';

/** Normalized error shape every disputeService method rejects with. */
export interface APIError {
  message: string;
  statusCode: number | null;
  code: string | null;
}

function toAPIError(error: unknown, fallbackMessage: string): APIError {
  if (axios.isAxiosError(error)) {
    return {
      message: error.response?.data?.message || error.message || fallbackMessage,
      statusCode: error.response?.status ?? null,
      code: error.code ?? null,
    };
  }
  return {
    message: error instanceof Error ? error.message : fallbackMessage,
    statusCode: null,
    code: null,
  };
}

/**
 * disputeService — API calls for filing disputes, uploading evidence,
 * freezing escrow payouts, and tracking case status/resolution.
 *
 * Hooks call this; components never call this directly. Every method
 * rejects with a normalized APIError rather than a raw axios error.
 */
export const disputeService = {
  async fileDispute(params: FileDisputeParams): Promise<DisputeCaseResponse> {
    try {
      const { data } = await axios.post<DisputeCaseResponse>(
        `${API_BASE_URL}/api/escrow/disputes`,
        params
      );
      return data;
    } catch (error) {
      throw toAPIError(error, 'Failed to file dispute');
    }
  },

  async uploadEvidence(
    caseId: string,
    files: File[],
    onUploadProgress?: (percent: number) => void
  ): Promise<EvidenceUploadResponse[]> {
    const formData = new FormData();
    for (const file of files) {
      formData.append('files', file);
    }

    try {
      const { data } = await axios.post<EvidenceUploadResponse[]>(
        `${API_BASE_URL}/api/escrow/disputes/${caseId}/evidence`,
        formData,
        {
          headers: { 'Content-Type': 'multipart/form-data' },
          onUploadProgress: (progressEvent) => {
            if (!onUploadProgress || !progressEvent.total) return;
            onUploadProgress(Math.round((progressEvent.loaded / progressEvent.total) * 100));
          },
        }
      );
      return data;
    } catch (error) {
      throw toAPIError(error, 'Failed to upload evidence');
    }
  },

  async freezeEscrow(deliveryId: string): Promise<FreezeResponse> {
    try {
      const { data } = await axios.post<FreezeResponse>(
        `${API_BASE_URL}/api/escrow/deliveries/${deliveryId}/freeze`
      );
      return data;
    } catch (error) {
      throw toAPIError(error, 'Failed to freeze escrow');
    }
  },

  async getDisputeStatus(caseId: string): Promise<DisputeStatusResponse> {
    try {
      const { data } = await axios.get<DisputeStatusResponse>(
        `${API_BASE_URL}/api/escrow/disputes/${caseId}`
      );
      return data;
    } catch (error) {
      throw toAPIError(error, 'Failed to fetch dispute status');
    }
  },

  async resolveDispute(caseId: string): Promise<ResolutionResponse> {
    try {
      const { data } = await axios.post<ResolutionResponse>(
        `${API_BASE_URL}/api/escrow/disputes/${caseId}/resolve`
      );
      return data;
    } catch (error) {
      throw toAPIError(error, 'Failed to resolve dispute');
    }
  },
};
