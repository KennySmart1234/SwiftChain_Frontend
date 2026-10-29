/**
 * Audit Trail Type Definitions
 * Supports filtering, sorting, and pagination for blockchain event tracking
 */

/**
 * Supported event types in the blockchain audit trail
 */
export type AuditEventType =
  | 'contract-created'
  | 'driver-assigned'
  | 'escrow-funded'
  | 'in-transit'
  | 'delivered'
  | 'dispute-raised'
  | 'dispute-resolved'
  | 'escrow-released'
  | 'shipment-created'
  | 'payment-initiated'
  | 'payment-completed'
  | 'contract-modified'
  | 'actor-updated';

/**
 * Sort order for audit trail events
 */
export type AuditSortOrder = 'asc' | 'desc';

/**
 * Filter parameters for audit trail queries
 */
export interface AuditTrailFilters {
  /** Filter by event type(s) */
  eventTypes?: AuditEventType[];
  /** Filter by actor address */
  actorAddress?: string;
  /** Start date for date range filter (ISO 8601) */
  startDate?: string;
  /** End date for date range filter (ISO 8601) */
  endDate?: string;
  /** Filter by actor ID */
  actorId?: string;
}

/**
 * Sorting options for audit trail
 */
export interface AuditTrailSort {
  /** Field to sort by */
  field: 'timestamp';
  /** Sort order */
  order: AuditSortOrder;
}

/**
 * Pagination cursor for audit trail queries
 */
export interface PaginationCursor {
  /** Cursor token for fetching next page */
  nextCursor?: string;
  /** Cursor token for fetching previous page */
  prevCursor?: string;
  /** Whether there are more results available */
  hasMore: boolean;
  /** Current page size */
  pageSize: number;
}

/**
 * Audit event returned from the API
 */
export interface AuditEvent {
  /** Unique event identifier */
  eventId: string;
  /** Type of event that occurred */
  eventType: string;
  /** Human-readable description of the event */
  description: string;
  /** ISO 8601 timestamp of when the event occurred */
  timestamp: string;
  /** ID of the actor who triggered the event */
  actorId: string;
  /** Blockchain address of the actor */
  actorAddress: string;
  /** Additional metadata associated with the event */
  metadata?: Record<string, unknown>;
}

/**
 * Response from audit trail API endpoint
 */
export interface AuditTrailResponse {
  /** Success indicator */
  success: boolean;
  /** Optional message (typically for errors) */
  message?: string;
  /** Response data payload */
  data?: {
    /** Delivery ID these events belong to */
    deliveryId: string;
    /** Array of audit events */
    events: AuditEvent[];
    /** Total count of events matching the filters */
    totalCount: number;
    /** Pagination information */
    pagination: PaginationCursor;
  };
}

/**
 * Normalized audit event for display purposes
 */
export interface NormalizedAuditEvent extends AuditEvent {
  /** Formatted timestamp for display */
  displayTimestamp: string;
  /** Icon for event type */
  icon: string;
  /** Color class for event type */
  color: string;
}

/**
 * Options for useAuditTrail hook
 */
export interface UseAuditTrailOptions {
  /** Enable automatic refetching on interval (ms) */
  refetchInterval?: number;
  /** Disable query on mount */
  enabled?: boolean;
  /** Stale time in milliseconds */
  staleTime?: number;
  /** Cache time in milliseconds */
  gcTime?: number;
}
