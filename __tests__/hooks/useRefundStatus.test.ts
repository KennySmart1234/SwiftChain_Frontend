import { renderHook, waitFor, act } from '@testing-library/react';
import { useRefundStatus } from '@/hooks/useRefundStatus';
import { refundService } from '@/services/refundService';
import type { RefundStatusResponse } from '@/types/refund';

// Mock the refund service
jest.mock('@/services/refundService');

const mockRefundService = refundService as jest.Mocked<typeof refundService>;

// Mock refund status response
const mockRefundStatusResponse: RefundStatusResponse = {
  shipmentId: 'shipment-123',
  status: 'processing',
  amount: 5000,
  currency: 'USD',
  cancellationReason: 'Customer requested cancellation',
  expectedCompletionTime: '2 hours',
  timeline: [
    {
      id: 'event-1',
      status: 'pending',
      timestamp: '2024-01-01T10:00:00Z',
      description: 'Refund initiated',
    },
    {
      id: 'event-2',
      status: 'processing',
      timestamp: '2024-01-01T10:05:00Z',
      description: 'Processing refund',
    },
  ],
  createdAt: '2024-01-01T10:00:00Z',
  updatedAt: '2024-01-01T10:05:00Z',
};

const mockCompletedRefundResponse: RefundStatusResponse = {
  ...mockRefundStatusResponse,
  status: 'completed',
  timeline: [
    ...mockRefundStatusResponse.timeline,
    {
      id: 'event-3',
      status: 'completed',
      timestamp: '2024-01-01T12:05:00Z',
      description: 'Refund completed',
    },
  ],
};

const mockFailedRefundResponse: RefundStatusResponse = {
  ...mockRefundStatusResponse,
  status: 'failed',
  failureReason: 'Bank account not found',
  timeline: [
    ...mockRefundStatusResponse.timeline,
    {
      id: 'event-3',
      status: 'failed',
      timestamp: '2024-01-01T10:10:00Z',
      description: 'Refund failed',
    },
  ],
};

