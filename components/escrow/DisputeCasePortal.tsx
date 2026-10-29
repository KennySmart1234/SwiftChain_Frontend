'use client';

import { useState } from 'react';
import { useDisputeCase } from '@/hooks/useDisputeCase';
import { EvidenceDropzone } from '@/components/escrow/EvidenceDropzone';
import type { DisputeCaseResponse, DisputeReason } from '@/types/dispute';
import { useToast } from '@/hooks/useToast';

type Step = 'issue' | 'evidence' | 'confirmation';

interface DisputeCasePortalProps {
  deliveryId: string;
}

const REASONS: { value: DisputeReason; label: string }[] = [
  { value: 'damaged_items', label: 'Items Damaged' },
  { value: 'non_delivery', label: 'Non-Delivery' },
  { value: 'incorrect_items', label: 'Incorrect Items' },
  { value: 'other', label: 'Other Issue' },
];

export function DisputeCasePortal({ deliveryId }: DisputeCasePortalProps) {
  const [step, setStep] = useState<Step>('issue');
  const [reason, setReason] = useState<DisputeReason | null>(null);
  const [description, setDescription] = useState('');
  const [submittedCase, setSubmittedCase] = useState<DisputeCaseResponse | null>(null);
  const { error: toastError } = useToast();

  const { files, addFiles, removeFile, submitCase, isSubmitting, uploadProgress } =
    useDisputeCase(deliveryId);

  const canContinueFromIssue = reason !== null && description.trim().length >= 20;

  const handleSubmit = async () => {
    if (!reason) return;
    try {
      const result = await submitCase(reason, description);
      setSubmittedCase(result);
      setStep('confirmation');
    } catch {
      // useDisputeCase already surfaces a toast; stay on the evidence step.
    }
  };

  if (step === 'confirmation' && submittedCase) {
    return (
      <section
        data-testid="dispute-submitted"
        aria-label="Dispute submitted"
        className="rounded-md border border-gray-200 bg-white p-6 text-center"
      >
        <h2 className="text-lg font-semibold text-gray-900">Dispute Filed</h2>
        <p className="mt-2 text-sm text-gray-600">
          Case ID: <span data-testid="case-id" className="font-mono">{submittedCase.caseId}</span>
        </p>
        {submittedCase.escrowFrozen && (
          <p
            data-testid="escrow-frozen-indicator"
            role="status"
            className="mt-4 rounded-md bg-amber-100 px-4 py-2 text-sm font-medium text-amber-800"
          >
            Escrow payout frozen pending review
          </p>
        )}
      </section>
    );
  }

  return (
    <section aria-label="Dispute resolution portal" className="rounded-md border border-gray-200 bg-white p-6">
      <h2 className="mb-4 text-lg font-semibold text-gray-900">Report a Delivery Issue</h2>

      {step === 'issue' && (
        <div className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">Reason</label>
            <div className="grid grid-cols-2 gap-2">
              {REASONS.map((r) => (
                <label
                  key={r.value}
                  className={`flex cursor-pointer items-center gap-2 rounded-md border p-3 text-sm ${
                    reason === r.value ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                  }`}
                >
                  <input
                    type="radio"
                    name="dispute-reason"
                    value={r.value}
                    checked={reason === r.value}
                    onChange={() => setReason(r.value)}
                  />
                  {r.label}
                </label>
              ))}
            </div>
          </div>

          <div>
            <label htmlFor="dispute-description" className="mb-2 block text-sm font-medium text-gray-700">
              Description
            </label>
            <textarea
              id="dispute-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              placeholder="Describe what happened (minimum 20 characters)"
              className="w-full rounded-md border border-gray-300 p-3 text-sm"
            />
          </div>

          <button
            type="button"
            disabled={!canContinueFromIssue}
            onClick={() => setStep('evidence')}
            className="w-full rounded-md bg-blue-600 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-gray-300"
          >
            Continue to Evidence
          </button>
        </div>
      )}

      {step === 'evidence' && (
        <div className="space-y-4">
          <EvidenceDropzone
            files={files}
            onFilesAdded={addFiles}
            onRemoveFile={removeFile}
            onRejected={(reasons) => reasons.forEach((r) => toastError('File rejected', r))}
          />

          <div
            role="status"
            className="rounded-md bg-amber-50 px-4 py-2 text-sm text-amber-800"
          >
            Filing this dispute will immediately freeze the delivery&apos;s escrow payout
            pending review.
          </div>

          {isSubmitting && uploadProgress > 0 && (
            <p className="text-xs text-gray-500">Uploading evidence: {uploadProgress}%</p>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setStep('issue')}
              className="flex-1 rounded-md border border-gray-300 py-2.5 text-sm font-semibold text-gray-700"
            >
              Back
            </button>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleSubmit}
              className="flex-1 rounded-md bg-blue-600 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-gray-300"
            >
              {isSubmitting ? 'Submitting...' : 'Submit Dispute'}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
