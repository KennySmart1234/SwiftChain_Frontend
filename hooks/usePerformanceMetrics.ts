'use client';

import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import api from '@/lib/api';

export interface DeliveryTimeMetric {
  date: string;
  averageMinutes: number;
  targetMinutes?: number;
}

export interface CompletionRateMetric {
  date: string;
  completed: number;
  cancelled: number;
  rate: number;
}

export interface RegionalVolumeMetric {
  region: string;
  volume: number;
  percentage: number;
}

export interface DriverPerformanceRanking {
  driverId: string;
  driverName: string;
  deliveries: number;
  completionRate: number;
  averageDeliveryMinutes: number;
  score: number;
}

export interface PerformanceMetrics {
  totalDeliveries: number;
  completionRate: number;
  averageDeliveryMinutes: number;
  deliveryTimes: DeliveryTimeMetric[];
  completionRates: CompletionRateMetric[];
  regionalVolume: RegionalVolumeMetric[];
  driverRankings: DriverPerformanceRanking[];
}

export interface PerformanceMetricsParams {
  startDate?: string;
  endDate?: string;
  region?: string;
  limit?: number;
}

export const PERFORMANCE_METRICS_QUERY_KEY = ['analytics', 'performance'] as const;

function unwrapResponse<T>(payload: T | { data?: T }): T {
  if (payload && typeof payload === 'object' && 'data' in payload && payload.data !== undefined) {
    return payload.data as T;
  }
  return payload as T;
}

export interface UsePerformanceMetricsResult
  extends Omit<UseQueryResult<PerformanceMetrics, Error>, 'data'> {
  metrics: PerformanceMetrics | null;
}

export function usePerformanceMetrics(
  params: PerformanceMetricsParams = {},
): UsePerformanceMetricsResult {
  const query = useQuery<PerformanceMetrics, Error>({
    queryKey: [...PERFORMANCE_METRICS_QUERY_KEY, params],
    queryFn: async () => {
      const response = await api.get<PerformanceMetrics | { data: PerformanceMetrics }>(
        '/analytics/performance',
        { params },
      );
      return unwrapResponse<PerformanceMetrics>(response.data);
    },
    staleTime: 60_000,
    retry: 1,
  });

  return { ...query, metrics: query.data ?? null };
}
