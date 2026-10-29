'use client';

import { useCallback, useMemo, useState } from 'react';
import type { RefundFilters, RefundRecord } from '@/services/adminRefundService';

export interface UseRefundViewStateResult {
  filters: RefundFilters;
  setStatus: (status: RefundFilters['status']) => void;
  setSearch: (search: string) => void;
  setDateRange: (dateFrom?: string, dateTo?: string) => void;
  selectedIds: string[];
  isSelected: (id: string) => boolean;
  toggle: (id: string) => void;
  toggleAll: (refunds: RefundRecord[]) => void;
  clearSelection: () => void;
}

/**
 * useRefundViewState — filter and bulk-selection state shared by the
 * List, Grid and Table admin refund views.
 */
export function useRefundViewState(initial: RefundFilters = {}): UseRefundViewStateResult {
  const [filters, setFilters] = useState<RefundFilters>({ status: 'all', ...initial });
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const setStatus = useCallback((status: RefundFilters['status']) => {
    setFilters((f) => ({ ...f, status }));
    setSelected(new Set());
  }, []);
  const setSearch = useCallback((search: string) => {
    setFilters((f) => ({ ...f, search }));
  }, []);
  const setDateRange = useCallback((dateFrom?: string, dateTo?: string) => {
    setFilters((f) => ({ ...f, dateFrom, dateTo }));
  }, []);

  const toggle = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleAll = useCallback((refunds: RefundRecord[]) => {
    setSelected((prev) =>
      refunds.length > 0 && refunds.every((r) => prev.has(r.id))
        ? new Set()
        : new Set(refunds.map((r) => r.id))
    );
  }, []);

  const clearSelection = useCallback(() => setSelected(new Set()), []);
  const isSelected = useCallback((id: string) => selected.has(id), [selected]);
  const selectedIds = useMemo(() => Array.from(selected), [selected]);

  return {
    filters,
    setStatus,
    setSearch,
    setDateRange,
    selectedIds,
    isSelected,
    toggle,
    toggleAll,
    clearSelection,
  };
}
