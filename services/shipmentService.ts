import axios from '@/lib/httpClient';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? '';

/**
 * Shipment lifecycle statuses returned by the backend.
 * A shipment may only be cancelled by the sender while it is still
 * `pending` AND no driver has been assigned yet.
 */
export type ShipmentStatus =
  | 'pending'
  | 'assigned'
  | 'in_transit'
  | 'delivered'
  | 'cancelled';

export interface Shipment {
  id: string;
  status: ShipmentStatus;
  /**
   * Identifier of the driver assigned to the shipment.
   * `null` / `undefined` indicates no driver has accepted the job yet.
   */
  driverId: string | null;
  senderId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CancelShipmentResponse {
  success: boolean;
  message: string;
  data?: {
    shipmentId: string;
    status: ShipmentStatus;
    refundEtaSeconds?: number;
  };
}

/**
 * shipmentService — owns all shipment-related HTTP communication.
 * Hooks call this; components must never call it directly.
 *
 * All responses are sourced from the live backend API.
 * No inline mock objects are used.
 */
export const shipmentService = {
  /**
   * Fetch a single shipment by id.
   * Used by the cancellation component to decide whether the
   * "Cancel Request" button should render.
   */
  async getShipment(shipmentId: string): Promise<Shipment> {
    const { data } = await axios.get<Shipment>(
      `${API_BASE_URL}/api/shipments/${shipmentId}`
    );

    if (
      !data ||
      typeof data.id !== 'string' ||
      typeof data.status !== 'string'
    ) {
      throw new Error('Invalid shipment response');
    }

    return data;
  },

  /**
   * Cancel an unassigned shipment.
   * The backend is responsible for verifying the caller is the sender,
   * that the shipment is still `pending`, and that no driver has been
   * assigned. It then initiates the escrow refund.
   */
  async cancelShipment(shipmentId: string): Promise<CancelShipmentResponse> {
    const { data } = await axios.post<CancelShipmentResponse>(
      `${API_BASE_URL}/api/shipments/${shipmentId}/cancel`
    );

    if (!data || typeof data.success !== 'boolean') {
      throw new Error('Invalid cancel shipment response');
    }

    return data;
  },
};
