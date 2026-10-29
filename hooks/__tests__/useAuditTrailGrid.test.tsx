import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuditTrailGrid } from '@/hooks/useAuditTrailGrid';
import { auditService, type AuditEvent } from '@/services/auditService';

jest.mock('@/services/auditService', () => ({
  auditService: { getAuditEvents: jest.fn() },
}));

const mockedGetAuditEvents = auditService.getAuditEvents as jest.MockedFunction<
  typeof auditService.getAuditEvents
>;

const event = (id: string): AuditEvent => ({
  eventId: id,
  eventType: 'escrow-funded',
  description: '',
  timestamp: '2026-09-29T10:00:00Z',
  actorId: 'u1',
  actorAddress: 'GABC',
});

function wrapper({ children }: { children: React.ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe('useAuditTrailGrid', () => {
  beforeEach(() => jest.clearAllMocks());

  it('loads the first page without a cursor', async () => {
    mockedGetAuditEvents.mockResolvedValueOnce({ events: [event('e1')], nextCursor: 'c2', totalCount: 30 });

    const { result } = renderHook(() => useAuditTrailGrid(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(mockedGetAuditEvents).toHaveBeenCalledWith({ cursor: null, limit: 25 });
    expect(result.current.events).toHaveLength(1);
    expect(result.current.totalCount).toBe(30);
    expect(result.current.pageIndex).toBe(1);
    expect(result.current.hasNextPage).toBe(true);
    expect(result.current.hasPreviousPage).toBe(false);
  });

  it('follows the API cursor forward and steps back through visited pages', async () => {
    mockedGetAuditEvents
      .mockResolvedValueOnce({ events: [event('e1')], nextCursor: 'c2', totalCount: 2 })
      .mockResolvedValueOnce({ events: [event('e2')], nextCursor: null, totalCount: 2 });

    const { result } = renderHook(() => useAuditTrailGrid(), { wrapper });
    await waitFor(() => expect(result.current.events[0]?.eventId).toBe('e1'));

    act(() => result.current.nextPage());
    await waitFor(() => expect(result.current.events[0]?.eventId).toBe('e2'));
    expect(mockedGetAuditEvents).toHaveBeenLastCalledWith({ cursor: 'c2', limit: 25 });
    expect(result.current.pageIndex).toBe(2);
    expect(result.current.hasNextPage).toBe(false);

    act(() => result.current.previousPage());
    // First page is served from the query cache.
    await waitFor(() => expect(result.current.events[0]?.eventId).toBe('e1'));
    expect(result.current.pageIndex).toBe(1);
    expect(mockedGetAuditEvents).toHaveBeenCalledTimes(2);
  });

  it('resets to the first page when the page size changes', async () => {
    mockedGetAuditEvents
      .mockResolvedValueOnce({ events: [event('e1')], nextCursor: 'c2', totalCount: 60 })
      .mockResolvedValueOnce({ events: [event('e2')], nextCursor: 'c3', totalCount: 60 })
      .mockResolvedValueOnce({ events: [event('e1')], nextCursor: 'c9', totalCount: 60 });

    const { result } = renderHook(() => useAuditTrailGrid(), { wrapper });
    await waitFor(() => expect(result.current.hasNextPage).toBe(true));
    act(() => result.current.nextPage());
    await waitFor(() => expect(result.current.pageIndex).toBe(2));

    act(() => result.current.setPageSize(50));
    await waitFor(() => expect(mockedGetAuditEvents).toHaveBeenLastCalledWith({ cursor: null, limit: 50 }));
    expect(result.current.pageIndex).toBe(1);
  });

  it('surfaces API errors', async () => {
    mockedGetAuditEvents.mockRejectedValueOnce(new Error('Request failed with status code 503'));

    const { result } = renderHook(() => useAuditTrailGrid(), { wrapper });

    await waitFor(() => expect(result.current.error).toBe('Request failed with status code 503'));
    expect(result.current.events).toEqual([]);
  });

  it('tracks the selected density', async () => {
    mockedGetAuditEvents.mockResolvedValue({ events: [], nextCursor: null, totalCount: 0 });
    const { result } = renderHook(() => useAuditTrailGrid(), { wrapper });

    expect(result.current.density).toBe('regular');
    act(() => result.current.setDensity('compact'));
    expect(result.current.density).toBe('compact');
    await waitFor(() => expect(result.current.isLoading).toBe(false));
  });
});
