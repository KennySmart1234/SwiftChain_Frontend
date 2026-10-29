export type DisputeStep = 'details' | 'evidence' | 'review' | 'submitted';

export type EvidenceFileStatus = 'pending' | 'compressing' | 'ready' | 'error';

/** A single piece of evidence attached to a dispute, tracked client-side through upload. */
export interface EvidenceFile {
  id: string;
  file: File;
  previewUrl: string;
  status: EvidenceFileStatus;
  /** Populated once compression succeeds; undefined for non-image files (e.g. PDF). */
  compressedSizeKB?: number;
  errorMessage?: string;
}

export const ACCEPTED_EVIDENCE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'] as const;
export const MAX_EVIDENCE_FILES = 5;
export const MAX_EVIDENCE_FILE_SIZE_MB = 10;

export interface DisputeCaseSummary {
  caseId: string;
  status: 'open' | 'under_review' | 'resolved';
  escrowFrozen: boolean;
  createdAt: string;
}

export interface SubmitDisputeCasePayload {
  deliveryId: string;
  reason: string;
  description: string;
  evidenceFileIds: string[];
}
