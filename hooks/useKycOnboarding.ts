'use client';

import { useCallback, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { kycService } from '@/services/kycService';

export const KYC_MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
export const KYC_ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];

export type KycFieldName =
  | 'licenseFront'
  | 'licenseBack'
  | 'vehicleRegistration'
  | 'profilePhoto';

const fileField = (label: string) =>
  z
    .custom<File>((v) => typeof File !== 'undefined' && v instanceof File, {
      message: `${label} is required`,
    })
    .refine((f) => !(f instanceof File) || f.size <= KYC_MAX_FILE_SIZE, {
      message: `${label} must not exceed 5MB`,
    })
    .refine((f) => !(f instanceof File) || KYC_ALLOWED_TYPES.includes(f.type), {
      message: `${label} must be PDF, JPG, or PNG`,
    });

const schema = z.object({
  licenseFront: fileField("Driver's license (front)"),
  licenseBack: fileField("Driver's license (back)"),
  vehicleRegistration: fileField('Vehicle registration'),
  profilePhoto: fileField('Profile photo'),
});

export type KycOnboardingValues = z.infer<typeof schema>;

export const KYC_STEPS: Array<{ title: string; fields: KycFieldName[] }> = [
  { title: "Driver's license", fields: ['licenseFront', 'licenseBack'] },
  { title: 'Vehicle registration', fields: ['vehicleRegistration'] },
  { title: 'Profile photo', fields: ['profilePhoto'] },
  { title: 'Review & submit', fields: [] },
];

const DOCUMENT_TYPES: Record<KycFieldName, string> = {
  licenseFront: 'drivers-license-front',
  licenseBack: 'drivers-license-back',
  vehicleRegistration: 'vehicle-registration',
  profilePhoto: 'profile-photo',
};

export const KYC_FIELD_LABELS: Record<KycFieldName, string> = {
  licenseFront: "Driver's license (front)",
  licenseBack: "Driver's license (back)",
  vehicleRegistration: 'Vehicle registration',
  profilePhoto: 'Profile photo',
};

/**
 * useKycOnboarding — state for the multi-step driver KYC onboarding flow.
 *
 * Follows the Component -> Hook -> Service pattern:
 *   KycOnboardingFlow -> useKycOnboarding -> kycService
 */
export function useKycOnboarding() {
  const [step, setStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const form = useForm<KycOnboardingValues>({
    resolver: zodResolver(schema),
    mode: 'onChange',
    defaultValues: {
      licenseFront: undefined,
      licenseBack: undefined,
      vehicleRegistration: undefined,
      profilePhoto: undefined,
    },
  });

  const setFile = useCallback(
    (name: KycFieldName, file: File | undefined) => {
      form.setValue(name, file as File, { shouldValidate: true, shouldDirty: true });
    },
    [form]
  );

  /** Advances only when every field of the current step is valid. */
  const next = useCallback(async () => {
    const fields = KYC_STEPS[step].fields;
    const valid = fields.length === 0 ? true : await form.trigger(fields);
    if (valid && step < KYC_STEPS.length - 1) setStep(step + 1);
    return valid;
  }, [form, step]);

  /** Previous steps are always reachable. */
  const goTo = useCallback(
    (target: number) => {
      if (target >= 0 && target < step) setStep(target);
    },
    [step]
  );

  const back = useCallback(() => goTo(step - 1), [goTo, step]);

  const submit = useCallback(async () => {
    setSubmitError(null);
    const valid = await form.trigger();
    if (!valid) return false;
    setIsSubmitting(true);
    try {
      const values = form.getValues();
      const ids: string[] = [];
      for (const name of Object.keys(DOCUMENT_TYPES) as KycFieldName[]) {
        const formData = new FormData();
        formData.append('document', values[name]);
        formData.append('documentType', DOCUMENT_TYPES[name]);
        const res = await kycService.uploadDocument(formData);
        if (!res.success || !res.data) throw new Error(res.message || 'Upload failed');
        ids.push(res.data.id);
      }
      const res = await kycService.submitForApproval(ids);
      if (!res.success) throw new Error(res.message || 'Submission failed');
      setIsSubmitted(true);
      return true;
    } catch (err) {
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      setSubmitError(e.response?.data?.message || e.message || 'Failed to submit documents');
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }, [form]);

  return {
    form,
    step,
    steps: KYC_STEPS,
    isLastStep: step === KYC_STEPS.length - 1,
    isSubmitting,
    isSubmitted,
    submitError,
    setFile,
    next,
    back,
    goTo,
    submit,
  };
}
