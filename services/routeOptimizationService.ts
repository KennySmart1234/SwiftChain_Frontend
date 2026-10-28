/**
 * Route Optimization Service
 * Handles OSRM/TomTom/backend routing API integration, waypoint ordering,
 * polyline generation, distance/duration calculation, and rate-limit caching.
 * Computes or fetches the most efficient waypoint order for a delivery route.
 * This keeps the hook logic thin while still supporting backend-based route
 * planning when the API is available.
 */

import axios from 'axios';
import { calculateDistanceKm } from '@/services/geofenceService';
import type {
  OptimizerWaypoint,
  RouteOptimizationResult,
} from '@/types/routeOptimizer';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '';

/** Average assumed travel speed (km/h) used to derive duration from distance. */
export const AVERAGE_SPEED_KMH = 40;

/** Default minimum interval (ms) between uncached API calls for rate limiting. */
const DEFAULT_RATE_LIMIT_MS = 1000;

interface CacheEntry {
  result: RouteOptimizationResult;
  createdAt: number;
}

interface RouteOptimizationApiPayload {
  success?: boolean;
  data?: {
    optimizedWaypoints?: OptimizerWaypoint[];
    waypointOrder?: number[];
    distance?: number;
    duration?: number;
    polyline?: [number, number][];
  };
  routes?: Array<{
    distance: number;
    duration: number;
    geometry?: {
      coordinates?: [number, number][];
    };
  }>;
  waypoint_order?: number[];
}

const localRouteCache = new Map<string, CacheEntry>();
const apiRouteCache = new Map<string, CacheEntry>();
let lastRequestTimestamp = 0;
let rateLimitCooldownUntil = 0;

/**
 * Generates a deterministic cache key for a set of waypoints.
 */
export function getWaypointSetCacheKey(
  waypoints: OptimizerWaypoint[],
  preserveOrder: boolean = false,
): string {
  const parts = waypoints.map(
    (wp) =>
      `${wp.id}:${wp.coordinate.latitude.toFixed(5)},${wp.coordinate.longitude.toFixed(5)}`,
  );
  const normalized = preserveOrder ? parts : [...parts].sort();
  return `${preserveOrder ? 'manual' : 'opt'}|${normalized.join('|')}`;
}

/**
 * Reorders waypoints starting from the first waypoint, repeatedly visiting
 * the nearest unvisited waypoint.
 */
