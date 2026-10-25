/**
 * RouteOptimizer Component
 * Interactive map + controls for reordering delivery waypoints into an
 * optimized route, viewing distance/time estimates, and exporting the
 * result as JSON.
 */

'use client';

import React, { useCallback, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';
import { ArrowUp, ArrowDown, Download, MapPin } from 'lucide-react';
import { useRouteOptimization } from '@/hooks/useRouteOptimization';
import type { OptimizerWaypoint, OptimizedRouteExport } from '@/types/routeOptimizer';

// Dynamically import react-leaflet's MapContainer to avoid SSR issues
// (leaflet requires `window`), matching TrackingMap.tsx's pattern.
const DynamicMapContainer = dynamic(
  () => import('react-leaflet').then((mod) => mod.MapContainer),
  { ssr: false }
);

interface RouteOptimizerProps {
  waypoints: OptimizerWaypoint[];
  className?: string;
  height?: string;
}

const waypointMarkerIcon = (index: number) =>
  L.divIcon({
    className: '',
    html: `<div style="background:#0284c7;color:#fff;border-radius:9999px;width:24px;height:24px;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:600;border:2px solid #fff;box-shadow:0 1px 3px rgba(0,0,0,0.4);">${
      index + 1
    }</div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -12],
  });

function downloadRouteAsJson(exportData: OptimizedRouteExport): void {
  const blob = new Blob([JSON.stringify(exportData, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `route-${Date.now()}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

function getNearestTargetIndex(
  draggedIndex: number,
  currentRoute: OptimizerWaypoint[],
  draggedLatLng: L.LatLng
): number {
  let nearestIndex = draggedIndex;
  let nearestDistance = Number.POSITIVE_INFINITY;

  currentRoute.forEach((waypoint, index) => {
    if (index === draggedIndex) return;

    const distance = Math.hypot(
      waypoint.coordinate.latitude - draggedLatLng.lat,
      waypoint.coordinate.longitude - draggedLatLng.lng
    );

    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearestIndex = index;
    }
  });

  return nearestIndex;
}

/**
 * RouteOptimizer component for reordering and exporting a delivery route.
 */
export function RouteOptimizer({
  waypoints,
  className = '',
  height = '400px',
}: RouteOptimizerProps): React.ReactElement {
  const { optimizedRoute, totalDistance, estimatedTime, reorder } =
    useRouteOptimization(waypoints);

  const handleMarkerDragEnd = useCallback(
    (index: number, latLng: L.LatLng) => {
      if (optimizedRoute.length < 2) return;

      const targetIndex = getNearestTargetIndex(index, optimizedRoute, latLng);
      if (targetIndex !== index) {
        reorder(index, targetIndex);
      }
    },
    [optimizedRoute, reorder]
  );

  const polylineCoordinates: [number, number][] = useMemo(
    () =>
      optimizedRoute.map((w) => [w.coordinate.latitude, w.coordinate.longitude]),
    [optimizedRoute]
  );

  const handleExport = () => {
    const exportData: OptimizedRouteExport = {
      waypoints,
      route: optimizedRoute,
      totalDistanceKm: totalDistance,
      estimatedTimeMinutes: estimatedTime,
      generatedAt: new Date().toISOString(),
    };
    downloadRouteAsJson(exportData);
  };

  if (waypoints.length === 0) {
    return (
      <div
        className={`flex items-center justify-center bg-gray-50 dark:bg-gray-800 rounded-lg border border-dashed border-gray-300 dark:border-gray-600 ${className}`}
        style={{ height }}
      >
        <div className="flex flex-col items-center gap-2 p-4">
          <MapPin className="w-8 h-8 text-gray-400 dark:text-gray-500" />
          <p className="text-sm text-gray-600 dark:text-gray-400">
            No waypoints to optimize
          </p>
        </div>
      </div>
    );
  }

  const center: [number, number] = [
    optimizedRoute[0].coordinate.latitude,
    optimizedRoute[0].coordinate.longitude,
  ];

  return (
    <div
      className={`rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 ${className}`}
    >
      <DynamicMapContainer
        center={center}
        zoom={12}
        style={{ height, width: '100%' }}
        scrollWheelZoom={true}
        className="z-0"
        data-testid="route-optimizer-map"
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />

        {optimizedRoute.map((waypoint, index) => (
          <Marker
            key={waypoint.id}
            position={[waypoint.coordinate.latitude, waypoint.coordinate.longitude]}
            icon={waypointMarkerIcon(index)}
            draggable={true}
            eventHandlers={{
              dragend: (event: { target: L.Marker }) => {
                const latLng = event.target.getLatLng();
                handleMarkerDragEnd(index, latLng);
              },
            }}
            data-draggable="true"
          >
            <Popup>
              <div className="text-sm">
                <p className="font-semibold text-sky-700">
                  {index + 1}. {waypoint.label}
                </p>
                {waypoint.address && (
                  <p className="text-gray-600">{waypoint.address}</p>
                )}
              </div>
            </Popup>
          </Marker>
        ))}

        {polylineCoordinates.length > 1 && (
          <Polyline
            positions={polylineCoordinates}
            color="#0284c7"
            weight={3}
            opacity={0.7}
          />
        )}
      </DynamicMapContainer>

      {/* Reorder list — up/down buttons since dnd-kit is not a dependency
          of this repo; this is a deliberate simplification of literal
          drag-and-drop reordering. */}
      <ul
        aria-label="Waypoint order"
        className="divide-y divide-gray-100 dark:divide-gray-700 bg-white dark:bg-gray-900"
      >
        {optimizedRoute.map((waypoint, index) => (
          <li
            key={waypoint.id}
            className="flex items-center justify-between gap-3 px-4 py-2 text-sm"
          >
            <span className="text-gray-900 dark:text-gray-100">
              {index + 1}. {waypoint.label}
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                aria-label={`Move ${waypoint.label} up`}
                disabled={index === 0}
                onClick={() => reorder(index, index - 1)}
                className="rounded p-1 text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-transparent dark:hover:bg-gray-800"
              >
                <ArrowUp className="w-4 h-4" />
              </button>
              <button
                type="button"
                aria-label={`Move ${waypoint.label} down`}
                disabled={index === optimizedRoute.length - 1}
                onClick={() => reorder(index, index + 1)}
                className="rounded p-1 text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-transparent dark:hover:bg-gray-800"
              >
                <ArrowDown className="w-4 h-4" />
              </button>
            </div>
          </li>
        ))}
      </ul>

      {/* Route info bar */}
      <div className="bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-3">
        <div className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
          <div>
            <p className="text-gray-600 dark:text-gray-400">Total Distance</p>
            <p
              className="font-semibold text-gray-900 dark:text-gray-100"
              data-testid="route-total-distance"
            >
              {totalDistance.toFixed(1)} km
            </p>
          </div>
          <div>
            <p className="text-gray-600 dark:text-gray-400">Est. Time</p>
            <p
              className="font-semibold text-gray-900 dark:text-gray-100"
              data-testid="route-estimated-time"
            >
              {Math.round(estimatedTime)} min
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleExport}
          className="mt-3 inline-flex items-center gap-2 rounded-md bg-sky-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-sky-700"
        >
          <Download className="w-4 h-4" />
          Export Route (JSON)
        </button>
      </div>
    </div>
  );
}

export default RouteOptimizer;
