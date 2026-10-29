'use client';

import React, { useId, useState } from 'react';
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type FilterFn,
  type SortingState,
  type VisibilityState,
} from '@tanstack/react-table';
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Columns3,
  RefreshCw,
  Search,
} from 'lucide-react';
import { PAGE_SIZE_OPTIONS, useAuditTrailGrid, type GridDensity } from '@/hooks/useAuditTrailGrid';
import type { AuditEvent, AuditEventStatus } from '@/services/auditService';

// ---------------------------------------------------------------------------
// Presentation helpers
// ---------------------------------------------------------------------------

const DENSITY_OPTIONS: { value: GridDensity; label: string }[] = [
  { value: 'compact', label: 'Compact' },
  { value: 'regular', label: 'Regular' },
  { value: 'comfortable', label: 'Comfortable' },
];

const DENSITY_CELL_CLASS: Record<GridDensity, string> = {
  compact: 'px-3 py-1 text-xs',
  regular: 'px-4 py-2.5 text-sm',
  comfortable: 'px-4 py-4 text-sm',
};

const STATUS_CLASS: Record<AuditEventStatus, string> = {
  confirmed: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  failed: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
};

const formatTimestamp = (iso: string) =>
  new Date(iso).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'medium' });

const shortAddress = (address: string) =>
  address.length > 14 ? `${address.slice(0, 6)}...${address.slice(-6)}` : address;

const formatEventType = (type: string) =>
  type.replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

/** Matches the query against every column, including the human-readable forms. */
const matchesAllColumns: FilterFn<AuditEvent> = (row, _columnId, query: string) => {
  const e = row.original;
  const haystack = [
    e.eventId,
    e.eventType,
    formatEventType(e.eventType),
    e.timestamp,
    formatTimestamp(e.timestamp),
    e.actorId,
    e.actorAddress,
    e.status ?? '',
  ]
    .join(' ')
    .toLowerCase();
  return haystack.includes(query.trim().toLowerCase());
};

