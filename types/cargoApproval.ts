/**
 * Multi-signature approval state for high-value cargo escrows, returned by
 * GET /api/escrow/{escrowId}/approvals.
 *
 * Thresholds follow Stellar account semantics: each signer carries a weight and
 * the approval is met once the combined weight of collected signatures reaches
 * the threshold.
 */

export type CargoApprovalStatus = 'pending' | 'threshold_met' | 'executed' | 'expired' | 'cancelled';

export interface CargoApprovalSigner {
  /** Stellar public key (G...) of the signer. */
  publicKey: string;
  weight: number;
  hasSigned: boolean;
  /** ISO 8601 timestamp of the signature, null while outstanding. */
  signedAt: string | null;
  /** Optional display label, e.g. "Fleet manager". */
  label?: string;
}

export interface CargoApproval {
  escrowId: string;
  /** Combined signer weight required to release the escrow. */
  threshold: number;
  signers: CargoApprovalSigner[];
  /** Base64 transaction envelope each signer signs. */
  transactionXdr: string;
  /** ISO 8601 end of the approval window. */
  expiresAt: string;
  status: CargoApprovalStatus;
}

export interface SubmitCargoSignatureRequest {
  signerPublicKey: string;
  signedTransactionXdr: string;
}

export interface CargoApprovalApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
}
