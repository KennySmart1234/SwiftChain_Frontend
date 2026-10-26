/**
 * Route Optimization Service
 * Computes or fetches the most efficient waypoint order for a delivery route.
 * This keeps the hook logic thin while still supporting backend-based route
 * planning when the API is available.
 */

import axios from 'axios';
import { calculateDistanceKm } from '@/services/geofenceService';
import type { OptimizerWaypoint } from '@/types/routeOptimizer';

const AVERAGE_SPEED_KMH = 40;

export interface OptimizedRouteMetrics {
  route: OptimizerWaypoint[];
  totalDistanceKm: number;
  estimatedTimeMinutes: number;
}

export function nearestNeighborOrder(points: OptimizerWaypoint[]): OptimizerWaypoint[] {
  if (points.length <= 2) return [...points];

  const remaining = [...points];
  const ordered: OptimizerWaypoint[] = [remaining.shift() as OptimizerWaypoint];

  while (remaining.length > 0) {
    const current = ordered[ordered.length - 1];
    let nearestIndex = 0;
    let nearestDistance = Infinity;

    remaining.forEach((candidate, index) => {
      const distance = calculateDistanceKm(current.coordinate, candidate.coordinate);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestIndex = index;
      }
    });

    ordered.push(remaining.splice(nearestIndex, 1)[0]);
  }

  return ordered;
}

export function totalRouteDistance(route: OptimizerWaypoint[]): number {
  let distance = 0;
  for (let i = 0; i < route.length - 1; i += 1) {
    distance += calculateDistanceKm(route[i].coordinate, route[i + 1].coordinate);
  }
  return distance;
}

export async function fetchOptimizedRoute(
  waypoints: OptimizerWaypoint[]
): Promise<OptimizedRouteMetrics> {
  if (!Array.isArray(waypoints) || waypoints.length === 0) {
    return { route: [], totalDistanceKm: 0, estimatedTimeMinutes: 0 };
  }

  if (waypoints.length === 1) {
    return {
      route: [{ ...waypoints[0] }],
      totalDistanceKm: 0,
      estimatedTimeMinutes: 0,
    };
  }

  const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
  const routePayload = nearestNeighborOrder(waypoints);
  const fallbackResult: OptimizedRouteMetrics = {
    route: routePayload,
    totalDistanceKm: totalRouteDistance(routePayload),
    estimatedTimeMinutes: (totalRouteDistance(routePayload) / AVERAGE_SPEED_KMH) * 60,
  };

  try {
    const response = await axios.get(`${apiBaseUrl}/api/routes/optimize`, {
      params: {
        payload: JSON.stringify(waypoints),
      },
      timeout: 5000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const responseRoute = response.data?.data?.route ?? response.data?.route;
    const route = Array.isArray(responseRoute) && responseRoute.length > 0
      ? responseRoute.map((point: OptimizerWaypoint) => ({ ...point }))
      : fallbackResult.route;

    const totalDistanceKm = Number(response.data?.data?.totalDistanceKm ?? response.data?.totalDistanceKm ?? fallbackResult.totalDistanceKm);
    const estimatedTimeMinutes = Number(
      response.data?.data?.estimatedTimeMinutes ?? response.data?.estimatedTimeMinutes ?? fallbackResult.estimatedTimeMinutes
    );

    return {
      route,
      totalDistanceKm: Number.isFinite(totalDistanceKm) ? totalDistanceKm : fallbackResult.totalDistanceKm,
      estimatedTimeMinutes: Number.isFinite(estimatedTimeMinutes)
        ? estimatedTimeMinutes
        : fallbackResult.estimatedTimeMinutes,
    };
  } catch {
    return fallbackResult;
  }
}
