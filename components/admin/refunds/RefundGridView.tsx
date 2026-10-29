'use client';

import { useState } from 'react';
import { useAdminRefunds } from '@/hooks/useAdminRefunds';
import { useRefundViewState } from '@/hooks/useRefundViewState';
import type { RefundRecord } from '@/services/adminRefundService';
import {
  LoadMore,
  REFUND_COLUMNS,
  RefundFeedback,
  RefundToolbar,
  StatusBadge,
  formatCell,
} from './shared';

interface RefundViewProps {
  onSelectRefund?: (refundId: string) => void;
}

/** Grid view: compact cards whose visible columns can be toggled. */
export function RefundGridView({ onSelectRefund }: RefundViewProps) {
  const state = useRefundViewState();
  const data = useAdminRefunds(state.filters);
  const [hidden, setHidden] = useState<Set<keyof RefundRecord>>(new Set());

  const toggleColumn = (key: keyof RefundRecord) =>
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const visible = REFUND_COLUMNS.filter((c) => !hidden.has(c.key));

  return (
    <div data-testid="refund-grid-view">
      <RefundToolbar state={state} data={data} />
      <fieldset className="mb-4 flex flex-wrap gap-3 text-sm text-gray-700">
        <legend className="sr-only">Visible columns</legend>
        {REFUND_COLUMNS.filter((c) => c.key !== 'id').map((col) => (
          <label key={col.key} className="flex items-center gap-1">
            <input
              type="checkbox"
              checked={!hidden.has(col.key)}
              onChange={() => toggleColumn(col.key)}
            />
            {col.label}
          </label>
        ))}
      </fieldset>
      <RefundFeedback data={data} />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {data.refunds.map((refund) => (
          <div key={refund.id} className="rounded-xl border border-gray-200 bg-white p-4">
            <div className="mb-2 flex items-center justify-between">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  aria-label={`Select refund ${refund.id}`}
                  checked={state.isSelected(refund.id)}
                  onChange={() => state.toggle(refund.id)}
                />
                <button
                  type="button"
                  onClick={() => onSelectRefund?.(refund.id)}
                  className="font-mono text-sm font-semibold text-indigo-700"
                >
                  {refund.id}
                </button>
              </label>
            </div>
            <dl className="space-y-1 text-sm">
              {visible
                .filter((c) => c.key !== 'id')
                .map((col) => (
                  <div key={col.key} className="flex justify-between gap-2">
                    <dt className="text-gray-500">{col.label}</dt>
                    <dd className="text-gray-900">
                      {col.key === 'status' ? (
                        <StatusBadge status={refund.status} />
                      ) : (
                        formatCell(refund, col.key)
                      )}
                    </dd>
                  </div>
                ))}
            </dl>
          </div>
        ))}
      </div>
      <LoadMore data={data} />
    </div>
  );
}
