/**
 * Settlement confirmation types — the fund breakdown recorded when an escrow
 * is released to the driver after delivery.
 */

export interface SettlementBreakdown {
  escrowId: string;
  deliveryId: string;
  trackingNumber: string;
  origin: string;
  destination: string;
  /** Asset code all amounts are denominated in, e.g. `XLM` or `USDC`. */
  currency: string;
  /** Total amount released from escrow. */
  totalAmount: number;
  /** Amount paid out to the driver. */
  driverPayout: number;
  platformFee: number;
  /** Platform commission as a percentage, e.g. `2.5`. */
  platformFeePercent: number;
  networkFee: number;
  /** Amount still held (e.g. pending a dispute window). */
  heldAmount: number;
  /** Stellar transaction hash of the release, once confirmed on-chain. */
  transactionHash?: string;
  /** Stellar explorer link for `transactionHash`. */
  explorerUrl?: string;
  settledAt: string;
}

export interface SettlementBreakdownResponse {
  success: boolean;
  data?: SettlementBreakdown | null;
  message?: string;
}
