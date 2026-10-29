import api from '@/lib/api';
import type {
  AuditEvent,
  AuditTrailFilters,
  AuditTrailSort,
  AuditTrailResponse,
  PaginationCursor,
} from '@/types/audit';

export type AuditEventStatus = 'confirmed' | 'pending' | 'failed';

export interface AuditEventsQuery {
  /** Opaque cursor returned by the previous page; omit for the first page */
  cursor?: string | null;
  limit: number;
}

export interface AuditEventsPage {
  events: AuditEvent[];
  /** Cursor for the next page, or null when this is the last page */
  nextCursor: string | null;
  totalCount: number;
}

export interface AuditTimelineResponse {
  success: boolean;
  message?: string;
  data?: {
    deliveryId: string;
    events: AuditEvent[];
    totalCount: number;
  };
}

/**
 * auditService — fetches chronological audit events for deliveries and contracts.
 * Provides enterprise-grade activity tracking for fleet managers.
 */
export const auditService = {
  /**
   * Fetches audit timeline for a specific delivery.
   * @param deliveryId - The delivery ID to fetch timeline for
   */
  async getDeliveryAuditTimeline(deliveryId: string): Promise<AuditTimelineResponse> {
    try {
      const { data } = await api.get<AuditTimelineResponse>(`/api/audit/delivery/${deliveryId}`);
      return data;
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to fetch audit timeline',
      };
    }
  },

  /**
   * Fetches audit timeline for a smart contract.
   * @param contractId - The contract ID to fetch timeline for
   */
  async getContractAuditTimeline(contractId: string): Promise<AuditTimelineResponse> {
    try {
      const { data } = await api.get<AuditTimelineResponse>(`/api/audit/contract/${contractId}`);
      return data;
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to fetch contract timeline',
      };
    }
  },

  /**
   * Fetches filtered and paginated audit events for a delivery.
   * Supports filtering by event type, date range, and actor address.
   *
   * @param deliveryId - The delivery ID to fetch events for
   * @param filters - Filter parameters (event types, date range, actor address)
   * @param sort - Sort options (field and order)
   * @param cursor - Pagination cursor for fetching next/previous pages
   * @param pageSize - Number of events per page (default: 20)
   */
  async getAuditTrail(
    deliveryId: string,
    filters?: AuditTrailFilters,
    sort?: AuditTrailSort,
    cursor?: string,
    pageSize: number = 20,
  ): Promise<AuditTrailResponse> {
    try {
      const params = new URLSearchParams();

      // Add pagination
      params.append('pageSize', pageSize.toString());
      if (cursor) {
        params.append('cursor', cursor);
      }

      // Add filters
      if (filters?.eventTypes && filters.eventTypes.length > 0) {
        params.append('eventTypes', filters.eventTypes.join(','));
      }
      if (filters?.actorAddress) {
        params.append('actorAddress', filters.actorAddress);
      }
      if (filters?.actorId) {
        params.append('actorId', filters.actorId);
      }
      if (filters?.startDate) {
        params.append('startDate', filters.startDate);
      }
      if (filters?.endDate) {
        params.append('endDate', filters.endDate);
      }

      // Add sorting
      if (sort) {
        params.append('sortField', sort.field);
        params.append('sortOrder', sort.order);
      } else {
        // Default: sort by timestamp descending (newest first)
        params.append('sortField', 'timestamp');
        params.append('sortOrder', 'desc');
      }

      const queryString = params.toString();
      const url = `/api/audit/delivery/${deliveryId}/events${queryString ? `?${queryString}` : ''}`;

      const { data } = await api.get<AuditTrailResponse>(url);
      return data;
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to fetch audit trail',
      };
    }
  },

  /**
   * Maps event type to display icon and color.
   */
  getEventIcon(eventType: string): { icon: string; color: string } {
    const iconMap: Record<string, { icon: string; color: string }> = {
      'contract-created': { icon: '✓', color: 'bg-blue-500' },
      'driver-assigned': { icon: '👤', color: 'bg-purple-500' },
      'escrow-funded': { icon: '💰', color: 'bg-green-500' },
      'in-transit': { icon: '🚗', color: 'bg-yellow-500' },
      'delivered': { icon: '✓', color: 'bg-green-600' },
      'dispute-raised': { icon: '⚠️', color: 'bg-red-500' },
      'dispute-resolved': { icon: '✓', color: 'bg-green-500' },
      'escrow-released': { icon: '💵', color: 'bg-emerald-500' },
      'shipment-created': { icon: '📦', color: 'bg-indigo-500' },
      'payment-initiated': { icon: '💳', color: 'bg-blue-600' },
      'payment-completed': { icon: '✓', color: 'bg-green-500' },
      'contract-modified': { icon: '✏️', color: 'bg-orange-500' },
      'actor-updated': { icon: '👥', color: 'bg-cyan-500' },
    };

    return iconMap[eventType] ?? { icon: '•', color: 'bg-gray-500' };
  },

  /**
   * Formats timestamp to a human-readable display format
   */
  formatTimestamp(timestamp: string): string {
    try {
      const date = new Date(timestamp);
      return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    } catch {
      return timestamp;
    }
  },
};
