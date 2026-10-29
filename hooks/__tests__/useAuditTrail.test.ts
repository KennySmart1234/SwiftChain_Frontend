import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useAuditTrail } from '../useAuditTrail';
import { auditService } from '@/services/auditService';
import type { AuditTrailResponse, AuditEvent } from '@/types/audit';

// Mock the auditService
jest.mock('@/services/auditService');

// Mock audit events
const mockAuditEvents: AuditEvent[] = [
  {
    eventId: '1',
    eventType: 'contract-created',
    description: 'Contract created',
    timestamp: '2026-09-28T10:00:00Z',
    actorId: 'actor-1',
    actorAddress: '0x123abc',
    metadata: { contractId: 'contract-1' },
  },
  {
    eventId: '2',
    eventType: 'driver-assigned',
    description: 'Driver assigned',
    timestamp: '2026-09-28T11:00:00Z',
    actorId: 'actor-2',
    actorAddress: '0x456def',
    metadata: { driverId: 'driver-1' },
  },
  {
    eventId: '3',
    eventType: 'escrow-funded',
    description: 'Escrow funded',
    timestamp: '2026-09-28T12:00:00Z',
    actorId: 'actor-3',
    actorAddress: '0x789ghi',
    metadata: { amount: '1000' },
  },
];

const mockResponse: AuditTrailResponse = {
  success: true,
  data: {
    deliveryId: 'delivery-1',
    events: mockAuditEvents,
    totalCount: 3,
    pagination: {
      nextCursor: 'cursor-next',
      prevCursor: undefined,
      hasMore: false,
      pageSize: 20,
    },
  },
};

