'use client';

import { useRoiMetrics, type RoiMetricsParams } from '@/hooks/useRoiMetrics';

export interface RoiDashboardProps {
  params?: RoiMetricsParams;
}

function LoadingState() {
  return <p role="status" aria-live="polite">Loading ROI metrics…</p>;
}

export function RoiDashboard({ params }: RoiDashboardProps) {
  const { metrics, isLoading, isError, error, refetch } = useRoiMetrics(params);

  if (isLoading) return <LoadingState />;
  if (isError) {
    return (
      <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">
        <p>Unable to load ROI metrics{error?.message ? `: ${error.message}` : '.'}</p>
        <button type="button" onClick={() => void refetch()} className="mt-3 underline">
          Retry
        </button>
      </div>
    );
  }
  if (!metrics) return <p>No ROI metrics available.</p>;

  return (
    <section aria-labelledby="roi-dashboard-title" className="space-y-6">
      <header>
        <h2 id="roi-dashboard-title" className="text-2xl font-semibold">ROI analytics</h2>
        <p className="text-sm text-slate-600">Returns, costs, and profitability across your delivery network.</p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-label="ROI summary">
        <MetricCard label="Total revenue" value={metrics.totalRevenue} />
        <MetricCard label="Total cost" value={metrics.totalCost} />
        <MetricCard label="Total profit" value={metrics.totalProfit} />
        <MetricCard label="ROI" value={`${metrics.roi.toFixed(1)}%`} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Widget title="Return trends" id="roi-return-trends">
          <ul aria-label="Return trends" className="space-y-2">
            {metrics.returnTrends.map((point) => (
              <li key={point.date} className="flex justify-between">
                <span>{point.date}</span><strong>{point.roi.toFixed(1)}%</strong>
              </li>
            ))}
          </ul>
        </Widget>
        <Widget title="Cost breakdown" id="roi-cost-breakdown">
          <ul aria-label="Cost breakdown" className="space-y-2">
            {metrics.costBreakdown.map((item) => (
              <li key={item.category} className="flex justify-between">
                <span>{item.category}</span><span>{item.percentage.toFixed(1)}%</span>
              </li>
            ))}
          </ul>
        </Widget>
      </div>

      <Widget title="Driver profitability" id="roi-driver-profitability">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <caption className="sr-only">Profitability by driver</caption>
            <thead><tr><th scope="col" className="pr-4">Driver</th><th scope="col" className="pr-4">Profit</th><th scope="col">ROI</th></tr></thead>
            <tbody>{metrics.driverProfitability.map((driver) => (
              <tr key={driver.driverId} className="border-t border-slate-100">
                <th scope="row" className="py-2 pr-4 font-medium">{driver.driverName}</th>
                <td className="py-2 pr-4">{driver.profit.toFixed(2)}</td>
                <td className="py-2">{driver.roi.toFixed(1)}%</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </Widget>
    </section>
  );
}

function MetricCard({ label, value }: { label: string; value: number | string }) {
  return <div className="rounded-lg border border-slate-200 bg-white p-4"><dt className="text-sm text-slate-600">{label}</dt><dd className="mt-1 text-xl font-semibold">{typeof value === 'number' ? value.toFixed(2) : value}</dd></div>;
}

function Widget({ title, id, children }: { title: string; id: string; children: React.ReactNode }) {
  return <section aria-labelledby={id} className="rounded-lg border border-slate-200 bg-white p-5"><h3 id={id} className="mb-4 text-lg font-medium">{title}</h3>{children}</section>;
}
