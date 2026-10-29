'use client';

import { useState, useCallback, useEffect } from 'react';
import { chartService, type ChartType } from '@/services/chartService';

export interface AnalyticsChart {
  type: ChartType;
  isLoading: boolean;
  isError: boolean;
  error: string | null;
  data: unknown;
}

export interface UseAnalyticsChartsResult {
  /** Map of chart type to chart state */
  charts: Map<ChartType, AnalyticsChart>;
  /** Load a specific chart */
  loadChart: (chartType: ChartType) => Promise<void>;
  /** Preload chart library before rendering */
  preloadChart: (chartType: ChartType) => Promise<void>;
  /** Retry loading a failed chart */
  retryChart: (chartType: ChartType) => Promise<void>;
  /** Clear all chart data */
  clearCharts: () => void;
}

/**
 * useAnalyticsCharts — manages loading state and data for analytics charts.
 *
 * Features:
 *   - Independent loading state for each chart
 *   - Error handling and retry logic
 *   - Preloading chart libraries before rendering
 *   - Memory-efficient with ability to clear data
 *
 * Layered Architecture:
 *   AnalyticsCharts (Component) → useAnalyticsCharts (Hook) → chartService (Service)
 *
 * Usage:
 *   const { charts, loadChart, preloadChart } = useAnalyticsCharts();
 *   useEffect(() => {
 *     preloadChart('price');
 *   }, []);
 */
export function useAnalyticsCharts(): UseAnalyticsChartsResult {
  const [charts, setCharts] = useState<Map<ChartType, AnalyticsChart>>(new Map());

  /**
   * Initialize or get chart state.
   */
  const getOrCreateChart = useCallback((chartType: ChartType): AnalyticsChart => {
    if (charts.has(chartType)) {
      return charts.get(chartType)!;
    }

    const newChart: AnalyticsChart = {
      type: chartType,
      isLoading: false,
      isError: false,
      error: null,
      data: null,
    };

    setCharts((prev) => new Map(prev).set(chartType, newChart));
    return newChart;
  }, [charts]);

  /**
   * Update chart state.
   */
  const updateChart = useCallback((chartType: ChartType, updates: Partial<AnalyticsChart>) => {
    setCharts((prev) => {
      const updated = new Map(prev);
      const current = updated.get(chartType) || getOrCreateChart(chartType);
      updated.set(chartType, { ...current, ...updates });
      return updated;
    });
  }, [getOrCreateChart]);

  /**
   * Load chart data from the backend.
   */
  const loadChart = useCallback(
    async (chartType: ChartType) => {
      const config = chartService.getChartConfig(chartType);

      if (!config.enabled) {
        updateChart(chartType, {
          isError: true,
          error: `Chart type "${chartType}" is not enabled`,
        });
        return;
      }

      updateChart(chartType, { isLoading: true, isError: false, error: null });

      try {
        const data = await chartService.fetchChartData(chartType);
        updateChart(chartType, {
          data,
          isLoading: false,
          isError: false,
          error: null,
        });
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load chart data';
        updateChart(chartType, {
          isLoading: false,
          isError: true,
          error: errorMessage,
        });
      }
    },
    [updateChart]
  );

  /**
   * Preload chart library before rendering the component.
   * This reduces the time users see the skeleton loader.
   */
  const preloadChart = useCallback(async (chartType: ChartType) => {
    try {
      await chartService.preloadChartLibrary(chartType);
    } catch (err) {
      console.warn(`Failed to preload chart ${chartType}:`, err);
      // Non-fatal — charts will still load on demand
    }
  }, []);

  /**
   * Retry loading a failed chart.
   */
  const retryChart = useCallback(
    async (chartType: ChartType) => {
      await loadChart(chartType);
    },
    [loadChart]
  );

  /**
   * Clear all chart data (useful for memory management).
   */
  const clearCharts = useCallback(() => {
    setCharts(new Map());
    chartService.clearCache();
  }, []);

  return {
    charts,
    loadChart,
    preloadChart,
    retryChart,
    clearCharts,
  };
}
