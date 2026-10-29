import DriverEarningsDashboard from '@/components/wallet/DriverEarningsDashboard';

/**
 * Route: /driver/earnings
 */
export default function DriverEarningsPage() {
  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8 dark:bg-gray-900 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <DriverEarningsDashboard />
      </div>
    </div>
  );
}
