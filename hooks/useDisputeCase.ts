'use client';

import { useCallback, useState } from 'react';
import { disputeService } from '@/services/disputeService';
import type { DisputeCaseResponse, DisputeReason } from '@/types/dispute';
import { useToast } from '@/hooks/useToast';

export interface EvidenceFile {
  id: string;
  file: File;
  previewUrl: string;
  kind: 'image' | 'video';
}

const MAX_EVIDENCE_FILE_SIZE_MB = 10;
const ACCEPTED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm'];

function newFileId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/**
 * useDisputeCase — drives the dispute resolution portal: evidence queue
 * management, filing the case, uploading evidence, and freezing escrow.
 */
export function useDisputeCase(deliveryId: string) {
  const { success, error: toastError } = useToast();
  const [files, setFiles] = useState<EvidenceFile[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [caseResult, setCaseResult] = useState<DisputeCaseResponse | null>(null);

  const addFiles = useCallback((incoming: File[]): { accepted: number; rejected: string[] } => {
    const rejected: string[] = [];
    const accepted: EvidenceFile[] = [];

    for (const file of incoming) {
      if (!ACCEPTED_MIME_TYPES.includes(file.type)) {
        rejected.push(`${file.name}: unsupported file type`);
        continue;
      }
      if (file.size > MAX_EVIDENCE_FILE_SIZE_MB * 1024 * 1024) {
        rejected.push(`${file.name}: exceeds ${MAX_EVIDENCE_FILE_SIZE_MB}MB limit`);
        continue;
      }
      accepted.push({
        id: newFileId(),
        file,
        previewUrl: URL.createObjectURL(file),
        kind: file.type.startsWith('video/') ? 'video' : 'image',
      });
    }

    if (accepted.length > 0) {
      setFiles((prev) => [...prev, ...accepted]);
    }
    return { accepted: accepted.length, rejected };
  }, []);

  const removeFile = useCallback((id: string) => {
    setFiles((prev) => {
      const target = prev.find((f) => f.id === id);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((f) => f.id !== id);
    });
  }, []);

  const submitCase = useCallback(
    async (reason: DisputeReason, description: string): Promise<DisputeCaseResponse> => {
      setIsSubmitting(true);
      setUploadProgress(0);
      try {
        const filedCase = await disputeService.fileDispute({ deliveryId, reason, description });

        await disputeService.freezeEscrow(deliveryId);

        if (files.length > 0) {
          await disputeService.uploadEvidence(
            filedCase.caseId,
            files.map((f) => f.file),
            setUploadProgress
          );
        }

        const result: DisputeCaseResponse = { ...filedCase, escrowFrozen: true };
        setCaseResult(result);
        success('Dispute filed', `Case ${filedCase.caseId} is now under review.`);
        return result;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Please try again later';
        toastError('Unable to file dispute', message);
        throw err;
      } finally {
        setIsSubmitting(false);
      }
    },
    [deliveryId, files, success, toastError]
  );

  return {
    files,
    addFiles,
    removeFile,
    submitCase,
    isSubmitting,
    uploadProgress,
    caseResult,
  };
}
