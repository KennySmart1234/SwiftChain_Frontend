/**
 * Driver earnings types returned by the wallet API.
 * All amounts are whole units of {@link EarningsSummary.currency} (not stroops).
 */

export interface EarningsSummary {
  /** Funds released from escrow and available for payout. */
  available: number;
  /** Funds still locked in escrow awaiting delivery confirmation. */
  pending: number;
  /** Lifetime earnings across all completed deliveries. */
  total: number;
  /** Asset or ISO 4217 code the amounts are denominated in, e.g. "XLM". */
  currency: string;
  /** ISO 8601 timestamp of the last balance update on the backend. */
  updatedAt?: string;
}

export type PayoutStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface PayoutHistory {
  id: string;
  amount: number;
  currency: string;
  status: PayoutStatus;
  /** Destination Stellar public key (G...). */
  destination: string;
  /** Stellar transaction hash, present once submitted to the network. */
  txHash?: string;
  /** ISO 8601 creation timestamp. */
  createdAt: string;
}

export interface PayoutHistoryPage {
  items: PayoutHistory[];
  /** Opaque cursor for the next page; null when there are no more pages. */
  nextCursor: string | null;
}

export interface PayoutHistoryParams {
  cursor?: string | null;
  limit?: number;
}

export interface EarningsApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
}
