import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DriverEarningsDashboard from '@/components/wallet/DriverEarningsDashboard';
import { useDriverEarnings } from '@/hooks/useDriverEarnings';
import { driverEarningsService } from '@/services/driverEarningsService';

jest.mock('@/hooks/useDriverEarnings');
jest.mock('@/lib/api', () => ({ __esModule: true, default: {} }));
jest.mock('@/lib/websocket', () => ({ socketService: { socket: null } }));

const mockedUseDriverEarnings = useDriverEarnings as jest.MockedFunction<typeof useDriverEarnings>;
const VALID_ADDRESS = `G${'B'.repeat(55)}`;

function setup(overrides: Partial<ReturnType<typeof useDriverEarnings>> = {}) {
  const withdraw = jest.fn().mockResolvedValue(true);
  const summary = {
    availableXlm: 150,
    pendingEscrowXlm: 45.5,
    lifetimeEarningsXlm: 2300,
    pendingEscrowCount: 3,
    updatedAt: '2026-09-29T10:00:00Z',
  };
  mockedUseDriverEarnings.mockReturnValue({
    summary,
    payouts: [
      {
        id: 'p1',
        amountXlm: 75,
        destination: VALID_ADDRESS,
        status: 'completed',
        txHash: 'abc',
        createdAt: '2026-09-28T09:00:00Z',
      },
      { id: 'p2', amountXlm: 20, destination: VALID_ADDRESS, status: 'failed', createdAt: '2026-09-27T09:00:00Z' },
    ],
    fiat: { available: 'NGN 180,000.00', pendingEscrow: 'NGN 54,600.00', lifetimeEarnings: 'NGN 2,760,000.00' },
    isLoading: false,
    isPayoutsLoading: false,
    error: null,
    payoutsError: null,
    isWithdrawing: false,
    refresh: jest.fn().mockResolvedValue(undefined),
    validateWithdrawal: (amount, destination) =>
      driverEarningsService.validateWithdrawal(amount, summary.availableXlm, destination),
    withdraw,
    ...overrides,
  });
  return { withdraw };
}

describe('DriverEarningsDashboard', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders balances with fiat equivalents and payout statuses', () => {
    setup();
    render(<DriverEarningsDashboard />);

    expect(screen.getByText('150.00 XLM')).toBeInTheDocument();
    expect(screen.getByText(/NGN 180,000\.00/)).toBeInTheDocument();
    expect(screen.getByText('45.50 XLM')).toBeInTheDocument();
    expect(screen.getByText('3 deliveries awaiting release')).toBeInTheDocument();
    expect(screen.getByText('2,300.00 XLM')).toBeInTheDocument();
    expect(screen.getByText('Completed')).toBeInTheDocument();
    expect(screen.getByText('Failed')).toBeInTheDocument();
  });

  it('blocks a withdrawal above the available balance', async () => {
    const { withdraw } = setup();
    const user = userEvent.setup();
    render(<DriverEarningsDashboard />);

    await user.click(screen.getByRole('button', { name: /withdraw to stellar wallet/i }));
    await user.type(screen.getByLabelText(/amount/i), '200');
    await user.type(screen.getByLabelText(/destination address/i), VALID_ADDRESS);
    await user.click(screen.getByRole('button', { name: /confirm withdrawal/i }));

    expect(screen.getByRole('alert')).toHaveTextContent(/insufficient balance/i);
    expect(withdraw).not.toHaveBeenCalled();
  });

  it('submits a valid withdrawal', async () => {
    const { withdraw } = setup();
    const user = userEvent.setup();
    render(<DriverEarningsDashboard />);

    await user.click(screen.getByRole('button', { name: /withdraw to stellar wallet/i }));
    await user.click(screen.getByRole('button', { name: 'Max' }));
    await user.type(screen.getByLabelText(/destination address/i), VALID_ADDRESS);
    await user.click(screen.getByRole('button', { name: /confirm withdrawal/i }));

    expect(withdraw).toHaveBeenCalledWith({ amountXlm: 150, destination: VALID_ADDRESS });
  });

  it('disables the withdraw button when nothing is available', () => {
    setup({
      summary: {
        availableXlm: 0,
        pendingEscrowXlm: 10,
        lifetimeEarningsXlm: 10,
        pendingEscrowCount: 1,
        updatedAt: '2026-09-29T10:00:00Z',
      },
    });
    render(<DriverEarningsDashboard />);

    expect(screen.getByRole('button', { name: /withdraw to stellar wallet/i })).toBeDisabled();
    expect(screen.getByText('1 delivery awaiting release')).toBeInTheDocument();
  });

  it('shows an error state with retry', async () => {
    const refresh = jest.fn().mockResolvedValue(undefined);
    setup({ summary: null, error: 'Request failed with status code 500', refresh });
    const user = userEvent.setup();
    render(<DriverEarningsDashboard />);

    expect(screen.getByRole('alert')).toHaveTextContent('Request failed with status code 500');
    await user.click(screen.getByRole('button', { name: /try again/i }));
    expect(refresh).toHaveBeenCalled();
  });
});
