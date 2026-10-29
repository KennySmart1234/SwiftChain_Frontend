'use client';

import { useState, useCallback } from 'react';
import {
  bulkUploadService,
  type BulkUploadError,
  type FilePreview,
} from '@/services/bulkUploadService';
import { useToast } from '@/hooks/useToast';

export interface UploadingFile {
  file: File;
  preview: FilePreview | null;
  uploadStatus: 'pending' | 'uploading' | 'success' | 'error';
  error?: string;
  uploadProgress: number;
}

export interface UseBulkUploadZoneReturn {
  /** Array of files being uploaded */
  files: UploadingFile[];
  /** True while any file is uploading */
  isUploading: boolean;
  /** Validation errors for files */
  validationErrors: BulkUploadError[];
  /** Add files to the upload queue */
  addFiles: (filesToAdd: File[]) => Promise<void>;
  /** Remove a file from the queue */
  removeFile: (index: number) => void;
  /** Upload a specific file */
  uploadFile: (index: number, fileType: 'shipments' | 'deliveries' | 'orders') => Promise<void>;
  /** Upload all pending files */
  uploadAll: (fileType: 'shipments' | 'deliveries' | 'orders') => Promise<void>;
  /** Clear all files and errors */
  clearAll: () => void;
}

/**
 * useBulkUploadZone — manages drag-and-drop bulk file uploads with validation and preview.
 *
 * Follows the Component → Hook → Service pattern:
 *   BulkUploadZone (component) → useBulkUploadZone (hook) → bulkUploadService (service)
 */
export function useBulkUploadZone(): UseBulkUploadZoneReturn {
  const [files, setFiles] = useState<UploadingFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [validationErrors, setValidationErrors] = useState<BulkUploadError[]>([]);
  const { success, error: toastError } = useToast();

  const addFiles = useCallback(async (filesToAdd: File[]) => {
    setValidationErrors([]);

    const newFiles: UploadingFile[] = [];

    for (const file of filesToAdd) {
      // Validate file
      const fileErrors = bulkUploadService.validateFile(file);
      if (fileErrors.length > 0) {
        setValidationErrors(fileErrors);
        toastError(
          'Invalid file',
          fileErrors.map((e) => e.message).join(', '),
        );
        continue;
      }

      // Generate preview
      try {
        const preview = await bulkUploadService.generatePreview(file);
        newFiles.push({
          file,
          preview,
          uploadStatus: 'pending',
          uploadProgress: 0,
        });
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to parse file';
        setValidationErrors([
          {
            field: 'parse',
            message: errorMsg,
          },
        ]);
        toastError('Parse error', errorMsg);
      }
    }

    setFiles((prev) => [...prev, ...newFiles]);
  }, [toastError]);

  const removeFile = useCallback((index: number) => {
    setFiles((prev) => {
      const updated = [...prev];
      updated.splice(index, 1);
      return updated;
    });
  }, []);

  const uploadFile = useCallback(
    async (index: number, fileType: 'shipments' | 'deliveries' | 'orders') => {
      const fileItem = files[index];
      if (!fileItem) return;

      setFiles((prev) => {
        const updated = [...prev];
        if (updated[index]) {
          updated[index] = {
            ...updated[index],
            uploadStatus: 'uploading',
          };
        }
        return updated;
      });

      try {
        const response = await bulkUploadService.uploadBulkFile(fileItem.file, fileType);

        if (response.success) {
          setFiles((prev) => {
            const updated = [...prev];
            if (updated[index]) {
              updated[index] = {
                ...updated[index],
                uploadStatus: 'success',
                uploadProgress: 100,
              };
            }
            return updated;
          });
          success(
            'Upload successful',
            `${response.data?.processedCount || 0} records processed`,
          );
        } else {
          throw new Error(response.message || 'Upload failed');
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Upload failed';
        setFiles((prev) => {
          const updated = [...prev];
          if (updated[index]) {
            updated[index] = {
              ...updated[index],
              uploadStatus: 'error',
              error: errorMsg,
            };
          }
          return updated;
        });
        toastError('Upload error', errorMsg);
      }
    },
    [files, success, toastError],
  );

  const uploadAll = useCallback(
    async (fileType: 'shipments' | 'deliveries' | 'orders') => {
      setIsUploading(true);

      try {
        for (let i = 0; i < files.length; i++) {
          const fileItem = files[i];
          if (fileItem.uploadStatus !== 'pending') continue;

          await uploadFile(i, fileType);
        }
      } finally {
        setIsUploading(false);
      }
    },
    [files, uploadFile],
  );

  const clearAll = useCallback(() => {
    setFiles([]);
    setValidationErrors([]);
  }, []);

  return {
    files,
    isUploading,
    validationErrors,
    addFiles,
    removeFile,
    uploadFile,
    uploadAll,
    clearAll,
  };
}
