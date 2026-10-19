/**
 * TrackingMap Component
 * Interactive map for visualizing delivery routes with markers, polylines,
 * and estimated delivery time / date (ETA) calculations.
 */

'use client';

import React, { useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import { useTrackingRoute } from '@/hooks/useTrackingRoute';
import { calculateDistanceKm } from '@/services/geofenceService';
import { Coordinate, MapBounds, RouteData } from '@/types/tracking';
import { AlertCircle, Loader2, Package } from 'lucide-react';

const DEFAULT_AVERAGE_SPEED_KMH = 40;

interface TrackingMapProps {
  deliveryId: string | null;
  className?: string;
  height?: string;
  showControls?: boolean;
  onMapError?: (_error: string) => void;
}

/**
 * Calculates remaining ETA in minutes for a delivery route based on physical
 * progress between origin, currentLocation, and destination, or falls back to
 * `routeData.estimatedTime` / distance-based calculation.
 */
export function calculateRemainingEtaMinutes(
  routeData: RouteData,
  currentLocation?: Coordinate | null,
): number | null {
  if (routeData.status === 'delivered') {
    return 0;
  }

  const baseEta =
    typeof routeData.estimatedTime === 'number'
      ? routeData.estimatedTime
      : typeof routeData.distance === 'number'
        ? Math.round((routeData.distance / DEFAULT_AVERAGE_SPEED_KMH) * 60)
        : null;

  if (
    currentLocation &&
    routeData.status === 'in_transit' &&
    routeData.origin &&
    routeData.destination
  ) {
    const totalDirectKm = calculateDistanceKm(
      routeData.origin,
      routeData.destination,
    );
    const remainingDirectKm = calculateDistanceKm(
      currentLocation,
      routeData.destination,
    );

    if (totalDirectKm > 0 && baseEta !== null) {
      const ratio = Math.min(1, Math.max(0, remainingDirectKm / totalDirectKm));
      return Math.max(1, Math.round(baseEta * ratio));
    }

    if (remainingDirectKm >= 0) {
      return Math.max(
        0,
        Math.round((remainingDirectKm / DEFAULT_AVERAGE_SPEED_KMH) * 60),
      );
    }
  }

  return baseEta;
}

/**
 * Computes the ISO 8601 estimated delivery timestamp from a route timestamp
 * and ETA in minutes.
 */
export function calculateEstimatedDeliveryDate(
  timestamp: string | undefined,
  etaMinutes: number | null | undefined,
): string | null {
  if (!timestamp || typeof etaMinutes !== 'number' || !Number.isFinite(etaMinutes)) {
    return null;
  }
  const baseMs = Date.parse(timestamp);
  if (Number.isNaN(baseMs)) {
    return null;
  }
  return new Date(baseMs + etaMinutes * 60 * 1000).toISOString();
}

/**
 * Custom hook to fit bounds on map
 */
function FitBoundsHook({ bounds }: { bounds: MapBounds | null }) {
  const map = useMap();

  React.useEffect(() => {
    if (bounds && map) {
      const leafletBounds = L.latLngBounds(
        [bounds.south, bounds.west],
        [bounds.north, bounds.east]
      );
      map.fitBounds(leafletBounds, { padding: [50, 50], maxZoom: 16 });
    }
  }, [bounds, map]);

  return null;
}

/**
 * TrackingMap component for displaying delivery route
 */
export function TrackingMap({
  deliveryId,
  className = '',
  height = '400px',
  showControls = true,
  onMapError,
}: TrackingMapProps): React.ReactElement {
  const { routeData, currentLocation, isLoading, isError, error } =
    useTrackingRoute(deliveryId);

  // Calculate map bounds from route data
  const mapBounds: MapBounds | null = useMemo(() => {
    if (!routeData) return null;

    const { origin, destination, waypoints } = routeData;
    const coords = [origin, destination, ...waypoints.map((w) => w.coordinate)];
    if (currentLocation && routeData.status === 'in_transit') {
      coords.push(currentLocation);
    }

    const lats = coords.map((c) => c.latitude);
    const lngs = coords.map((c) => c.longitude);

    return {
      north: Math.max(...lats),
      south: Math.min(...lats),
      east: Math.max(...lngs),
      west: Math.min(...lngs),
    };
  }, [routeData, currentLocation]);

  // Create polyline coordinates
  const polylineCoordinates: [number, number][] = useMemo(() => {
    if (!routeData?.waypoints) return [];

    return routeData.waypoints.map((w) => [w.coordinate.latitude, w.coordinate.longitude]);
  }, [routeData]);

  const dynamicEtaMinutes = useMemo(() => {
    if (!routeData) return null;
    return calculateRemainingEtaMinutes(routeData, currentLocation);
  }, [routeData, currentLocation]);

  const estimatedDeliveryIso = useMemo(() => {
    if (!routeData) return null;
    const etaForDate = routeData.estimatedTime ?? dynamicEtaMinutes;
    return calculateEstimatedDeliveryDate(routeData.timestamp, etaForDate);
  }, [routeData, dynamicEtaMinutes]);

  // Create custom marker icons
  const originMarkerIcon = useMemo(
    () =>
      L.icon({
        iconUrl: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiMyMjc3NDMiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48cGF0aCBkPSJNMjEgMTBjMCA3LTkgMTMtOSAxM3MtOSAtNi05IC0xM2E5IDkgMCAwIDEgMTggMHoiPjwvcGF0aD48Y2lyY2xlIGN4PSIxMiIgY3k9IjEwIiByPSIzIj48L2NpcmNsZT48L3N2Zz4=',
        iconSize: [32, 32],
        iconAnchor: [16, 32],
        popupAnchor: [0, -32],
      }),
    []
  );

  const destinationMarkerIcon = useMemo(
    () =>
      L.icon({
        iconUrl: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiMwZWE1ZTkiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48cGF0aCBkPSJNMjEgMTBjMCA3LTkgMTMtOSAxM3MtOSAtNi05IC0xM2E5IDkgMCAwIDEgMTggMHoiPjwvcGF0aD48Y2lyY2xlIGN4PSIxMiIgY3k9IjEwIiByPSIzIj48L2NpcmNsZT48L3N2Zz4=',
        iconSize: [32, 32],
        iconAnchor: [16, 32],
        popupAnchor: [0, -32],
      }),
    []
  );

  const currentLocationIcon = useMemo(
    () =>
      L.icon({
        iconUrl: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSIjZjA5NzE2IiBzdHJva2U9IiNmZjAwMDAiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48Y2lyY2xlIGN4PSIxMiIgY3k9IjEyIiByPSI4Ij48L2NpcmNsZT48Y2lyY2xlIGN4PSIxMiIgY3k9IjEyIiByPSIzIj48L2NpcmNsZT48L3N2Zz4=',
        iconSize: [24, 24],
        iconAnchor: [12, 12],
        popupAnchor: [0, -12],
      }),
    []
  );

  // Handle map errors
  React.useEffect(() => {
    if (isError && error && onMapError) {
      onMapError(error);
    }
  }, [isError, error, onMapError]);

  // Loading state
  if (isLoading) {
    return (
      <div
        className={`flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-lg ${className}`}
        style={{ height }}
      >
        <div className="flex flex-col items-center gap-2">
          <Loader2
            data-testid="spinner"
            className="w-8 h-8 animate-spin text-blue-600 dark:text-blue-400"
          />
          <p className="text-sm text-gray-600 dark:text-gray-300">Loading map...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (isError) {
    return (
      <div
        className={`flex items-center justify-center bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800 ${className}`}
        style={{ height }}
      >
        <div className="flex flex-col items-center gap-2 p-4">
          <AlertCircle
            data-testid="alert-icon"
            className="w-8 h-8 text-red-600 dark:text-red-400"
          />
          <p className="text-sm text-red-800 dark:text-red-200 text-center">{error}</p>
        </div>
      </div>
    );
  }

  // No data state
  if (!routeData) {
    return (
      <div
        className={`flex items-center justify-center bg-gray-50 dark:bg-gray-800 rounded-lg border border-dashed border-gray-300 dark:border-gray-600 ${className}`}
        style={{ height }}
      >
        <div className="flex flex-col items-center gap-2 p-4">
          <Package
            data-testid="package-icon"
            className="w-8 h-8 text-gray-400 dark:text-gray-500"
          />
          <p className="text-sm text-gray-600 dark:text-gray-400">No delivery data available</p>
        </div>
      </div>
    );
  }

  const displayedEstimatedTime = routeData.estimatedTime ?? dynamicEtaMinutes;

  return (
    <div className={`rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 ${className}`}>
      <MapContainer
        center={[routeData.origin.latitude, routeData.origin.longitude]}
        zoom={13}
        style={{ height, width: '100%' }}
        zoomControl={showControls}
        scrollWheelZoom={true}
        className="z-0"
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />

        {/* Fit bounds to show full route */}
        {mapBounds && <FitBoundsHook bounds={mapBounds} />}

        {/* Origin marker */}
        <Marker
          position={[routeData.origin.latitude, routeData.origin.longitude]}
          icon={originMarkerIcon}
        >
          <Popup>
            <div className="text-sm">
              <p className="font-semibold text-green-700">Origin</p>
              {routeData.origin && (
                <p data-testid="origin-coordinates" className="text-gray-600">
                  {routeData.origin.latitude.toFixed(4)}, {routeData.origin.longitude.toFixed(4)}
                </p>
              )}
            </div>
          </Popup>
        </Marker>

        {/* Destination marker */}
        <Marker
          position={[routeData.destination.latitude, routeData.destination.longitude]}
          icon={destinationMarkerIcon}
        >
          <Popup>
            <div className="text-sm">
              <p className="font-semibold text-blue-700">Destination</p>
              {routeData.destination && (
                <p data-testid="destination-coordinates" className="text-gray-600">
                  {routeData.destination.latitude.toFixed(4)},
                  {routeData.destination.longitude.toFixed(4)}
                </p>
              )}
            </div>
          </Popup>
        </Marker>

        {/* Current location marker (when in transit) */}
        {currentLocation && routeData.status === 'in_transit' && (
          <Marker
            position={[currentLocation.latitude, currentLocation.longitude]}
            icon={currentLocationIcon}
          >
            <Popup>
              <div className="text-sm">
                <p className="font-semibold text-orange-700">Current Location</p>
                <p data-testid="current-location-coordinates" className="text-gray-600">
                  {currentLocation.latitude.toFixed(4)}, {currentLocation.longitude.toFixed(4)}
                </p>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Route polyline */}
        {polylineCoordinates.length > 0 && (
          <Polyline
            positions={polylineCoordinates}
            color="#0284c7"
            weight={3}
            opacity={0.7}
            dashArray="5, 5"
          />
        )}

        {/* Checkpoint markers */}
        {routeData.waypoints
          .filter((w) => w.type === 'checkpoint')
          .map((waypoint, idx) => (
            <Marker
              key={`checkpoint-${idx}`}
              position={[waypoint.coordinate.latitude, waypoint.coordinate.longitude]}
              icon={L.icon({
                iconUrl: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiNmNTk0MzAiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48cGF0aCBkPSJNMjEgMTBjMCA3LTkgMTMtOSAxM3MtOSAtNi05IC0xM2E5IDkgMCAwIDEgMTggMHoiPjwvcGF0aD48Y2lyY2xlIGN4PSIxMiIgY3k9IjEwIiByPSIzIj48L2NpcmNsZT48L3N2Zz4=',
                iconSize: [24, 24],
                iconAnchor: [12, 24],
                popupAnchor: [0, -24],
              })}
            >
              <Popup>
                <div className="text-sm">
                  <p className="font-semibold text-orange-700">
                    {waypoint.label || `Checkpoint ${idx + 1}`}
                  </p>
                  {waypoint.address && <p className="text-gray-600">{waypoint.address}</p>}
                </div>
              </Popup>
            </Marker>
          ))}
      </MapContainer>

      {/* Route info bar */}
      <div className="bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-3">
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-gray-600 dark:text-gray-400">Status</p>
            <p className="font-semibold capitalize text-gray-900 dark:text-gray-100">
              {routeData.status}
            </p>
          </div>
          {routeData.distance !== undefined && (
            <div>
              <p className="text-gray-600 dark:text-gray-400">Distance</p>
              <p
                data-testid="distance-value"
                className="font-semibold text-gray-900 dark:text-gray-100"
              >
                {routeData.distance.toFixed(1)} km
              </p>
            </div>
          )}
          {displayedEstimatedTime !== null && displayedEstimatedTime !== undefined && (
            <div>
              <p className="text-gray-600 dark:text-gray-400">Est. Time</p>
              <p
                data-testid="estimated-time-value"
                className="font-semibold text-gray-900 dark:text-gray-100"
              >
                {displayedEstimatedTime} min
              </p>
              {dynamicEtaMinutes !== null && (
                <span
                  data-testid="dynamic-remaining-eta"
                  className="sr-only"
                >
                  {dynamicEtaMinutes} min remaining
                </span>
              )}
              {estimatedDeliveryIso && (
                <span
                  data-testid="estimated-delivery-date"
                  className="sr-only"
                >
                  {estimatedDeliveryIso}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default TrackingMap;
