'use client';

import type { RefundRecord, RefundStatus } from '@/services/adminRefundService';
import type { UseAdminRefundsResult } from '@/hooks/useAdminRefunds';
import type { UseRefundViewStateResult } from '@/hooks/useRefundViewState';

export const STATUS_OPTIONS: Array<RefundStatus | 'all'> = [
  'all',
  'pending',
  'reviewed',
  'approved',
  'rejected',
  'completed',
];

export interface RefundColumn {
  key: keyof RefundRecord;
  label: string;
}

export const REFUND_COLUMNS: RefundColumn[] = [
  { key: 'id', label: 'Refund ID' },
  { key: 'shipmentId', label: 'Shipment' },
  { key: 'customerId', label: 'Customer' },
  { key: 'amount', label: 'Amount' },
  { key: 'status', label: 'Status' },
  { key: 'reason', label: 'Reason' },
  { key: 'createdAt', label: 'Created' },
];

export function formatAmount(refund: RefundRecord): string {
  return `${refund.amount.toFixed(2)} ${refund.currency}`;
}

export function formatCell(refund: RefundRecord, key: keyof RefundRecord): string {
  if (key === 'amount') return formatAmount(refund);
  if (key === 'createdAt' || key === 'updatedAt') {
    return new Date(refund[key]).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }
  return String(refund[key]);
}

export function StatusBadge({ status }: { status: RefundStatus }) {
  const colors: Record<RefundStatus, string> = {
    pending: 'bg-yellow-100 text-yellow-800',
    reviewed: 'bg-blue-100 text-blue-800',
    approved: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800',
    completed: 'bg-emerald-100 text-emerald-800',
  };
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${colors[status]}`}>
      {status}
    </span>
  );
}

interface RefundToolbarProps {
  state: UseRefundViewStateResult;
  data: UseAdminRefundsResult;
}

/** Status/search filters plus bulk actions shared by every refund view. */
export function RefundToolbar({ state, data }: RefundToolbarProps) {
  const count = state.selectedIds.length;

  const handleBulkReview = async () => {
    const result = await data.bulkMarkReviewed(state.selectedIds);
    state.clearSelection();
    return result;
  };

  return (
    <div className="mb-4 flex flex-wrap items-center gap-3">
      <label className="text-sm text-gray-700">
        <span className="mr-2">Status</span>
        <select
          aria-label="Filter by status"
          value={state.filters.status ?? 'all'}
          onChange={(e) => state.setStatus(e.target.value as RefundStatus | 'all')}
          className="rounded-lg border border-gray-300 px-2 py-1 text-sm"
        >
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </label>
      <input
        type="search"
        aria-label="Search refunds"
        placeholder="Search refunds"
        value={state.filters.search ?? ''}
        onChange={(e) => state.setSearch(e.target.value)}
        className="rounded-lg border border-gray-300 px-3 py-1 text-sm"
      />
      <div className="ml-auto flex items-center gap-2">
        <span className="text-sm text-gray-600" aria-live="polite">
          {count} selected
        </span>
        <button
          type="button"
          disabled={count === 0 || data.isBulkLoading}
          onClick={() => void handleBulkReview()}
          className="rounded-lg bg-indigo-600 px-3 py-1 text-sm text-white disabled:opacity-50"
        >
          Mark reviewed
        </button>
        <button
          type="button"
          disabled={count === 0}
          onClick={() => data.exportSelectedToCsv(state.selectedIds)}
          className="rounded-lg border border-gray-300 px-3 py-1 text-sm disabled:opacity-50"
        >
          Export CSV
        </button>
      </div>
    </div>
  );
}

export function RefundFeedback({ data }: { data: UseAdminRefundsResult }) {
  return (
    <>
      {data.error && (
        <p role="alert" className="mb-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {data.error}
        </p>
      )}
      {data.isLoading && <p className="text-sm text-gray-600">Loading refunds...</p>}
      {!data.isLoading && !data.error && data.refunds.length === 0 && (
        <p className="py-10 text-center text-sm text-gray-600">No refunds found</p>
      )}
    </>
  );
}

export function LoadMore({ data }: { data: UseAdminRefundsResult }) {
  if (!data.hasNextPage) return null;
  return (
    <button
      type="button"
      onClick={() => void data.fetchNextPage()}
      disabled={data.isFetchingNextPage}
      className="mt-4 rounded-lg border border-gray-300 px-4 py-2 text-sm disabled:opacity-50"
    >
      {data.isFetchingNextPage ? 'Loading...' : 'Load more'}
    </button>
  );
}