describe('useRefundStatus', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Initial fetch', () => {
    test('should fetch refund status on mount', async () => {
      mockRefundService.getRefundStatus.mockResolvedValueOnce(
        mockRefundStatusResponse
      );

      const { result } = renderHook(() => useRefundStatus('shipment-123'));

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.refundStatus).toEqual(mockRefundStatusResponse);
      expect(result.current.status).toBe('processing');
      expect(mockRefundService.getRefundStatus).toHaveBeenCalledWith('shipment-123');
    });

    test('should handle null shipmentId gracefully', () => {
      const { result } = renderHook(() => useRefundStatus(null));

      expect(result.current.refundStatus).toBeNull();
      expect(result.current.isLoading).toBe(false);
      expect(mockRefundService.getRefundStatus).not.toHaveBeenCalled();
    });

    test('should handle fetch error', async () => {
      const testError = new Error('Network error');
      mockRefundService.getRefundStatus.mockRejectedValueOnce(testError);

      const { result } = renderHook(() => useRefundStatus('shipment-123'));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isError).toBe(true);
      expect(result.current.error).toContain('Network error');
      expect(result.current.refundStatus).toBeNull();
    });
  });

  describe('Polling behavior', () => {
    test('should start polling when status is processing', async () => {
      mockRefundService.getRefundStatus.mockResolvedValueOnce(
        mockRefundStatusResponse
      );

      const { result } = renderHook(() =>
        useRefundStatus('shipment-123', { pollInterval: 1000 })
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isPolling).toBe(true);

      // Fast-forward time by poll interval
      act(() => {
        jest.advanceTimersByTime(1000);
      });

      await waitFor(() => {
        expect(mockRefundService.getRefundStatus).toHaveBeenCalledTimes(2); // Initial + one poll
      });
    });

    test('should stop polling when status is completed', async () => {
      mockRefundService.getRefundStatus.mockResolvedValueOnce(
        mockCompletedRefundResponse
      );

      const { result } = renderHook(() =>
        useRefundStatus('shipment-123', { pollInterval: 1000 })
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isPolling).toBe(false);
      expect(result.current.status).toBe('completed');

      // Advance time and verify no additional fetch
      const initialCallCount = mockRefundService.getRefundStatus.mock.calls
        .length;
      act(() => {
        jest.advanceTimersByTime(1000);
      });

      expect(mockRefundService.getRefundStatus).toHaveBeenCalledTimes(
        initialCallCount
      );
    });

    test('should stop polling when status is failed', async () => {
      mockRefundService.getRefundStatus.mockResolvedValueOnce(
        mockFailedRefundResponse
      );

      const { result } = renderHook(() =>
        useRefundStatus('shipment-123', { pollInterval: 1000 })
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isPolling).toBe(false);
      expect(result.current.status).toBe('failed');
    });

    test('should use custom poll interval', async () => {
      mockRefundService.getRefundStatus.mockResolvedValueOnce(
        mockRefundStatusResponse
      );

      const customInterval = 5000;
      renderHook(() =>
        useRefundStatus('shipment-123', { pollInterval: customInterval })
      );

      await waitFor(() => {
        expect(mockRefundService.getRefundStatus).toHaveBeenCalledTimes(1);
      });

      // Advance by custom interval and verify polling
      act(() => {
        jest.advanceTimersByTime(customInterval);
      });

      await waitFor(() => {
        expect(mockRefundService.getRefundStatus).toHaveBeenCalledTimes(2);
      });
    });

    test('should not poll if autoStart is false', async () => {
      mockRefundService.getRefundStatus.mockResolvedValueOnce(
        mockRefundStatusResponse
      );

      const { result } = renderHook(() =>
        useRefundStatus('shipment-123', {
          pollInterval: 1000,
          autoStart: false,
        })
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isPolling).toBe(false);

      act(() => {
        jest.advanceTimersByTime(1000);
      });

      expect(mockRefundService.getRefundStatus).toHaveBeenCalledTimes(1);
    });
  });

  describe('Manual refetch', () => {
    test('should manually refetch refund status', async () => {
      mockRefundService.getRefundStatus.mockResolvedValueOnce(
        mockRefundStatusResponse
      );

      const { result } = renderHook(() => useRefundStatus('shipment-123'));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Change response for next fetch
      mockRefundService.getRefundStatus.mockResolvedValueOnce(
        mockCompletedRefundResponse
      );

      act(() => {
        result.current.refetch();
      });

      await waitFor(() => {
        expect(result.current.status).toBe('completed');
      });

      expect(mockRefundService.getRefundStatus).toHaveBeenCalledTimes(2);
    });

    test('should reset error on refetch', async () => {
      const testError = new Error('Initial error');
      mockRefundService.getRefundStatus.mockRejectedValueOnce(testError);

      const { result } = renderHook(() => useRefundStatus('shipment-123'));

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toContain('Initial error');

      mockRefundService.getRefundStatus.mockResolvedValueOnce(
        mockRefundStatusResponse
      );

      act(() => {
        result.current.refetch();
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(false);
        expect(result.current.error).toBeNull();
        expect(result.current.refundStatus).toEqual(mockRefundStatusResponse);
      });
    });

    test('should stop polling on refetch', async () => {
      mockRefundService.getRefundStatus.mockResolvedValueOnce(
        mockRefundStatusResponse
      );

      const { result } = renderHook(() =>
        useRefundStatus('shipment-123', { pollInterval: 1000 })
      );

      await waitFor(() => {
        expect(result.current.isPolling).toBe(true);
      });

      mockRefundService.getRefundStatus.mockResolvedValueOnce(
        mockCompletedRefundResponse
      );

      act(() => {
        result.current.refetch();
      });

      await waitFor(() => {
        expect(result.current.isPolling).toBe(false);
      });
    });
  });

  describe('Retry logic', () => {
    test('should retry failed refund', async () => {
      mockRefundService.getRefundStatus.mockResolvedValueOnce(
        mockFailedRefundResponse
      );

      const { result } = renderHook(() => useRefundStatus('shipment-123'));

      await waitFor(() => {
        expect(result.current.status).toBe('failed');
      });

      mockRefundService.retryRefund.mockResolvedValueOnce(
        mockRefundStatusResponse // Now processing again
      );

      act(() => {
        result.current.retry();
      });

      await waitFor(() => {
        expect(result.current.status).toBe('processing');
      });

      expect(mockRefundService.retryRefund).toHaveBeenCalledWith('shipment-123');
    });

    test('should resume polling after successful retry', async () => {
      mockRefundService.getRefundStatus.mockResolvedValueOnce(
        mockFailedRefundResponse
      );

      const { result } = renderHook(() =>
        useRefundStatus('shipment-123', { pollInterval: 1000 })
      );

      await waitFor(() => {
        expect(result.current.status).toBe('failed');
      });

      expect(result.current.isPolling).toBe(false);

      mockRefundService.retryRefund.mockResolvedValueOnce(
        mockRefundStatusResponse
      );

      act(() => {
        result.current.retry();
      });

      await waitFor(() => {
        expect(result.current.isPolling).toBe(true);
      });
    });

    test('should handle retry error', async () => {
      mockRefundService.getRefundStatus.mockResolvedValueOnce(
        mockFailedRefundResponse
      );

      const { result } = renderHook(() => useRefundStatus('shipment-123'));

      await waitFor(() => {
        expect(result.current.status).toBe('failed');
      });

      const retryError = new Error('Retry failed');
      mockRefundService.retryRefund.mockRejectedValueOnce(retryError);

      act(() => {
        result.current.retry();
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
        expect(result.current.error).toContain('Retry failed');
      });
    });

    test('should only retry if status is failed', async () => {
      mockRefundService.getRefundStatus.mockResolvedValueOnce(
        mockRefundStatusResponse
      );

      const { result } = renderHook(() => useRefundStatus('shipment-123'));

      await waitFor(() => {
        expect(result.current.status).toBe('processing');
      });

      act(() => {
        result.current.retry();
      });

      // Retry should not be called for non-failed status
      expect(mockRefundService.retryRefund).not.toHaveBeenCalled();
    });
  });

  describe('Polling control', () => {
    test('should stop polling manually', async () => {
      mockRefundService.getRefundStatus.mockResolvedValueOnce(
        mockRefundStatusResponse
      );

      const { result } = renderHook(() =>
        useRefundStatus('shipment-123', { pollInterval: 1000 })
      );

      await waitFor(() => {
        expect(result.current.isPolling).toBe(true);
      });

      act(() => {
        result.current.stopPolling();
      });

      expect(result.current.isPolling).toBe(false);

      const initialCallCount = mockRefundService.getRefundStatus.mock.calls
        .length;
      act(() => {
        jest.advanceTimersByTime(1000);
      });

      expect(mockRefundService.getRefundStatus).toHaveBeenCalledTimes(
        initialCallCount
      );
    });

    test('should start polling manually', async () => {
      mockRefundService.getRefundStatus.mockResolvedValueOnce(
        mockRefundStatusResponse
      );

      const { result } = renderHook(() =>
        useRefundStatus('shipment-123', {
          pollInterval: 1000,
          autoStart: false,
        })
      );

      await waitFor(() => {
        expect(result.current.isPolling).toBe(false);
      });

      act(() => {
        result.current.startPolling();
      });

      expect(result.current.isPolling).toBe(true);

      act(() => {
        jest.advanceTimersByTime(1000);
      });

      await waitFor(() => {
        expect(mockRefundService.getRefundStatus).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('Lifecycle and cleanup', () => {
    test('should clean up on unmount', async () => {
      mockRefundService.getRefundStatus.mockResolvedValueOnce(
        mockRefundStatusResponse
      );

      const { result, unmount } = renderHook(() =>
        useRefundStatus('shipment-123', { pollInterval: 1000 })
      );

      await waitFor(() => {
        expect(result.current.isPolling).toBe(true);
      });

      unmount();

      // Verify no errors and intervals are cleared
      const initialCallCount = mockRefundService.getRefundStatus.mock.calls
        .length;
      act(() => {
        jest.advanceTimersByTime(1000);
      });

      expect(mockRefundService.getRefundStatus).toHaveBeenCalledTimes(
        initialCallCount
      );
    });

    test('should handle shipmentId change', async () => {
      mockRefundService.getRefundStatus.mockResolvedValueOnce(
        mockRefundStatusResponse
      );

      const { rerender } = renderHook(
        ({ shipmentId }) => useRefundStatus(shipmentId),
        {
          initialProps: { shipmentId: 'shipment-123' },
        }
      );

      await waitFor(() => {
        expect(mockRefundService.getRefundStatus).toHaveBeenCalledWith(
          'shipment-123'
        );
      });

      mockRefundService.getRefundStatus.mockResolvedValueOnce(
        mockRefundStatusResponse
      );

      rerender({ shipmentId: 'shipment-456' });

      await waitFor(() => {
        expect(mockRefundService.getRefundStatus).toHaveBeenCalledWith(
          'shipment-456'
        );
      });
    });
  });

  describe('State consistency', () => {
    test('should expose all required state properties', async () => {
      mockRefundService.getRefundStatus.mockResolvedValueOnce(
        mockRefundStatusResponse
      );

      const { result } = renderHook(() => useRefundStatus('shipment-123'));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current).toHaveProperty('refundStatus');
      expect(result.current).toHaveProperty('isLoading');
      expect(result.current).toHaveProperty('isError');
      expect(result.current).toHaveProperty('error');
      expect(result.current).toHaveProperty('status');
      expect(result.current).toHaveProperty('isPolling');
      expect(result.current).toHaveProperty('refetch');
      expect(result.current).toHaveProperty('retry');
      expect(result.current).toHaveProperty('stopPolling');
      expect(result.current).toHaveProperty('startPolling');
    });

    test('should maintain correct status value throughout lifecycle', async () => {
      mockRefundService.getRefundStatus.mockResolvedValueOnce(
        mockRefundStatusResponse
      );

      const { result } = renderHook(() => useRefundStatus('shipment-123'));

      // Check initial state
      expect(result.current.status).toBeNull();

      // After first fetch
      await waitFor(() => {
        expect(result.current.status).toBe('processing');
      });

      // Mock transition to completed
      mockRefundService.getRefundStatus.mockResolvedValueOnce(
        mockCompletedRefundResponse
      );

      act(() => {
        result.current.refetch();
      });

      await waitFor(() => {
        expect(result.current.status).toBe('completed');
      });
    });
  });
});
