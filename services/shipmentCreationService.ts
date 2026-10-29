import { apiClient } from '@/services/api';

export interface CreateShipmentPayload {
  senderName: string;
  pickupAddress: string;
  recipientName: string;
  recipientPhone: string;
  destination: string;
  packageSize: 'small' | 'medium' | 'large';
  description: string;
  weightKg: number;
  amountXlm: number;
  paymentMethod: 'escrow';
}

export interface CreatedShipment {
  id: string;
  status: string;
  createdAt: string;
}

export const shipmentCreationService = {
  async createShipment(
    payload: CreateShipmentPayload,
  ): Promise<CreatedShipment> {
    const { data } = await apiClient.post<CreatedShipment>(
      '/shipments',
      payload,
    );

    if (!data || typeof data.id !== 'string' || typeof data.status !== 'string') {
      throw new Error('Invalid shipment creation response');
    }

    return data;
  },
};
