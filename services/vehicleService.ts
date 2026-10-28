import axios from 'axios';
import { apiClient } from '@/services/api';
import type {
  DeleteResponse,
  UpdateResponse,
  UploadResponse,
  VehicleDetails,
  VehicleRegistrationParams,
  VehicleRegistrationResponse,
} from '@/types/fleet';

interface VehicleApiErrorBody {
  error?: unknown;
  message?: unknown;
}

export class VehicleServiceError extends Error {
  readonly status?: number;
  readonly code?: string;

  constructor(message: string, status?: number, code?: string) {
    super(message);
    this.name = 'VehicleServiceError';
    this.status = status;
    this.code = code;
  }
}

function vehiclePath(vehicleId?: string): string {
  const base = '/fleet/vehicles';
  return vehicleId ? `${base}/${encodeURIComponent(vehicleId)}` : base;
}

function normalizeError(error: unknown): VehicleServiceError {
  if (axios.isAxiosError<VehicleApiErrorBody>(error)) {
    const body = error.response?.data;
    const message =
      (typeof body?.message === 'string' && body.message) ||
      (typeof body?.error === 'string' && body.error) ||
      error.message ||
      'Vehicle request failed';

    return new VehicleServiceError(
      message,
      error.response?.status,
      error.code,
    );
  }

  return new VehicleServiceError(
    error instanceof Error ? error.message : 'Vehicle request failed',
  );
}

async function request<T>(operation: () => Promise<{ data: T }>): Promise<T> {
  try {
    const { data } = await operation();
    return data;
  } catch (error) {
    throw normalizeError(error);
  }
}

export const vehicleService = {
  registerVehicle(
    params: VehicleRegistrationParams,
  ): Promise<VehicleRegistrationResponse> {
    return request(() =>
      apiClient.post<VehicleRegistrationResponse>(vehiclePath(), params),
    );
  },

  getVehicle(vehicleId: string): Promise<VehicleDetails> {
    return request(() => apiClient.get<VehicleDetails>(vehiclePath(vehicleId)));
  },

  updateVehicle(
    vehicleId: string,
    params: Partial<VehicleRegistrationParams>,
  ): Promise<UpdateResponse> {
    return request(() =>
      apiClient.patch<UpdateResponse>(vehiclePath(vehicleId), params),
    );
  },

  deleteVehicle(vehicleId: string): Promise<DeleteResponse> {
    return request(() =>
      apiClient.delete<DeleteResponse>(vehiclePath(vehicleId)),
    );
  },

  uploadVehicleDocument(
    vehicleId: string,
    file: File,
  ): Promise<UploadResponse> {
    const formData = new FormData();
    formData.append('file', file);

    return request(() =>
      apiClient.post<UploadResponse>(
        `${vehiclePath(vehicleId)}/documents`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } },
      ),
    );
  },
};
