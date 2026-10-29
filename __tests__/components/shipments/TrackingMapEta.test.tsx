/**
 * [Test] Component: View Estimated Delivery Date Map Logic & UI (Issue #487)
 *
 * Automated component tests verifying that the real TrackingMap component:
 * 1. Renders physical route updates (origin, destination, checkpoints, live
 *    in-transit driver markers, polylines, and map bounds updates).
 * 2. Calculates and displays ETA and Estimated Delivery Date accurately
 *    across initial routes, live driver telemetry updates, and fallback
 *    distance calculations.
 * 3. Handles edge cases, empty states, and error states reliably with all
 *    external dependencies (Leaflet, APIs, WebSockets, Web3 wallets) mocked.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import {
  TrackingMap,
  calculateRemainingEtaMinutes,
  calculateEstimatedDeliveryDate,
} from '@/components/shipments/TrackingMap';
import { useTrackingRoute } from '@/hooks/useTrackingRoute';
import type { RouteData } from '@/types/tracking';

const mockFitBounds = jest.fn();

jest.mock('@/hooks/useTrackingRoute');
const mockUseTrackingRoute = useTrackingRoute as jest.MockedFunction<
  typeof useTrackingRoute
>;

jest.mock('leaflet', () => ({
  __esModule: true,
  default: {
    icon: jest.fn((opts) => opts),
    latLngBounds: jest.fn((sw, ne) => ({ sw, ne })),
  },
}));

jest.mock('react-leaflet', () => {
  const ReactLib = require('react');
  return {
    __esModule: true,
    MapContainer: ({ children, center, zoom, style }: Record<string, unknown>) =>
      ReactLib.createElement(
        'div',
        {
          'data-testid': 'map-container',
          'data-center': Array.isArray(center) ? center.join(',') : '',
          'data-zoom': String(zoom),
          style,
        },
        children as React.ReactNode,
      ),
    TileLayer: ({ url }: { url: string }) =>
      ReactLib.createElement('div', {
        'data-testid': 'tile-layer',
        'data-url': url,
      }),
    Marker: ({
      children,
      position,
    }: {
      children: React.ReactNode;
      position: [number, number];
    }) =>
      ReactLib.createElement(
        'div',
        {
          'data-testid': 'map-marker',
          'data-position': position.join(','),
        },
        children,
      ),
    Popup: ({ children }: { children: React.ReactNode }) =>
      ReactLib.createElement('div', { 'data-testid': 'map-popup' }, children),
    Polyline: ({ positions }: { positions: [number, number][] }) =>
      ReactLib.createElement('div', {
        'data-testid': 'polyline',
        'data-positions': positions.map((p) => p.join(',')).join(';'),
      }),
    useMap: () => ({
      fitBounds: mockFitBounds,
    }),
  };
});

describe('TrackingMap Component: Physical Route Updates & ETA Calculation (Issue #487)', () => {
  const deliveryId = 'deliv-eta-487';

  const baseRouteData: RouteData = {
    deliveryId,
    origin: { latitude: 6.5244, longitude: 3.3792 },
    destination: { latitude: 6.6244, longitude: 3.3792 },
    waypoints: [
      {
        coordinate: { latitude: 6.5244, longitude: 3.3792 },
        label: 'Apapa Dispatch',
        type: 'origin',
      },
      {
        coordinate: { latitude: 6.5744, longitude: 3.3792 },
        label: 'Midway Hub',
        type: 'checkpoint',
        address: '14 Ikorodu Road',
      },
      {
        coordinate: { latitude: 6.6244, longitude: 3.3792 },
        label: 'Ikeja Destination',
        type: 'destination',
      },
    ],
    distance: 20.0,
    estimatedTime: 30,
    currentLocation: { latitude: 6.5244, longitude: 3.3792 },
    status: 'in_transit',
    timestamp: '2026-10-19T08:00:00.000Z',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Happy Path: Physical Route Rendering & Live Updates', () => {
    it('renders the delivery route map, polyline coordinates, checkpoints, and fits bounds', () => {
      mockUseTrackingRoute.mockReturnValue({
        routeData: baseRouteData,
        currentLocation: baseRouteData.currentLocation!,
        isLoading: false,
        isError: false,
        error: null,
        refetch: jest.fn(),
      });

      render(<TrackingMap deliveryId={deliveryId} />);

      expect(screen.getByTestId('map-container')).toBeInTheDocument();
      expect(screen.getByTestId('tile-layer')).toBeInTheDocument();
      expect(screen.getByTestId('polyline')).toHaveAttribute(
        'data-positions',
        '6.5244,3.3792;6.5744,3.3792;6.6244,3.3792',
      );
      expect(screen.getByText('Origin')).toBeInTheDocument();
      expect(screen.getByText('Destination')).toBeInTheDocument();
      expect(screen.getByText('Midway Hub')).toBeInTheDocument();
      expect(screen.getByText('Current Location')).toBeInTheDocument();
      expect(mockFitBounds).toHaveBeenCalledTimes(1);
    });

    it('updates physical route marker and remaining ETA when live driver location advances halfway to destination', () => {
      mockUseTrackingRoute.mockReturnValue({
        routeData: baseRouteData,
        currentLocation: { latitude: 6.5244, longitude: 3.3792 },
        isLoading: false,
        isError: false,
        error: null,
        refetch: jest.fn(),
      });

      const { rerender } = render(<TrackingMap deliveryId={deliveryId} />);

      expect(
        screen.getByTestId('current-location-coordinates'),
      ).toHaveTextContent('6.5244, 3.3792');
      expect(screen.getByTestId('dynamic-remaining-eta')).toHaveTextContent(
        '30 min remaining',
      );

      // Driver advances halfway from 6.5244 to 6.6244 -> 6.5744
      mockUseTrackingRoute.mockReturnValue({
        routeData: baseRouteData,
        currentLocation: { latitude: 6.5744, longitude: 3.3792 },
        isLoading: false,
        isError: false,
        error: null,
        refetch: jest.fn(),
      });

      rerender(<TrackingMap deliveryId={deliveryId} />);

      expect(
        screen.getByTestId('current-location-coordinates'),
      ).toHaveTextContent('6.5744, 3.3792');
      expect(screen.getByTestId('dynamic-remaining-eta')).toHaveTextContent(
        '15 min remaining',
      );
    });

    it('re-renders the polyline and checkpoints when physical route waypoints are updated', () => {
      mockUseTrackingRoute.mockReturnValue({
        routeData: baseRouteData,
        currentLocation: baseRouteData.currentLocation!,
        isLoading: false,
        isError: false,
        error: null,
        refetch: jest.fn(),
      });

      const { rerender } = render(<TrackingMap deliveryId={deliveryId} />);
      expect(screen.getByTestId('polyline')).toHaveAttribute(
        'data-positions',
        '6.5244,3.3792;6.5744,3.3792;6.6244,3.3792',
      );

      const reroutedData: RouteData = {
        ...baseRouteData,
        waypoints: [
          ...baseRouteData.waypoints.slice(0, 2),
          {
            coordinate: { latitude: 6.6, longitude: 3.39 },
            label: 'Alternate Bypass',
            type: 'checkpoint',
          },
          baseRouteData.waypoints[2],
        ],
        distance: 24.0,
        estimatedTime: 36,
      };

      mockUseTrackingRoute.mockReturnValue({
        routeData: reroutedData,
        currentLocation: reroutedData.currentLocation!,
        isLoading: false,
        isError: false,
        error: null,
        refetch: jest.fn(),
      });

      rerender(<TrackingMap deliveryId={deliveryId} />);

      expect(screen.getByText('Alternate Bypass')).toBeInTheDocument();
      expect(screen.getByTestId('polyline')).toHaveAttribute(
        'data-positions',
        '6.5244,3.3792;6.5744,3.3792;6.6,3.39;6.6244,3.3792',
      );
      expect(screen.getByTestId('distance-value')).toHaveTextContent('24.0 km');
      expect(screen.getByTestId('estimated-time-value')).toHaveTextContent(
        '36 min',
      );
    });
  });

  describe('ETA & Estimated Delivery Date Calculation Logic', () => {
    it('calculates exact ISO estimated delivery date from route timestamp and ETA', () => {
      mockUseTrackingRoute.mockReturnValue({
        routeData: baseRouteData,
        currentLocation: baseRouteData.currentLocation!,
        isLoading: false,
        isError: false,
        error: null,
        refetch: jest.fn(),
      });

      render(<TrackingMap deliveryId={deliveryId} />);

      expect(screen.getByTestId('estimated-time-value')).toHaveTextContent(
        '30 min',
      );
      expect(screen.getByTestId('estimated-delivery-date')).toHaveTextContent(
        '2026-10-19T08:30:00.000Z',
      );
    });

    it('derives fallback ETA from route distance when estimatedTime is omitted', () => {
      const routeWithoutExplicitEta: RouteData = {
        ...baseRouteData,
        estimatedTime: undefined,
        distance: 20, // 20 km at 40 km/h = 30 min
      };

      mockUseTrackingRoute.mockReturnValue({
        routeData: routeWithoutExplicitEta,
        currentLocation: null,
        isLoading: false,
        isError: false,
        error: null,
        refetch: jest.fn(),
      });

      render(<TrackingMap deliveryId={deliveryId} />);

      expect(screen.getByTestId('estimated-time-value')).toHaveTextContent(
        '30 min',
      );
      expect(screen.getByTestId('estimated-delivery-date')).toHaveTextContent(
        '2026-10-19T08:30:00.000Z',
      );
    });

    it('returns 0 remaining ETA when delivery status is delivered', () => {
      const deliveredRoute: RouteData = {
        ...baseRouteData,
        status: 'delivered',
      };

      expect(calculateRemainingEtaMinutes(deliveredRoute)).toBe(0);
    });

    it('returns null for calculateEstimatedDeliveryDate when timestamp is invalid', () => {
      expect(calculateEstimatedDeliveryDate('invalid-date', 25)).toBeNull();
      expect(calculateEstimatedDeliveryDate(undefined, 25)).toBeNull();
    });
  });

  describe('Edge Cases, Empty States, and Error Handling', () => {
    it('renders loading state with spinner while fetching route data', () => {
      mockUseTrackingRoute.mockReturnValue({
        routeData: null,
        currentLocation: null,
        isLoading: true,
        isError: false,
        error: null,
        refetch: jest.fn(),
      });

      render(<TrackingMap deliveryId={deliveryId} />);

      expect(screen.getByTestId('spinner')).toBeInTheDocument();
      expect(screen.getByText('Loading map...')).toBeInTheDocument();
    });

    it('renders empty state when deliveryId is null or routeData is unavailable', () => {
      mockUseTrackingRoute.mockReturnValue({
        routeData: null,
        currentLocation: null,
        isLoading: false,
        isError: false,
        error: null,
        refetch: jest.fn(),
      });

      render(<TrackingMap deliveryId={null} />);

      expect(screen.getByTestId('package-icon')).toBeInTheDocument();
      expect(
        screen.getByText('No delivery data available'),
      ).toBeInTheDocument();
    });

    it('renders error alert and invokes onMapError callback when route fetch fails', () => {
      const onMapError = jest.fn();
      mockUseTrackingRoute.mockReturnValue({
        routeData: null,
        currentLocation: null,
        isLoading: false,
        isError: true,
        error: 'Request timeout - unable to fetch route',
        refetch: jest.fn(),
      });

      render(<TrackingMap deliveryId={deliveryId} onMapError={onMapError} />);

      expect(screen.getByTestId('alert-icon')).toBeInTheDocument();
      expect(
        screen.getByText('Request timeout - unable to fetch route'),
      ).toBeInTheDocument();
      expect(onMapError).toHaveBeenCalledWith(
        'Request timeout - unable to fetch route',
      );
    });

    it('handles empty waypoints array gracefully without rendering a broken polyline', () => {
      mockUseTrackingRoute.mockReturnValue({
        routeData: {
          ...baseRouteData,
          waypoints: [],
        },
        currentLocation: null,
        isLoading: false,
        isError: false,
        error: null,
        refetch: jest.fn(),
      });

      render(<TrackingMap deliveryId={deliveryId} />);

      expect(screen.getByTestId('map-container')).toBeInTheDocument();
      expect(screen.queryByTestId('polyline')).not.toBeInTheDocument();
    });
  });
});
