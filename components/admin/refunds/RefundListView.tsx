'use client';

import { useAdminRefunds } from '@/hooks/useAdminRefunds';
import { useRefundViewState } from '@/hooks/useRefundViewState';
import { LoadMore, RefundFeedback, RefundToolbar, StatusBadge, formatAmount, formatCell } from './shared';

interface RefundViewProps {
  onSelectRefund?: (refundId: string) => void;
}

/** List view: one card per refund with its key metadata. */
export function RefundListView({ onSelectRefund }: RefundViewProps) {
  const state = useRefundViewState();
  const data = useAdminRefunds(state.filters);

  return (
    <div data-testid="refund-list-view">
      <RefundToolbar state={state} data={data} />
      <RefundFeedback data={data} />
      <ul className="space-y-3">
        {data.refunds.map((refund) => (
          <li
            key={refund.id}
            className="flex items-start gap-3 rounded-xl border border-gray-200 bg-white p-4"
          >
            <input
              type="checkbox"
              aria-label={`Select refund ${refund.id}`}
              checked={state.isSelected(refund.id)}
              onChange={() => state.toggle(refund.id)}
              className="mt-1"
            />
            <button
              type="button"
              onClick={() => onSelectRefund?.(refund.id)}
              className="flex-1 text-left"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-sm font-semibold text-gray-900">{refund.id}</span>
                <StatusBadge status={refund.status} />
              </div>
              <p className="mt-1 text-sm text-gray-700">{formatAmount(refund)}</p>
              <p className="text-xs text-gray-600">Shipment {refund.shipmentId}</p>
              <p className="text-xs text-gray-600">{refund.reason}</p>
              <p className="text-xs text-gray-500">{formatCell(refund, 'createdAt')}</p>
            </button>
          </li>
        ))}
      </ul>
      <LoadMore data={data} />
    </div>
  );
}
