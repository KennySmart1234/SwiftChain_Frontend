'use client';

import { useEffect, useState } from 'react';
import { MapPin, Navigation, Package, TrendingUp, Clock, SlidersHorizontal } from 'lucide-react';
import { useBidding } from '@/features/driver/hooks/useBidding';
import type { OpenContract } from '@/features/driver/services/biddingService';

interface BiddingBoardProps {
  driverId: string;
}

/** Formats the remaining milliseconds as `Hh Mm Ss` / `Mm Ss` / `Ss`. */
function formatCountdown(remainingMs: number): string {
  if (remainingMs <= 0) return 'Expired';

  const totalSeconds = Math.floor(remainingMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

interface ContractCardProps {
  contract: OpenContract;
  now: number;
  isSubmitting: boolean;
  onSubmitBid: (contractId: string, amount: number) => void;
}

function ContractCard({ contract, now, isSubmitting, onSubmitBid }: ContractCardProps) {
  const [bidAmount, setBidAmount] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  const remainingMs = new Date(contract.expiresAt).getTime() - now;
  const isExpired = remainingMs <= 0;

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmed = bidAmount.trim();
    if (trimmed === '') {
      setValidationError('Bid amount is required');
      return;
    }

    const amount = Number(trimmed);
    if (Number.isNaN(amount) || amount <= 0) {
      setValidationError('Bid amount must be a positive number');
      return;
    }

    setValidationError(null);
    onSubmitBid(contract.id, amount);
  };

  return (
    <article
      data-testid="contract-card"
      data-expired={isExpired}
      className={`rounded-xl border border-secondary/30 bg-white p-5 shadow-sm transition dark:bg-secondary/10 ${
        isExpired ? 'opacity-50 grayscale' : 'hover:shadow-md'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
          Open for bids
        </span>
        <p className="text-right text-sm font-semibold text-primary">
          {contract.startingPrice.toFixed(2)} XLM
        </p>
      </div>

      <div className="mt-4 space-y-2">
        <div className="flex items-start gap-2">
          <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" />
          <div>
            <p className="text-xs text-secondary">Pickup</p>
            <p className="text-sm font-medium">{contract.pickupAddress}</p>
          </div>
        </div>
        <div className="ml-2 h-4 w-px bg-secondary/30" />
        <div className="flex items-start gap-2">
          <Navigation className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
          <div>
            <p className="text-xs text-secondary">Drop-off</p>
            <p className="text-sm font-medium">{contract.dropoffAddress}</p>
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-4 border-t border-secondary/20 pt-4 text-sm text-secondary">
        <span className="flex items-center gap-1.5">
          <TrendingUp className="h-4 w-4" />
          {contract.estimatedDistance} km
        </span>
        <span className="flex items-center gap-1.5">
          <Package className="h-4 w-4" />
          {contract.packageDescription}
        </span>
      </div>

      <div
        className={`mt-3 flex items-center gap-1.5 text-sm font-medium ${
          isExpired ? 'text-red-500' : 'text-secondary'
        }`}
        data-testid="contract-countdown"
      >
        <Clock className="h-4 w-4" />
        {isExpired ? 'Bidding closed' : `Closes in ${formatCountdown(remainingMs)}`}
      </div>

      {!isExpired && (
        <form onSubmit={handleSubmit} className="mt-4 space-y-2" noValidate>
          <label
            htmlFor={`bid-amount-${contract.id}`}
            className="block text-xs font-medium text-secondary"
          >
            Your bid (XLM)
          </label>
          <div className="flex gap-2">
            <input
              id={`bid-amount-${contract.id}`}
              type="number"
              step="0.01"
              value={bidAmount}
              onChange={(event) => {
                setBidAmount(event.target.value);
                if (validationError) setValidationError(null);
              }}
              placeholder="e.g., 25.00"
              className="w-full rounded-lg border border-secondary/30 px-3 py-2 text-sm focus:border-transparent focus:ring-2 focus:ring-primary"
            />
            <button
              type="submit"
              disabled={isSubmitting}
              className="shrink-0 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Place Bid
            </button>
          </div>
          {validationError && (
            <p role="alert" className="text-xs text-red-600">
              {validationError}
            </p>
          )}
        </form>
      )}
    </article>
  );
}

/**
 * BiddingBoard — displays open contracts available for driver bidding,
 * with per-contract countdown timers, bid submission, and filtering.
 *
 * Follows the Strict Layered Architecture: Component -> Hook -> Service.
 */
export function BiddingBoard({ driverId }: BiddingBoardProps) {
  const {
    filteredContracts,
    isLoading,
    loadError,
    filters,
    setLocation,
    setMinPrice,
    setMaxPrice,
    resetFilters,
    hasActiveFilters,
    availableLocations,
    isSubmitting,
    submitBid,
  } = useBidding(driverId);

  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const handleSubmitBid = (contractId: string, amount: number) => {
    submitBid(contractId, amount).catch(() => {
      // Errors are surfaced via useBidding's submitError; swallow here so a
      // rejected promise doesn't bubble up as an unhandled rejection.
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-3" data-testid="bidding-board-loading">
        {[1, 2, 3].map((key) => (
          <div key={key} className="h-40 animate-pulse rounded-xl bg-secondary/10" />
        ))}
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-center text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
        {loadError}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <section
        aria-label="Bid search filters"
        className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800"
      >
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="h-4 w-4 text-gray-500" aria-hidden="true" />
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Filter contracts</h2>
        </div>

        <div className="mt-4 flex flex-col gap-4 md:flex-row md:items-end">
          <div className="flex-1">
            <label
              htmlFor="bid-location"
              className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Location
            </label>
            <select
              id="bid-location"
              value={filters.location}
              onChange={(event) => setLocation(event.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-transparent focus:ring-2 focus:ring-primary dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            >
              <option value="">All locations</option>
              {availableLocations.map((location) => (
                <option key={location} value={location}>
                  {location}
                </option>
              ))}
            </select>
          </div>

          <div className="flex-1">
            <label
              htmlFor="bid-min-price"
              className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Min price (XLM)
            </label>
            <input
              id="bid-min-price"
              type="number"
              value={filters.minPrice}
              onChange={(event) => setMinPrice(event.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-transparent focus:ring-2 focus:ring-primary dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            />
          </div>

          <div className="flex-1">
            <label
              htmlFor="bid-max-price"
              className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Max price (XLM)
            </label>
            <input
              id="bid-max-price"
              type="number"
              value={filters.maxPrice}
              onChange={(event) => setMaxPrice(event.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-transparent focus:ring-2 focus:ring-primary dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            />
          </div>
        </div>

        {hasActiveFilters && (
          <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-gray-200 pt-4 dark:border-gray-700">
            <span className="text-sm text-gray-600 dark:text-gray-400" data-testid="bid-filter-result-count">
              {filteredContracts.length} matching contract{filteredContracts.length === 1 ? '' : 's'}
            </span>
            <button
              type="button"
              onClick={resetFilters}
              className="ml-auto text-sm font-medium text-gray-500 transition hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              Clear All
            </button>
          </div>
        )}
      </section>

      {filteredContracts.length === 0 ? (
        <div
          data-testid="bidding-board-empty"
          className="rounded-xl border border-dashed border-secondary/30 p-10 text-center text-sm text-secondary"
        >
          No open contracts available right now.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {filteredContracts.map((contract) => (
            <ContractCard
              key={contract.id}
              contract={contract}
              now={now}
              isSubmitting={isSubmitting}
              onSubmitBid={handleSubmitBid}
            />
          ))}
        </div>
      )}
    </div>
  );
}
