'use client';

import { useRef, type KeyboardEvent } from 'react';
import { AlertCircle, ArrowDownUp, Check, Copy, Inbox, RefreshCw } from 'lucide-react';
import { useAuditTrail } from '@/hooks/useAuditTrail';
import type { AuditTrailEvent, AuditTrailMetadataValue } from '@/types/auditTrail';

const SKELETON_COUNT = 3;

interface AuditTrailListProps {
  /** Delivery whose on-chain events are listed. */
  deliveryId: string | null;
  className?: string;
}

/** "escrow_funded" / "escrow-funded" → "Escrow Funded". */
function formatEventType(eventType: string): string {
  return eventType
    .split(/[_\-\s]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

function shorten(value: string, edge = 6): string {
  return value.length > edge * 2 + 1 ? `${value.slice(0, edge)}…${value.slice(-edge)}` : value;
}

function formatTimestamp(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'Unknown time';
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function formatMetadataKey(key: string): string {
  return formatEventType(key.replace(/([a-z])([A-Z])/g, '$1 $2'));
}

function formatMetadataValue(value: AuditTrailMetadataValue): string {
  if (value === null) return '—';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  return String(value);
}

function SkeletonCard() {
  return (
    <li className="animate-pulse rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
      <div className="flex items-center justify-between gap-3">
        <div className="h-5 w-32 rounded-full bg-gray-200 dark:bg-gray-700" />
        <div className="h-4 w-40 rounded bg-gray-200 dark:bg-gray-700" />
      </div>
      <div className="mt-4 h-4 w-56 rounded bg-gray-200 dark:bg-gray-700" />
      <div className="mt-3 grid grid-cols-2 gap-2">
        <div className="h-4 rounded bg-gray-100 dark:bg-gray-800" />
        <div className="h-4 rounded bg-gray-100 dark:bg-gray-800" />
      </div>
      <div className="mt-4 h-4 w-48 rounded bg-gray-100 dark:bg-gray-800" />
    </li>
  );
}

interface EventCardProps {
  event: AuditTrailEvent;
  isCopied: boolean;
  onCopy: (_eventId: string) => void;
  cardRef: (_node: HTMLElement | null) => void;
}

function EventCard({ event, isCopied, onCopy, cardRef }: EventCardProps) {
  const titleId = `audit-event-${event.eventId}`;
  const metadata = Object.entries(event.metadata ?? {});

  return (
    <li>
      <article
        ref={cardRef}
        tabIndex={0}
        aria-labelledby={titleId}
        data-audit-card
        className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm outline-none transition-shadow hover:shadow-md focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 dark:border-gray-700 dark:bg-gray-900 dark:focus-visible:ring-offset-gray-900"
      >
        <header className="flex flex-wrap items-start justify-between gap-2">
          <h3
            id={titleId}
            className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-semibold text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300"
          >
            {formatEventType(event.eventType)}
          </h3>
          <time dateTime={event.timestamp} className="text-xs text-gray-600 dark:text-gray-400">
            {formatTimestamp(event.timestamp)}
          </time>
        </header>

        <dl className="mt-3 space-y-1 text-sm">
          <div className="flex flex-wrap gap-x-2">
            <dt className="font-medium text-gray-700 dark:text-gray-300">Actor</dt>
            <dd className="min-w-0 text-gray-900 dark:text-gray-100">
              {event.actor.displayName && <span className="mr-1">{event.actor.displayName}</span>}
              <span className="font-mono text-gray-600 dark:text-gray-400" title={event.actor.address}>
                {shorten(event.actor.address)}
              </span>
              {event.actor.role && (
                <span className="ml-2 rounded bg-gray-100 px-1.5 py-0.5 text-xs capitalize text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                  {event.actor.role}
                </span>
              )}
            </dd>
          </div>
          {event.txHash && (
            <div className="flex flex-wrap gap-x-2">
              <dt className="font-medium text-gray-700 dark:text-gray-300">Transaction</dt>
              <dd className="font-mono text-gray-600 dark:text-gray-400" title={event.txHash}>
                {shorten(event.txHash, 8)}
              </dd>
            </div>
          )}
          {event.ledger !== undefined && (
            <div className="flex flex-wrap gap-x-2">
              <dt className="font-medium text-gray-700 dark:text-gray-300">Ledger</dt>
              <dd className="text-gray-600 dark:text-gray-400">
                {event.ledger.toLocaleString('en-US')}
              </dd>
            </div>
          )}
        </dl>

        {metadata.length > 0 && (
          <dl
            aria-label="Event metadata"
            className="mt-3 grid grid-cols-1 gap-x-4 gap-y-1 rounded-lg bg-gray-50 p-3 text-xs sm:grid-cols-2 dark:bg-gray-800/60"
          >
            {metadata.map(([key, value]) => (
              <div key={key} className="flex min-w-0 gap-2">
                <dt className="shrink-0 text-gray-600 dark:text-gray-400">{formatMetadataKey(key)}</dt>
                <dd className="truncate font-medium text-gray-900 dark:text-gray-100" title={formatMetadataValue(value)}>
                  {formatMetadataValue(value)}
                </dd>
              </div>
            ))}
          </dl>
        )}

        <footer className="mt-3 flex items-center justify-between gap-2 border-t border-gray-100 pt-3 dark:border-gray-800">
          <p className="min-w-0 truncate text-xs text-gray-600 dark:text-gray-400">
            Event ID{' '}
            <span className="font-mono text-gray-800 dark:text-gray-200" title={event.eventId}>
              {event.eventId}
            </span>
          </p>
          <button
            type="button"
            onClick={() => onCopy(event.eventId)}
            aria-label={`Copy event ID ${event.eventId}`}
            className="inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-indigo-600 hover:bg-indigo-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:text-indigo-400 dark:hover:bg-indigo-900/30"
          >
            {isCopied ? <Check className="h-3.5 w-3.5" aria-hidden /> : <Copy className="h-3.5 w-3.5" aria-hidden />}
            <span aria-live="polite">{isCopied ? 'Copied' : 'Copy'}</span>
          </button>
        </footer>
      </article>
    </li>
  );
}

/**
 * AuditTrailList — read-only list of immutable blockchain events for a delivery.
 *
 * Layered Architecture:
 *   AuditTrailList (Component) → useAuditTrail (Hook) → auditTrailService (Service)
 *
 * Cards are keyboard navigable: Tab moves through them, and Arrow Up/Down,
 * Home and End move focus between cards.
 */
export function AuditTrailList({ deliveryId, className = '' }: AuditTrailListProps) {
  const {
    events,
    sortOrder,
    toggleSortOrder,
    isLoading,
    isRefetching,
    error,
    retry,
    copiedEventId,
    copyEventId,
  } = useAuditTrail(deliveryId);
  const cardRefs = useRef<(HTMLElement | null)[]>([]);

  const handleListKeyDown = (e: KeyboardEvent<HTMLOListElement>) => {
    const cards = cardRefs.current.slice(0, events.length);
    const current = cards.findIndex((card) => card === e.target);
    if (current === -1) return;

    const last = cards.length - 1;
    const next: Record<string, number> = {
      ArrowDown: Math.min(current + 1, last),
      ArrowUp: Math.max(current - 1, 0),
      Home: 0,
      End: last,
    };
    if (!(e.key in next)) return;
    e.preventDefault();
    cards[next[e.key]]?.focus();
  };

  const sortLabel = sortOrder === 'newest' ? 'Newest first' : 'Oldest first';

  return (
    <section
      aria-labelledby="audit-trail-heading"
      className={`w-full rounded-xl border border-gray-200 bg-gray-50 p-4 sm:p-6 dark:border-gray-700 dark:bg-gray-950 ${className}`}
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="audit-trail-heading" className="text-lg font-semibold text-gray-900 dark:text-white">
            Audit Trail
          </h2>
          <p className="mt-0.5 text-xs text-gray-600 dark:text-gray-400">
            Immutable smart contract events for this delivery
          </p>
        </div>
        {deliveryId && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleSortOrder}
              disabled={events.length < 2}
              aria-label={`Sort order: ${sortLabel}. Activate to reverse.`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              <ArrowDownUp className="h-3.5 w-3.5" aria-hidden />
              {sortLabel}
            </button>
            <button
              type="button"
              onClick={retry}
              disabled={isLoading || isRefetching}
              aria-label="Refresh audit trail"
              className="rounded-lg p-2 text-gray-600 hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:opacity-50 dark:text-gray-400 dark:hover:bg-gray-800"
            >
              <RefreshCw className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} aria-hidden />
            </button>
          </div>
        )}
      </div>

      {!deliveryId && (
        <p className="py-10 text-center text-sm text-gray-600 dark:text-gray-400">
          Select a delivery to view its audit trail.
        </p>
      )}

      {deliveryId && isLoading && (
        <>
          <p role="status" className="sr-only">
            Loading audit events
          </p>
          <ol aria-hidden className="space-y-3" data-testid="audit-trail-skeleton">
            {Array.from({ length: SKELETON_COUNT }, (_, i) => (
              <SkeletonCard key={i} />
            ))}
          </ol>
        </>
      )}

      {deliveryId && !isLoading && error && (
        <div
          role="alert"
          className="flex flex-col items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-8 text-center dark:border-red-800 dark:bg-red-900/20"
        >
          <AlertCircle className="h-6 w-6 text-red-600 dark:text-red-400" aria-hidden />
          <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
          <button
            type="button"
            onClick={retry}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2"
          >
            Retry
          </button>
        </div>
      )}

      {deliveryId && !isLoading && !error && events.length === 0 && (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-gray-300 bg-white px-4 py-10 text-center dark:border-gray-700 dark:bg-gray-900">
          <Inbox className="h-8 w-8 text-gray-400" aria-hidden />
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-white">No events recorded yet</p>
            <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">
              Contract events appear here once they are confirmed on-chain.
            </p>
          </div>
          <button
            type="button"
            onClick={retry}
            disabled={isRefetching}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:opacity-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            Retry
          </button>
        </div>
      )}

      {deliveryId && !isLoading && !error && events.length > 0 && (
        <ol aria-label={`Audit trail events, ${sortLabel.toLowerCase()}`} onKeyDown={handleListKeyDown} className="space-y-3">
          {events.map((event, index) => (
            <EventCard
              key={event.eventId}
              event={event}
              isCopied={copiedEventId === event.eventId}
              onCopy={(id) => void copyEventId(id)}
              cardRef={(node) => {
                cardRefs.current[index] = node;
              }}
            />
          ))}
        </ol>
      )}
    </section>
  );
}
