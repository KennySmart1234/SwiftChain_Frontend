import api from '@/lib/api';

/**
 * Chart types supported by the analytics system.
 */
export type ChartType = 'price' | 'statistics' | 'performance' | 'delivery-metrics';

export interface ChartData {
  type: ChartType;
  loaded: boolean;
  error: string | null;
  timestamp: number;
}

export interface ChartConfig {
  type: ChartType;
  enabled: boolean;
  preload?: boolean;
}

/**
 * chartService — manages heavy chart library loading and data retrieval.
 *
 * Responsibilities:
 *   - Lazy load chart components and dependencies
 *   - Cache chart configurations
 *   - Fetch chart-specific data from backend
 *   - Handle chart library initialization
 *
 * Layered Architecture:
 *   AnalyticsCharts (Component) → useAnalyticsCharts (Hook) → chartService (Service)
 */
export const chartService = {
  /**
   * Preload chart libraries to reduce perceived loading time.
   * Called when chart enters viewport.
   */
  async preloadChartLibrary(chartType: ChartType): Promise<void> {
    try {
      // Dynamic import libraries based on chart type
      switch (chartType) {
        case 'price':
          // Preload recharts for price charts
          await import('recharts');
          break;
        case 'statistics':
          // Statistics use simpler rendering, no additional libraries needed
          break;
        case 'performance':
          // Performance charts may use recharts
          await import('recharts');
          break;
        case 'delivery-metrics':
          // Delivery metrics may use recharts
          await import('recharts');
          break;
        default:
          break;
      }
    } catch (error) {
      console.warn(`Failed to preload chart library for ${chartType}:`, error);
      // Non-fatal — charts will still load on demand
    }
  },

  /**
   * Fetch chart-specific data from the backend.
   * Data is retrieved only when the chart is rendered.
   */
  async fetchChartData(
    chartType: ChartType,
    params?: Record<string, unknown>
  ): Promise<unknown> {
    try {
      const { data } = await api.get(`/api/charts/${chartType}`, { params });
      return data;
    } catch (error) {
      throw new Error(
        error instanceof Error ? error.message : `Failed to fetch ${chartType} chart data`
      );
    }
  },

  /**
   * Get configuration for a specific chart type.
   * Determines whether a chart should be rendered and how.
   */
  getChartConfig(chartType: ChartType): ChartConfig {
    const configs: Record<ChartType, ChartConfig> = {
      price: {
        type: 'price',
        enabled: true,
        preload: false, // Preload on viewport entry
      },
      statistics: {
        type: 'statistics',
        enabled: true,
        preload: false,
      },
      performance: {
        type: 'performance',
        enabled: true,
        preload: false,
      },
      'delivery-metrics': {
        type: 'delivery-metrics',
        enabled: true,
        preload: false,
      },
    };

    return configs[chartType] || { type: chartType, enabled: false };
  },

  /**
   * Check if a chart library is already loaded in the browser.
   */
  isLibraryLoaded(libraryName: string): boolean {
    if (typeof window === 'undefined') return false;

    const libs: Record<string, string> = {
      recharts: 'recharts',
      'framer-motion': 'framer-motion',
    };

    const libKey = libs[libraryName];
    if (!libKey) return false;

    try {
      // Check if module exists in window.__NEXT_DATA__ or similar
      return (window as any)[libKey] !== undefined;
    } catch {
      return false;
    }
  },

  /**
   * Clear chart data cache (useful for memory management in long-running sessions).
   */
  clearCache(chartType?: ChartType): void {
    // In a real implementation, this would clear from a cache store
    // For now, it's a placeholder for future cache management
    console.log(`Cleared cache for ${chartType || 'all charts'}`);
  },
};
