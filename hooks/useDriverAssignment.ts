'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { driverAssignmentService } from '@/services/driverAssignmentService';
import { fleetService } from '@/services/fleetService';
import type { AssignShipmentPayload } from '@/types/driverAssignment';
import { useToast } from '@/hooks/useToast';

export function useDriverAssignment() {
  const queryClient = useQueryClient();
  const { success, error: toastError } = useToast();
  const [pendingAssignment, setPendingAssignment] = useState<AssignShipmentPayload | null>(null);

  const {
    data: shipments = [],
    isLoading: isLoadingShipments,
    error: shipmentsError,
  } = useQuery({
    queryKey: ['driver-assignment', 'pending-shipments'],
    queryFn: ({ signal }) => driverAssignmentService.getPendingShipments(signal),
    staleTime: 15000,
  });

  const {
    data: fleet,
    isLoading: isLoadingDrivers,
    error: driversError,
  } = useQuery({
    queryKey: ['driver-assignment', 'fleet'],
    queryFn: ({ signal }) => fleetService.getFleet(signal),
    staleTime: 30000,
  });

  const assignMutation = useMutation({
    mutationFn: (payload: AssignShipmentPayload) => driverAssignmentService.assignShipment(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['driver-assignment', 'pending-shipments'] });
      success('Shipment assigned', 'The driver has been notified.');
    },
    onError: (err) => {
      toastError('Unable to assign shipment', err instanceof Error ? err.message : 'Please try again later');
    },
  });

  const requestAssignment = (payload: AssignShipmentPayload) => {
    setPendingAssignment(payload);
  };

  const cancelAssignment = () => setPendingAssignment(null);

  const confirmAssignment = async () => {
    if (!pendingAssignment) return;
    await assignMutation.mutateAsync(pendingAssignment);
    setPendingAssignment(null);
  };

  return {
    shipments,
    drivers: fleet?.drivers ?? [],
    isLoading: isLoadingShipments || isLoadingDrivers,
    error:
      shipmentsError instanceof Error
        ? shipmentsError.message
        : driversError instanceof Error
          ? driversError.message
          : null,
    pendingAssignment,
    requestAssignment,
    cancelAssignment,
    confirmAssignment,
    isAssigning: assignMutation.isPending,
  };
}
