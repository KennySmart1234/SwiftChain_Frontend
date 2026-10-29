/**
 * Types for the driver earnings wallet dashboard.
 * All XLM amounts are expressed in whole XLM (not stroops).
 */

export interface DriverEarningsSummary {
  /** XLM released from escrow and available for withdrawal */
  availableXlm: number;
  /** XLM locked in escrow awaiting delivery confirmation */
  pendingEscrowXlm: number;
  /** Total XLM earned across all completed deliveries */
  lifetimeEarningsXlm: number;
  /** Number of escrow contracts still awaiting release */
  pendingEscrowCount: number;
  /** ISO 8601 timestamp of the last balance update on the backend */
  updatedAt: string;
}

export type PayoutStatus = 'completed' | 'processing' | 'pending' | 'failed';

export interface DriverPayout {
  id: string;
  amountXlm: number;
  /** Destination Stellar public key (G...) */
  destination: string;
  status: PayoutStatus;
  /** Stellar transaction hash, present once submitted to the network */
  txHash?: string;
  createdAt: string;
}

export interface DriverPayoutsResponse {
  payouts: DriverPayout[];
}

export interface WithdrawalRequest {
  amountXlm: number;
  destination: string;
}

export interface WithdrawalResponse {
  payout: DriverPayout;
}

export interface WithdrawalValidation {
  isValid: boolean;
  error: string | null;
}
