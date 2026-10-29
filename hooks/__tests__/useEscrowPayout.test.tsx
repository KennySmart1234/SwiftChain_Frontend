import type { ReactNode } from 'react';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEscrowPayout } from '@/hooks/useEscrowPayout';
import { escrowService } from '@/services/escrowService';
import { escrowPayoutService } from '@/services/escrowPayoutService';

jest.mock('@/services/escrowService', () => ({
  escrowService: {
    getEscrowDetails: jest.fn(),
    releaseFunds: jest.fn(),
  },
}));

jest.mock('@/services/escrowPayoutService', () => ({
  escrowPayoutService: {
    getPayoutFeeQuote: jest.fn(),
  },
}));

jest.mock('@/hooks/useToast', () => ({
  useToast: () => ({ toast: jest.fn() }),
}));

const mockGetEscrowDetails = escrowService.getEscrowDetails as jest.Mock;
const mockGetPayoutFeeQuote = escrowPayoutService.getPayoutFeeQuote as jest.Mock;

const QUOTE = {
  escrowAmount: 1000,
  currency: 'XLM',
  platformFeePercent: 2.5,
  estimatedGasFee: 0.5,
};

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return { queryClient, Wrapper };
}

describe('useEscrowPayout fee breakdown', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetEscrowDetails.mockResolvedValue({
      currentSignatures: 2,
      requiredSignatures: 2,
      isReleased: false,
      signers: ['GA', 'GB'],
    });
  });

  it('derives the net payout from the backend fee quote', async () => {
    mockGetPayoutFeeQuote.mockResolvedValue(QUOTE);
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useEscrowPayout('C123'), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.feeBreakdown).not.toBeNull());
    expect(mockGetPayoutFeeQuote).toHaveBeenCalledWith('C123');
    expect(result.current.feeBreakdown).toMatchObject({
      platformFee: 25,
      estimatedGasFee: 0.5,
      netPayout: 974.5,
    });
    expect(result.current.feeBreakdownError).toBeNull();
    expect(result.current.canRelease).toBe(true);
  });

  it('recomputes the net payout when the escrow amount changes', async () => {
    mockGetPayoutFeeQuote.mockResolvedValue(QUOTE);
    const { Wrapper, queryClient } = createWrapper();
    const { result } = renderHook(() => useEscrowPayout('C123'), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.feeBreakdown?.netPayout).toBe(974.5));

    mockGetPayoutFeeQuote.mockResolvedValue({ ...QUOTE, escrowAmount: 2000 });
    await act(async () => {
      await queryClient.invalidateQueries({ queryKey: ['escrowPayoutFeeQuote', 'C123'] });
    });

    await waitFor(() => expect(result.current.feeBreakdown?.netPayout).toBe(1949.5));
  });

  it('reports a fee quote failure without blocking the payout state', async () => {
    mockGetPayoutFeeQuote.mockRejectedValue(new Error('Quote unavailable'));
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useEscrowPayout('C123'), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.feeBreakdownError).toBe('Quote unavailable'));
    expect(result.current.feeBreakdown).toBeNull();
    expect(result.current.error).toBeNull();
    expect(result.current.currentSignatures).toBe(2);
  });

  it('refreshes the fee quote after funds are released', async () => {
    mockGetPayoutFeeQuote.mockResolvedValue(QUOTE);
    (escrowService.releaseFunds as jest.Mock).mockResolvedValue({
      success: true,
      transactionHash: 'abcdef1234567890',
    });
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useEscrowPayout('C123'), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.feeBreakdown).not.toBeNull());
    expect(mockGetPayoutFeeQuote).toHaveBeenCalledTimes(1);

    act(() => {
      result.current.releaseFunds();
    });

    await waitFor(() => expect(mockGetPayoutFeeQuote).toHaveBeenCalledTimes(2));
  });

  it('does not request a fee quote without an escrow id', () => {
    const { Wrapper } = createWrapper();

    renderHook(() => useEscrowPayout(''), { wrapper: Wrapper });

    expect(mockGetPayoutFeeQuote).not.toHaveBeenCalled();
  });
});
