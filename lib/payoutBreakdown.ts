import type { PayoutFeeBreakdown, PayoutFeeQuote } from '@/types/escrow';

/** Stellar amounts have 7 decimal places (1 stroop = 0.0000001). */
const STROOPS_PER_UNIT = 10_000_000;

const toStroops = (amount: number): number => Math.round(amount * STROOPS_PER_UNIT);
const fromStroops = (stroops: number): number => stroops / STROOPS_PER_UNIT;

/**
 * Computes the platform fee and net driver payout for an escrow release.
 *
 * Arithmetic is done in integer stroops so results do not pick up floating
 * point noise. Negative or non-finite inputs are treated as zero, and the net
 * payout is floored at zero when fees exceed the escrow amount.
 */
export function calculatePayoutBreakdown(quote: PayoutFeeQuote): PayoutFeeBreakdown {
  const safe = (value: number) => (Number.isFinite(value) && value > 0 ? value : 0);

  const grossStroops = toStroops(safe(quote.escrowAmount));
  const feePercent = Math.min(safe(quote.platformFeePercent), 100);
  const platformFeeStroops = Math.round((grossStroops * feePercent) / 100);
  const gasStroops = toStroops(safe(quote.estimatedGasFee));
  const netStroops = Math.max(grossStroops - platformFeeStroops - gasStroops, 0);

  return {
    currency: quote.currency,
    grossAmount: fromStroops(grossStroops),
    platformFeePercent: feePercent,
    platformFee: fromStroops(platformFeeStroops),
    estimatedGasFee: fromStroops(gasStroops),
    netPayout: fromStroops(netStroops),
  };
}
