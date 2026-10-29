import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { milestoneService, type MilestoneTimeline, type Milestone } from '../services/milestoneService';

interface UseMilestoneTimelineReturn extends UseQueryResult<MilestoneTimeline, Error> {
  /** The milestone timeline data */
  timeline: MilestoneTimeline | undefined;
  /** Milestone array from the timeline */
  milestones: Milestone[];
  /** The current active milestone */
  currentMilestone: Milestone | undefined;
  /** Index of the current active milestone */
  currentMilestoneIndex: number;
  /** Progress percentage (0-100) */
  progressPercentage: number;
  /** Whether the timeline is currently loading */
  isLoading: boolean;
  /** Any error that occurred during fetching */
  error: Error | null;
}

/**
 * Custom hook to fetch and manage delivery milestone timeline
 * Uses TanStack Query for data fetching, caching, and synchronization
 *
 * @param deliveryId - The ID of the delivery to fetch milestones for
 * @param enabled - Whether to enable the query (default: true if deliveryId exists)
 * @returns Object containing timeline data and helper methods
 *
 * @example
 * const { timeline, milestones, currentMilestone, progressPercentage } = useMilestoneTimeline(deliveryId);
 */
export function useMilestoneTimeline(
  deliveryId: string | null | undefined,
  enabled = true
): UseMilestoneTimelineReturn {
  const query = useQuery<MilestoneTimeline, Error>({
    queryKey: ['milestoneTimeline', deliveryId],
    queryFn: () => {
      if (!deliveryId) {
        throw new Error('Delivery ID is required');
      }
      return milestoneService.getMilestoneTimeline(deliveryId);
    },
    enabled: !!deliveryId && enabled,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes (formerly cacheTime)
  });

  const timeline = query.data;
  const milestones = timeline?.milestones ?? [];

  // Find the current active milestone (last completed or first incomplete)
  let currentMilestoneIndex = -1;
  for (let i = 0; i < milestones.length; i++) {
    if (!milestones[i].completed) {
      currentMilestoneIndex = i;
      break;
    }
    currentMilestoneIndex = i;
  }

  const currentMilestone = milestones[currentMilestoneIndex] ?? milestones[0];

  // Calculate progress as a percentage (count completed milestones)
  const completedCount = milestones.filter((m) => m.completed).length;
  const progressPercentage =
    milestones.length > 0 ? Math.round((completedCount / milestones.length) * 100) : 0;

  return {
    ...query,
    timeline,
    milestones,
    currentMilestone,
    currentMilestoneIndex,
    progressPercentage,
    isLoading: query.isPending,
    error: query.error,
  };
}
