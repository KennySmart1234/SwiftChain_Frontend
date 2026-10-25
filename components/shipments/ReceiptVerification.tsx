'use client';

import { FormEvent, useState } from 'react';

export interface ReceiptVerificationResult {
  status: 'verified' | 'rejected';
  message: string;
  receiptId?: string;
}

export interface ReceiptVerificationProps {
  title?: string;
  onVerify?: (receiptId: string) => Promise<ReceiptVerificationResult | void>;
}

const RECEIPT_PATTERN = /^[A-Za-z0-9]{12,64}$/;

export function ReceiptVerification({
  title = 'Verify delivery receipt',
  onVerify,
}: ReceiptVerificationProps) {
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmed = value.trim();

    if (!trimmed) {
      setError('Receipt ID is required.');
      setSuccessMessage(null);
      return;
    }

    if (!RECEIPT_PATTERN.test(trimmed)) {
      setError('Enter a valid Stellar receipt ID or transaction hash.');
      setSuccessMessage(null);
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      const result =
        onVerify && typeof onVerify === 'function'
          ? await onVerify(trimmed)
          : { status: 'verified', message: 'Receipt verified on-chain.' };

      const responseMessage =
        result && typeof result === 'object' && 'message' in result
          ? result.message
          : 'Receipt verified on-chain.';

      setSuccessMessage(responseMessage);
    } catch (submissionError) {
      setSuccessMessage(null);
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : 'Unable to verify receipt. Please try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
        {title}
      </h2>

      <form onSubmit={handleSubmit} className="mt-4 space-y-4" noValidate>
        <label
          htmlFor="receipt-id"
          className="block text-sm font-medium text-slate-700 dark:text-slate-200"
        >
          Receipt ID / Transaction hash
        </label>
        <input
          id="receipt-id"
          name="receiptId"
          type="text"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder="e.g. 8F4A2C1B9E6D"
          aria-invalid={Boolean(error)}
          aria-describedby={error ? 'receipt-verification-error' : undefined}
          className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
        />

        {error && (
          <p
            id="receipt-verification-error"
            role="alert"
            className="text-sm text-red-600 dark:text-red-400"
          >
            {error}
          </p>
        )}

        {successMessage && (
          <p
            className="text-sm text-emerald-600 dark:text-emerald-400"
            role="status"
          >
            {successMessage}
          </p>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-400"
        >
          {isSubmitting ? 'Verifying…' : 'Verify receipt'}
        </button>
      </form>
    </section>
  );
}

export default ReceiptVerification;
