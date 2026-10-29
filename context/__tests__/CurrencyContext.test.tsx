import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  CurrencyProvider,
  useCurrency,
} from '@/context/CurrencyContext';
import { CurrencySelector } from '@/components/layout/CurrencySelector';
import { currencyService } from '@/services/currencyService';

jest.mock('@/services/currencyService', () => ({
  SUPPORTED_CURRENCIES: ['USD', 'NGN', 'EUR', 'GBP'],
  currencyService: { getRates: jest.fn() },
}));

const mockedGetRates = currencyService.getRates as jest.MockedFunction<
  typeof currencyService.getRates
>;

function Price() {
  const { formatCurrency } = useCurrency();
  return <span>{formatCurrency(2)}</span>;
}

function renderCurrency() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <CurrencyProvider>
        <CurrencySelector />
        <Price />
      </CurrencyProvider>
    </QueryClientProvider>,
  );
}

describe('CurrencyProvider', () => {
  beforeEach(() => {
    window.localStorage.clear();
    mockedGetRates.mockResolvedValue({
      rates: { USD: 0.25, NGN: 375, EUR: 0.23, GBP: 0.2 },
      updatedAt: '2026-09-29T08:00:00.000Z',
    });
  });

  it('instantly reformats prices when the header currency changes', async () => {
    const user = userEvent.setup();
    renderCurrency();

    expect(await screen.findByText('$0.50')).toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText('Display currency'), 'NGN');

    expect(screen.getByText(/750\.00/)).toBeInTheDocument();
    expect(window.localStorage.getItem('swiftchain-display-currency')).toBe(
      'NGN',
    );
    expect(mockedGetRates).toHaveBeenCalledTimes(1);
  });

  it('restores the previously selected currency', async () => {
    window.localStorage.setItem('swiftchain-display-currency', 'EUR');
    renderCurrency();

    await waitFor(() =>
      expect(screen.getByLabelText('Display currency')).toHaveValue('EUR'),
    );
    expect(await screen.findByText(/0\.46/)).toBeInTheDocument();
  });
});
