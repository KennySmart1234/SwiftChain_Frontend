/**
 * useRouteOptimization Hook
 * Reorders a list of waypoints into a shorter route using a
 * nearest-neighbor heuristic, and exposes the resulting distance/time
 * estimates plus a manual reorder function.
 */

'use client';

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
  /** Waypoints reordered by the nearest-neighbor heuristic. */
  optimizedRoute: OptimizerWaypoint[];
  /** Total distance of the optimized route, in kilometers. */
  totalDistance: number;
  /** Estimated travel time for the optimized route, in minutes. */
  estimatedTime: number;
  /** Move a waypoint in the optimized route from one index to another. */
  reorder: (_fromIndex: number, _toIndex: number) => void;
  /** Restore the optimized route to the nearest-neighbor result. */
  reset: () => void;
}

/**
 * Hook to optimize the visiting order of a set of waypoints.
 * @param initialWaypoints - The waypoints to optimize, in any order.
 */
export function useRouteOptimization(
  initialWaypoints: OptimizerWaypoint[]
): UseRouteOptimizationReturn {
  const nearestNeighborRoute = useMemo(
    () => nearestNeighborOrder(initialWaypoints),
    [initialWaypoints]
  );

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

  const estimatedTime = useMemo(
    () => (totalDistance / AVERAGE_SPEED_KMH) * 60,
    [totalDistance]
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
  }, []);

  return {
    waypoints: initialWaypoints,
    optimizedRoute,
    totalDistance,
    estimatedTime,
    reorder,
    reset,
  };
}
