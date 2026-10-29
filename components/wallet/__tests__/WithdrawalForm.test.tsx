import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { toast } from 'sonner';
import { WithdrawalForm } from '@/components/wallet/WithdrawalForm';
import { withdrawalService } from '@/services/withdrawalService';
import {
  MISTYPED_DESTINATION,
  VALID_DESTINATION,
  publicQuoteFixture,
  testnetQuoteFixture,
  withdrawalReceiptFixture,
} from '@/hooks/__tests__/fixtures/withdrawalApiResponses';

// Only the network boundary is mocked; useStellarWithdrawal, React Hook Form
// and Zod run for real so these tests exercise Component -> Hook -> Service.
jest.mock('@/services/withdrawalService', () => ({
  withdrawalService: { getQuote: jest.fn(), submitWithdrawal: jest.fn() },
}));

jest.mock('sonner', () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}));

const mockGetQuote = withdrawalService.getQuote as jest.Mock;
const mockSubmit = withdrawalService.submitWithdrawal as jest.Mock;

function renderForm(onSuccess?: jest.Mock) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity },
      mutations: { retry: false },
    },
  });
  const user = userEvent.setup();
  render(
    <QueryClientProvider client={queryClient}>
      <WithdrawalForm onSuccess={onSuccess} />
    </QueryClientProvider>,
  );
  return user;
}

const destinationInput = () => screen.getByLabelText('Destination address');
const amountInput = () => screen.getByLabelText(/^Amount/);

async function waitForQuote() {
  await screen.findByText('1,250.50 XLM');
}

