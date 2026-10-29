'use client';

import React, { useMemo } from 'react';
import { CircleMarker, Tooltip } from 'react-leaflet';
import { useDriverLocationSocket } from '@/hooks/useDriverLocationSocket';
import type { Driver } from '@/types/fleet';

interface LiveTrackerProps {
  driver: Driver;
  /** Optional callback when location updates occur */
  onLocationUpdate?: (lat: number, lng: number) => void;
  /** Optional custom marker color (default: #10b981 for online drivers) */
  markerColor?: string;
  /** Optional custom marker fill color (default: #34d399) */
  markerFillColor?: string;
}

/**
 * LiveTracker — Component layer for rendering live driver location markers.
 *
 * Consumes useDriverLocationSocket() only — it does not manage WebSocket
 * connection, reconnection, or interpolation directly. These concerns are
 * owned by the hook.
 *
 * Integrates with react-leaflet MapContainer to render/update markers
 * using interpolated coordinates in real time.
 *
 * Following Strict Layered Architecture:
 * Component (this) -> Hook (useDriverLocationSocket) -> Service (driverTrackingService).
 */
export function LiveTracker({
  driver,
  onLocationUpdate,
  markerColor = '#10b981',
  markerFillColor = '#34d399',
}: LiveTrackerProps): React.ReactElement {
  const { position, connectionStatus, error } =
    useDriverLocationSocket(driver.id);

  // Memoize to avoid unnecessary re-renders of the marker
  const markerCenter = useMemo(
    () => [position.lat, position.lng] as [number, number],
    [position.lat, position.lng],
  );

  // Notify caller of location updates
  React.useEffect(() => {
    onLocationUpdate?.(position.lat, position.lng);
  }, [position.lat, position.lng, onLocationUpdate]);

  // Determine marker styling based on connection status
  const markerOpacity = connectionStatus === 'connected' ? 0.9 : 0.5;
  const markerStroke =
    connectionStatus === 'reconnecting' ? '#f59e0b' : markerColor;

  const tooltipText = useMemo(() => {
    let text = driver.name;
    if (connectionStatus === 'reconnecting') {
      text += ' (reconnecting...)';
    } else if (connectionStatus === 'disconnected') {
      text += ' (offline)';
    }
    if (error) {
      text += ` — Error: ${error}`;
    }
    return text;
  }, [driver.name, connectionStatus, error]);

  return (
    <CircleMarker
      center={markerCenter}
      radius={8}
      pathOptions={{
        color: markerStroke,
        fillColor: markerFillColor,
        fillOpacity: markerOpacity,
        weight: 2,
      }}
      data-testid={`live-tracker-${driver.id}`}
      data-connection-status={connectionStatus}
    >
      <Tooltip direction="top" offset={[0, -4]} opacity={1}>
        {tooltipText}
      </Tooltip>
    </CircleMarker>
  );
}

export default LiveTracker;
