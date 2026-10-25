'use client';

import { useState, useCallback, useEffect } from 'react';
import { proofService, CompressionOptions } from '@/services/proofService';
import { useToast } from './useToast';

export interface UploadedProof {
  id?: string;
  filename: string;
  fileSize: number;
  originalSize: number;
  isCompressed: boolean;
  status: 'uploading' | 'completed' | 'failed';
  uploadedAt?: string;
  compressionProgress: number;
}

interface UseProofUploadProps {
  deliveryId: string;
  maxSizeMB?: number;
}

interface UseProofUploadReturn {
  uploadProgress: number;
  compressionProgress: number;
  isUploading: boolean;
  isCompressing: boolean;
  uploadedProofs: UploadedProof[];
  errors: string[];
  stagedPhoto: File | null;
  photoPreviewUrl: string | null;
  signatureDataUrl: string | null;
  canSubmitBundle: boolean;

  handleFileCapture: (_file: File) => Promise<void>;

  handleCameraCapture: (_canvas: HTMLCanvasElement) => Promise<void>;
  clearUploadedProofs: () => void;

  removeProof: (_filename: string) => void;
  stagePhoto: (_file: File) => void;
  stageCameraCapture: (_canvas: HTMLCanvasElement) => Promise<void>;
  setSignature: (_signatureDataUrl: string | null) => void;
  submitProofBundle: () => Promise<boolean>;
  resetBundle: () => void;
}

/**
 * useProofUpload — Custom hook for handling proof of delivery uploads.
 * Includes image compression for files > 5MB.
 * Follows the Strict Layered Architecture: Component -> Hook -> Service.
 */
