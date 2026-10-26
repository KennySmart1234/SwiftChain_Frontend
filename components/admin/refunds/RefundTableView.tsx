'use client';

import { useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useAdminRefunds } from '@/hooks/useAdminRefunds';
import { useRefundViewState } from '@/hooks/useRefundViewState';
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

const ROW_HEIGHT = 44;
const SCROLL_HEIGHT = 384;

/** Table view: virtualized rows so only the visible window is rendered. */
export function RefundTableView({ onSelectRefund }: RefundViewProps) {
  const state = useRefundViewState();
  const data = useAdminRefunds(state.filters);
  const scrollRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: data.refunds.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 5,
  });

  const allSelected =
    data.refunds.length > 0 && data.refunds.every((r) => state.isSelected(r.id));

  return (
    <div data-testid="refund-table-view">
      <RefundToolbar state={state} data={data} />
      <RefundFeedback data={data} />
      {data.refunds.length > 0 && (
        <div role="table" aria-label="Refunds" className="rounded-xl border border-gray-200 bg-white">
          <div role="row" className="flex items-center gap-2 border-b border-gray-200 px-3 py-2 text-xs font-semibold text-gray-600">
            <div role="columnheader" className="w-8">
              <input
                type="checkbox"
                aria-label="Select all refunds"
                checked={allSelected}
                onChange={() => state.toggleAll(data.refunds)}
              />
            </div>
            {REFUND_COLUMNS.map((col) => (
              <div key={col.key} role="columnheader" className="min-w-0 flex-1 truncate">
                {col.label}
              </div>
            ))}
          </div>
          <div ref={scrollRef} className="overflow-auto" style={{ height: SCROLL_HEIGHT }}>
            <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
              {virtualizer.getVirtualItems().map((item) => {
                const refund = data.refunds[item.index];
                return (
                  <div
                    key={refund.id}
                    role="row"
                    data-index={item.index}
                    onClick={() => onSelectRefund?.(refund.id)}
                    className="absolute left-0 flex w-full cursor-pointer items-center gap-2 border-b border-gray-100 px-3 text-sm hover:bg-gray-50"
                    style={{ height: item.size, transform: `translateY(${item.start}px)` }}
                  >
                    <div role="cell" className="w-8" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        aria-label={`Select refund ${refund.id}`}
                        checked={state.isSelected(refund.id)}
                        onChange={() => state.toggle(refund.id)}
                      />
                    </div>
                    {REFUND_COLUMNS.map((col) => (
                      <div key={col.key} role="cell" className="min-w-0 flex-1 truncate">
                        {col.key === 'status' ? (
                          <StatusBadge status={refund.status} />
                        ) : (
                          formatCell(refund, col.key)
                        )}
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
      <LoadMore data={data} />
    </div>
  );
}
