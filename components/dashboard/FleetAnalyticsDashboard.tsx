'use client';

import {
  Activity,
  Clock3,
  Fuel,
  Gauge,
  RefreshCw,
  Route,
  Truck,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useAnalyticsMetrics } from '@/hooks/useAnalyticsMetrics';
import type { AnalyticsPeriod } from '@/types/analytics';

const PERIODS: ReadonlyArray<{ value: AnalyticsPeriod; label: string }> = [
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: '90d', label: 'Last 90 days' },
];

const STATUS_COLORS = ['#2563eb', '#14b8a6', '#f59e0b', '#94a3b8'];

function formatNumber(value: number, fractionDigits = 0): string {
  return value.toLocaleString(undefined, {
    maximumFractionDigits: fractionDigits,
    minimumFractionDigits: fractionDigits,
  });
}

function KpiCard({
  label,
  value,
  detail,
  icon: Icon,
}: {
  label: string;
  value: string;
  detail: string;
  icon: typeof Gauge;
}) {
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
          {label}
        </p>
        <span className="rounded-lg bg-blue-50 p-2 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400">
          <Icon className="h-4 w-4" aria-hidden="true" />
        </span>
      </div>
      <p className="mt-4 text-2xl font-bold text-slate-950 dark:text-white">
        {value}
      </p>
      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
        {detail}
      </p>
    </article>
  );
}

function LoadingState() {
  return (
    <div
      aria-label="Loading fleet analytics"
      aria-busy="true"
      className="space-y-6"
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div
            key={index}
            className="h-36 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-800"
          />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-5">
        <div className="h-80 animate-pulse rounded-xl bg-slate-200 lg:col-span-3 dark:bg-slate-800" />
        <div className="h-80 animate-pulse rounded-xl bg-slate-200 lg:col-span-2 dark:bg-slate-800" />
      </div>
    </div>
  );
}

export function FleetAnalyticsDashboard() {
  const { fleet, period, isLoading, error, setPeriod, refetch } =
    useAnalyticsMetrics();

  return (
    <section aria-label="Fleet analytics dashboard" className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-600 dark:text-blue-400">
            Operations intelligence
          </p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950 dark:text-white">
            Fleet analytics
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-500 dark:text-slate-400">
            Understand utilization, delivery flow, and fleet health at a glance.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <label className="sr-only" htmlFor="analytics-period">
            Analytics period
          </label>
          <select
            id="analytics-period"
            value={period}
            onChange={(event) =>
              setPeriod(event.target.value as AnalyticsPeriod)
            }
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
          >
            {PERIODS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => void refetch()}
            disabled={isLoading}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <RefreshCw
              className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`}
              aria-hidden="true"
            />
            {isLoading ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>
      </header>

      {error ? (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300"
        >
          {error}
        </div>
      ) : null}
      {isLoading && !fleet ? <LoadingState /> : null}
      {!isLoading && !fleet && !error ? (
        <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
          No fleet analytics available for this period.
        </div>
      ) : null}

      {fleet ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard
              label="Fleet utilization"
              value={`${formatNumber(fleet.utilizationRate, 1)}%`}
              detail={`${fleet.activeVehicles} of ${fleet.totalVehicles} vehicles active`}
              icon={Gauge}
            />
            <KpiCard
              label="On-time delivery"
              value={`${formatNumber(fleet.onTimeRate, 1)}%`}
              detail="Compared with scheduled arrival"
              icon={Clock3}
            />
            <KpiCard
              label="Distance covered"
              value={`${formatNumber(fleet.totalMiles)} mi`}
              detail="Across completed routes"
              icon={Route}
            />
            <KpiCard
              label="Fuel efficiency"
              value={`${formatNumber(fleet.fuelEfficiency, 1)} mpg`}
              detail={`$${formatNumber(fleet.costPerMile, 2)} average cost per mile`}
              icon={Fuel}
            />
          </div>

          <div className="grid gap-6 lg:grid-cols-5">
            <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-3 dark:border-slate-800 dark:bg-slate-900">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <h2 className="font-semibold text-slate-950 dark:text-white">
                    Utilization trend
                  </h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Active vehicle percentage
                  </p>
                </div>
                <Activity
                  className="h-5 w-5 text-blue-500"
                  aria-hidden="true"
                />
              </div>
              <div
                className="h-64"
                role="img"
                aria-label="Fleet utilization trend chart"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={fleet.utilizationTrend}>
                    <defs>
                      <linearGradient
                        id="utilizationFill"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor="#2563eb"
                          stopOpacity={0.28}
                        />
                        <stop
                          offset="95%"
                          stopColor="#2563eb"
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                    <YAxis unit="%" domain={[0, 100]} tick={{ fontSize: 12 }} />
                    <Tooltip
                      formatter={(value) => [`${value}%`, 'Utilization']}
                    />
                    <Area
                      type="monotone"
                      dataKey="value"
                      stroke="#2563eb"
                      fill="url(#utilizationFill)"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </article>
            <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2 dark:border-slate-800 dark:bg-slate-900">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <h2 className="font-semibold text-slate-950 dark:text-white">
                    Fleet status
                  </h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Current vehicle distribution
                  </p>
                </div>
                <Truck className="h-5 w-5 text-teal-500" aria-hidden="true" />
              </div>
              <div className="h-64" role="img" aria-label="Fleet status chart">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={fleet.statusBreakdown}
                      dataKey="value"
                      nameKey="label"
                      innerRadius={58}
                      outerRadius={88}
                      paddingAngle={3}
                    >
                      {fleet.statusBreakdown.map((entry, index) => (
                        <Cell
                          key={entry.label}
                          fill={STATUS_COLORS[index % STATUS_COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs text-slate-500 dark:text-slate-400">
                {fleet.statusBreakdown.map((entry, index) => (
                  <div key={entry.label} className="flex items-center gap-2">
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{
                        backgroundColor:
                          STATUS_COLORS[index % STATUS_COLORS.length],
                      }}
                    />
                    {entry.label}: {entry.value}
                  </div>
                ))}
              </div>
            </article>
          </div>

          <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-5">
              <h2 className="font-semibold text-slate-950 dark:text-white">
                Delivery volume
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Completed deliveries over time
              </p>
            </div>
            <div className="h-64" role="img" aria-label="Delivery volume chart">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={fleet.deliveryTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar
                    dataKey="value"
                    name="Deliveries"
                    fill="#14b8a6"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </article>
        </>
      ) : null}
    </section>
  );
}
