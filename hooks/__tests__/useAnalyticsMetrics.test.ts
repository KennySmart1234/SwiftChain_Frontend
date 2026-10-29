import { act, renderHook, waitFor } from '@testing-library/react';
import { useAnalyticsMetrics } from '@/hooks/useAnalyticsMetrics';
import { analyticsService } from '@/services/analyticsService';

jest.mock('@/services/analyticsService');

const mockedAnalyticsService = analyticsService as jest.Mocked<
  typeof analyticsService
>;

const response = {
  fleet: {
    period: '30d' as const,
    utilizationRate: 80,
    onTimeRate: 90,
    totalMiles: 100,
    fuelEfficiency: 8,
    costPerMile: 1,
    activeVehicles: 4,
    totalVehicles: 5,
    utilizationTrend: [],
    deliveryTrend: [],
    statusBreakdown: [],
    recentEvents: [],
  },
  performance: {
    averageDeliveryTime: 2,
    deliverySuccessRate: 95,
    customerSatisfaction: 4.5,
    operatingCost: 100,
    activeDeliveries: 2,
    completedDeliveries: 20,
    performanceTrend: [],
    costTrend: [],
  },
};

describe('useAnalyticsMetrics', () => {
  beforeEach(() => jest.clearAllMocks());

  it('loads typed fleet and performance metrics', async () => {
    mockedAnalyticsService.getFleetAnalytics.mockResolvedValue(response);
    const { result } = renderHook(() => useAnalyticsMetrics());

    expect(result.current.isLoading).toBe(true);
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.fleet?.utilizationRate).toBe(80);
    expect(result.current.performance?.deliverySuccessRate).toBe(95);
    expect(mockedAnalyticsService.getFleetAnalytics).toHaveBeenCalledWith(
      '30d',
      expect.any(AbortSignal)
    );
  });

  it('refetches when the period changes', async () => {
    mockedAnalyticsService.getFleetAnalytics.mockResolvedValue(response);
    const { result } = renderHook(() => useAnalyticsMetrics('7d'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => result.current.setPeriod('90d'));
    await waitFor(() =>
      expect(mockedAnalyticsService.getFleetAnalytics).toHaveBeenLastCalledWith(
        '90d',
        expect.any(AbortSignal)
      )
    );
  });

  it('exposes a useful error and supports explicit refresh', async () => {
    mockedAnalyticsService.getFleetAnalytics
      .mockRejectedValueOnce(new Error('Request failed'))
      .mockResolvedValueOnce(response);
    const { result } = renderHook(() => useAnalyticsMetrics());
    await waitFor(() => expect(result.current.error).toBe('Request failed'));

    await act(async () => {
      await result.current.refetch();
    });
    await waitFor(() => expect(result.current.fleet?.totalVehicles).toBe(5));
  });
});
