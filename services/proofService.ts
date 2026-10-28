import axios from 'axios';
import imageCompression from 'browser-image-compression';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? '';

export interface ProofDocument {
  id: string;
  deliveryId: string;
  filename: string;
  fileSize: number;
  originalSize: number;
  isCompressed: boolean;
  uploadedAt: string;
  status: 'pending' | 'verified' | 'rejected';
}

export interface DeliveryProofBundle {
  photo: ProofDocument;
  signatureDataUrl: string;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data?: T;
}

export interface CompressionOptions {
  maxSizeMB?: number;
  maxWidthOrHeight?: number;
  useWebWorker?: boolean;
  onProgress?: (_progress: number) => void;
}

/**
 * proofService — responsible for all Proof of Delivery related API communication.
 * Includes image compression for files > 5MB.
 * Follows the Strict Layered Architecture: Component -> Hook -> Service.
 */
export const proofService = {
  /**
   * Compress image if it exceeds 5MB
   * @param file - Original image file
   * @param options - Compression options
   * @returns Promise with compressed file or original if under limit
   */
  async compressImage(
    file: File,
    options: CompressionOptions = {}
  ): Promise<{ file: File; isCompressed: boolean; originalSize: number }> {
    const {
      maxSizeMB = 5,
      maxWidthOrHeight = 1920,
      useWebWorker = true,
      onProgress,
    } = options;

    const originalSize = file.size;
    const fileSizeInMB = originalSize / (1024 * 1024);

    // If file is already under the limit, return as-is
    if (fileSizeInMB <= maxSizeMB) {
      return {
        file,
        isCompressed: false,
        originalSize,
      };
    }

    try {
      onProgress?.(10); // Compression starting

      // Use browser-image-compression to compress the image
      const compressedFile = await imageCompression(file, {
        maxSizeMB,
        maxWidthOrHeight,
        useWebWorker,
        onProgress: (progress) => {
          // Map progress from 0-100 to 10-90 range
          onProgress?.(10 + (progress * 80) / 100);
        },
      });

      onProgress?.(95); // Almost done

      return {
        file: compressedFile,
        isCompressed: true,
        originalSize,
      };
    } catch (error: any) {
      throw new Error(
        `Image compression failed: ${error?.message || 'Unknown error'}`
      );
    }
  },

  /**
   * Upload proof of delivery document
   * @param formData - FormData containing the document file
   * @param deliveryId - ID of the delivery
   * @param onUploadProgress - Progress callback function
   * @returns Promise with upload response containing document metadata
   */
  async uploadProof(
    formData: FormData,
    deliveryId: string,
    onUploadProgress?: (_progressEvent: any) => void
  ): Promise<ApiResponse<ProofDocument>> {
    try {
      const { data } = await axios.post<ApiResponse<ProofDocument>>(
        `${API_BASE_URL}/api/deliveries/${deliveryId}/proof`,
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

  async uploadProofBundle(
    formData: FormData,
    deliveryId: string,
    onUploadProgress?: (_progressEvent: { loaded: number; total?: number }) => void
  ): Promise<ApiResponse<DeliveryProofBundle>> {
    const { data } = await axios.post<ApiResponse<DeliveryProofBundle>>(
      `${API_BASE_URL}/api/deliveries/${deliveryId}/proof-bundle`,
      formData,
      {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress,
      }
    );
    return data;
  },

  /**
   * Retrieve proof documents for a delivery
   * @param deliveryId - ID of the delivery
   * @returns Promise with array of proof documents
   */
  async getProofDocuments(
    deliveryId: string
  ): Promise<ApiResponse<ProofDocument[]>> {
    try {
      const { data } = await axios.get<ApiResponse<ProofDocument[]>>(
        `${API_BASE_URL}/api/deliveries/${deliveryId}/proof`
      );
      return data;
    } catch (error: any) {
      throw error;
    }
  },

  /**
   * Delete a proof document
   * @param deliveryId - ID of the delivery
   * @param proofId - ID of the proof document to delete
   * @returns Promise with API response
   */
  async deleteProof(
    deliveryId: string,
    proofId: string
  ): Promise<ApiResponse<null>> {
    try {
      const { data } = await axios.delete<ApiResponse<null>>(
        `${API_BASE_URL}/api/deliveries/${deliveryId}/proof/${proofId}`
      );
      return data;
    } catch (error: any) {
      throw error;
    }
  },
};
