'use client';

import { FleetAnalyticsDashboard } from '@/components/dashboard/FleetAnalyticsDashboard';
import { PerformanceMetricsDashboard } from '@/components/dashboard/PerformanceMetricsDashboard';
import { useRequireRole } from '@/hooks/useRequireRole';

export default function FleetAnalyticsPage() {
  const { isAuthorized } = useRequireRole('Fleet Operator');

  if (!isAuthorized) {
    return (
      <main className="p-6">
        <p className="text-sm text-gray-500" role="status">
          Verifying access…
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto flex max-w-7xl flex-col gap-12 p-4 sm:p-6">
      <FleetAnalyticsDashboard />
      <PerformanceMetricsDashboard />
    </main>
  );
}
