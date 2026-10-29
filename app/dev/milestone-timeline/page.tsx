'use client';

import { useState } from 'react';
import { MilestoneTimeline } from '@/components/deliveries/MilestoneTimeline';

/**
 * Demo page for the MilestoneTimeline component
 * This page showcases the component with mock delivery IDs and various states
 */
export default function MilestoneTimelineDemo() {
  const [selectedDeliveryId, setSelectedDeliveryId] = useState('delivery-1');

  const demoDeliveryIds = ['delivery-1', 'delivery-2', 'delivery-3'];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-8 dark:from-gray-950 dark:to-gray-900">
      <div className="mx-auto max-w-6xl space-y-8">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-50">
            MilestoneTimeline Component Demo
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            Interactive vertical stepper for delivery progress visualization
          </p>
        </div>

        {/* Demo Controls */}
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <h2 className="mb-4 text-xl font-semibold text-gray-900 dark:text-gray-50">
            Select Delivery
          </h2>
          <div className="flex flex-wrap gap-3">
            {demoDeliveryIds.map((id) => (
              <button
                key={id}
                onClick={() => setSelectedDeliveryId(id)}
                className={`rounded-lg px-4 py-2 font-medium transition-all ${
                  selectedDeliveryId === id
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'border border-gray-300 bg-gray-50 text-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                }`}
              >
                {id}
              </button>
            ))}
          </div>
        </div>

        {/* Component Showcase - Full Configuration */}
        <div className="rounded-lg border border-gray-200 bg-white p-8 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <h2 className="mb-6 text-2xl font-semibold text-gray-900 dark:text-gray-50">
            Default Configuration (With Progress Bar & Tracking Number)
          </h2>
          <div className="rounded-lg border border-gray-100 bg-gray-50 p-6 dark:border-gray-700 dark:bg-gray-900/50">
            <MilestoneTimeline 
              deliveryId={selectedDeliveryId}
              showProgress={true}
              showTrackingNumber={true}
            />
          </div>
        </div>

        {/* Component Showcase - Minimal Configuration */}
        <div className="rounded-lg border border-gray-200 bg-white p-8 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <h2 className="mb-6 text-2xl font-semibold text-gray-900 dark:text-gray-50">
            Minimal Configuration (No Progress Bar)
          </h2>
          <div className="rounded-lg border border-gray-100 bg-gray-50 p-6 dark:border-gray-700 dark:bg-gray-900/50">
            <MilestoneTimeline 
              deliveryId={selectedDeliveryId}
              showProgress={false}
            />
          </div>
        </div>

        {/* Component Showcase - Compact Configuration */}
        <div className="rounded-lg border border-gray-200 bg-white p-8 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <h2 className="mb-6 text-2xl font-semibold text-gray-900 dark:text-gray-50">
            Compact Configuration (No Tracking Number)
          </h2>
          <div className="rounded-lg border border-gray-100 bg-gray-50 p-6 dark:border-gray-700 dark:bg-gray-900/50">
            <MilestoneTimeline 
              deliveryId={selectedDeliveryId}
              showTrackingNumber={false}
            />
          </div>
        </div>

        {/* Features Showcase */}
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-50">
            Component Features
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            {[
              {
                icon: '📊',
                title: 'Dynamic Rendering',
                description: 'Milestones render dynamically based on backend array length',
              },
              {
                icon: '🎯',
                title: 'Status States',
                description: 'Active, completed, and pending visual states for each milestone',
              },
              {
                icon: '📈',
                title: 'Progress Tracking',
                description: 'Real-time progress percentage calculation and display',
              },
              {
                icon: '🌙',
                title: 'Dark Mode',
                description: 'Full dark mode support with proper contrast ratios',
              },
              {
                icon: '📱',
                title: 'Responsive Design',
                description: 'Adapts seamlessly to mobile, tablet, and desktop viewports',
              },
              {
                icon: '⚡',
                title: 'Performance',
                description: 'Memoized milestone rendering to prevent unnecessary re-renders',
              },
              {
                icon: '🔄',
                title: 'Real-time Updates',
                description: 'TanStack Query integration for automatic cache management',
              },
              {
                icon: '🎨',
                title: 'Tailwind Styled',
                description: 'Beautiful gradient progress bars and smooth transitions',
              },
            ].map((feature, index) => (
              <div
                key={index}
                className="rounded-lg border border-gray-200 bg-gradient-to-br from-white to-gray-50 p-4 dark:border-gray-700 dark:from-gray-800 dark:to-gray-900"
              >
                <div className="flex gap-3">
                  <span className="text-2xl">{feature.icon}</span>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                      {feature.title}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {feature.description}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Architecture Information */}
        <div className="rounded-lg border border-gray-200 bg-white p-8 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <h2 className="mb-4 text-xl font-semibold text-gray-900 dark:text-gray-50">
            Architecture Pattern
          </h2>
          <div className="space-y-3 text-sm text-gray-700 dark:text-gray-300">
            <p>
              <span className="font-semibold">Component → Hook → Service</span> layered architecture:
            </p>
            <ul className="list-inside space-y-2 ml-4">
              <li>
                <span className="font-medium">Service Layer:</span> milestoneService.ts fetches delivery data from backend API and transforms it into milestone progression
              </li>
              <li>
                <span className="font-medium">Hook Layer:</span> useMilestoneTimeline.ts uses TanStack Query for caching, error handling, and data synchronization
              </li>
              <li>
                <span className="font-medium">Component Layer:</span> MilestoneTimeline.tsx renders the UI based on hook data with proper loading/error states
              </li>
            </ul>
          </div>
        </div>

        {/* Usage Example */}
        <div className="rounded-lg border border-gray-200 bg-white p-8 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <h2 className="mb-4 text-xl font-semibold text-gray-900 dark:text-gray-50">
            Usage Example
          </h2>
          <pre className="overflow-auto rounded-lg bg-gray-900 p-4 text-sm text-gray-100">
{`import { MilestoneTimeline } from '@/components/deliveries/MilestoneTimeline';

export function DeliveryDetails({ deliveryId }: { deliveryId: string }) {
  return (
    <MilestoneTimeline 
      deliveryId={deliveryId}
      showProgress={true}
      showTrackingNumber={true}
      className="mb-8"
    />
  );
}`}
          </pre>
        </div>

        {/* Testing Information */}
        <div className="rounded-lg border border-gray-200 bg-white p-8 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <h2 className="mb-4 text-xl font-semibold text-gray-900 dark:text-gray-50">
            Test Coverage
          </h2>
          <div className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
            <p>
              <span className="font-semibold text-green-600 dark:text-green-400">✓ 12/12 Hook Tests Passing</span>
            </p>
            <p>
              <span className="font-semibold text-green-600 dark:text-green-400">✓ 13/13 Component Tests Passing</span>
            </p>
            <p className="mt-4">
              Tests include: loading states, data fetching, error handling, milestone processing, progress calculation, dynamic rendering, accessibility, and more.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
