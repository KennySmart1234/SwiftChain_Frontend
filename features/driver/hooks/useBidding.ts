'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  biddingService,
  type OpenContract,
  type SubmitBidResponse,
} from '@/features/driver/services/biddingService';

export interface BiddingFilterState {
  /** Region or address fragment. Empty string means "any location". */
  location: string;
  /** Minimum starting price to include, or '' for no floor. */
  minPrice: string;
  /** Maximum starting price to include, or '' for no ceiling. */
  maxPrice: string;
}

export const EMPTY_BIDDING_FILTERS: BiddingFilterState = {
  location: '',
  minPrice: '',
  maxPrice: '',
};

interface UseBiddingState {
  isSubmitting: boolean;
  error: string | null;
}

export interface UseBiddingResult {
  /** All open contracts fetched from the server, unfiltered. */
  contracts: OpenContract[];
  /** Contracts left after the active filters are applied. */
  filteredContracts: OpenContract[];
  isLoading: boolean;
  loadError: string | null;
  filters: BiddingFilterState;
  setLocation: (location: string) => void;
  setMinPrice: (minPrice: string) => void;
  setMaxPrice: (maxPrice: string) => void;
  resetFilters: () => void;
  hasActiveFilters: boolean;
  availableLocations: string[];
  isSubmitting: boolean;
  submitError: string | null;
  submitBid: (contractId: string, amount: number) => Promise<SubmitBidResponse>;
  refetch: () => void;
}

const normalize = (value: string) => value.trim().toLowerCase();

function matchesLocation(contract: OpenContract, location: string): boolean {
  const needle = normalize(location);
  if (!needle) return true;
  return [contract.region, contract.pickupAddress, contract.dropoffAddress].some((field) =>
    normalize(field ?? '').includes(needle),
  );
}

function matchesPriceRange(contract: OpenContract, min: string, max: string): boolean {
  const minValue = min === '' ? -Infinity : Number(min);
  const maxValue = max === '' ? Infinity : Number(max);
  if (Number.isNaN(minValue) || Number.isNaN(maxValue)) return true;
  return contract.startingPrice >= minValue && contract.startingPrice <= maxValue;
}

/**
 * useBidding — owns the open-contract list, bid-submission mutation, and
 * filter state for the driver bidding marketplace.
 *
 * Follows the Strict Layered Architecture: Component -> Hook -> Service.
 */
export function useBidding(driverId: string): UseBiddingResult {
  const [contracts, setContracts] = useState<OpenContract[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [filters, setFilters] = useState<BiddingFilterState>(EMPTY_BIDDING_FILTERS);
  const [state, setState] = useState<UseBiddingState>({ isSubmitting: false, error: null });
  const [refetchToken, setRefetchToken] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const fetchContracts = async () => {
      setIsLoading(true);
      setLoadError(null);
      try {
        const response = await biddingService.getOpenContracts();
        if (cancelled) return;
        if (response.success && response.data) {
          setContracts(response.data);
        } else {
          setLoadError(response.message || 'Failed to load open contracts');
        }
      } catch (err) {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : 'Failed to load open contracts';
        setLoadError(message);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    fetchContracts();

    return () => {
      cancelled = true;
    };
  }, [refetchToken]);

  const refetch = useCallback(() => {
    setRefetchToken((token) => token + 1);
  }, []);

  const setLocation = useCallback((location: string) => {
    setFilters((current) => ({ ...current, location }));
  }, []);

  const setMinPrice = useCallback((minPrice: string) => {
    setFilters((current) => ({ ...current, minPrice }));
  }, []);

  const setMaxPrice = useCallback((maxPrice: string) => {
    setFilters((current) => ({ ...current, maxPrice }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters(EMPTY_BIDDING_FILTERS);
  }, []);

  const availableLocations = useMemo(
    () =>
      Array.from(
        new Set(
          contracts.map((contract) => contract.region).filter((region): region is string => Boolean(region)),
        ),
      ).sort((a, b) => a.localeCompare(b)),
    [contracts],
  );

  const filteredContracts = useMemo(
    () =>
      contracts.filter(
        (contract) =>
          matchesLocation(contract, filters.location) &&
          matchesPriceRange(contract, filters.minPrice, filters.maxPrice),
      ),
    [contracts, filters],
  );

  const hasActiveFilters =
    normalize(filters.location) !== '' || filters.minPrice !== '' || filters.maxPrice !== '';

  const submitBid = useCallback(
    async (contractId: string, amount: number) => {
      setState({ isSubmitting: true, error: null });
      try {
        const response = await biddingService.submitBid({ contractId, amount, driverId });
        if (!response.success || !response.data) {
          throw new Error(response.message || 'Failed to submit bid');
        }
        setState({ isSubmitting: false, error: null });
        return response.data;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to submit bid';
        setState({ isSubmitting: false, error: message });
        throw err;
      }
    },
    [driverId],
  );

  return {
    contracts,
    filteredContracts,
    isLoading,
    loadError,
    filters,
    setLocation,
    setMinPrice,
    setMaxPrice,
    resetFilters,
    hasActiveFilters,
    availableLocations,
    isSubmitting: state.isSubmitting,
    submitError: state.error,
    submitBid,
    refetch,
  };
}
