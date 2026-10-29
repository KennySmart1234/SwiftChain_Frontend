import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LoadMatchingBoard } from '@/components/driver/LoadMatchingBoard';
import { loadMatchingService } from '@/services/loadMatchingService';
import { useToast } from '@/hooks/useToast';

jest.mock('@/services/loadMatchingService', () => ({
  loadMatchingService: {
    getContracts: jest.fn(),
    getBids: jest.fn(),
    submitBid: jest.fn(),
  },
}));

jest.mock('@/hooks/useToast', () => ({
  useToast: jest.fn(),
}));

const mockedLoadMatchingService = loadMatchingService as jest.Mocked<typeof loadMatchingService>;

const CONTRACTS = [
  {
    id: 'contract-1',
    cargoType: 'refrigerated' as const,
    route: 'Accra to Kumasi',
    region: 'Ashanti',
    timeline: '2 days',
    baseRate: 500,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'contract-2',
    cargoType: 'general' as const,
    route: 'Lagos to Ibadan',
    region: 'Oyo',
    timeline: '1 day',
    baseRate: 200,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
];

const renderWithClient = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <LoadMatchingBoard />
    </QueryClientProvider>
  );
};

describe('LoadMatchingBoard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useToast as jest.Mock).mockReturnValue({ success: jest.fn(), error: jest.fn() });
    mockedLoadMatchingService.getBids.mockResolvedValue([]);
  });

  it('shows a loading state before contracts arrive', () => {
    mockedLoadMatchingService.getContracts.mockReturnValue(new Promise(() => {}));
    renderWithClient();
    expect(screen.getByText('Loading available contracts...')).toBeInTheDocument();
  });

  it('renders contract cards with all required details', async () => {
    mockedLoadMatchingService.getContracts.mockResolvedValue(CONTRACTS);
    renderWithClient();

    await waitFor(() => expect(screen.getByText('Accra to Kumasi')).toBeInTheDocument());
    expect(screen.getByText('Ashanti')).toBeInTheDocument();
    expect(screen.getByText('2 days')).toBeInTheDocument();
    expect(screen.getByText('500 XLM')).toBeInTheDocument();
    expect(screen.getAllByText('Refrigerated').length).toBeGreaterThan(0);
  });

  it('shows an empty state when no contracts match', async () => {
    mockedLoadMatchingService.getContracts.mockResolvedValue([]);
    renderWithClient();

    await waitFor(() =>
      expect(screen.getByText('No contracts match the current filters.')).toBeInTheDocument()
    );
  });

  it('shows an error message when fetching contracts fails', async () => {
    mockedLoadMatchingService.getContracts.mockRejectedValue(new Error('Network error'));
    renderWithClient();

    await waitFor(() => expect(screen.getByText('Network error')).toBeInTheDocument());
  });

  it('validates the bid amount before submitting', async () => {
    mockedLoadMatchingService.getContracts.mockResolvedValue(CONTRACTS);
    renderWithClient();

    await waitFor(() => expect(screen.getByText('Accra to Kumasi')).toBeInTheDocument());

    const [submitButton] = screen.getAllByRole('button', { name: 'Submit Bid' });
    fireEvent.click(submitButton);

    expect(
      screen.getByText('Enter a valid bid amount greater than 0')
    ).toBeInTheDocument();
    expect(mockedLoadMatchingService.submitBid).not.toHaveBeenCalled();
  });

  it('requires a proposed timeline before submitting', async () => {
    mockedLoadMatchingService.getContracts.mockResolvedValue(CONTRACTS);
    renderWithClient();
    await waitFor(() => expect(screen.getByText('Accra to Kumasi')).toBeInTheDocument());

    const [amountInput] = screen.getAllByPlaceholderText(/Base rate/);
    await userEvent.type(amountInput, '550');

    const [submitButton] = screen.getAllByRole('button', { name: 'Submit Bid' });
    fireEvent.click(submitButton);

    expect(screen.getByText('Enter a proposed timeline')).toBeInTheDocument();
    expect(mockedLoadMatchingService.submitBid).not.toHaveBeenCalled();
  });

  it('submits a valid custom bid', async () => {
    mockedLoadMatchingService.getContracts.mockResolvedValue(CONTRACTS);
    mockedLoadMatchingService.submitBid.mockResolvedValue({
      id: 'bid-1',
      contractId: 'contract-1',
      bidAmount: 550,
      proposedTimeline: '2 days',
      status: 'submitted',
      createdAt: '2026-01-01T00:00:00.000Z',
    });
    renderWithClient();
    await waitFor(() => expect(screen.getByText('Accra to Kumasi')).toBeInTheDocument());

    const [amountInput] = screen.getAllByPlaceholderText(/Base rate/);
    const [timelineInput] = screen.getAllByPlaceholderText(/Proposed timeline/);
    await userEvent.type(amountInput, '550');
    await userEvent.type(timelineInput, '2 days');

    const [submitButton] = screen.getAllByRole('button', { name: 'Submit Bid' });
    fireEvent.click(submitButton);

    await waitFor(() =>
      expect(mockedLoadMatchingService.submitBid).toHaveBeenCalledWith({
        contractId: 'contract-1',
        bidAmount: 550,
        proposedTimeline: '2 days',
      })
    );
  });

  it('shows the bid status badge instead of the form once a bid exists', async () => {
    mockedLoadMatchingService.getContracts.mockResolvedValue(CONTRACTS);
    mockedLoadMatchingService.getBids.mockResolvedValue([
      {
        id: 'bid-1',
        contractId: 'contract-1',
        bidAmount: 550,
        proposedTimeline: '2 days',
        status: 'accepted',
        createdAt: '2026-01-01T00:00:00.000Z',
      },
    ]);
    renderWithClient();

    await waitFor(() => expect(screen.getByText('accepted')).toBeInTheDocument());
    // The contract with an existing bid no longer shows its own bid form.
    expect(screen.getAllByRole('button', { name: 'Submit Bid' })).toHaveLength(1);
  });

  it('narrows contracts by region and rate range filters', async () => {
    mockedLoadMatchingService.getContracts.mockResolvedValue(CONTRACTS);
    renderWithClient();
    await waitFor(() => expect(screen.getByText('Accra to Kumasi')).toBeInTheDocument());

    mockedLoadMatchingService.getContracts.mockClear();
    mockedLoadMatchingService.getContracts.mockResolvedValue([CONTRACTS[0]]);

    fireEvent.change(screen.getByLabelText('Filter by region'), {
      target: { value: 'Ashanti' },
    });
    await waitFor(() => expect(screen.getByText('Accra to Kumasi')).toBeInTheDocument());

    fireEvent.change(screen.getByLabelText('Minimum rate'), { target: { value: '100' } });
    fireEvent.change(screen.getByLabelText('Maximum rate'), { target: { value: '1000' } });

    await waitFor(() =>
      expect(mockedLoadMatchingService.getContracts).toHaveBeenCalledWith(
        expect.objectContaining({ region: 'Ashanti', minRate: 100, maxRate: 1000 }),
        expect.anything()
      )
    );

    fireEvent.change(screen.getByLabelText('Minimum rate'), { target: { value: '' } });
    await waitFor(() =>
      expect(mockedLoadMatchingService.getContracts).toHaveBeenCalledWith(
        expect.objectContaining({ minRate: undefined }),
        expect.anything()
      )
    );
  });

  it('narrows contracts by cargo type filter', async () => {
    mockedLoadMatchingService.getContracts.mockResolvedValue(CONTRACTS);
    renderWithClient();
    await waitFor(() => expect(screen.getByText('Accra to Kumasi')).toBeInTheDocument());

    mockedLoadMatchingService.getContracts.mockClear();
    mockedLoadMatchingService.getContracts.mockResolvedValue([CONTRACTS[0]]);

    fireEvent.change(screen.getByLabelText('Filter by cargo type'), {
      target: { value: 'refrigerated' },
    });

    await waitFor(() =>
      expect(mockedLoadMatchingService.getContracts).toHaveBeenCalledWith(
        expect.objectContaining({ cargoType: 'refrigerated' }),
        expect.anything()
      )
    );
  });
});
