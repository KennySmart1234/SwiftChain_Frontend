'use client';

import { useForm } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { deliveriesService, type CreateDeliveryPayload } from '@/services/deliveries.service';
import { useToast } from '@/hooks/useToast';

export const createDeliverySchema = z.object({
  pickupAddress: z
    .string()
    .min(5, 'Pickup address is required')
    .max(250, 'Pickup address must be under 250 characters'),
  destination: z
    .string()
    .min(5, 'Destination address is required')
    .max(250, 'Destination address must be under 250 characters'),
  packageSize: z.enum(['small', 'medium', 'large'], {
    errorMap: () => ({ message: 'Please select a package size' }),
  }),
  description: z
    .string()
    .min(10, 'Package description is required')
    .max(500, 'Package description must be under 500 characters'),
  recipientName: z.string().min(2, 'Recipient name is required'),
  recipientPhone: z
    .string()
    .min(7, 'Recipient phone is required')
    .max(20, 'Recipient phone must be under 20 characters')
    .regex(/^[0-9+()\-\.\s]+$/, 'Enter a valid phone number'),
  recipientEmail: z.string().email('Enter a valid recipient email'),
});

export type CreateDeliveryFormValues = z.infer<typeof createDeliverySchema>;

export interface UseCreateDeliveryReturn {
  form: ReturnType<typeof useForm<CreateDeliveryFormValues>>;
  isSubmitting: boolean;
  isSuccess: boolean;
  onSubmit: (values: CreateDeliveryFormValues) => Promise<void>;
}

export function useCreateDelivery(): UseCreateDeliveryReturn {
  const queryClient = useQueryClient();
  const { success, error } = useToast();

  const form = useForm<CreateDeliveryFormValues>({
    resolver: zodResolver(createDeliverySchema),
    mode: 'onChange',
    defaultValues: {
      pickupAddress: '',
      destination: '',
      packageSize: 'small',
      description: '',
      recipientName: '',
      recipientPhone: '',
      recipientEmail: '',
    },
  });

  const createDelivery = useMutation({
    mutationFn: (payload: CreateDeliveryPayload) =>
      deliveriesService.createDelivery(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deliveries'] });
      success('Delivery request sent', 'Your logistics request was created successfully.');
      form.reset();
    },
    onError: (err) => {
      error(
        'Unable to create delivery request',
        err instanceof Error ? err.message : 'Please try again later',
      );
      console.error('Create delivery error:', err);
    },
  });

  const onSubmit = async (values: CreateDeliveryFormValues) => {
    await createDelivery.mutateAsync(values);
  };

  return {
    form,
    isSubmitting: createDelivery.isPending,
    isSuccess: createDelivery.isSuccess,
    onSubmit,
  };
}
