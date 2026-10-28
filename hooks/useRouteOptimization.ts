/**
 * useRouteOptimization Hook
 * Manages waypoint order, route optimization via the OSRM/TomTom/backend
 * routing service, caching for identical waypoint sets, adding/removing
 * waypoints, polyline coordinates, and distance/time calculation.
 */

'use client';

import { useCallback, useMemo, useState } from 'react';
import {
  AVERAGE_SPEED_KMH,
  buildRoutePolyline,
  calculateRouteDurationMinutes,
  computeRouteOptimization,
  optimizeRouteViaApi,
  totalRouteDistance,
} from '@/services/routeOptimizationService';
import type {
  OptimizerWaypoint,
  RouteOptimizationResult,
} from '@/types/routeOptimizer';

export type { RouteOptimizationResult };

export interface UseRouteOptimizationReturn {
  /** Waypoints in their current input order. */
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  fetchOptimizedRoute,
  nearestNeighborOrder,
  totalRouteDistance,
} from '@/services/routeOptimizationService';
import type { OptimizerWaypoint } from '@/types/routeOptimizer';

/** Average assumed travel speed used to derive an ETA from distance. */
const AVERAGE_SPEED_KMH = 40;

interface UseRouteOptimizationReturn {
  /** Waypoints in their original (unoptimized) order, as provided. */
  waypoints: OptimizerWaypoint[];
  /** Waypoints reordered by the optimizer or manual reorder calls. */
  optimizedRoute: OptimizerWaypoint[];
  /** Total distance of the optimized route, in kilometers. */
  totalDistance: number;
  /** Estimated travel time for the optimized route, in minutes. */
  estimatedTime: number;
  /** Alias for totalDistance (in kilometers). */
  distance: number;
  /** Alias for estimatedTime (in minutes). */
  duration: number;
  /** Polyline coordinate pairs [lat, lng] for map rendering. */
  polyline: [number, number][];
  /** Structured RouteOptimizationResult with polyline, distance, duration, and cache status. */
  result: RouteOptimizationResult;
  /** Whether the current route result was served from cache. */
  isCached: boolean;
  /** Whether an async routing API optimization request is in flight. */
  isLoading: boolean;
  /** Error message from the most recent routing API request, if any. */
  error: string | null;
  /** Move a waypoint in the optimized route from one index to another. */
  reorder: (_fromIndex: number, _toIndex: number) => void;
  /** Alias for reorder to support explicit waypoint reordering calls. */
  reorderWaypoints: (_fromIndex: number, _toIndex: number) => void;
  /** Add a waypoint to the current route and recompute optimization. */
  addWaypoint: (_waypoint: OptimizerWaypoint) => void;
  /** Remove a waypoint by ID from the current route and recompute optimization. */
  removeWaypoint: (_waypointId: string) => void;
  /** Restore the optimized route to the initial waypoints' optimized order. */
  /** Restore the optimized route to the nearest-neighbor result. */
  reset: () => void;
  /** Fetch optimal route from the backend/OSRM routing API with rate-limit caching. */
  optimizeRoute: () => Promise<RouteOptimizationResult>;
}

/**
 * Hook to optimize the visiting order of a set of waypoints, manage adding/removing
 * and reordering waypoints, cache routes for identical waypoint sets, and compute
 * polyline coordinates, distance, and duration.
 *
 * @param initialWaypoints - The initial waypoints to optimize.
 * Hook to optimize the visiting order of a set of waypoints.
 * @param initialWaypoints - The waypoints to optimize, in any order.
 */
