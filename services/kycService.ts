import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? '';

export interface KycDocument {
  id: string;
  filename: string;
  fileType: string;
  fileSize: number;
  uploadedAt: string;
  status: 'pending' | 'verified' | 'rejected';
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data?: T;
}

/**
 * kycService — responsible for all KYC (Know Your Customer) related API communication.
 * Follows the Strict Layered Architecture: Component -> Hook -> Service.
 */
export const kycService = {
  /**
   * Upload KYC document
   * @param formData - FormData containing the document file
   * @param onUploadProgress - Progress callback function
   * @returns Promise with upload response containing document metadata
   */
  async uploadDocument(
    formData: FormData,
    onUploadProgress?: (progressEvent: any) => void
  ): Promise<ApiResponse<KycDocument>> {
    try {
      const { data } = await axios.post<ApiResponse<KycDocument>>(
        `${API_BASE_URL}/api/kyc/upload`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
          onUploadProgress,
        }
      );
      return data;
    } catch (error: any) {
      throw error;
    }
  },

  /**
   * Get KYC document status
   * @param documentId - Document ID to check status
   * @returns Promise with document status
   */
  async getDocumentStatus(documentId: string): Promise<ApiResponse<KycDocument>> {
    try {
      const { data } = await axios.get<ApiResponse<KycDocument>>(
        `${API_BASE_URL}/api/kyc/documents/${documentId}`
      );
      return data;
    } catch (error: any) {
      throw error;
    }
  },

  /**
   * Get all KYC documents for current user
   * @returns Promise with list of documents
   */
  async getDocuments(): Promise<ApiResponse<KycDocument[]>> {
    try {
      const { data } = await axios.get<ApiResponse<KycDocument[]>>(
        `${API_BASE_URL}/api/kyc/documents`
      );
      return data;
    } catch (error: any) {
      throw error;
    }
  },

  /**
   * Delete KYC document
   * @param documentId - Document ID to delete
   * @returns Promise with deletion response
   */
  async deleteDocument(documentId: string): Promise<ApiResponse<null>> {
    try {
      const { data } = await axios.delete<ApiResponse<null>>(
        `${API_BASE_URL}/api/kyc/documents/${documentId}`
      );
      return data;
    } catch (error: any) {
      throw error;
    }
  },

  /**
   * Re-submit KYC document after rejection
   * @param documentId - Document ID to resubmit
   * @param formData - FormData containing new document
   * @param onUploadProgress - Progress callback function
   * @returns Promise with upload response
   */
  async resubmitDocument(
    documentId: string,
    formData: FormData,
    onUploadProgress?: (progressEvent: any) => void
  ): Promise<ApiResponse<KycDocument>> {
    try {
      const { data } = await axios.post<ApiResponse<KycDocument>>(
        `${API_BASE_URL}/api/kyc/documents/${documentId}/resubmit`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
          onUploadProgress,
        }
      );
      return data;
    } catch (error: any) {
      throw error;
    }
  },

  /**
   * Submit the uploaded onboarding documents for admin approval
   * @param documentIds - IDs of the uploaded onboarding documents
   * @returns Promise with submission response
   */
  async submitForApproval(documentIds: string[]): Promise<ApiResponse<null>> {
    const { data } = await axios.post<ApiResponse<null>>(`${API_BASE_URL}/api/kyc/submit`, {
      documentIds,
    });
    return data;
  },
};
