'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo, useState } from 'react';
import { auditService } from '@/services/auditService';
import type {
  AuditEvent,
  AuditTrailFilters,
  AuditTrailSort,
  NormalizedAuditEvent,
  UseAuditTrailOptions,
} from '@/types/audit';

/**
 * Query key factory for audit trail queries
 */
const auditTrailQueryKeys = {
  all: ['auditTrail'] as const,
  delivery: (deliveryId: string) => [...auditTrailQueryKeys.all, 'delivery', deliveryId] as const,
  filtered: (deliveryId: string, filters?: AuditTrailFilters, sort?: AuditTrailSort) =>
    [...auditTrailQueryKeys.delivery(deliveryId), { filters, sort }] as const,
  paginated: (deliveryId: string, filters?: AuditTrailFilters, sort?: AuditTrailSort, cursor?: string) =>
    [...auditTrailQueryKeys.filtered(deliveryId, filters, sort), { cursor }] as const,
};

/**
 * Result returned from useAuditTrail hook
 */
export interface UseAuditTrailResult {
  /** Array of normalized audit events */
  events: NormalizedAuditEvent[];
  /** True while fetching audit data */
  isLoading: boolean;
  /** True while refetching (after initial load) */
  isFetching: boolean;
  /** Error message if fetch failed */
  error: Error | null;
  /** Total count of events matching the filters */
  totalCount: number;
  /** Pagination cursor for next page */
  nextCursor?: string;
  /** Pagination cursor for previous page */
  prevCursor?: string;
  /** Whether there are more results available */
  hasMore: boolean;
  /** Current page size */
  pageSize: number;
  /** Fetch next page of results */
  fetchNextPage: () => Promise<void>;
  /** Fetch previous page of results */
  fetchPrevPage: () => Promise<void>;
  /** Manually refetch the current page */
  refetch: () => Promise<void>;
  /** Retry failed query */
  retry: () => void;
  /** Update filters and reset to first page */
  updateFilters: (filters: AuditTrailFilters) => void;
  /** Update sorting and reset to first page */
  updateSort: (sort: AuditTrailSort) => void;
  /** Reset filters and sort to defaults */
  reset: () => void;
}

/**
 * useAuditTrail — fetches and manages filtered, paginated audit trail data.
 *
 * Supports:
 * - Filtering by event type, date range, and actor address
 * - Sorting by timestamp (ascending/descending)
 * - Cursor-based pagination
 * - Event normalization for display (icons, colors, formatted timestamps)
 * - URL query parameter persistence
 *
 * Follows the Component → Hook → Service pattern:
 *   AuditTrailView (component) → useAuditTrail (hook) → auditService (service)
 *
 * @param deliveryId - The delivery ID to fetch audit events for
 * @param initialFilters - Optional initial filter values
 * @param initialSort - Optional initial sort configuration
 * @param options - Hook options (refetch interval, stale time, etc.)
 */
