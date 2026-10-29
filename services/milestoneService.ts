import { apiClient } from './api';
import type { Delivery } from '../types/delivery';

/**
 * Milestone represents a stage in the delivery lifecycle
 */
export interface Milestone {
  id: string;
  status: 'PENDING' | 'ACCEPTED' | 'IN_TRANSIT' | 'DELIVERED';
  timestamp?: string;
  description: string;
  completed: boolean;
}

/**
 * MilestoneTimeline contains the sequence of milestones for a delivery
 */
export interface MilestoneTimeline {
  deliveryId: string;
  trackingNumber: string;
  milestones: Milestone[];
  currentStatus: Milestone['status'];
}

/**
 * Service to fetch and transform delivery milestone data from the backend API
 */
export const milestoneService = {
  /**
   * Fetch milestone timeline for a specific delivery
   * Maps backend delivery data to milestone progression
   */
  getMilestoneTimeline: async (deliveryId: string): Promise<MilestoneTimeline> => {
    const { data: delivery } = await apiClient.get<Delivery>(`/deliveries/${deliveryId}`);

    // Define the standard milestone sequence
    const milestoneSequence: Array<Milestone['status']> = ['PENDING', 'ACCEPTED', 'IN_TRANSIT', 'DELIVERED'];

    // Transform delivery status into milestone progression
    const milestones: Milestone[] = milestoneSequence.map((status, index) => {
      const isCompleted = milestoneSequence.indexOf(delivery.status) >= index;
      const isCurrentStatus = delivery.status === status;

      const descriptions: Record<Milestone['status'], string> = {
        PENDING: 'Delivery pending acceptance',
        ACCEPTED: 'Driver has accepted the delivery',
        IN_TRANSIT: 'Package is in transit',
        DELIVERED: 'Package delivered successfully',
      };

      return {
        id: `${deliveryId}-${status}`,
        status,
        timestamp: isCompleted ? delivery.updatedAt : undefined,
        description: descriptions[status],
        completed: isCompleted || isCurrentStatus,
      };
    });

    return {
      deliveryId: delivery.id,
      trackingNumber: delivery.trackingNumber,
      milestones,
      currentStatus: delivery.status as Milestone['status'],
    };
  },

  /**
   * Fetch milestones for multiple deliveries
   */
  getMilestonesForDeliveries: async (deliveryIds: string[]): Promise<MilestoneTimeline[]> => {
    const timelines = await Promise.all(
      deliveryIds.map((id) => milestoneService.getMilestoneTimeline(id))
    );
    return timelines;
  },
};
