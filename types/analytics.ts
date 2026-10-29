export type AnalyticsPeriod = '7d' | '30d' | '90d';

export interface AnalyticsPoint {
  label: string;
  value: number;
}

export interface FleetAnalytics {
  period: AnalyticsPeriod;
  utilizationRate: number;
  onTimeRate: number;
  totalMiles: number;
  fuelEfficiency: number;
  costPerMile: number;
  activeVehicles: number;
  totalVehicles: number;
  utilizationTrend: AnalyticsPoint[];
  deliveryTrend: AnalyticsPoint[];
  statusBreakdown: AnalyticsPoint[];
  recentEvents: AnalyticsEvent[];
}

export interface AnalyticsEvent {
  id: string;
  title: string;
  detail: string;
  timestamp: string;
  tone: 'success' | 'warning' | 'info';
}

export interface PerformanceMetrics {
  averageDeliveryTime: number;
  deliverySuccessRate: number;
  customerSatisfaction: number;
  operatingCost: number;
  activeDeliveries: number;
  completedDeliveries: number;
  performanceTrend: AnalyticsPoint[];
  costTrend: AnalyticsPoint[];
}

export interface AnalyticsResponse {
  fleet: FleetAnalytics;
  performance: PerformanceMetrics;
}
