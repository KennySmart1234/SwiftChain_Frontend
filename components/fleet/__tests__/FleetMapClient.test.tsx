/**
 * FleetMapClient component tests.
 *
 * Covers the fleet manager live map: marker clustering as the manager zooms
 * out, re-clustering when driver telemetry arrives, and the empty/degenerate
 * data paths.
 *
 * Leaflet is mocked wholesale - jsdom has no layout engine, so the real
 * MapContainer cannot mount. The stubs expose the props the component passes
 * down (center, radius, colour) as data attributes so the assertions describe
 * what a fleet manager would see on the map.
 */

import { render, screen, act } from '@testing-library/react';
import FleetMapClient from '@/components/fleet/FleetMapClient';
import { cellSizeForZoom } from '@/components/fleet/clustering';
import type { Driver } from '@/types/fleet';

// Captured across renders so tests can drive Leaflet's `zoomend` event.
const mockMapState = { zoom: 6 };
let mockZoomHandler: (() => void) | undefined;

jest.mock('leaflet/dist/leaflet.css', () => ({}));

jest.mock('leaflet', () => ({
  __esModule: true,
  default: {
    Icon: { Default: { prototype: { _getIconUrl: () => 'icon.png' } } },
  },
}));

jest.mock('react-leaflet', () => {
  const React = require('react');
  return {
    __esModule: true,
    MapContainer: ({ children, center, zoom, ...rest }: any) =>
      React.createElement(
        'div',
        {
          'data-testid': 'map-container',
          'data-center': center.join(','),
          'data-zoom': String(zoom),
          'aria-label': rest['aria-label'],
        },
        children,
      ),
    TileLayer: ({ url }: any) =>
      React.createElement('div', {
        'data-testid': 'tile-layer',
        'data-url': url,
      }),
    CircleMarker: ({ children, center, radius, pathOptions }: any) =>
      React.createElement(
        'div',
        {
          'data-testid': 'cluster-marker',
          'data-center': center.join(','),
          'data-radius': String(radius),
          'data-color': pathOptions.color,
        },
        children,
      ),
    Tooltip: ({ children }: any) =>
      React.createElement('div', { 'data-testid': 'marker-tooltip' }, children),
    useMapEvents: (handlers: { zoomend?: () => void }) => {
      mockZoomHandler = handlers.zoomend;
      return { getZoom: () => mockMapState.zoom };
    },
  };
});

function driver(id: string, lat: number, lng: number): Driver {
  return {
    id,
    name: `Driver ${id}`,
    phone: '+2348000000000',
    vehicleType: 'Van',
    vehiclePlate: `PLATE-${id}`,
    status: 'active',
    rating: 4.5,
    activeDeliveries: 1,
    completedDeliveries: 10,
    location: { lat, lng, updatedAt: '2026-04-25T00:00:00Z' },
  };
}

/** Simulates the manager zooming the map, mirroring Leaflet's `zoomend`. */
function zoomTo(level: number) {
  mockMapState.zoom = level;
  act(() => {
    mockZoomHandler?.();
  });
}

function markers() {
  return screen.queryAllByTestId('cluster-marker');
}

function tooltipTexts() {
  return screen.queryAllByTestId('marker-tooltip').map((el) => el.textContent);
}

// Two drivers a few km apart: distinct at street zoom, one pin at country zoom.
const LAGOS_A = driver('a', 6.51, 3.41);
const LAGOS_B = driver('b', 6.59, 3.49);
// A third, far away in Abuja, that must never merge with the Lagos pair.
const ABUJA = driver('c', 9.06, 7.49);

