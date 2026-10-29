import { apiClient } from '@/services/api';
import { driverAssignmentService } from '@/services/driverAssignmentService';

jest.mock('@/services/api', () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
  },
}));

const mockedApiClient = apiClient as jest.Mocked<typeof apiClient>;

describe('driverAssignmentService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('fetches pending shipments', async () => {
    const shipments = [
      {
        id: 'shipment-1',
        pickupAddress: 'A',
        dropoffAddress: 'B',
        packageDescription: 'Box',
        priority: 'standard' as const,
        createdAt: '2026-01-01T00:00:00.000Z',
      },
    ];
    mockedApiClient.get.mockResolvedValue({ data: shipments });

    const result = await driverAssignmentService.getPendingShipments();

    expect(result).toEqual(shipments);
    expect(mockedApiClient.get).toHaveBeenCalledWith('/fleet/shipments/pending', {
      signal: undefined,
    });
  });

  it('assigns a shipment to a driver', async () => {
    const response = {
      shipmentId: 'shipment-1',
      driverId: 'driver-1',
      assignedAt: '2026-01-01T00:00:00.000Z',
    };
    mockedApiClient.post.mockResolvedValue({ data: response });

    const result = await driverAssignmentService.assignShipment({
      shipmentId: 'shipment-1',
      driverId: 'driver-1',
    });

    expect(result).toEqual(response);
    expect(mockedApiClient.post).toHaveBeenCalledWith('/fleet/shipments/assign', {
      shipmentId: 'shipment-1',
      driverId: 'driver-1',
    });
  });
});
