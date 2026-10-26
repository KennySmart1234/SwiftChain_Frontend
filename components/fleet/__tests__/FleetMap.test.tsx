import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { FleetMap } from '@/components/fleet/FleetMap';
import type { Driver } from '@/types/fleet';

// Mock FleetMapClient since react-leaflet requires browser DOM APIs not present in jsdom
jest.mock('@/components/fleet/FleetMapClient', () => {
  return function MockFleetMapClient({ drivers }: { drivers: Driver[] }) {
    return (
      <div data-testid="fleet-map-client" data-driver-count={drivers.length}>
        Fleet Map Client ({drivers.length} drivers)
      </div>
    );
  };
});

describe('FleetMap Component', () => {
  const mockDrivers: Driver[] = [
    {
      id: 'driver-1',
      name: 'John Doe',
      phone: '+2348012345678',
      vehicleType: 'Van',
      vehiclePlate: 'ABC-123',
      status: 'active',
      rating: 4.8,
      activeDeliveries: 2,
      completedDeliveries: 45,
      location: {
        lat: 6.5244,
        lng: 3.3792,
        updatedAt: '2026-10-21T10:00:00Z',
      },
    },
    {
      id: 'driver-2',
      name: 'Jane Smith',
      phone: '+2348087654321',
      vehicleType: 'Motorcycle',
      vehiclePlate: 'XYZ-789',
      status: 'on_delivery',
      rating: 4.9,
      activeDeliveries: 1,
      completedDeliveries: 120,
      location: {
        lat: 6.6018,
        lng: 3.3515,
        updatedAt: '2026-10-21T10:05:00Z',
      },
    },
  ];

  it('renders map section with correct accessibility label', async () => {
    await act(async () => {
      render(<FleetMap drivers={[]} />);
    });
    const section = screen.getByRole('region', { name: /fleet map/i });
    expect(section).toBeInTheDocument();
  });

  it('passes drivers array to client component', async () => {
    await act(async () => {
      render(<FleetMap drivers={mockDrivers} />);
    });
    const client = await screen.findByTestId('fleet-map-client');
    expect(client).toBeInTheDocument();
    expect(client).toHaveAttribute('data-driver-count', '2');
  });

  it('handles empty drivers array gracefully', async () => {
    await act(async () => {
      render(<FleetMap drivers={[]} />);
    });
    const client = await screen.findByTestId('fleet-map-client');
    expect(client).toBeInTheDocument();
    expect(client).toHaveAttribute('data-driver-count', '0');
  });
});
