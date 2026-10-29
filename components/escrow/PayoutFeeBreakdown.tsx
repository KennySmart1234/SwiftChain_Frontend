'use client';

import { AlertCircle } from 'lucide-react';
import { formatAssetAmount } from '@/lib/transactionFormatters';
import type { PayoutFeeBreakdown as PayoutFeeBreakdownData } from '@/types/escrow';

interface PayoutFeeBreakdownProps {
  breakdown: PayoutFeeBreakdownData | null;
  isLoading: boolean;
  error: string | null;
}

const percentFormatter = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 });

export function PayoutFeeBreakdown({ breakdown, isLoading, error }: PayoutFeeBreakdownProps) {
  if (isLoading && !breakdown) {
    return (
      <div
        className="mt-6 space-y-2 rounded-lg border border-gray-100 p-4 dark:border-gray-700"
        aria-label="Loading fee breakdown"
      >
        {[0, 1, 2, 3].map((row) => (
          <div key={row} className="h-4 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
        ))}
      </div>
    );
  }

  if (error && !breakdown) {
    return (
      <div
        role="status"
        className="mt-6 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200"
      >
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        <span>Fee breakdown unavailable: {error}</span>
      </div>
    );
  }

  if (!breakdown) return null;

  const { currency } = breakdown;

  return (
    <section
      aria-labelledby="payout-fee-breakdown-title"
      className="mt-6 rounded-lg border border-gray-100 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/50"
    >
      <h3
        id="payout-fee-breakdown-title"
        className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400"
      >
        Payout Breakdown
      </h3>
      <dl className="space-y-2 text-sm">
        <div className="flex items-center justify-between gap-4">
          <dt className="text-gray-600 dark:text-gray-300">Escrow amount</dt>
          <dd className="font-medium tabular-nums text-gray-900 dark:text-white">
            {formatAssetAmount(breakdown.grossAmount, currency)}
          </dd>
        </div>
        <div className="flex items-center justify-between gap-4">
          <dt className="text-gray-600 dark:text-gray-300">
            Platform commission ({percentFormatter.format(breakdown.platformFeePercent)}%)
          </dt>
          <dd className="tabular-nums text-gray-700 dark:text-gray-200">
            -{formatAssetAmount(breakdown.platformFee, currency)}
          </dd>
        </div>
        <div className="flex items-center justify-between gap-4">
          <dt className="text-gray-600 dark:text-gray-300">Estimated network fee</dt>
          <dd className="tabular-nums text-gray-700 dark:text-gray-200">
            -{formatAssetAmount(breakdown.estimatedGasFee, currency)}
          </dd>
        </div>
        <div className="flex items-center justify-between gap-4 border-t border-gray-200 pt-2 dark:border-gray-700">
          <dt className="font-semibold text-gray-900 dark:text-white">Driver receives</dt>
          <dd
            aria-live="polite"
            data-testid="net-payout"
            className="font-semibold tabular-nums text-green-700 dark:text-green-400"
          >
            {formatAssetAmount(breakdown.netPayout, currency)}
          </dd>
        </div>
      </dl>
    </section>
  );
}
