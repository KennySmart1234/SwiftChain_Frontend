import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement, type ReactNode } from 'react';
import { toast } from 'sonner';
import {
  createWithdrawalSchema,
  formatAmountInput,
  getMaxWithdrawable,
  resolveDefaultNetwork,
  useStellarWithdrawal,
} from '@/hooks/useStellarWithdrawal';
import { withdrawalService } from '@/services/withdrawalService';
import {
  MISTYPED_DESTINATION,
  VALID_DESTINATION,
  publicQuoteFixture,
  testnetQuoteFixture,
  withdrawalReceiptFixture,
} from './fixtures/withdrawalApiResponses';

jest.mock('@/services/withdrawalService', () => ({
  withdrawalService: { getQuote: jest.fn(), submitWithdrawal: jest.fn() },
}));

jest.mock('sonner', () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}));

const mockGetQuote = withdrawalService.getQuote as jest.Mock;
const mockSubmit = withdrawalService.submitWithdrawal as jest.Mock;

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

const firstError = (result: { success: boolean; error?: { issues: { message: string }[] } }) =>
  result.success ? null : result.error?.issues[0]?.message;

describe('createWithdrawalSchema', () => {
  const schema = createWithdrawalSchema(testnetQuoteFixture);
  const base = { network: 'testnet' as const, destination: VALID_DESTINATION, amount: '100' };

  it('accepts a valid withdrawal', () => {
    expect(schema.safeParse(base).success).toBe(true);
  });

  it('rejects an address with a bad checksum', () => {
    expect(firstError(schema.safeParse({ ...base, destination: MISTYPED_DESTINATION }))).toBe(
      'Enter a valid Stellar public key (starts with G)',
    );
  });

  it('rejects an empty address', () => {
    expect(firstError(schema.safeParse({ ...base, destination: '' }))).toBe(
      'Enter a destination address',
    );
  });

  it.each(['abc', '1e3', '-5', '1.12345678'])('rejects the malformed amount %s', (amount) => {
    expect(firstError(schema.safeParse({ ...base, amount }))).toBe(
      'Enter a valid amount with up to 7 decimal places',
    );
  });

  it('rejects zero', () => {
    expect(firstError(schema.safeParse({ ...base, amount: '0' }))).toBe(
      'Enter an amount greater than 0',
    );
  });

  it('rejects amounts below the minimum threshold', () => {
    expect(firstError(schema.safeParse({ ...base, amount: '9.9999999' }))).toBe(
      'Minimum withdrawal is 10.00 XLM',
    );
    expect(schema.safeParse({ ...base, amount: '10' }).success).toBe(true);
  });

  it('rejects amounts above the balance after fees', () => {
    expect(schema.safeParse({ ...base, amount: '1250' }).success).toBe(true);
    expect(firstError(schema.safeParse({ ...base, amount: '1250.0000001' }))).toBe(
      'Amount exceeds your available balance after fees (max 1,250.00 XLM)',
    );
  });

  it('explains when the balance cannot cover the fee', () => {
    const empty = createWithdrawalSchema({
      ...testnetQuoteFixture,
      availableBalance: 0.4,
      minimumWithdrawal: 0,
    });
    expect(firstError(empty.safeParse({ ...base, amount: '0.1' }))).toBe(
      'Your available balance does not cover the network fee',
    );
  });

  it('only checks format rules until a quote is loaded', () => {
    expect(createWithdrawalSchema(null).safeParse({ ...base, amount: '5' }).success).toBe(true);
  });
});

describe('withdrawal amount helpers', () => {
  it('computes the maximum in stroops to avoid floating point drift', () => {
    expect(getMaxWithdrawable(publicQuoteFixture)).toBe(1250.49999);
    expect(getMaxWithdrawable({ ...publicQuoteFixture, availableBalance: 0.3, networkFee: 0.1 })).toBe(0.2);
    expect(getMaxWithdrawable({ ...testnetQuoteFixture, availableBalance: 0.1 })).toBe(0);
  });

  it('formats input amounts without trailing zeros', () => {
    expect(formatAmountInput(1250)).toBe('1250');
    expect(formatAmountInput(1250.49999)).toBe('1250.49999');
    expect(formatAmountInput(0.0000001)).toBe('0.0000001');
  });

  it.each([
    ['public', 'public'],
    ['mainnet', 'public'],
    ['PUBLIC', 'public'],
    ['testnet', 'testnet'],
    [undefined, 'testnet'],
  ])('maps the env value %s to %s', (value, expected) => {
    expect(resolveDefaultNetwork(value)).toBe(expected);
  });
});

