'use client';

import type { ChangeEvent } from 'react';
import { Check } from 'lucide-react';
import {
  KYC_FIELD_LABELS,
  useKycOnboarding,
  type KycFieldName,
} from '@/hooks/useKycOnboarding';

/**
 * KycOnboardingFlow — multi-step driver KYC onboarding with a step indicator.
 *
 * Layered Architecture:
 *   KycOnboardingFlow -> useKycOnboarding -> kycService
 */
export function KycOnboardingFlow() {
  const {
    form,
    step,
    steps,
    isLastStep,
    isSubmitting,
    isSubmitted,
    submitError,
    setFile,
    next,
    back,
    goTo,
    submit,
  } = useKycOnboarding();

  const { errors } = form.formState;
  const values = form.watch();

  if (isSubmitted) {
    return (
      <div role="status" className="mx-auto max-w-2xl rounded-xl bg-green-50 p-6 text-green-900">
        <h2 className="text-lg font-semibold">Documents submitted</h2>
        <p className="mt-1 text-sm">Your documents are awaiting admin approval.</p>
      </div>
    );
  }

  const renderFile = (name: KycFieldName) => {
    const file = values[name] as File | undefined;
    const error = errors[name]?.message;
    return (
      <div key={name} className="mb-4">
        <label htmlFor={name} className="mb-1 block text-sm font-medium text-gray-900">
          {KYC_FIELD_LABELS[name]}
        </label>
        <input
          id={name}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png"
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${name}-error` : undefined}
          onChange={(e: ChangeEvent<HTMLInputElement>) => setFile(name, e.target.files?.[0])}
          className="block w-full text-sm"
        />
        {file instanceof File && <p className="mt-1 text-xs text-gray-600">{file.name}</p>}
        {error && (
          <p id={`${name}-error`} role="alert" className="mt-1 text-xs text-red-600">
            {error}
          </p>
        )}
      </div>
    );
  };

  return (
    <div className="mx-auto w-full max-w-2xl p-4">
      <p className="mb-3 text-sm font-medium text-gray-700" aria-live="polite">
        Step {step + 1} of {steps.length}
      </p>
      <ol
        aria-label="Onboarding progress"
        className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:gap-2"
      >
        {steps.map((s, i) => {
          const done = i < step;
          const active = i === step;
          return (
            <li key={s.title} className="flex flex-1 items-center gap-2">
              <button
                type="button"
                disabled={!done}
                onClick={() => goTo(i)}
                aria-current={active ? 'step' : undefined}
                aria-label={`Step ${i + 1}: ${s.title}${done ? ' (completed)' : ''}`}
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${
                  active
                    ? 'bg-indigo-600 text-white'
                    : done
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-200 text-gray-600'
                }`}
              >
                {done ? <Check className="h-4 w-4" aria-hidden /> : i + 1}
              </button>
              <span className={`text-sm ${active ? 'font-semibold text-gray-900' : 'text-gray-600'}`}>
                {s.title}
              </span>
            </li>
          );
        })}
      </ol>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (isLastStep) void submit();
          else void next();
        }}
        noValidate
        className="rounded-xl border border-gray-200 bg-white p-6"
      >
        <h2 className="mb-4 text-lg font-semibold text-gray-900">{steps[step].title}</h2>

        {steps[step].fields.map(renderFile)}

        {isLastStep && (
          <dl className="space-y-2 text-sm">
            {(Object.keys(KYC_FIELD_LABELS) as KycFieldName[]).map((name) => (
              <div key={name} className="flex justify-between gap-2">
                <dt className="text-gray-600">{KYC_FIELD_LABELS[name]}</dt>
                <dd className="truncate text-gray-900">
                  {(values[name] as File | undefined)?.name ?? 'Missing'}
                </dd>
              </div>
            ))}
          </dl>
        )}

        {submitError && (
          <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
            {submitError}
          </p>
        )}

        <div className="mt-6 flex justify-between">
          <button
            type="button"
            onClick={back}
            disabled={step === 0 || isSubmitting}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm disabled:opacity-50"
          >
            Previous
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm text-white disabled:opacity-50"
          >
            {isLastStep ? (isSubmitting ? 'Submitting...' : 'Submit for approval') : 'Next'}
          </button>
        </div>
      </form>
    </div>
  );
}
