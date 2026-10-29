import { renderHook, waitFor } from '@testing-library/react';
import { useAnalyticsCharts } from '@/hooks/useAnalyticsCharts';
import { chartService } from '@/services/chartService';

/**
 * useAnalyticsCharts Hook Tests
 *
 * Tests analytics charts state management.
 * Verifies:
 *   - Chart initialization and state updates
 *   - Data loading and error handling
 *   - Retry logic
 *   - Library preloading
 *   - Memory clearing
 */

// Mock chartService
jest.mock('@/services/chartService');

const mockChartService = chartService as jest.Mocked<typeof chartService>;

describe('useAnalyticsCharts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockChartService.getChartConfig.mockReturnValue({
      type: 'price',
      enabled: true,
      preload: false,
    });
    mockChartService.fetchChartData.mockResolvedValue({
      currentPrice: 100,
      priceHistory: [],
    });
    mockChartService.preloadChartLibrary.mockResolvedValue(undefined);
  });

  it('should initialize with empty charts map', () => {
    const { result } = renderHook(() => useAnalyticsCharts());
    expect(result.current.charts.size).toBe(0);
  });

  it('should have required methods', () => {
    const { result } = renderHook(() => useAnalyticsCharts());
    expect(typeof result.current.loadChart).toBe('function');
    expect(typeof result.current.preloadChart).toBe('function');
    expect(typeof result.current.retryChart).toBe('function');
    expect(typeof result.current.clearCharts).toBe('function');
  });

  it('should load chart data successfully', async () => {
    const { result } = renderHook(() => useAnalyticsCharts());

    result.current.loadChart('price');

    await waitFor(() => {
      const chart = result.current.charts.get('price');
      expect(chart?.isLoading).toBe(false);
      expect(chart?.isError).toBe(false);
    });

    const chart = result.current.charts.get('price');
    expect(chart?.data).toEqual({
      currentPrice: 100,
      priceHistory: [],
    });
  });

  it('should set loading state while fetching', async () => {
    mockChartService.fetchChartData.mockImplementation(
      () =>
        new Promise((resolve) => {
          setTimeout(() => resolve({ data: 'test' }), 100);
        })
    );

    const { result } = renderHook(() => useAnalyticsCharts());

    result.current.loadChart('price');

    expect(result.current.charts.get('price')?.isLoading).toBe(true);

    await waitFor(
      () => {
        expect(result.current.charts.get('price')?.isLoading).toBe(false);
      },
      { timeout: 200 }
    );
  });

  it('should handle load errors', async () => {
    const error = new Error('API Error');
    mockChartService.fetchChartData.mockRejectedValue(error);

    const { result } = renderHook(() => useAnalyticsCharts());

    result.current.loadChart('price');

    await waitFor(() => {
      const chart = result.current.charts.get('price');
      expect(chart?.isError).toBe(true);
      expect(chart?.error).toBe('API Error');
    });
  });

  it('should preload chart library', async () => {
    const { result } = renderHook(() => useAnalyticsCharts());

    result.current.preloadChart('price');

    await waitFor(() => {
      expect(mockChartService.preloadChartLibrary).toHaveBeenCalledWith('price');
    });
  });

  it('should handle preload errors gracefully', async () => {
    mockChartService.preloadChartLibrary.mockRejectedValue(new Error('Preload error'));
    const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

    const { result } = renderHook(() => useAnalyticsCharts());

    result.current.preloadChart('price');

    await waitFor(() => {
      expect(consoleWarnSpy).toHaveBeenCalled();
    });

    consoleWarnSpy.mockRestore();
  });

  it('should retry loading a failed chart', async () => {
    const { result } = renderHook(() => useAnalyticsCharts());

    mockChartService.fetchChartData.mockRejectedValueOnce(new Error('Initial error'));

    result.current.loadChart('price');

    await waitFor(() => {
      expect(result.current.charts.get('price')?.isError).toBe(true);
    });

    mockChartService.fetchChartData.mockResolvedValueOnce({ data: 'success' });

    result.current.retryChart('price');

    await waitFor(() => {
      const chart = result.current.charts.get('price');
      expect(chart?.isError).toBe(false);
      expect(chart?.data).toEqual({ data: 'success' });
    });
  });

  it('should clear all charts', () => {
    const { result } = renderHook(() => useAnalyticsCharts());

    result.current.loadChart('price');
    result.current.loadChart('statistics');

    expect(result.current.charts.size).toBeGreaterThan(0);

    result.current.clearCharts();

    expect(result.current.charts.size).toBe(0);
    expect(mockChartService.clearCache).toHaveBeenCalled();
  });

  it('should handle disabled chart types', async () => {
    mockChartService.getChartConfig.mockReturnValue({
      type: 'unknown' as any,
      enabled: false,
    });

    const { result } = renderHook(() => useAnalyticsCharts());

    result.current.loadChart('unknown' as any);

    await waitFor(() => {
      const chart = result.current.charts.get('unknown' as any);
      expect(chart?.isError).toBe(true);
      expect(chart?.error).toContain('not enabled');
    });
  });

  it('should independently manage multiple charts', async () => {
    mockChartService.fetchChartData.mockImplementation((type) =>
      Promise.resolve({ type, data: `${type} data` })
    );

    const { result } = renderHook(() => useAnalyticsCharts());

    result.current.loadChart('price');
    result.current.loadChart('statistics');

    await waitFor(() => {
      expect(result.current.charts.size).toBe(2);
      expect(result.current.charts.get('price')?.data).toEqual({
        type: 'price',
        data: 'price data',
      });
      expect(result.current.charts.get('statistics')?.data).toEqual({
        type: 'statistics',
        data: 'statistics data',
      });
    });
  });
});
