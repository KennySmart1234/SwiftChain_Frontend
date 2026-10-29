/**
 * Tests for LiveTracker Component
 *
 * Covers:
 * - Marker rendering
 * - Position updates from hook
 * - Connection status visualization
 * - Error state handling
 * - Callback invocation
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { LiveTracker } from '@/components/maps/LiveTracker';
import { useDriverLocationSocket } from '@/hooks/useDriverLocationSocket';
import type { Driver } from '@/types/fleet';

// Mock the hook
jest.mock('@/hooks/useDriverLocationSocket');

// Mock react-leaflet components
jest.mock('react-leaflet', () => {
  const ReactLib = require('react');
  return {
    CircleMarker: ({ children, center, radius, pathOptions, ...rest }: any) =>
      ReactLib.createElement(
        'div',
        {
          'data-testid': `marker-${rest['data-testid']}`,
          'data-center': center ? center.join(',') : '',
          'data-radius': String(radius),
          'data-color': pathOptions?.color,
          'data-fill-color': pathOptions?.fillColor,
          'data-fill-opacity': String(pathOptions?.fillOpacity),
          'data-connection-status': rest['data-connection-status'],
          'data-weight': String(pathOptions?.weight),
        },
        children,
      ),
    Tooltip: ({ children, direction }: any) =>
      ReactLib.createElement(
        'div',
        {
          'data-testid': 'marker-tooltip',
          'data-direction': direction,
        },
        children,
      ),
  };
});

const mockUseDriverLocationSocket =
  useDriverLocationSocket as jest.MockedFunction<
    typeof useDriverLocationSocket
  >;

const mockDriver: Driver = {
  id: 'driver-123',
  name: 'Ada Okafor',
  phone: '+2348000000001',
  vehicleType: 'sedan',
  vehiclePlate: 'ABC123',
  status: 'on_delivery',
  rating: 4.8,
  activeDeliveries: 1,
  completedDeliveries: 150,
  location: {
    lat: 6.5244,
    lng: 3.3792,
    updatedAt: '2024-01-01T00:00:00Z',
  },
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('LiveTracker Component', () => {
  describe('rendering', () => {
    it('should render a CircleMarker with driver coordinates', () => {
      mockUseDriverLocationSocket.mockReturnValue({
        position: { lat: 6.5244, lng: 3.3792 },
        connectionStatus: 'connected',
        error: null,
      });

      render(<LiveTracker driver={mockDriver} />);

      const marker = screen.getByTestId('marker-live-tracker-driver-123');
      expect(marker).toBeInTheDocument();
      expect(marker).toHaveAttribute('data-center', '6.5244,3.3792');
    });

    it('should render marker with default styling', () => {
      mockUseDriverLocationSocket.mockReturnValue({
        position: { lat: 6.5244, lng: 3.3792 },
        connectionStatus: 'connected',
        error: null,
      });

      render(<LiveTracker driver={mockDriver} />);

      const marker = screen.getByTestId('marker-live-tracker-driver-123');
      expect(marker).toHaveAttribute('data-color', '#10b981');
      expect(marker).toHaveAttribute('data-fill-color', '#34d399');
      expect(marker).toHaveAttribute('data-radius', '8');
    });

    it('should render a Tooltip with driver name', () => {
      mockUseDriverLocationSocket.mockReturnValue({
        position: { lat: 6.5244, lng: 3.3792 },
        connectionStatus: 'connected',
        error: null,
      });

      render(<LiveTracker driver={mockDriver} />);

      const tooltip = screen.getByTestId('marker-tooltip');
      expect(tooltip).toHaveTextContent('Ada Okafor');
    });
  });

  describe('position updates', () => {
    it('should update marker position when hook returns new coordinates', async () => {
      mockUseDriverLocationSocket.mockReturnValue({
        position: { lat: 6.5244, lng: 3.3792 },
        connectionStatus: 'connected',
        error: null,
      });

      const { rerender } = render(<LiveTracker driver={mockDriver} />);

      let marker = screen.getByTestId('marker-live-tracker-driver-123');
      expect(marker).toHaveAttribute('data-center', '6.5244,3.3792');

      // Update hook return value
      mockUseDriverLocationSocket.mockReturnValue({
        position: { lat: 6.53, lng: 3.38 },
        connectionStatus: 'connected',
        error: null,
      });

      rerender(<LiveTracker driver={mockDriver} />);

      marker = screen.getByTestId('marker-live-tracker-driver-123');
      expect(marker).toHaveAttribute('data-center', '6.53,3.38');
    });

    it('should invoke onLocationUpdate callback when position changes', async () => {
      const onLocationUpdate = jest.fn();

      mockUseDriverLocationSocket.mockReturnValue({
        position: { lat: 6.5244, lng: 3.3792 },
        connectionStatus: 'connected',
        error: null,
      });

      const { rerender } = render(
        <LiveTracker driver={mockDriver} onLocationUpdate={onLocationUpdate} />,
      );

      // First render invokes callback
      expect(onLocationUpdate).toHaveBeenCalledWith(6.5244, 3.3792);

      // Reset mock to check subsequent calls
      onLocationUpdate.mockClear();

      // Update position
      mockUseDriverLocationSocket.mockReturnValue({
        position: { lat: 6.53, lng: 3.38 },
        connectionStatus: 'connected',
        error: null,
      });

      rerender(
        <LiveTracker driver={mockDriver} onLocationUpdate={onLocationUpdate} />,
      );

      expect(onLocationUpdate).toHaveBeenCalledWith(6.53, 3.38);
    });

    it('should not invoke callback if position unchanged', async () => {
      const onLocationUpdate = jest.fn();

      mockUseDriverLocationSocket.mockReturnValue({
        position: { lat: 6.5244, lng: 3.3792 },
        connectionStatus: 'connected',
        error: null,
      });

      const { rerender } = render(
        <LiveTracker driver={mockDriver} onLocationUpdate={onLocationUpdate} />,
      );

      expect(onLocationUpdate).toHaveBeenCalledTimes(1);

      // Rerender with same position
      rerender(
        <LiveTracker driver={mockDriver} onLocationUpdate={onLocationUpdate} />,
      );

      // Should not be called again if position is same reference
      expect(onLocationUpdate).toHaveBeenCalledTimes(1);
    });
  });

  describe('connection status visualization', () => {
    it('should show full opacity when connected', () => {
      mockUseDriverLocationSocket.mockReturnValue({
        position: { lat: 6.5244, lng: 3.3792 },
        connectionStatus: 'connected',
        error: null,
      });

      render(<LiveTracker driver={mockDriver} />);

      const marker = screen.getByTestId('marker-live-tracker-driver-123');
      expect(marker).toHaveAttribute('data-fill-opacity', '0.9');
    });

    it('should show reduced opacity when disconnected', () => {
      mockUseDriverLocationSocket.mockReturnValue({
        position: { lat: 6.5244, lng: 3.3792 },
        connectionStatus: 'disconnected',
        error: null,
      });

      render(<LiveTracker driver={mockDriver} />);

      const marker = screen.getByTestId('marker-live-tracker-driver-123');
      expect(marker).toHaveAttribute('data-fill-opacity', '0.5');
    });

    it('should show amber stroke when reconnecting', () => {
      mockUseDriverLocationSocket.mockReturnValue({
        position: { lat: 6.5244, lng: 3.3792 },
        connectionStatus: 'reconnecting',
        error: null,
      });

      render(<LiveTracker driver={mockDriver} />);

      const marker = screen.getByTestId('marker-live-tracker-driver-123');
      expect(marker).toHaveAttribute('data-color', '#f59e0b');
    });

    it('should display reconnecting status in tooltip', () => {
      mockUseDriverLocationSocket.mockReturnValue({
        position: { lat: 6.5244, lng: 3.3792 },
        connectionStatus: 'reconnecting',
        error: null,
      });

      render(<LiveTracker driver={mockDriver} />);

      const tooltip = screen.getByTestId('marker-tooltip');
      expect(tooltip).toHaveTextContent('Ada Okafor (reconnecting...)');
    });

    it('should display offline status in tooltip', () => {
      mockUseDriverLocationSocket.mockReturnValue({
        position: { lat: 6.5244, lng: 3.3792 },
        connectionStatus: 'disconnected',
        error: null,
      });

      render(<LiveTracker driver={mockDriver} />);

      const tooltip = screen.getByTestId('marker-tooltip');
      expect(tooltip).toHaveTextContent('Ada Okafor (offline)');
    });

    it('should display error message in tooltip', () => {
      mockUseDriverLocationSocket.mockReturnValue({
        position: { lat: 6.5244, lng: 3.3792 },
        connectionStatus: 'disconnected',
        error: 'WebSocket connection lost',
      });

      render(<LiveTracker driver={mockDriver} />);

      const tooltip = screen.getByTestId('marker-tooltip');
      expect(tooltip).toHaveTextContent(
        'Ada Okafor (offline) — Error: WebSocket connection lost',
      );
    });

    it('should set data-connection-status attribute', () => {
      mockUseDriverLocationSocket.mockReturnValue({
        position: { lat: 6.5244, lng: 3.3792 },
        connectionStatus: 'reconnecting',
        error: null,
      });

      render(<LiveTracker driver={mockDriver} />);

      const marker = screen.getByTestId('marker-live-tracker-driver-123');
      expect(marker).toHaveAttribute('data-connection-status', 'reconnecting');
    });
  });

  describe('custom styling', () => {
    it('should apply custom marker color', () => {
      mockUseDriverLocationSocket.mockReturnValue({
        position: { lat: 6.5244, lng: 3.3792 },
        connectionStatus: 'connected',
        error: null,
      });

      render(
        <LiveTracker
          driver={mockDriver}
          markerColor="#1d4ed8"
          markerFillColor="#3b82f6"
        />,
      );

      const marker = screen.getByTestId('marker-live-tracker-driver-123');
      expect(marker).toHaveAttribute('data-color', '#1d4ed8');
      expect(marker).toHaveAttribute('data-fill-color', '#3b82f6');
    });

    it('should respect custom marker color but show amber when reconnecting', () => {
      mockUseDriverLocationSocket.mockReturnValue({
        position: { lat: 6.5244, lng: 3.3792 },
        connectionStatus: 'reconnecting',
        error: null,
      });

      render(
        <LiveTracker
          driver={mockDriver}
          markerColor="#1d4ed8"
          markerFillColor="#3b82f6"
        />,
      );

      const marker = screen.getByTestId('marker-live-tracker-driver-123');
      // Color should switch to amber on reconnecting
      expect(marker).toHaveAttribute('data-color', '#f59e0b');
      // Fill color should remain custom
      expect(marker).toHaveAttribute('data-fill-color', '#3b82f6');
    });
  });

  describe('hook invocation', () => {
    it('should call useDriverLocationSocket with driver id', () => {
      mockUseDriverLocationSocket.mockReturnValue({
        position: { lat: 6.5244, lng: 3.3792 },
        connectionStatus: 'connected',
        error: null,
      });

      render(<LiveTracker driver={mockDriver} />);

      expect(mockUseDriverLocationSocket).toHaveBeenCalledWith('driver-123');
    });

    it('should update hook call when driver changes', () => {
      mockUseDriverLocationSocket.mockReturnValue({
        position: { lat: 6.5244, lng: 3.3792 },
        connectionStatus: 'connected',
        error: null,
      });

      const { rerender } = render(<LiveTracker driver={mockDriver} />);

      expect(mockUseDriverLocationSocket).toHaveBeenCalledWith('driver-123');

      const newDriver: Driver = {
        ...mockDriver,
        id: 'driver-456',
        name: 'Chinedu Okoro',
      };

      rerender(<LiveTracker driver={newDriver} />);

      expect(mockUseDriverLocationSocket).toHaveBeenCalledWith('driver-456');
    });
  });

  describe('marker consistency', () => {
    it('should have consistent marker radius', () => {
      mockUseDriverLocationSocket.mockReturnValue({
        position: { lat: 6.5244, lng: 3.3792 },
        connectionStatus: 'connected',
        error: null,
      });

      render(<LiveTracker driver={mockDriver} />);

      const marker = screen.getByTestId('marker-live-tracker-driver-123');
      expect(marker).toHaveAttribute('data-radius', '8');
    });

    it('should have consistent marker weight', () => {
      mockUseDriverLocationSocket.mockReturnValue({
        position: { lat: 6.5244, lng: 3.3792 },
        connectionStatus: 'connected',
        error: null,
      });

      render(<LiveTracker driver={mockDriver} />);

      const marker = screen.getByTestId('marker-live-tracker-driver-123');
      expect(marker).toHaveAttribute('data-weight', '2');
    });
  });

  describe('multiple instances', () => {
    it('should render multiple LiveTracker instances independently', () => {
      mockUseDriverLocationSocket.mockReturnValue({
        position: { lat: 6.5244, lng: 3.3792 },
        connectionStatus: 'connected',
        error: null,
      });

      const driver2: Driver = {
        ...mockDriver,
        id: 'driver-456',
        name: 'Chinedu Okoro',
      };

      const { container } = render(
        <>
          <LiveTracker driver={mockDriver} />
          <LiveTracker driver={driver2} />
        </>,
      );

      const marker1 = screen.getByTestId('marker-live-tracker-driver-123');
      const marker2 = screen.getByTestId('marker-live-tracker-driver-456');

      expect(marker1).toBeInTheDocument();
      expect(marker2).toBeInTheDocument();
      expect(mockUseDriverLocationSocket).toHaveBeenCalledTimes(2);
    });
  });

  describe('error resilience', () => {
    it('should render gracefully with null position', () => {
      mockUseDriverLocationSocket.mockReturnValue({
        position: { lat: NaN, lng: NaN },
        connectionStatus: 'disconnected',
        error: 'Connection lost',
      });

      render(<LiveTracker driver={mockDriver} />);

      const marker = screen.getByTestId('marker-live-tracker-driver-123');
      expect(marker).toBeInTheDocument();
    });

    it('should handle missing onLocationUpdate callback', () => {
      mockUseDriverLocationSocket.mockReturnValue({
        position: { lat: 6.5244, lng: 3.3792 },
        connectionStatus: 'connected',
        error: null,
      });

      // Should not throw when callback is not provided
      expect(() => {
        render(<LiveTracker driver={mockDriver} />);
      }).not.toThrow();
    });
  });
});
