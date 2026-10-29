'use client';

import {
  CheckCircle2,
  DollarSign,
  Gauge,
  RefreshCw,
  Star,
  Timer,
} from 'lucide-react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useAnalyticsMetrics } from '@/hooks/useAnalyticsMetrics';

function Metric({
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
      <div className="flex items-start justify-between">
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
          {label}
        </p>
        <span className="rounded-lg bg-teal-50 p-2 text-teal-600 dark:bg-teal-950/50 dark:text-teal-400">
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

export function PerformanceMetricsDashboard() {
  const { performance, isLoading, error, refetch } = useAnalyticsMetrics();

  return (
    <section aria-label="Performance metrics dashboard" className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-teal-600 dark:text-teal-400">
            Performance center
          </p>
          <h2 className="mt-1 text-3xl font-bold tracking-tight text-slate-950 dark:text-white">
            Performance metrics
          </h2>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Track service quality, delivery velocity, and operating efficiency.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void refetch()}
          disabled={isLoading}
          className="inline-flex items-center gap-2 self-start rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
        >
          <RefreshCw
            className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`}
            aria-hidden="true"
          />
          {isLoading ? 'Refreshing…' : 'Refresh'}
        </button>
      </header>
      {error ? (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300"
        >
          {error}
        </div>
      ) : null}
      {isLoading && !performance ? (
        <div
          aria-label="Loading performance metrics"
          aria-busy="true"
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
        >
          {Array.from({ length: 4 }, (_, index) => (
            <div
              key={index}
              className="h-36 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-800"
            />
          ))}
        </div>
      ) : null}
      {performance ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Metric
              label="Delivery success"
              value={`${performance.deliverySuccessRate.toFixed(1)}%`}
              detail={`${performance.completedDeliveries.toLocaleString()} completed deliveries`}
              icon={CheckCircle2}
            />
            <Metric
              label="Average delivery time"
              value={`${performance.averageDeliveryTime.toFixed(1)} hrs`}
              detail="From pickup to settlement"
              icon={Timer}
            />
            <Metric
              label="Customer satisfaction"
              value={`${performance.customerSatisfaction.toFixed(1)}/5`}
              detail="Average post-delivery rating"
              icon={Star}
            />
            <Metric
              label="Operating cost"
              value={`$${performance.operatingCost.toLocaleString()}`}
              detail={`${performance.activeDeliveries} active deliveries`}
              icon={DollarSign}
            />
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <h3 className="font-semibold text-slate-950 dark:text-white">
                Service quality
              </h3>
              <p className="mb-5 text-sm text-slate-500 dark:text-slate-400">
                Success rate across the selected period
              </p>
              <div
                className="h-64"
                role="img"
                aria-label="Service quality trend chart"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={performance.performanceTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                    <YAxis domain={[0, 100]} unit="%" tick={{ fontSize: 12 }} />
                    <Tooltip
                      formatter={(value) => [`${value}%`, 'Success rate']}
                    />
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke="#14b8a6"
                      strokeWidth={3}
                      dot={{ r: 3 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </article>
            <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <h3 className="font-semibold text-slate-950 dark:text-white">
                Cost efficiency
              </h3>
              <p className="mb-5 text-sm text-slate-500 dark:text-slate-400">
                Operating cost trend
              </p>
              <div
                className="h-64"
                role="img"
                aria-label="Operating cost trend chart"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={performance.costTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip
                      formatter={(value) => [`$${value}`, 'Operating cost']}
                    />
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke="#2563eb"
                      strokeWidth={3}
                      dot={{ r: 3 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </article>
          </div>
        </>
      ) : null}
      {!isLoading && !performance && !error ? (
        <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
          No performance metrics available.
        </div>
      ) : null}
    </section>
  );
}
