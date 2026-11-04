import { useCallback, useEffect, useMemo, useState } from 'react';
import { isCancel } from '@/lib/httpClient';
import { fleetService } from '@/services/fleetService';
import type { Driver, FleetSummary } from '@/types/fleet';

interface UseFleetResult {
  drivers: Driver[];
  summary: FleetSummary | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

const EMPTY_SUMMARY: FleetSummary = {
  totalDrivers: 0,
  activeDrivers: 0,
  onDelivery: 0,
  idle: 0,
  offline: 0,
};

/**
 * useFleet — single source for fleet data (drivers + aggregate summary).
 *
 * Components consume this hook; they never call fleetService directly.
 * Aborts in-flight requests on unmount or refetch to avoid setting state
 * on an unmounted component.
 */
export function useFleet(): UseFleetResult {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [summary, setSummary] = useState<FleetSummary | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadTick, setReloadTick] = useState<number>(0);

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;

    fleetService
      .getFleet(controller.signal)
      .then((data) => {
        if (cancelled) return;
        setDrivers(data.drivers);
        setSummary(data.summary);
        setError(null);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        if (isCancel(err)) return;
        const message =
          err instanceof Error && err.message
            ? err.message
            : 'Failed to load fleet data';
        setError(message);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [reloadTick]);

  const refetch = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setError(null);
    setReloadTick((tick) => tick + 1);
  }, []);

  const safeSummary = useMemo<FleetSummary | null>(
    () => summary ?? (drivers.length === 0 && !isLoading ? EMPTY_SUMMARY : null),
    [summary, drivers.length, isLoading],
  );

  return {
    drivers,
    summary: safeSummary,
    isLoading,
    error,
    refetch,
  };
}
