import { shipmentHandoffService } from '@/services/shipmentHandoffService';

export type HandoffSyncState = 'synced' | 'pending' | 'failed';

export interface QueuedHandoffScan {
  id: string;
  deliveryId: string;
  token: string;
  scannedAt: string;
  attempts: number;
  nextAttemptAt: number;
}

export interface HandoffSyncResult {
  synced: number;
  failed: number;
  pending: number;
  nextRetryAt: number | null;
}

const STORAGE_KEY = 'swiftchain:handoff-scan-queue:v1';
const MAX_BACKOFF_MS = 5 * 60 * 1000;

function readQueue(): QueuedHandoffScan[] {
  if (typeof window === 'undefined') return [];
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    if (!value) return [];
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? (parsed as QueuedHandoffScan[]) : [];
  } catch {
    return [];
  }
}

function writeQueue(queue: QueuedHandoffScan[]) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
}

function createId(deliveryId: string, scannedAt: string) {
  return `${deliveryId}:${scannedAt}:${Math.random().toString(36).slice(2)}`;
}

export const offlineHandoffService = {
  getQueue: readQueue,

  enqueue(deliveryId: string, token: string): QueuedHandoffScan {
    const scannedAt = new Date().toISOString();
    const item: QueuedHandoffScan = {
      id: createId(deliveryId, scannedAt),
      deliveryId,
      token,
      scannedAt,
      attempts: 0,
      nextAttemptAt: 0,
    };
    writeQueue([...readQueue(), item]);
    return item;
  },

  pendingCount() {
    return readQueue().length;
  },

  clear() {
    writeQueue([]);
  },

  async requestBackgroundSync() {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
    try {
      const registration = await navigator.serviceWorker.ready;
      const syncRegistration = registration as ServiceWorkerRegistration & {
        sync?: { register: (_tag: string) => Promise<void> };
      };
      await syncRegistration.sync?.register('swiftchain-handoff-sync');
    } catch {
      // The online listener remains the fallback when background sync is unavailable.
    }
  },

  async syncPending(now = Date.now()): Promise<HandoffSyncResult> {
    const queue = readQueue();
    const remaining: QueuedHandoffScan[] = [];
    let synced = 0;
    let failed = 0;

    for (const item of queue) {
      if (item.nextAttemptAt > now) {
        remaining.push(item);
        continue;
      }
      try {
        await shipmentHandoffService.verifyHandoffQR(item.deliveryId, item.token);
        synced += 1;
      } catch {
        const attempts = item.attempts + 1;
        const delay = Math.min(1000 * 2 ** (attempts - 1), MAX_BACKOFF_MS);
        remaining.push({ ...item, attempts, nextAttemptAt: now + delay });
        failed += 1;
      }
    }

    writeQueue(remaining);
    const nextRetryAt = remaining.reduce<number | null>(
      (earliest, item) =>
        earliest === null || item.nextAttemptAt < earliest
          ? item.nextAttemptAt
          : earliest,
      null,
    );
    return { synced, failed, pending: remaining.length, nextRetryAt };
  },
};

export { STORAGE_KEY as OFFLINE_HANDOFF_STORAGE_KEY };
