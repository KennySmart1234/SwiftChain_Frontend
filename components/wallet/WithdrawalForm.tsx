'use client';

import { AlertCircle, ArrowLeft, Loader2, RefreshCw } from 'lucide-react';
import {
  STELLAR_NETWORKS,
  useStellarWithdrawal,
  type UseStellarWithdrawalOptions,
} from '@/hooks/useStellarWithdrawal';
import { formatAssetAmount, formatFiatAmount } from '@/lib/transactionFormatters';
import type { StellarNetwork } from '@/types/withdrawal';

type WithdrawalFormProps = UseStellarWithdrawalOptions & {
  className?: string;
};

const inputClass =
  'w-full rounded-lg border bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-50 dark:bg-gray-900 dark:text-white';

function fieldBorder(hasError: boolean): string {
  return hasError ? 'border-red-400 dark:border-red-500' : 'border-gray-300 dark:border-gray-600';
}

function networkLabel(network: StellarNetwork): string {
  return STELLAR_NETWORKS.find((n) => n.value === network)?.label ?? network;
}

function SummaryRow({ label, value, emphasis = false }: { label: string; value: string; emphasis?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2">
      <dt className="text-sm text-gray-600 dark:text-gray-400">{label}</dt>
      <dd
        className={`text-right text-sm ${emphasis ? 'font-semibold text-gray-900 dark:text-white' : 'text-gray-800 dark:text-gray-200'}`}
      >
        {value}
      </dd>
    </div>
  );
}

/**
 * WithdrawalForm — withdraw wallet earnings to a Stellar account.
 *
 * Layered Architecture:
 *   WithdrawalForm (Component) → useStellarWithdrawal (Hook) → withdrawalService (Service)
 *
 * Validates the destination address as a Stellar public key, shows the
 * network fee and fiat equivalent from the backend quote, offers a Max button
 * (available balance minus fees) and asks for confirmation before submitting.
 */
