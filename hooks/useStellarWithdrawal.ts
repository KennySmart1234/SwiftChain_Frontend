'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { isValidStellarPublicKey } from '@/lib/stellarAddress';
import { formatAssetAmount } from '@/lib/transactionFormatters';
import { withdrawalService } from '@/services/withdrawalService';
import type {
  StellarNetwork,
  WithdrawalQuote,
  WithdrawalReceipt,
} from '@/types/withdrawal';

/** Stellar amounts carry at most 7 decimal places (1 stroop = 0.0000001). */
const STROOPS_PER_UNIT = 10_000_000;
const AMOUNT_PATTERN = /^\d+(\.\d{1,7})?$/;
const QUOTE_REFRESH_MS = 30_000;

export const STELLAR_NETWORKS: { value: StellarNetwork; label: string }[] = [
  { value: 'public', label: 'Stellar Mainnet' },
  { value: 'testnet', label: 'Stellar Testnet' },
];

export const withdrawalKeys = {
  all: ['withdrawalQuote'] as const,
  quote: (network: StellarNetwork) => ['withdrawalQuote', network] as const,
};

export const toStroops = (amount: number): number => Math.round(amount * STROOPS_PER_UNIT);
const fromStroops = (stroops: number): number => stroops / STROOPS_PER_UNIT;

/** Formats an amount for the input: up to 7 decimals, no trailing zeros. */
export function formatAmountInput(amount: number): string {
  return amount.toFixed(7).replace(/\.?0+$/, '');
}

/** Largest amount that can be withdrawn once the network fee is covered. */
export function getMaxWithdrawable(quote: WithdrawalQuote): number {
  return fromStroops(Math.max(0, toStroops(quote.availableBalance) - toStroops(quote.networkFee)));
}

/** Maps NEXT_PUBLIC_STELLAR_NETWORK ("mainnet", "public", "testnet") to a network. */
export function resolveDefaultNetwork(value = process.env.NEXT_PUBLIC_STELLAR_NETWORK): StellarNetwork {
  const normalized = value?.trim().toLowerCase();
  return normalized === 'public' || normalized === 'mainnet' ? 'public' : 'testnet';
}

