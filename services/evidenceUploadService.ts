import api from '@/lib/api';

export interface EvidenceUploadResponse {
  success: boolean;
  message?: string;
  data?: {
    fileId: string;
    fileName: string;
    fileSize: number;
    mimeType: string;
    url: string;
    uploadedAt: string;
  };
}

export interface EvidenceUploadError {
  field: 'size' | 'type' | 'general';
  message: string;
}

export const ALLOWED_EVIDENCE_TYPES = [
  'image/jpeg',
  'image/png',
  'video/mp4',
  'video/quicktime', // .mov
];

export const MAX_EVIDENCE_FILE_SIZE = 10 * 1024 * 1024; // 10MB

/**
 * evidenceUploadService — handles dispute evidence file upload with validation.
 * Follows the Strict Layered Architecture: Component -> Hook -> Service.
 */
export const evidenceUploadService = {
  /**
   * Validates a file against the evidence size and type constraints.
   * @returns EvidenceUploadError[] - Empty array if valid, error array otherwise
   */
  validateFile(file: File): EvidenceUploadError[] {
    const errors: EvidenceUploadError[] = [];

    if (file.size > MAX_EVIDENCE_FILE_SIZE) {
      errors.push({
        field: 'size',
        message: `File size exceeds 10MB limit (${(file.size / 1024 / 1024).toFixed(2)}MB)`,
      });
    }

    if (!ALLOWED_EVIDENCE_TYPES.includes(file.type)) {
      errors.push({
        field: 'type',
        message: 'Only JPG, PNG, MP4, and MOV files are allowed',
      });
    }

    return errors;
  },

  /**
   * Uploads a dispute evidence file to the backend, reporting progress.
   * @param file - File (already validated/compressed) to upload
   * @param disputeId - The dispute this evidence belongs to
   * @param onUploadProgress - Axios progress callback
   * @param signal - AbortSignal to allow cancelling the in-flight upload
   */
  async uploadEvidence(
    file: File,
    disputeId: string,
    onUploadProgress?: (progressEvent: { loaded: number; total?: number }) => void,
    signal?: AbortSignal,
  ): Promise<EvidenceUploadResponse> {
    try {
      const formData = new FormData();
      formData.append('evidence', file);
      formData.append('disputeId', disputeId);

      const { data } = await api.post<EvidenceUploadResponse>('/api/disputes/evidence', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress,
        signal,
      });

      return data;
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Evidence upload failed',
      };
    }
  },

  /**
   * Generates a preview URL for an image or video file.
   */
  generatePreview(file: File): string {
    return URL.createObjectURL(file);
  },

  /**
   * Cleans up a preview URL.
   */
  revokePreview(url: string): void {
    URL.revokeObjectURL(url);
  },
};