export function useRouteOptimization(
  initialWaypoints: OptimizerWaypoint[],
): UseRouteOptimizationReturn {
  const [customWaypoints, setCustomWaypoints] = useState<
    OptimizerWaypoint[] | null
  >(null);
  const [manualRoute, setManualRoute] = useState<OptimizerWaypoint[] | null>(
    null,
  );
  const [apiResult, setApiResult] = useState<RouteOptimizationResult | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const activeWaypoints = customWaypoints ?? initialWaypoints;

  const computedResult = useMemo<RouteOptimizationResult>(() => {
    if (manualRoute) {
      const distance = totalRouteDistance(manualRoute);
      const duration = calculateRouteDurationMinutes(
        distance,
        AVERAGE_SPEED_KMH,
      );
      const polyline = buildRoutePolyline(manualRoute);
      return {
        waypoints: activeWaypoints,
        optimizedWaypoints: manualRoute,
        distance,
        duration,
        polyline,
        cached: false,
      };
    }

    return computeRouteOptimization(activeWaypoints, {
      preserveOrder: false,
      useCache: true,
    });
  }, [activeWaypoints, manualRoute]);

  const effectiveResult = apiResult ?? computedResult;

  const reorder = useCallback(
    (fromIndex: number, toIndex: number) => {
      setApiResult(null);
      setManualRoute((current) => {
        const base = current ?? effectiveResult.optimizedWaypoints;
        if (
          fromIndex < 0 ||
          fromIndex >= base.length ||
          toIndex < 0 ||
          toIndex >= base.length ||
          fromIndex === toIndex
        ) {
          return base;
        }
        const next = [...base];
        const [moved] = next.splice(fromIndex, 1);
        next.splice(toIndex, 0, moved);
        return next;
      });
    },
    [effectiveResult.optimizedWaypoints],

  const [manualRoute, setManualRoute] = useState<OptimizerWaypoint[] | null>(null);
  const [backendRoute, setBackendRoute] = useState<OptimizerWaypoint[] | null>(null);

  useEffect(() => {
    let mounted = true;

    const syncBackendRoute = async () => {
      if (initialWaypoints.length <= 1) {
        setBackendRoute([...initialWaypoints]);
        return;
      }

      try {
        const optimized = await fetchOptimizedRoute(initialWaypoints);
        if (mounted) {
          setBackendRoute(optimized.route);
        }
      } catch {
        if (mounted) {
          setBackendRoute(nearestNeighborRoute);
        }
      }
    };

    syncBackendRoute();

    return () => {
      mounted = false;
    };
  }, [initialWaypoints, nearestNeighborRoute]);

  const optimizedRoute = manualRoute ?? backendRoute ?? nearestNeighborRoute;

  const totalDistance = useMemo(
    () => totalRouteDistance(optimizedRoute),
    [optimizedRoute]
  );

  const addWaypoint = useCallback(
    (waypoint: OptimizerWaypoint) => {
      setApiResult(null);
      setManualRoute(null);
      setCustomWaypoints((current) => {
        const base = current ?? activeWaypoints;
        if (base.some((existing) => existing.id === waypoint.id)) {
          return base.map((existing) =>
            existing.id === waypoint.id ? waypoint : existing,
          );
        }
        return [...base, waypoint];
      });
    },
    [activeWaypoints],
  );

  const removeWaypoint = useCallback(
    (waypointId: string) => {
      setApiResult(null);
      setManualRoute(null);
      setCustomWaypoints((current) => {
        const base = current ?? activeWaypoints;
        return base.filter((wp) => wp.id !== waypointId);
      });
    },
    [activeWaypoints],
  );
  const reorder = useCallback((fromIndex: number, toIndex: number) => {
    setManualRoute((current) => {
      const base = current ?? backendRoute ?? nearestNeighborRoute;
      if (
        fromIndex < 0 ||
        fromIndex >= base.length ||
        toIndex < 0 ||
        toIndex >= base.length ||
        fromIndex === toIndex
      ) {
        return base;
      }
      const next = [...base];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });
  }, [backendRoute, nearestNeighborRoute]);

  const reset = useCallback(() => {
    setManualRoute(null);
    setCustomWaypoints(null);
    setApiResult(null);
    setError(null);
  }, []);

  const optimizeRoute = useCallback(async (): Promise<RouteOptimizationResult> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await optimizeRouteViaApi(activeWaypoints);
      setManualRoute(null);
      setApiResult(response);
      return response;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to optimize route';
      setError(message);
      return effectiveResult;
    } finally {
      setIsLoading(false);
    }
  }, [activeWaypoints, effectiveResult]);

  return {
    waypoints: activeWaypoints,
    optimizedRoute: effectiveResult.optimizedWaypoints,
    totalDistance: effectiveResult.distance,
    estimatedTime: effectiveResult.duration,
    distance: effectiveResult.distance,
    duration: effectiveResult.duration,
    polyline: effectiveResult.polyline,
    result: effectiveResult,
    isCached: effectiveResult.cached,
    isLoading,
    error,
    reorder,
    reorderWaypoints: reorder,
    addWaypoint,
    removeWaypoint,
    reset,
    optimizeRoute,
  };
}
