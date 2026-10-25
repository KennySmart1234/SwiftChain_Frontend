'use client';

import type { ActivityFeedItem as ActivityFeedItemType, ActivityEventType } from '@/types/activityCenter';

// ---------------------------------------------------------------------------
// Icon helpers
// ---------------------------------------------------------------------------

function EventIcon({ type }: { type: ActivityEventType }) {
  const icons: Record<ActivityEventType, React.ReactNode> = {
    status_update: (
      // Refresh / arrows
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <polyline points="23 4 23 10 17 10" />
        <polyline points="1 20 1 14 7 14" />
        <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
      </svg>
    ),
    payment: (
      // Credit card / coin
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
        <line x1="1" y1="10" x2="23" y2="10" />
      </svg>
    ),
    alert: (
      // Warning triangle
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
    ),
    driver_assigned: (
      // User check
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <polyline points="16 11 18 13 22 9" />
      </svg>
    ),
    delivery_created: (
      // Package plus
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 2L2 7l10 5 10-5-10-5z" />
        <path d="M2 17l10 5 10-5" />
        <path d="M2 12l10 5 10-5" />
      </svg>
    ),
    delivery_completed: (
      // Check circle
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
        <polyline points="22 4 12 14.01 9 11.01" />
      </svg>
    ),
    dispute: (
      // Shield alert
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
    ),
    system: (
      // Settings / gear
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </svg>
    ),
  };

  return <>{icons[type]}</>;
}

// ---------------------------------------------------------------------------
// Icon background / colour palette (light mode)
// ---------------------------------------------------------------------------

const TYPE_STYLES: Record<ActivityEventType, { bg: string; text: string }> = {
  status_update:    { bg: 'bg-blue-100',   text: 'text-blue-600'   },
  payment:          { bg: 'bg-amber-100',  text: 'text-amber-600'  },
  alert:            { bg: 'bg-red-100',    text: 'text-red-600'    },
  driver_assigned:  { bg: 'bg-violet-100', text: 'text-violet-600' },
  delivery_created: { bg: 'bg-sky-100',    text: 'text-sky-600'    },
  delivery_completed:{ bg: 'bg-green-100', text: 'text-green-600'  },
  dispute:          { bg: 'bg-rose-100',   text: 'text-rose-600'   },
  system:           { bg: 'bg-gray-100',   text: 'text-gray-500'   },
};

// ---------------------------------------------------------------------------
// Relative-time helper
// ---------------------------------------------------------------------------

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface ActivityFeedItemProps {
  item: ActivityFeedItemType;
}

/**
 * ActivityFeedItem
 *
 * Renders a single row in the Activity Center feed. Highlights unread items
 * with a blue left border and bold text. Uses light-mode palette.
 */
export function ActivityFeedItem({ item }: ActivityFeedItemProps) {
  const { bg, text } = TYPE_STYLES[item.type];

  return (
    <li
      className={[
        'group flex items-start gap-3 rounded-lg px-4 py-3 transition-colors',
        item.read
          ? 'bg-white hover:bg-gray-50'
          : 'border-l-2 border-primary-500 bg-blue-50/60 hover:bg-blue-50',
      ].join(' ')}
    >
      {/* Icon bubble */}
      <div
        className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${bg} ${text}`}
        aria-hidden="true"
      >
        <EventIcon type={item.type} />
      </div>

      {/* Content */}
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <div className="flex items-start justify-between gap-2">
          <p
            className={`text-sm leading-snug ${
              item.read ? 'font-normal text-gray-700' : 'font-semibold text-gray-900'
            }`}
          >
            {item.title}
          </p>
          <span className="shrink-0 text-xs text-gray-400" suppressHydrationWarning>
            {relativeTime(item.timestamp)}
          </span>
        </div>

        <p className="line-clamp-2 text-xs text-gray-500">{item.description}</p>

        {/* Tracking pill */}
        {item.trackingRef && (
          <span className="mt-1 inline-flex w-fit items-center rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-600">
            {item.trackingRef}
          </span>
        )}
      </div>

      {/* Unread dot */}
      {!item.read && (
        <div
          className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary-500"
          aria-label="Unread"
        />
      )}
    </li>
  );
}
