import axios from 'axios';
import { apiClient } from '@/services/api';
import {
  VehicleServiceError,
  vehicleService,
} from '@/services/vehicleService';
import {
  VehicleType,
  type VehicleDetails,
  type VehicleRegistrationParams,
} from '@/types/fleet';

jest.mock('@/services/api', () => ({
  apiClient: {
    delete: jest.fn(),
    get: jest.fn(),
    patch: jest.fn(),
    post: jest.fn(),
  },
}));

const mockedApiClient = apiClient as jest.Mocked<typeof apiClient>;

const registration: VehicleRegistrationParams = {
  type: VehicleType.VAN,
  make: 'Ford',
  model: 'Transit',
  year: 2025,
  registrationNumber: 'REG-123',
  licensePlate: 'LAG-123-AB',
  capacity: 1_500,
  capacityUnit: 'kg',
};

const vehicle: VehicleDetails = {
  id: 'vehicle/1',
  ...registration,
  status: 'active',
  documents: [],
  createdAt: '2026-10-18T10:00:00.000Z',
  updatedAt: '2026-10-18T10:00:00.000Z',
};

describe('vehicleService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('registers a vehicle', async () => {
    const response = { success: true, message: 'Registered', vehicle };
    mockedApiClient.post.mockResolvedValueOnce({ data: response });

    await expect(vehicleService.registerVehicle(registration)).resolves.toEqual(
      response,
    );
    expect(mockedApiClient.post).toHaveBeenCalledWith(
      '/fleet/vehicles',
      registration,
    );
  });

  it('gets a vehicle using an encoded identifier', async () => {
    mockedApiClient.get.mockResolvedValueOnce({ data: vehicle });

    await expect(vehicleService.getVehicle('vehicle/1')).resolves.toEqual(
      vehicle,
    );
    expect(mockedApiClient.get).toHaveBeenCalledWith(
      '/fleet/vehicles/vehicle%2F1',
    );
  });

  it('updates a vehicle', async () => {
    const response = { success: true, message: 'Updated', vehicle };
    mockedApiClient.patch.mockResolvedValueOnce({ data: response });

    await expect(
      vehicleService.updateVehicle('vehicle-1', { capacity: 2_000 }),
    ).resolves.toEqual(response);
    expect(mockedApiClient.patch).toHaveBeenCalledWith(
      '/fleet/vehicles/vehicle-1',
      { capacity: 2_000 },
    );
  });

  it('deletes a vehicle', async () => {
    const response = {
      success: true,
      message: 'Deleted',
      vehicleId: 'vehicle-1',
    };
    mockedApiClient.delete.mockResolvedValueOnce({ data: response });

    await expect(vehicleService.deleteVehicle('vehicle-1')).resolves.toEqual(
      response,
    );
    expect(mockedApiClient.delete).toHaveBeenCalledWith(
      '/fleet/vehicles/vehicle-1',
    );
  });

  it('uploads a vehicle document as multipart form data', async () => {
    const file = new File(['registration'], 'registration.pdf', {
      type: 'application/pdf',
    });
    const response = {
      success: true,
      message: 'Uploaded',
      document: {
        id: 'doc-1',
        vehicleId: 'vehicle-1',
        type: 'registration' as const,
        fileName: file.name,
        mimeType: file.type,
        size: file.size,
        url: '/documents/doc-1',
        uploadedAt: '2026-10-18T10:00:00.000Z',
      },
    };
    mockedApiClient.post.mockResolvedValueOnce({ data: response });

    await expect(
      vehicleService.uploadVehicleDocument('vehicle-1', file),
    ).resolves.toEqual(response);
    const formData = mockedApiClient.post.mock.calls[0]?.[1] as FormData;
    expect(formData.get('file')).toBe(file);
    expect(mockedApiClient.post).toHaveBeenCalledWith(
      '/fleet/vehicles/vehicle-1/documents',
      expect.any(FormData),
      { headers: { 'Content-Type': 'multipart/form-data' } },
    );
  });

  it('normalizes Axios failures for consumers', async () => {
    jest.spyOn(axios, 'isAxiosError').mockReturnValueOnce(true);
    mockedApiClient.get.mockRejectedValueOnce({
      message: 'Request failed',
      code: 'ERR_BAD_RESPONSE',
      response: { status: 422, data: { message: 'Invalid vehicle id' } },
    });

    await expect(vehicleService.getVehicle('bad')).rejects.toEqual(
      expect.objectContaining<Partial<VehicleServiceError>>({
        name: 'VehicleServiceError',
        message: 'Invalid vehicle id',
        status: 422,
        code: 'ERR_BAD_RESPONSE',
      }),
    );
  });
});
