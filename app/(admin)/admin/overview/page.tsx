'use client';

import {
  Users,
  Package,
  DollarSign,
  Truck,
  ShieldCheck,
  Lock,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
import { useAdminDashboard } from '@/hooks/useAdminDashboard';
import { useCurrency } from '@/context/CurrencyContext';

interface MetricCardProps {
  label: string;
  value: string | number;
  icon: React.ElementType;
  isLoading: boolean;
}

function MetricCard({ label, value, icon: Icon, isLoading }: MetricCardProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-4 flex items-center justify-between">
        <span className="text-sm font-medium text-slate-500 dark:text-slate-400">{label}</span>
        <div className="rounded-lg bg-blue-50 p-2 dark:bg-blue-900/30">
          <Icon className="h-4 w-4 text-blue-600 dark:text-blue-400" />
        </div>
      </div>
      {isLoading ? (
        <div className="h-8 w-24 animate-pulse rounded-md bg-slate-200 dark:bg-slate-700" />
      ) : (
        <p className="text-2xl font-bold text-slate-900 dark:text-white">{value}</p>
      )}
    </div>
  );
}
import { AnalyticsCharts } from '@/components/dashboard/AnalyticsCharts';

/**
 * Admin Overview Page — displays analytics dashboard with dynamically loaded charts.
 *
 * Performance Optimizations:
 *   - Uses AnalyticsCharts component which implements code-splitting strategy
 *   - Charts load only when scrolled into viewport
 *   - Skeleton loaders prevent layout shift (CLS = 0.00)
 *   - Recharts library (~60KB) excluded from initial bundle
 *
 * Architecture:
 *   AdminOverviewPage (Page)
 *     → AnalyticsCharts (Component)
 *       → XLMPriceChart (Dynamic Import)
 *       → Statistics (Dynamic Import)
 *       → useInView (Viewport Detection)
 *       → useAnalyticsCharts (State Management)
 *       → chartService (Backend API)
 */
export default function AdminOverviewPage() {
  const { stats, isLoading, isError, refetch } = useAdminDashboard();
  const { formatCurrency, isLoading: isCurrencyLoading } = useCurrency();

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Admin Overview</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Platform-wide metrics and activity summary with optimized performance
        </p>
      </div>

      {isError && (
        <div className="mb-6 flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
          <AlertCircle className="h-4 w-4 shrink-0" />
          Failed to load stats. Please refresh or try again later.
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <MetricCard
          label="Total Users"
          value={stats?.totalUsers ?? 0}
          icon={Users}
          isLoading={isLoading}
        />
        <MetricCard
          label="Active Deliveries"
          value={stats?.activeDeliveries ?? 0}
          icon={Package}
          isLoading={isLoading}
        />
        <MetricCard
          label="Total Revenue"
          value={formatCurrency(stats?.totalRevenue ?? 0)}
          icon={DollarSign}
          isLoading={isLoading || isCurrencyLoading}
        />
        <MetricCard
          label="Active Drivers"
          value={stats?.activeDrivers ?? 0}
          icon={Truck}
          isLoading={isLoading}
        />
        <MetricCard
          label="Pending KYC"
          value={stats?.pendingKyc ?? 0}
          icon={ShieldCheck}
          isLoading={isLoading}
        />
        <MetricCard
          label="Escrow Locked"
          value={formatCurrency(stats?.escrowLocked ?? 0)}
          icon={Lock}
          isLoading={isLoading || isCurrencyLoading}
        />
      </div>
      {/* Dynamic analytics charts with code-splitting and lazy loading */}
      <AnalyticsCharts />
    </div>
  );
}
