import React from 'react';
import { render, act } from '@testing-library/react';
import axios from 'axios';
import {
  useRouteOptimization,
  type UseRouteOptimizationReturn,
} from '@/hooks/useRouteOptimization';
import {
  clearRouteOptimizationCache,
  getRouteOptimizationCacheSize,
} from '@/services/routeOptimizationService';
import type { OptimizerWaypoint } from '@/types/routeOptimizer';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

function renderRouteHook(initialWaypoints: OptimizerWaypoint[]) {
  let current!: UseRouteOptimizationReturn;

  function TestHarness({ waypoints }: { waypoints: OptimizerWaypoint[] }) {
    current = useRouteOptimization(waypoints);
    return null;
  }

  const utils = render(React.createElement(TestHarness, { waypoints: initialWaypoints }));
  return {
    get result() {
      return current;
    },
    rerender: (nextWaypoints: OptimizerWaypoint[]) =>
      utils.rerender(React.createElement(TestHarness, { waypoints: nextWaypoints })),
  };
}

describe('useRouteOptimization Hook (Issue #831)', () => {
  const waypoints: OptimizerWaypoint[] = [
    {
      id: 'wp-origin',
      coordinate: { latitude: 6.5244, longitude: 3.3792 },
      label: 'Lagos Mainland',
    },
    {
      id: 'wp-far',
      coordinate: { latitude: 7.3775, longitude: 3.947 },
      label: 'Ibadan Hub',
    },
    {
      id: 'wp-near',
      coordinate: { latitude: 6.535, longitude: 3.385 },
      label: 'Yaba Depot',
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    clearRouteOptimizationCache();
  });

  it('returns RouteOptimizationResult with polyline, optimized waypoint order, distance, and duration', () => {
    const hook = renderRouteHook(waypoints);

    expect(hook.result.result).toBeDefined();
    expect(hook.result.optimizedRoute.map((w) => w.id)).toEqual([
      'wp-origin',
      'wp-near',
      'wp-far',
    ]);
    expect(hook.result.result.polyline).toEqual([
      [6.5244, 3.3792],
      [6.535, 3.385],
      [7.3775, 3.947],
    ]);
    expect(hook.result.polyline).toHaveLength(3);
    expect(hook.result.distance).toBeGreaterThan(100);
    expect(hook.result.duration).toBeCloseTo(
      (hook.result.distance / 40) * 60,
      5,
    );
  });

  it('allows waypoints to be reordered via function call and updates polyline, distance, and duration', () => {
    const hook = renderRouteHook(waypoints);

    const initialPolyline = hook.result.polyline;
    expect(hook.result.optimizedRoute.map((w) => w.id)).toEqual([
      'wp-origin',
      'wp-near',
      'wp-far',
    ]);

    act(() => {
      hook.result.reorderWaypoints(1, 2);
    });

    expect(hook.result.optimizedRoute.map((w) => w.id)).toEqual([
      'wp-origin',
      'wp-far',
      'wp-near',
    ]);
    expect(hook.result.polyline).not.toEqual(initialPolyline);
    expect(hook.result.polyline).toEqual([
      [6.5244, 3.3792],
      [7.3775, 3.947],
      [6.535, 3.385],
    ]);
    expect(hook.result.result.polyline).toEqual(hook.result.polyline);
  });

  it('supports adding and removing waypoints dynamically', () => {
    const hook = renderRouteHook(waypoints.slice(0, 2));
    expect(hook.result.waypoints).toHaveLength(2);

    const extraWaypoint: OptimizerWaypoint = {
      id: 'wp-extra',
      coordinate: { latitude: 6.53, longitude: 3.38 },
      label: ' Ikeja Stop',
    };

    act(() => {
      hook.result.addWaypoint(extraWaypoint);
    });

    expect(hook.result.waypoints).toHaveLength(3);
    expect(hook.result.optimizedRoute.map((w) => w.id)).toEqual([
      'wp-origin',
      'wp-extra',
      'wp-far',
    ]);

    act(() => {
      hook.result.removeWaypoint('wp-extra');
    });

    expect(hook.result.waypoints).toHaveLength(2);
    expect(hook.result.optimizedRoute.map((w) => w.id)).toEqual([
      'wp-origin',
      'wp-far',
    ]);
  });

  it('caches routes for the same waypoint set so repeated evaluations use the cache', () => {
    const hook = renderRouteHook(waypoints);
    expect(hook.result.isCached).toBe(false);

    // Reorder manually, then reset back to the same waypoint set
    act(() => {
      hook.result.reorder(0, 2);
    });
    expect(hook.result.isCached).toBe(false);

    act(() => {
      hook.result.reset();
    });

    expect(hook.result.isCached).toBe(true);
    expect(hook.result.result.cached).toBe(true);
  });

  it('computes optimal route via routing API and serves subsequent calls for the same waypoint set from cache', async () => {
    mockedAxios.post.mockResolvedValueOnce({
      data: {
        success: true,
        data: {
          optimizedWaypoints: [waypoints[0], waypoints[2], waypoints[1]],
          distance: 118.4,
          duration: 142.5,
          polyline: [
            [6.5244, 3.3792],
            [6.535, 3.385],
            [7.3775, 3.947],
          ],
        },
      },
    });

    const hook = renderRouteHook(waypoints);

    await act(async () => {
      await hook.result.optimizeRoute();
    });

    expect(mockedAxios.post).toHaveBeenCalledTimes(1);
    expect(hook.result.distance).toBe(118.4);
    expect(hook.result.duration).toBe(142.5);
    expect(getRouteOptimizationCacheSize()).toBe(1);

    // Second call with identical waypoint set hits cache without another API call
    await act(async () => {
      const second = await hook.result.optimizeRoute();
      expect(second.cached).toBe(true);
    });

    expect(mockedAxios.post).toHaveBeenCalledTimes(1);
  });

  it('handles HTTP 429 rate limiting gracefully by falling back to cached/computed route optimization', async () => {
    const rateLimitError = {
      isAxiosError: true,
      response: {
        status: 429,
        headers: { 'retry-after': '3' },
      },
    };
    mockedAxios.isAxiosError.mockReturnValue(true);
    mockedAxios.post.mockRejectedValueOnce(rateLimitError);

    const hook = renderRouteHook(waypoints);

    await act(async () => {
      const fallback = await hook.result.optimizeRoute();
      expect(fallback.optimizedWaypoints).toHaveLength(3);
      expect(fallback.polyline).toHaveLength(3);
      expect(fallback.distance).toBeGreaterThan(0);
    });

    expect(hook.result.error).toBeNull();
  });
});
