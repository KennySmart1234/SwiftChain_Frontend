import React from 'react';
import { render, screen, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MilestoneTimeline } from '../MilestoneTimeline';
import { useMilestoneTimeline } from '@/hooks/useMilestoneTimeline';
import type { MilestoneTimeline as MilestoneTimelineType } from '@/services/milestoneService';

jest.mock('@/hooks/useMilestoneTimeline');

const mockUseMilestoneTimeline = useMilestoneTimeline as jest.MockedFunction<
  typeof useMilestoneTimeline
>;

const mockMilestoneTimeline: MilestoneTimelineType = {
  deliveryId: 'delivery-1',
  trackingNumber: 'SC-2026-0001',
  milestones: [
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
  ],
  currentStatus: 'IN_TRANSIT',
};

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
    },
  });

  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
};

describe('MilestoneTimeline', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders the component with header and tracking number', () => {
      mockUseMilestoneTimeline.mockReturnValue({
        timeline: mockMilestoneTimeline,
        milestones: mockMilestoneTimeline.milestones,
        currentMilestone: mockMilestoneTimeline.milestones[2],
        currentMilestoneIndex: 2,
        progressPercentage: 75,
        isLoading: false,
        error: null,
        data: mockMilestoneTimeline,
        isPending: false,
        status: 'success',
        fetchStatus: 'idle',
        isError: false,
        isSuccess: true,
        isFetching: false,
        dataUpdatedAt: Date.now(),
        errorUpdatedAt: 0,
        failureCount: 0,
        failureReason: null,
      } as any);

      render(<MilestoneTimeline deliveryId="delivery-1" />, {
        wrapper: createWrapper(),
      });

      expect(screen.getByText('Delivery Progress')).toBeInTheDocument();
      expect(screen.getByText(/SC-2026-0001/)).toBeInTheDocument();
    });

    it('hides tracking number when showTrackingNumber is false', () => {
      mockUseMilestoneTimeline.mockReturnValue({
        timeline: mockMilestoneTimeline,
        milestones: mockMilestoneTimeline.milestones,
        currentMilestone: mockMilestoneTimeline.milestones[2],
        currentMilestoneIndex: 2,
        progressPercentage: 75,
        isLoading: false,
        error: null,
        data: mockMilestoneTimeline,
        isPending: false,
        status: 'success',
        fetchStatus: 'idle',
        isError: false,
        isSuccess: true,
        isFetching: false,
        dataUpdatedAt: Date.now(),
        errorUpdatedAt: 0,
        failureCount: 0,
        failureReason: null,
      } as any);

      render(<MilestoneTimeline deliveryId="delivery-1" showTrackingNumber={false} />, {
        wrapper: createWrapper(),
      });

      expect(screen.queryByText('Delivery Progress')).not.toBeInTheDocument();
    });

    it('hides progress bar when showProgress is false', () => {
      mockUseMilestoneTimeline.mockReturnValue({
        timeline: mockMilestoneTimeline,
        milestones: mockMilestoneTimeline.milestones,
        currentMilestone: mockMilestoneTimeline.milestones[2],
        currentMilestoneIndex: 2,
        progressPercentage: 75,
        isLoading: false,
        error: null,
        data: mockMilestoneTimeline,
        isPending: false,
        status: 'success',
        fetchStatus: 'idle',
        isError: false,
        isSuccess: true,
        isFetching: false,
        dataUpdatedAt: Date.now(),
        errorUpdatedAt: 0,
        failureCount: 0,
        failureReason: null,
      } as any);

      render(<MilestoneTimeline deliveryId="delivery-1" showProgress={false} />, {
        wrapper: createWrapper(),
      });

      expect(screen.queryByText('Overall Progress')).not.toBeInTheDocument();
    });

    it('renders all milestones dynamically', () => {
      mockUseMilestoneTimeline.mockReturnValue({
        timeline: mockMilestoneTimeline,
        milestones: mockMilestoneTimeline.milestones,
        currentMilestone: mockMilestoneTimeline.milestones[2],
        currentMilestoneIndex: 2,
        progressPercentage: 75,
        isLoading: false,
        error: null,
        data: mockMilestoneTimeline,
        isPending: false,
        status: 'success',
        fetchStatus: 'idle',
        isError: false,
        isSuccess: true,
        isFetching: false,
        dataUpdatedAt: Date.now(),
        errorUpdatedAt: 0,
        failureCount: 0,
        failureReason: null,
      } as any);

      render(<MilestoneTimeline deliveryId="delivery-1" />, {
        wrapper: createWrapper(),
      });

      mockMilestoneTimeline.milestones.forEach((milestone) => {
        expect(screen.getByText(milestone.status)).toBeInTheDocument();
        expect(screen.getByText(milestone.description)).toBeInTheDocument();
      });
    });

    it('displays progress percentage correctly', () => {
      mockUseMilestoneTimeline.mockReturnValue({
        timeline: mockMilestoneTimeline,
        milestones: mockMilestoneTimeline.milestones,
        currentMilestone: mockMilestoneTimeline.milestones[2],
        currentMilestoneIndex: 2,
        progressPercentage: 75,
        isLoading: false,
        error: null,
        data: mockMilestoneTimeline,
        isPending: false,
        status: 'success',
        fetchStatus: 'idle',
        isError: false,
        isSuccess: true,
        isFetching: false,
        dataUpdatedAt: Date.now(),
        errorUpdatedAt: 0,
        failureCount: 0,
        failureReason: null,
      } as any);

      render(<MilestoneTimeline deliveryId="delivery-1" />, {
        wrapper: createWrapper(),
      });

      expect(screen.getByText('75%')).toBeInTheDocument();
    });
  });

  describe('loading state', () => {
    it('displays loading indicator when data is being fetched', () => {
      mockUseMilestoneTimeline.mockReturnValue({
        timeline: undefined,
        milestones: [],
        currentMilestone: undefined,
        currentMilestoneIndex: -1,
        progressPercentage: 0,
        isLoading: true,
        error: null,
        data: undefined,
        isPending: true,
        status: 'pending',
        fetchStatus: 'fetching',
        isError: false,
        isSuccess: false,
        isFetching: true,
        dataUpdatedAt: 0,
        errorUpdatedAt: 0,
        failureCount: 0,
        failureReason: null,
      } as any);

      render(<MilestoneTimeline deliveryId="delivery-1" />, {
        wrapper: createWrapper(),
      });

      expect(screen.getByText('Loading milestone timeline...')).toBeInTheDocument();
    });
  });

  describe('error state', () => {
    it('displays error message when loading fails', () => {
      const errorMessage = 'Failed to fetch delivery timeline';
      mockUseMilestoneTimeline.mockReturnValue({
        timeline: undefined,
        milestones: [],
        currentMilestone: undefined,
        currentMilestoneIndex: -1,
        progressPercentage: 0,
        isLoading: false,
        error: new Error(errorMessage),
        data: undefined,
        isPending: false,
        status: 'error',
        fetchStatus: 'idle',
        isError: true,
        isSuccess: false,
        isFetching: false,
        dataUpdatedAt: 0,
        errorUpdatedAt: Date.now(),
        failureCount: 1,
        failureReason: new Error(errorMessage),
      } as any);

      render(<MilestoneTimeline deliveryId="delivery-1" />, {
        wrapper: createWrapper(),
      });

      expect(screen.getByText('Error Loading Timeline')).toBeInTheDocument();
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });
  });

  describe('empty state', () => {
    it('displays empty state message when no milestones are available', () => {
      mockUseMilestoneTimeline.mockReturnValue({
        timeline: undefined,
        milestones: [],
        currentMilestone: undefined,
        currentMilestoneIndex: -1,
        progressPercentage: 0,
        isLoading: false,
        error: null,
        data: undefined,
        isPending: false,
        status: 'success',
        fetchStatus: 'idle',
        isError: false,
        isSuccess: true,
        isFetching: false,
        dataUpdatedAt: Date.now(),
        errorUpdatedAt: 0,
        failureCount: 0,
        failureReason: null,
      } as any);

      render(<MilestoneTimeline deliveryId="delivery-1" />, {
        wrapper: createWrapper(),
      });

      expect(
        screen.getByText('No milestones available for this delivery.')
      ).toBeInTheDocument();
    });
  });

  describe('milestone status badges', () => {
    it('displays "In Progress" badge for current milestone', () => {
      mockUseMilestoneTimeline.mockReturnValue({
        timeline: mockMilestoneTimeline,
        milestones: mockMilestoneTimeline.milestones,
        currentMilestone: mockMilestoneTimeline.milestones[2],
        currentMilestoneIndex: 2,
        progressPercentage: 75,
        isLoading: false,
        error: null,
        data: mockMilestoneTimeline,
        isPending: false,
        status: 'success',
        fetchStatus: 'idle',
        isError: false,
        isSuccess: true,
        isFetching: false,
        dataUpdatedAt: Date.now(),
        errorUpdatedAt: 0,
        failureCount: 0,
        failureReason: null,
      } as any);

      render(<MilestoneTimeline deliveryId="delivery-1" />, {
        wrapper: createWrapper(),
      });

      const inProgressBadge = screen.getByText('In Progress');
      expect(inProgressBadge).toBeInTheDocument();
    });

    it('displays "Completed" badge for completed milestones', () => {
      mockUseMilestoneTimeline.mockReturnValue({
        timeline: mockMilestoneTimeline,
        milestones: mockMilestoneTimeline.milestones,
        currentMilestone: mockMilestoneTimeline.milestones[2],
        currentMilestoneIndex: 2,
        progressPercentage: 75,
        isLoading: false,
        error: null,
        data: mockMilestoneTimeline,
        isPending: false,
        status: 'success',
        fetchStatus: 'idle',
        isError: false,
        isSuccess: true,
        isFetching: false,
        dataUpdatedAt: Date.now(),
        errorUpdatedAt: 0,
        failureCount: 0,
        failureReason: null,
      } as any);

      render(<MilestoneTimeline deliveryId="delivery-1" />, {
        wrapper: createWrapper(),
      });

      // Should have at least one "Completed" badge for PENDING and ACCEPTED milestones
      const completedBadges = screen.getAllByText('Completed');
      expect(completedBadges.length).toBeGreaterThan(0);
    });

    it('displays "Pending" badge for upcoming milestones', () => {
      mockUseMilestoneTimeline.mockReturnValue({
        timeline: mockMilestoneTimeline,
        milestones: mockMilestoneTimeline.milestones,
        currentMilestone: mockMilestoneTimeline.milestones[2],
        currentMilestoneIndex: 2,
        progressPercentage: 75,
        isLoading: false,
        error: null,
        data: mockMilestoneTimeline,
        isPending: false,
        status: 'success',
        fetchStatus: 'idle',
        isError: false,
        isSuccess: true,
        isFetching: false,
        dataUpdatedAt: Date.now(),
        errorUpdatedAt: 0,
        failureCount: 0,
        failureReason: null,
      } as any);

      render(<MilestoneTimeline deliveryId="delivery-1" />, {
        wrapper: createWrapper(),
      });

      expect(screen.getByText('Pending')).toBeInTheDocument();
    });
  });

  describe('timestamp display', () => {
    it('displays timestamps for completed milestones', () => {
      mockUseMilestoneTimeline.mockReturnValue({
        timeline: mockMilestoneTimeline,
        milestones: mockMilestoneTimeline.milestones,
        currentMilestone: mockMilestoneTimeline.milestones[2],
        currentMilestoneIndex: 2,
        progressPercentage: 75,
        isLoading: false,
        error: null,
        data: mockMilestoneTimeline,
        isPending: false,
        status: 'success',
        fetchStatus: 'idle',
        isError: false,
        isSuccess: true,
        isFetching: false,
        dataUpdatedAt: Date.now(),
        errorUpdatedAt: 0,
        failureCount: 0,
        failureReason: null,
      } as any);

      render(<MilestoneTimeline deliveryId="delivery-1" />, {
        wrapper: createWrapper(),
      });

      // Check that timestamps are displayed for milestones with timestamps
      const timestampElements = screen.getAllByText(/Sep 26, 2026/);
      expect(timestampElements.length).toBeGreaterThan(0);
    });
  });

  describe('accessibility', () => {
    it('applies custom className to root container', () => {
      mockUseMilestoneTimeline.mockReturnValue({
        timeline: mockMilestoneTimeline,
        milestones: mockMilestoneTimeline.milestones,
        currentMilestone: mockMilestoneTimeline.milestones[2],
        currentMilestoneIndex: 2,
        progressPercentage: 75,
        isLoading: false,
        error: null,
        data: mockMilestoneTimeline,
        isPending: false,
        status: 'success',
        fetchStatus: 'idle',
        isError: false,
        isSuccess: true,
        isFetching: false,
        dataUpdatedAt: Date.now(),
        errorUpdatedAt: 0,
        failureCount: 0,
        failureReason: null,
      } as any);

      const { container } = render(
        <MilestoneTimeline deliveryId="delivery-1" className="custom-class" />,
        { wrapper: createWrapper() }
      );

      const rootElement = container.querySelector('.custom-class');
      expect(rootElement).toBeInTheDocument();
    });
  });
});
