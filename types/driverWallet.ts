/**
 * Driver wallet types — earnings, payout history and Stellar withdrawals.
 * These mirror the backend driver wallet API responses.
 */

export interface EarningsSummary {
  driverId: string;
  /** Asset code the amounts are denominated in, e.g. `XLM` or `USDC`. */
  currency: string;
  /** Lifetime earnings released to the driver. */
  totalEarned: number;
  /** Earnings that can be withdrawn right now. */
  availableBalance: number;
  /** Earnings still locked in escrow for in-progress deliveries. */
  pendingBalance: number;
  /** Total amount already withdrawn to external Stellar accounts. */
  totalWithdrawn: number;
  completedDeliveries: number;
  /** ISO timestamp of when the summary was last computed. */
  updatedAt: string;
}

export type PayoutStatus = 'pending' | 'completed' | 'failed';

export interface PayoutRecord {
  id: string;
  deliveryId: string;
  amount: number;
  currency: string;
  status: PayoutStatus;
  /** Stellar transaction hash, present once the payout is on-chain. */
  transactionHash?: string;
  createdAt: string;
  completedAt?: string;
}

export interface PayoutHistoryOptions {
  /** 1-based page number. */
  page?: number;
  limit?: number;
  status?: PayoutStatus;
  /** ISO date lower bound (inclusive). */
  from?: string;
  /** ISO date upper bound (inclusive). */
  to?: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  pagination: PaginationMeta;
}

export interface WithdrawalParams {
  amount: number;
  /** Asset code to withdraw, e.g. `XLM`. */
  currency: string;
  /** Destination Stellar public key (G...). */
  destinationAddress: string;
  /** Optional Stellar memo, required by some exchanges. */
  memo?: string;
}

export type WithdrawalState = 'pending' | 'processing' | 'completed' | 'failed';

export interface WithdrawalResponse {
  withdrawalId: string;
  status: WithdrawalState;
  amount: number;
  currency: string;
  /** Network fee charged for the withdrawal, in `currency`. */
  fee: number;
  destinationAddress: string;
  createdAt: string;
}

export interface WithdrawalStatus {
  withdrawalId: string;
  status: WithdrawalState;
  transactionHash?: string;
  failureReason?: string;
  updatedAt: string;
}

/** Envelope shared by every driver wallet endpoint. */
export interface DriverWalletApiEnvelope<T> {
  success: boolean;
  data?: T;
  message?: string;
  code?: string;
}

export type DriverWalletErrorCode =
  | 'VALIDATION_ERROR'
  | 'NETWORK_ERROR'
  | 'TIMEOUT'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'INSUFFICIENT_BALANCE'
  | 'SERVER_ERROR'
  | 'API_ERROR'
  | 'UNKNOWN_ERROR';
