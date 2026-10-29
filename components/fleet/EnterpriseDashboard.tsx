'use client';

import { useEffect, useRef, useState } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useVirtualizer } from '@tanstack/react-virtual';
import { DriverReputation } from './DriverReputation';
import { useFleet } from '@/hooks/useFleet';
import type { Driver, DriverStatus } from '@/types/fleet';

// ── Constants ─────────────────────────────────────────────────────────────────

const ROW_HEIGHT = 56; // px — fixed height required by react-virtual
const TABLE_HEIGHT = 600; // px — visible viewport for the table body

const STATUS_LABEL: Record<DriverStatus, string> = {
  active: 'Active',
  on_delivery: 'On Delivery',
  idle: 'Idle',
  offline: 'Offline',
};

const STATUS_BADGE: Record<DriverStatus, string> = {
  active: 'bg-emerald-100 text-emerald-700',
  on_delivery: 'bg-blue-100 text-blue-700',
  idle: 'bg-amber-100 text-amber-700',
  offline: 'bg-gray-200 text-gray-500',
};

// ── Sub-components ────────────────────────────────────────────────────────────

function StickyHeader() {
  return (
    <div
      className="sticky top-0 z-10 grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr] border-b border-gray-200 bg-gray-50 px-4 text-xs font-semibold uppercase tracking-wide text-gray-500"
      style={{ height: ROW_HEIGHT }}
      role="row"
      aria-label="Table header"
    >
      <div className="flex items-center">Driver</div>
      <div className="flex items-center">Vehicle</div>
      <div className="flex items-center">Status</div>
      <div className="flex items-center justify-end">Active</div>
      <div className="flex items-center justify-end">Completed</div>
      <div className="flex items-center justify-end">Rating</div>
    </div>
  );
}

interface VirtualRowProps {
  driver: Driver;
  style: React.CSSProperties;
}

