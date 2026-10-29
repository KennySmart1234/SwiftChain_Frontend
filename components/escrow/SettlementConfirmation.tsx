'use client';

import { AlertCircle, CheckCircle2, ExternalLink, FileX, RotateCw } from 'lucide-react';
import { useSettlementBreakdown } from '@/hooks/useSettlementBreakdown';
import { formatAssetAmount, formatCorridor } from '@/lib/transactionFormatters';

interface SettlementConfirmationProps {
  escrowId: string;
}

const percentFormatter = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 });

function truncateHash(hash: string): string {
  return hash.length > 16 ? `${hash.slice(0, 8)}...${hash.slice(-8)}` : hash;
}

export function SettlementConfirmation({ escrowId }: SettlementConfirmationProps) {
  const { settlement, isLoading, error, refetch } = useSettlementBreakdown(escrowId);

  if (isLoading) {
    return (
      <div
        aria-busy="true"
        aria-label="Loading settlement details"
        className="space-y-4 rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900"
      >
        <div className="h-6 w-1/2 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
        {[0, 1, 2, 3].map((row) => (
          <div key={row} className="h-4 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div
        role="alert"
        className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-200"
      >
        <div className="flex items-start gap-2">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
          <div>
            <h3 className="font-semibold">Unable to load settlement details</h3>
            <p className="mt-1 text-sm">{error}</p>
            <button
              type="button"
              onClick={refetch}
              className="mt-3 inline-flex items-center gap-1.5 rounded-md border border-red-300 px-3 py-1.5 text-sm font-medium hover:bg-red-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 dark:border-red-700 dark:hover:bg-red-900"
            >
              <RotateCw className="h-4 w-4" aria-hidden="true" />
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!settlement) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-lg border border-gray-200 bg-white p-8 text-center dark:border-gray-700 dark:bg-gray-900">
        <FileX className="h-8 w-8 text-gray-400" aria-hidden="true" />
        <h3 className="font-semibold text-gray-900 dark:text-white">No settlement yet</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Settlement details will appear here once the escrow funds are released.
        </p>
      </div>
    );
  }

  const { currency } = settlement;

  return (
    <section
      aria-labelledby="settlement-confirmation-title"
      className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-900"
    >
      <div className="flex items-center gap-2">
        <CheckCircle2 className="h-6 w-6 text-green-600" aria-hidden="true" />
        <h2
          id="settlement-confirmation-title"
          className="text-lg font-semibold text-gray-900 dark:text-white"
        >
          Settlement Complete
        </h2>
      </div>

      <dl className="mt-4 grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-gray-500 dark:text-gray-400">Tracking number</dt>
          <dd className="font-mono text-gray-900 dark:text-white">{settlement.trackingNumber}</dd>
        </div>
        <div>
          <dt className="text-gray-500 dark:text-gray-400">Route</dt>
          <dd className="text-gray-900 dark:text-white">
            {formatCorridor(settlement.origin, settlement.destination)}
          </dd>
        </div>
      </dl>

      <dl
        aria-label="Fund breakdown"
        className="mt-6 space-y-2 border-t border-gray-100 pt-4 text-sm dark:border-gray-700"
      >
        <div className="flex justify-between gap-4">
          <dt className="text-gray-600 dark:text-gray-300">Total released</dt>
          <dd className="font-medium tabular-nums text-gray-900 dark:text-white">
            {formatAssetAmount(settlement.totalAmount, currency)}
          </dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-gray-600 dark:text-gray-300">
            Platform fee ({percentFormatter.format(settlement.platformFeePercent)}%)
          </dt>
          <dd className="tabular-nums text-gray-700 dark:text-gray-200">
            {formatAssetAmount(settlement.platformFee, currency)}
          </dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-gray-600 dark:text-gray-300">Network fee</dt>
          <dd className="tabular-nums text-gray-700 dark:text-gray-200">
            {formatAssetAmount(settlement.networkFee, currency)}
          </dd>
        </div>
        {settlement.heldAmount > 0 && (
          <div className="flex justify-between gap-4">
            <dt className="text-amber-700 dark:text-amber-300">Held pending review</dt>
            <dd className="tabular-nums text-amber-700 dark:text-amber-300">
              {formatAssetAmount(settlement.heldAmount, currency)}
            </dd>
          </div>
        )}
        <div className="flex justify-between gap-4 border-t border-gray-100 pt-2 dark:border-gray-700">
          <dt className="font-semibold text-gray-900 dark:text-white">Paid to driver</dt>
          <dd className="font-semibold tabular-nums text-green-700 dark:text-green-400">
            {formatAssetAmount(settlement.driverPayout, currency)}
          </dd>
        </div>
      </dl>

      <div className="mt-6 text-sm">
        {settlement.transactionHash && settlement.explorerUrl ? (
          <a
            href={settlement.explorerUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="View transaction on Stellar explorer"
            className="inline-flex items-center gap-1 font-mono text-blue-600 hover:underline dark:text-blue-400"
          >
            {truncateHash(settlement.transactionHash)}
            <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
          </a>
        ) : (
          <span className="text-gray-500 dark:text-gray-400">Transaction confirmation pending</span>
        )}
      </div>
    </section>
  );
}