describe('FleetMapClient', () => {
  beforeEach(() => {
    mockMapState.zoom = 6;
    mockZoomHandler = undefined;
  });

  describe('base rendering', () => {
    it('renders the map shell and OpenStreetMap tiles', () => {
      render(<FleetMapClient drivers={[LAGOS_A]} />);

      expect(screen.getByTestId('map-container')).toBeInTheDocument();
      expect(screen.getByTestId('tile-layer')).toHaveAttribute(
        'data-url',
        'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      );
    });

    it('centres the map on the mean driver position', () => {
      render(<FleetMapClient drivers={[LAGOS_A, LAGOS_B]} />);

      const [lat, lng] = screen
        .getByTestId('map-container')
        .getAttribute('data-center')!
        .split(',')
        .map(Number);

      expect(lat).toBeCloseTo(6.55, 5);
      expect(lng).toBeCloseTo(3.45, 5);
    });

    it('falls back to the default centre when there are no drivers', () => {
      render(<FleetMapClient drivers={[]} />);

      expect(screen.getByTestId('map-container')).toHaveAttribute(
        'data-center',
        '9.082,8.6753',
      );
    });

    it('renders one marker per driver when they are far apart', () => {
      render(<FleetMapClient drivers={[LAGOS_A, ABUJA]} />);

      expect(markers()).toHaveLength(2);
      expect(tooltipTexts()).toEqual(
        expect.arrayContaining(['Driver a', 'Driver c']),
      );
    });
  });

  describe('clustering on zoom', () => {
    it('keeps nearby drivers separate while zoomed in', () => {
      render(<FleetMapClient drivers={[LAGOS_A, LAGOS_B]} />);

      zoomTo(13);

      expect(markers()).toHaveLength(2);
      expect(tooltipTexts()).toEqual(
        expect.arrayContaining(['Driver a', 'Driver b']),
      );
    });

    it('merges nearby drivers into one cluster when zoomed out', () => {
      render(<FleetMapClient drivers={[LAGOS_A, LAGOS_B]} />);

      zoomTo(13);
      expect(markers()).toHaveLength(2);

      zoomTo(3);

      const merged = markers();
      expect(merged).toHaveLength(1);
      expect(merged[0]).toHaveTextContent('2 drivers');
    });

    it('splits a cluster back apart when the manager zooms in again', () => {
      render(<FleetMapClient drivers={[LAGOS_A, LAGOS_B]} />);

      zoomTo(3);
      expect(markers()).toHaveLength(1);

      zoomTo(14);

      expect(markers()).toHaveLength(2);
      expect(tooltipTexts()).not.toContain('2 drivers');
    });

    it('never merges drivers in different cities at a regional zoom', () => {
      render(<FleetMapClient drivers={[LAGOS_A, LAGOS_B, ABUJA]} />);

      zoomTo(3);

      const rendered = markers();
      expect(rendered).toHaveLength(2);
      expect(tooltipTexts()).toEqual(
        expect.arrayContaining(['2 drivers', 'Driver c']),
      );
    });

    it('grows the marker radius and switches colour for clusters', () => {
      render(<FleetMapClient drivers={[LAGOS_A, LAGOS_B, ABUJA]} />);

      zoomTo(3);

      const [cluster, single] = markers().sort(
        (a, b) =>
          Number(b.getAttribute('data-radius')) -
          Number(a.getAttribute('data-radius')),
      );

      expect(cluster).toHaveAttribute('data-radius', '12');
      expect(cluster).toHaveAttribute('data-color', '#1d4ed8');
      expect(single).toHaveAttribute('data-radius', '8');
      expect(single).toHaveAttribute('data-color', '#10b981');
    });

    it('positions a cluster marker at the centroid of its drivers', () => {
      render(<FleetMapClient drivers={[LAGOS_A, LAGOS_B]} />);

      zoomTo(3);

      const [lat, lng] = markers()[0]
        .getAttribute('data-center')!
        .split(',')
        .map(Number);

      expect(lat).toBeCloseTo(6.55, 5);
      expect(lng).toBeCloseTo(3.45, 5);
    });

    it('adopts the map instance zoom on mount instead of assuming the initial one', () => {
      mockMapState.zoom = 3;

      render(<FleetMapClient drivers={[LAGOS_A, LAGOS_B]} />);

      expect(markers()).toHaveLength(1);
      expect(markers()[0]).toHaveTextContent('2 drivers');
    });
  });

  describe('live driver updates', () => {
    it('re-clusters when a driver location update arrives', () => {
      const { rerender } = render(
        <FleetMapClient drivers={[LAGOS_A, ABUJA]} />,
      );
      expect(markers()).toHaveLength(2);

      // The Abuja driver's telemetry moves them next to the Lagos driver.
      rerender(
        <FleetMapClient
          drivers={[LAGOS_A, { ...ABUJA, location: { ...LAGOS_A.location } }]}
        />,
      );

      expect(markers()).toHaveLength(1);
      expect(markers()[0]).toHaveTextContent('2 drivers');
    });

    it('adds a marker when a new driver comes online', () => {
      const { rerender } = render(<FleetMapClient drivers={[LAGOS_A]} />);
      expect(markers()).toHaveLength(1);

      rerender(<FleetMapClient drivers={[LAGOS_A, ABUJA]} />);

      expect(markers()).toHaveLength(2);
    });

    it('removes markers when every driver goes offline', () => {
      const { rerender } = render(
        <FleetMapClient drivers={[LAGOS_A, ABUJA]} />,
      );

      rerender(<FleetMapClient drivers={[]} />);

      expect(markers()).toHaveLength(0);
      expect(screen.getByTestId('map-container')).toBeInTheDocument();
    });

    it('keeps the cluster stable when an unrelated driver field changes', () => {
      const { rerender } = render(
        <FleetMapClient drivers={[LAGOS_A, LAGOS_B]} />,
      );
      zoomTo(3);
      expect(markers()).toHaveLength(1);

      rerender(
        <FleetMapClient drivers={[{ ...LAGOS_A, rating: 3.1 }, LAGOS_B]} />,
      );

      expect(markers()).toHaveLength(1);
      expect(markers()[0]).toHaveTextContent('2 drivers');
    });
  });

  describe('empty and edge cases', () => {
    it('renders no markers for an empty fleet', () => {
      render(<FleetMapClient drivers={[]} />);

      expect(markers()).toHaveLength(0);
      expect(screen.getByTestId('tile-layer')).toBeInTheDocument();
    });

    it('renders a single marker for drivers sharing an exact position', () => {
      const shared = { lat: 6.51, lng: 3.41, updatedAt: '2026-04-25T00:00:00Z' };
      render(
        <FleetMapClient
          drivers={[
            { ...LAGOS_A, location: shared },
            { ...LAGOS_B, location: { ...shared } },
          ]}
        />,
      );

      expect(markers()).toHaveLength(1);
      expect(markers()[0]).toHaveTextContent('2 drivers');
    });

    it('survives a NaN zoom by falling back to the default cell size', () => {
      render(<FleetMapClient drivers={[LAGOS_A, LAGOS_B, ABUJA]} />);

      zoomTo(Number.NaN);

      expect(cellSizeForZoom(Number.NaN)).toBe(0.05);
      expect(markers()).toHaveLength(3);
    });

    it('keeps drivers near the equator and prime meridian separate when zoomed in', () => {
      render(
        <FleetMapClient drivers={[driver('x', 0, 0), driver('y', -0.4, -0.4)]} />,
      );

      zoomTo(12);

      expect(markers()).toHaveLength(2);
    });
  });
});

describe('FleetMapClient waypoint drag-and-drop reordering (Issue #832)', () => {
  const routeWaypoints = [
    {
      id: 'wp-1',
      coordinate: { latitude: 6.5244, longitude: 3.3792 },
      label: 'Apapa Port',
    },
    {
      id: 'wp-2',
      coordinate: { latitude: 6.6018, longitude: 3.3515 },
      label: 'Ikeja Hub',
    },
    {
      id: 'wp-3',
      coordinate: { latitude: 6.4281, longitude: 3.4219 },
      label: 'Victoria Island',
    },
  ];

  it('displays connection lines between waypoints and shows dashed drop zone preview while dragging', () => {
    const { fireEvent } = require('@testing-library/react');
    render(
      <FleetMapClient drivers={[LAGOS_A]} waypoints={routeWaypoints} />,
    );

    const connectionLine = screen.getByTestId('waypoint-connection-line');
    expect(connectionLine).toBeInTheDocument();
    expect(connectionLine).toHaveAttribute(
      'data-waypoint-order',
      'wp-1,wp-2,wp-3',
    );

    const waypointMarkers = screen.getAllByTestId('waypoint-marker');
    expect(waypointMarkers).toHaveLength(3);

    // Start dragging the first marker
    fireEvent.dragStart(waypointMarkers[0]);

    // Dashed drop preview appears
    const preview = screen.getByTestId('dashed-drop-preview');
    expect(preview).toBeInTheDocument();
    expect(preview).toHaveClass('border-dashed');

    // Drop zones highlight valid positions (positions 1 and 2 are valid drop targets for marker 0)
    const dropZones = screen.getAllByTestId('waypoint-drop-zone');
    expect(dropZones[0]).toHaveAttribute('data-valid-drop', 'false');
    expect(dropZones[1]).toHaveAttribute('data-valid-drop', 'true');
    expect(dropZones[2]).toHaveAttribute('data-valid-drop', 'true');
  });

  it('highlights the hovered drop zone and updates connection lines in real-time during drag', () => {
    const { fireEvent } = require('@testing-library/react');
    render(
      <FleetMapClient drivers={[LAGOS_A]} waypoints={routeWaypoints} />,
    );

    const waypointMarkers = screen.getAllByTestId('waypoint-marker');
    const dropZones = screen.getAllByTestId('waypoint-drop-zone');

    fireEvent.dragStart(waypointMarkers[0]);
    fireEvent.dragOver(dropZones[2]);

    // Drop zone 2 is highlighted
    expect(dropZones[2]).toHaveAttribute('data-highlighted', 'true');

    // Connection line updates in real-time to reflect the preview order (wp-2, wp-3, wp-1)
    const connectionLine = screen.getByTestId('waypoint-connection-line');
    expect(connectionLine).toHaveAttribute(
      'data-waypoint-order',
      'wp-2,wp-3,wp-1',
    );
    expect(connectionLine).toHaveAttribute(
      'data-positions',
      '6.6018,3.3515;6.4281,3.4219;6.5244,3.3792',
    );
  });

  it('snaps marker smoothly to valid drop position and updates route visualization after reorder', () => {
    const { fireEvent } = require('@testing-library/react');
    const onWaypointReorder = jest.fn();

    render(
      <FleetMapClient
        drivers={[LAGOS_A]}
        waypoints={routeWaypoints}
        onWaypointReorder={onWaypointReorder}
      />,
    );

    const waypointMarkers = screen.getAllByTestId('waypoint-marker');
    const dropZones = screen.getAllByTestId('waypoint-drop-zone');

    fireEvent.dragStart(waypointMarkers[0]);
    fireEvent.dragOver(dropZones[2]);
    fireEvent.drop(dropZones[2]);

    // Dashed preview disappears after drop
    expect(screen.queryByTestId('dashed-drop-preview')).not.toBeInTheDocument();

    // Callback received reordered array and route optimization result
    expect(onWaypointReorder).toHaveBeenCalledTimes(1);
    const [reordered] = onWaypointReorder.mock.calls[0];
    expect(reordered.map((w: { id: string }) => w.id)).toEqual([
      'wp-2',
      'wp-3',
      'wp-1',
    ]);

    // Updated markers and snapped state
    const updatedMarkers = screen.getAllByTestId('waypoint-marker');
    expect(updatedMarkers[2]).toHaveAttribute('data-waypoint-id', 'wp-1');
    expect(updatedMarkers[2]).toHaveAttribute('data-snapped', 'true');
  });
});
