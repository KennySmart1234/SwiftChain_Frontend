import { useQuery } from '@tanstack/react-query';
import { settlementConfirmationService } from '@/services/settlementConfirmationService';
import type { SettlementBreakdown } from '@/types/settlementConfirmation';

export interface UseSettlementBreakdownReturn {
  settlement: SettlementBreakdown | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

/**
 * Loads the settled fund breakdown for an escrow.
 *
 * @param escrowId The escrow contract address.
 */
export function useSettlementBreakdown(escrowId: string): UseSettlementBreakdownReturn {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['settlementBreakdown', escrowId],
    queryFn: () => settlementConfirmationService.getSettlementBreakdown(escrowId),
    enabled: !!escrowId,
  });

  return {
    settlement: data ?? null,
    isLoading,
    error: error?.message || null,
    refetch: () => void refetch(),
  };
}
