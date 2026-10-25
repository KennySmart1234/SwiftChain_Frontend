'use client';

import { Check, Copy, Printer } from 'lucide-react';
import { useRefundTimeline } from '@/hooks/useRefundTimeline';

export type RefundAdminView = 'list' | 'grid' | 'table';

interface RefundTimelineDetailProps {
  /** Refund/shipment whose timeline is shown */
  refundId: string | null;
  /** Admin view hosting the panel (list, grid or table) */
  view?: RefundAdminView;
}

interface CopyIdProps {
  label: string;
  value: string;
  copied: boolean;
  onCopy: (value: string) => void;
}

function CopyId({ label, value, copied, onCopy }: CopyIdProps) {
  return (
    <button
      type="button"
      onClick={() => onCopy(value)}
      aria-label={`Copy ${label} ${value}`}
      title={`Copy ${label}`}
      className="inline-flex items-center gap-1 rounded font-mono text-gray-600 hover:text-indigo-600 dark:text-gray-400"
    >
      <span className="max-w-[16rem] truncate">{value}</span>
      {copied ? (
        <Check className="h-3 w-3 text-green-600 print:hidden" aria-hidden />
      ) : (
        <Copy className="h-3 w-3 print:hidden" aria-hidden />
      )}
    </button>
  );
}

/**
 * RefundTimelineDetail — chronological refund timeline for a selected shipment.
 * Reusable across the List, Grid and Table admin views via the `view` prop.
 *
 * Layered Architecture:
 *   RefundTimelineDetail -> useRefundTimeline -> adminRefundService
 */
export function RefundTimelineDetail({ refundId, view = 'list' }: RefundTimelineDetailProps) {
  const { events, isLoading, error, copy, copiedValue } = useRefundTimeline(refundId);
  const onCopy = (value: string) => void copy(value);

  return (
    <section
      data-view={view}
      aria-label="Refund timeline"
      className="w-full rounded-xl border border-gray-200 bg-white p-6 shadow-sm print:border-0 print:shadow-none dark:border-gray-700 dark:bg-gray-900"
    >
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Refund Timeline</h2>
          <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">
            Chronological record of refund actions ({events.length})
          </p>
        </div>
        <button
          type="button"
          onClick={() => window.print()}
          aria-label="Print timeline"
          className="rounded-lg p-2 hover:bg-gray-100 print:hidden dark:hover:bg-gray-800"
        >
          <Printer className="h-4 w-4 text-gray-600 dark:text-gray-400" />
        </button>
      </div>

      {error && (
        <p
          role="alert"
          className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
        >
          {error}
        </p>
      )}

      {isLoading && events.length === 0 && (
        <p className="text-sm text-gray-600 dark:text-gray-400">Loading timeline...</p>
      )}

      {!isLoading && !error && events.length === 0 && (
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {refundId ? 'No refund events yet' : 'Select a refund to view its timeline'}
        </p>
      )}

      {events.length > 0 && (
        <ol>
          {events.map((event, index) => {
            const isLast = index === events.length - 1;
            const date = new Date(event.timestamp);
            return (
              <li key={event.eventId} className="flex gap-4 pb-6">
                <div className="relative flex flex-col items-center">
                  {!isLast && (
                    <div className="absolute left-1/2 top-3 h-full w-0.5 -translate-x-1/2 bg-gray-200 dark:bg-gray-700" />
                  )}
                  <div className="relative z-10 mt-1 h-3 w-3 rounded-full bg-indigo-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    {event.description}
                  </h3>
                  <span className="mt-1 inline-block rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                    {event.action.replace(/-/g, ' ').toUpperCase()}
                  </span>
                  <div className="mt-2 text-xs text-gray-600 dark:text-gray-400">
                    <time dateTime={event.timestamp}>
                      {date.toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}{' '}
                      at {date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                    </time>
                  </div>
                  <div className="mt-2 space-y-1 text-xs text-gray-700 dark:text-gray-300">
                    <p>
                      <span className="font-semibold">Actor:</span>{' '}
                      <CopyId
                        label="actor ID"
                        value={event.actorId}
                        copied={copiedValue === event.actorId}
                        onCopy={onCopy}
                      />
                      {event.actorRole && (
                        <span className="ml-2 text-gray-500">({event.actorRole})</span>
                      )}
                    </p>
                    {event.transactionHash && (
                      <p>
                        <span className="font-semibold">Tx hash:</span>{' '}
                        <CopyId
                          label="transaction hash"
                          value={event.transactionHash}
                          copied={copiedValue === event.transactionHash}
                          onCopy={onCopy}
                        />
                      </p>
                    )}
                    <p>
                      <span className="font-semibold">Event ID:</span>{' '}
                      <CopyId
                        label="event ID"
                        value={event.eventId}
                        copied={copiedValue === event.eventId}
                        onCopy={onCopy}
                      />
                    </p>
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