/** Builds the form schema; balance, fee and minimum rules apply once a quote is loaded. */
export function createWithdrawalSchema(quote: WithdrawalQuote | null) {
  return z.object({
    network: z.enum(['public', 'testnet']),
    destination: z
      .string()
      .trim()
      .min(1, 'Enter a destination address')
      .refine(isValidStellarPublicKey, 'Enter a valid Stellar public key (starts with G)'),
    amount: z
      .string()
      .trim()
      .min(1, 'Enter an amount')
      .regex(AMOUNT_PATTERN, 'Enter a valid amount with up to 7 decimal places')
      .superRefine((value, ctx) => {
        const stroops = toStroops(Number(value));
        if (stroops <= 0) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Enter an amount greater than 0' });
          return;
        }
        if (!quote) return;

        if (stroops < toStroops(quote.minimumWithdrawal)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Minimum withdrawal is ${formatAssetAmount(quote.minimumWithdrawal, quote.assetCode)}`,
          });
          return;
        }
        const max = getMaxWithdrawable(quote);
        if (stroops > toStroops(max)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message:
              max > 0
                ? `Amount exceeds your available balance after fees (max ${formatAssetAmount(max, quote.assetCode)})`
                : 'Your available balance does not cover the network fee',
          });
        }
      }),
  });
}

export type WithdrawalFormValues = z.infer<ReturnType<typeof createWithdrawalSchema>>;

/** A validated withdrawal awaiting confirmation, priced with the quote shown at review. */
export interface PendingWithdrawal {
  network: StellarNetwork;
  destination: string;
  amount: number;
  quote: WithdrawalQuote;
  totalDebit: number;
  fiatEquivalent: number;
}

export type WithdrawalStep = 'form' | 'confirm';

export interface UseStellarWithdrawalOptions {
  onSuccess?: (_receipt: WithdrawalReceipt) => void;
}

function parseAmount(value: string | undefined): number | null {
  if (!value || !AMOUNT_PATTERN.test(value.trim())) return null;
  const amount = Number(value);
  return amount > 0 ? amount : null;
}

/**
 * useStellarWithdrawal — withdrawal form state, fee quote and submission.
 *
 * Follows the Component → Hook → Service pattern:
 *   WithdrawalForm → useStellarWithdrawal → withdrawalService → /api/wallet/withdrawals
 *
 * The fee quote is fetched per network, so switching networks re-quotes the fee
 * and re-validates the amount against the new maximum.
 */
export function useStellarWithdrawal({ onSuccess }: UseStellarWithdrawalOptions = {}) {
  const queryClient = useQueryClient();
  const [step, setStep] = useState<WithdrawalStep>('form');
  const [pending, setPending] = useState<PendingWithdrawal | null>(null);
  const [network, setNetworkState] = useState<StellarNetwork>(() => resolveDefaultNetwork());

  const quoteQuery = useQuery({
    queryKey: withdrawalKeys.quote(network),
    queryFn: ({ signal }) => withdrawalService.getQuote(network, signal),
    staleTime: QUOTE_REFRESH_MS / 2,
    // Keep the fee current while editing; freeze it during confirmation.
    refetchInterval: step === 'form' ? QUOTE_REFRESH_MS : false,
  });
  const quote = quoteQuery.data ?? null;

  const resolver = useMemo(() => zodResolver(createWithdrawalSchema(quote)), [quote]);
  const form = useForm<WithdrawalFormValues>({
    resolver,
    mode: 'onTouched',
    defaultValues: { network, destination: '', amount: '' },
  });
  const { control, getValues, handleSubmit, reset, setValue, trigger } = form;
  const amountInput = useWatch({ control, name: 'amount' });

  // A new quote changes the fee and maximum; re-check an amount already entered.
  useEffect(() => {
    if (quote && getValues('amount')) void trigger('amount');
  }, [quote, getValues, trigger]);

  const setNetwork = useCallback(
    (next: StellarNetwork) => {
      setNetworkState(next);
      setValue('network', next);
    },
    [setValue],
  );

  const amount = parseAmount(amountInput);
  const maxWithdrawable = quote ? getMaxWithdrawable(quote) : 0;
  const fiatEquivalent = quote && amount !== null ? amount * quote.fiatRate : null;
  const totalDebit =
    quote && amount !== null ? fromStroops(toStroops(amount) + toStroops(quote.networkFee)) : null;

  const fillMax = useCallback(() => {
    if (!quote) return;
    setValue('amount', formatAmountInput(getMaxWithdrawable(quote)), {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    });
  }, [quote, setValue]);

  const review = handleSubmit((values) => {
    if (!quote) return;
    const reviewed = Number(values.amount);
    setPending({
      network: values.network,
      destination: values.destination.trim(),
      amount: reviewed,
      quote,
      totalDebit: fromStroops(toStroops(reviewed) + toStroops(quote.networkFee)),
      fiatEquivalent: reviewed * quote.fiatRate,
    });
    setStep('confirm');
  });

  const backToForm = useCallback(() => {
    setStep('form');
    setPending(null);
  }, []);

  const mutation = useMutation({
    mutationFn: (withdrawal: PendingWithdrawal) =>
      withdrawalService.submitWithdrawal({
        quoteId: withdrawal.quote.quoteId,
        network: withdrawal.network,
        destination: withdrawal.destination,
        amount: withdrawal.amount,
      }),
    onSuccess: (receipt, withdrawal) => {
      toast.success('Withdrawal submitted', {
        description: `${formatAssetAmount(withdrawal.amount, withdrawal.quote.assetCode)} is on its way to your Stellar wallet.`,
      });
      reset({ network: withdrawal.network, destination: '', amount: '' });
      backToForm();
      void queryClient.invalidateQueries({ queryKey: withdrawalKeys.all });
      onSuccess?.(receipt);
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Withdrawal failed. Please try again.');
      // Fees or balance may have moved; send the user back with a fresh quote.
      backToForm();
      void quoteQuery.refetch();
    },
  });

  const { mutateAsync, isPending: isSubmitting } = mutation;
  const confirmWithdrawal = useCallback(async (): Promise<boolean> => {
    if (!pending || isSubmitting) return false;
    try {
      await mutateAsync(pending);
      return true;
    } catch {
      return false;
    }
  }, [pending, isSubmitting, mutateAsync]);

  const { refetch: refetchQuote } = quoteQuery;
  const retryQuote = useCallback(() => {
    void refetchQuote();
  }, [refetchQuote]);

  return {
    form,
    step,
    network,
    setNetwork,
    quote,
    isQuoteLoading: quoteQuery.isLoading,
    isQuoteFetching: quoteQuery.isFetching,
    quoteError: quoteQuery.error ? quoteQuery.error.message : null,
    retryQuote,
    amount,
    maxWithdrawable,
    fiatEquivalent,
    totalDebit,
    fillMax,
    review,
    pending,
    backToForm,
    confirmWithdrawal,
    isSubmitting,
  };
}

export type UseStellarWithdrawalResult = ReturnType<typeof useStellarWithdrawal>;
