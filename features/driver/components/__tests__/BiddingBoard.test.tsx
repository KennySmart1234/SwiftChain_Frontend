import React from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BiddingBoard } from '@/features/driver/components/BiddingBoard';
import { useBidding, EMPTY_BIDDING_FILTERS } from '@/features/driver/hooks/useBidding';
import type { OpenContract } from '@/features/driver/services/biddingService';

jest.mock('@/features/driver/hooks/useBidding');

const mockedUseBidding = useBidding as jest.MockedFunction<typeof useBidding>;

function makeContract(overrides: Partial<OpenContract> = {}): OpenContract {
  return {
    id: 'contract-1',
    pickupAddress: 'Ikeja Depot',
    dropoffAddress: 'Yaba Hub',
    packageDescription: 'Office chairs',
    estimatedDistance: 10,
    startingPrice: 30,
    region: 'Lagos',
    expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
    ...overrides,
  };
}

function baseHookReturn(overrides: Partial<ReturnType<typeof useBidding>> = {}) {
  return {
    contracts: [],
    filteredContracts: [],
    isLoading: false,
    loadError: null,
    filters: EMPTY_BIDDING_FILTERS,
    setLocation: jest.fn(),
    setMinPrice: jest.fn(),
    setMaxPrice: jest.fn(),
    resetFilters: jest.fn(),
    hasActiveFilters: false,
    availableLocations: [],
    isSubmitting: false,
    submitError: null,
    submitBid: jest.fn().mockResolvedValue({
      bidId: 'bid-1',
      contractId: 'contract-1',
      amount: 25,
      status: 'pending',
    }),
    refetch: jest.fn(),
    ...overrides,
  };
}

describe('BiddingBoard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders contract cards with details', () => {
    const contract = makeContract();
    mockedUseBidding.mockReturnValue(
      baseHookReturn({ contracts: [contract], filteredContracts: [contract] }),
    );

    render(<BiddingBoard driverId="driver-1" />);

    expect(screen.getByText('Ikeja Depot')).toBeInTheDocument();
    expect(screen.getByText('Yaba Hub')).toBeInTheDocument();
    expect(screen.getByText('Office chairs')).toBeInTheDocument();
    expect(screen.getByText('30.00 XLM')).toBeInTheDocument();
    expect(screen.getByText('10 km')).toBeInTheDocument();
  });

  it('validates the bid submission form', async () => {
    const user = userEvent.setup();
    const contract = makeContract();
    const submitBid = jest.fn();
    mockedUseBidding.mockReturnValue(
      baseHookReturn({ contracts: [contract], filteredContracts: [contract], submitBid }),
    );

    render(<BiddingBoard driverId="driver-1" />);

    await user.click(screen.getByRole('button', { name: 'Place Bid' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Bid amount is required');
    expect(submitBid).not.toHaveBeenCalled();
  });

  it('rejects a non-positive bid amount', async () => {
    const user = userEvent.setup();
    const contract = makeContract();
    const submitBid = jest.fn();
    mockedUseBidding.mockReturnValue(
      baseHookReturn({ contracts: [contract], filteredContracts: [contract], submitBid }),
    );

    render(<BiddingBoard driverId="driver-1" />);

    await user.type(screen.getByLabelText('Your bid (XLM)'), '-5');
    await user.click(screen.getByRole('button', { name: 'Place Bid' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Bid amount must be a positive number',
    );
    expect(submitBid).not.toHaveBeenCalled();
  });

  it('submits a valid bid amount', async () => {
    const user = userEvent.setup();
    const contract = makeContract();
    const submitBid = jest.fn().mockResolvedValue({
      bidId: 'bid-1',
      contractId: contract.id,
      amount: 25,
      status: 'pending',
    });
    mockedUseBidding.mockReturnValue(
      baseHookReturn({ contracts: [contract], filteredContracts: [contract], submitBid }),
    );

    render(<BiddingBoard driverId="driver-1" />);

    await user.type(screen.getByLabelText('Your bid (XLM)'), '25');
    await user.click(screen.getByRole('button', { name: 'Place Bid' }));

    await waitFor(() => {
      expect(submitBid).toHaveBeenCalledWith(contract.id, 25);
    });
  });

  it('narrows the contract list when a filter is active', () => {
    const lagos = makeContract({ id: 'c1', region: 'Lagos' });
    mockedUseBidding.mockReturnValue(
      baseHookReturn({
        contracts: [lagos],
        filteredContracts: [lagos],
        filters: { ...EMPTY_BIDDING_FILTERS, location: 'Lagos' },
        hasActiveFilters: true,
        availableLocations: ['Lagos'],
      }),
    );

    render(<BiddingBoard driverId="driver-1" />);

    expect(screen.getByTestId('bid-filter-result-count')).toHaveTextContent('1 matching contract');
    expect(screen.getByText('Ikeja Depot')).toBeInTheDocument();
  });

  it('renders and updates a live countdown timer', () => {
    jest.useFakeTimers();
    const contract = makeContract({ expiresAt: new Date(Date.now() + 65 * 1000).toISOString() });
    mockedUseBidding.mockReturnValue(
      baseHookReturn({ contracts: [contract], filteredContracts: [contract] }),
    );

    render(<BiddingBoard driverId="driver-1" />);

    expect(screen.getByTestId('contract-countdown')).toHaveTextContent('Closes in 1m 5s');

    act(() => {
      jest.advanceTimersByTime(2000);
    });

    expect(screen.getByTestId('contract-countdown')).toHaveTextContent(/Closes in 1m 3s|1m 2s/);
  });

  it('removes/grays out contracts once expired', () => {
    jest.useFakeTimers();
    const contract = makeContract({ expiresAt: new Date(Date.now() + 1000).toISOString() });
    mockedUseBidding.mockReturnValue(
      baseHookReturn({ contracts: [contract], filteredContracts: [contract] }),
    );

    render(<BiddingBoard driverId="driver-1" />);

    expect(screen.getByTestId('contract-countdown')).toHaveTextContent('Closes in');

    act(() => {
      jest.advanceTimersByTime(2000);
    });

    const card = screen.getByTestId('contract-card');
    expect(card).toHaveAttribute('data-expired', 'true');
    expect(screen.getByTestId('contract-countdown')).toHaveTextContent('Bidding closed');
    expect(screen.queryByLabelText('Your bid (XLM)')).not.toBeInTheDocument();
  });

  it('shows an empty state when there are no contracts', () => {
    mockedUseBidding.mockReturnValue(baseHookReturn({ contracts: [], filteredContracts: [] }));

    render(<BiddingBoard driverId="driver-1" />);

    expect(screen.getByTestId('bidding-board-empty')).toHaveTextContent(
      'No open contracts available right now.',
    );
  });

  it('shows a loading state while contracts are being fetched', () => {
    mockedUseBidding.mockReturnValue(baseHookReturn({ isLoading: true }));

    render(<BiddingBoard driverId="driver-1" />);

    expect(screen.getByTestId('bidding-board-loading')).toBeInTheDocument();
  });

  it('shows a load error when the contract fetch fails', () => {
    mockedUseBidding.mockReturnValue(
      baseHookReturn({ loadError: 'Failed to load open contracts' }),
    );

    render(<BiddingBoard driverId="driver-1" />);

    expect(screen.getByText('Failed to load open contracts')).toBeInTheDocument();
  });
});