function VirtualRow({ driver, style }: VirtualRowProps) {
  return (
    <div
      role="row"
      style={style}
      className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr] items-center border-b border-gray-100 bg-white px-4 text-sm transition-colors hover:bg-gray-50"
    >
      <div className="flex flex-col">
        <span className="font-medium text-gray-900">{driver.name}</span>
        <span className="text-xs text-gray-400">{driver.phone}</span>
      </div>
      <div className="flex flex-col">
        <span className="text-gray-700">{driver.vehicleType}</span>
        <span className="text-xs text-gray-400">{driver.vehiclePlate}</span>
      </div>
      <div>
        <span
          className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[driver.status]}`}
        >
          {STATUS_LABEL[driver.status]}
        </span>
      </div>
      <div className="text-right text-gray-700">{driver.activeDeliveries}</div>
      <div className="text-right text-gray-700">{driver.completedDeliveries}</div>
      <DriverReputation driverId={driver.id} standardRating={driver.rating} />
    </div>
  );
}

function TableRowSkeleton() {
  return (
    <div
      className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr] items-center gap-4 border-b border-gray-100 px-4"
      style={{ height: ROW_HEIGHT }}
    >
      {/* Driver */}
      <div className="flex flex-col gap-1.5">
        <div className="h-4 w-3/4 animate-pulse rounded bg-gray-200" />
        <div className="h-3 w-1/2 animate-pulse rounded bg-gray-100" />
      </div>
      {/* Vehicle */}
      <div className="flex flex-col gap-1.5">
        <div className="h-4 w-full animate-pulse rounded bg-gray-200" />
        <div className="h-3 w-3/4 animate-pulse rounded bg-gray-100" />
      </div>
      {/* Status */}
      <div>
        <div className="h-5 w-20 animate-pulse rounded-full bg-gray-200" />
      </div>
      {/* Active */}
      <div className="flex justify-end">
        <div className="h-4 w-6 animate-pulse rounded bg-gray-200" />
      </div>
      {/* Completed */}
      <div className="flex justify-end">
        <div className="h-4 w-6 animate-pulse rounded bg-gray-200" />
      </div>
      {/* Rating */}
      <div className="flex justify-end">
        <div className="h-4 w-10 animate-pulse rounded bg-gray-200" />
      </div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading fleet data">
      {Array.from({ length: 8 }).map((_, i) => (
        <TableRowSkeleton key={i} />
      ))}
    </div>
  );
}

function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div
      className="flex flex-col items-center justify-center gap-4 p-12 text-center"
      role="alert"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-12 w-12 text-red-400"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
        />
      </svg>
      <div>
        <h3 className="text-base font-semibold text-gray-800">
          Failed to load fleet data
        </h3>
        <p className="mt-1 text-sm text-red-600">{message}</p>
      </div>
      <button
        onClick={onRetry}
        className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50"
      >
        Try again
      </button>
    </div>
  );
}

function EmptyState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 p-12 text-center">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-12 w-12 text-gray-400"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1}
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
        />
      </svg>
      <div>
        <h3 className="text-base font-semibold text-gray-800">
          No drivers found
        </h3>
        <p className="mt-1 text-sm text-gray-500">
          Your fleet appears to be empty.
        </p>
      </div>
      <button
        onClick={onRetry}
        className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50"
      >
        Refresh data
      </button>
    </div>
  );
}

function SummaryBar({
  total,
  active,
  onDelivery,
  idle,
  offline,
}: {
  total: number;
  active: number;
  onDelivery: number;
  idle: number;
  offline: number;
}) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
      {[
        { label: 'Total', value: total, color: 'text-gray-900' },
        { label: 'Active', value: active, color: 'text-emerald-600' },
        { label: 'On Delivery', value: onDelivery, color: 'text-blue-600' },
        { label: 'Idle', value: idle, color: 'text-amber-600' },
        { label: 'Offline', value: offline, color: 'text-gray-400' },
      ].map(({ label, value, color }) => (
        <div
          key={label}
          className="min-h-[4.625rem] rounded-lg border border-gray-200 bg-white px-4 py-3 text-center shadow-sm"
        >
          <p className={`text-2xl font-bold ${color}`}>{value}</p>
          <p className="mt-0.5 text-xs text-gray-500">{label}</p>
        </div>
      ))}
    </div>
  );
}

function SummaryBarSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="h-[4.625rem] animate-pulse rounded-lg bg-gray-100"
        />
      ))}
    </div>
  );
}



type DateRange = '7d' | '30d' | '90d' | 'custom';

function ChartExport({ chartRef, filename }: { chartRef: React.RefObject<HTMLDivElement | null>; filename: string }) {
  const exportPng = async () => {
    const svg = chartRef.current?.querySelector('svg');
    if (!svg) return;
    const xml = new XMLSerializer().serializeToString(svg);
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement('canvas'); canvas.width = svg.clientWidth || 640; canvas.height = svg.clientHeight || 320;
      const context = canvas.getContext('2d'); if (!context) return;
      context.fillStyle = '#fff'; context.fillRect(0, 0, canvas.width, canvas.height); context.drawImage(image, 0, 0);
      const link = document.createElement('a'); link.download = `${filename}.png`; link.href = canvas.toDataURL('image/png'); link.click();
    };
    image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(xml)}`;
  };
  return <button type="button" onClick={() => void exportPng()} className="rounded-md border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50">Export PNG</button>;
}

function FleetAnalytics({ summary }: { summary: NonNullable<ReturnType<typeof useFleet>['summary']> }) {
  const [range, setRange] = useState<DateRange>('30d');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [visible, setVisible] = useState(false);
  const chartRef = useRef<HTMLDivElement>(null);
  const lastUpdated = new Date().toLocaleString();
  useEffect(() => {
    const node = chartRef.current;
    if (!node || typeof IntersectionObserver === 'undefined') { setVisible(true); return; }
    const observer = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) { setVisible(true); observer.disconnect(); } });
    observer.observe(node); return () => observer.disconnect();
  }, []);
  const data = [{ name: 'Active', value: summary.activeDrivers }, { name: 'On delivery', value: summary.onDelivery }, { name: 'Idle', value: summary.idle }, { name: 'Offline', value: summary.offline }];
  return <section aria-label="Fleet analytics" className="space-y-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-base font-semibold text-gray-900">Fleet analytics</h2><p className="text-xs text-gray-500">Data refreshed {lastUpdated}</p></div><div className="flex flex-wrap items-center gap-2" role="group" aria-label="Date range"><select aria-label="Date range" value={range} onChange={(e) => setRange(e.target.value as DateRange)} className="rounded-md border border-gray-200 px-3 py-1.5 text-sm"><option value="7d">Last 7 days</option><option value="30d">Last 30 days</option><option value="90d">Last 90 days</option><option value="custom">Custom range</option></select>{range === 'custom' && <><input aria-label="Start date" type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)} className="rounded-md border border-gray-200 px-2 py-1.5 text-sm" /><input aria-label="End date" type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} className="rounded-md border border-gray-200 px-2 py-1.5 text-sm" /></>}</div></div>
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{[['Total drivers', summary.totalDrivers], ['Active rate', `${summary.totalDrivers ? Math.round(summary.activeDrivers / summary.totalDrivers * 100) : 0}%`], ['Deliveries', summary.onDelivery], ['Available', summary.idle]].map(([label, value]) => <div key={String(label)} className="rounded-lg bg-gray-50 p-3"><p className="text-xs text-gray-500">{label}</p><p className="mt-1 text-xl font-bold text-gray-900">{value}</p></div>)}</div>
    <div ref={chartRef} className="h-64" aria-label="Fleet status chart">{visible && <ResponsiveContainer width="100%" height="100%"><BarChart data={data}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" /><YAxis allowDecimals={false} /><Tooltip /><Bar dataKey="value" fill="#2563eb" name="Drivers" /></BarChart></ResponsiveContainer>}</div><div className="flex justify-end"><ChartExport chartRef={chartRef} filename={`fleet-analytics-${range}`} /></div>
  </section>;
}

