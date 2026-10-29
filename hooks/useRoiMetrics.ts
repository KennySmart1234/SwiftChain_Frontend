'use client';

import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import api from '@/lib/api';

export interface RoiTrendPoint {
  date: string;
  revenue: number;
  cost: number;
  roi: number;
}

export interface RoiCostBreakdownItem {
  category: string;
  amount: number;
  percentage: number;
}

export interface DriverProfitability {
  driverId: string;
  driverName: string;
  revenue: number;
  cost: number;
  profit: number;
  roi: number;
}

export interface RoiMetrics {
  totalRevenue: number;
  totalCost: number;
  totalProfit: number;
  roi: number;
  returnTrends: RoiTrendPoint[];
  costBreakdown: RoiCostBreakdownItem[];
  driverProfitability: DriverProfitability[];
}

export interface RoiMetricsParams {
  startDate?: string;
  endDate?: string;
  region?: string;
  driverId?: string;
}

export const ROI_METRICS_QUERY_KEY = ['analytics', 'roi'] as const;

function unwrapResponse<T>(payload: T | { data?: T }): T {
  if (payload && typeof payload === 'object' && 'data' in payload && payload.data !== undefined) {
    return payload.data as T;
  }
  return payload as T;
}

export interface UseRoiMetricsResult extends Omit<UseQueryResult<RoiMetrics, Error>, 'data'> {
  metrics: RoiMetrics | null;
}

export function useRoiMetrics(params: RoiMetricsParams = {}): UseRoiMetricsResult {
  const query = useQuery<RoiMetrics, Error>({
    queryKey: [...ROI_METRICS_QUERY_KEY, params],
    queryFn: async () => {
      const response = await api.get<RoiMetrics | { data: RoiMetrics }>('/analytics/roi', {
        params,
      });
      return unwrapResponse<RoiMetrics>(response.data);
    },
    staleTime: 60_000,
    retry: 1,
  });

  return { ...query, metrics: query.data ?? null };
}
