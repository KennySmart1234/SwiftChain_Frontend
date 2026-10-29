'use client';

import React, { useId, useState } from 'react';
import {
  AlertCircle,
  ArrowUpRight,
  CheckCircle,
  Clock,
  Loader2,
  Lock,
  RefreshCw,
  TrendingUp,
  Wallet,
  XCircle,
} from 'lucide-react';
import { useDriverEarnings, type UseDriverEarningsResult } from '@/hooks/useDriverEarnings';
import { formatXlm } from '@/services/driverEarningsService';
import type { DriverPayout, PayoutStatus } from '@/types/driverEarnings';

// ---------------------------------------------------------------------------
// Status badge
// ---------------------------------------------------------------------------

const STATUS_CONFIG: Record<PayoutStatus, { label: string; className: string; icon: typeof Clock }> = {
  completed: {
    label: 'Completed',
    className: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
    icon: CheckCircle,
  },
  processing: {
    label: 'Processing',
    className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
    icon: Loader2,
  },
  pending: {
    label: 'Pending',
    className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
    icon: Clock,
  },
  failed: {
    label: 'Failed',
    className: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
    icon: XCircle,
  },
};

export const PayoutStatusBadge: React.FC<{ status: PayoutStatus }> = ({ status }) => {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.pending;
  const Icon = config.icon;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${config.className}`}
    >
      <Icon className="h-3 w-3" aria-hidden="true" />
      {config.label}
    </span>
  );
};

// ---------------------------------------------------------------------------
// Balance card
// ---------------------------------------------------------------------------

interface BalanceCardProps {
  label: string;
  xlm: number;
  fiat: string | null;
  icon: typeof Wallet;
  accent: string;
  footnote?: string;
  children?: React.ReactNode;
}

const BalanceCard: React.FC<BalanceCardProps> = ({
  label,
  xlm,
  fiat,
  icon: Icon,
  accent,
  footnote,
  children,
}) => (
  <section
    aria-label={label}
    className="flex flex-col rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800"
  >
    <div className="flex items-center gap-2 text-sm font-medium text-gray-600 dark:text-gray-400">
      <span className={`rounded-lg p-1.5 ${accent}`}>
        <Icon className="h-4 w-4" aria-hidden="true" />
      </span>
      {label}
    </div>
    <p className="mt-3 break-all text-2xl font-bold text-gray-900 dark:text-white">{formatXlm(xlm)}</p>
    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
      {fiat ? `≈ ${fiat}` : 'Fiat rate unavailable'}
    </p>
    {footnote && <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">{footnote}</p>}
    {children && <div className="mt-auto pt-4">{children}</div>}
  </section>
);

// ---------------------------------------------------------------------------
// Withdraw form
// ---------------------------------------------------------------------------

interface WithdrawFormProps {
  availableXlm: number;
  isWithdrawing: boolean;
  validate: UseDriverEarningsResult['validateWithdrawal'];
  onSubmit: UseDriverEarningsResult['withdraw'];
  onCancel: () => void;
}

const WithdrawForm: React.FC<WithdrawFormProps> = ({
  availableXlm,
  isWithdrawing,
  validate,
  onSubmit,
  onCancel,
}) => {
  const [amount, setAmount] = useState('');
  const [destination, setDestination] = useState('');
  const [touched, setTouched] = useState(false);
  const amountId = useId();
  const destinationId = useId();
  const errorId = useId();

  const validation = validate(Number(amount), destination);
  const showError = touched && !validation.isValid;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setTouched(true);
    if (!validation.isValid) return;
    const ok = await onSubmit({ amountXlm: Number(amount), destination });
    if (ok) {
      setAmount('');
      setDestination('');
      setTouched(false);
      onCancel();
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      aria-label="Withdraw to Stellar wallet"
      className="rounded-xl border border-blue-200 bg-blue-50 p-5 dark:border-blue-800 dark:bg-blue-900/20"
    >
      <h3 className="text-base font-semibold text-gray-900 dark:text-white">Withdraw to Stellar wallet</h3>
      <div className="mt-4 grid gap-4 md:grid-cols-[1fr_2fr]">
        <div>
          <label htmlFor={amountId} className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Amount (XLM)
          </label>
          <div className="mt-1 flex gap-2">
            <input
              id={amountId}
              type="number"
              inputMode="decimal"
              min="0"
              step="any"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              onBlur={() => setTouched(true)}
              aria-invalid={showError}
              aria-describedby={showError ? errorId : undefined}
              className="w-full min-w-0 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
              placeholder="0.00"
            />
            <button
              type="button"
              onClick={() => setAmount(String(availableXlm))}
              className="rounded-lg border border-gray-300 px-3 text-xs font-medium text-gray-700 hover:bg-white dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              Max
            </button>
          </div>
        </div>
        <div>
          <label htmlFor={destinationId} className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Destination address
          </label>
          <input
            id={destinationId}
            type="text"
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            onBlur={() => setTouched(true)}
            aria-invalid={showError}
            aria-describedby={showError ? errorId : undefined}
            autoComplete="off"
            spellCheck={false}
            className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 font-mono text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
            placeholder="G..."
          />
        </div>
      </div>
      {showError && (
        <p id={errorId} role="alert" className="mt-3 flex items-center gap-1 text-sm text-red-600 dark:text-red-400">
          <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
          {validation.error}
        </p>
      )}
      <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg px-4 py-2 text-sm font-medium text-gray-700 hover:bg-white dark:text-gray-300 dark:hover:bg-gray-800"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isWithdrawing || (touched && !validation.isValid)}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isWithdrawing && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
          {isWithdrawing ? 'Submitting...' : 'Confirm withdrawal'}
        </button>
      </div>
    </form>
  );
};

// ---------------------------------------------------------------------------
// Payout history
// ---------------------------------------------------------------------------

const shortAddress = (address: string) => `${address.slice(0, 6)}...${address.slice(-6)}`;
const formatDate = (iso: string) =>
  new Date(iso).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });

const PayoutHistory: React.FC<{ payouts: DriverPayout[]; isLoading: boolean; error: string | null }> = ({
  payouts,
  isLoading,
  error,
}) => {
  let body: React.ReactNode;
  if (isLoading) {
    body = (
      <div className="space-y-3 p-5" aria-busy="true">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-10 animate-pulse rounded bg-gray-100 dark:bg-gray-700" />
        ))}
      </div>
    );
  } else if (error) {
    body = <p className="p-5 text-sm text-red-600 dark:text-red-400">{error}</p>;
  } else if (payouts.length === 0) {
    body = <p className="p-5 text-sm text-gray-500 dark:text-gray-400">No payouts yet.</p>;
  } else {
    body = (
      <ul className="divide-y divide-gray-100 dark:divide-gray-700">
        {payouts.map((payout) => (
          <li
            key={payout.id}
            className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1 px-5 py-3 md:grid-cols-[1fr_1fr_auto_auto]"
          >
            <span className="text-sm font-semibold text-gray-900 dark:text-white">{formatXlm(payout.amountXlm)}</span>
            <span className="justify-self-end md:order-last">
              <PayoutStatusBadge status={payout.status} />
            </span>
            <span className="font-mono text-xs text-gray-500 dark:text-gray-400" title={payout.destination}>
              {shortAddress(payout.destination)}
            </span>
            <time
              dateTime={payout.createdAt}
              className="justify-self-end text-xs text-gray-500 dark:text-gray-400 md:justify-self-start"
            >
              {formatDate(payout.createdAt)}
            </time>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <section
      aria-labelledby="payout-history-heading"
      className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800"
    >
      <h3
        id="payout-history-heading"
        className="border-b border-gray-100 px-5 py-4 text-base font-semibold text-gray-900 dark:border-gray-700 dark:text-white"
      >
        Recent payouts
      </h3>
      {body}
    </section>
  );
};

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------

/**
 * DriverEarningsDashboard — balance overview, escrow holdings, lifetime earnings,
 * Stellar withdrawals and recent payout history for drivers.
 */
export default function DriverEarningsDashboard() {
  const {
    summary,
    payouts,
    fiat,
    isLoading,
    isPayoutsLoading,
    error,
    payoutsError,
    isWithdrawing,
    refresh,
    validateWithdrawal,
    withdraw,
  } = useDriverEarnings();
  const [isWithdrawOpen, setIsWithdrawOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-3" aria-busy="true" aria-label="Loading earnings">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-40 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" />
        ))}
      </div>
    );
  }

  if (error || !summary) {
    return (
      <div
        role="alert"
        className="flex flex-col items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-5 dark:border-red-800 dark:bg-red-900/20"
      >
        <p className="flex items-center gap-2 text-sm text-red-700 dark:text-red-300">
          <AlertCircle className="h-4 w-4" aria-hidden="true" />
          {error ?? 'Earnings are unavailable right now.'}
        </p>
        <button
          type="button"
          onClick={() => void refresh()}
          className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700"
        >
          Try again
        </button>
      </div>
    );
  }

  const canWithdraw = summary.availableXlm > 0;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Earnings wallet</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Updated <time dateTime={summary.updatedAt}>{formatDate(summary.updatedAt)}</time>
          </p>
        </div>
        <button
          type="button"
          onClick={() => void refresh()}
          aria-label="Refresh earnings"
          className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
        >
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
          Refresh
        </button>
      </header>

      <div className="grid gap-4 md:grid-cols-3">
        <BalanceCard
          label="Available balance"
          xlm={summary.availableXlm}
          fiat={fiat.available}
          icon={Wallet}
          accent="bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
        >
          <button
            type="button"
            onClick={() => setIsWithdrawOpen(true)}
            disabled={!canWithdraw || isWithdrawOpen}
            aria-expanded={isWithdrawOpen}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
            Withdraw to Stellar wallet
          </button>
          {!canWithdraw && (
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">No funds available to withdraw.</p>
          )}
        </BalanceCard>
        <BalanceCard
          label="Pending escrow"
          xlm={summary.pendingEscrowXlm}
          fiat={fiat.pendingEscrow}
          icon={Lock}
          accent="bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300"
          footnote={`${summary.pendingEscrowCount} ${summary.pendingEscrowCount === 1 ? 'delivery' : 'deliveries'} awaiting release`}
        />
        <BalanceCard
          label="Lifetime earnings"
          xlm={summary.lifetimeEarningsXlm}
          fiat={fiat.lifetimeEarnings}
          icon={TrendingUp}
          accent="bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300"
        />
      </div>

      {isWithdrawOpen && (
        <WithdrawForm
          availableXlm={summary.availableXlm}
          isWithdrawing={isWithdrawing}
          validate={validateWithdrawal}
          onSubmit={withdraw}
          onCancel={() => setIsWithdrawOpen(false)}
        />
      )}

      <PayoutHistory payouts={payouts} isLoading={isPayoutsLoading} error={payoutsError} />
    </div>
  );
}
