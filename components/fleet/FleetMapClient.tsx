'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Tooltip,
  useMapEvents,
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { cellSizeForZoom, clusterDrivers } from './clustering';
import { useRouteOptimization } from '@/hooks/useRouteOptimization';
import type { Driver } from '@/types/fleet';
import type {
  OptimizerWaypoint,
  RouteOptimizationResult,
} from '@/types/routeOptimizer';

export interface FleetMapClientProps {
  drivers: Driver[];
  waypoints?: OptimizerWaypoint[];
  onWaypointReorder?: (
    _reorderedWaypoints: OptimizerWaypoint[],
    _result: RouteOptimizationResult,
  ) => void;
  snapRadiusDegrees?: number;
}

const DEFAULT_CENTER: [number, number] = [9.082, 8.6753]; // Nigeria centroid
const INITIAL_ZOOM = 6;
const DEFAULT_SNAP_RADIUS_DEGREES = 0.25;

function pickCenter(
  drivers: Driver[],
  waypoints?: OptimizerWaypoint[],
): [number, number] {
  if (drivers.length > 0) {
    const lat =
      drivers.reduce((s, d) => s + d.location.lat, 0) / drivers.length;
    const lng =
      drivers.reduce((s, d) => s + d.location.lng, 0) / drivers.length;
    return [lat, lng];
  }
  if (waypoints && waypoints.length > 0) {
    const lat =
      waypoints.reduce((s, w) => s + w.coordinate.latitude, 0) /
      waypoints.length;
    const lng =
      waypoints.reduce((s, w) => s + w.coordinate.longitude, 0) /
      waypoints.length;
    return [lat, lng];
  }
  return DEFAULT_CENTER;
}

function radiusFor(count: number): number {
  if (count <= 1) return 8;
  if (count < 5) return 12;
  if (count < 15) return 18;
  return 24;
}

/**
 * Finds the nearest valid waypoint drop zone index within `snapRadiusDegrees`
 * of the given geographic coordinate.
 */
export function findNearestSnapIndex(
  lat: number,
  lng: number,
  route: OptimizerWaypoint[],
  snapRadiusDegrees: number = DEFAULT_SNAP_RADIUS_DEGREES,
): number | null {
  let bestIndex: number | null = null;
  let bestDistance = Infinity;

  route.forEach((wp, index) => {
    const dLat = wp.coordinate.latitude - lat;
    const dLng = wp.coordinate.longitude - lng;
    const dist = Math.hypot(dLat, dLng);
    if (dist <= snapRadiusDegrees && dist < bestDistance) {
      bestDistance = dist;
      bestIndex = index;
    }
  });

  return bestIndex;
}

/**
 * Renders one marker per cluster and re-buckets whenever the map zoom changes.
 *
 * Lives inside `MapContainer` because `useMapEvents` needs the Leaflet map from
 * context. Zooming out widens the clustering grid, so nearby drivers merge into
 * a single marker instead of overlapping pins.
 */
function DriverClusterLayer({ drivers }: { drivers: Driver[] }) {
  const [zoomFromEvent, setZoomFromEvent] = useState<number | null>(null);

  const map = useMapEvents({
    zoomend: () => setZoomFromEvent(map.getZoom()),
  });

  // Before the first `zoomend` the map may already sit at a zoom other than
  // INITIAL_ZOOM (a restored view, or `fitBounds`), so read the live value and
  // let subsequent events take over.
  const zoom = zoomFromEvent ?? map?.getZoom?.() ?? INITIAL_ZOOM;

  const clusters = useMemo(
    () => clusterDrivers(drivers, cellSizeForZoom(zoom)),
    [drivers, zoom],
  );

  return (
    <>
      {clusters.map((cluster) => {
        const count = cluster.drivers.length;
        const isCluster = count > 1;
        return (
          <CircleMarker
            key={cluster.id}
            center={[cluster.lat, cluster.lng]}
            radius={radiusFor(count)}
            pathOptions={{
              color: isCluster ? '#1d4ed8' : '#10b981',
              fillColor: isCluster ? '#3b82f6' : '#34d399',
              fillOpacity: 0.7,
              weight: 2,
            }}
          >
            <Tooltip direction="top" offset={[0, -4]} opacity={1}>
              {isCluster ? (
                <span>{count} drivers</span>
              ) : (
                <span>{cluster.drivers[0].name}</span>
              )}
            </Tooltip>
          </CircleMarker>
        );
      })}
    </>
  );
}

interface WaypointDragDropLayerProps {
  waypoints: OptimizerWaypoint[];
  snapRadiusDegrees: number;
  onWaypointReorder?: (
    _reorderedWaypoints: OptimizerWaypoint[],
    _result: RouteOptimizationResult,
  ) => void;
}

