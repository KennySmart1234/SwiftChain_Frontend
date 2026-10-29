'use client';

import { useMemo } from 'react';
import { useBidding } from '@/hooks/useBidding';
import {
  useContractCountdown,
  formatCountdown,
  type ContractUrgency,
} from '@/hooks/useContractCountdown';
import type { Contract } from '@/types/bidding';

const URGENCY_BADGE: Record<ContractUrgency, string> = {
  normal: 'bg-emerald-100 text-emerald-700',
  urgent: 'bg-orange-100 text-orange-700',
  critical: 'bg-red-100 text-red-700',
};

const URGENCY_LABEL: Record<ContractUrgency, string> = {
  normal: 'Open',
  urgent: 'Closing soon',
  critical: 'Final hour',
};

interface ContractCardProps {
  contract: Contract;
  msRemaining: number;
  urgency: ContractUrgency;
  isExpired: boolean;
  onBid: (contract: Contract) => void;
}

function ContractCard({
  contract,
  msRemaining,
  urgency,
  isExpired,
  onBid,
}: ContractCardProps) {
  return (
    <li
      className="flex flex-col gap-3 rounded-md border border-gray-200 bg-white p-4 shadow-sm"
      aria-label={`Contract ${contract.id}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-medium text-gray-900">{contract.pickupAddress}</p>
          <p className="text-xs text-gray-500">→ {contract.dropoffAddress}</p>
        </div>
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${URGENCY_BADGE[urgency]}`}
        >
          {URGENCY_LABEL[urgency]}
        </span>
      </div>

      <p className="text-sm text-gray-600">{contract.packageDescription}</p>

      <div className="flex items-center justify-between text-xs text-gray-500">
        <span>{contract.estimatedDistance} km</span>
        <span>{contract.suggestedRate} XLM suggested</span>
      </div>

      <div
        className={`rounded-md px-3 py-2 text-center text-sm font-semibold ${
          urgency === 'critical'
            ? 'bg-red-50 text-red-700'
            : urgency === 'urgent'
              ? 'bg-orange-50 text-orange-700'
              : 'bg-emerald-50 text-emerald-700'
        }`}
        role="timer"
        aria-live="polite"
      >
        {formatCountdown(msRemaining)}
      </div>

      <button
        type="button"
        onClick={() => onBid(contract)}
        disabled={isExpired}
        className="rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300"
      >
        Place bid
      </button>
    </li>
  );
}

interface BiddingBoardProps {
  onSelectContract?: (contract: Contract) => void;
}

/**
 * BiddingBoard — displays open contracts with live countdown timers,
 * urgency-based color coding, automatic removal of expired contracts, and
 * a one-time "expiring soon" toast per contract (see useContractCountdown).
 */
export function BiddingBoard({ onSelectContract }: BiddingBoardProps) {
  const { contracts, isLoadingContracts, contractsError } = useBidding();

  const countdowns = useContractCountdown(contracts);

  // shouldRemove is derived fresh every render from the ticking countdown
  // clock (see useContractCountdown), so filtering here is enough to drop
  // expired-past-grace contracts without any separate removal state/effect.
  const visibleContracts = useMemo(
    () => contracts.filter((contract) => !countdowns.get(contract.id)?.shouldRemove),
    [contracts, countdowns]
  );

  if (isLoadingContracts) {
    return (
      <section
        aria-label="Bidding board"
        className="rounded-md border border-gray-200 bg-white p-6 text-center text-sm text-gray-500"
      >
        Loading available contracts…
      </section>
    );
  }

  if (contractsError) {
    return (
      <section
        aria-label="Bidding board"
        className="rounded-md border border-red-200 bg-red-50 p-6 text-center text-sm text-red-700"
      >
        {contractsError}
      </section>
    );
  }

  if (visibleContracts.length === 0) {
    return (
      <section
        aria-label="Bidding board"
        className="rounded-md border border-gray-200 bg-white p-6 text-center text-sm text-gray-500"
      >
        No open contracts right now — check back soon.
      </section>
    );
  }

  return (
    <section aria-label="Bidding board" className="rounded-md border border-gray-200 bg-white">
      <header className="border-b border-gray-200 px-4 py-3">
        <h2 className="text-base font-semibold text-gray-900">Open Contracts</h2>
      </header>

      <ul
        role="list"
        className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 lg:grid-cols-3"
      >
        {visibleContracts.map((contract) => {
          const countdown = countdowns.get(contract.id);
          return (
            <ContractCard
              key={contract.id}
              contract={contract}
              msRemaining={countdown?.msRemaining ?? 0}
              urgency={countdown?.urgency ?? 'normal'}
              isExpired={countdown?.isExpired ?? false}
              onBid={(c) => onSelectContract?.(c)}
            />
          );
        })}
      </ul>
    </section>
  );
}
