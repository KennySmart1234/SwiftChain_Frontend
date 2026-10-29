'use client';

import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import {
  shipmentCreationService,
  type CreatedShipment,
  type CreateShipmentPayload,
} from '@/services/shipmentCreationService';

const senderSchema = z.object({
  senderName: z.string().trim().min(2, 'Sender name is required'),
  pickupAddress: z.string().trim().min(5, 'Enter a complete pickup address'),
  recipientName: z.string().trim().min(2, 'Recipient name is required'),
  recipientPhone: z
    .string()
    .trim()
    .min(7, 'Recipient phone is required')
    .regex(/^[0-9+().\-\s]+$/, 'Enter a valid phone number'),
  destination: z.string().trim().min(5, 'Enter a complete destination'),
});

const cargoSchema = z.object({
  packageSize: z.enum(['small', 'medium', 'large']),
  description: z.string().trim().min(10, 'Describe the cargo in more detail'),
  weightKg: z.coerce
    .number()
    .positive('Weight must be greater than zero')
    .max(10_000, 'Weight must be 10,000 kg or less'),
});

const paymentSchema = z.object({
  amountXlm: z.coerce
    .number()
    .positive('Escrow amount must be greater than zero'),
  paymentMethod: z.literal('escrow'),
});

export const shipmentWizardSchema = senderSchema
  .merge(cargoSchema)
  .merge(paymentSchema);

export type ShipmentWizardValues = z.infer<typeof shipmentWizardSchema>;
export type ShipmentWizardStep = 0 | 1 | 2;

export const SHIPMENT_WIZARD_STEPS = [
  { id: 'sender', label: 'Sender' },
  { id: 'cargo', label: 'Cargo' },
  { id: 'payment', label: 'Payment' },
] as const;

const STEP_FIELDS: ReadonlyArray<ReadonlyArray<keyof ShipmentWizardValues>> = [
  [
    'senderName',
    'pickupAddress',
    'recipientName',
    'recipientPhone',
    'destination',
  ],
  ['packageSize', 'description', 'weightKg'],
  ['amountXlm', 'paymentMethod'],
];

export function useShipmentWizard() {
  const [step, setStep] = useState<ShipmentWizardStep>(0);
  const queryClient = useQueryClient();

  const form = useForm<ShipmentWizardValues>({
    resolver: zodResolver(shipmentWizardSchema),
    mode: 'onTouched',
    shouldUnregister: false,
    defaultValues: {
      senderName: '',
      pickupAddress: '',
      recipientName: '',
      recipientPhone: '',
      destination: '',
      packageSize: 'small',
      description: '',
      weightKg: 1,
      amountXlm: 1,
      paymentMethod: 'escrow',
    },
  });

  const createShipment = useMutation({
    mutationFn: (payload: CreateShipmentPayload) =>
      shipmentCreationService.createShipment(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['shipments'] });
    },
  });

  const next = async () => {
    const isCurrentStepValid = await form.trigger(STEP_FIELDS[step], {
      shouldFocus: true,
    });
    if (isCurrentStepValid && step < 2) {
      setStep((current) => (current + 1) as ShipmentWizardStep);
    }
    return isCurrentStepValid;
  };

  const back = () => {
    if (step > 0) {
      setStep((current) => (current - 1) as ShipmentWizardStep);
    }
  };

  const submit = form.handleSubmit(async (values) => {
    await createShipment.mutateAsync(values);
  });

  return {
    form,
    step,
    steps: SHIPMENT_WIZARD_STEPS,
    next,
    back,
    submit,
    isSubmitting: createShipment.isPending,
    isSuccess: createShipment.isSuccess,
    error:
      createShipment.error instanceof Error
        ? createShipment.error.message
        : createShipment.isError
          ? 'Unable to create shipment'
          : null,
    shipment: createShipment.data as CreatedShipment | undefined,
  };
}
