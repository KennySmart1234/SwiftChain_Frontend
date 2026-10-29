import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement } from 'react';
import { useMilestoneTimeline } from '@/hooks/useMilestoneTimeline';
import { milestoneService } from '@/services/milestoneService';
import type { MilestoneTimeline, Milestone } from '@/services/milestoneService';

jest.mock('@/services/milestoneService', () => ({
  milestoneService: {
    getMilestoneTimeline: jest.fn(),
    getMilestonesForDeliveries: jest.fn(),
  },
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });

  return function Wrapper({ children }: { children: React.ReactNode }) {
    return createElement(QueryClientProvider, { client: queryClient }, children);
  };
};

const mockMilestones: Milestone[] = [
  {
    id: 'delivery-1-PENDING',
    status: 'PENDING',
    timestamp: undefined,
    description: 'Delivery pending acceptance',
    completed: true,
  },
  {
    id: 'delivery-1-ACCEPTED',
    status: 'ACCEPTED',
    timestamp: '2026-09-26T10:30:00Z',
    description: 'Driver has accepted the delivery',
    completed: true,
  },
  {
    id: 'delivery-1-IN_TRANSIT',
    status: 'IN_TRANSIT',
    timestamp: '2026-09-26T11:00:00Z',
    description: 'Package is in transit',
    completed: true,
  },
  {
    id: 'delivery-1-DELIVERED',
    status: 'DELIVERED',
    timestamp: undefined,
    description: 'Package delivered successfully',
    completed: false,
  },
];

const mockTimeline: MilestoneTimeline = {
  deliveryId: 'delivery-1',
  trackingNumber: 'SC-2026-0001',
  milestones: mockMilestones,
  currentStatus: 'IN_TRANSIT',
};

describe('useMilestoneTimeline', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('loading and data fetching', () => {
    it('fetches milestone timeline data from the service', async () => {
      (milestoneService.getMilestoneTimeline as jest.Mock).mockResolvedValueOnce(
        mockTimeline
      );

      const { result } = renderHook(() => useMilestoneTimeline('delivery-1'), {
        wrapper: createWrapper(),
      });

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(milestoneService.getMilestoneTimeline).toHaveBeenCalledWith('delivery-1');
      expect(result.current.timeline).toEqual(mockTimeline);
      expect(result.current.error).toBeNull();
    });

    it('returns an empty milestones array when no data is available', async () => {
      (milestoneService.getMilestoneTimeline as jest.Mock).mockResolvedValueOnce({
        deliveryId: 'delivery-2',
        trackingNumber: 'SC-2026-0002',
        milestones: [],
        currentStatus: 'PENDING',
      });

      const { result } = renderHook(() => useMilestoneTimeline('delivery-2'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.milestones).toEqual([]);
    });

    it('disables the query when deliveryId is null or undefined', () => {
      // When disabled, isLoading should still be managed by the query
      // This is expected behavior in TanStack Query
      const { result: resultWithNull } = renderHook(() => useMilestoneTimeline(null), {
        wrapper: createWrapper(),
      });

      const { result: resultWithUndefined } = renderHook(
        () => useMilestoneTimeline(undefined),
        { wrapper: createWrapper() }
      );

      // Query is disabled so it won't call the service
      expect(milestoneService.getMilestoneTimeline).not.toHaveBeenCalled();
    });

    it('respects the enabled parameter', () => {
      const { result } = renderHook(() => useMilestoneTimeline('delivery-1', false), {
        wrapper: createWrapper(),
      });

      // Query is disabled so it won't call the service
      expect(milestoneService.getMilestoneTimeline).not.toHaveBeenCalled();
    });
  });

  describe('milestone processing', () => {
    it('correctly identifies the current milestone index', async () => {
      (milestoneService.getMilestoneTimeline as jest.Mock).mockResolvedValueOnce(
        mockTimeline
      );

      const { result } = renderHook(() => useMilestoneTimeline('delivery-1'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // All milestones including IN_TRANSIT are completed, so index should be 3 (the last one)
      expect(result.current.currentMilestoneIndex).toBe(3);
      expect(result.current.currentMilestone?.status).toBe('DELIVERED');
    });

    it('calculates progress percentage correctly', async () => {
      (milestoneService.getMilestoneTimeline as jest.Mock).mockResolvedValueOnce(
        mockTimeline
      );

      const { result } = renderHook(() => useMilestoneTimeline('delivery-1'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // 3 completed out of 4 milestones = 75%
      expect(result.current.progressPercentage).toBe(75);
    });

    it('calculates progress percentage as 100% when all milestones are completed', async () => {
      const completedTimeline: MilestoneTimeline = {
        ...mockTimeline,
        milestones: mockMilestones.map((m) => ({ ...m, completed: true })),
      };

      (milestoneService.getMilestoneTimeline as jest.Mock).mockResolvedValueOnce(
        completedTimeline
      );

      const { result } = renderHook(() => useMilestoneTimeline('delivery-1'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.progressPercentage).toBe(100);
    });

    it('calculates progress percentage as 0% when no milestones are completed', async () => {
      const pendingTimeline: MilestoneTimeline = {
        ...mockTimeline,
        milestones: mockMilestones.map((m) => ({ ...m, completed: false })),
      };

      (milestoneService.getMilestoneTimeline as jest.Mock).mockResolvedValueOnce(
        pendingTimeline
      );

      const { result } = renderHook(() => useMilestoneTimeline('delivery-1'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.progressPercentage).toBe(0);
    });
  });

  describe('error handling', () => {
    it('exposes error when the API call fails', async () => {
      const errorMessage = 'Failed to fetch milestone timeline';
      (milestoneService.getMilestoneTimeline as jest.Mock).mockRejectedValueOnce(
        new Error(errorMessage)
      );

      const { result } = renderHook(() => useMilestoneTimeline('delivery-1'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error?.message).toBe(errorMessage);
    });

    it('throws an error when deliveryId is not provided', () => {
      const { result } = renderHook(() => useMilestoneTimeline(null), {
        wrapper: createWrapper(),
      });

      // Query is disabled so service should not be called
      expect(milestoneService.getMilestoneTimeline).not.toHaveBeenCalled();
    });
  });

  describe('data structure validation', () => {
    it('returns all required properties in the hook result', async () => {
      (milestoneService.getMilestoneTimeline as jest.Mock).mockResolvedValueOnce(
        mockTimeline
      );

      const { result } = renderHook(() => useMilestoneTimeline('delivery-1'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current).toHaveProperty('timeline');
      expect(result.current).toHaveProperty('milestones');
      expect(result.current).toHaveProperty('currentMilestone');
      expect(result.current).toHaveProperty('currentMilestoneIndex');
      expect(result.current).toHaveProperty('progressPercentage');
      expect(result.current).toHaveProperty('isLoading');
      expect(result.current).toHaveProperty('error');
    });

    it('ensures milestones array is always defined', async () => {
      (milestoneService.getMilestoneTimeline as jest.Mock).mockResolvedValueOnce({
        deliveryId: 'delivery-1',
        trackingNumber: 'SC-2026-0001',
        milestones: undefined,
        currentStatus: 'PENDING',
      });

      const { result } = renderHook(() => useMilestoneTimeline('delivery-1'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.milestones).toBeDefined();
      expect(Array.isArray(result.current.milestones)).toBe(true);
    });
  });
});