// ── Main component ────────────────────────────────────────────────────────────

/**
 * EnterpriseDashboard
 *
 * Renders a virtualized fleet table capable of smoothly displaying 1,000+
 * driver rows at 60fps. Only rows visible within the viewport are mounted in
 * the DOM — off-screen rows are unmounted, keeping memory and paint cost flat
 * regardless of fleet size.
 *
 * Architecture: Component → Hook (useFleet) → Service (fleetService)
 * Data source: backend API via fleetService.getFleet()
 */
export function EnterpriseDashboard() {
  const { drivers, summary, isLoading, error, refetch } = useFleet();

  // The scrollable container ref is passed to useVirtualizer so it knows
  // which element's scroll position to observe.
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: drivers.length,
    getScrollElement: () => scrollContainerRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 10, // render 10 extra rows above/below viewport for smooth scroll
  });

  const virtualItems = virtualizer.getVirtualItems();

  return (
    <section aria-label="Enterprise fleet dashboard" className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Enterprise Fleet</h1>
          <p className="mt-0.5 text-sm text-gray-500">
            Real-time overview of all drivers and deliveries
          </p>
        </div>
        <button
          onClick={refetch}
          disabled={isLoading}
          className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 disabled:opacity-50"
        >
          {isLoading ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      {summary && !isLoading && <FleetAnalytics summary={summary} />}

      {/* Summary bar — sourced from backend API via useFleet → fleetService */}
      {isLoading ? (
        <SummaryBarSkeleton />
      ) : summary ? (
        <SummaryBar
          total={summary.totalDrivers}
          active={summary.activeDrivers}
          onDelivery={summary.onDelivery}
          idle={summary.idle}
          offline={summary.offline}
        />
      ) : null}

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        {/* Sticky header — always visible during vertical scroll */}
        <StickyHeader />

        {/* Scrollable body */}
        {isLoading ? (
          <LoadingSkeleton />
        ) : error ? (
          <ErrorState message={error} onRetry={refetch} />
        ) : drivers.length === 0 ? (
          <EmptyState onRetry={refetch} />
        ) : (
          <div
            ref={scrollContainerRef}
            role="rowgroup"
            aria-label="Driver rows"
            style={{ height: TABLE_HEIGHT, overflowY: 'auto' }}
          >
            {/* Total height spacer — makes the scrollbar reflect the full list */}
            <div
              style={{
                height: virtualizer.getTotalSize(),
                width: '100%',
                position: 'relative',
              }}
            >
              {virtualItems.map((virtualItem) => {
                const driver = drivers[virtualItem.index];
                return (
                  <VirtualRow
                    key={driver.id}
                    driver={driver}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: virtualItem.size,
                      transform: `translateY(${virtualItem.start}px)`,
                    }}
                  />
                );
              })}
            </div>
          </div>
        )}

        {/* Footer row count */}
        {!isLoading && !error && drivers.length > 0 && (
          <div className="border-t border-gray-100 px-4 py-2 text-xs text-gray-400">
            Showing {drivers.length.toLocaleString()} driver
            {drivers.length !== 1 ? 's' : ''} · DOM renders{' '}
            {virtualItems.length} rows
          </div>
        )}
      </div>
    </section>
  );
}