describe('WithdrawalForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetQuote.mockImplementation((network: string) =>
      Promise.resolve(network === 'public' ? publicQuoteFixture : testnetQuoteFixture),
    );
    mockSubmit.mockResolvedValue(withdrawalReceiptFixture);
  });

  it('shows a skeleton while the quote loads, then the available balance and fiat value', async () => {
    renderForm();

    expect(screen.getByTestId('withdrawal-quote-skeleton')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Review withdrawal' })).toBeDisabled();

    await waitForQuote();
    expect(screen.getByText('(≈ 150.06 USD)')).toBeInTheDocument();
    expect(screen.queryByTestId('withdrawal-quote-skeleton')).not.toBeInTheDocument();
  });

  describe('Stellar address validation', () => {
    it('rejects an invalid address with an inline error', async () => {
      const user = renderForm();
      await waitForQuote();

      await user.type(destinationInput(), MISTYPED_DESTINATION);
      await user.tab();

      expect(
        await screen.findByText('Enter a valid Stellar public key (starts with G)'),
      ).toBeInTheDocument();
      expect(destinationInput()).toHaveAttribute('aria-invalid', 'true');
      expect(destinationInput()).toHaveAttribute('aria-describedby', 'withdrawal-destination-error');
    });

    it('clears the error once the address is corrected', async () => {
      const user = renderForm();
      await waitForQuote();

      await user.type(destinationInput(), MISTYPED_DESTINATION);
      await user.tab();
      await screen.findByText('Enter a valid Stellar public key (starts with G)');

      await user.clear(destinationInput());
      await user.type(destinationInput(), VALID_DESTINATION);

      await waitFor(() =>
        expect(
          screen.queryByText('Enter a valid Stellar public key (starts with G)'),
        ).not.toBeInTheDocument(),
      );
      expect(destinationInput()).toHaveAttribute('aria-invalid', 'false');
    });
  });

  describe('fees and fiat conversion', () => {
    it('shows the network fee estimate with its fiat value', async () => {
      renderForm();
      await waitForQuote();

      expect(screen.getByText('Estimated network fee')).toBeInTheDocument();
      expect(screen.getByText(/^0\.50 XLM/)).toBeInTheDocument();
    });

    it('updates the fee estimate when the network changes', async () => {
      const user = renderForm();
      await waitForQuote();

      await user.selectOptions(screen.getByLabelText('Network'), 'public');

      expect(await screen.findByText(/^0\.00001 XLM/)).toBeInTheDocument();
      expect(mockGetQuote).toHaveBeenLastCalledWith('public', expect.any(AbortSignal));
    });

    it('shows the fiat equivalent and total debit for the entered amount', async () => {
      const user = renderForm();
      await waitForQuote();

      await user.type(amountInput(), '100');

      expect(screen.getByText('≈ 12.00 USD')).toBeInTheDocument();
      expect(screen.getByText('100.50 XLM')).toBeInTheDocument();
    });
  });

  describe('amount limits', () => {
    it('fills the balance minus fees from the Max button', async () => {
      const user = renderForm();
      await waitForQuote();

      await user.click(screen.getByRole('button', { name: 'Use maximum amount' }));

      expect(amountInput()).toHaveValue('1250');
    });

    it('prevents withdrawals below the minimum threshold', async () => {
      const user = renderForm();
      await waitForQuote();

      await user.type(destinationInput(), VALID_DESTINATION);
      await user.type(amountInput(), '5');
      await user.click(screen.getByRole('button', { name: 'Review withdrawal' }));

      expect(await screen.findByText('Minimum withdrawal is 10.00 XLM')).toBeInTheDocument();
      expect(screen.queryByRole('heading', { name: 'Confirm withdrawal' })).not.toBeInTheDocument();
    });

    it('prevents withdrawing more than the balance after fees', async () => {
      const user = renderForm();
      await waitForQuote();

      await user.type(destinationInput(), VALID_DESTINATION);
      await user.type(amountInput(), '1250.5');
      await user.click(screen.getByRole('button', { name: 'Review withdrawal' }));

      expect(
        await screen.findByText('Amount exceeds your available balance after fees (max 1,250.00 XLM)'),
      ).toBeInTheDocument();
    });
  });

  describe('confirmation and submission', () => {
    async function reviewValidWithdrawal(user: ReturnType<typeof userEvent.setup>) {
      await waitForQuote();
      await user.type(destinationInput(), VALID_DESTINATION);
      await user.type(amountInput(), '100');
      await user.click(screen.getByRole('button', { name: 'Review withdrawal' }));
      return screen.findByRole('heading', { name: 'Confirm withdrawal' });
    }

    it('summarises amount, fee, total and fiat conversion before submitting', async () => {
      const user = renderForm();
      const heading = await reviewValidWithdrawal(user);
      const summary = within(heading.closest('section') as HTMLElement);

      expect(summary.getByText(VALID_DESTINATION)).toBeInTheDocument();
      expect(summary.getByText('Stellar Testnet')).toBeInTheDocument();
      expect(summary.getByText('100.00 XLM')).toBeInTheDocument();
      expect(summary.getByText('0.50 XLM')).toBeInTheDocument();
      expect(summary.getByText('100.50 XLM')).toBeInTheDocument();
      expect(summary.getByText('≈ 12.00 USD')).toBeInTheDocument();
      expect(summary.getByText('Rate: 1 XLM = 0.12 USD')).toBeInTheDocument();
      expect(mockSubmit).not.toHaveBeenCalled();
    });

    it('returns to the form with values kept when going back', async () => {
      const user = renderForm();
      await reviewValidWithdrawal(user);

      await user.click(screen.getByRole('button', { name: 'Back' }));

      expect(destinationInput()).toHaveValue(VALID_DESTINATION);
      expect(amountInput()).toHaveValue('100');
    });

    it('submits on confirmation and shows a success toast', async () => {
      const onSuccess = jest.fn();
      const user = renderForm(onSuccess);
      await reviewValidWithdrawal(user);

      await user.click(screen.getByRole('button', { name: 'Confirm withdrawal' }));

      await waitFor(() =>
        expect(toast.success).toHaveBeenCalledWith('Withdrawal submitted', {
          description: '100.00 XLM is on its way to your Stellar wallet.',
        }),
      );
      expect(mockSubmit).toHaveBeenCalledWith({
        quoteId: 'quote-testnet-1',
        network: 'testnet',
        destination: VALID_DESTINATION,
        amount: 100,
      });
      expect(onSuccess).toHaveBeenCalledWith(withdrawalReceiptFixture);
      expect(await screen.findByRole('heading', { name: 'Withdraw funds' })).toBeInTheDocument();
      expect(destinationInput()).toHaveValue('');
    });

    it('shows an error toast and returns to the form when submission fails', async () => {
      mockSubmit.mockRejectedValue(new Error('Quote expired, please review the new fee'));
      const user = renderForm();
      await reviewValidWithdrawal(user);

      await user.click(screen.getByRole('button', { name: 'Confirm withdrawal' }));

      await waitFor(() =>
        expect(toast.error).toHaveBeenCalledWith('Quote expired, please review the new fee'),
      );
      expect(await screen.findByRole('heading', { name: 'Withdraw funds' })).toBeInTheDocument();
      expect(toast.success).not.toHaveBeenCalled();
    });
  });

  it('shows a quote error with a retry option', async () => {
    mockGetQuote.mockRejectedValueOnce(new Error('Unable to estimate withdrawal fees.'));
    const user = renderForm();

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Unable to estimate withdrawal fees.');
    expect(screen.getByRole('button', { name: 'Review withdrawal' })).toBeDisabled();

    await user.click(within(alert).getByRole('button', { name: /retry/i }));

    await waitForQuote();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
