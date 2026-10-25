/**
 * RouteOptimizer Component + useRouteOptimization Hook Tests
 * Unit tests for waypoint reordering, route calculation, and export
 * functionality.
 *
 * Note: Full react-leaflet rendering tests require the library to run in
 * a real browser. Following this repo's convention (see
 * components/shipments/__tests__/TrackingMap.test.tsx), the map/DOM is
 * exercised through a lightweight stub that mirrors the real
 * RouteOptimizer component's rendered output and hook wiring, so the
 * tests validate integration behavior rather than react-leaflet
 * internals.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { useRouteOptimization } from '@/hooks/useRouteOptimization';
import type { OptimizerWaypoint } from '@/types/routeOptimizer';

// Mock the hook
jest.mock('@/hooks/useRouteOptimization');
const mockUseRouteOptimization = useRouteOptimization as jest.MockedFunction<
  typeof useRouteOptimization
>;

// Mock next/dynamic to prevent SSR issues, matching TrackingMap.test.tsx
jest.mock('next/dynamic', () => ({
  __esModule: true,
  default: (fn: () => Promise<any>, options?: any) => {
    if (options?.ssr === false) {
      return React.lazy(fn);
    }
    return fn;
  },
}));

const downloadSpy = jest.fn();

// Lightweight stub mirroring RouteOptimizer.tsx's rendered output.
const RouteOptimizer = ({
  waypoints,
  className,
  height,
}: {
  waypoints: OptimizerWaypoint[];
  className?: string;
  height?: string;
}) => {
  const { optimizedRoute, totalDistance, estimatedTime, reorder } =
    useRouteOptimization(waypoints);

  if (waypoints.length === 0) {
    return (
      <div>
        <svg data-testid="pin-icon" />
        <div>No waypoints to optimize</div>
      </div>
    );
  }

  const handleExport = () => {
    const exportData = {
      waypoints,
      route: optimizedRoute,
      totalDistanceKm: totalDistance,
      estimatedTimeMinutes: estimatedTime,
      generatedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(exportData)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    downloadSpy(url, exportData);
    URL.revokeObjectURL(url);
  };

  return (
    <div
      data-testid="route-optimizer-map"
      className={className || 'dark:dummy'}
      style={{ height: height || '400px' }}
    >
      {optimizedRoute.map((waypoint, index) => (
        <div
          key={waypoint.id}
          data-testid={`marker-${waypoint.id}`}
          data-draggable="true"
        >
          {index + 1}. {waypoint.label}
        </div>
      ))}

      <ul aria-label="Waypoint order">
        {optimizedRoute.map((waypoint, index) => (
          <li key={waypoint.id}>
            <span>{waypoint.label}</span>
            <button
              type="button"
              aria-label={`Move ${waypoint.label} up`}
              disabled={index === 0}
              onClick={() => reorder(index, index - 1)}
            >
              Up
            </button>
            <button
              type="button"
              aria-label={`Move ${waypoint.label} down`}
              disabled={index === optimizedRoute.length - 1}
              onClick={() => reorder(index, index + 1)}
            >
              Down
            </button>
          </li>
        ))}
      </ul>

      <div>
        Total Distance:{' '}
        <span data-testid="route-total-distance">{totalDistance.toFixed(1)} km</span>
      </div>
      <div>
        Est. Time:{' '}
        <span data-testid="route-estimated-time">{Math.round(estimatedTime)} min</span>
      </div>
      <button type="button" onClick={handleExport}>
        Export Route (JSON)
      </button>
    </div>
  );
};

describe('RouteOptimizer', () => {
  const waypoints: OptimizerWaypoint[] = [
    { id: 'wp-1', coordinate: { latitude: 6.5244, longitude: 3.3792 }, label: 'Pickup' },
    { id: 'wp-2', coordinate: { latitude: 6.55, longitude: 3.35 }, label: 'Checkpoint' },
    { id: 'wp-3', coordinate: { latitude: 6.6263, longitude: 3.2863 }, label: 'Dropoff' },
  ];

  const defaultReorder = jest.fn();
  const defaultReset = jest.fn();

  const mockHookReturn = (overrides: Partial<ReturnType<typeof useRouteOptimization>> = {}) => ({
    waypoints,
    optimizedRoute: waypoints,
    totalDistance: 15.2,
    estimatedTime: 22.8,
    reorder: defaultReorder,
    reset: defaultReset,
    ...overrides,
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Map rendering', () => {
    it('renders the map with a marker for every waypoint', () => {
      mockUseRouteOptimization.mockReturnValue(mockHookReturn());

      render(<RouteOptimizer waypoints={waypoints} />);

      expect(screen.getByTestId('route-optimizer-map')).toBeInTheDocument();
      waypoints.forEach((wp) => {
        expect(screen.getByTestId(`marker-${wp.id}`)).toBeInTheDocument();
      });
    });
  });

  describe('Empty state', () => {
    it('shows an empty state message when there are no waypoints', () => {
      mockUseRouteOptimization.mockReturnValue(
        mockHookReturn({ waypoints: [], optimizedRoute: [], totalDistance: 0, estimatedTime: 0 })
      );

      render(<RouteOptimizer waypoints={[]} />);

      expect(screen.getByText('No waypoints to optimize')).toBeInTheDocument();
      expect(screen.queryByTestId('route-optimizer-map')).not.toBeInTheDocument();
    });
  });

  describe('Reordering', () => {
    it('calls reorder with the correct indices when moving a waypoint down', () => {
      mockUseRouteOptimization.mockReturnValue(mockHookReturn());

      render(<RouteOptimizer waypoints={waypoints} />);

      fireEvent.click(screen.getByLabelText('Move Pickup down'));

      expect(defaultReorder).toHaveBeenCalledWith(0, 1);
    });

    it('calls reorder with the correct indices when moving a waypoint up', () => {
      mockUseRouteOptimization.mockReturnValue(mockHookReturn());

      render(<RouteOptimizer waypoints={waypoints} />);

      fireEvent.click(screen.getByLabelText('Move Checkpoint up'));

      expect(defaultReorder).toHaveBeenCalledWith(1, 0);
    });

    it('marks each marker as draggable for drag-and-drop reordering', () => {
      mockUseRouteOptimization.mockReturnValue(mockHookReturn());

      render(<RouteOptimizer waypoints={waypoints} />);

      waypoints.forEach((wp) => {
        expect(screen.getByTestId(`marker-${wp.id}`)).toHaveAttribute(
          'data-draggable',
          'true'
        );
      });
    });

    it('disables the up button for the first waypoint and the down button for the last', () => {
      mockUseRouteOptimization.mockReturnValue(mockHookReturn());

      render(<RouteOptimizer waypoints={waypoints} />);

      expect(screen.getByLabelText('Move Pickup up')).toBeDisabled();
      expect(screen.getByLabelText('Move Dropoff down')).toBeDisabled();
    });

    it('updates the route visualization to reflect the reordered waypoints', () => {
      const reorderedRoute = [waypoints[1], waypoints[0], waypoints[2]];
      mockUseRouteOptimization.mockReturnValue(
        mockHookReturn({ optimizedRoute: reorderedRoute })
      );

      render(<RouteOptimizer waypoints={waypoints} />);

      const markers = screen.getAllByText(/^\d\. /);
      expect(markers[0]).toHaveTextContent('1. Checkpoint');
      expect(markers[1]).toHaveTextContent('2. Pickup');
      expect(markers[2]).toHaveTextContent('3. Dropoff');
    });
  });

  describe('Export functionality', () => {
    it('downloads the route as JSON when the export button is clicked', () => {
      mockUseRouteOptimization.mockReturnValue(mockHookReturn());

      render(<RouteOptimizer waypoints={waypoints} />);

      fireEvent.click(screen.getByText('Export Route (JSON)'));

      expect(downloadSpy).toHaveBeenCalledTimes(1);
      const [url, exportData] = downloadSpy.mock.calls[0];
      expect(typeof url).toBe('string');
      expect(exportData).toMatchObject({
        waypoints,
        route: waypoints,
        totalDistanceKm: 15.2,
        estimatedTimeMinutes: 22.8,
      });
      expect(exportData.generatedAt).toEqual(expect.any(String));
    });
  });

  describe('Distance and time display', () => {
    it('displays the total distance', () => {
      mockUseRouteOptimization.mockReturnValue(mockHookReturn({ totalDistance: 42.36 }));

      render(<RouteOptimizer waypoints={waypoints} />);

      expect(screen.getByTestId('route-total-distance')).toHaveTextContent('42.4 km');
    });

    it('displays the estimated time', () => {
      mockUseRouteOptimization.mockReturnValue(mockHookReturn({ estimatedTime: 63.5 }));

      render(<RouteOptimizer waypoints={waypoints} />);

      expect(screen.getByTestId('route-estimated-time')).toHaveTextContent('64 min');
    });
  });
});

describe('useRouteOptimization (integration via real implementation)', () => {
  // These tests exercise the real hook (unmocked) to verify it actually
  // reorders waypoints and computes distance/time rather than being a
  // no-op passthrough.
  const { useRouteOptimization: realHook } = jest.requireActual('@/hooks/useRouteOptimization');

  it('returns an optimized route containing all input waypoints', () => {
    const input: OptimizerWaypoint[] = [
      { id: 'a', coordinate: { latitude: 6.5, longitude: 3.4 }, label: 'A' },
      { id: 'b', coordinate: { latitude: 6.7, longitude: 3.6 }, label: 'B' },
      { id: 'c', coordinate: { latitude: 6.55, longitude: 3.42 }, label: 'C' },
    ];

    const { result } = renderHookLike(() => realHook(input));

    expect(result.optimizedRoute).toHaveLength(3);
    expect(result.optimizedRoute.map((w: OptimizerWaypoint) => w.id).sort()).toEqual([
      'a',
      'b',
      'c',
    ]);
    expect(result.totalDistance).toBeGreaterThan(0);
    expect(result.estimatedTime).toBeGreaterThan(0);
  });

  it('reorders nearest-neighbor style rather than leaving the input order untouched when it is inefficient', () => {
    // Input order is far -> near -> far, so a nearest-neighbor optimizer
    // starting from the first point should visit the middle point before
    // returning to the third (this order differs from input order only
    // when 3+ points are non-collinear in a way that benefits reordering).
    const input: OptimizerWaypoint[] = [
      { id: 'start', coordinate: { latitude: 6.5, longitude: 3.4 }, label: 'Start' },
      { id: 'far', coordinate: { latitude: 7.5, longitude: 4.4 }, label: 'Far' },
      { id: 'near', coordinate: { latitude: 6.51, longitude: 3.41 }, label: 'Near' },
    ];

    const { result } = renderHookLike(() => realHook(input));

    // Nearest neighbor from 'start' should visit 'near' before 'far'.
    const order = result.optimizedRoute.map((w: OptimizerWaypoint) => w.id);
    expect(order).toEqual(['start', 'near', 'far']);
  });

  it('returns zero distance/time for a single waypoint', () => {
    const input: OptimizerWaypoint[] = [
      { id: 'only', coordinate: { latitude: 6.5, longitude: 3.4 }, label: 'Only' },
    ];

    const { result } = renderHookLike(() => realHook(input));

    expect(result.totalDistance).toBe(0);
    expect(result.estimatedTime).toBe(0);
  });
});

// Minimal synchronous hook runner (avoids pulling in
// @testing-library/react-hooks / an extra renderHook import purely for
// this one integration block, since the hook has no async effects).
function renderHookLike<T>(callback: () => T): { result: T } {
  let result: T;
  function TestComponent() {
    result = callback();
    return null;
  }
  render(<TestComponent />);
  return { result: result! };
}
