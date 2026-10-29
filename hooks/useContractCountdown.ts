'use client';

import { useEffect, useRef, useState } from 'react';
import { differenceInMilliseconds } from 'date-fns';
import { useToast } from '@/hooks/useToast';

export type ContractUrgency = 'normal' | 'urgent' | 'critical';

const HOUR_MS = 60 * 60 * 1000;
const REMOVAL_GRACE_MS = 5 * 60 * 1000; // remove 5 minutes past deadline
const WARNING_THRESHOLD_MS = HOUR_MS; // warn 1 hour before deadline

export interface ContractCountdown {
  contractId: string;
  msRemaining: number;
  isExpired: boolean;
  /** True once msRemaining + grace period has elapsed — caller should drop the contract. */
  shouldRemove: boolean;
  urgency: ContractUrgency;
}

function urgencyFor(msRemaining: number): ContractUrgency {
  if (msRemaining <= 0) return 'critical';
  if (msRemaining < HOUR_MS) return 'critical';
  if (msRemaining < 24 * HOUR_MS) return 'urgent';
  return 'normal';
}

/**
 * useContractCountdown — tracks live countdowns for a set of contracts by
 * their `expiresAt` timestamps.
 *
 * - Ticks every second while the tab is visible; pauses entirely while the
 *   tab is hidden (resuming immediately, with correct elapsed time, when it
 *   becomes visible again) so background tabs don't burn CPU on invisible UI.
 * - Fires a one-time "expiring soon" toast per contract when it crosses the
 *   1-hour-remaining threshold.
 * - Flags a contract with `shouldRemove` once it has been expired for more
 *   than 5 minutes, so the caller (BiddingBoard) can drop it from the list.
 */
export function useContractCountdown(
  contracts: { id: string; expiresAt: string }[]
): Map<string, ContractCountdown> {
  const { info } = useToast();
  const [now, setNow] = useState(() => Date.now());
  const warnedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval> | null = null;

    const tick = () => setNow(Date.now());

    const startTicking = () => {
      if (intervalId) return;
      tick(); // resync immediately on resume, rather than waiting a full second
      intervalId = setInterval(tick, 1000);
    };

    const stopTicking = () => {
      if (!intervalId) return;
      clearInterval(intervalId);
      intervalId = null;
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        stopTicking();
      } else {
        startTicking();
      }
    };

    if (!document.hidden) {
      startTicking();
    }
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      stopTicking();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  useEffect(() => {
    for (const contract of contracts) {
      const msRemaining = differenceInMilliseconds(
        new Date(contract.expiresAt),
        new Date(now)
      );
      if (
        msRemaining > 0 &&
        msRemaining <= WARNING_THRESHOLD_MS &&
        !warnedRef.current.has(contract.id)
      ) {
        warnedRef.current.add(contract.id);
        info(
          'Contract expiring soon',
          `Contract ${contract.id} closes for bidding in under an hour.`
        );
      }
    }
  }, [contracts, now, info]);

  const result = new Map<string, ContractCountdown>();
  for (const contract of contracts) {
    const msRemaining = differenceInMilliseconds(
      new Date(contract.expiresAt),
      new Date(now)
    );
    const isExpired = msRemaining <= 0;
    result.set(contract.id, {
      contractId: contract.id,
      msRemaining,
      isExpired,
      shouldRemove: isExpired && Math.abs(msRemaining) >= REMOVAL_GRACE_MS,
      urgency: urgencyFor(msRemaining),
    });
  }
  return result;
}

/** Formats milliseconds remaining as "Hh Mm Ss" (or "Mm Ss" once under an hour). */
export function formatCountdown(msRemaining: number): string {
  if (msRemaining <= 0) return 'Expired';

  const totalSeconds = Math.floor(msRemaining / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds}s`;
  }
  return `${minutes}m ${seconds}s`;
}
