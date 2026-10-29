'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { EvidenceMediaDropzone } from '@/components/escrow/EvidenceMediaDropzone';
import { useEvidenceUpload } from '@/hooks/useEvidenceUpload';
import { disputeResolutionService } from '@/services/disputeResolutionService';
import type { DisputeCaseSummary, DisputeStep } from '@/types/disputeResolution';

const DISPUTE_REASONS = [
  { value: 'damaged_items', label: 'Items Damaged' },
  { value: 'non_delivery', label: 'Non-Delivery' },
  { value: 'incorrect_items', label: 'Incorrect Items' },
  { value: 'other', label: 'Other Issue' },
] as const;

interface DisputeResolutionPortalProps {
  deliveryId: string;
  onSubmitted?: (caseSummary: DisputeCaseSummary) => void;
}

/**
 * DisputeResolutionPortal — multi-step dispute filing flow: reason/details,
 * evidence upload, review, then submission. Shows an escrow-frozen
 * indicator and the assigned case ID once a dispute has been filed.
 */
export function DisputeResolutionPortal({
  deliveryId,
  onSubmitted,
}: DisputeResolutionPortalProps) {
  const [step, setStep] = useState<DisputeStep>('details');
  const [reason, setReason] = useState<string>('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [caseSummary, setCaseSummary] = useState<DisputeCaseSummary | null>(null);

  const { files, addFiles, removeFile, uploadAll, isUploading, canAddMore } =
    useEvidenceUpload();

  const canContinueFromDetails = reason.length > 0 && description.trim().length >= 20;

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const evidenceFileIds = await uploadAll();
      const summary = await disputeResolutionService.submitCase({
        deliveryId,
        reason,
        description,
        evidenceFileIds,
      });
      setCaseSummary(summary);
      setStep('submitted');
      onSubmitted?.(summary);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to submit dispute. Please try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (step === 'submitted' && caseSummary) {
    return (
      <div className="mx-auto w-full max-w-2xl p-6" data-testid="dispute-submitted">
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-6 text-center">
          <h2 className="text-xl font-semibold text-gray-900">Dispute Submitted</h2>
          <p className="mt-2 text-sm text-gray-600">
            Case ID:{' '}
            <code className="font-mono font-semibold" data-testid="case-id">
              {caseSummary.caseId}
            </code>
          </p>
          {caseSummary.escrowFrozen && (
            <p
              className="mt-4 rounded-md bg-amber-100 px-3 py-2 text-sm font-medium text-amber-800"
              role="status"
              data-testid="escrow-frozen-indicator"
            >
              🔒 Escrow funds are frozen while this dispute is under review.
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl p-6">
      <h1 className="text-2xl font-bold text-gray-900">Open a Dispute</h1>

      {step === 'details' && (
        <div className="mt-6 space-y-4" data-testid="step-details">
          <div role="group" aria-labelledby="dispute-reason-label">
            <label id="dispute-reason-label" className="block text-sm font-medium text-gray-700">
              Reason
            </label>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {DISPUTE_REASONS.map((r) => (
                <label
                  key={r.value}
                  className={`cursor-pointer rounded-md border p-3 text-sm ${
                    reason === r.value
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200'
                  }`}
                >
                  <input
                    type="radio"
                    name="dispute-reason"
                    value={r.value}
                    checked={reason === r.value}
                    onChange={() => setReason(r.value)}
                    className="mr-2"
                  />
                  {r.label}
                </label>
              ))}
            </div>
          </div>

          <div>
            <label htmlFor="dispute-description" className="block text-sm font-medium text-gray-700">
              Description
            </label>
            <textarea
              id="dispute-description"
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-2 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              placeholder="Describe what happened (minimum 20 characters)"
            />
          </div>

          <button
            type="button"
            onClick={() => setStep('evidence')}
            disabled={!canContinueFromDetails}
            className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-gray-300"
          >
            Continue to Evidence
          </button>
        </div>
      )}

      {step === 'evidence' && (
        <div className="mt-6 space-y-4" data-testid="step-evidence">
          <EvidenceMediaDropzone
            files={files}
            onFilesAdded={addFiles}
            onRemoveFile={removeFile}
            canAddMore={canAddMore}
          />

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setStep('details')}
              className="flex-1 rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700"
            >
              Back
            </button>
            <button
              type="button"
              onClick={() => setStep('review')}
              className="flex-1 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white"
            >
              Review
            </button>
          </div>
        </div>
      )}

      {step === 'review' && (
        <div className="mt-6 space-y-4" data-testid="step-review">
          <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            Filing this dispute will freeze the escrow funds until it is resolved.
          </div>
          <dl className="space-y-2 text-sm">
            <div>
              <dt className="font-medium text-gray-700">Reason</dt>
              <dd className="text-gray-900">
                {DISPUTE_REASONS.find((r) => r.value === reason)?.label}
              </dd>
            </div>
            <div>
              <dt className="font-medium text-gray-700">Description</dt>
              <dd className="text-gray-900">{description}</dd>
            </div>
            <div>
              <dt className="font-medium text-gray-700">Evidence</dt>
              <dd className="text-gray-900">{files.length} file(s) attached</dd>
            </div>
          </dl>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setStep('evidence')}
              disabled={isSubmitting || isUploading}
              className="flex-1 rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 disabled:opacity-50"
            >
              Back
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting || isUploading}
              className="flex-1 rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              {isSubmitting || isUploading ? 'Submitting…' : 'Confirm Dispute'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
