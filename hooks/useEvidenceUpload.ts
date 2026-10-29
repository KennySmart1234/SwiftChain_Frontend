'use client';

import { useCallback, useRef, useState } from 'react';
import {
  evidenceUploadService,
  MAX_EVIDENCE_FILE_SIZE,
} from '@/services/evidenceUploadService';
import { imageCompressionService } from '@/services/imageCompressionService';

export type EvidenceFileStatus = 'compressing' | 'uploading' | 'completed' | 'failed' | 'cancelled';

export interface FilePreview {
  /** Stable client-side identifier so a specific file can be targeted (remove/cancel). */
  id: string;
  filename: string;
  fileSize: number;
  originalSize: number;
  isCompressed: boolean;
  status: EvidenceFileStatus;
  /** Object URL for image/video preview — caller is responsible for revoking on unmount. */
  previewUrl: string;
  mimeType: string;
  /** 0-100 upload progress for this specific file. */
  uploadProgress: number;
  uploadedUrl?: string;
  uploadedAt?: string;
}

interface UseEvidenceUploadProps {
  disputeId: string;
  /** Compress images down to this target size before upload. Defaults to 500KB. */
  compressionTargetKB?: number;
}

interface UseEvidenceUploadReturn {
  files: FilePreview[];
  evidenceErrors: string[];
  isUploading: boolean;
  addFiles: (files: File[]) => Promise<void>;
  removeFile: (id: string) => void;
  cancelUpload: (id: string) => void;
  clearErrors: () => void;
}

function createFileId(): string {
  return `evidence-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/**
 * useEvidenceUpload — manages validation, compression, upload progress, and
 * cancellation for dispute evidence files (photos and videos).
 *
 * Follows the Strict Layered Architecture: Component -> Hook -> Service.
 */
export function useEvidenceUpload({
  disputeId,
  compressionTargetKB = 500,
}: UseEvidenceUploadProps): UseEvidenceUploadReturn {
  const [files, setFiles] = useState<FilePreview[]>([]);
  const [evidenceErrors, setEvidenceErrors] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  // Tracks in-flight AbortControllers per file id so a specific upload can be cancelled.
  const controllersRef = useRef<Map<string, AbortController>>(new Map());

  const updateFile = useCallback((id: string, patch: Partial<FilePreview>) => {
    setFiles((prev) => prev.map((f) => (f.id === id ? { ...f, ...patch } : f)));
  }, []);

  const uploadOne = useCallback(
    async (file: File, id: string) => {
      const controller = new AbortController();
      controllersRef.current.set(id, controller);

      try {
        let fileToUpload = file;
        let isCompressed = false;

        if (file.type.startsWith('image/')) {
          updateFile(id, { status: 'compressing' });
          try {
            fileToUpload = await imageCompressionService.compressImage(file, compressionTargetKB);
            isCompressed = true;
          } catch (compressionError) {
            // Compression failing shouldn't block the upload outright — fall back to the
            // original file and let the backend/size validation be the final gate.
            const message =
              compressionError instanceof Error
                ? compressionError.message
                : 'Image compression failed';
            setEvidenceErrors((prev) => [...prev, message]);
          }
        }

        updateFile(id, {
          status: 'uploading',
          isCompressed,
          fileSize: fileToUpload.size,
        });

        const response = await evidenceUploadService.uploadEvidence(
          fileToUpload,
          disputeId,
          (progressEvent) => {
            const total = progressEvent.total ?? fileToUpload.size;
            const progress = total > 0 ? Math.round((progressEvent.loaded / total) * 100) : 0;
            updateFile(id, { uploadProgress: progress });
          },
          controller.signal,
        );

        if (response.success && response.data) {
          updateFile(id, {
            status: 'completed',
            uploadProgress: 100,
            uploadedUrl: response.data.url,
            uploadedAt: response.data.uploadedAt,
            fileSize: response.data.fileSize,
          });
        } else {
          throw new Error(response.message || 'Evidence upload failed');
        }
      } catch (error: unknown) {
        if (controller.signal.aborted) {
          updateFile(id, { status: 'cancelled' });
          return;
        }

        const message = error instanceof Error ? error.message : 'Failed to upload evidence';
        setEvidenceErrors((prev) => [...prev, message]);
        updateFile(id, { status: 'failed' });
      } finally {
        controllersRef.current.delete(id);
      }
    },
    [compressionTargetKB, disputeId, updateFile],
  );

  const addFiles = useCallback(
    async (incomingFiles: File[]) => {
      setEvidenceErrors([]);

      const accepted: { file: File; id: string }[] = [];
      const newErrors: string[] = [];

      for (const file of incomingFiles) {
        const validationErrors = evidenceUploadService.validateFile(file);
        if (validationErrors.length > 0) {
          newErrors.push(...validationErrors.map((e) => `${file.name}: ${e.message}`));
          continue;
        }
        accepted.push({ file, id: createFileId() });
      }

      if (newErrors.length > 0) {
        setEvidenceErrors((prev) => [...prev, ...newErrors]);
      }

      if (accepted.length === 0) return;

      setFiles((prev) => [
        ...prev,
        ...accepted.map(({ file, id }) => ({
          id,
          filename: file.name,
          fileSize: file.size,
          originalSize: file.size,
          isCompressed: false,
          status: 'compressing' as EvidenceFileStatus,
          previewUrl: evidenceUploadService.generatePreview(file),
          mimeType: file.type,
          uploadProgress: 0,
        })),
      ]);

      setIsUploading(true);
      try {
        await Promise.all(accepted.map(({ file, id }) => uploadOne(file, id)));
      } finally {
        setIsUploading(false);
      }
    },
    [uploadOne],
  );

  const removeFile = useCallback((id: string) => {
    setFiles((prev) => {
      const target = prev.find((f) => f.id === id);
      if (target) {
        evidenceUploadService.revokePreview(target.previewUrl);
      }
      return prev.filter((f) => f.id !== id);
    });

    const controller = controllersRef.current.get(id);
    if (controller) {
      controller.abort();
      controllersRef.current.delete(id);
    }
  }, []);

  const cancelUpload = useCallback((id: string) => {
    const controller = controllersRef.current.get(id);
    if (controller) {
      controller.abort();
    }
  }, []);

  const clearErrors = useCallback(() => {
    setEvidenceErrors([]);
  }, []);

  return {
    files,
    evidenceErrors,
    isUploading,
    addFiles,
    removeFile,
    cancelUpload,
    clearErrors,
  };
}

export { MAX_EVIDENCE_FILE_SIZE };
