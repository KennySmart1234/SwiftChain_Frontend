import axios from 'axios';
import type {
  Driver,
  FleetResponse,
  RegisteredVehicle,
  VehicleRegistrationInput,
} from '@/types/fleet';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? '';

/**
 * fleetService — all fleet-related API communication.
 * Hooks call this; components never call this directly.
 */
export const fleetService = {
  async getFleet(signal?: AbortSignal): Promise<FleetResponse> {
    const { data } = await axios.get<FleetResponse>(
      `${API_BASE_URL}/fleet/drivers`,
      { signal },
    );
    return data;
  },

  async getDriver(id: string, signal?: AbortSignal): Promise<Driver> {
    const { data } = await axios.get<Driver>(
      `${API_BASE_URL}/fleet/drivers/${id}`,
      { signal },
    );
    return data;
  },

  async registerVehicle(
    input: VehicleRegistrationInput,
  ): Promise<RegisteredVehicle> {
    const payload = new FormData();
    payload.append('plateNumber', input.plateNumber.trim());
    payload.append('make', input.make.trim());
    payload.append('model', input.model.trim());
    payload.append('year', input.year);
    payload.append('type', input.type);
    payload.append('capacityKg', input.capacityKg);

    if (input.type === 'refrigerated') {
      payload.append('temperatureMin', input.temperatureMin);
    }
    if (input.type === 'motorcycle') {
      payload.append('cargoBoxSize', input.cargoBoxSize.trim());
    }
    if (input.registrationDocument) {
      payload.append('registrationDocument', input.registrationDocument);
    }
    if (input.vehiclePhoto) {
      payload.append('vehiclePhoto', input.vehiclePhoto);
    }

    const { data } = await axios.post<RegisteredVehicle>(
      `${API_BASE_URL}/fleet/vehicles`,
      payload,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    );
    return data;
  },
};