export function useAuditTrail(
  deliveryId: string | null,
  initialFilters?: AuditTrailFilters,
  initialSort?: AuditTrailSort,
  options?: UseAuditTrailOptions,
): UseAuditTrailResult {
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<AuditTrailFilters>(initialFilters ?? {});
  const [sort, setSort] = useState<AuditTrailSort>(initialSort ?? { field: 'timestamp', order: 'desc' });
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [pageSize] = useState(20);

  // Store pagination state to support next/prev navigation
  const [paginationStack, setPaginationStack] = useState<Array<{ cursor?: string; events: AuditEvent[] }>>([
    { cursor: undefined, events: [] },
  ]);
  const currentPageIndex = paginationStack.length - 1;

  /**
   * Main query for audit trail data
   */
  const { data, isLoading, isFetching, error, refetch, retry } = useQuery({
    queryKey: auditTrailQueryKeys.paginated(deliveryId ?? '', filters, sort, cursor),
    queryFn: async () => {
      if (!deliveryId) {
        return {
          success: false,
          message: 'No delivery ID provided',
        };
      }

      return auditService.getAuditTrail(deliveryId, filters, sort, cursor, pageSize);
    },
    enabled: !!deliveryId,
    staleTime: options?.staleTime ?? 1000 * 60 * 5, // 5 minutes default
    gcTime: options?.gcTime ?? 1000 * 60 * 30, // 30 minutes default
    refetchInterval: options?.refetchInterval,
    retry: 2,
  });

  /**
   * Normalize events for display with icons, colors, and formatted timestamps
   */
  const normalizedEvents = useMemo<NormalizedAuditEvent[]>(() => {
    if (!data?.data?.events) {
      return [];
    }

    return data.data.events.map((event) => {
      const { icon, color } = auditService.getEventIcon(event.eventType);
      const displayTimestamp = auditService.formatTimestamp(event.timestamp);

      return {
        ...event,
        icon,
        color,
        displayTimestamp,
      };
    });
  }, [data?.data?.events]);

  /**
   * Extract pagination information from response
   */
  const pagination = useMemo(() => {
    if (!data?.data?.pagination) {
      return {
        nextCursor: undefined,
        prevCursor: undefined,
        hasMore: false,
        pageSize,
      };
    }

    return {
      nextCursor: data.data.pagination.nextCursor,
      prevCursor: data.data.pagination.prevCursor,
      hasMore: data.data.pagination.hasMore,
      pageSize: data.data.pagination.pageSize,
    };
  }, [data?.data?.pagination, pageSize]);

  /**
   * Fetch next page of results
   */
  const fetchNextPage = useCallback(async () => {
    if (!pagination.nextCursor || !pagination.hasMore) {
      return;
    }

    // Store current page in stack
    const newStack = [...paginationStack];
    newStack[currentPageIndex] = {
      cursor,
      events: normalizedEvents,
    };

    // Add next page to stack
    newStack.push({
      cursor: pagination.nextCursor,
      events: [],
    });

    setPaginationStack(newStack);
    setCursor(pagination.nextCursor);
  }, [pagination.nextCursor, pagination.hasMore, paginationStack, currentPageIndex, cursor, normalizedEvents]);

  /**
   * Fetch previous page of results
   */
  const fetchPrevPage = useCallback(async () => {
    if (currentPageIndex <= 0) {
      return;
    }

    const newStack = paginationStack.slice(0, currentPageIndex);
    setPaginationStack(newStack);

    const prevPage = newStack[newStack.length - 1];
    setCursor(prevPage?.cursor);
  }, [paginationStack, currentPageIndex]);

  /**
   * Manually refetch current page
   */
  const refetchCurrent = useCallback(async () => {
    await refetch();
  }, [refetch]);

  /**
   * Update filters and reset to first page
   */
  const updateFilters = useCallback((newFilters: AuditTrailFilters) => {
    setFilters(newFilters);
    setCursor(undefined);
    setPaginationStack([{ cursor: undefined, events: [] }]);

    // Invalidate all audit trail queries with different filters
    queryClient.invalidateQueries({
      queryKey: auditTrailQueryKeys.delivery(deliveryId ?? ''),
    });
  }, [deliveryId, queryClient]);

  /**
   * Update sorting and reset to first page
   */
  const updateSort = useCallback((newSort: AuditTrailSort) => {
    setSort(newSort);
    setCursor(undefined);
    setPaginationStack([{ cursor: undefined, events: [] }]);

    // Invalidate all audit trail queries with different sort
    queryClient.invalidateQueries({
      queryKey: auditTrailQueryKeys.delivery(deliveryId ?? ''),
    });
  }, [deliveryId, queryClient]);

  /**
   * Reset filters and sort to defaults
   */
  const reset = useCallback(() => {
    setFilters({});
    setSort({ field: 'timestamp', order: 'desc' });
    setCursor(undefined);
    setPaginationStack([{ cursor: undefined, events: [] }]);

    // Invalidate all audit trail queries
    queryClient.invalidateQueries({
      queryKey: auditTrailQueryKeys.delivery(deliveryId ?? ''),
    });
  }, [deliveryId, queryClient]);

  return {
    events: normalizedEvents,
    isLoading,
    isFetching,
    error: error || (data?.success === false ? new Error(data.message ?? 'Unknown error') : null),
    totalCount: data?.data?.totalCount ?? 0,
    nextCursor: pagination.nextCursor,
    prevCursor: pagination.prevCursor,
    hasMore: pagination.hasMore,
    pageSize: pagination.pageSize,
    fetchNextPage,
    fetchPrevPage,
    refetch: refetchCurrent,
    retry,
    updateFilters,
    updateSort,
    reset,
  };
}
