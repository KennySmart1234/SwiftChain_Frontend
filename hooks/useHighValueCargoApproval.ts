'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { highValueCargoService } from '@/services/highValueCargoService';
import type {
  HighValueCargoApproval,
  SubmitHighValueApprovalResponse,
} from '@/types/highValueCargo';

export const APPROVAL_REFRESH_INTERVAL_MS = 10_000;
const COUNTDOWN_TICK_MS = 1000;

export const highValueCargoKeys = {
  approval: (shipmentId: string) => ['highValueCargoApproval', shipmentId] as const,
};

export interface UseHighValueCargoApprovalOptions {
  enabled?: boolean;
  onSubmitted?: (_response: SubmitHighValueApprovalResponse) => void;
}

export interface UseHighValueCargoApprovalResult {
  approval: HighValueCargoApproval | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
  approvedCount: number;
  requiredSignatures: number;
  allSignaturesCollected: boolean;
  /** Milliseconds until the approval deadline (0 once expired). */
  remainingMs: number;
  isExpired: boolean;
  acknowledged: boolean;
  setAcknowledged: (_value: boolean) => void;
  canSubmit: boolean;
  isSubmitting: boolean;
  submitError: string | null;
  submit: () => void;
}

/** Formats a duration as "1d 02:03:04" or "02:03:04". */
export function formatCountdown(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const days = Math.floor(totalSeconds / 86_400);
  const hours = Math.floor((totalSeconds % 86_400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const clock = [hours, minutes, seconds].map((n) => String(n).padStart(2, '0')).join(':');
  return days > 0 ? `${days}d ${clock}` : clock;
}

function useNow(active: boolean): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setNow(Date.now()), COUNTDOWN_TICK_MS);
    return () => clearInterval(id);
  }, [active]);

  return now;
}

/**
 * Loads the multi-signature approval state for a high-value shipment,
 * tracks the approval deadline and gates submission until every required
 * signature is collected and the high-risk status is acknowledged.
 */
export function useHighValueCargoApproval(
  shipmentId: string,
  { enabled = true, onSubmitted }: UseHighValueCargoApprovalOptions = {},
): UseHighValueCargoApprovalResult {
  const queryClient = useQueryClient();
  const [acknowledged, setAcknowledged] = useState(false);

  const query = useQuery({
    queryKey: highValueCargoKeys.approval(shipmentId),
    queryFn: ({ signal }) => highValueCargoService.getApproval(shipmentId, signal),
    enabled: enabled && !!shipmentId,
    // Keep signer statuses fresh while co-signers are still approving.
    refetchInterval: (q) =>
      q.state.data?.status === 'awaiting_signatures' ? APPROVAL_REFRESH_INTERVAL_MS : false,
  });

  const approval = query.data ?? null;
  const now = useNow(enabled && !!approval);

  const mutation = useMutation({
    mutationFn: () =>
      highValueCargoService.submitApproval(shipmentId, { acknowledgedHighRisk: true }),
    onSuccess: (response) => {
      void queryClient.invalidateQueries({ queryKey: highValueCargoKeys.approval(shipmentId) });
      onSubmitted?.(response);
    },
  });

  const approvedCount = approval?.signers.filter((s) => s.status === 'approved').length ?? 0;
  const requiredSignatures = approval?.requiredSignatures ?? 0;
  const allSignaturesCollected = !!approval && approvedCount >= requiredSignatures;
  const remainingMs = approval ? Math.max(0, new Date(approval.deadline).getTime() - now) : 0;
  const isExpired = !!approval && (approval.status === 'expired' || remainingMs === 0);
  const isOpenForSubmission =
    approval?.status === 'awaiting_signatures' || approval?.status === 'ready';

  const canSubmit =
    allSignaturesCollected &&
    acknowledged &&
    !isExpired &&
    isOpenForSubmission &&
    !mutation.isPending;

  return {
    approval,
    isLoading: query.isLoading,
    error: query.error ? query.error.message : null,
    refetch: () => {
      void query.refetch();
    },
    approvedCount,
    requiredSignatures,
    allSignaturesCollected,
    remainingMs,
    isExpired,
    acknowledged,
    setAcknowledged,
    canSubmit,
    isSubmitting: mutation.isPending,
    submitError: mutation.error ? mutation.error.message : null,
    submit: () => {
      if (canSubmit) mutation.mutate();
    },
  };
}
