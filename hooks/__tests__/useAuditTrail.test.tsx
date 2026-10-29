import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement, type ReactNode } from 'react';
import { toast } from 'sonner';
import { sortAuditEvents, useAuditTrail } from '@/hooks/useAuditTrail';
import { auditTrailService } from '@/services/auditTrailService';
import { auditTrailEventsFixture } from './fixtures/auditTrailApiResponses';

jest.mock('@/services/auditTrailService', () => ({
  auditTrailService: { getDeliveryEvents: jest.fn() },
}));

jest.mock('sonner', () => ({
  toast: { error: jest.fn(), success: jest.fn() },
}));

const mockGetEvents = auditTrailService.getDeliveryEvents as jest.Mock;
const writeText = jest.fn();

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
  });
  return function Wrapper({ children }: { children: ReactNode }) {
    return createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

const ids = (events: { eventId: string }[]) => events.map((e) => e.eventId);

describe('useAuditTrail', () => {
  beforeAll(() => {
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    });
  });

  beforeEach(() => {
    jest.clearAllMocks();
    writeText.mockResolvedValue(undefined);
    mockGetEvents.mockResolvedValue(auditTrailEventsFixture);
  });

  it('fetches events for the delivery and tracks loading', async () => {
    const { result } = renderHook(() => useAuditTrail('del-42'), { wrapper: createWrapper() });

    expect(result.current.isLoading).toBe(true);
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(mockGetEvents).toHaveBeenCalledWith('del-42', expect.any(AbortSignal));
  });

  it('orders events newest first by default', async () => {
    const { result } = renderHook(() => useAuditTrail('del-42'), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.events).toHaveLength(3));
    expect(result.current.sortOrder).toBe('newest');
    expect(ids(result.current.events)).toEqual(['evt-0003', 'evt-0002', 'evt-0001']);
  });

  it('toggles to oldest first', async () => {
    const { result } = renderHook(() => useAuditTrail('del-42'), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.events).toHaveLength(3));

    act(() => result.current.toggleSortOrder());

    expect(result.current.sortOrder).toBe('oldest');
    expect(ids(result.current.events)).toEqual(['evt-0001', 'evt-0002', 'evt-0003']);
  });

  it('does not fetch without a delivery id', () => {
    const { result } = renderHook(() => useAuditTrail(null), { wrapper: createWrapper() });

    expect(mockGetEvents).not.toHaveBeenCalled();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.events).toEqual([]);
  });

  it('exposes errors and recovers on retry', async () => {
    mockGetEvents.mockRejectedValueOnce(new Error('Indexer unavailable'));
    const { result } = renderHook(() => useAuditTrail('del-42'), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.error).toBe('Indexer unavailable'));

    act(() => result.current.retry());

    await waitFor(() => expect(result.current.events).toHaveLength(3));
    expect(result.current.error).toBeNull();
  });

  describe('copyEventId', () => {
    it('writes the event id to the clipboard and marks it copied', async () => {
      const { result } = renderHook(() => useAuditTrail('del-42'), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.copyEventId('evt-0002');
      });

      expect(writeText).toHaveBeenCalledWith('evt-0002');
      expect(result.current.copiedEventId).toBe('evt-0002');
    });

    it('clears the copied marker after a delay', async () => {
      jest.useFakeTimers();
      try {
        const { result } = renderHook(() => useAuditTrail(null), { wrapper: createWrapper() });

        await act(async () => {
          await result.current.copyEventId('evt-0002');
        });
        expect(result.current.copiedEventId).toBe('evt-0002');

        act(() => {
          jest.advanceTimersByTime(2000);
        });
        expect(result.current.copiedEventId).toBeNull();
      } finally {
        jest.useRealTimers();
      }
    });

    it('shows an error toast when the clipboard is unavailable', async () => {
      writeText.mockRejectedValue(new Error('Permission denied'));
      const { result } = renderHook(() => useAuditTrail('del-42'), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.copyEventId('evt-0002');
      });

      expect(toast.error).toHaveBeenCalledWith('Could not copy the event ID');
      expect(result.current.copiedEventId).toBeNull();
    });
  });
});

describe('sortAuditEvents', () => {
  it('keeps events with invalid timestamps last in both orders', () => {
    const broken = { ...auditTrailEventsFixture[0], eventId: 'evt-bad', timestamp: 'not-a-date' };
    const events = [broken, ...auditTrailEventsFixture];

    expect(ids(sortAuditEvents(events, 'newest')).at(-1)).toBe('evt-bad');
    expect(ids(sortAuditEvents(events, 'oldest')).at(-1)).toBe('evt-bad');
  });

  it('does not mutate the input', () => {
    const input = [...auditTrailEventsFixture];
    sortAuditEvents(input, 'newest');
    expect(input).toEqual(auditTrailEventsFixture);
  });
});
