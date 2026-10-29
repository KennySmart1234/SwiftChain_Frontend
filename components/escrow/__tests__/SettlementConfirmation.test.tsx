import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SettlementConfirmation } from '../SettlementConfirmation';
import {
  useSettlementBreakdown,
  type UseSettlementBreakdownReturn,
} from '@/hooks/useSettlementBreakdown';
import { settlementBreakdown } from './fixtures/settlementApiResponses';

jest.mock('@/hooks/useSettlementBreakdown');

const mockedUseSettlementBreakdown = useSettlementBreakdown as jest.MockedFunction<
  typeof useSettlementBreakdown
>;

const ESCROW_ID = 'CESCROW123';

function mockHook(overrides: Partial<UseSettlementBreakdownReturn> = {}) {
  const state: UseSettlementBreakdownReturn = {
    settlement: settlementBreakdown,
    isLoading: false,
    error: null,
    refetch: jest.fn(),
    ...overrides,
  };
  mockedUseSettlementBreakdown.mockReturnValue(state);
  return state;
}

describe('SettlementConfirmation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('requests the settlement for the given escrow', () => {
    mockHook();

    render(<SettlementConfirmation escrowId={ESCROW_ID} />);

    expect(mockedUseSettlementBreakdown).toHaveBeenCalledWith(ESCROW_ID);
  });

  describe('loading state', () => {
    it('renders the loading skeleton', () => {
      mockHook({ isLoading: true, settlement: null });

      render(<SettlementConfirmation escrowId={ESCROW_ID} />);

      const skeleton = screen.getByLabelText('Loading settlement details');
      expect(skeleton).toHaveAttribute('aria-busy', 'true');
    });

    it('does not render the breakdown, error or empty state while loading', () => {
      mockHook({ isLoading: true, settlement: null });

      render(<SettlementConfirmation escrowId={ESCROW_ID} />);

      expect(screen.queryByText('Settlement Complete')).not.toBeInTheDocument();
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
      expect(screen.queryByText('No settlement yet')).not.toBeInTheDocument();
    });
  });

  describe('success state', () => {
    it('renders the fund breakdown with formatted amounts', () => {
      mockHook();

      render(<SettlementConfirmation escrowId={ESCROW_ID} />);

      expect(screen.getByRole('heading', { name: 'Settlement Complete' })).toBeInTheDocument();
      const breakdown = screen.getByLabelText('Fund breakdown');
      expect(within(breakdown).getByText('1,250.00 XLM')).toBeInTheDocument();
      expect(within(breakdown).getByText('Platform fee (2.5%)')).toBeInTheDocument();
      expect(within(breakdown).getByText('31.25 XLM')).toBeInTheDocument();
      expect(within(breakdown).getByText('0.00001 XLM')).toBeInTheDocument();
      expect(within(breakdown).getByText('1,218.75 XLM')).toBeInTheDocument();
    });

    it('renders the delivery summary', () => {
      mockHook();

      render(<SettlementConfirmation escrowId={ESCROW_ID} />);

      expect(screen.getByText('SC-2026-000889')).toBeInTheDocument();
      expect(screen.getByText('Lagos → Abuja')).toBeInTheDocument();
    });

    it('hides the held amount row when nothing is held', () => {
      mockHook();

      render(<SettlementConfirmation escrowId={ESCROW_ID} />);

      expect(screen.queryByText('Held pending review')).not.toBeInTheDocument();
    });

    it('shows the held amount when part of the escrow is still held', () => {
      mockHook({ settlement: { ...settlementBreakdown, heldAmount: 100 } });

      render(<SettlementConfirmation escrowId={ESCROW_ID} />);

      expect(screen.getByText('Held pending review')).toBeInTheDocument();
      expect(screen.getByText('100.00 XLM')).toBeInTheDocument();
    });
  });

  describe('transaction hash link', () => {
    it('links to the Stellar explorer in a new tab', () => {
      mockHook();

      render(<SettlementConfirmation escrowId={ESCROW_ID} />);

      const link = screen.getByRole('link', { name: 'View transaction on Stellar explorer' });
      expect(link).toHaveAttribute('href', settlementBreakdown.explorerUrl);
      expect(link).toHaveAttribute('target', '_blank');
      expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'));
      expect(link).toHaveAttribute('rel', expect.stringContaining('noreferrer'));
    });

    it('shows a truncated hash as the link text', () => {
      mockHook();

      render(<SettlementConfirmation escrowId={ESCROW_ID} />);

      expect(screen.getByRole('link')).toHaveTextContent('a1b2c3d4...e9f0a1b2');
    });

    it('shows a pending notice instead of a link when there is no hash yet', () => {
      mockHook({
        settlement: { ...settlementBreakdown, transactionHash: undefined, explorerUrl: undefined },
      });

      render(<SettlementConfirmation escrowId={ESCROW_ID} />);

      expect(screen.queryByRole('link')).not.toBeInTheDocument();
      expect(screen.getByText('Transaction confirmation pending')).toBeInTheDocument();
    });
  });

  describe('error state', () => {
    it('displays the error message with a retry button', () => {
      mockHook({ settlement: null, error: 'Request failed with status code 500' });

      render(<SettlementConfirmation escrowId={ESCROW_ID} />);

      const alert = screen.getByRole('alert');
      expect(alert).toHaveTextContent('Unable to load settlement details');
      expect(alert).toHaveTextContent('Request failed with status code 500');
      expect(within(alert).getByRole('button', { name: 'Retry' })).toBeInTheDocument();
    });

    it('refetches the settlement when retry is clicked', async () => {
      const user = userEvent.setup();
      const { refetch } = mockHook({ settlement: null, error: 'Network Error' });

      render(<SettlementConfirmation escrowId={ESCROW_ID} />);
      await user.click(screen.getByRole('button', { name: 'Retry' }));

      expect(refetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('empty state', () => {
    it('renders a fallback when there is no settlement data', () => {
      mockHook({ settlement: null });

      render(<SettlementConfirmation escrowId={ESCROW_ID} />);

      expect(screen.getByText('No settlement yet')).toBeInTheDocument();
      expect(
        screen.getByText('Settlement details will appear here once the escrow funds are released.'),
      ).toBeInTheDocument();
      expect(screen.queryByText('Settlement Complete')).not.toBeInTheDocument();
      expect(screen.queryByRole('link')).not.toBeInTheDocument();
    });
  });
});
