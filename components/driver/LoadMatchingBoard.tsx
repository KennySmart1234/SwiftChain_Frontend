'use client';

import { useState } from 'react';
import { useLoadMatching } from '@/hooks/useLoadMatching';
import type { BulkContract, CargoType } from '@/types/loadMatching';

const CARGO_LABEL: Record<CargoType, string> = {
  general: 'General',
  refrigerated: 'Refrigerated',
  hazardous: 'Hazardous',
  oversized: 'Oversized',
  fragile: 'Fragile',
};

const STATUS_BADGE: Record<string, string> = {
  submitted: 'bg-blue-100 text-blue-700',
  accepted: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-red-100 text-red-700',
  expired: 'bg-gray-200 text-gray-700',
};

interface BidFormState {
  bidAmount: string;
  proposedTimeline: string;
}

function BidForm({
  contract,
  onSubmit,
  isSubmitting,
}: {
  contract: BulkContract;
  onSubmit: (bidAmount: number, proposedTimeline: string) => void;
  isSubmitting: boolean;
}) {
  const [form, setForm] = useState<BidFormState>({ bidAmount: '', proposedTimeline: '' });
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = Number(form.bidAmount);
    if (!form.bidAmount || Number.isNaN(amount) || amount <= 0) {
      setValidationError('Enter a valid bid amount greater than 0');
      return;
    }
    if (!form.proposedTimeline.trim()) {
      setValidationError('Enter a proposed timeline');
      return;
    }
    setValidationError(null);
    onSubmit(amount, form.proposedTimeline.trim());
  };

  return (
    <form onSubmit={handleSubmit} className="mt-3 space-y-2 border-t border-gray-100 pt-3">
      <div>
        <label htmlFor={`bid-amount-${contract.id}`} className="sr-only">
          Bid amount
        </label>
        <input
          id={`bid-amount-${contract.id}`}
          type="number"
          inputMode="decimal"
          placeholder={`Base rate: ${contract.baseRate} XLM`}
          value={form.bidAmount}
          onChange={(e) => setForm((f) => ({ ...f, bidAmount: e.target.value }))}
          className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm"
        />
      </div>
      <div>
        <label htmlFor={`bid-timeline-${contract.id}`} className="sr-only">
          Proposed timeline
        </label>
        <input
          id={`bid-timeline-${contract.id}`}
          type="text"
          placeholder="Proposed timeline (e.g. 2 days)"
          value={form.proposedTimeline}
          onChange={(e) => setForm((f) => ({ ...f, proposedTimeline: e.target.value }))}
          className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm"
        />
      </div>
      {validationError && <p className="text-xs text-red-600">{validationError}</p>}
      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-md bg-blue-600 py-1.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-gray-300"
      >
        {isSubmitting ? 'Submitting...' : 'Submit Bid'}
      </button>
    </form>
  );
}

export function LoadMatchingBoard() {
  const {
    contracts,
    bidsByContractId,
    isLoadingContracts,
    contractsError,
    filters,
    setFilters,
    submitBid,
    isSubmittingBid,
  } = useLoadMatching();

  if (isLoadingContracts) {
    return (
      <section
        aria-label="Load matching board"
        className="rounded-md border border-gray-200 bg-white p-6 text-center text-sm text-gray-500"
      >
        Loading available contracts...
      </section>
    );
  }

  if (contractsError) {
    return (
      <section
        aria-label="Load matching board"
        className="rounded-md border border-gray-200 bg-white p-6 text-center text-sm text-red-600"
      >
        {contractsError}
      </section>
    );
  }

  return (
    <section aria-label="Load matching board" className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 rounded-md border border-gray-200 bg-white p-3">
        <label htmlFor="cargo-filter" className="sr-only">
          Filter by cargo type
        </label>
        <select
          id="cargo-filter"
          value={filters.cargoType ?? 'all'}
          onChange={(e) =>
            setFilters((f) => ({ ...f, cargoType: e.target.value as CargoType | 'all' }))
          }
          className="rounded-md border border-gray-300 px-2 py-1 text-sm"
        >
          <option value="all">All cargo types</option>
          {Object.entries(CARGO_LABEL).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>

        <label htmlFor="region-filter" className="sr-only">
          Filter by region
        </label>
        <input
          id="region-filter"
          type="text"
          placeholder="Region"
          value={filters.region ?? ''}
          onChange={(e) => setFilters((f) => ({ ...f, region: e.target.value || undefined }))}
          className="rounded-md border border-gray-300 px-2 py-1 text-sm"
        />

        <label htmlFor="min-rate-filter" className="sr-only">
          Minimum rate
        </label>
        <input
          id="min-rate-filter"
          type="number"
          placeholder="Min rate"
          value={filters.minRate ?? ''}
          onChange={(e) =>
            setFilters((f) => ({
              ...f,
              minRate: e.target.value ? Number(e.target.value) : undefined,
            }))
          }
          className="w-24 rounded-md border border-gray-300 px-2 py-1 text-sm"
        />

        <label htmlFor="max-rate-filter" className="sr-only">
          Maximum rate
        </label>
        <input
          id="max-rate-filter"
          type="number"
          placeholder="Max rate"
          value={filters.maxRate ?? ''}
          onChange={(e) =>
            setFilters((f) => ({
              ...f,
              maxRate: e.target.value ? Number(e.target.value) : undefined,
            }))
          }
          className="w-24 rounded-md border border-gray-300 px-2 py-1 text-sm"
        />
      </div>

      {contracts.length === 0 ? (
        <div className="rounded-md border border-gray-200 bg-white p-6 text-center text-sm text-gray-500">
          No contracts match the current filters.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {contracts.map((contract) => {
            const existingBid = bidsByContractId.get(contract.id);
            return (
              <article
                key={contract.id}
                className="rounded-md border border-gray-200 bg-white p-4 shadow-sm"
              >
                <div className="mb-2 flex items-center justify-between">
                  <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
                    {CARGO_LABEL[contract.cargoType]}
                  </span>
                  {existingBid && (
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[existingBid.status]}`}
                    >
                      {existingBid.status}
                    </span>
                  )}
                </div>
                <h3 className="text-sm font-semibold text-gray-900">{contract.route}</h3>
                <dl className="mt-2 space-y-1 text-xs text-gray-500">
                  <div className="flex justify-between">
                    <dt>Region</dt>
                    <dd>{contract.region}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt>Timeline</dt>
                    <dd>{contract.timeline}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt>Base rate</dt>
                    <dd>{contract.baseRate} XLM</dd>
                  </div>
                </dl>

                {!existingBid && (
                  <BidForm
                    contract={contract}
                    isSubmitting={isSubmittingBid}
                    onSubmit={(bidAmount, proposedTimeline) =>
                      submitBid({ contractId: contract.id, bidAmount, proposedTimeline })
                    }
                  />
                )}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
