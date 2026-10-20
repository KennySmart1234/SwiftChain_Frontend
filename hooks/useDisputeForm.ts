'use client';

import { useCallback } from 'react';
import type { UseFormReturn } from 'react-hook-form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { escrowService, OpenDisputeParams, OpenDisputeResponse } from '@/services/escrowService';
export type { OpenDisputeResponse } from '@/services/escrowService';

/**
 * Zod validation schema for the dispute form.
 * Ensures all required fields are validated before submission.
 */
const DisputeFormSchema = z.object({
  transactionId: z.string()
    .min(1, 'Transaction ID is required')
    .min(32, 'Transaction ID must be at least 32 characters'),
  reason: z.enum(['damaged_items', 'non_delivery', 'incorrect_items', 'other'], {
    errorMap: () => ({ message: 'Please select a valid dispute reason' }),
  }),
  description: z.string()
    .min(1, 'Description is required')
    .min(20, 'Description must be at least 20 characters')
    .max(500, 'Description must not exceed 500 characters'),
  evidenceFiles: z.array(z.instanceof(File)).optional(),
});

export type DisputeFormData = z.infer<typeof DisputeFormSchema>;

interface UseDisputeFormReturn extends Pick<UseFormReturn<DisputeFormData>,
  'register' | 'handleSubmit' | 'formState' | 'watch' | 'setValue' | 'reset'
> {
  submitDispute: (
    formData: DisputeFormData,
    deliveryId: string,
    walletAddress: string,
    onSuccess?: (response: OpenDisputeResponse) => void,
    onError?: (error: string) => void
  ) => Promise<void>;
}

/**
 * useDisputeForm — manages the dispute form submission flow.
 *
 * Handles:
 *   1. Form validation using Zod schema
 *   2. File upload management
 *   3. API request to open dispute
 *   4. Loading state management
 *   5. Error handling with toast notifications
 *   6. Success callback with dispute ID and transaction hash
 *
 * Components use this hook to submit disputes; the hook calls escrowService.
 * The component never calls the service directly.
 */
export function useDisputeForm(): UseDisputeFormReturn {
  const form = useForm<DisputeFormData>({
    resolver: zodResolver(DisputeFormSchema),
    mode: 'onBlur',
    defaultValues: {
      transactionId: '',
      reason: undefined,
      description: '',
      evidenceFiles: [],
    },
  });

  const {
    register,
    handleSubmit,
    formState,
    watch,
    setValue,
    reset,
  } = form;

  const submitDispute = useCallback(
    async (
      formData: DisputeFormData,
      deliveryId: string,
      walletAddress: string,
      onSuccess?: (response: OpenDisputeResponse) => void,
      onError?: (error: string) => void
    ): Promise<void> => {
      try {
        const params: OpenDisputeParams = {
          deliveryId,
          transactionId: formData.transactionId,
          reason: formData.reason,
          description: formData.description,
          evidenceFiles: formData.evidenceFiles,
          walletAddress,
        };

        const response = await escrowService.openDispute(params);

        toast.success(
          `Dispute opened successfully! Dispute ID: ${response.disputeId}`
        );
        reset();
        onSuccess?.(response);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
        toast.error(errorMessage);
        onError?.(errorMessage);
      }
    },
    [reset]
  );

  return {
    register,
    handleSubmit,
    formState,
    watch,
    setValue,
    reset,
    submitDispute,
  };
}
