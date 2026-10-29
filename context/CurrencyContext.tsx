'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useCurrencyRates } from '@/hooks/useCurrencyRates';
import {
  SUPPORTED_CURRENCIES,
  type CurrencyCode,
} from '@/services/currencyService';

const CURRENCY_STORAGE_KEY = 'swiftchain-display-currency';

interface CurrencyContextValue {
  currency: CurrencyCode;
  currencies: readonly CurrencyCode[];
  setCurrency: (_currency: CurrencyCode) => void;
  formatCurrency: (_xlmAmount: number) => string;
  isLoading: boolean;
  isError: boolean;
  updatedAt: string | null;
}

const CurrencyContext = createContext<CurrencyContextValue | null>(null);

function isCurrencyCode(value: string): value is CurrencyCode {
  return SUPPORTED_CURRENCIES.includes(value as CurrencyCode);
}

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrencyState] = useState<CurrencyCode>('USD');
  const ratesQuery = useCurrencyRates();

  useEffect(() => {
    const storedCurrency = window.localStorage.getItem(CURRENCY_STORAGE_KEY);
    if (storedCurrency && isCurrencyCode(storedCurrency)) {
      const restoreStoredCurrency = window.setTimeout(
        () => setCurrencyState(storedCurrency),
        0,
      );
      return () => window.clearTimeout(restoreStoredCurrency);
    }
  }, []);

  const setCurrency = useCallback((nextCurrency: CurrencyCode) => {
    setCurrencyState(nextCurrency);
    window.localStorage.setItem(CURRENCY_STORAGE_KEY, nextCurrency);
  }, []);

  const formatCurrency = useCallback(
    (xlmAmount: number) => {
      const rate = ratesQuery.data?.rates[currency];
      if (!Number.isFinite(xlmAmount) || typeof rate !== 'number') {
        return '--';
      }

      return new Intl.NumberFormat(undefined, {
        style: 'currency',
        currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(xlmAmount * rate);
    },
    [currency, ratesQuery.data?.rates],
  );

  const value = useMemo<CurrencyContextValue>(
    () => ({
      currency,
      currencies: SUPPORTED_CURRENCIES,
      setCurrency,
      formatCurrency,
      isLoading: ratesQuery.isLoading,
      isError: ratesQuery.isError,
      updatedAt: ratesQuery.data?.updatedAt ?? null,
    }),
    [
      currency,
      setCurrency,
      formatCurrency,
      ratesQuery.isLoading,
      ratesQuery.isError,
      ratesQuery.data?.updatedAt,
    ],
  );

  return (
    <CurrencyContext.Provider value={value}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency(): CurrencyContextValue {
  const context = useContext(CurrencyContext);
  if (!context) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return context;
}
