'use client';

import { useDashboardData } from '@/hooks/useDashboardData';

export default function DashboardOverview() {
  const { data, isLoading, error } = useDashboardData();

  if (isLoading) {
    return (
      <section aria-label="Dashboard overview" className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <div
              data-testid="skeleton-loader"
              className="h-7 w-48 animate-pulse rounded bg-slate-200 dark:bg-slate-700"
            />
            <div
              data-testid="skeleton-loader"
              className="mt-2 h-4 w-64 animate-pulse rounded bg-slate-200 dark:bg-slate-700"
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              key={index}
              data-testid="skeleton-loader"
              className="h-28 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-700"
            />
          ))}
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section aria-label="Dashboard overview">
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400"
        >
          Failed to fetch dashboard metrics
        </div>
      </section>
    );
  }

  if (!data) {
    return (
      <section aria-label="Dashboard overview">
        <p>No dashboard data available.</p>
      </section>
    );
  }

  return (
    <section aria-label="Dashboard overview" className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          Dashboard Overview
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Live logistics performance and shipment activity
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {data.metrics.map((metric) => (
          <div
            key={metric.label}
            className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"
          >
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {metric.label}
            </p>
            <p className="mt-3 text-2xl font-bold text-slate-900 dark:text-white">
              {metric.value}
            </p>
          </div>
        ))}
        <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Total Deliveries
          </p>
          <p className="mt-3 text-2xl font-bold text-slate-900 dark:text-white">
            {data.totalDeliveries}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Active Drivers
          </p>
          <p className="mt-3 text-2xl font-bold text-slate-900 dark:text-white">
            {data.activeDrivers}
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            Active shipments
          </h2>
          <ul className="mt-4 space-y-3" aria-label="Active shipments list">
            {data.shipments.map((shipment) => (
              <li
                key={shipment.id}
                className="flex items-center justify-between rounded-lg bg-slate-50 p-3 dark:bg-slate-800/80"
              >
                <div>
                  <p className="font-medium text-slate-900 dark:text-white">
                    {shipment.id}
                  </p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {shipment.route}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                    {shipment.status}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {shipment.eta}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            Quick actions
          </h2>
          <ul className="mt-4 space-y-2" aria-label="Quick actions list">
            {data.quickActions.map((action) => (
              <li
                key={action}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 dark:border-slate-700 dark:text-slate-200"
              >
                {action}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
