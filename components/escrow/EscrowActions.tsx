'use client';

import { CircleDollarSign, Loader2, Lock, Unlock } from 'lucide-react';
import { useEscrowActions } from '@/hooks/useEscrowActions';

export function EscrowActions({ shipmentId }: { shipmentId: string }) {
  const {
    escrow,
    isLoading,
    loadError,
    actionError,
    isUpdating,
    lock,
    release,
  } = useEscrowActions(shipmentId);

  if (isLoading) {
    return (
      <section className="mt-6 flex min-h-36 items-center justify-center border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
        <span className="ml-2 text-sm text-slate-500">Loading escrow...</span>
      </section>
    );
  }

  if (loadError || !escrow) {
    return (
      <p role="alert" className="mt-6 border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        {loadError ?? 'Escrow data is unavailable.'}
      </p>
    );
  }

  const isPending = escrow.status === 'Pending';
  const isLocked = escrow.status === 'Locked';

  return (
    <section className="mt-6 border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
            <CircleDollarSign className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-slate-950 dark:text-white">
              Escrow payment
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Status:{' '}
              <strong aria-live="polite" className="text-slate-900 dark:text-white">
                {escrow.status}
              </strong>
            </p>
          </div>
        </div>

        {isPending && (
          <button
            type="button"
            onClick={() => lock()}
            disabled={isUpdating}
            className="inline-flex h-10 items-center gap-2 bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
          >
            <Lock className="h-4 w-4" />
            Lock funds
          </button>
        )}
        {isLocked && (
          <button
            type="button"
            onClick={() => release()}
            disabled={isUpdating}
            className="inline-flex h-10 items-center gap-2 bg-emerald-600 px-4 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
          >
            <Unlock className="h-4 w-4" />
            Release funds
          </button>
        )}
        {escrow.status === 'Released' && (
          <span className="inline-flex h-10 items-center gap-2 text-sm font-semibold text-emerald-700 dark:text-emerald-400">
            <Unlock className="h-4 w-4" />
            Payment complete
          </span>
        )}
      </div>

      {actionError && (
        <p role="alert" className="mt-4 text-sm text-red-600 dark:text-red-400">
          {actionError}. The previous escrow status has been restored.
        </p>
      )}
    </section>
  );
}
