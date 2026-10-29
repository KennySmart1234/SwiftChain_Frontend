/**
 * Types for high-value cargo multi-signature approvals returned by
 * GET /api/escrow/{shipmentId}/multisig-approval.
 */

export type CargoRiskLevel = 'medium' | 'high' | 'critical';

export type SignerApprovalStatus = 'approved' | 'pending' | 'rejected';

export type HighValueApprovalStatus =
  | 'awaiting_signatures'
  | 'ready'
  | 'submitted'
  | 'expired'
  | 'rejected';

export interface HighValueSigner {
  publicKey: string;
  name: string;
  role: string;
  status: SignerApprovalStatus;
  signedAt: string | null;
}

export interface HighValueCargoApproval {
  shipmentId: string;
  trackingNumber: string;
  declaredValue: number;
  /** ISO 4217 currency code of the declared value, e.g. USD. */
  currency: string;
  riskLevel: CargoRiskLevel;
  riskFactors: string[];
  isCrossBorder: boolean;
  originCountry: string;
  destinationCountry: string;
  requiredSignatures: number;
  signers: HighValueSigner[];
  /** ISO timestamp after which the approval can no longer be submitted. */
  deadline: string;
  status: HighValueApprovalStatus;
}

export interface SubmitHighValueApprovalRequest {
  acknowledgedHighRisk: boolean;
}

export interface SubmitHighValueApprovalResponse {
  shipmentId: string;
  status: HighValueApprovalStatus;
  transactionHash: string | null;
}