export function nearestNeighborOrder(
  points: OptimizerWaypoint[],
): OptimizerWaypoint[] {
  if (points.length <= 2) return [...points];

  const remaining = [...points];
  const ordered: OptimizerWaypoint[] = [
    remaining.shift() as OptimizerWaypoint,
  ];
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
      const distance = calculateDistanceKm(
        current.coordinate,
        candidate.coordinate,
      );
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

/**
 * Computes total route distance in kilometers across ordered waypoints.
 */
export function totalRouteDistance(route: OptimizerWaypoint[]): number {
  let distance = 0;
  for (let i = 0; i < route.length - 1; i += 1) {
    distance += calculateDistanceKm(
      route[i].coordinate,
      route[i + 1].coordinate,
    );
export function totalRouteDistance(route: OptimizerWaypoint[]): number {
  let distance = 0;
  for (let i = 0; i < route.length - 1; i += 1) {
    distance += calculateDistanceKm(route[i].coordinate, route[i + 1].coordinate);
  }
  return distance;
}

/**
 * Computes estimated travel duration in minutes for a given distance in km.
 */
export function calculateRouteDurationMinutes(
  distanceKm: number,
  speedKmh: number = AVERAGE_SPEED_KMH,
): number {
  if (distanceKm <= 0 || speedKmh <= 0) return 0;
  return (distanceKm / speedKmh) * 60;
}

/**
 * Builds [latitude, longitude] polyline coordinates for map rendering.
 */
export function buildRoutePolyline(
  route: OptimizerWaypoint[],
): [number, number][] {
  return route.map((wp) => [wp.coordinate.latitude, wp.coordinate.longitude]);
}

/**
 * Computes a complete RouteOptimizationResult locally and caches it by waypoint set.
 */
export function computeRouteOptimization(
  waypoints: OptimizerWaypoint[],
  options: { preserveOrder?: boolean; useCache?: boolean } = {},
): RouteOptimizationResult {
  const { preserveOrder = false, useCache = true } = options;
  const cacheKey = getWaypointSetCacheKey(waypoints, preserveOrder);

  if (useCache) {
    const existing =
      apiRouteCache.get(cacheKey) ?? localRouteCache.get(cacheKey);
    if (existing) {
      return {
        ...existing.result,
        waypoints: [...waypoints],
        cached: true,
      };
    }
  }

  const optimizedWaypoints = preserveOrder
    ? [...waypoints]
    : nearestNeighborOrder(waypoints);
  const distance = totalRouteDistance(optimizedWaypoints);
  const duration = calculateRouteDurationMinutes(distance);
  const polyline = buildRoutePolyline(optimizedWaypoints);

  const result: RouteOptimizationResult = {
    waypoints: [...waypoints],
    optimizedWaypoints,
    distance,
    duration,
    polyline,
    cached: false,
  };

  if (useCache && waypoints.length > 0) {
    localRouteCache.set(cacheKey, {
      result,
      createdAt: Date.now(),
    });
  }

  return result;
}

/**
 * Optimizes a route via the backend/OSRM routing API with caching and
 * rate-limit protection. Returns cached results immediately when the same
 * waypoint set is requested again.
 */
export async function optimizeRouteViaApi(
  waypoints: OptimizerWaypoint[],
  options: { rateLimitMs?: number } = {},
): Promise<RouteOptimizationResult> {
  if (waypoints.length === 0) {
    return {
      waypoints: [],
      optimizedWaypoints: [],
      distance: 0,
      duration: 0,
      polyline: [],
      cached: false,
    };
  }

  const cacheKey = getWaypointSetCacheKey(waypoints, false);
  const cachedEntry = apiRouteCache.get(cacheKey);
  if (cachedEntry) {
    return {
      ...cachedEntry.result,
      waypoints: [...waypoints],
      cached: true,
    };
  }

  const now = Date.now();
  const minInterval = options.rateLimitMs ?? DEFAULT_RATE_LIMIT_MS;

  if (
    now < rateLimitCooldownUntil ||
    (lastRequestTimestamp > 0 && now - lastRequestTimestamp < minInterval)
  ) {
    return computeRouteOptimization(waypoints, {
      preserveOrder: false,
      useCache: true,
    });
  }

  lastRequestTimestamp = now;

  try {
    const response = await axios.post<RouteOptimizationApiPayload>(
      `${API_BASE_URL}/api/routes/optimize`,
      {
        waypoints: waypoints.map((wp) => ({
          id: wp.id,
          label: wp.label,
          address: wp.address,
          latitude: wp.coordinate.latitude,
          longitude: wp.coordinate.longitude,
        })),
      },
      {
        timeout: 10000,
        headers: { 'Content-Type': 'application/json' },
      },
    );

    const payload = response.data;

    if (payload?.data) {
      const orderedWaypoints =
        payload.data.optimizedWaypoints ??
        (payload.data.waypointOrder
          ? payload.data.waypointOrder
              .map((idx) => waypoints[idx])
              .filter(Boolean)
          : nearestNeighborOrder(waypoints));

      const distance =
        typeof payload.data.distance === 'number'
          ? payload.data.distance
          : totalRouteDistance(orderedWaypoints);

      const duration =
        typeof payload.data.duration === 'number'
          ? payload.data.duration
          : calculateRouteDurationMinutes(distance);

      const polyline =
        payload.data.polyline && payload.data.polyline.length > 0
          ? payload.data.polyline
          : buildRoutePolyline(orderedWaypoints);

      const result: RouteOptimizationResult = {
        waypoints: [...waypoints],
        optimizedWaypoints: orderedWaypoints,
        distance,
        duration,
        polyline,
        cached: false,
      };

      apiRouteCache.set(cacheKey, { result, createdAt: Date.now() });
      localRouteCache.set(cacheKey, { result, createdAt: Date.now() });
      return result;
    }

    if (payload?.routes && payload.routes.length > 0) {
      const primaryRoute = payload.routes[0];
      const orderedWaypoints = nearestNeighborOrder(waypoints);
      const distanceKm = primaryRoute.distance / 1000;
      const durationMin = primaryRoute.duration / 60;
      const polyline: [number, number][] = primaryRoute.geometry?.coordinates
        ? primaryRoute.geometry.coordinates.map(([lng, lat]) => [lat, lng])
        : buildRoutePolyline(orderedWaypoints);

      const result: RouteOptimizationResult = {
        waypoints: [...waypoints],
        optimizedWaypoints: orderedWaypoints,
        distance: distanceKm,
        duration: durationMin,
        polyline,
        cached: false,
      };

      apiRouteCache.set(cacheKey, { result, createdAt: Date.now() });
      localRouteCache.set(cacheKey, { result, createdAt: Date.now() });
      return result;
    }

    return computeRouteOptimization(waypoints, {
      preserveOrder: false,
      useCache: true,
    });
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 429) {
      const retryAfterHeader = Number(error.response.headers?.['retry-after']);
      const cooldownMs =
        Number.isFinite(retryAfterHeader) && retryAfterHeader > 0
          ? retryAfterHeader * 1000
          : 5000;
      rateLimitCooldownUntil = Date.now() + cooldownMs;
      return computeRouteOptimization(waypoints, {
        preserveOrder: false,
        useCache: true,
      });
    }
    throw error;
  }
}

/**
 * Clears the internal route optimization cache and rate-limit state.
 */
export function clearRouteOptimizationCache(): void {
  localRouteCache.clear();
  apiRouteCache.clear();
  lastRequestTimestamp = 0;
  rateLimitCooldownUntil = 0;
}

/**
 * Returns the number of cached API route optimization entries.
 */
export function getRouteOptimizationCacheSize(): number {
  return apiRouteCache.size;
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
