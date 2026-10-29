'use client';

import { useCallback, useEffect, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { driverEarningsService } from '@/services/driverEarningsService';
import { fxService, formatNgn } from '@/services/fxService';
import type {
  DriverEarningsSummary,
  DriverPayout,
  WithdrawalRequest,
  WithdrawalValidation,
} from '@/types/driverEarnings';

/** Balance is polled as a fallback when the socket is not connected. */
const SUMMARY_REFETCH_MS = 15_000;
const PAYOUTS_REFETCH_MS = 30_000;
const FX_STALE_MS = 60_000;

export const driverEarningsKeys = {
  summary: ['driverEarnings', 'summary'] as const,
  payouts: ['driverEarnings', 'payouts'] as const,
  fxRate: ['fx', 'ngnXlm'] as const,
};

export interface FiatEquivalents {
  available: string | null;
  pendingEscrow: string | null;
  lifetimeEarnings: string | null;
}

export interface UseDriverEarningsResult {
  summary: DriverEarningsSummary | null;
  payouts: DriverPayout[];
  fiat: FiatEquivalents;
  isLoading: boolean;
  isPayoutsLoading: boolean;
  error: string | null;
  payoutsError: string | null;
  isWithdrawing: boolean;
  refresh: () => Promise<void>;
  validateWithdrawal: (amountXlm: number, destination: string) => WithdrawalValidation;
  withdraw: (request: WithdrawalRequest) => Promise<boolean>;
}

function errorMessage(err: unknown, fallback: string): string | null {
  if (!err) return null;
  return err instanceof Error ? err.message : fallback;
}

/**
 * useDriverEarnings — balance overview, payout history and withdrawals for drivers.
 *
 * Follows the Component → Hook → Service pattern:
 *   DriverEarningsDashboard → useDriverEarnings → driverEarningsService / fxService
 */
export function useDriverEarnings(): UseDriverEarningsResult {
  const queryClient = useQueryClient();

  const summaryQuery = useQuery({
    queryKey: driverEarningsKeys.summary,
    queryFn: () => driverEarningsService.getSummary(),
    refetchInterval: SUMMARY_REFETCH_MS,
    refetchOnWindowFocus: true,
  });

  const payoutsQuery = useQuery({
    queryKey: driverEarningsKeys.payouts,
    queryFn: () => driverEarningsService.getPayouts(),
    refetchInterval: PAYOUTS_REFETCH_MS,
  });

  // fxService keeps its own TTL cache, so this never floods the rates endpoint.
  const fxQuery = useQuery({
    queryKey: driverEarningsKeys.fxRate,
    queryFn: () => fxService.getNgnXlmRate(),
    staleTime: FX_STALE_MS,
  });

  const invalidateEarnings = useCallback(
    () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: driverEarningsKeys.summary }),
        queryClient.invalidateQueries({ queryKey: driverEarningsKeys.payouts }),
      ]).then(() => undefined),
    [queryClient],
  );

  // Push updates from the backend (escrow released, payout settled, ...).
  useEffect(
    () => driverEarningsService.subscribeToUpdates(() => void invalidateEarnings()),
    [invalidateEarnings],
  );

  const summary = summaryQuery.data ?? null;
  const ngnPerXlm = fxQuery.data?.ngnPerXlm;

  const fiat = useMemo<FiatEquivalents>(() => {
    const toFiat = (xlm: number | undefined) =>
      xlm !== undefined && ngnPerXlm && ngnPerXlm > 0 ? formatNgn(xlm * ngnPerXlm) : null;
    return {
      available: toFiat(summary?.availableXlm),
      pendingEscrow: toFiat(summary?.pendingEscrowXlm),
      lifetimeEarnings: toFiat(summary?.lifetimeEarningsXlm),
    };
  }, [summary, ngnPerXlm]);

  const validateWithdrawal = useCallback(
    (amountXlm: number, destination: string) =>
      driverEarningsService.validateWithdrawal(
        amountXlm,
        summary?.availableXlm ?? 0,
        destination,
      ),
    [summary],
  );

  const withdrawMutation = useMutation({
    mutationFn: (request: WithdrawalRequest) => driverEarningsService.requestWithdrawal(request),
    onSuccess: () => {
      toast.success('Withdrawal submitted to the Stellar network');
      void invalidateEarnings();
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Withdrawal failed');
    },
  });

  const { mutateAsync } = withdrawMutation;
  const withdraw = useCallback(
    async (request: WithdrawalRequest): Promise<boolean> => {
      const validation = validateWithdrawal(request.amountXlm, request.destination);
      if (!validation.isValid) {
        toast.error(validation.error ?? 'Invalid withdrawal');
        return false;
      }
      try {
        await mutateAsync(request);
        return true;
      } catch {
        return false;
      }
    },
    [validateWithdrawal, mutateAsync],
  );

  return {
    summary,
    payouts: payoutsQuery.data ?? [],
    fiat,
    isLoading: summaryQuery.isLoading,
    isPayoutsLoading: payoutsQuery.isLoading,
    error: errorMessage(summaryQuery.error, 'Failed to load earnings'),
    payoutsError: errorMessage(payoutsQuery.error, 'Failed to load payouts'),
    isWithdrawing: withdrawMutation.isPending,
    refresh: invalidateEarnings,
    validateWithdrawal,
    withdraw,
  };
}
