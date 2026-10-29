import { apiClient } from './api';
import type {
  PendingShipment,
  AssignShipmentPayload,
  AssignShipmentResponse,
} from '@/types/driverAssignment';

export const driverAssignmentService = {
  getPendingShipments: async (signal?: AbortSignal): Promise<PendingShipment[]> => {
    const { data } = await apiClient.get<PendingShipment[]>(
      '/fleet/shipments/pending',
      { signal }
    );
    return data;
  },

  assignShipment: async (payload: AssignShipmentPayload): Promise<AssignShipmentResponse> => {
    const { data } = await apiClient.post<AssignShipmentResponse>(
      '/fleet/shipments/assign',
      payload
    );
    return data;
  },
};