export function useProofUpload({
  deliveryId,
  maxSizeMB = 5,
}: UseProofUploadProps): UseProofUploadReturn {
  const [uploadProgress, setUploadProgress] = useState(0);
  const [compressionProgress, setCompressionProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);
  const [uploadedProofs, setUploadedProofs] = useState<UploadedProof[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [stagedPhoto, setStagedPhoto] = useState<File | null>(null);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null);
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);
  const {
    error: toastError,
    success: toastSuccess,
  } = useToast();

  useEffect(() => {
    return () => {
      if (photoPreviewUrl) URL.revokeObjectURL(photoPreviewUrl);
    };
  }, [photoPreviewUrl]);

  const stagePhoto = useCallback(
    (file: File) => {
      if (!file.type.startsWith('image/')) {
        const message = 'Please select an image file';
        setErrors([message]);
        toastError?.(message);
        return;
      }
      if (photoPreviewUrl) URL.revokeObjectURL(photoPreviewUrl);
      setStagedPhoto(file);
      setPhotoPreviewUrl(URL.createObjectURL(file));
      setErrors([]);
    },
    [photoPreviewUrl, toastError]
  );

  const stageCameraCapture = useCallback(
    async (canvas: HTMLCanvasElement) => {
      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob(resolve, 'image/jpeg', 0.95);
      });
      if (!blob) {
        setErrors(['Failed to capture image from camera']);
        return;
      }
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      stagePhoto(
        new File([blob], `proof-${timestamp}.jpg`, { type: 'image/jpeg' })
      );
    },
    [stagePhoto]
  );

  const setSignature = useCallback((value: string | null) => {
    setSignatureDataUrl(value);
    setErrors([]);
  }, []);

  const resetBundle = useCallback(() => {
    if (photoPreviewUrl) URL.revokeObjectURL(photoPreviewUrl);
    setStagedPhoto(null);
    setPhotoPreviewUrl(null);
    setSignatureDataUrl(null);
    setErrors([]);
  }, [photoPreviewUrl]);

  const submitProofBundle = useCallback(async () => {
    if (!stagedPhoto && signatureDataUrl) {
      setErrors(['Add a delivery photo to submit this signature.']);
      return false;
    }
    if (!stagedPhoto || !signatureDataUrl) {
      setErrors(['A delivery photo and recipient signature are required.']);
      return false;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setErrors([]);
    try {
      const formData = new FormData();
      formData.append('photo', stagedPhoto);
      formData.append('signatureDataUrl', signatureDataUrl);
      const response = await proofService.uploadProofBundle(
        formData,
        deliveryId,
        ({ loaded, total }) => {
          if (total) setUploadProgress(Math.round((loaded / total) * 100));
        }
      );
      if (!response.success || !response.data) {
        throw new Error(response.message || 'Proof bundle upload failed');
      }

      setUploadedProofs((current) => [
        ...current,
        {
          id: response.data?.photo.id,
          filename: response.data?.photo.filename ?? stagedPhoto.name,
          fileSize: response.data?.photo.fileSize ?? stagedPhoto.size,
          originalSize: response.data?.photo.originalSize ?? stagedPhoto.size,
          isCompressed: response.data?.photo.isCompressed ?? false,
          status: 'completed',
          uploadedAt: response.data?.photo.uploadedAt,
          compressionProgress: 100,
        },
      ]);
      resetBundle();
      toastSuccess?.('Delivery proof submitted');
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Proof bundle upload failed';
      setErrors([message]);
      toastError?.(message);
      return false;
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  }, [deliveryId, resetBundle, signatureDataUrl, stagedPhoto, toastError, toastSuccess]);

  const handleFileCapture = useCallback(
    async (file: File) => {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        const errorMsg = 'Please select an image file';
        setErrors((prev) => [...prev, errorMsg]);
        toastError?.(errorMsg);
        return;
      }

      setIsUploading(true);
      setUploadProgress(0);
      setCompressionProgress(0);
      setErrors([]);

      try {
        // Add proof to uploading list
        const uploadingProof: UploadedProof = {
          filename: file.name,
          fileSize: file.size,
          originalSize: file.size,
          isCompressed: false,
          status: 'uploading',
          compressionProgress: 0,
        };

        setUploadedProofs((prev) => [...prev, uploadingProof]);

        // Start compression phase
        setIsCompressing(true);

        const compressionOptions: CompressionOptions = {
          maxSizeMB,
          maxWidthOrHeight: 1920,
          useWebWorker: true,
          onProgress: (progress) => {
            setCompressionProgress(progress);
          },
        };

        const {
          file: compressedFile,
          isCompressed,
          originalSize,
        } = await proofService.compressImage(file, compressionOptions);

        setIsCompressing(false);
        setCompressionProgress(100);

        // Create FormData for multipart upload
        const formData = new FormData();
        formData.append('proof', compressedFile);
        formData.append('isCompressed', isCompressed.toString());
        formData.append('originalSize', originalSize.toString());

        // Upload file with progress tracking
        const response = await proofService.uploadProof(
          formData,
          deliveryId,
          (progressEvent: any) => {
            const progress = Math.round(
              (progressEvent.loaded / progressEvent.total) * 100
            );
            setUploadProgress(progress);
          }
        );

        if (response.success && response.data) {
          // Update uploaded proof status
          setUploadedProofs((prev) =>
            prev.map((p) =>
              p.filename === file.name
                ? {
                    ...p,
                    id: response.data?.id,
                    status: 'completed',
                    uploadedAt: new Date().toISOString(),
                    isCompressed,
                    originalSize,
                    fileSize: compressedFile.size,
                  }
                : p
            )
          );

          const compressionMsg = isCompressed
            ? ` (compressed from ${(originalSize / (1024 * 1024)).toFixed(2)}MB to ${(compressedFile.size / (1024 * 1024)).toFixed(2)}MB)`
            : '';

          toastSuccess?.(
            'Upload Successful',
            `Proof uploaded successfully${compressionMsg}`
          );
        } else {
          throw new Error(response.message || 'Upload failed');
        }
      } catch (error: any) {
        const errorMessage =
          error?.response?.data?.message ||
          error?.message ||
          'Failed to upload proof';

        setErrors((prev) => [...prev, errorMessage]);
        setUploadedProofs((prev) =>
          prev.map((p) =>
            p.filename === file.name ? { ...p, status: 'failed' } : p
          )
        );

        toastError?.('Upload Failed', errorMessage);
      } finally {
        setIsUploading(false);
        setIsCompressing(false);
        setUploadProgress(0);
        setCompressionProgress(0);
      }
    },
    [deliveryId, maxSizeMB, toastError, toastSuccess]
  );

  const handleCameraCapture = useCallback(
    async (canvas: HTMLCanvasElement) => {
      try {
        // Convert canvas to blob
        const blob = await new Promise<Blob | null>((resolve) => {
          canvas.toBlob(resolve, 'image/jpeg', 0.95);
        });

        if (!blob) {
          throw new Error('Failed to capture image from camera');
        }

        // Create File from blob
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const file = new File([blob], `proof-${timestamp}.jpg`, {
          type: 'image/jpeg',
        });

        // Upload the captured image
        await handleFileCapture(file);
      } catch (error: any) {
        const errorMessage = error?.message || 'Failed to capture from camera';
        setErrors((prev) => [...prev, errorMessage]);
        toastError?.('Camera Capture Failed', errorMessage);
      }
    },
    [handleFileCapture, toastError]
  );

  const clearUploadedProofs = useCallback(() => {
    setUploadedProofs([]);
    setErrors([]);
  }, []);

  const removeProof = useCallback((filename: string) => {
    setUploadedProofs((prev) => prev.filter((p) => p.filename !== filename));
  }, []);

  return {
    uploadProgress,
    compressionProgress,
    isUploading,
    isCompressing,
    uploadedProofs,
    errors,
    stagedPhoto,
    photoPreviewUrl,
    signatureDataUrl,
    canSubmitBundle: Boolean(stagedPhoto && signatureDataUrl) && !isUploading,
    handleFileCapture,
    handleCameraCapture,
    clearUploadedProofs,
    removeProof,
    stagePhoto,
    stageCameraCapture,
    setSignature,
    submitProofBundle,
    resetBundle,
  };
}
