'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  HandoffSyncState,
  offlineHandoffService,
} from '@/services/offlineHandoffService';
import { shipmentHandoffService } from '@/services/shipmentHandoffService';

export function useOfflineHandoffSync(enabled = true) {
  const [isOnline, setIsOnline] = useState(
    () => typeof navigator === 'undefined' || navigator.onLine,
  );
  const [syncState, setSyncState] = useState<HandoffSyncState>(
    () => (offlineHandoffService.pendingCount() > 0 ? 'pending' : 'synced'),
  );
  const [pendingCount, setPendingCount] = useState(
    () => offlineHandoffService.pendingCount(),
  );
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const syncRef = useRef<() => Promise<void>>(async () => undefined);

  const refreshCount = useCallback(() => {
    const count = offlineHandoffService.pendingCount();
    setPendingCount(count);
    return count;
  }, []);

  const sync = useCallback(async () => {
    if (!enabled || typeof navigator !== 'undefined' && !navigator.onLine) return;
    const result = await offlineHandoffService.syncPending();
    refreshCount();
    setSyncState(result.failed > 0 ? 'failed' : result.pending > 0 ? 'pending' : 'synced');

    if (retryTimer.current) clearTimeout(retryTimer.current);
    if (result.nextRetryAt !== null) {
      retryTimer.current = setTimeout(
        () => void syncRef.current(),
        Math.max(0, result.nextRetryAt - Date.now()),
      );
    }
  }, [enabled, refreshCount]);

  useEffect(() => {
    syncRef.current = sync;
  }, [sync]);

  const processScan = useCallback(
    async (deliveryId: string, token: string) => {
      if (!enabled) return 'failed' as const;
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        offlineHandoffService.enqueue(deliveryId, token);
        await offlineHandoffService.requestBackgroundSync();
        refreshCount();
        setSyncState('pending');
        return 'pending' as const;
      }

      try {
        await shipmentHandoffService.verifyHandoffQR(deliveryId, token);
        setSyncState('synced');
        return 'synced' as const;
      } catch {
        offlineHandoffService.enqueue(deliveryId, token);
        await offlineHandoffService.requestBackgroundSync();
        refreshCount();
        setSyncState('failed');
        if (retryTimer.current) clearTimeout(retryTimer.current);
        retryTimer.current = setTimeout(() => void syncRef.current(), 1000);
        return 'failed' as const;
      }
    },
    [enabled, refreshCount],
  );

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;

    const handleOnline = () => {
      setIsOnline(true);
      void sync();
    };
    const handleOffline = () => {
      setIsOnline(false);
      if (refreshCount() > 0) setSyncState('pending');
    };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    const initialSyncTimer =
      navigator.onLine && pendingCount > 0
        ? setTimeout(() => void sync(), 0)
        : null;

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (initialSyncTimer) clearTimeout(initialSyncTimer);
      if (retryTimer.current) clearTimeout(retryTimer.current);
    };
  }, [enabled, pendingCount, refreshCount, sync]);

  return { isOnline, syncState, pendingCount, processScan, retry: sync };
}
