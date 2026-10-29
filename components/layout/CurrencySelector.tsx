'use client';

import { Coins } from 'lucide-react';
import { useCurrency } from '@/context/CurrencyContext';
import type { CurrencyCode } from '@/services/currencyService';

export function CurrencySelector() {
  const { currency, currencies, setCurrency, isLoading, isError } =
    useCurrency();

  return (
    <label className="flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-2 text-sm text-slate-700 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
      <Coins className="h-4 w-4" aria-hidden="true" />
      <span className="sr-only">Display currency</span>
      <select
        aria-label="Display currency"
        value={currency}
        disabled={isLoading || isError}
        onChange={(event) => setCurrency(event.target.value as CurrencyCode)}
        className="bg-transparent font-medium outline-none disabled:cursor-not-allowed disabled:opacity-60"
      >
        {currencies.map((code) => (
          <option key={code} value={code}>
            {code}
          </option>
        ))}
      </select>
    </label>
  );
}
