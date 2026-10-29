'use client';

import { useQuery } from '@tanstack/react-query';
import { currencyService } from '@/services/currencyService';

const RATE_REFRESH_INTERVAL_MS = 60_000;

export function useCurrencyRates() {
  return useQuery({
    queryKey: ['currency-rates'],
    queryFn: currencyService.getRates,
    staleTime: RATE_REFRESH_INTERVAL_MS,
    refetchInterval: RATE_REFRESH_INTERVAL_MS,
    retry: 1,
  });
}
