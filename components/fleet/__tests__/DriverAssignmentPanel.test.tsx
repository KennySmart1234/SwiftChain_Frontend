import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DriverAssignmentPanel } from '@/components/fleet/DriverAssignmentPanel';
import { driverAssignmentService } from '@/services/driverAssignmentService';
import { fleetService } from '@/services/fleetService';
import { useToast } from '@/hooks/useToast';

jest.mock('@/services/driverAssignmentService', () => ({
  driverAssignmentService: {
    getPendingShipments: jest.fn(),
    assignShipment: jest.fn(),
  },
}));

jest.mock('@/services/fleetService', () => ({
  fleetService: {
    getFleet: jest.fn(),
  },
}));

jest.mock('@/hooks/useToast', () => ({
  useToast: jest.fn(),
}));

// @dnd-kit's pointer-based drag interactions are impractical to simulate
// faithfully in jsdom. DndContext is mocked to capture onDragEnd so this
// suite can drive the actual assignment logic (confirmation modal, confirm/
// cancel, success notification) the same way a real drop would: by calling
// onDragEnd({ active, over }) directly. Card/dropzone rendering (including
// drag-related props like `ref`/listeners) is exercised for real using the
// genuine useDraggable/useDroppable hooks, only DndContext itself is faked.
let capturedOnDragEnd: ((event: { active: { id: string }; over: { id: string } | null }) => void) | null = null;
jest.mock('@dnd-kit/core', () => {
  const actual = jest.requireActual('@dnd-kit/core');
  return {
    ...actual,
    DndContext: ({ onDragEnd, children }: any) => {
      capturedOnDragEnd = onDragEnd;
      return children;
    },
  };
});

const mockedDriverAssignmentService = driverAssignmentService as jest.Mocked<typeof driverAssignmentService>;
const mockedFleetService = fleetService as jest.Mocked<typeof fleetService>;

const SHIPMENTS = [
  {
    id: 'shipment-1',
    pickupAddress: '12 Ring Rd',
    dropoffAddress: '45 Spintex Rd',
    packageDescription: 'Electronics parcel',
    priority: 'urgent' as const,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
];

const DRIVERS = [
  {
    id: 'driver-1',
    name: 'Kwame Mensah',
    phone: '+233000000',
    vehicleType: 'Van',
    vehiclePlate: 'GT-1234',
    status: 'active' as const,
    rating: 4.8,
    activeDeliveries: 1,
    completedDeliveries: 20,
    location: { lat: 0, lng: 0, updatedAt: '2026-01-01T00:00:00.000Z' },
  },
];

const renderWithClient = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <DriverAssignmentPanel />
    </QueryClientProvider>
  );
};

