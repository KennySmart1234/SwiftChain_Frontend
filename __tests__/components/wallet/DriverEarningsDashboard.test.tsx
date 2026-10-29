import React from 'react';
import { act, render, renderHook, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { toast } from 'sonner';
import DriverEarningsDashboard from '@/components/wallet/DriverEarningsDashboard';
import { useDriverEarnings, type UseDriverEarningsResult } from '@/hooks/useDriverEarnings';
import { driverEarningsService } from '@/services/driverEarningsService';
import { fxService } from '@/services/fxService';
import {
  DESTINATION_ADDRESS,
  earningsSummaryResponse,
  emptyBalanceSummaryResponse,
  ngnXlmRateResponse,
  payoutHistoryResponse,
  refreshedSummaryResponse,
  withdrawalPayoutResponse,
} from '../../__mocks__/driverEarningsApiResponses';

// Component tests mock the hook; hook tests use the real implementation.
jest.mock('@/hooks/useDriverEarnings', () => {
  const actual = jest.requireActual('@/hooks/useDriverEarnings');
  return { ...actual, useDriverEarnings: jest.fn() };
});

// Hook tests mock the axios-backed service layer, keeping pure helpers real.
jest.mock('@/services/driverEarningsService', () => {
  const actual = jest.requireActual('@/services/driverEarningsService');
  return {
    ...actual,
    driverEarningsService: {
      ...actual.driverEarningsService,
      getSummary: jest.fn(),
      getPayouts: jest.fn(),
      requestWithdrawal: jest.fn(),
      subscribeToUpdates: jest.fn(),
    },
  };
});

jest.mock('@/services/fxService', () => {
  const actual = jest.requireActual('@/services/fxService');
  return { ...actual, fxService: { getNgnXlmRate: jest.fn() } };
});

jest.mock('sonner', () => ({ toast: { success: jest.fn(), error: jest.fn() } }));

const mockUseDriverEarnings = useDriverEarnings as jest.MockedFunction<typeof useDriverEarnings>;
const { useDriverEarnings: realUseDriverEarnings } = jest.requireActual<
  typeof import('@/hooks/useDriverEarnings')
>('@/hooks/useDriverEarnings');
const actualService = jest.requireActual<typeof import('@/services/driverEarningsService')>(
  '@/services/driverEarningsService',
).driverEarningsService;

const service = driverEarningsService as jest.Mocked<typeof driverEarningsService>;
const mockGetNgnXlmRate = fxService.getNgnXlmRate as jest.MockedFunction<typeof fxService.getNgnXlmRate>;

function hookResult(overrides: Partial<UseDriverEarningsResult> = {}): UseDriverEarningsResult {
  const summary = overrides.summary === undefined ? earningsSummaryResponse : overrides.summary;
  return {
    summary,
    payouts: payoutHistoryResponse,
    fiat: { available: '₦500,200.00', pendingEscrow: '₦136,000.00', lifetimeEarnings: '₦3,928,300.00' },
    isLoading: false,
    isPayoutsLoading: false,
    error: null,
    payoutsError: null,
    isWithdrawing: false,
    refresh: jest.fn().mockResolvedValue(undefined),
    validateWithdrawal: (amount, destination) =>
      actualService.validateWithdrawal(amount, summary?.availableXlm ?? 0, destination),
    withdraw: jest.fn().mockResolvedValue(true),
    ...overrides,
  };
}

function renderDashboard(overrides: Partial<UseDriverEarningsResult> = {}) {
  const result = hookResult(overrides);
  mockUseDriverEarnings.mockReturnValue(result);
  render(<DriverEarningsDashboard />);
  return result;
}

describe('DriverEarningsDashboard component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the available balance with its fiat equivalent', () => {
    renderDashboard();

    const card = screen.getByRole('region', { name: 'Available balance' });
    expect(within(card).getByText('1,250.50 XLM')).toBeInTheDocument();
    expect(within(card).getByText('≈ ₦500,200.00')).toBeInTheDocument();
  });

  it('renders pending escrow funds and the number of deliveries awaiting release', () => {
    renderDashboard();

    const card = screen.getByRole('region', { name: 'Pending escrow' });
    expect(within(card).getByText('340.00 XLM')).toBeInTheDocument();
    expect(within(card).getByText('3 deliveries awaiting release')).toBeInTheDocument();
  });

  it('uses singular wording for a single pending delivery', () => {
    renderDashboard({ summary: emptyBalanceSummaryResponse });

    expect(screen.getByText('1 delivery awaiting release')).toBeInTheDocument();
  });

  it('renders lifetime earnings and falls back when no fiat rate is available', () => {
    renderDashboard({ fiat: { available: null, pendingEscrow: null, lifetimeEarnings: null } });

    const card = screen.getByRole('region', { name: 'Lifetime earnings' });
    expect(within(card).getByText('9,820.75 XLM')).toBeInTheDocument();
    expect(within(card).getByText('Fiat rate unavailable')).toBeInTheDocument();
  });

  it('disables the withdraw button when there is no available balance', () => {
    renderDashboard({ summary: emptyBalanceSummaryResponse });

    expect(screen.getByRole('button', { name: /withdraw to stellar wallet/i })).toBeDisabled();
    expect(screen.getByText('No funds available to withdraw.')).toBeInTheDocument();
  });

  it('rejects a withdrawal larger than the available balance', async () => {
    const result = renderDashboard();

    await userEvent.click(screen.getByRole('button', { name: /withdraw to stellar wallet/i }));
    const form = screen.getByRole('form', { name: 'Withdraw to Stellar wallet' });
    await userEvent.type(within(form).getByLabelText('Amount (XLM)'), '5000');
    await userEvent.type(within(form).getByLabelText('Destination address'), DESTINATION_ADDRESS);
    await userEvent.click(within(form).getByRole('button', { name: 'Confirm withdrawal' }));

    expect(within(form).getByRole('alert')).toHaveTextContent(
      'Insufficient balance. You can withdraw up to 1,250.50 XLM.',
    );
    expect(within(form).getByRole('button', { name: 'Confirm withdrawal' })).toBeDisabled();
    expect(result.withdraw).not.toHaveBeenCalled();
  });

  it('submits a valid withdrawal using the Max amount and closes the form', async () => {
    const result = renderDashboard();

    await userEvent.click(screen.getByRole('button', { name: /withdraw to stellar wallet/i }));
    const form = screen.getByRole('form', { name: 'Withdraw to Stellar wallet' });
    await userEvent.click(within(form).getByRole('button', { name: 'Max' }));
    await userEvent.type(within(form).getByLabelText('Destination address'), DESTINATION_ADDRESS);
    await userEvent.click(within(form).getByRole('button', { name: 'Confirm withdrawal' }));

    expect(result.withdraw).toHaveBeenCalledWith({ amountXlm: 1250.5, destination: DESTINATION_ADDRESS });
    await waitFor(() =>
      expect(screen.queryByRole('form', { name: 'Withdraw to Stellar wallet' })).not.toBeInTheDocument(),
    );
  });

  it('keeps the form open when the withdrawal fails and allows cancelling', async () => {
    renderDashboard({ withdraw: jest.fn().mockResolvedValue(false) });

    await userEvent.click(screen.getByRole('button', { name: /withdraw to stellar wallet/i }));
    const form = screen.getByRole('form', { name: 'Withdraw to Stellar wallet' });
    await userEvent.type(within(form).getByLabelText('Amount (XLM)'), '100');
    await userEvent.type(within(form).getByLabelText('Destination address'), DESTINATION_ADDRESS);
    await userEvent.click(within(form).getByRole('button', { name: 'Confirm withdrawal' }));

    expect(screen.getByRole('form', { name: 'Withdraw to Stellar wallet' })).toBeInTheDocument();

    await userEvent.click(within(form).getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('form', { name: 'Withdraw to Stellar wallet' })).not.toBeInTheDocument();
  });

  it('shows a submitting state while the withdrawal is in flight', async () => {
    renderDashboard({ isWithdrawing: true });

    await userEvent.click(screen.getByRole('button', { name: /withdraw to stellar wallet/i }));
    expect(screen.getByRole('button', { name: 'Submitting...' })).toBeDisabled();
  });

  it('renders payout history with the correct status badges', () => {
    renderDashboard();

    const history = screen.getByRole('region', { name: 'Recent payouts' });
    const rows = within(history).getAllByRole('listitem');
    expect(rows).toHaveLength(4);

    const expected: Array<[string, string, string]> = [
      ['500.00 XLM', 'Completed', 'bg-green-100'],
      ['120.25 XLM', 'Processing', 'bg-blue-100'],
      ['75.00 XLM', 'Pending', 'bg-yellow-100'],
      ['60.00 XLM', 'Failed', 'bg-red-100'],
    ];
    rows.forEach((row, index) => {
      const [amount, label, colour] = expected[index];
      expect(within(row).getByText(amount)).toBeInTheDocument();
      expect(within(row).getByText(label)).toHaveClass(colour);
      expect(within(row).getByTitle(DESTINATION_ADDRESS)).toHaveTextContent('GBRPYH...C7OX2H');
    });
  });

  it('shows the empty state when no payouts exist', () => {
    renderDashboard({ payouts: [] });

    const history = screen.getByRole('region', { name: 'Recent payouts' });
    expect(within(history).getByText('No payouts yet.')).toBeInTheDocument();
    expect(within(history).queryByRole('listitem')).not.toBeInTheDocument();
  });

  it('shows payout loading and error states independently of the balance', () => {
    renderDashboard({ isPayoutsLoading: true });
    const history = screen.getByRole('region', { name: 'Recent payouts' });
    expect(history.querySelector('[aria-busy="true"]')).toBeInTheDocument();

    mockUseDriverEarnings.mockReturnValue(hookResult({ payoutsError: 'Failed to load payouts' }));
    render(<DriverEarningsDashboard />);
    expect(screen.getByText('Failed to load payouts')).toBeInTheDocument();
  });

  it('shows a loading skeleton while the balance loads', () => {
    renderDashboard({ isLoading: true, summary: null });

    expect(screen.getByLabelText('Loading earnings')).toHaveAttribute('aria-busy', 'true');
  });

  it('shows the error state and retries on request', async () => {
    const result = renderDashboard({ summary: null, error: 'Failed to load earnings' });

    expect(screen.getByRole('alert')).toHaveTextContent('Failed to load earnings');
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(result.refresh).toHaveBeenCalledTimes(1);
  });

  it('refreshes earnings from the header button', async () => {
    const result = renderDashboard();

    await userEvent.click(screen.getByRole('button', { name: 'Refresh earnings' }));
    expect(result.refresh).toHaveBeenCalledTimes(1);
  });
});

