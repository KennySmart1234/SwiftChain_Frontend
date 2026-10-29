/**
 * Types for the post-delivery settlement breakdown returned by
 * GET /api/escrow/{id}/settlement.
 *
 * All monetary amounts are expressed in units of `asset` (e.g. XLM, USDC)
 * and mirror the values emitted by the escrow contract's settlement event.
 */

/**
 * Lifecycle of a settlement after escrow release.
 * - `pending`    — release requested, transaction not yet submitted
 * - `finalizing` — transaction submitted, awaiting ledger confirmation
 * - `confirmed`  — transaction included in a closed ledger (terminal)
 * - `failed`     — transaction rejected or expired (terminal)
 */
export type SettlementStatus = 'pending' | 'finalizing' | 'confirmed' | 'failed';

export type StellarNetwork = 'public' | 'testnet';

export interface SettlementTaxWithholding {
  /** Stable identifier for the withholding, e.g. `vat` or `wht`. */
  code: string;
  label: string;
  /** Rate applied as a fraction, e.g. 0.075 for 7.5%. */
  rate: number;
  amount: number;
}

export interface SettlementDeliverySummary {
  trackingNumber: string;
  origin: string;
  destination: string;
  deliveredAt: string | null;
}

export interface SettlementBreakdown {
  escrowId: string;
  status: SettlementStatus;
  asset: string;
  network: StellarNetwork;
  /** Total amount that was locked in escrow for the delivery. */
  totalEscrowAmount: number;
  /** Net amount released to the driver after fees and withholdings. */
  driverPayout: number;
  platformFee: number;
  /** Platform commission as a fraction, e.g. 0.025 for 2.5%. */
  platformFeeRate: number;
  taxWithholdings: SettlementTaxWithholding[];
  /** Amount still held (e.g. pending dispute window or compliance review). */
  heldAmount: number;
  heldReason: string | null;
  /** Balance left in escrow or returned to the shipper after settlement. */
  remainingBalance: number;
  transactionHash: string | null;
  ledger: number | null;
  settledAt: string | null;
  delivery: SettlementDeliverySummary;
}

export interface FormattedTaxWithholding extends SettlementTaxWithholding {
  formattedAmount: string;
  formattedRate: string;
}

export interface FormattedSettlementAmounts {
  totalEscrowAmount: string;
  driverPayout: string;
  platformFee: string;
  platformFeeRate: string;
  totalTaxWithheld: string;
  heldAmount: string;
  remainingBalance: string;
}