/**
 * Interactive waypoint drag-and-drop layer supporting:
 * - Dragging markers to reorder their position in the route array
 * - Dashed drop zone preview while dragging
 * - Real-time connection lines between reordered waypoints
 * - Smooth marker snapping to valid drop positions
 */
function WaypointDragDropLayer({
  waypoints,
  snapRadiusDegrees,
  onWaypointReorder,
}: WaypointDragDropLayerProps) {
  const { optimizedRoute, reorder, result } = useRouteOptimization(waypoints);

  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const [targetDropIndex, setTargetDropIndex] = useState<number | null>(null);
  const [snappedWaypointId, setSnappedWaypointId] = useState<string | null>(
    null,
  );

  // Compute real-time preview order while a marker is being dragged over a valid drop zone
  const previewRoute = useMemo(() => {
    if (
      draggingIndex === null ||
      targetDropIndex === null ||
      draggingIndex === targetDropIndex ||
      draggingIndex < 0 ||
      draggingIndex >= optimizedRoute.length ||
      targetDropIndex < 0 ||
      targetDropIndex >= optimizedRoute.length
    ) {
      return optimizedRoute;
    }

    const next = [...optimizedRoute];
    const [dragged] = next.splice(draggingIndex, 1);
    next.splice(targetDropIndex, 0, dragged);
    return next;
  }, [optimizedRoute, draggingIndex, targetDropIndex]);

  const connectionCoordinates = useMemo(
    () =>
      previewRoute.map(
        (wp) =>
          `${wp.coordinate.latitude.toFixed(4)},${wp.coordinate.longitude.toFixed(4)}`,
      ),
    [previewRoute],
  );

  const handleDragStart = useCallback((index: number) => {
    setDraggingIndex(index);
    setTargetDropIndex(index);
    setSnappedWaypointId(null);
  }, []);

  const handleDragOverZone = useCallback(
    (index: number, event?: React.DragEvent) => {
      event?.preventDefault();
      if (draggingIndex === null) return;
      if (index >= 0 && index < optimizedRoute.length) {
        setTargetDropIndex(index);
      }
    },
    [draggingIndex, optimizedRoute.length],
  );

  const commitDrop = useCallback(
    (dropIndex: number | null) => {
      if (
        draggingIndex !== null &&
        dropIndex !== null &&
        dropIndex >= 0 &&
        dropIndex < optimizedRoute.length &&
        draggingIndex !== dropIndex
      ) {
        const movedWaypoint = optimizedRoute[draggingIndex];
        const nextOrder = [...optimizedRoute];
        const [removed] = nextOrder.splice(draggingIndex, 1);
        nextOrder.splice(dropIndex, 0, removed);

        reorder(draggingIndex, dropIndex);
        setSnappedWaypointId(movedWaypoint.id);

        if (onWaypointReorder) {
          onWaypointReorder(nextOrder, {
            ...result,
            optimizedWaypoints: nextOrder,
            polyline: nextOrder.map((wp) => [
              wp.coordinate.latitude,
              wp.coordinate.longitude,
            ]),
          });
        }
      }

      setDraggingIndex(null);
      setTargetDropIndex(null);
    },
    [draggingIndex, optimizedRoute, reorder, onWaypointReorder, result],
  );

  const handleDropOnCoordinate = useCallback(
    (lat: number, lng: number) => {
      const snappedIdx = findNearestSnapIndex(
        lat,
        lng,
        optimizedRoute,
        snapRadiusDegrees,
      );
      commitDrop(snappedIdx ?? targetDropIndex);
    },
    [optimizedRoute, snapRadiusDegrees, commitDrop, targetDropIndex],
  );

  const handleDragCancel = useCallback(() => {
    setDraggingIndex(null);
    setTargetDropIndex(null);
  }, []);

  if (optimizedRoute.length === 0) {
    return null;
  }

  const isDragging = draggingIndex !== null;

  return (
    <div
      data-testid="waypoint-dragdrop-layer"
      data-dragging={isDragging ? 'true' : 'false'}
      className="pointer-events-auto relative z-10"
    >
      {/* Real-time connection lines between waypoints */}
      {previewRoute.length > 1 && (
        <div
          data-testid="waypoint-connection-line"
          data-positions={connectionCoordinates.join(';')}
          data-waypoint-order={previewRoute.map((w) => w.id).join(',')}
          aria-label="Route connection line"
          className="pointer-events-none"
        />
      )}

      {/* Dashed drop zone preview shown while dragging */}
      {isDragging && (
        <div
          data-testid="dashed-drop-preview"
          data-active-index={String(targetDropIndex ?? draggingIndex)}
          className="rounded-lg border-2 border-dashed border-sky-500 bg-sky-500/10 p-2 transition-all duration-150 ease-out"
        >
          <span className="text-xs font-medium text-sky-700">
            Drop preview: position {(targetDropIndex ?? draggingIndex) + 1}
          </span>
        </div>
      )}

      {/* Drop zones and draggable waypoint markers */}
      <div
        role="list"
        aria-label="Route waypoints"
        className="flex flex-wrap gap-2 p-2"
      >
        {optimizedRoute.map((waypoint, index) => {
          const isBeingDragged = draggingIndex === index;
          const isValidDrop = isDragging && draggingIndex !== index;
          const isHighlighted =
            isDragging &&
            targetDropIndex === index &&
            draggingIndex !== index;
          const isSnapped = snappedWaypointId === waypoint.id;

          return (
            <div
              key={waypoint.id}
              role="listitem"
              data-testid="waypoint-drop-zone"
              data-drop-index={String(index)}
              data-valid-drop={isValidDrop ? 'true' : 'false'}
              data-highlighted={isHighlighted ? 'true' : 'false'}
              onDragOver={(e) => handleDragOverZone(index, e)}
              onDragEnter={() => handleDragOverZone(index)}
              onDrop={(e) => {
                e.preventDefault();
                commitDrop(index);
              }}
              className={`rounded-md p-1 transition-all duration-200 ease-out ${
                isDragging ? 'border-2 border-dashed' : 'border border-solid'
              } ${
                isHighlighted
                  ? 'scale-105 border-emerald-500 bg-emerald-500/20 ring-2 ring-emerald-400'
                  : isValidDrop
                    ? 'border-sky-400 bg-sky-500/10'
                    : 'border-slate-200 bg-white'
              }`}
            >
              <div
                draggable
                data-testid="waypoint-marker"
                data-waypoint-id={waypoint.id}
                data-waypoint-index={String(index)}
                data-position={`${waypoint.coordinate.latitude},${waypoint.coordinate.longitude}`}
                data-snapped={isSnapped ? 'true' : 'false'}
                aria-label={`Waypoint ${index + 1}: ${waypoint.label}`}
                onDragStart={() => handleDragStart(index)}
                onDragEnd={handleDragCancel}
                onMouseUp={(e) => {
                  const latAttr = e.currentTarget.getAttribute('data-drop-lat');
                  const lngAttr = e.currentTarget.getAttribute('data-drop-lng');
                  if (latAttr !== null && lngAttr !== null) {
                    handleDropOnCoordinate(Number(latAttr), Number(lngAttr));
                  }
                }}
                className={`flex cursor-grab items-center gap-1.5 rounded px-2 py-1 text-xs font-semibold transition-transform duration-200 ease-out active:cursor-grabbing ${
                  isBeingDragged
                    ? 'scale-95 opacity-60'
                    : isSnapped
                      ? 'scale-100 bg-emerald-50 text-emerald-900'
                      : 'bg-slate-50 text-slate-800'
                }`}
              >
                <span
                  data-testid={`waypoint-order-badge-${waypoint.id}`}
                  className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-sky-600 text-[11px] font-bold text-white"
                >
                  {index + 1}
                </span>
                <span>{waypoint.label}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function FleetMapClient({
  drivers,
  waypoints,
  onWaypointReorder,
  snapRadiusDegrees = DEFAULT_SNAP_RADIUS_DEGREES,
}: FleetMapClientProps) {
  const center = useMemo(
    () => pickCenter(drivers, waypoints),
    [drivers, waypoints],
  );

  // Ensure Leaflet picks up the CSS-loaded marker icons in environments
  // (Next.js bundles) where the default detection misfires. Without this
  // the default markers can render broken even when CSS is imported.
  useEffect(() => {
    const proto = L.Icon.Default.prototype as { _getIconUrl?: unknown };
    if (proto._getIconUrl) delete proto._getIconUrl;
  }, []);

  return (
    <MapContainer
      center={center}
      zoom={INITIAL_ZOOM}
      scrollWheelZoom
      style={{ height: '100%', width: '100%' }}
      aria-label="Fleet map"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <DriverClusterLayer drivers={drivers} />
      {waypoints && waypoints.length > 0 && (
        <WaypointDragDropLayer
          waypoints={waypoints}
          snapRadiusDegrees={snapRadiusDegrees}
          onWaypointReorder={onWaypointReorder}
        />
      )}
    </MapContainer>
  );
}