describe('useStellarWithdrawal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetQuote.mockImplementation((network: string) =>
      Promise.resolve(network === 'public' ? publicQuoteFixture : testnetQuoteFixture),
    );
    mockSubmit.mockResolvedValue(withdrawalReceiptFixture);
  });

  async function renderLoaded(options?: Parameters<typeof useStellarWithdrawal>[0]) {
    const hook = renderHook(
      () => {
        const withdrawal = useStellarWithdrawal(options);
        // formState is a proxy: read errors during render to subscribe, as a form would.
        void withdrawal.form.formState.errors;
        return withdrawal;
      },
      { wrapper: createWrapper() },
    );
    await waitFor(() => expect(hook.result.current.quote).not.toBeNull());
    return hook;
  }

  function fill(
    result: { current: ReturnType<typeof useStellarWithdrawal> },
    values: { destination?: string; amount?: string },
  ) {
    act(() => {
      if (values.destination !== undefined) {
        result.current.form.setValue('destination', values.destination);
      }
      if (values.amount !== undefined) result.current.form.setValue('amount', values.amount);
    });
  }

  it('loads the fee quote for the default network', async () => {
    const { result } = await renderLoaded();

    expect(result.current.network).toBe('testnet');
    expect(mockGetQuote).toHaveBeenCalledWith('testnet', expect.any(AbortSignal));
    expect(result.current.quote).toEqual(testnetQuoteFixture);
    expect(result.current.maxWithdrawable).toBe(1250);
  });

  it('re-quotes the fee when the network changes', async () => {
    const { result } = await renderLoaded();

    act(() => result.current.setNetwork('public'));

    await waitFor(() => expect(result.current.quote?.networkFee).toBe(0.00001));
    expect(mockGetQuote).toHaveBeenLastCalledWith('public', expect.any(AbortSignal));
    expect(result.current.maxWithdrawable).toBe(1250.49999);
    expect(result.current.form.getValues('network')).toBe('public');
  });

  it('derives the fiat equivalent and total debit from the quote', async () => {
    const { result } = await renderLoaded();

    fill(result, { amount: '100' });

    expect(result.current.fiatEquivalent).toBeCloseTo(12);
    expect(result.current.totalDebit).toBe(100.5);
  });

  it('fills the max amount as balance minus fees', async () => {
    const { result } = await renderLoaded();

    act(() => result.current.fillMax());

    expect(result.current.form.getValues('amount')).toBe('1250');
  });

  it('moves to confirmation with the reviewed values and quote', async () => {
    const { result } = await renderLoaded();
    fill(result, { destination: VALID_DESTINATION, amount: '100' });

    await act(async () => {
      await result.current.review();
    });

    expect(result.current.step).toBe('confirm');
    expect(result.current.pending).toEqual({
      network: 'testnet',
      destination: VALID_DESTINATION,
      amount: 100,
      quote: testnetQuoteFixture,
      totalDebit: 100.5,
      fiatEquivalent: 12,
    });
  });

  it('stays on the form when validation fails', async () => {
    const { result } = await renderLoaded();
    fill(result, { destination: MISTYPED_DESTINATION, amount: '5' });

    await act(async () => {
      await result.current.review();
    });

    expect(result.current.step).toBe('form');
    expect(result.current.form.formState.errors.destination?.message).toBe(
      'Enter a valid Stellar public key (starts with G)',
    );
    expect(result.current.form.formState.errors.amount?.message).toBe(
      'Minimum withdrawal is 10.00 XLM',
    );
  });

  it('submits the confirmed withdrawal, shows a success toast and resets', async () => {
    const onSuccess = jest.fn();
    const { result } = await renderLoaded({ onSuccess });
    fill(result, { destination: VALID_DESTINATION, amount: '100' });
    await act(async () => {
      await result.current.review();
    });

    let ok = false;
    await act(async () => {
      ok = await result.current.confirmWithdrawal();
    });

    expect(ok).toBe(true);
    expect(mockSubmit).toHaveBeenCalledWith({
      quoteId: 'quote-testnet-1',
      network: 'testnet',
      destination: VALID_DESTINATION,
      amount: 100,
    });
    expect(toast.success).toHaveBeenCalledWith('Withdrawal submitted', {
      description: '100.00 XLM is on its way to your Stellar wallet.',
    });
    expect(onSuccess).toHaveBeenCalledWith(withdrawalReceiptFixture);
    expect(result.current.step).toBe('form');
    expect(result.current.form.getValues()).toEqual({
      network: 'testnet',
      destination: '',
      amount: '',
    });
  });

  it('returns to the form with a fresh quote when submission fails', async () => {
    mockSubmit.mockRejectedValue(new Error('Quote expired, please review the new fee'));
    const { result } = await renderLoaded();
    fill(result, { destination: VALID_DESTINATION, amount: '100' });
    await act(async () => {
      await result.current.review();
    });
    mockGetQuote.mockClear();

    let ok = true;
    await act(async () => {
      ok = await result.current.confirmWithdrawal();
    });

    expect(ok).toBe(false);
    expect(toast.error).toHaveBeenCalledWith('Quote expired, please review the new fee');
    expect(result.current.step).toBe('form');
    expect(result.current.form.getValues('destination')).toBe(VALID_DESTINATION);
    await waitFor(() => expect(mockGetQuote).toHaveBeenCalled());
  });

  it('exposes quote errors and retries', async () => {
    mockGetQuote.mockRejectedValueOnce(new Error('Unable to estimate withdrawal fees.'));
    const { result } = renderHook(() => useStellarWithdrawal(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.quoteError).toBe('Unable to estimate withdrawal fees.'));

    act(() => result.current.retryQuote());

    await waitFor(() => expect(result.current.quote).toEqual(testnetQuoteFixture));
    expect(result.current.quoteError).toBeNull();
  });
});
