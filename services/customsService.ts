import axios, { type AxiosProgressEvent } from 'axios';
import type {
  CustomsDocument,
  CustomsDocType,
  CustomsDocStatus,
  DocumentUploadResponse,
  DocumentListResponse,
  UpdateResponse,
  ExpiringDocumentList,
} from '@/types/customsDocumentation';

export type {
  CustomsDocument,
  CustomsDocType,
  CustomsDocStatus,
  DocumentUploadResponse,
  DocumentListResponse,
  UpdateResponse,
  ExpiringDocumentList,
};

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? '';

/**
 * Standard APIError class for normalized API error handling.
 */
export class APIError extends Error {
  readonly status?: number;
  readonly statusCode?: number;
  readonly code?: string;

  constructor(message: string, status?: number, code?: string) {
    super(message);
    this.name = 'APIError';
    this.status = status;
    this.statusCode = status;
    this.code = code;

    Object.setPrototypeOf(this, APIError.prototype);
  }
}

interface ApiErrorPayload {
  message?: unknown;
  error?: unknown;
  code?: unknown;
}

function isAxiosLikeError(error: any): boolean {
  if (typeof axios.isAxiosError === 'function' && axios.isAxiosError(error)) {
    return true;
  }
  return Boolean(
    error &&
      typeof error === 'object' &&
      (error.isAxiosError === true || ('response' in error && error.response))
  );
}

/**
 * Normalizes any unknown thrown error into a standard APIError.
 */
export function normalizeAPIError(
  error: unknown,
  fallbackMessage = 'An unexpected error occurred'
): APIError {
  if (error instanceof APIError) {
    return error;
  }

  if (isAxiosLikeError(error)) {
    const axiosErr = error as any;
    const responseData = axiosErr.response?.data;
    const message =
      (typeof responseData?.message === 'string' && responseData.message) ||
      (typeof responseData?.error === 'string' && responseData.error) ||
      axiosErr.message ||
      fallbackMessage;

    const code =
      (typeof responseData?.code === 'string' && responseData.code) ||
      axiosErr.code;

    return new APIError(message, axiosErr.response?.status, code);
  }

  if (error instanceof Error) {
    return new APIError(error.message, 0);
  }

  return new APIError(fallbackMessage, 0);
}

export interface UploadDocumentParams {
  file?: File | Blob;
  document?: File | Blob;
  shipmentId: string;
  documentType?: CustomsDocType | string;
  type?: CustomsDocType | string;
  issuedAt?: string;
  expiresAt?: string | null;
  onUploadProgress?: (progressEvent: AxiosProgressEvent) => void;
  signal?: AbortSignal;
}

/**
 * customsService — responsible for cross-border customs documentation API calls.
 *
 * Strict Layered Architecture: Component -> Hook -> Service
 * Data Source: All data is retrieved from the backend API (no inline mock objects).
 */
