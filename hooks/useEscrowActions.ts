'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  escrowActionsService,
  type EscrowActionState,
  type EscrowActionStatus,
} from '@/services/escrowActionsService';

const escrowQueryKey = (shipmentId: string) => ['escrow-action', shipmentId];

interface OptimisticContext {
  previous?: EscrowActionState;
}

function optimisticState(
  previous: EscrowActionState | undefined,
  shipmentId: string,
  status: EscrowActionStatus,
): EscrowActionState {
  return {
    id: previous?.id ?? shipmentId,
    shipmentId,
    status,
    updatedAt: previous?.updatedAt ?? new Date().toISOString(),
  };
}

function useOptimisticEscrowMutation(
  shipmentId: string,
  status: EscrowActionStatus,
  mutationFn: () => Promise<EscrowActionState>,
) {
  const queryClient = useQueryClient();
  const queryKey = escrowQueryKey(shipmentId);

  return useMutation<EscrowActionState, Error, void, OptimisticContext>({
    mutationFn,
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<EscrowActionState>(queryKey);
      queryClient.setQueryData<EscrowActionState>(
        queryKey,
        optimisticState(previous, shipmentId, status),
      );
      return { previous };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKey, context.previous);
      } else {
        queryClient.removeQueries({ queryKey, exact: true });
      }
    },
    onSuccess: (confirmedState) => {
      queryClient.setQueryData(queryKey, confirmedState);
    },
  });
}

export function useEscrowActions(shipmentId: string) {
  const queryKey = escrowQueryKey(shipmentId);

  const escrowQuery = useQuery({
    queryKey,
    queryFn: () => escrowActionsService.getEscrow(shipmentId),
    enabled: Boolean(shipmentId),
  });

  const lockMutation = useOptimisticEscrowMutation(shipmentId, 'Locked', () =>
    escrowActionsService.lockEscrow(shipmentId),
  );
  const releaseMutation = useOptimisticEscrowMutation(
    shipmentId,
    'Released',
    () => escrowActionsService.releaseEscrow(shipmentId),
  );

  return {
    escrow: escrowQuery.data,
    isLoading: escrowQuery.isLoading,
    loadError:
      escrowQuery.error instanceof Error ? escrowQuery.error.message : null,
    actionError:
      lockMutation.error?.message ?? releaseMutation.error?.message ?? null,
    isUpdating: lockMutation.isPending || releaseMutation.isPending,
    lock: lockMutation.mutate,
    release: releaseMutation.mutate,
  };
}