export function WithdrawalForm({ className = '', onSuccess }: WithdrawalFormProps) {
  const {
    form: {
      register,
      formState: { errors },
    },
    step,
    network,
    setNetwork,
    quote,
    isQuoteLoading,
    isQuoteFetching,
    quoteError,
    retryQuote,
    maxWithdrawable,
    fiatEquivalent,
    totalDebit,
    fillMax,
    review,
    pending,
    backToForm,
    confirmWithdrawal,
    isSubmitting,
  } = useStellarWithdrawal({ onSuccess });

  if (step === 'confirm' && pending) {
    const { quote: reviewed } = pending;
    return (
      <section
        aria-labelledby="withdrawal-confirm-heading"
        className={`w-full rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6 dark:border-gray-700 dark:bg-gray-900 ${className}`}
      >
        <h2 id="withdrawal-confirm-heading" className="text-lg font-semibold text-gray-900 dark:text-white">
          Confirm withdrawal
        </h2>
        <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">
          Stellar transactions cannot be reversed. Check the recipient address before confirming.
        </p>

        <dl className="mt-4 divide-y divide-gray-100 dark:divide-gray-800">
          <SummaryRow label="Recipient" value={pending.destination} />
          <SummaryRow label="Network" value={networkLabel(pending.network)} />
          <SummaryRow label="Amount" value={formatAssetAmount(pending.amount, reviewed.assetCode)} />
          <SummaryRow label="Network fee" value={formatAssetAmount(reviewed.networkFee, reviewed.assetCode)} />
          <SummaryRow
            label="Total debited"
            value={formatAssetAmount(pending.totalDebit, reviewed.assetCode)}
            emphasis
          />
          <SummaryRow
            label="Fiat equivalent"
            value={`≈ ${formatFiatAmount(pending.fiatEquivalent, reviewed.fiatCurrency)}`}
          />
        </dl>
        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
          Rate: 1 {reviewed.assetCode} = {formatFiatAmount(reviewed.fiatRate, reviewed.fiatCurrency)}
        </p>

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={backToForm}
            disabled={isSubmitting}
            className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:opacity-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Back
          </button>
          <button
            type="button"
            onClick={() => void confirmWithdrawal()}
            disabled={isSubmitting}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 disabled:opacity-60"
          >
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
            {isSubmitting ? 'Submitting…' : 'Confirm withdrawal'}
          </button>
        </div>
      </section>
    );
  }

  const destinationError = errors.destination?.message;
  const amountError = errors.amount?.message;
  const canReview = !!quote && !isQuoteLoading;

  return (
    <section
      aria-labelledby="withdrawal-heading"
      className={`w-full rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6 dark:border-gray-700 dark:bg-gray-900 ${className}`}
    >
      <h2 id="withdrawal-heading" className="text-lg font-semibold text-gray-900 dark:text-white">
        Withdraw funds
      </h2>

      <div className="mt-3 min-h-[2.5rem]" aria-live="polite">
        {isQuoteLoading && (
          <div data-testid="withdrawal-quote-skeleton" className="animate-pulse space-y-2">
            <div className="h-4 w-48 rounded bg-gray-200 dark:bg-gray-700" />
            <div className="h-3 w-32 rounded bg-gray-100 dark:bg-gray-800" />
          </div>
        )}
        {quote && (
          <p className="text-sm text-gray-700 dark:text-gray-300">
            Available:{' '}
            <span className="font-semibold text-gray-900 dark:text-white">
              {formatAssetAmount(quote.availableBalance, quote.assetCode)}
            </span>{' '}
            <span className="text-gray-500 dark:text-gray-400">
              (≈ {formatFiatAmount(quote.availableBalance * quote.fiatRate, quote.fiatCurrency)})
            </span>
          </p>
        )}
        {!isQuoteLoading && quoteError && (
          <div role="alert" className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-900/20">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600 dark:text-red-400" aria-hidden />
            <div className="flex-1 text-sm text-red-700 dark:text-red-300">{quoteError}</div>
            <button
              type="button"
              onClick={retryQuote}
              className="inline-flex items-center gap-1 text-sm font-medium text-red-700 underline hover:text-red-800 dark:text-red-300"
            >
              <RefreshCw className="h-3.5 w-3.5" aria-hidden />
              Retry
            </button>
          </div>
        )}
      </div>

      <form onSubmit={review} noValidate className="mt-4 space-y-4">
        <div>
          <label htmlFor="withdrawal-network" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Network
          </label>
          <select
            id="withdrawal-network"
            value={network}
            onChange={(e) => setNetwork(e.target.value as StellarNetwork)}
            className={`${inputClass} ${fieldBorder(false)}`}
          >
            {STELLAR_NETWORKS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="withdrawal-destination" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Destination address
          </label>
          <input
            id="withdrawal-destination"
            type="text"
            autoComplete="off"
            spellCheck={false}
            placeholder="G…"
            aria-invalid={!!destinationError}
            aria-describedby={destinationError ? 'withdrawal-destination-error' : undefined}
            className={`${inputClass} font-mono ${fieldBorder(!!destinationError)}`}
            {...register('destination')}
          />
          {destinationError && (
            <p id="withdrawal-destination-error" className="mt-1 text-xs text-red-600 dark:text-red-400">
              {destinationError}
            </p>
          )}
        </div>

        <div>
          <div className="mb-1 flex items-center justify-between">
            <label htmlFor="withdrawal-amount" className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Amount{quote ? ` (${quote.assetCode})` : ''}
            </label>
            <button
              type="button"
              onClick={fillMax}
              disabled={!quote || maxWithdrawable <= 0}
              aria-label="Use maximum amount"
              className="rounded px-2 py-0.5 text-xs font-semibold text-indigo-600 hover:bg-indigo-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:opacity-40 dark:text-indigo-400 dark:hover:bg-indigo-900/30"
            >
              MAX
            </button>
          </div>
          <input
            id="withdrawal-amount"
            type="text"
            inputMode="decimal"
            autoComplete="off"
            placeholder="0.00"
            aria-invalid={!!amountError}
            aria-describedby={
              [amountError ? 'withdrawal-amount-error' : null, 'withdrawal-amount-hint'].filter(Boolean).join(' ')
            }
            className={`${inputClass} ${fieldBorder(!!amountError)}`}
            {...register('amount')}
          />
          {amountError && (
            <p id="withdrawal-amount-error" className="mt-1 text-xs text-red-600 dark:text-red-400">
              {amountError}
            </p>
          )}
          <p id="withdrawal-amount-hint" className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            {fiatEquivalent !== null && quote
              ? `≈ ${formatFiatAmount(fiatEquivalent, quote.fiatCurrency)}`
              : quote
                ? `Minimum ${formatAssetAmount(quote.minimumWithdrawal, quote.assetCode)}`
                : ''}
          </p>
        </div>

        {quote && (
          <dl className="rounded-lg bg-gray-50 px-4 py-2 dark:bg-gray-800/60">
            <div className="flex items-center justify-between py-1">
              <dt className="text-xs text-gray-600 dark:text-gray-400">
                Estimated network fee
                {isQuoteFetching && <Loader2 className="ml-1 inline h-3 w-3 animate-spin" aria-label="Updating fee" />}
              </dt>
              <dd className="text-xs font-medium text-gray-800 dark:text-gray-200">
                {formatAssetAmount(quote.networkFee, quote.assetCode)}{' '}
                <span className="text-gray-500 dark:text-gray-400">
                  (≈ {formatFiatAmount(quote.networkFee * quote.fiatRate, quote.fiatCurrency)})
                </span>
              </dd>
            </div>
            {totalDebit !== null && (
              <div className="flex items-center justify-between border-t border-gray-200 py-1 dark:border-gray-700">
                <dt className="text-xs font-medium text-gray-700 dark:text-gray-300">Total debited</dt>
                <dd className="text-xs font-semibold text-gray-900 dark:text-white">
                  {formatAssetAmount(totalDebit, quote.assetCode)}
                </dd>
              </div>
            )}
          </dl>
        )}

        <button
          type="submit"
          disabled={!canReview}
          className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Review withdrawal
        </button>
      </form>
    </section>
  );
}

export default WithdrawalForm;
