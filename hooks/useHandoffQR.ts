import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { shipmentHandoffService } from '../services/shipmentHandoffService';
import { HandoffQRData } from '../types/shipment';
import { useToast } from './useToast';

export function useHandoffQR(deliveryId: string, enabled: boolean = true) {
  return useQuery<HandoffQRData, Error>({
    queryKey: ['handoffQR', deliveryId],
    queryFn: () => shipmentHandoffService.getHandoffQR(deliveryId),
    enabled: !!deliveryId && enabled,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes (formerly cacheTime)
    retry: 2,
  });
}

export function useGenerateHandoffQR() {
  const queryClient = useQueryClient();
  const { success, error: showError } = useToast();

  return useMutation({
    mutationFn: (deliveryId: string) =>
      shipmentHandoffService.generateHandoffQR(deliveryId),
    onSuccess: (data) => {
      // Invalidate and refetch the handoff QR data
      queryClient.invalidateQueries({
        queryKey: ['handoffQR', data.deliveryId],
      });
      success?.('QR code generated successfully');
    },
    onError: () => {
      showError?.('Failed to generate QR code');
    },
  });
}

export function useVerifyHandoffQR() {
  const queryClient = useQueryClient();
  const { success, error: showError } = useToast();

  return useMutation({
    mutationFn: ({ deliveryId, token }: { deliveryId: string; token: string }) =>
      shipmentHandoffService.verifyHandoffQR(deliveryId, token),
    onSuccess: (data) => {
      // Invalidate related queries
      queryClient.invalidateQueries({
        queryKey: ['deliveries'],
      });
      queryClient.invalidateQueries({
        queryKey: ['delivery', data.id],
      });
      success?.('Handoff verified successfully!');
    },
    onError: () => {
      showError?.('Failed to verify handoff');
    },
  });
}
