'use client';

import { useCallback, useMemo } from 'react';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  adminRefundService,
  type BulkReviewResult,
  type RefundFilters,
  type RefundPagination,
  type RefundRecord,
} from '@/services/adminRefundService';
import { exportDataService } from '@/services/exportDataService';

export const REFUND_CSV_COLUMNS = [
  'id',
  'shipmentId',
  'customerId',
  'amount',
  'currency',
  'status',
  'reason',
  'createdAt',
  'updatedAt',
] as const;

export interface UseAdminRefundsResult {
  /** Refunds from all loaded pages, in server order */
  refunds: RefundRecord[];
  /** Pagination metadata from the most recently loaded page */
  pagination: RefundPagination | null;
  isLoading: boolean;
  isFetchingNextPage: boolean;
  hasNextPage: boolean;
  error: string | null;
  /** Load the next page using the server-provided cursor (infinite scroll) */
  fetchNextPage: () => Promise<unknown>;
  refetch: () => Promise<unknown>;
  /** Marks refunds as reviewed; resolves with success/error counts */
  bulkMarkReviewed: (ids: string[]) => Promise<BulkReviewResult>;
  isBulkLoading: boolean;
  /** Exports the refunds with the given ids (from loaded data) to CSV; returns rows exported */
  exportSelectedToCsv: (ids: string[]) => number;
}

/**
 * useAdminRefunds — fetches and manages admin refund processing data.
 *
 * Follows the Component -> Hook -> Service pattern:
 *   Refund views (components) -> useAdminRefunds (hook) -> adminRefundService (service)
 */
export function useAdminRefunds(filters: RefundFilters = {}): UseAdminRefundsResult {
  const queryClient = useQueryClient();
  const { status, dateFrom, dateTo, search } = filters;
  const normalized = useMemo(
    () => ({ status, dateFrom, dateTo, search }),
    [status, dateFrom, dateTo, search]
  );

  const query = useInfiniteQuery({
    queryKey: ['admin-refunds', normalized],
    initialPageParam: null as string | null,
    queryFn: ({ pageParam }) => adminRefundService.getRefunds(normalized, pageParam),
    getNextPageParam: (lastPage) => lastPage.pagination.nextCursor ?? undefined,
  });

  const mutation = useMutation({
    mutationFn: (ids: string[]) => adminRefundService.bulkMarkReviewed(ids),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-refunds'] }),
  });

  const refunds = useMemo(
    () => query.data?.pages.flatMap((page) => page.refunds) ?? [],
    [query.data]
  );
  const pages = query.data?.pages;
  const pagination = pages && pages.length > 0 ? pages[pages.length - 1].pagination : null;

  const { mutateAsync } = mutation;
  const bulkMarkReviewed = useCallback((ids: string[]) => mutateAsync(ids), [mutateAsync]);

  const exportSelectedToCsv = useCallback(
    (ids: string[]) => {
      const selected = new Set(ids);
      const rows = refunds.filter((r) => selected.has(r.id));
      if (rows.length === 0) return 0;
      exportDataService.exportToCsv(
        rows as unknown as Record<string, unknown>[],
        [...REFUND_CSV_COLUMNS],
        `refunds-${new Date().toISOString().slice(0, 10)}.csv`
      );
      return rows.length;
    },
    [refunds]
  );

  return {
    refunds,
    pagination,
    isLoading: query.isLoading,
    isFetchingNextPage: query.isFetchingNextPage,
    hasNextPage: query.hasNextPage,
    error: query.error ? (query.error as Error).message : null,
    fetchNextPage: query.fetchNextPage,
    refetch: query.refetch,
    bulkMarkReviewed,
    isBulkLoading: mutation.isPending,
    exportSelectedToCsv,
  };
}