describe('useDriverEarnings hook', () => {
  let unsubscribe: jest.Mock;

  function createWrapper() {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } },
    });
    return function Wrapper({ children }: { children: React.ReactNode }) {
      return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
    };
  }

  function renderEarningsHook() {
    return renderHook(() => realUseDriverEarnings(), { wrapper: createWrapper() });
  }

  beforeEach(() => {
    jest.clearAllMocks();
    unsubscribe = jest.fn();
    service.subscribeToUpdates.mockReturnValue(unsubscribe);
    service.getSummary.mockResolvedValue(earningsSummaryResponse);
    service.getPayouts.mockResolvedValue(payoutHistoryResponse);
    mockGetNgnXlmRate.mockResolvedValue(ngnXlmRateResponse);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('loads the summary, payouts and fiat equivalents from the service layer', async () => {
    const { result } = renderEarningsHook();

    expect(result.current.isLoading).toBe(true);
    await waitFor(() => expect(result.current.summary).toEqual(earningsSummaryResponse));
    await waitFor(() => expect(result.current.payouts).toEqual(payoutHistoryResponse));
    await waitFor(() => expect(result.current.fiat.available).not.toBeNull());

    expect(result.current.fiat.available).toMatch(/500,200\.00/);
    expect(result.current.fiat.pendingEscrow).toMatch(/136,000\.00/);
    expect(result.current.fiat.lifetimeEarnings).toMatch(/3,928,300\.00/);
    expect(result.current.error).toBeNull();
  });

  it('returns null fiat values when the rate is unavailable', async () => {
    mockGetNgnXlmRate.mockRejectedValue(new Error('Rates down'));
    const { result } = renderEarningsHook();

    await waitFor(() => expect(result.current.summary).not.toBeNull());
    expect(result.current.fiat).toEqual({ available: null, pendingEscrow: null, lifetimeEarnings: null });
  });

  it('polls the balance summary and payouts on their refetch intervals', async () => {
    jest.useFakeTimers();
    const { result } = renderEarningsHook();

    await waitFor(() => expect(result.current.summary).not.toBeNull());
    expect(service.getSummary).toHaveBeenCalledTimes(1);
    expect(service.getPayouts).toHaveBeenCalledTimes(1);

    service.getSummary.mockResolvedValue(refreshedSummaryResponse);
    await act(async () => {
      jest.advanceTimersByTime(15_000);
    });
    await waitFor(() => expect(result.current.summary).toEqual(refreshedSummaryResponse));
    expect(service.getSummary).toHaveBeenCalledTimes(2);
    expect(service.getPayouts).toHaveBeenCalledTimes(1);

    await act(async () => {
      jest.advanceTimersByTime(15_000);
    });
    await waitFor(() => expect(service.getPayouts).toHaveBeenCalledTimes(2));
  });

  it('surfaces summary errors and recovers on refresh', async () => {
    service.getSummary.mockRejectedValueOnce(new Error('Earnings service unavailable'));
    const { result } = renderEarningsHook();

    await waitFor(() => expect(result.current.error).toBe('Earnings service unavailable'));
    expect(result.current.summary).toBeNull();

    await act(async () => {
      await result.current.refresh();
    });
    await waitFor(() => expect(result.current.summary).toEqual(earningsSummaryResponse));
    expect(result.current.error).toBeNull();
  });

  it('falls back to a generic message for non-Error failures', async () => {
    service.getSummary.mockRejectedValue('timeout');
    const { result } = renderEarningsHook();

    await waitFor(() => expect(result.current.error).toBe('Failed to load earnings'));
  });

  it('reports payout history errors separately', async () => {
    service.getPayouts.mockRejectedValue(new Error('Payouts unavailable'));
    const { result } = renderEarningsHook();

    await waitFor(() => expect(result.current.payoutsError).toBe('Payouts unavailable'));
    expect(result.current.payouts).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it('subscribes to real-time updates and refetches when notified', async () => {
    const { result, unmount } = renderEarningsHook();
    await waitFor(() => expect(result.current.summary).not.toBeNull());

    expect(service.subscribeToUpdates).toHaveBeenCalledTimes(1);
    const onUpdate = service.subscribeToUpdates.mock.calls[0][0];

    await act(async () => {
      onUpdate();
    });
    await waitFor(() => expect(service.getSummary).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(service.getPayouts).toHaveBeenCalledTimes(2));

    unmount();
    expect(unsubscribe).toHaveBeenCalled();
  });

  it('validates withdrawals against the fetched available balance', async () => {
    const { result } = renderEarningsHook();
    await waitFor(() => expect(result.current.summary).not.toBeNull());

    expect(result.current.validateWithdrawal(100, DESTINATION_ADDRESS)).toEqual({ isValid: true, error: null });
    expect(result.current.validateWithdrawal(2000, DESTINATION_ADDRESS).isValid).toBe(false);
    expect(result.current.validateWithdrawal(100, 'not-an-address').isValid).toBe(false);
  });

  it('submits a valid withdrawal and refreshes balances', async () => {
    service.requestWithdrawal.mockResolvedValue(withdrawalPayoutResponse);
    const { result } = renderEarningsHook();
    await waitFor(() => expect(result.current.summary).not.toBeNull());

    let ok: boolean | undefined;
    await act(async () => {
      ok = await result.current.withdraw({ amountXlm: 200, destination: DESTINATION_ADDRESS });
    });

    expect(ok).toBe(true);
    expect(service.requestWithdrawal).toHaveBeenCalledWith({ amountXlm: 200, destination: DESTINATION_ADDRESS });
    expect(toast.success).toHaveBeenCalledWith('Withdrawal submitted to the Stellar network');
    await waitFor(() => expect(service.getSummary).toHaveBeenCalledTimes(2));
  });

  it('blocks an invalid withdrawal before calling the API', async () => {
    const { result } = renderEarningsHook();
    await waitFor(() => expect(result.current.summary).not.toBeNull());

    let ok: boolean | undefined;
    await act(async () => {
      ok = await result.current.withdraw({ amountXlm: 99_999, destination: DESTINATION_ADDRESS });
    });

    expect(ok).toBe(false);
    expect(service.requestWithdrawal).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledWith('Insufficient balance. You can withdraw up to 1,250.50 XLM.');
  });

  it('returns false and reports the error when the withdrawal request fails', async () => {
    service.requestWithdrawal.mockRejectedValue(new Error('Horizon rejected the transaction'));
    const { result } = renderEarningsHook();
    await waitFor(() => expect(result.current.summary).not.toBeNull());

    let ok: boolean | undefined;
    await act(async () => {
      ok = await result.current.withdraw({ amountXlm: 200, destination: DESTINATION_ADDRESS });
    });

    expect(ok).toBe(false);
    expect(toast.error).toHaveBeenCalledWith('Horizon rejected the transaction');
    expect(result.current.isWithdrawing).toBe(false);
  });

  it('uses a default toast message when the withdrawal error has no message', async () => {
    service.requestWithdrawal.mockRejectedValue(new Error(''));
    const { result } = renderEarningsHook();
    await waitFor(() => expect(result.current.summary).not.toBeNull());

    await act(async () => {
      await result.current.withdraw({ amountXlm: 200, destination: DESTINATION_ADDRESS });
    });

    expect(toast.error).toHaveBeenCalledWith('Withdrawal failed');
  });
});
