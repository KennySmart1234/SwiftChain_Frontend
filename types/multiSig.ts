/**
 * Multi-signature approval types shared by walletService and useMultiSigApprovals.
 */

export interface Signer {
  publicKey: string;
  weight: number;
  approved: boolean;
}

export interface PendingMultiSigOperation {
  operationId: string;
  transactionEnvelope: string;
  description: string;
  signaturesRequired: number;
  currentSignatures: number;
  signers: Signer[];
  createdAt: string;
  status: 'pending' | 'signed' | 'rejected' | 'expired';
  expiresAt: string;
  /** Value moved by the operation in XLM, when the backend can price it. */
  amountXlm?: number;
}

/**
 * - `low`: below half of the high-value threshold, or the amount is unknown.
 * - `medium`: at least half of the threshold.
 * - `high`: at or above the threshold; requires the high-value approval modal.
 */
export type MultiSigRiskLevel = 'low' | 'medium' | 'high';

/** A pending operation annotated with its risk assessment. */
export interface MultiSigOperation extends PendingMultiSigOperation {
  isHighValue: boolean;
  riskLevel: MultiSigRiskLevel;
}

export interface PendingMultiSigResponse {
  success: boolean;
  message: string;
  operations?: PendingMultiSigOperation[];
  totalCount?: number;
}

export interface SignMultiSigParams {
  operationId: string;
  signature: string;
  signerPublicKey: string;
}

export interface SignMultiSigResponse {
  success: boolean;
  message: string;
  transactionHash?: string;
  operationId?: string;
  currentSignatures?: number;
}
