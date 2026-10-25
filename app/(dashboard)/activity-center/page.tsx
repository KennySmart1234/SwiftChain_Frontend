'use client';

import { useActivityCenter } from '@/hooks/useActivityCenter';
import { ActivityFeedItem } from '@/components/activity/ActivityFeedItem';
import { AlertsBanner } from '@/components/activity/AlertsBanner';
import type { ActivityEventType } from '@/types/activityCenter';

// ---------------------------------------------------------------------------
// Stats card
// ---------------------------------------------------------------------------

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent: string;
}) {
  return (
    <div className="flex flex-col gap-1 rounded-xl border border-gray-100 bg-white px-5 py-4 shadow-sm">
      <span className={`text-2xl font-bold ${accent}`}>{value}</span>
      <span className="text-xs font-medium text-gray-500">{label}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Filter type options
// ---------------------------------------------------------------------------

const FILTER_OPTIONS: { label: string; value: ActivityEventType | 'all' }[] = [
  { label: 'All',        value: 'all'               },
  { label: 'Status',     value: 'status_update'     },
  { label: 'Payments',   value: 'payment'           },
  { label: 'Deliveries', value: 'delivery_created'  },
  { label: 'Completed',  value: 'delivery_completed'},
  { label: 'Alerts',     value: 'alert'             },
  { label: 'Disputes',   value: 'dispute'           },
  { label: 'System',     value: 'system'            },
];

// ---------------------------------------------------------------------------
// Skeleton loader (simple pulse bars)
// ---------------------------------------------------------------------------

function FeedSkeleton() {
  return (
    <ul className="flex flex-col gap-2" aria-label="Loading activity feed">
      {Array.from({ length: 5 }).map((_, i) => (
        <li
          key={i}
          className="flex animate-pulse items-start gap-3 rounded-lg bg-white px-4 py-3"
        >
          <div className="h-8 w-8 shrink-0 rounded-full bg-gray-200" />
          <div className="flex flex-1 flex-col gap-2">
            <div className="h-3 w-1/2 rounded bg-gray-200" />
            <div className="h-3 w-3/4 rounded bg-gray-100" />
          </div>
        </li>
      ))}
    </ul>
  );
}

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------

function EmptyFeed() {
  return (
    <div className="flex flex-col items-center gap-3 py-16 text-center">
      {/* Inbox icon */}
      <svg
        width="40"
        height="40"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-gray-300"
        aria-hidden="true"
      >
        <polyline points="22 12 16 12 14 15 10 15 8 12 2 12" />
        <path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
      </svg>
      <p className="text-sm font-medium text-gray-400">No activity found</p>
      <p className="text-xs text-gray-300">Try clearing the filter to see all events.</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

/**
 * ActivityCenterPage
 *
 * Light-mode hub for tracking shipment status updates and managing
 * delivery alerts. Designed to match the SwiftChain light design system.
 *
 * Layout (top → bottom):
 *   1. Page header + Refresh / Mark-all-read actions
 *   2. Active alerts banner (dismissible per-row)
 *   3. Summary stats bar (4 KPI cards)
 *   4. Filter pill toolbar + unread toggle
 *   5. Activity feed list
 */
export default function ActivityCenterPage() {
  const {
    feed,
    alerts,
    summary,
    filter,
    isLoading,
    error,
    setFilter,
    markAllRead,
    dismissAlert,
    refetch,
  } = useActivityCenter();

  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-6 p-4 sm:p-6">

      {/* ── 1. Page header ─────────────────────────────────────────────── */}
      <header className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Activity Center</h1>
          <p className="text-sm text-gray-500">
            Track shipment updates, payments, and delivery alerts in one place.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {summary.unreadCount > 0 && (
            <button
              type="button"
              onClick={markAllRead}
              className="rounded-md border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              Mark all as read
            </button>
          )}
          <button
            type="button"
            onClick={() => void refetch()}
            disabled={isLoading}
            className="rounded-md bg-primary-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            {isLoading ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>
      </header>

      {/* ── 2. Alerts banner ────────────────────────────────────────────── */}
      <AlertsBanner alerts={alerts} onDismiss={dismissAlert} />

      {/* ── Error state ─────────────────────────────────────────────────── */}
      {error && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {error}
        </div>
      )}

      {/* ── 3. Summary stats bar ────────────────────────────────────────── */}
      <section
        aria-label="Activity summary"
        className="grid grid-cols-2 gap-3 sm:grid-cols-4"
      >
        <StatCard
          label="Total Events"
          value={summary.totalEvents}
          accent="text-gray-800"
        />
        <StatCard
          label="Unread"
          value={summary.unreadCount}
          accent="text-primary-500"
        />
        <StatCard
          label="Active Alerts"
          value={summary.activeAlerts}
          accent="text-amber-500"
        />
        <StatCard
          label="Pending Deliveries"
          value={summary.pendingDeliveries}
          accent="text-green-500"
        />
      </section>

      {/* ── 4. Filter toolbar ───────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 rounded-xl border border-gray-100 bg-white px-4 py-3 shadow-sm">
        {/* Type pills */}
        <div
          role="group"
          aria-label="Filter by event type"
          className="flex flex-wrap gap-2"
        >
          {FILTER_OPTIONS.map((opt) => {
            const active = filter.type === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => setFilter({ type: opt.value })}
                aria-pressed={active}
                className={[
                  'rounded-full px-3 py-1 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500',
                  active
                    ? 'bg-primary-500 text-white shadow-sm'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
                ].join(' ')}
              >
                {opt.label}
              </button>
            );
          })}
        </div>

        {/* Unread toggle */}
        <label className="flex cursor-pointer items-center gap-2 self-start text-xs font-medium text-gray-600">
          <input
            type="checkbox"
            checked={filter.onlyUnread}
            onChange={(e) => setFilter({ onlyUnread: e.target.checked })}
            className="h-4 w-4 rounded border-gray-300 text-primary-500 focus:ring-primary-500"
          />
          Show unread only
          {summary.unreadCount > 0 && (
            <span className="rounded-full bg-primary-50 px-1.5 py-0.5 text-[10px] font-semibold text-primary-500">
              {summary.unreadCount}
            </span>
          )}
        </label>
      </div>

      {/* ── 5. Activity feed ────────────────────────────────────────────── */}
      <section
        aria-label="Activity feed"
        className="rounded-xl border border-gray-100 bg-gray-50 p-2 shadow-sm"
      >
        {isLoading ? (
          <FeedSkeleton />
        ) : feed.length === 0 ? (
          <EmptyFeed />
        ) : (
          <ul className="flex flex-col gap-1">
            {feed.map((item) => (
              <ActivityFeedItem key={item.id} item={item} />
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
