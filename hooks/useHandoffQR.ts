import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { shipmentHandoffService } from '@/services/shipmentHandoffService';
import type { HandoffQRData } from '@/types/shipment';
import { useToast } from '@/hooks/useToast';

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
  const { toast } = useToast();

  return useMutation({
    mutationFn: (deliveryId: string) =>
      shipmentHandoffService.generateHandoffQR(deliveryId),
    onSuccess: (data) => {
      // Invalidate and refetch the handoff QR data
      queryClient.invalidateQueries({
        queryKey: ['handoffQR', data.deliveryId],
      });
      toast({ variant: 'success', message: 'QR code generated successfully' });
    },
    onError: (error) => {
      toast({ variant: 'error', message: 'Failed to generate QR code' });
      console.error('QR generation error:', error);
    },
  });
}

export function useVerifyHandoffQR() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

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
      toast({ variant: 'success', message: 'Handoff verified successfully!' });
    },
    onError: (error) => {
      toast({ variant: 'error', message: 'Failed to verify handoff' });
      console.error('Handoff verification error:', error);
    },
  });
}
