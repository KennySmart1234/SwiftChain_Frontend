'use client';

import { useCallback, useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { auditService, type AuditEvent } from '@/services/auditService';

export type GridDensity = 'compact' | 'regular' | 'comfortable';

export const PAGE_SIZE_OPTIONS = [10, 25, 50] as const;
const DEFAULT_PAGE_SIZE = 25;
const NO_EVENTS: AuditEvent[] = [];
/** Visited pages are served from cache when paging back within this window. */
const PAGE_STALE_MS = 30_000;

export interface UseAuditTrailGridResult {
  events: AuditEvent[];
  totalCount: number;
  isLoading: boolean;
  isFetching: boolean;
  error: string | null;
  /** 1-based index of the current page */
  pageIndex: number;
  pageSize: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  nextPage: () => void;
  previousPage: () => void;
  setPageSize: (size: number) => void;
  density: GridDensity;
  setDensity: (density: GridDensity) => void;
  refresh: () => void;
}

/**
 * useAuditTrailGrid — cursor-paginated blockchain audit events for the grid view.
 *
 * The API only exposes forward cursors, so visited cursors are kept on a stack
 * to support stepping back without refetching from the first page.
 *
 * Follows the Component → Hook → Service pattern:
 *   AuditTrailGrid (component) → useAuditTrailGrid (hook) → auditService (service)
 */
export function useAuditTrailGrid(): UseAuditTrailGridResult {
  const [pageSize, setPageSizeState] = useState<number>(DEFAULT_PAGE_SIZE);
  // cursorStack[0] is the first page (null cursor); the last entry is the current page.
  const [cursorStack, setCursorStack] = useState<(string | null)[]>([null]);
  const [density, setDensity] = useState<GridDensity>('regular');

  const cursor = cursorStack[cursorStack.length - 1];

  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: ['auditTrail', 'grid', pageSize, cursor],
    queryFn: () => auditService.getAuditEvents({ cursor, limit: pageSize }),
    placeholderData: keepPreviousData,
    staleTime: PAGE_STALE_MS,
  });

  const nextCursor = data?.nextCursor ?? null;

  const nextPage = useCallback(() => {
    if (!nextCursor) return;
    setCursorStack((stack) => [...stack, nextCursor]);
  }, [nextCursor]);

  const previousPage = useCallback(() => {
    setCursorStack((stack) => (stack.length > 1 ? stack.slice(0, -1) : stack));
  }, []);

  const setPageSize = useCallback((size: number) => {
    setPageSizeState(size);
    setCursorStack([null]);
  }, []);

  const refresh = useCallback(() => {
    void refetch();
  }, [refetch]);

  return {
    events: data?.events ?? NO_EVENTS,
    totalCount: data?.totalCount ?? 0,
    isLoading,
    isFetching,
    error: error ? (error instanceof Error ? error.message : 'Failed to load audit events') : null,
    pageIndex: cursorStack.length,
    pageSize,
    hasNextPage: nextCursor !== null,
    hasPreviousPage: cursorStack.length > 1,
    nextPage,
    previousPage,
    setPageSize,
    density,
    setDensity,
    refresh,
  };
}
