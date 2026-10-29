'use client';

import axios from 'axios';
import { useCallback, useEffect, useState } from 'react';
import { analyticsService } from '@/services/analyticsService';
import type {
  AnalyticsPeriod,
  FleetAnalytics,
  PerformanceMetrics,
} from '@/types/analytics';

export interface UseAnalyticsMetricsResult {
  fleet: FleetAnalytics | null;
  performance: PerformanceMetrics | null;
  period: AnalyticsPeriod;
  isLoading: boolean;
  error: string | null;
  setPeriod: (_period: AnalyticsPeriod) => void;
  refetch: () => Promise<void>;
}

export function useAnalyticsMetrics(
  initialPeriod: AnalyticsPeriod = '30d'
): UseAnalyticsMetricsResult {
  const [period, setPeriod] = useState<AnalyticsPeriod>(initialPeriod);
  const [fleet, setFleet] = useState<FleetAnalytics | null>(null);
  const [performance, setPerformance] = useState<PerformanceMetrics | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadTick, setReloadTick] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;

    analyticsService
      .getFleetAnalytics(period, controller.signal)
      .then((response) => {
        if (cancelled) return;
        setFleet(response.fleet);
        setPerformance(response.performance);
        setError(null);
      })
      .catch((err: unknown) => {
        if (cancelled || axios.isCancel(err)) return;
        setError(
          err instanceof Error && err.message
            ? err.message
            : 'Failed to load analytics metrics'
        );
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [period, reloadTick]);

  const changePeriod = useCallback((nextPeriod: AnalyticsPeriod): void => {
    setIsLoading(true);
    setError(null);
    setPeriod(nextPeriod);
  }, []);

  const refetch = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setError(null);
    setReloadTick((tick) => tick + 1);
  }, []);

  return {
    fleet,
    performance,
    period,
    isLoading,
    error,
    setPeriod: changePeriod,
    refetch,
  };
}
