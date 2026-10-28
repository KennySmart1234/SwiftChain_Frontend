import { ReactNode } from 'react';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAdminRefunds } from '@/hooks/useAdminRefunds';
import { adminRefundService, type RefundRecord } from '@/services/adminRefundService';
import { exportDataService } from '@/services/exportDataService';

jest.mock('@/services/adminRefundService');
jest.mock('@/services/exportDataService', () => ({
  exportDataService: { exportToCsv: jest.fn() },
}));

const svc = adminRefundService as jest.Mocked<typeof adminRefundService>;

const refund = (id: string): RefundRecord => ({
  id,
  shipmentId: `S-${id}`,
  customerId: 'C-1',
  amount: 5,
  currency: 'XLM',
  status: 'pending',
  reason: 'late',
  createdAt: '2026-03-01T00:00:00Z',
  updatedAt: '2026-03-01T00:00:00Z',
});

let client: QueryClient;
const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={client}>{children}</QueryClientProvider>
);

describe('useAdminRefunds', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  });

  it('returns typed refunds with pagination metadata', async () => {
    svc.getRefunds.mockResolvedValue({
      refunds: [refund('1'), refund('2')],
      pagination: { nextCursor: 'c2', total: 4, limit: 2 },
    });
    const { result } = renderHook(() => useAdminRefunds(), { wrapper });
    await waitFor(() => expect(result.current.refunds).toHaveLength(2));
    expect(result.current.pagination).toEqual({ nextCursor: 'c2', total: 4, limit: 2 });
    expect(result.current.hasNextPage).toBe(true);
  });

  it('passes filters and the cursor to the service', async () => {
    svc.getRefunds
      .mockResolvedValueOnce({
        refunds: [refund('1')],
        pagination: { nextCursor: 'c2', total: 2, limit: 1 },
      })
      .mockResolvedValueOnce({
        refunds: [refund('2')],
        pagination: { nextCursor: null, total: 2, limit: 1 },
      });
    const filters = { status: 'pending' as const, search: 'abc' };
    const { result } = renderHook(() => useAdminRefunds(filters), { wrapper });
    await waitFor(() => expect(result.current.refunds).toHaveLength(1));
    expect(svc.getRefunds).toHaveBeenCalledWith(expect.objectContaining(filters), null);

    await act(async () => {
      await result.current.fetchNextPage();
    });
    expect(svc.getRefunds).toHaveBeenLastCalledWith(expect.objectContaining(filters), 'c2');
    await waitFor(() => expect(result.current.refunds.map((r) => r.id)).toEqual(['1', '2']));
    expect(result.current.hasNextPage).toBe(false);
  });

  it('exposes the error message when loading fails', async () => {
    svc.getRefunds.mockRejectedValue(new Error('boom'));
    const { result } = renderHook(() => useAdminRefunds(), { wrapper });
    await waitFor(() => expect(result.current.error).toBe('boom'));
    expect(result.current.refunds).toEqual([]);
  });

  it('returns success and error counts from bulkMarkReviewed and refetches', async () => {
    svc.getRefunds.mockResolvedValue({
      refunds: [refund('1')],
      pagination: { nextCursor: null, total: 1, limit: 20 },
    });
    svc.bulkMarkReviewed.mockResolvedValue({ successCount: 2, errorCount: 1 });
    const { result } = renderHook(() => useAdminRefunds(), { wrapper });
    await waitFor(() => expect(result.current.refunds).toHaveLength(1));

    let counts;
    await act(async () => {
      counts = await result.current.bulkMarkReviewed(['1', '2', '3']);
    });
    expect(counts).toEqual({ successCount: 2, errorCount: 1 });
    expect(svc.bulkMarkReviewed).toHaveBeenCalledWith(['1', '2', '3']);
    await waitFor(() => expect(svc.getRefunds).toHaveBeenCalledTimes(2));
  });

  it('exports only selected refunds to CSV', async () => {
    svc.getRefunds.mockResolvedValue({
      refunds: [refund('1'), refund('2')],
      pagination: { nextCursor: null, total: 2, limit: 20 },
    });
    const { result } = renderHook(() => useAdminRefunds(), { wrapper });
    await waitFor(() => expect(result.current.refunds).toHaveLength(2));

    let count = 0;
    act(() => {
      count = result.current.exportSelectedToCsv(['2']);
    });
    expect(count).toBe(1);
    const rows = (exportDataService.exportToCsv as jest.Mock).mock.calls[0][0];
    expect(rows).toHaveLength(1);
    expect(rows[0].id).toBe('2');
  });

  it('does not export when nothing matches the selection', async () => {
    svc.getRefunds.mockResolvedValue({
      refunds: [refund('1')],
      pagination: { nextCursor: null, total: 1, limit: 20 },
    });
    const { result } = renderHook(() => useAdminRefunds(), { wrapper });
    await waitFor(() => expect(result.current.refunds).toHaveLength(1));
    expect(result.current.exportSelectedToCsv(['nope'])).toBe(0);
    expect(exportDataService.exportToCsv).not.toHaveBeenCalled();
  });
});
