/**
 * Immutable blockchain events recorded against a delivery's escrow contract,
 * returned by GET /api/audit/delivery/{deliveryId}/events.
 */

export type AuditTrailMetadataValue = string | number | boolean | null;

export interface AuditTrailActor {
  /** Stellar public key (G...) or contract address (C...) that emitted the event. */
  address: string;
  /** Role on the delivery, e.g. "customer", "driver", "admin" or "contract". */
  role?: string;
  displayName?: string;
}

export interface AuditTrailEvent {
  /** Stable event identifier, unique per contract event. */
  eventId: string;
  /** Event type as emitted by the contract, e.g. "escrow_funded". */
  eventType: string;
  /** ISO 8601 ledger close time of the event. */
  timestamp: string;
  actor: AuditTrailActor;
  /** Hash of the transaction that emitted the event. */
  txHash?: string;
  /** Ledger sequence the event was included in. */
  ledger?: number;
  metadata?: Record<string, AuditTrailMetadataValue>;
}

export type AuditTrailSortOrder = 'newest' | 'oldest';

export interface AuditTrailResponse {
  success: boolean;
  message?: string;
  data?: {
    deliveryId: string;
    events: AuditTrailEvent[];
  };
}
