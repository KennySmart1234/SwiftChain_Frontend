import axios from 'axios';
import type {
  AnalyticsPeriod,
  AnalyticsResponse,
  FleetAnalytics,
  PerformanceMetrics,
} from '@/types/analytics';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? '';

export const analyticsService = {
  async getFleetAnalytics(
    period: AnalyticsPeriod = '30d',
    signal?: AbortSignal
  ): Promise<AnalyticsResponse> {
    const { data } = await axios.get<AnalyticsResponse>(
      `${API_BASE_URL}/fleet/analytics`,
      { params: { period }, signal }
    );
    return data;
  },
};

/** Small, deterministic fallback useful for an empty fleet or an offline API. */
export function emptyFleetAnalytics(period: AnalyticsPeriod): FleetAnalytics {
  return {
    period,
    utilizationRate: 0,
    onTimeRate: 0,
    totalMiles: 0,
    fuelEfficiency: 0,
    costPerMile: 0,
    activeVehicles: 0,
    totalVehicles: 0,
    utilizationTrend: [],
    deliveryTrend: [],
    statusBreakdown: [],
    recentEvents: [],
  };
}

export function emptyPerformanceMetrics(): PerformanceMetrics {
  return {
    averageDeliveryTime: 0,
    deliverySuccessRate: 0,
    customerSatisfaction: 0,
    operatingCost: 0,
    activeDeliveries: 0,
    completedDeliveries: 0,
    performanceTrend: [],
    costTrend: [],
  };
}
