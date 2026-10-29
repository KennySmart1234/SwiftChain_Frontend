'use client';

import { Package } from 'lucide-react';
import type { Delivery } from '@/types/delivery';

interface ActiveDeliveriesGridProps {
  deliveries: Delivery[];
  isLoading?: boolean;
  error?: string | null;
  onRetry?: () => void;
}

const STATUS_COLORS: Record<Delivery['status'], string> = {
  PENDING: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  ACCEPTED: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200',
  IN_TRANSIT: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  DELIVERED: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  CANCELLED: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
};

function formatDate(dateString: string): string {
  const parsed = new Date(dateString);
  if (Number.isNaN(parsed.getTime())) return '--';
  return parsed.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * ActiveDeliveriesGrid — Grid view of active shipments.
 *
 * Responsive layout:
 * - Mobile (< 640px): 1 column (grid-cols-1)
 * - Small to Medium (640px - 1023px): 2 columns (sm:grid-cols-2)
 * - Large and above (≥ 1024px): 3 columns (lg:grid-cols-3)
 *
 * Uses pure CSS Tailwind breakpoints for responsive behavior.
 * Each delivery is rendered as a card with tracking, route, status, amount, and date.
 */
export function ActiveDeliveriesGrid({
  deliveries,
  isLoading = false,
  error = null,
  onRetry,
}: ActiveDeliveriesGridProps) {
  if (isLoading) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="p-6 text-center text-sm text-gray-500 dark:text-gray-400"
      >
        Loading deliveries...
      </div>
    );
  }

  if (error) {
    return (
      <div
        role="alert"
        className="rounded-lg border border-red-200 bg-red-50 p-6 text-center dark:border-red-800 dark:bg-red-900/20"
      >
        <p className="text-sm font-medium text-red-700 dark:text-red-300">{error}</p>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="mt-3 rounded-lg border border-red-200 px-4 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-100 dark:border-red-800 dark:hover:bg-red-900/30"
          >
            Try again
          </button>
        )}
      </div>
    );
  }

  if (deliveries.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-12 text-center">
        <Package className="h-10 w-10 text-gray-300 dark:text-gray-600" aria-hidden="true" />
        <p className="text-base font-medium text-gray-500 dark:text-gray-400">
          No active deliveries
        </p>
        <p className="text-sm text-gray-400 dark:text-gray-500">
          Shipments appear here as soon as they are created.
        </p>
      </div>
    );
  }

  return (
    <ul
      aria-label="Active deliveries grid"
      className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
      data-testid="deliveries-grid"
    >
      {deliveries.map((delivery) => (
        <li key={delivery.id}>
          <article
            data-testid="delivery-card"
            className="flex h-full flex-col justify-between rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900 transition hover:shadow-md"
          >
            {/* Header: Tracking Number & Status Badge */}
            <header className="mb-3 flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <h3
                  data-testid="tracking-number"
                  className="truncate text-sm font-semibold text-gray-900 dark:text-white"
                >
                  {delivery.trackingNumber}
                </h3>
                <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                  Tracking ID
                </p>
              </div>
              <span
                data-testid="status-badge"
                className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                  STATUS_COLORS[delivery.status] ?? ''
                }`}
              >
                {delivery.status}
              </span>
            </header>

            {/* Route Information */}
            <div className="mb-3 pb-3 border-b border-gray-100 dark:border-gray-800">
              <p className="text-xs text-gray-600 dark:text-gray-400 mb-1 font-medium uppercase">
                Route
              </p>
              <p data-testid="route-info" className="text-sm text-gray-900 dark:text-white">
                {delivery.origin} to {delivery.destination}
              </p>
            </div>

            {/* Amount Information */}
            <div className="mb-3">
              <p className="text-xs text-gray-600 dark:text-gray-400 mb-1 font-medium uppercase">
                Amount
              </p>
              <p data-testid="amount-info" className="text-lg font-semibold text-gray-900 dark:text-white">
                {delivery.amount} {delivery.currency ?? 'XLM'}
              </p>
            </div>

            {/* Footer: Created Date */}
            <footer className="border-t border-gray-100 dark:border-gray-800 pt-3 mt-auto">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                <span className="font-medium">Created:</span>{' '}
                <span data-testid="created-date">{formatDate(delivery.createdAt)}</span>
              </p>
            </footer>
          </article>
        </li>
      ))}
    </ul>
  );
}
