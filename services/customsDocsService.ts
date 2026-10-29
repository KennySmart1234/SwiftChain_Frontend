import axios from 'axios';
import type {
  CustomsDocument,
  CustomsDocumentListResponse,
} from '@/types/customsDocumentation';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? '';

export interface CustomsDocumentUploadResponse {
  success: boolean;
  message: string;
  data: CustomsDocument;
}

export interface CustomsDocQuery {
  shipmentId?: string;
  signal?: AbortSignal;
}

/**
 * customsDocsService — responsible for all customs documentation API
 * communication. Knows nothing about React or rendering.
 *
 * Follows the Strict Layered Architecture: Component → Hook → Service.
 */
export const customsDocsService = {
  /**
   * List customs documents, optionally scoped to a single shipment.
   */
  async listDocuments(
    query: CustomsDocQuery = {}
  ): Promise<CustomsDocument[]> {
    const { shipmentId, signal } = query;

    const response = await axios.get<CustomsDocumentListResponse>(
      `${API_BASE_URL}/api/shipments/customs-documents`,
      {
        params: shipmentId ? { shipmentId } : undefined,
        signal,
      }
    );

    if (!response.data?.success || !response.data?.data) {
      throw new Error(response.data?.message || 'Failed to load documents');
    }

    return response.data.data;
  },

  /**
   * Upload a customs document as multipart/form-data.
   */
  async uploadDocument(
    formData: FormData,
    onUploadProgress?: (progressEvent: any) => void
  ): Promise<CustomsDocument> {
    const response = await axios.post<CustomsDocumentUploadResponse>(
      `${API_BASE_URL}/api/shipments/customs-documents`,
      formData,
      {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress,
      }
    );

    if (!response.data?.success || !response.data?.data) {
      throw new Error(response.data?.message || 'Upload failed');
    }

    return response.data.data;
  },

  /**
   * Delete a customs document.
   */
  async deleteDocument(documentId: string): Promise<void> {
    await axios.delete(
      `${API_BASE_URL}/api/shipments/customs-documents/${documentId}`
    );
  },
};
