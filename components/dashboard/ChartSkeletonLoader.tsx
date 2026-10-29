'use client';

/**
 * ChartSkeletonLoader — lightweight placeholder while chart components load.
 *
 * Features:
 *   - Matches chart container dimensions to prevent layout shift (CLS)
 *   - Smooth pulse animation for visual feedback
 *   - Dark mode support
 *   - Accessible with appropriate ARIA attributes
 */
export function ChartSkeletonLoader() {
  return (
    <div className="space-y-4" role="status" aria-label="Loading chart data">
      {/* Header skeleton */}
      <div className="space-y-2">
        <div className="h-6 w-32 animate-pulse rounded-md bg-slate-200 dark:bg-slate-700" />
        <div className="h-4 w-48 animate-pulse rounded-md bg-slate-200 dark:bg-slate-700" />
      </div>

      {/* Chart area skeleton */}
      <div className="space-y-2">
        <div className="flex gap-2">
          <div className="h-10 w-16 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-700" />
          <div className="h-10 w-16 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-700" />
        </div>

        {/* Main chart placeholder */}
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800">
          <div className="space-y-2">
            {/* SVG chart area placeholder */}
            <div className="flex items-end gap-1">
              {Array.from({ length: 12 }).map((_, i) => (
                <div
                  key={i}
                  className="animate-pulse rounded bg-slate-300 dark:bg-slate-600"
                  style={{
                    flex: 1,
                    height: `${Math.random() * 150 + 50}px`,
                    opacity: 0.5 + Math.random() * 0.5,
                  }}
                />
              ))}
            </div>

            {/* Axis labels */}
            <div className="flex justify-between">
              <div className="h-4 w-12 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
              <div className="h-4 w-12 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
            </div>
          </div>
        </div>
      </div>

      {/* Stats grid skeleton */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800"
          >
            <div className="h-4 w-24 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
            <div className="h-8 w-16 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
          </div>
        ))}
      </div>

      <p className="sr-only">Chart data is being loaded</p>
    </div>
  );
}
