'use client';

import { ArrowLeft, ArrowRight, Check, Send } from 'lucide-react';
import { useShipmentWizard } from '@/hooks/useShipmentWizard';

const fieldClass =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:focus:ring-blue-900';

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <span className="text-xs text-red-600 dark:text-red-400">{message}</span>;
}

export function CreateWizard() {
  const {
    form,
    step,
    steps,
    next,
    back,
    submit,
    isSubmitting,
    isSuccess,
    error,
    shipment,
  } = useShipmentWizard();
  const {
    register,
    formState: { errors },
  } = form;

  return (
    <section className="mx-auto w-full max-w-4xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
      <header className="border-b border-slate-200 px-6 py-5 dark:border-slate-800">
        <h1 className="text-xl font-semibold text-slate-950 dark:text-white">
          Create shipment
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Add the route, cargo details, and escrow payment.
        </p>
      </header>

      <ol className="grid grid-cols-3 border-b border-slate-200 dark:border-slate-800">
        {steps.map((wizardStep, index) => {
          const isComplete = index < step;
          const isCurrent = index === step;
          return (
            <li
              key={wizardStep.id}
              aria-current={isCurrent ? 'step' : undefined}
              className={`flex min-h-16 items-center justify-center gap-2 border-b-2 px-3 text-sm font-medium ${
                isCurrent
                  ? 'border-blue-600 text-blue-700 dark:text-blue-300'
                  : 'border-transparent text-slate-500 dark:text-slate-400'
              }`}
            >
              <span className="flex h-6 w-6 items-center justify-center rounded-full border border-current text-xs">
                {isComplete ? <Check className="h-3.5 w-3.5" /> : index + 1}
              </span>
              {wizardStep.label}
            </li>
          );
        })}
      </ol>

      <form onSubmit={submit} className="p-6" aria-label="Create shipment">
        {step === 0 && (
          <fieldset className="grid gap-5 md:grid-cols-2">
            <legend className="sr-only">Sender and recipient</legend>
            <label className="space-y-2 text-sm font-medium text-slate-700 dark:text-slate-200">
              Sender name
              <input {...register('senderName')} className={fieldClass} />
              <FieldError message={errors.senderName?.message} />
            </label>
            <label className="space-y-2 text-sm font-medium text-slate-700 dark:text-slate-200">
              Recipient name
              <input {...register('recipientName')} className={fieldClass} />
              <FieldError message={errors.recipientName?.message} />
            </label>
            <label className="space-y-2 text-sm font-medium text-slate-700 dark:text-slate-200">
              Pickup address
              <input {...register('pickupAddress')} className={fieldClass} />
              <FieldError message={errors.pickupAddress?.message} />
            </label>
            <label className="space-y-2 text-sm font-medium text-slate-700 dark:text-slate-200">
              Destination
              <input {...register('destination')} className={fieldClass} />
              <FieldError message={errors.destination?.message} />
            </label>
            <label className="space-y-2 text-sm font-medium text-slate-700 dark:text-slate-200 md:col-span-2">
              Recipient phone
              <input
                {...register('recipientPhone')}
                type="tel"
                className={fieldClass}
              />
              <FieldError message={errors.recipientPhone?.message} />
            </label>
          </fieldset>
        )}

        {step === 1 && (
          <fieldset className="grid gap-5 md:grid-cols-2">
            <legend className="sr-only">Cargo details</legend>
            <label className="space-y-2 text-sm font-medium text-slate-700 dark:text-slate-200">
              Package size
              <select {...register('packageSize')} className={fieldClass}>
                <option value="small">Small</option>
                <option value="medium">Medium</option>
                <option value="large">Large</option>
              </select>
              <FieldError message={errors.packageSize?.message} />
            </label>
            <label className="space-y-2 text-sm font-medium text-slate-700 dark:text-slate-200">
              Weight (kg)
              <input
                {...register('weightKg', { valueAsNumber: true })}
                type="number"
                min="0.01"
                step="0.01"
                className={fieldClass}
              />
              <FieldError message={errors.weightKg?.message} />
            </label>
            <label className="space-y-2 text-sm font-medium text-slate-700 dark:text-slate-200 md:col-span-2">
              Cargo description
              <textarea
                {...register('description')}
                rows={5}
                className={fieldClass}
              />
              <FieldError message={errors.description?.message} />
            </label>
          </fieldset>
        )}

        {step === 2 && (
          <fieldset className="space-y-5">
            <legend className="sr-only">Escrow payment</legend>
            <div className="border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950">
              <p className="text-sm font-semibold text-slate-900 dark:text-white">
                Stellar escrow
              </p>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Funds stay locked until the shipment is delivered and confirmed.
              </p>
              <input
                {...register('paymentMethod')}
                type="hidden"
                value="escrow"
              />
            </div>
            <label className="block max-w-sm space-y-2 text-sm font-medium text-slate-700 dark:text-slate-200">
              Escrow amount (XLM)
              <input
                {...register('amountXlm', { valueAsNumber: true })}
                type="number"
                min="0.0000001"
                step="0.0000001"
                className={fieldClass}
              />
              <FieldError message={errors.amountXlm?.message} />
            </label>
          </fieldset>
        )}

        {error && (
          <p role="alert" className="mt-5 text-sm text-red-600 dark:text-red-400">
            {error}
          </p>
        )}
        {isSuccess && shipment && (
          <p role="status" className="mt-5 text-sm text-emerald-700 dark:text-emerald-400">
            Shipment {shipment.id} was created successfully.
          </p>
        )}

        <div className="mt-8 flex items-center justify-between border-t border-slate-200 pt-5 dark:border-slate-800">
          <button
            type="button"
            onClick={back}
            disabled={step === 0 || isSubmitting}
            className="inline-flex h-10 items-center gap-2 px-3 text-sm font-medium text-slate-600 disabled:cursor-not-allowed disabled:opacity-40 dark:text-slate-300"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
          {step < 2 ? (
            <button
              type="button"
              onClick={() => void next()}
              className="inline-flex h-10 items-center gap-2 bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Continue
              <ArrowRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex h-10 items-center gap-2 bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Send className="h-4 w-4" />
              {isSubmitting ? 'Creating...' : 'Create shipment'}
            </button>
          )}
        </div>
      </form>
    </section>
  );
}
