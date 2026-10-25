'use client';

import { useCallback, useMemo, useState } from 'react';

export const KYC_STEP_COUNT = 4;
const LAST_STEP_INDEX = KYC_STEP_COUNT - 1;

export interface KycStepFile {
  filename: string;
  fileSize: number;
  fileType: string;
}

export type KycFilesByStep = Record<number, KycStepFile[]>;

export interface UseKycStepFlowOptions {
  /** Returns true when the step can be left. Defaults to always valid. */
  validateStep?: (step: number, filesByStep: KycFilesByStep) => boolean;
  /** Receives every step's files. Wire this to the backend submission. */
  onSubmit: (filesByStep: KycFilesByStep) => Promise<void>;
}

export interface UseKycStepFlowReturn {
  currentStep: number;
  filesByStep: KycFilesByStep;
  isStepValid: boolean;
  canProceed: boolean;
  isSubmitting: boolean;
  submitError: string | null;
  next: () => void;
  back: () => void;
  goToStep: (step: number) => void;
  addFiles: (step: number, files: KycStepFile[]) => void;
  removeFile: (step: number, filename: string) => void;
  reset: () => void;
  submit: () => Promise<void>;
}

const clampStep = (step: number) =>
  Math.min(Math.max(Math.trunc(step), 0), LAST_STEP_INDEX);

/**
 * useKycStepFlow — state for the multi-step KYC onboarding flow.
 * Follows the Strict Layered Architecture: Component -> Hook -> Service.
 * The hook holds no API calls itself; submission is delegated to `onSubmit`.
 */
export function useKycStepFlow({
  validateStep = () => true,
  onSubmit,
}: UseKycStepFlowOptions): UseKycStepFlowReturn {
  const [currentStep, setCurrentStep] = useState(0);
  const [filesByStep, setFilesByStep] = useState<KycFilesByStep>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Validation runs against the live state for the current step.
  const isStepValid = useMemo(
    () => validateStep(currentStep, filesByStep),
    [validateStep, currentStep, filesByStep]
  );

  const canProceed = isStepValid && currentStep < LAST_STEP_INDEX;

  const next = useCallback(() => {
    if (canProceed) setCurrentStep((step) => step + 1);
  }, [canProceed]);

  const back = useCallback(() => {
    setCurrentStep((step) => Math.max(step - 1, 0));
  }, []);

  const goToStep = useCallback(
    (step: number) => {
      const target = clampStep(step);
      // Forward moves require every earlier step to be valid.
      for (let i = 0; i < target; i++) {
        if (!validateStep(i, filesByStep)) return;
      }
      setCurrentStep(target);
    },
    [validateStep, filesByStep]
  );

  const addFiles = useCallback((step: number, files: KycStepFile[]) => {
    const key = clampStep(step);
    setFilesByStep((prev) => ({
      ...prev,
      [key]: [...(prev[key] ?? []), ...files],
    }));
  }, []);

  const removeFile = useCallback((step: number, filename: string) => {
    const key = clampStep(step);
    setFilesByStep((prev) => ({
      ...prev,
      [key]: (prev[key] ?? []).filter((file) => file.filename !== filename),
    }));
  }, []);

  const reset = useCallback(() => {
    setCurrentStep(0);
    setFilesByStep({});
    setSubmitError(null);
  }, []);

  const submit = useCallback(async () => {
    for (let i = 0; i < KYC_STEP_COUNT; i++) {
      if (!validateStep(i, filesByStep)) {
        setCurrentStep(i);
        setSubmitError(`Step ${i + 1} is incomplete`);
        return;
      }
    }

    setIsSubmitting(true);
    setSubmitError(null);
    try {
      await onSubmit(filesByStep);
    } catch (error: unknown) {
      setSubmitError(
        error instanceof Error
          ? error.message
          : 'Failed to submit KYC documents'
      );
    } finally {
      setIsSubmitting(false);
    }
  }, [validateStep, filesByStep, onSubmit]);

  return {
    currentStep,
    filesByStep,
    isStepValid,
    canProceed,
    isSubmitting,
    submitError,
    next,
    back,
    goToStep,
    addFiles,
    removeFile,
    reset,
    submit,
  };
}