const columns: ColumnDef<AuditEvent>[] = [
  {
    id: 'eventId',
    header: 'Event ID',
    accessorKey: 'eventId',
    cell: ({ getValue }) => <span className="font-mono">{getValue<string>()}</span>,
  },
  {
    id: 'eventType',
    header: 'Type',
    accessorKey: 'eventType',
    cell: ({ getValue }) => formatEventType(getValue<string>()),
  },
  {
    id: 'timestamp',
    header: 'Timestamp',
    accessorFn: (e) => new Date(e.timestamp).getTime(),
    cell: ({ row }) => (
      <time dateTime={row.original.timestamp} className="whitespace-nowrap">
        {formatTimestamp(row.original.timestamp)}
      </time>
    ),
  },
  {
    id: 'actor',
    header: 'Actor',
    accessorKey: 'actorAddress',
    cell: ({ row }) => (
      <span className="font-mono" title={row.original.actorAddress}>
        {shortAddress(row.original.actorAddress)}
      </span>
    ),
  },
  {
    id: 'status',
    header: 'Status',
    accessorFn: (e) => e.status ?? '',
    cell: ({ row }) => {
      const status = row.original.status;
      if (!status) return <span className="text-gray-400">—</span>;
      return (
        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize ${STATUS_CLASS[status]}`}>
          {status}
        </span>
      );
    },
  },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * AuditTrailGrid — read-only, wide-screen grid of smart contract audit events
 * with sortable columns, column visibility, global search, density and cursor pagination.
 */
export function AuditTrailGrid() {
  const {
    events,
    totalCount,
    isLoading,
    isFetching,
    error,
    pageIndex,
    pageSize,
    hasNextPage,
    hasPreviousPage,
    nextPage,
    previousPage,
    setPageSize,
    density,
    setDensity,
    refresh,
  } = useAuditTrailGrid();

  const [sorting, setSorting] = useState<SortingState>([{ id: 'timestamp', desc: true }]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const searchId = useId();
  const pageSizeId = useId();

  // eslint-disable-next-line react-hooks/incompatible-library -- table instance is not memoized by design
  const table = useReactTable({
    data: events,
    columns,
    state: { sorting, globalFilter, columnVisibility },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onColumnVisibilityChange: setColumnVisibility,
    globalFilterFn: matchesAllColumns,
    getColumnCanGlobalFilter: () => true,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const rows = table.getRowModel().rows;
  const visibleColumnCount = table.getVisibleLeafColumns().length;
  const cellClass = DENSITY_CELL_CLASS[density];

  return (
    <section
      aria-labelledby="audit-trail-grid-heading"
      className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800"
    >
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 border-b border-gray-200 p-4 dark:border-gray-700">
        <h2 id="audit-trail-grid-heading" className="mr-auto text-lg font-semibold text-gray-900 dark:text-white">
          Smart contract audit trail
        </h2>

        <div className="relative w-full sm:w-64">
          <label htmlFor={searchId} className="sr-only">
            Search audit events
          </label>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" aria-hidden="true" />
          <input
            id={searchId}
            type="search"
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            placeholder="Search all columns"
            className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-9 pr-3 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
          />
        </div>

        <div role="group" aria-label="Row density" className="inline-flex rounded-lg border border-gray-300 dark:border-gray-600">
          {DENSITY_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setDensity(option.value)}
              aria-pressed={density === option.value}
              className={`px-3 py-1.5 text-xs font-medium first:rounded-l-lg last:rounded-r-lg ${
                density === option.value
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>

        <details className="relative">
          <summary className="inline-flex cursor-pointer list-none items-center gap-2 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700">
            <Columns3 className="h-4 w-4" aria-hidden="true" />
            Columns
          </summary>
          <fieldset className="absolute right-0 z-10 mt-2 w-48 space-y-2 rounded-lg border border-gray-200 bg-white p-3 shadow-lg dark:border-gray-700 dark:bg-gray-800">
            <legend className="sr-only">Visible columns</legend>
            {table.getAllLeafColumns().map((column) => (
              <label key={column.id} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                <input
                  type="checkbox"
                  checked={column.getIsVisible()}
                  onChange={column.getToggleVisibilityHandler()}
                  // Always keep at least one column on screen.
                  disabled={column.getIsVisible() && visibleColumnCount === 1}
                  className="rounded border-gray-300"
                />
                {column.columnDef.header as string}
              </label>
            ))}
          </fieldset>
        </details>

        <button
          type="button"
          onClick={refresh}
          aria-label="Refresh audit events"
          className="rounded-lg border border-gray-300 p-1.5 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
        >
          <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} aria-hidden="true" />
        </button>
      </div>

      {/* Grid */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-left" aria-busy={isFetching}>
          <thead className="bg-gray-50 dark:bg-gray-900/50">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const sorted = header.column.getIsSorted();
                  const SortIcon = sorted === 'asc' ? ArrowUp : sorted === 'desc' ? ArrowDown : ArrowUpDown;
                  return (
                    <th
                      key={header.id}
                      scope="col"
                      aria-sort={sorted === 'asc' ? 'ascending' : sorted === 'desc' ? 'descending' : 'none'}
                      className={`${cellClass} font-semibold text-gray-600 dark:text-gray-300`}
                    >
                      <button
                        type="button"
                        onClick={header.column.getToggleSortingHandler()}
                        className="inline-flex items-center gap-1 hover:text-gray-900 dark:hover:text-white"
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        <SortIcon className={`h-3.5 w-3.5 ${sorted ? '' : 'opacity-40'}`} aria-hidden="true" />
                      </button>
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {isLoading ? (
              Array.from({ length: 5 }, (_, i) => (
                <tr key={i}>
                  <td colSpan={visibleColumnCount} className={cellClass}>
                    <div className="h-4 animate-pulse rounded bg-gray-100 dark:bg-gray-700" />
                  </td>
                </tr>
              ))
            ) : error ? (
              <tr>
                <td colSpan={visibleColumnCount} className="px-4 py-8">
                  <div role="alert" className="flex flex-col items-center gap-3 text-sm text-red-600 dark:text-red-400">
                    <span className="flex items-center gap-2">
                      <AlertCircle className="h-4 w-4" aria-hidden="true" />
                      {error}
                    </span>
                    <button
                      type="button"
                      onClick={refresh}
                      className="rounded-lg bg-red-600 px-3 py-1.5 text-white hover:bg-red-700"
                    >
                      Try again
                    </button>
                  </div>
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={visibleColumnCount} className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                  {globalFilter ? 'No events match your search.' : 'No audit events recorded yet.'}
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/40">
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className={`${cellClass} text-gray-800 dark:text-gray-200`}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Footer: row count + pagination */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-200 p-4 text-sm text-gray-600 dark:border-gray-700 dark:text-gray-400">
        <p aria-live="polite">
          Showing {rows.length} of {events.length} on this page · {totalCount.toLocaleString('en-US')} total events
        </p>
        <div className="flex items-center gap-3">
          <label htmlFor={pageSizeId} className="flex items-center gap-2">
            Rows per page
            <select
              id={pageSizeId}
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="rounded-lg border border-gray-300 bg-white px-2 py-1 text-sm dark:border-gray-600 dark:bg-gray-900"
            >
              {PAGE_SIZE_OPTIONS.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </label>
          <span>Page {pageIndex}</span>
          <div className="flex gap-1">
            <button
              type="button"
              onClick={previousPage}
              disabled={!hasPreviousPage || isFetching}
              aria-label="Previous page"
              className="rounded-lg border border-gray-300 p-1.5 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-600 dark:hover:bg-gray-700"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={nextPage}
              disabled={!hasNextPage || isFetching}
              aria-label="Next page"
              className="rounded-lg border border-gray-300 p-1.5 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-600 dark:hover:bg-gray-700"
            >
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

export default AuditTrailGrid;
