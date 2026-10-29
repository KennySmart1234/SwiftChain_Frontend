export interface PendingShipment {
  id: string;
  pickupAddress: string;
  dropoffAddress: string;
  packageDescription: string;
  priority: 'standard' | 'urgent';
  createdAt: string;
}

export interface AssignShipmentPayload {
  shipmentId: string;
  driverId: string;
}

export interface AssignShipmentResponse {
  shipmentId: string;
  driverId: string;
  assignedAt: string;
}
