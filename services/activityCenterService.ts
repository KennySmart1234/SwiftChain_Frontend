/**
 * Activity Center service.
 *
 * Provides mock data (to be replaced with real API calls once the backend
 * endpoint is available) and helper utilities for the activity feed and
 * alert strip.
 */

import type {
  ActivityFeedItem,
  ActivityAlert,
  ActivitySummary,
  ActivityFilter,
} from '@/types/activityCenter';

// ---------------------------------------------------------------------------
// Mock seed data
// ---------------------------------------------------------------------------

const MOCK_FEED: ActivityFeedItem[] = [
  {
    id: 'act-001',
    type: 'delivery_created',
    title: 'New delivery created',
    description: 'Shipment #SWC-4821 was created from Lagos to Abuja.',
    timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    read: false,
    shipmentId: 'SWC-4821',
    trackingRef: 'SWC-4821',
  },
  {
    id: 'act-002',
    type: 'driver_assigned',
    title: 'Driver assigned',
    description: 'Emeka Okafor has been assigned to shipment #SWC-4821.',
    timestamp: new Date(Date.now() - 22 * 60 * 1000).toISOString(),
    read: false,
    shipmentId: 'SWC-4821',
    trackingRef: 'SWC-4821',
    meta: { driverName: 'Emeka Okafor' },
  },
  {
    id: 'act-003',
    type: 'status_update',
    title: 'Package in transit',
    description: 'Shipment #SWC-4810 is now in transit — estimated arrival in 3 hours.',
    timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
    read: false,
    shipmentId: 'SWC-4810',
    trackingRef: 'SWC-4810',
  },
  {
    id: 'act-004',
    type: 'payment',
    title: 'Escrow funds locked',
    description: '45 XLM locked in escrow for shipment #SWC-4800.',
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    read: true,
    shipmentId: 'SWC-4800',
    trackingRef: 'SWC-4800',
    meta: { amount: '45 XLM' },
  },
  {
    id: 'act-005',
    type: 'delivery_completed',
    title: 'Delivery confirmed',
    description: 'Recipient confirmed receipt of shipment #SWC-4795. Payment released.',
    timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    read: true,
    shipmentId: 'SWC-4795',
    trackingRef: 'SWC-4795',
  },
  {
    id: 'act-006',
    type: 'alert',
    title: 'Delivery delayed',
    description: 'Shipment #SWC-4780 is delayed due to road conditions.',
    timestamp: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
    read: true,
    shipmentId: 'SWC-4780',
    trackingRef: 'SWC-4780',
  },
  {
    id: 'act-007',
    type: 'dispute',
    title: 'Dispute opened',
    description: 'A dispute has been filed for shipment #SWC-4770.',
    timestamp: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
    read: true,
    shipmentId: 'SWC-4770',
    trackingRef: 'SWC-4770',
  },
  {
    id: 'act-008',
    type: 'system',
    title: 'System maintenance scheduled',
    description: 'Scheduled maintenance window: Oct 22, 02:00 – 04:00 WAT.',
    timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    read: true,
  },
];

const MOCK_ALERTS: ActivityAlert[] = [
  {
    id: 'alrt-001',
    severity: 'warning',
    message: 'Shipment #SWC-4780 is delayed — estimated delivery pushed by 4 hours.',
    actionLabel: 'View Shipment',
    actionHref: '/dashboard/deliveries/SWC-4780',
    dismissed: false,
  },
  {
    id: 'alrt-002',
    severity: 'error',
    message: 'Dispute opened on shipment #SWC-4770. Action required.',
    actionLabel: 'Resolve Dispute',
    actionHref: '/dashboard/deliveries/SWC-4770',
    dismissed: false,
  },
];

// ---------------------------------------------------------------------------
// Service functions
// ---------------------------------------------------------------------------

/**
 * Fetch the activity feed.
 * Simulates a network delay; swap out for a real API call when ready.
 */
export async function fetchActivityFeed(
  filter?: Partial<ActivityFilter>
): Promise<ActivityFeedItem[]> {
  await simulateDelay(400);

  let feed = [...MOCK_FEED];

  if (filter?.type && filter.type !== 'all') {
    feed = feed.filter((item) => item.type === filter.type);
  }
  if (filter?.onlyUnread) {
    feed = feed.filter((item) => !item.read);
  }
  if (filter?.from) {
    const from = new Date(filter.from).getTime();
    feed = feed.filter((item) => new Date(item.timestamp).getTime() >= from);
  }
  if (filter?.to) {
    const to = new Date(filter.to).getTime();
    feed = feed.filter((item) => new Date(item.timestamp).getTime() <= to);
  }

  return feed;
}

/**
 * Fetch active (non-dismissed) alerts.
 */
export async function fetchActivityAlerts(): Promise<ActivityAlert[]> {
  await simulateDelay(200);
  return MOCK_ALERTS.filter((a) => !a.dismissed);
}

/**
 * Derive summary counters from raw feed + alerts.
 */
export function computeActivitySummary(
  feed: ActivityFeedItem[],
  alerts: ActivityAlert[]
): ActivitySummary {
  return {
    totalEvents: feed.length,
    unreadCount: feed.filter((i) => !i.read).length,
    activeAlerts: alerts.filter((a) => !a.dismissed).length,
    pendingDeliveries: feed.filter(
      (i) => i.type === 'status_update' || i.type === 'driver_assigned'
    ).length,
  };
}

/**
 * Mark all feed items as read (returns updated feed).
 */
export function markAllFeedRead(feed: ActivityFeedItem[]): ActivityFeedItem[] {
  return feed.map((item) => ({ ...item, read: true }));
}

/**
 * Dismiss a single alert by id (returns updated alerts).
 */
export function dismissActivityAlert(
  alerts: ActivityAlert[],
  id: string
): ActivityAlert[] {
  return alerts.map((a) => (a.id === id ? { ...a, dismissed: true } : a));
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function simulateDelay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
