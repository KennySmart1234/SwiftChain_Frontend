'use client';

import { useState } from 'react';
import { RefundGridView } from '@/components/admin/refunds/RefundGridView';
import { RefundListView } from '@/components/admin/refunds/RefundListView';
import { RefundTableView } from '@/components/admin/refunds/RefundTableView';
import { RefundTimelineDetail, type RefundAdminView } from '@/components/admin/RefundTimelineDetail';

const VIEWS: RefundAdminView[] = ['list', 'grid', 'table'];

export default function AdminRefundsPage() {
  const [view, setView] = useState<RefundAdminView>('list');
  const [selectedRefundId, setSelectedRefundId] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Refund Processing</h1>
        <div role="group" aria-label="Refund view" className="flex gap-1">
          {VIEWS.map((v) => (
            <button
              key={v}
              type="button"
              aria-pressed={view === v}
              onClick={() => setView(v)}
              className={`rounded-lg px-3 py-1 text-sm capitalize ${
                view === v ? 'bg-indigo-600 text-white' : 'border border-gray-300'
              }`}
            >
              {v}
            </button>
          ))}
        </div>
      </div>
      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div>
          {view === 'list' && <RefundListView onSelectRefund={setSelectedRefundId} />}
          {view === 'grid' && <RefundGridView onSelectRefund={setSelectedRefundId} />}
          {view === 'table' && <RefundTableView onSelectRefund={setSelectedRefundId} />}
        </div>
        <RefundTimelineDetail refundId={selectedRefundId} view={view} />
      </div>
    </div>
  );
}
