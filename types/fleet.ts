export type DriverStatus = 'active' | 'idle' | 'offline' | 'on_delivery';

/* eslint-disable no-unused-vars -- enum members are the public runtime values */
export enum VehicleType {
  CAR = 'CAR',
  BIKE = 'BIKE',
  VAN = 'VAN',
  TRUCK = 'TRUCK',
}
/* eslint-enable no-unused-vars */

export type RegistrationDocumentType =
  | 'registration'
  | 'insurance'
  | 'inspection'
  | 'ownership'
  | 'other';

export interface RegistrationDocument {
  id: string;
  vehicleId: string;
  type: RegistrationDocumentType;
  fileName: string;
  mimeType: string;
  size: number;
  url: string;
  uploadedAt: string;
}

export interface VehicleRegistration {
  type: VehicleType;
  make: string;
  model: string;
  year: number;
  registrationNumber: string;
  licensePlate: string;
  capacity: number;
  capacityUnit: 'kg' | 'tonnes' | 'passengers';
  color?: string;
  vin?: string;
}

export type VehicleRegistrationParams = VehicleRegistration;

export interface VehicleDetails extends VehicleRegistration {
  id: string;
  status: 'pending' | 'active' | 'rejected' | 'inactive';
  documents: RegistrationDocument[];
  createdAt: string;
  updatedAt: string;
}

export interface VehicleRegistrationApiResponse {
  success: boolean;
  message: string;
  vehicle: VehicleDetails;
}

export type VehicleRegistrationResponse = VehicleRegistrationApiResponse;

export interface UpdateResponse {
  success: boolean;
  message: string;
  vehicle: VehicleDetails;
}

export interface DeleteResponse {
  success: boolean;
  message: string;
  vehicleId: string;
}

export interface UploadResponse {
  success: boolean;
  message: string;
  document: RegistrationDocument;
}

export interface DriverLocation {
  lat: number;
  lng: number;
  updatedAt: string;
}

export interface Driver {
  id: string;
  name: string;
  phone: string;
  vehicleType: string;
  vehiclePlate: string;
  status: DriverStatus;
  rating: number;
  activeDeliveries: number;
  completedDeliveries: number;
  location: DriverLocation;
  trustScore?: number;
  /**
   * Number of deliveries currently assigned to this driver.
   * Added for driver assignment / load-balancing (issue #836).
   * Optional because older API responses may not include it yet.
   */
  currentLoad?: number;
  /**
   * Maximum number of concurrent deliveries this driver's vehicle can
   * carry. Added for driver assignment / load-balancing (issue #836).
   */
  capacity?: number;
}

export interface FleetSummary {
  totalDrivers: number;
  activeDrivers: number;
  onDelivery: number;
  idle: number;
  offline: number;
}

export interface FleetResponse {
  drivers: Driver[];
  summary: FleetSummary;
}

/**
 * A shipment awaiting driver assignment, as surfaced by the fleet
 * assignment endpoints. Distinct from `types/shipment.ts`'s `Shipment`
 * (which models the customer-facing single-shipment tracking/cancel
 * flow) — this type is scoped to the fleet assignment panel and mirrors
 * the shape returned by `/api/fleet/shipments/pending`.
 */
export interface PendingShipment {
  id: string;
  origin: string;
  destination: string;
  /**
   * Required vehicle type for this shipment's cargo, used to compute a
   * vehicle type match indicator against a candidate driver
   * (issue #836). Added because no vehicle-type field existed on the
   * shipment side of the codebase yet.
   */
  requiredVehicleType?: string;
  weightKg?: number;
  createdAt: string;
  status: 'pending';
}

/** Result of a single assignment attempt, used by bulk assignment. */
export interface AssignmentResult {
  driverId: string;
  shipmentId: string;
  success: boolean;
  error?: string;
}

export type VehicleType = 'van' | 'truck' | 'refrigerated' | 'motorcycle';

export interface VehicleRegistrationInput {
  plateNumber: string;
  make: string;
  model: string;
  year: string;
  type: VehicleType | '';
  capacityKg: string;
  temperatureMin: string;
  cargoBoxSize: string;
  registrationDocument: File | null;
  vehiclePhoto: File | null;
}

export interface RegisteredVehicle {
  id: string;
  plateNumber: string;
  make: string;
  model: string;
  year: number;
  type: VehicleType;
  capacityKg: number;
}
