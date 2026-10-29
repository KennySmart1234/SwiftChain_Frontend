/**
 * DriverAssignmentPanel Component Tests
 *
 * dnd-kit is not a dependency of this repo (checked package.json), so
 * DriverAssignmentPanel implements a click-to-assign flow instead of
 * literal drag-and-drop: clicking a pending shipment selects it, then
 * clicking "Assign" on a driver row assigns the selected shipment to
 * that driver. These tests exercise that interaction model rather than
 * drag events.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { toast } from 'sonner';
import { DriverAssignmentPanel } from '@/components/fleet/DriverAssignmentPanel';
import { useDriverAssignment } from '@/hooks/useDriverAssignment';
import type { Driver, PendingShipment } from '@/types/fleet';

jest.mock('@/hooks/useDriverAssignment');
const mockUseDriverAssignment = useDriverAssignment as jest.MockedFunction<
  typeof useDriverAssignment
>;

jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

const shipments: PendingShipment[] = [
  {
    id: 'ship-1',
    origin: 'Lagos',
    destination: 'Ibadan',
    requiredVehicleType: 'van',
    createdAt: '2026-01-01T00:00:00Z',
    status: 'pending',
  },
  {
    id: 'ship-2',
    origin: 'Abuja',
    destination: 'Kano',
    createdAt: '2026-01-02T00:00:00Z',
    status: 'pending',
  },
];

const drivers: Driver[] = [
  {
    id: 'driver-1',
    name: 'Alice',
    phone: '+2340000001',
    vehicleType: 'van',
    vehiclePlate: 'ABC-123',
    status: 'active',
    rating: 4.8,
    activeDeliveries: 1,
    completedDeliveries: 20,
    location: { lat: 6.5, lng: 3.4, updatedAt: '2026-01-01T00:00:00Z' },
    currentLoad: 1,
    capacity: 4,
  },
  {
    id: 'driver-2',
    name: 'Bola',
    phone: '+2340000002',
    vehicleType: 'motorcycle',
    vehiclePlate: 'XYZ-789',
    status: 'idle',
    rating: 4.2,
    activeDeliveries: 3,
    completedDeliveries: 10,
    location: { lat: 6.5, lng: 3.4, updatedAt: '2026-01-01T00:00:00Z' },
    currentLoad: 3,
    capacity: 4, // 75% -> yellow (near capacity)
  },
  {
    id: 'driver-3',
    name: 'Chidi',
    phone: '+2340000003',
    vehicleType: 'van',
    vehiclePlate: 'DEF-456',
    status: 'active',
    rating: 4.5,
    activeDeliveries: 4,
    completedDeliveries: 30,
    location: { lat: 6.5, lng: 3.4, updatedAt: '2026-01-01T00:00:00Z' },
    currentLoad: 4,
    capacity: 4, // 100% -> red (at capacity)
  },
];

const baseHookReturn = (overrides: Partial<ReturnType<typeof useDriverAssignment>> = {}) => ({
  shipments,
  drivers,
  isLoading: false,
  isError: false,
  error: null,
  assignShipment: jest.fn().mockResolvedValue(true),
  isAssigning: false,
  assignBulk: jest.fn().mockResolvedValue([]),
  isBulkAssigning: false,
  refetch: jest.fn().mockResolvedValue(undefined),
  ...overrides,
});

describe('DriverAssignmentPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    window.localStorage.clear();
  });

  it('renders pending shipments as selectable cards', () => {
    mockUseDriverAssignment.mockReturnValue(baseHookReturn());

    render(<DriverAssignmentPanel />);

    expect(screen.getByText('ship-1')).toBeInTheDocument();
    expect(screen.getByText('ship-2')).toBeInTheDocument();
    expect(screen.getByText(/Lagos → Ibadan/)).toBeInTheDocument();
  });

  it('renders drivers as assignment targets with an Assign action', () => {
    mockUseDriverAssignment.mockReturnValue(baseHookReturn());

    render(<DriverAssignmentPanel />);

    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bola')).toBeInTheDocument();
    expect(screen.getByText('Chidi')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Assign' })).toHaveLength(3);
  });

  it('disables Assign buttons until a shipment is selected', () => {
    mockUseDriverAssignment.mockReturnValue(baseHookReturn());

    render(<DriverAssignmentPanel />);

    const assignButtons = screen.getAllByRole('button', { name: 'Assign' });
    assignButtons.forEach((button) => expect(button).toBeDisabled());
  });

  it('selecting a shipment then clicking Assign on a comfortably-under-capacity driver assigns immediately and shows a success notification', async () => {
    const assignShipment = jest.fn().mockResolvedValue(true);
    mockUseDriverAssignment.mockReturnValue(baseHookReturn({ assignShipment }));

    render(<DriverAssignmentPanel />);

    fireEvent.click(screen.getByText('ship-1'));
    const aliceRow = screen.getByText('Alice').closest('li') as HTMLElement;
    fireEvent.click(within(aliceRow).getByRole('button', { name: 'Assign' }));

    await waitFor(() => {
      expect(assignShipment).toHaveBeenCalledWith('driver-1', 'ship-1');
    });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('ship-1 assigned to Alice');
    });
  });

  it('clicking Assign on a near-capacity driver opens a confirmation modal instead of assigning immediately', () => {
    const assignShipment = jest.fn().mockResolvedValue(true);
    mockUseDriverAssignment.mockReturnValue(baseHookReturn({ assignShipment }));

    render(<DriverAssignmentPanel />);

    fireEvent.click(screen.getByText('ship-1'));
    const bolaRow = screen.getByText('Bola').closest('li') as HTMLElement;
    fireEvent.click(within(bolaRow).getByRole('button', { name: 'Assign' }));

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(assignShipment).not.toHaveBeenCalled();
  });

  it('confirming the modal assigns the shipment and shows a success notification', async () => {
    const assignShipment = jest.fn().mockResolvedValue(true);
    mockUseDriverAssignment.mockReturnValue(baseHookReturn({ assignShipment }));

    render(<DriverAssignmentPanel />);

    fireEvent.click(screen.getByText('ship-1'));
    const chidiRow = screen.getByText('Chidi').closest('li') as HTMLElement;
    fireEvent.click(within(chidiRow).getByRole('button', { name: 'Assign' }));

    fireEvent.click(screen.getByRole('button', { name: 'Assign Anyway' }));

    await waitFor(() => {
      expect(assignShipment).toHaveBeenCalledWith('driver-3', 'ship-1');
    });
    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('ship-1 assigned to Chidi');
    });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('canceling the confirmation modal does not assign the shipment', () => {
    const assignShipment = jest.fn().mockResolvedValue(true);
    mockUseDriverAssignment.mockReturnValue(baseHookReturn({ assignShipment }));

    render(<DriverAssignmentPanel />);

    fireEvent.click(screen.getByText('ship-1'));
    const chidiRow = screen.getByText('Chidi').closest('li') as HTMLElement;
    fireEvent.click(within(chidiRow).getByRole('button', { name: 'Assign' }));

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(assignShipment).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('shows an error notification when assignment fails', async () => {
    const assignShipment = jest.fn().mockResolvedValue(false);
    mockUseDriverAssignment.mockReturnValue(baseHookReturn({ assignShipment }));

    render(<DriverAssignmentPanel />);

    fireEvent.click(screen.getByText('ship-1'));
    const aliceRow = screen.getByText('Alice').closest('li') as HTMLElement;
    fireEvent.click(within(aliceRow).getByRole('button', { name: 'Assign' }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Failed to assign ship-1 to Alice');
    });
  });

  it('color-codes near-capacity and at-capacity drivers', () => {
    mockUseDriverAssignment.mockReturnValue(baseHookReturn());

    render(<DriverAssignmentPanel />);

    expect(screen.getByTestId('driver-load-driver-1')).toHaveClass('bg-emerald-100');
    expect(screen.getByTestId('driver-load-driver-2')).toHaveClass('bg-amber-100');
    expect(screen.getByTestId('driver-load-driver-3')).toHaveClass('bg-red-100');
  });

  it('shows vehicle type match indicators once a shipment is selected', () => {
    mockUseDriverAssignment.mockReturnValue(baseHookReturn());

    render(<DriverAssignmentPanel />);

    // ship-1 requires 'van'; driver-1 and driver-3 are vans, driver-2 is a motorcycle.
    fireEvent.click(screen.getByText('ship-1'));

    expect(screen.getByTestId('vehicle-match-driver-1')).toHaveTextContent('Vehicle match');
    expect(screen.getByTestId('vehicle-match-driver-2')).toHaveTextContent('Vehicle mismatch');
    expect(screen.getByTestId('vehicle-match-driver-3')).toHaveTextContent('Vehicle match');
  });

  it('shows an empty state when there are no pending shipments', () => {
    mockUseDriverAssignment.mockReturnValue(baseHookReturn({ shipments: [] }));

    render(<DriverAssignmentPanel />);

    expect(screen.getByText('No pending shipments.')).toBeInTheDocument();
  });

  it('shows a loading state while data is being fetched', () => {
    mockUseDriverAssignment.mockReturnValue(
      baseHookReturn({ isLoading: true, shipments: [], drivers: [] })
    );

    render(<DriverAssignmentPanel />);

    expect(screen.getByText('Loading assignment data...')).toBeInTheDocument();
  });

  it('shows an error state when the hook reports an error', () => {
    mockUseDriverAssignment.mockReturnValue(
      baseHookReturn({ isError: true, error: 'Network error' })
    );

    render(<DriverAssignmentPanel />);

    expect(screen.getByText('Network error')).toBeInTheDocument();
  });

  it('persists the driver sort order to localStorage and restores it on next render', () => {
    mockUseDriverAssignment.mockReturnValue(baseHookReturn());

    const { unmount } = render(<DriverAssignmentPanel />);

    fireEvent.change(screen.getByLabelText('Sort drivers by'), {
      target: { value: 'capacity' },
    });

    expect(window.localStorage.getItem('swiftchain:driver-assignment-sort-order')).toBe(
      'capacity'
    );

    unmount();

    render(<DriverAssignmentPanel />);

    expect(screen.getByLabelText('Sort drivers by')).toHaveValue('capacity');
  });
});
