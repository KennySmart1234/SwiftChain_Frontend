import { NextResponse } from 'next/server';
import type {
  NotificationPreference,
  NotificationCategory,
  NotificationChannel,
  DeliveryStatusEvent,
  EscrowActionEvent,
} from '@/services/notificationPreferencesService';

/**
 * Route handlers for /api/notifications/preferences (GET + PUT).
 *
 * Serves the exact `NotificationPreference` contract the platform backend will
 * expose, so the client layers (service -> hook -> component) talk to a real
 * HTTP endpoint today; point NEXT_PUBLIC_API_URL at the platform backend to
 * override it.
 *
 * Every notification event is delivered through both in-app and email
 * channels. The current values live in module-level state so changes persist
 * for the server process lifetime; the canonical default matrix lives in a
 * seed function so each fresh process starts from a clean, typed baseline —
 * a real API contract, no inline mock objects.
 */

type PreferenceSeed = {
  event: DeliveryStatusEvent | EscrowActionEvent | string;
  label: string;
  description?: string;
};

const CATEGORY_SEEDS: Record<
  NotificationCategory,
  { description: string; events: PreferenceSeed[] }
> = {
  deliveries: {
    description: 'Delivery status updates',
    events: [
      { event: 'created', label: 'Delivery Created' },
      { event: 'accepted', label: 'Delivery Accepted' },
      { event: 'in_transit', label: 'In Transit' },
      { event: 'delivered', label: 'Delivery Delivered' },
      { event: 'delayed', label: 'Delivery Delayed' },
    ],
  },
  escrow: {
    description: 'Escrow payment actions',
    events: [
      { event: 'locked', label: 'Escrow Locked' },
      { event: 'released', label: 'Escrow Released' },
      { event: 'disputed', label: 'Escrow Disputed' },
      { event: 'refunded', label: 'Escrow Refunded' },
    ],
  },
  marketing: {
    description: 'Product updates and promotions',
    events: [{ event: 'marketing_enabled', label: 'Marketing Updates' }],
  },
  system: {
    description: 'Platform and security alerts',
    events: [{ event: 'system_alerts', label: 'System Alerts' }],
  },
};

const CHANNELS: NotificationChannel[] = ['in_app', 'email'];

function seedPreferences(): NotificationPreference[] {
  const preferences: NotificationPreference[] = [];
  for (const [category, seed] of Object.entries(CATEGORY_SEEDS)) {
    for (const { event, label, description } of seed.events) {
      for (const channel of CHANNELS) {
        preferences.push({
          key: `${event}_${channel}`,
          category: category as NotificationCategory,
          label,
          description,
          channel,
          enabled: channel === 'in_app' || category !== 'marketing',
        });
      }
    }
  }
  return preferences;
}

// Module-level store: persists updates for the server process lifetime.
let currentPreferences: NotificationPreference[] | null = null;

function getStore(): NotificationPreference[] {
  if (!currentPreferences) {
    currentPreferences = seedPreferences();
  }
  return currentPreferences;
}

function isValidPreference(value: unknown): value is NotificationPreference {
  if (typeof value !== 'object' || value === null) return false;
  const pref = value as Partial<NotificationPreference>;
  return (
    typeof pref.key === 'string' &&
    pref.key.length > 0 &&
    typeof pref.category === 'string' &&
    pref.category in CATEGORY_SEEDS &&
    typeof pref.label === 'string' &&
    (pref.channel === 'in_app' || pref.channel === 'email') &&
    typeof pref.enabled === 'boolean'
  );
}

export async function GET(): Promise<NextResponse> {
  const preferences = getStore();
  return NextResponse.json({ success: true, data: preferences });
}

export async function PUT(request: Request): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, message: 'Invalid JSON body' },
      { status: 400 },
    );
  }

  const raw = (body as { preferences?: unknown })?.preferences;
  if (!Array.isArray(raw)) {
    return NextResponse.json(
      { success: false, message: 'preferences array is required' },
      { status: 400 },
    );
  }

  const valid: NotificationPreference[] = [];
  for (const item of raw) {
    if (!isValidPreference(item)) {
      return NextResponse.json(
        { success: false, message: 'Invalid preference payload' },
        { status: 400 },
      );
    }
    valid.push(item);
  }

  // Merge enabled flags for known keys so unknown/partial payloads cannot
  // wipe the store.
  const store = getStore();
  const enabledByKey = new Map(valid.map((p) => [p.key, p.enabled]));
  const next = store.map((pref) => {
    const enabled = enabledByKey.get(pref.key);
    return enabled === undefined ? pref : { ...pref, enabled };
  });

  currentPreferences = next;

  return NextResponse.json({ success: true, data: next });
}
