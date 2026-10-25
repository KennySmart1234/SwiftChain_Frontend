'use client';

import { Check } from 'lucide-react';

export interface KycStep {
  label: string;
}

interface KycStepIndicatorProps {
  steps: ReadonlyArray<KycStep>;
  currentStep: number;
  /** Optional handler for keyboard or pointer navigation to a step. */
  onStepSelect?: (step: number) => void;
}

/**
 * KycStepIndicator — horizontal progress bar for the KYC onboarding flow.
 * Stacks vertically below the md breakpoint (768px).
 */
export function KycStepIndicator({
  steps,
  currentStep,
  onStepSelect,
}: KycStepIndicatorProps) {
  const total = steps.length;
  const activeLabel = steps[currentStep]?.label ?? '';

  return (
    <div className="w-full">
      <div
        role="progressbar"
        aria-label="KYC onboarding progress"
        aria-valuemin={1}
        aria-valuemax={total}
        aria-valuenow={currentStep + 1}
        aria-valuetext={`Step ${currentStep + 1} of ${total}: ${activeLabel}`}
        className="mb-4 h-1 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700"
      >
        <div
          className="h-full bg-blue-600 transition-all dark:bg-blue-500"
          style={{ width: `${((currentStep + 1) / total) * 100}%` }}
        />
      </div>

      <ol className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        {steps.map(({ label }, index) => {
          const isActive = index === currentStep;
          const isCompleted = index < currentStep;
          const isInteractive = Boolean(onStepSelect);

          const content = (
            <>
              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${
                  isActive || isCompleted
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                }`}
                aria-hidden="true"
              >
                {isCompleted ? <Check className="h-4 w-4" /> : index + 1}
              </span>
              <span
                className={`text-sm font-medium ${
                  isActive
                    ? 'text-slate-900 dark:text-white'
                    : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                {label}
              </span>
              {isCompleted && <span className="sr-only">(completed)</span>}
            </>
          );

          return (
            <li
              key={label}
              aria-current={isActive ? 'step' : undefined}
              className="flex flex-1 items-center gap-3 md:flex-col md:text-center"
            >
              {isInteractive ? (
                <button
                  type="button"
                  onClick={() => onStepSelect?.(index)}
                  className="flex items-center gap-3 rounded-md p-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 md:flex-col"
                >
                  {content}
                </button>
              ) : (
                <div
                  tabIndex={0}
                  className="flex items-center gap-3 rounded-md p-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 md:flex-col"
                >
                  {content}
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
