import api from '@/lib/api';

export type RefundStatus = 'pending' | 'reviewed' | 'approved' | 'rejected' | 'completed';

export interface RefundRecord {
  id: string;
  shipmentId: string;
  customerId: string;
  amount: number;
  currency: string;
  status: RefundStatus;
  reason: string;
  createdAt: string;
  updatedAt: string;
}

export interface RefundFilters {
  status?: RefundStatus | 'all';
  dateFrom?: string;
  dateTo?: string;
  search?: string;
}

export interface RefundPagination {
  nextCursor: string | null;
  total: number;
  limit: number;
}

export interface RefundListData {
  refunds: RefundRecord[];
  pagination: RefundPagination;
}

export interface BulkReviewResult {
  successCount: number;
  errorCount: number;
}

export interface RefundTimelineEvent {
  eventId: string;
  action: string;
  description: string;
  timestamp: string;
  actorId: string;
  actorRole?: string;
  transactionHash?: string;
}

export interface RefundApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
}

const DEFAULT_PAGE_SIZE = 20;

/**
 * adminRefundService — admin refund processing API communication.
 * Follows the Strict Layered Architecture: Component -> Hook -> Service.
 */
export const adminRefundService = {
  /** Builds the query params sent to the backend; empty filters are omitted. */
  buildParams(filters: RefundFilters, cursor?: string | null, limit = DEFAULT_PAGE_SIZE) {
    const params: Record<string, string | number> = { limit };
    if (filters.status && filters.status !== 'all') params.status = filters.status;
    if (filters.dateFrom) params.dateFrom = filters.dateFrom;
    if (filters.dateTo) params.dateTo = filters.dateTo;
    if (filters.search?.trim()) params.search = filters.search.trim();
    if (cursor) params.cursor = cursor;
    return params;
  },

  async getRefunds(
    filters: RefundFilters,
    cursor?: string | null,
    limit = DEFAULT_PAGE_SIZE
  ): Promise<RefundListData> {
    const { data } = await api.get<RefundApiResponse<RefundListData>>('/admin/refunds', {
      params: adminRefundService.buildParams(filters, cursor, limit),
    });
    if (!data.success || !data.data) {
      throw new Error(data.message ?? 'Failed to fetch refunds');
    }
    return data.data;
  },

  async bulkMarkReviewed(ids: string[]): Promise<BulkReviewResult> {
    const { data } = await api.post<RefundApiResponse<BulkReviewResult>>(
      '/admin/refunds/bulk-review',
      { ids }
    );
    if (!data.success || !data.data) {
      throw new Error(data.message ?? 'Failed to mark refunds as reviewed');
    }
    return data.data;
  },

  async getRefundTimeline(refundId: string): Promise<RefundTimelineEvent[]> {
    const { data } = await api.get<RefundApiResponse<{ events: RefundTimelineEvent[] }>>(
      `/admin/refunds/${encodeURIComponent(refundId)}/timeline`
    );
    if (!data.success || !data.data) {
      throw new Error(data.message ?? 'Failed to fetch refund timeline');
    }
    return data.data.events;
  },
};