export const customsService = {
  /**
   * Upload a customs document with optional file upload progress tracking.
   *
   * @param params UploadDocumentParams or FormData
   * @param onProgress Optional progress callback if FormData is passed directly
   * @returns Typed DocumentUploadResponse
   */
  async uploadDocument(
    params: UploadDocumentParams | FormData,
    onProgress?: (progressEvent: AxiosProgressEvent) => void
  ): Promise<DocumentUploadResponse> {
    try {
      let formData: FormData;
      let progressCallback = onProgress;
      let abortSignal: AbortSignal | undefined;

      if (typeof FormData !== 'undefined' && params instanceof FormData) {
        formData = params;
      } else {
        const uploadParams = params as UploadDocumentParams;
        const file = uploadParams.file || uploadParams.document;

        if (!file) {
          throw new APIError('No document file provided for upload', 400);
        }

        if (!uploadParams.shipmentId) {
          throw new APIError('Shipment ID is required for document upload', 400);
        }

        formData = new FormData();
        formData.append('document', file);
        formData.append('shipmentId', uploadParams.shipmentId);

        const docType = uploadParams.documentType || uploadParams.type;
        if (docType) {
          formData.append('documentType', docType);
        }

        if (uploadParams.issuedAt) {
          formData.append('issuedAt', uploadParams.issuedAt);
        }

        if (uploadParams.expiresAt) {
          formData.append('expiresAt', uploadParams.expiresAt);
        }

        if (uploadParams.onUploadProgress) {
          progressCallback = uploadParams.onUploadProgress;
        }

        abortSignal = uploadParams.signal;
      }

      const response = await axios.post<DocumentUploadResponse>(
        `${API_BASE_URL}/api/shipments/customs-documents`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
          onUploadProgress: progressCallback,
          signal: abortSignal,
        }
      );

      if (!response.data || !response.data.success) {
        throw new APIError(
          response.data?.message || 'Failed to upload document',
          response.status
        );
      }

      return response.data;
    } catch (error) {
      throw normalizeAPIError(error, 'Failed to upload document');
    }
  },

  /**
   * Retrieve customs documents for a specific shipment.
   *
   * @param shipmentId The ID of the international shipment
   * @param signal Optional AbortSignal
   * @returns Typed DocumentListResponse
   */
  async getDocuments(
    shipmentId: string,
    signal?: AbortSignal
  ): Promise<DocumentListResponse> {
    if (!shipmentId || typeof shipmentId !== 'string') {
      throw new APIError('Valid shipment ID is required', 400);
    }

    try {
      const response = await axios.get<DocumentListResponse>(
        `${API_BASE_URL}/api/shipments/customs-documents`,
        {
          params: { shipmentId },
          signal,
        }
      );

      if (!response.data || !response.data.success) {
        throw new APIError(
          response.data?.message || 'Failed to retrieve documents',
          response.status
        );
      }

      return response.data;
    } catch (error) {
      throw normalizeAPIError(error, 'Failed to retrieve documents');
    }
  },

  /**
   * Update the verification status of a customs document.
   *
   * @param docId The ID of the document to update
   * @param status The new status ('verified' | 'pending' | 'rejected' | 'expired')
   * @param signal Optional AbortSignal
   * @returns Typed UpdateResponse
   */
  async updateDocumentStatus(
    docId: string,
    status: CustomsDocStatus | string,
    signal?: AbortSignal
  ): Promise<UpdateResponse> {
    if (!docId || typeof docId !== 'string') {
      throw new APIError('Valid document ID is required', 400);
    }

    if (!status || typeof status !== 'string') {
      throw new APIError('Valid document status is required', 400);
    }

    try {
      const response = await axios.patch<UpdateResponse>(
        `${API_BASE_URL}/api/shipments/customs-documents/${docId}/status`,
        { status },
        { signal }
      );

      if (!response.data || !response.data.success) {
        throw new APIError(
          response.data?.message || 'Failed to update document status',
          response.status
        );
      }

      return response.data;
    } catch (error) {
      throw normalizeAPIError(error, 'Failed to update document status');
    }
  },

  /**
   * Retrieve documents expiring within a given threshold of days.
   *
   * @param thresholdDays Days before expiration (default 30)
   * @param signal Optional AbortSignal
   * @returns Typed ExpiringDocumentList
   */
  async getExpiringDocuments(
    thresholdDays: number = 30,
    signal?: AbortSignal
  ): Promise<ExpiringDocumentList> {
    try {
      const response = await axios.get<ExpiringDocumentList>(
        `${API_BASE_URL}/api/shipments/customs-documents/expiring`,
        {
          params: { thresholdDays },
          signal,
        }
      );

      if (!response.data || !response.data.success) {
        throw new APIError(
          response.data?.message || 'Failed to retrieve expiring documents',
          response.status
        );
      }

      return response.data;
    } catch (error) {
      throw normalizeAPIError(error, 'Failed to retrieve expiring documents');
    }
  },
};

export default customsService;