describe('DriverAssignmentPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    capturedOnDragEnd = null;
    (useToast as jest.Mock).mockReturnValue({ success: jest.fn(), error: jest.fn() });
  });

  it('shows a loading state before shipments and drivers arrive', () => {
    mockedDriverAssignmentService.getPendingShipments.mockReturnValue(new Promise(() => {}));
    mockedFleetService.getFleet.mockReturnValue(new Promise(() => {}));
    renderWithClient();

    expect(screen.getByText('Loading shipments and drivers...')).toBeInTheDocument();
  });

  it('renders pending shipments as draggable cards and drivers as drop zones', async () => {
    mockedDriverAssignmentService.getPendingShipments.mockResolvedValue(SHIPMENTS);
    mockedFleetService.getFleet.mockResolvedValue({
      drivers: DRIVERS,
      summary: { totalDrivers: 1, activeDrivers: 1, onDelivery: 0, idle: 0, offline: 0 },
    });
    renderWithClient();

    await waitFor(() =>
      expect(screen.getByTestId('shipment-card-shipment-1')).toBeInTheDocument()
    );
    expect(screen.getByTestId('driver-dropzone-driver-1')).toBeInTheDocument();
    expect(screen.getByText('Electronics parcel')).toBeInTheDocument();
    expect(screen.getByText('Kwame Mensah')).toBeInTheDocument();
  });

  it('shows a confirmation modal after a shipment is dropped on a driver', async () => {
    mockedDriverAssignmentService.getPendingShipments.mockResolvedValue(SHIPMENTS);
    mockedFleetService.getFleet.mockResolvedValue({
      drivers: DRIVERS,
      summary: { totalDrivers: 1, activeDrivers: 1, onDelivery: 0, idle: 0, offline: 0 },
    });
    renderWithClient();
    await waitFor(() => expect(screen.getByTestId('shipment-card-shipment-1')).toBeInTheDocument());

    act(() => {
      capturedOnDragEnd!({ active: { id: 'shipment-1' }, over: { id: 'driver-1' } });
    });

    await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument());
    expect(screen.getByText('Confirm Assignment')).toBeInTheDocument();
    expect(screen.getByRole('dialog')).toHaveTextContent('Electronics parcel');
    expect(screen.getByRole('dialog')).toHaveTextContent('Kwame Mensah');
  });

  it('does not open the confirmation modal when dropped outside a valid drop zone', async () => {
    mockedDriverAssignmentService.getPendingShipments.mockResolvedValue(SHIPMENTS);
    mockedFleetService.getFleet.mockResolvedValue({
      drivers: DRIVERS,
      summary: { totalDrivers: 1, activeDrivers: 1, onDelivery: 0, idle: 0, offline: 0 },
    });
    renderWithClient();
    await waitFor(() => expect(screen.getByTestId('shipment-card-shipment-1')).toBeInTheDocument());

    act(() => {
      capturedOnDragEnd!({ active: { id: 'shipment-1' }, over: null });
    });

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('cancels the pending assignment without calling the service', async () => {
    mockedDriverAssignmentService.getPendingShipments.mockResolvedValue(SHIPMENTS);
    mockedFleetService.getFleet.mockResolvedValue({
      drivers: DRIVERS,
      summary: { totalDrivers: 1, activeDrivers: 1, onDelivery: 0, idle: 0, offline: 0 },
    });
    renderWithClient();
    await waitFor(() => expect(screen.getByTestId('shipment-card-shipment-1')).toBeInTheDocument());

    act(() => {
      capturedOnDragEnd!({ active: { id: 'shipment-1' }, over: { id: 'driver-1' } });
    });
    await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(mockedDriverAssignmentService.assignShipment).not.toHaveBeenCalled();
  });

  it('confirms the assignment, calls the service, and shows a success notification', async () => {
    mockedDriverAssignmentService.getPendingShipments.mockResolvedValue(SHIPMENTS);
    mockedFleetService.getFleet.mockResolvedValue({
      drivers: DRIVERS,
      summary: { totalDrivers: 1, activeDrivers: 1, onDelivery: 0, idle: 0, offline: 0 },
    });
    mockedDriverAssignmentService.assignShipment.mockResolvedValue({
      shipmentId: 'shipment-1',
      driverId: 'driver-1',
      assignedAt: '2026-01-01T00:00:00.000Z',
    });
    renderWithClient();
    await waitFor(() => expect(screen.getByTestId('shipment-card-shipment-1')).toBeInTheDocument());

    act(() => {
      capturedOnDragEnd!({ active: { id: 'shipment-1' }, over: { id: 'driver-1' } });
    });
    await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));

    await waitFor(() =>
      expect(mockedDriverAssignmentService.assignShipment).toHaveBeenCalledWith({
        shipmentId: 'shipment-1',
        driverId: 'driver-1',
      })
    );
    await waitFor(() => expect(screen.getByTestId('assignment-success')).toBeInTheDocument());
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('shows an error message when the fleet fails to load', async () => {
    mockedDriverAssignmentService.getPendingShipments.mockResolvedValue(SHIPMENTS);
    mockedFleetService.getFleet.mockRejectedValue(new Error('Fleet unavailable'));
    renderWithClient();

    await waitFor(() => expect(screen.getByText('Fleet unavailable')).toBeInTheDocument());
  });

  it('shows an empty state when there are no pending shipments', async () => {
    mockedDriverAssignmentService.getPendingShipments.mockResolvedValue([]);
    mockedFleetService.getFleet.mockResolvedValue({
      drivers: DRIVERS,
      summary: { totalDrivers: 1, activeDrivers: 1, onDelivery: 0, idle: 0, offline: 0 },
    });
    renderWithClient();

    await waitFor(() => expect(screen.getByText('No pending shipments.')).toBeInTheDocument());
  });
});
