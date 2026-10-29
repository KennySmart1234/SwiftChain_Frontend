import type { ReactNode } from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useSettlementBreakdown } from '@/hooks/useSettlementBreakdown';
import { settlementConfirmationService } from '@/services/settlementConfirmationService';
import { settlementBreakdown } from '@/components/escrow/__tests__/fixtures/settlementApiResponses';

jest.mock('@/services/settlementConfirmationService', () => ({
  settlementConfirmationService: { getSettlementBreakdown: jest.fn() },
}));

const mockGetSettlementBreakdown =
  settlementConfirmationService.getSettlementBreakdown as jest.Mock;

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

describe('useSettlementBreakdown', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns the settlement from the service', async () => {
    mockGetSettlementBreakdown.mockResolvedValue(settlementBreakdown);

    const { result } = renderHook(() => useSettlementBreakdown('CESCROW123'), { wrapper });

    expect(result.current.isLoading).toBe(true);
    await waitFor(() => expect(result.current.settlement).toEqual(settlementBreakdown));
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(mockGetSettlementBreakdown).toHaveBeenCalledWith('CESCROW123');
  });

  it('exposes the error message and refetches on demand', async () => {
    mockGetSettlementBreakdown.mockRejectedValueOnce(new Error('Network Error'));

    const { result } = renderHook(() => useSettlementBreakdown('CESCROW123'), { wrapper });

    await waitFor(() => expect(result.current.error).toBe('Network Error'));
    expect(result.current.settlement).toBeNull();

    mockGetSettlementBreakdown.mockResolvedValueOnce(settlementBreakdown);
    act(() => {
      result.current.refetch();
    });

    await waitFor(() => expect(result.current.settlement).toEqual(settlementBreakdown));
    expect(mockGetSettlementBreakdown).toHaveBeenCalledTimes(2);
  });

  it('does not query without an escrow id', () => {
    const { result } = renderHook(() => useSettlementBreakdown(''), { wrapper });

    expect(mockGetSettlementBreakdown).not.toHaveBeenCalled();
    expect(result.current.settlement).toBeNull();
  });
});
