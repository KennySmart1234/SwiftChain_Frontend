import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement, type ReactNode } from 'react';
import { useDriverEarnings } from '@/hooks/useDriverEarnings';
import { earningsService } from '@/services/earningsService';
import { useWalletStore } from '@/store/walletStore';
import {
  earningsSummaryFixture,
  payoutPageOneFixture,
  payoutPageTwoFixture,
} from './fixtures/earningsApiResponses';

jest.mock('@/services/earningsService', () => {
  const actual = jest.requireActual('@/services/earningsService');
  return {
    ...actual,
    earningsService: {
      getEarningsSummary: jest.fn(),
      getPayoutHistory: jest.fn(),
    },
  };
});

const mockGetSummary = earningsService.getEarningsSummary as jest.Mock;
const mockGetPayouts = earningsService.getPayoutHistory as jest.Mock;

const WALLET = 'GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFSHONUCEOASW7QC7OX2H';

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity },
      mutations: { retry: false },
    },
  });
  return function Wrapper({ children }: { children: ReactNode }) {
    return createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

function connectWallet() {
  act(() => {
    useWalletStore.getState().setWallet(WALLET, 0);
  });
}

describe('useDriverEarnings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    act(() => {
      useWalletStore.getState().clearWalletState();
    });
    mockGetSummary.mockResolvedValue(earningsSummaryFixture);
    mockGetPayouts.mockImplementation(({ cursor }: { cursor: string | null }) =>
      Promise.resolve(cursor === 'cursor-page-2' ? payoutPageTwoFixture : payoutPageOneFixture),
    );
  });

  it('returns the typed earnings summary fields', async () => {
    connectWallet();
    const { result } = renderHook(() => useDriverEarnings(), { wrapper: createWrapper() });

    expect(result.current.isLoading).toBe(true);
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.summary).toEqual(earningsSummaryFixture);
    expect(result.current.available).toBe(1250.5);
    expect(result.current.pending).toBe(320);
    expect(result.current.total).toBe(8940.75);
    expect(result.current.currency).toBe('XLM');
    expect(result.current.error).toBeNull();
  });

  it('loads the first payout page and exposes whether more pages exist', async () => {
    connectWallet();
    const { result } = renderHook(() => useDriverEarnings({ pageSize: 2 }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isPayoutsLoading).toBe(false));

    expect(mockGetPayouts).toHaveBeenCalledWith(
      { cursor: null, limit: 2 },
      expect.any(AbortSignal),
    );
    expect(result.current.payouts.map((p) => p.id)).toEqual(['payout-3', 'payout-2']);
    expect(result.current.hasMorePayouts).toBe(true);
  });

  it('follows the cursor when fetching more payouts', async () => {
    connectWallet();
    const { result } = renderHook(() => useDriverEarnings({ pageSize: 2 }), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.hasMorePayouts).toBe(true));

    await act(async () => {
      await result.current.fetchMorePayouts();
    });

    expect(mockGetPayouts).toHaveBeenLastCalledWith(
      { cursor: 'cursor-page-2', limit: 2 },
      expect.any(AbortSignal),
    );
    await waitFor(() =>
      expect(result.current.payouts.map((p) => p.id)).toEqual([
        'payout-3',
        'payout-2',
        'payout-1',
      ]),
    );
    expect(result.current.hasMorePayouts).toBe(false);
  });

  it('does not request another page when the last page has been reached', async () => {
    mockGetPayouts.mockResolvedValue(payoutPageTwoFixture);
    connectWallet();
    const { result } = renderHook(() => useDriverEarnings(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isPayoutsLoading).toBe(false));

    await act(async () => {
      await result.current.fetchMorePayouts();
    });

    expect(mockGetPayouts).toHaveBeenCalledTimes(1);
  });

  it('tracks summary and payout errors separately', async () => {
    mockGetSummary.mockRejectedValue(new Error('Unable to load earnings. Please try again.'));
    mockGetPayouts.mockRejectedValue(new Error('Payout history unavailable'));
    connectWallet();

    const { result } = renderHook(() => useDriverEarnings(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.error).toBe('Unable to load earnings. Please try again.');
      expect(result.current.payoutsError).toBe('Payout history unavailable');
    });
    expect(result.current.summary).toBeNull();
    expect(result.current.payouts).toEqual([]);
  });

  it('refreshEarnings refetches the summary and restarts payouts from the first page', async () => {
    connectWallet();
    const { result } = renderHook(() => useDriverEarnings({ pageSize: 2 }), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.hasMorePayouts).toBe(true));
    await act(async () => {
      await result.current.fetchMorePayouts();
    });

    const updated = { ...earningsSummaryFixture, available: 1500 };
    mockGetSummary.mockResolvedValue(updated);
    mockGetPayouts.mockClear();

    let ok = false;
    await act(async () => {
      ok = await result.current.refreshEarnings();
    });

    expect(ok).toBe(true);
    await waitFor(() => expect(result.current.available).toBe(1500));
    await waitFor(() => expect(result.current.payouts).toHaveLength(2));
    expect(mockGetPayouts).toHaveBeenCalledWith(
      { cursor: null, limit: 2 },
      expect.any(AbortSignal),
    );
  });

  it('reports a failed refresh without throwing', async () => {
    connectWallet();
    const { result } = renderHook(() => useDriverEarnings(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    mockGetSummary.mockRejectedValue(new Error('Refresh failed'));
    let ok = true;
    await act(async () => {
      ok = await result.current.refreshEarnings();
    });

    expect(ok).toBe(false);
    await waitFor(() => expect(result.current.refreshError).toBe('Refresh failed'));
    // Last good balance stays visible after a failed refresh.
    expect(result.current.available).toBe(1250.5);
  });

  describe('wallet disconnect', () => {
    it('does not call the API while no wallet is connected', () => {
      const { result } = renderHook(() => useDriverEarnings(), { wrapper: createWrapper() });

      expect(mockGetSummary).not.toHaveBeenCalled();
      expect(mockGetPayouts).not.toHaveBeenCalled();
      expect(result.current.isWalletConnected).toBe(false);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.summary).toBeNull();
      expect(result.current.error).toBeNull();
    });

    it('clears earnings when the wallet disconnects', async () => {
      connectWallet();
      const { result } = renderHook(() => useDriverEarnings(), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.summary).not.toBeNull());

      act(() => {
        useWalletStore.getState().clearWalletState();
      });

      expect(result.current.isWalletConnected).toBe(false);
      expect(result.current.summary).toBeNull();
      expect(result.current.available).toBe(0);
      expect(result.current.payouts).toEqual([]);
      expect(result.current.hasMorePayouts).toBe(false);
    });

    it('refuses to refresh without a wallet', async () => {
      const { result } = renderHook(() => useDriverEarnings(), { wrapper: createWrapper() });

      let ok = true;
      await act(async () => {
        ok = await result.current.refreshEarnings();
      });

      expect(ok).toBe(false);
      expect(mockGetSummary).not.toHaveBeenCalled();
      await waitFor(() =>
        expect(result.current.refreshError).toBe('Connect your wallet to refresh earnings.'),
      );
    });

    it('fetches fresh data for a newly connected wallet', async () => {
      connectWallet();
      const { result } = renderHook(() => useDriverEarnings(), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.summary).not.toBeNull());

      act(() => {
        useWalletStore.getState().clearWalletState();
      });
      mockGetSummary.mockClear();
      connectWallet();

      await waitFor(() => expect(result.current.summary).toEqual(earningsSummaryFixture));
      expect(mockGetSummary).toHaveBeenCalledTimes(1);
    });
  });
});
