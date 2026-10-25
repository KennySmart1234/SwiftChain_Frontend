/**
 * Customs documentation domain types.
 *
 * Architecture: Component → Hook → Service → Backend
 * These types describe the payload returned by the customs documentation API.
 */

export type CustomsDocType =
  | 'commercial_invoice'
  | 'packing_list'
  | 'bill_of_lading'
  | 'certificate_of_origin'
  | 'customs_declaration';

export type CustomsDocStatus = 'verified' | 'pending' | 'rejected' | 'expired';

/**
 * How urgently a document needs attention, derived from its expiry date.
 * - expired  : already lapsed, or flagged expired by the backend
 * - critical : expires within 7 days
 * - warning  : expires within 30 days
 * - valid    : more than 30 days of validity remaining
 */
export type ExpiryUrgency = 'expired' | 'critical' | 'warning' | 'valid';

export interface CustomsDocument {
  id: string;
  shipmentId: string;
  type: CustomsDocType;
  filename: string;
  fileSize: number;
  mimeType: string;
  status: CustomsDocStatus;
  issuedAt: string;
  /** ISO date. Null when the document does not expire. */
  expiresAt: string | null;
  uploadedAt: string;
}

export interface CustomsDocumentListResponse {
  success: boolean;
  message: string;
  data: CustomsDocument[];
}

export interface DocumentUploadResponse {
  success: boolean;
  message: string;
  data: CustomsDocument;
}

export interface DocumentListResponse {
  success: boolean;
  message: string;
  data: CustomsDocument[];
  total?: number;
}

export interface UpdateResponse {
  success: boolean;
  message: string;
  data: CustomsDocument;
}

export interface ExpiringDocumentList {
  success: boolean;
  message: string;
  data: CustomsDocument[];
  thresholdDays: number;
  total?: number;
}

/** Human-readable labels for each document type. */
export const CUSTOMS_DOC_TYPE_LABELS: Record<CustomsDocType, string> = {
  commercial_invoice: 'Commercial Invoice',
  packing_list: 'Packing List',
  bill_of_lading: 'Bill of Lading',
  certificate_of_origin: 'Certificate of Origin',
  customs_declaration: 'Customs Declaration',
};

export const CUSTOMS_DOC_TYPES: CustomsDocType[] = [
  'commercial_invoice',
  'packing_list',
  'bill_of_lading',
  'certificate_of_origin',
  'customs_declaration',
];
