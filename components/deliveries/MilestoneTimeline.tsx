'use client';

import React, { useMemo } from 'react';
import { CheckCircle2, Circle, AlertCircle, Loader } from 'lucide-react';
import { useMilestoneTimeline } from '@/hooks/useMilestoneTimeline';
import type { Milestone } from '@/services/milestoneService';

interface MilestoneTimelineProps {
  /** The delivery ID to fetch milestones for */
  deliveryId: string;
  /** Optional custom class name for the root container */
  className?: string;
  /** Whether to show the progress bar (default: true) */
  showProgress?: boolean;
  /** Whether to show the tracking number (default: true) */
  showTrackingNumber?: boolean;
}

/**
 * Component to render an interactive vertical stepper showing delivery progress
 * Dynamically renders based on the milestone array passed from the backend
 *
 * Supports:
 * - Dynamic milestone rendering based on array length
 * - Active/completed visual states for each milestone
 * - Progress percentage display
 * - Loading and error states
 * - Responsive design with dark mode support
 */
export function MilestoneTimeline({
  deliveryId,
  className = '',
  showProgress = true,
  showTrackingNumber = true,
}: MilestoneTimelineProps) {
  const { timeline, milestones, currentMilestoneIndex, progressPercentage, isLoading, error } =
    useMilestoneTimeline(deliveryId);

  // Memoize milestone nodes to prevent unnecessary re-renders
  const memoizedMilestones = useMemo(() => milestones, [milestones]);

  // Render loading state
  if (isLoading) {
    return (
      <div className={`flex items-center justify-center p-8 ${className}`}>
        <div className="flex flex-col items-center gap-2">
          <Loader className="h-8 w-8 animate-spin text-blue-500" />
          <p className="text-sm text-gray-600 dark:text-gray-400">Loading milestone timeline...</p>
        </div>
      </div>
    );
  }

  // Render error state
  if (error) {
    return (
      <div className={`rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-950 ${className}`}>
        <div className="flex gap-3">
          <AlertCircle className="h-5 w-5 flex-shrink-0 text-red-600 dark:text-red-400" />
          <div className="flex-1">
            <h3 className="font-medium text-red-900 dark:text-red-100">Error Loading Timeline</h3>
            <p className="text-sm text-red-700 dark:text-red-200">{error.message}</p>
          </div>
        </div>
      </div>
    );
  }

  // Render empty state
  if (!timeline || memoizedMilestones.length === 0) {
    return (
      <div className={`rounded-lg border border-gray-200 bg-gray-50 p-8 text-center dark:border-gray-700 dark:bg-gray-900 ${className}`}>
        <p className="text-sm text-gray-600 dark:text-gray-400">No milestones available for this delivery.</p>
      </div>
    );
  }

  return (
    <div className={`flex flex-col gap-6 ${className}`}>
      {/* Header Section */}
      {showTrackingNumber && (
        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-50">Delivery Progress</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Tracking #<span className="font-mono font-medium text-gray-900 dark:text-gray-100">{timeline.trackingNumber}</span>
          </p>
        </div>
      )}

      {/* Progress Bar */}
      {showProgress && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-gray-700 dark:text-gray-300">Overall Progress</span>
            <span className="font-semibold text-blue-600 dark:text-blue-400">{progressPercentage}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
            <div
              className="h-full rounded-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-300 ease-out"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>
      )}

      {/* Vertical Stepper */}
      <div className="space-y-0">
        {memoizedMilestones.map((milestone: Milestone, index: number) => {
          const isCompleted = milestone.completed;
          const isCurrent = index === currentMilestoneIndex;
          const isUpcoming = index > currentMilestoneIndex;

          return (
            <div key={milestone.id} className="flex gap-4">
              {/* Timeline Node */}
              <div className="flex flex-col items-center">
                {/* Milestone Circle Icon */}
                <div
                  className={`relative flex h-12 w-12 items-center justify-center rounded-full border-2 transition-all duration-300 ${
                    isCompleted
                      ? 'border-green-500 bg-green-50 dark:border-green-400 dark:bg-green-950'
                      : isCurrent
                        ? 'border-blue-500 bg-blue-50 dark:border-blue-400 dark:bg-blue-950'
                        : 'border-gray-300 bg-gray-100 dark:border-gray-600 dark:bg-gray-800'
                  }`}
                >
                  {isCompleted ? (
                    <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400" />
                  ) : isCurrent ? (
                    <div className="relative flex h-full w-full items-center justify-center">
                      <div className="absolute h-full w-full rounded-full border-2 border-blue-500 opacity-75 dark:border-blue-400" />
                      <Circle className="h-4 w-4 fill-blue-500 text-blue-500 dark:fill-blue-400 dark:text-blue-400" />
                    </div>
                  ) : (
                    <Circle className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                  )}
                </div>

                {/* Vertical Line */}
                {index < memoizedMilestones.length - 1 && (
                  <div
                    className={`h-16 w-1 transition-all duration-300 ${
                      isCompleted
                        ? 'bg-green-500 dark:bg-green-400'
                        : isCurrent
                          ? 'bg-blue-500 dark:bg-blue-400'
                          : 'bg-gray-300 dark:bg-gray-600'
                    }`}
                  />
                )}
              </div>

              {/* Milestone Content */}
              <div className="flex flex-1 flex-col gap-1 pb-4 pt-2">
                {/* Status Badge and Title */}
                <div className="flex items-center gap-2">
                  <h4
                    className={`font-semibold transition-colors duration-300 ${
                      isCompleted
                        ? 'text-green-700 dark:text-green-300'
                        : isCurrent
                          ? 'text-blue-700 dark:text-blue-300'
                          : 'text-gray-600 dark:text-gray-400'
                    }`}
                  >
                    {milestone.status}
                  </h4>
                  {isCurrent && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-700 dark:bg-blue-900 dark:text-blue-200">
                      <span className="h-1.5 w-1.5 rounded-full bg-blue-600 dark:bg-blue-300" />
                      In Progress
                    </span>
                  )}
                  {isCompleted && !isCurrent && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-700 dark:bg-green-900 dark:text-green-200">
                      <span className="h-1.5 w-1.5 rounded-full bg-green-600 dark:bg-green-300" />
                      Completed
                    </span>
                  )}
                  {isUpcoming && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                      <span className="h-1.5 w-1.5 rounded-full bg-gray-400 dark:bg-gray-600" />
                      Pending
                    </span>
                  )}
                </div>

                {/* Description */}
                <p
                  className={`text-sm transition-colors duration-300 ${
                    isUpcoming
                      ? 'text-gray-500 dark:text-gray-500'
                      : 'text-gray-700 dark:text-gray-300'
                  }`}
                >
                  {milestone.description}
                </p>

                {/* Timestamp */}
                {milestone.timestamp && (
                  <p className="text-xs text-gray-500 dark:text-gray-500">
                    {new Date(milestone.timestamp).toLocaleString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default MilestoneTimeline;