describe('useAuditTrail', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    jest.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });
  });

  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);

  describe('initialization', () => {
    it('should return empty state when deliveryId is null', () => {
      (auditService.getAuditTrail as jest.Mock).mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useAuditTrail(null), { wrapper });

      expect(result.current.events).toEqual([]);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.totalCount).toBe(0);
    });

    it('should initialize with loading state', () => {
      (auditService.getAuditTrail as jest.Mock).mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve(mockResponse), 100)),
      );

      const { result } = renderHook(() => useAuditTrail('delivery-1'), { wrapper });

      expect(result.current.isLoading).toBe(true);
    });

    it('should fetch events on mount', async () => {
      (auditService.getAuditTrail as jest.Mock).mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useAuditTrail('delivery-1'), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(auditService.getAuditTrail).toHaveBeenCalledWith(
        'delivery-1',
        {},
        { field: 'timestamp', order: 'desc' },
        undefined,
        20,
      );
      expect(result.current.events).toHaveLength(3);
      expect(result.current.totalCount).toBe(3);
    });
  });

  describe('event normalization', () => {
    it('should normalize events with icons and colors', async () => {
      (auditService.getAuditTrail as jest.Mock).mockResolvedValue(mockResponse);
      (auditService.getEventIcon as jest.Mock).mockImplementation((eventType) => ({
        icon: '✓',
        color: 'bg-blue-500',
      }));
      (auditService.formatTimestamp as jest.Mock).mockImplementation((ts) => 'Sep 28, 2026 10:00:00 AM');

      const { result } = renderHook(() => useAuditTrail('delivery-1'), { wrapper });

      await waitFor(() => {
        expect(result.current.events).toHaveLength(3);
      });

      const firstEvent = result.current.events[0];
      expect(firstEvent).toHaveProperty('icon', '✓');
      expect(firstEvent).toHaveProperty('color', 'bg-blue-500');
      expect(firstEvent).toHaveProperty('displayTimestamp', 'Sep 28, 2026 10:00:00 AM');
    });

    it('should preserve original event data in normalized events', async () => {
      (auditService.getAuditTrail as jest.Mock).mockResolvedValue(mockResponse);
      (auditService.getEventIcon as jest.Mock).mockReturnValue({ icon: '✓', color: 'bg-blue-500' });
      (auditService.formatTimestamp as jest.Mock).mockReturnValue('Sep 28, 2026 10:00:00 AM');

      const { result } = renderHook(() => useAuditTrail('delivery-1'), { wrapper });

      await waitFor(() => {
        expect(result.current.events).toHaveLength(3);
      });

      const firstEvent = result.current.events[0];
      expect(firstEvent.eventId).toBe('1');
      expect(firstEvent.eventType).toBe('contract-created');
      expect(firstEvent.description).toBe('Contract created');
      expect(firstEvent.actorAddress).toBe('0x123abc');
    });
  });

  describe('filtering', () => {
    it('should update filters and reset pagination', async () => {
      (auditService.getAuditTrail as jest.Mock).mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useAuditTrail('delivery-1'), { wrapper });

      await waitFor(() => {
        expect(result.current.events).toHaveLength(3);
      });

      act(() => {
        result.current.updateFilters({
          eventTypes: ['contract-created', 'driver-assigned'],
        });
      });

      await waitFor(() => {
        expect(auditService.getAuditTrail).toHaveBeenLastCalledWith(
          'delivery-1',
          { eventTypes: ['contract-created', 'driver-assigned'] },
          { field: 'timestamp', order: 'desc' },
          undefined,
          20,
        );
      });
    });

    it('should support filtering by date range', async () => {
      (auditService.getAuditTrail as jest.Mock).mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useAuditTrail('delivery-1'), { wrapper });

      await waitFor(() => {
        expect(result.current.events).toHaveLength(3);
      });

      act(() => {
        result.current.updateFilters({
          startDate: '2026-09-28T00:00:00Z',
          endDate: '2026-09-28T23:59:59Z',
        });
      });

      await waitFor(() => {
        expect(auditService.getAuditTrail).toHaveBeenLastCalledWith(
          'delivery-1',
          {
            startDate: '2026-09-28T00:00:00Z',
            endDate: '2026-09-28T23:59:59Z',
          },
          { field: 'timestamp', order: 'desc' },
          undefined,
          20,
        );
      });
    });

    it('should support filtering by actor address', async () => {
      (auditService.getAuditTrail as jest.Mock).mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useAuditTrail('delivery-1'), { wrapper });

      await waitFor(() => {
        expect(result.current.events).toHaveLength(3);
      });

      act(() => {
        result.current.updateFilters({
          actorAddress: '0x123abc',
        });
      });

      await waitFor(() => {
        expect(auditService.getAuditTrail).toHaveBeenLastCalledWith(
          'delivery-1',
          { actorAddress: '0x123abc' },
          { field: 'timestamp', order: 'desc' },
          undefined,
          20,
        );
      });
    });
  });

  describe('sorting', () => {
    it('should update sort order', async () => {
      (auditService.getAuditTrail as jest.Mock).mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useAuditTrail('delivery-1'), { wrapper });

      await waitFor(() => {
        expect(result.current.events).toHaveLength(3);
      });

      act(() => {
        result.current.updateSort({
          field: 'timestamp',
          order: 'asc',
        });
      });

      await waitFor(() => {
        expect(auditService.getAuditTrail).toHaveBeenLastCalledWith(
          'delivery-1',
          {},
          { field: 'timestamp', order: 'asc' },
          undefined,
          20,
        );
      });
    });

    it('should reset to descending order by default', async () => {
      (auditService.getAuditTrail as jest.Mock).mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useAuditTrail('delivery-1'), { wrapper });

      await waitFor(() => {
        expect(result.current.events).toHaveLength(3);
      });

      expect(auditService.getAuditTrail).toHaveBeenCalledWith(
        'delivery-1',
        {},
        { field: 'timestamp', order: 'desc' },
        undefined,
        20,
      );
    });
  });

  describe('pagination', () => {
    it('should provide pagination cursors', async () => {
      (auditService.getAuditTrail as jest.Mock).mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useAuditTrail('delivery-1'), { wrapper });

      await waitFor(() => {
        expect(result.current.events).toHaveLength(3);
      });

      expect(result.current.nextCursor).toBe('cursor-next');
      expect(result.current.prevCursor).toBeUndefined();
      expect(result.current.hasMore).toBe(false);
      expect(result.current.pageSize).toBe(20);
    });

    it('should fetch next page when fetchNextPage is called', async () => {
      const firstPageResponse: AuditTrailResponse = {
        success: true,
        data: {
          deliveryId: 'delivery-1',
          events: mockAuditEvents.slice(0, 2),
          totalCount: 4,
          pagination: {
            nextCursor: 'cursor-page-2',
            prevCursor: undefined,
            hasMore: true,
            pageSize: 20,
          },
        },
      };

      const secondPageResponse: AuditTrailResponse = {
        success: true,
        data: {
          deliveryId: 'delivery-1',
          events: mockAuditEvents.slice(2),
          totalCount: 4,
          pagination: {
            nextCursor: undefined,
            prevCursor: 'cursor-page-1',
            hasMore: false,
            pageSize: 20,
          },
        },
      };

      (auditService.getAuditTrail as jest.Mock)
        .mockResolvedValueOnce(firstPageResponse)
        .mockResolvedValueOnce(secondPageResponse);

      const { result } = renderHook(() => useAuditTrail('delivery-1'), { wrapper });

      await waitFor(() => {
        expect(result.current.events).toHaveLength(2);
      });

      expect(result.current.hasMore).toBe(true);

      act(() => {
        result.current.fetchNextPage();
      });

      await waitFor(() => {
        expect(auditService.getAuditTrail).toHaveBeenLastCalledWith(
          'delivery-1',
          {},
          { field: 'timestamp', order: 'desc' },
          'cursor-page-2',
          20,
        );
      });
    });

    it('should not fetch next page when hasMore is false', async () => {
      const noMoreResponse: AuditTrailResponse = {
        success: true,
        data: {
          deliveryId: 'delivery-1',
          events: mockAuditEvents,
          totalCount: 3,
          pagination: {
            nextCursor: undefined,
            prevCursor: undefined,
            hasMore: false,
            pageSize: 20,
          },
        },
      };

      (auditService.getAuditTrail as jest.Mock).mockResolvedValue(noMoreResponse);

      const { result } = renderHook(() => useAuditTrail('delivery-1'), { wrapper });

      await waitFor(() => {
        expect(result.current.events).toHaveLength(3);
      });

      const callCountBefore = (auditService.getAuditTrail as jest.Mock).mock.calls.length;

      act(() => {
        result.current.fetchNextPage();
      });

      // Should not make additional calls
      expect((auditService.getAuditTrail as jest.Mock).mock.calls.length).toBe(callCountBefore);
    });
  });

  describe('refetch and retry', () => {
    it('should refetch current page', async () => {
      (auditService.getAuditTrail as jest.Mock).mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useAuditTrail('delivery-1'), { wrapper });

      await waitFor(() => {
        expect(result.current.events).toHaveLength(3);
      });

      const callCountBefore = (auditService.getAuditTrail as jest.Mock).mock.calls.length;

      act(() => {
        result.current.refetch();
      });

      await waitFor(() => {
        expect((auditService.getAuditTrail as jest.Mock).mock.calls.length).toBeGreaterThan(callCountBefore);
      });
    });

    it('should retry failed query', async () => {
      const error = new Error('Network error');
      (auditService.getAuditTrail as jest.Mock)
        .mockRejectedValueOnce(error)
        .mockResolvedValueOnce(mockResponse);

      const { result } = renderHook(() => useAuditTrail('delivery-1'), { wrapper });

      await waitFor(() => {
        expect(result.current.error).not.toBeNull();
      });

      act(() => {
        result.current.retry();
      });

      await waitFor(() => {
        expect(result.current.events).toHaveLength(3);
      });
    });
  });

  describe('reset', () => {
    it('should reset filters and sort to defaults', async () => {
      (auditService.getAuditTrail as jest.Mock).mockResolvedValue(mockResponse);

      const { result } = renderHook(
        () => useAuditTrail('delivery-1', { eventTypes: ['contract-created'] }, { field: 'timestamp', order: 'asc' }),
        { wrapper },
      );

      await waitFor(() => {
        expect(result.current.events).toHaveLength(3);
      });

      act(() => {
        result.current.reset();
      });

      await waitFor(() => {
        expect(auditService.getAuditTrail).toHaveBeenLastCalledWith(
          'delivery-1',
          {},
          { field: 'timestamp', order: 'desc' },
          undefined,
          20,
        );
      });
    });
  });

  describe('error handling', () => {
    it('should handle API errors gracefully', async () => {
      const errorResponse: AuditTrailResponse = {
        success: false,
        message: 'Failed to fetch audit trail',
      };

      (auditService.getAuditTrail as jest.Mock).mockResolvedValue(errorResponse);

      const { result } = renderHook(() => useAuditTrail('delivery-1'), { wrapper });

      await waitFor(() => {
        expect(result.current.error).not.toBeNull();
      });

      expect(result.current.error?.message).toBe('Failed to fetch audit trail');
      expect(result.current.events).toEqual([]);
    });

    it('should handle network errors', async () => {
      const networkError = new Error('Network timeout');
      (auditService.getAuditTrail as jest.Mock).mockRejectedValue(networkError);

      const { result } = renderHook(() => useAuditTrail('delivery-1'), { wrapper });

      await waitFor(() => {
        expect(result.current.error).not.toBeNull();
      });

      expect(result.current.error?.message).toContain('Network timeout');
    });
  });

  describe('with initial options', () => {
    it('should use provided initial filters', async () => {
      (auditService.getAuditTrail as jest.Mock).mockResolvedValue(mockResponse);

      const initialFilters = { eventTypes: ['contract-created'] };

      renderHook(() => useAuditTrail('delivery-1', initialFilters), { wrapper });

      await waitFor(() => {
        expect(auditService.getAuditTrail).toHaveBeenCalledWith(
          'delivery-1',
          initialFilters,
          { field: 'timestamp', order: 'desc' },
          undefined,
          20,
        );
      });
    });

    it('should use provided initial sort', async () => {
      (auditService.getAuditTrail as jest.Mock).mockResolvedValue(mockResponse);

      const initialSort = { field: 'timestamp', order: 'asc' };

      renderHook(() => useAuditTrail('delivery-1', {}, initialSort), { wrapper });

      await waitFor(() => {
        expect(auditService.getAuditTrail).toHaveBeenCalledWith(
          'delivery-1',
          {},
          initialSort,
          undefined,
          20,
        );
      });
    });

    it('should respect hook options', async () => {
      (auditService.getAuditTrail as jest.Mock).mockResolvedValue(mockResponse);

      renderHook(() => useAuditTrail('delivery-1', {}, undefined, { staleTime: 60000 }), { wrapper });

      await waitFor(() => {
        expect(result.current.events).toBeDefined();
      });
    });
  });
});
