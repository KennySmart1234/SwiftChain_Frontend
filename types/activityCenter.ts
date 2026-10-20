/**
 * Activity Center types for SwiftChain Frontend.
 * Covers the activity feed, delivery alerts, and filter state.
 */

/** Possible categories for an activity feed event */
export type ActivityEventType =
  | 'status_update'
  | 'payment'
  | 'alert'
  | 'driver_assigned'
  | 'delivery_created'
  | 'delivery_completed'
  | 'dispute'
  | 'system';

/** Severity level for alert banners */
export type AlertSeverity = 'info' | 'warning' | 'error' | 'success';

/** A single item in the activity feed */
export interface ActivityFeedItem {
  id: string;
  type: ActivityEventType;
  title: string;
  description: string;
  /** ISO 8601 timestamp */
  timestamp: string;
  read: boolean;
  /** Related shipment / delivery identifier, if applicable */
  shipmentId?: string;
  /** Short tracking reference shown as a pill */
  trackingRef?: string;
  /** Optional metadata (e.g. driver name, amount) */
  meta?: Record<string, string | number>;
}

/** An alert that appears in the banner strip at the top of the page */
export interface ActivityAlert {
  id: string;
  severity: AlertSeverity;
  message: string;
  /** Optional CTA label */
  actionLabel?: string;
  /** Optional CTA href */
  actionHref?: string;
  dismissed: boolean;
}

/** Summary counters shown in the stats bar */
export interface ActivitySummary {
  totalEvents: number;
  unreadCount: number;
  activeAlerts: number;
  pendingDeliveries: number;
}

/** Filter state controlled by the top toolbar */
export interface ActivityFilter {
  type: ActivityEventType | 'all';
  onlyUnread: boolean;
  /** ISO 8601 date string (start of range) */
  from?: string;
  /** ISO 8601 date string (end of range) */
  to?: string;
}

/** Full shape of data returned by useActivityCenter */
export interface ActivityCenterState {
  feed: ActivityFeedItem[];
  alerts: ActivityAlert[];
  summary: ActivitySummary;
  filter: ActivityFilter;
  isLoading: boolean;
  error: string | null;
  setFilter: (filter: Partial<ActivityFilter>) => void;
  markAllRead: () => void;
  dismissAlert: (id: string) => void;
  refetch: () => void;
}
