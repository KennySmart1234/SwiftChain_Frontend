'use client';

import { useState, useRef, type ReactElement, type ChangeEvent } from 'react';
import { AlertCircle, Upload, X, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { ModalFocusTrap } from '@/components/shared/ModalFocusTrap';
import {
  useDisputeForm,
  DisputeFormData,
  OpenDisputeResponse,
} from '@/hooks/useDisputeForm';

interface DisputeFormProps {
  deliveryId: string;
  walletAddress: string;
  onSuccess?: (response: OpenDisputeResponse) => void;
}

type FormStep = 'dispute_reason' | 'evidence' | 'confirmation' | 'success';

const DISPUTE_REASONS = [
  {
    value: 'damaged_items',
    label: 'Items Damaged',
    description: 'Items arrived damaged or broken',
  },
  {
    value: 'non_delivery',
    label: 'Non-Delivery',
    description: 'Items were not delivered',
  },
  {
    value: 'incorrect_items',
    label: 'Incorrect Items',
    description: 'Wrong items were delivered',
  },
  {
    value: 'other',
    label: 'Other Issue',
    description: 'Something else went wrong',
  },
] as const;

/**
 * Confirmation Dialog Component - warns about funds being frozen
 */
function ConfirmationDialog({
  isOpen,
  reason,
  description,
  onConfirm,
  onCancel,
  isSubmitting,
}: {
  isOpen: boolean;
  reason: string;
  description: string;
  onConfirm: () => void;
  onCancel: () => void;
  isSubmitting: boolean;
}): ReactElement {
  const modalRef = useRef<HTMLDivElement>(null);

  const reasonLabel =
    DISPUTE_REASONS.find((r) => r.value === reason)?.label || reason;

  return (
    <>
      {/* Backdrop overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget && !isSubmitting) onCancel();
          }}
        />
      )}

      {/* Modal with focus trap */}
      <ModalFocusTrap
        ref={modalRef}
        id="dispute-confirmation-modal"
        isOpen={isOpen}
        onClose={onCancel}
        ariaLabelledBy="confirmation-modal-title"
        className="fixed inset-0 z-50 flex items-center justify-center px-4"
      >
        <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 mx-auto mb-4">
          <AlertCircle className="h-8 w-8 text-amber-600" />
        </div>

        <h2
          id="confirmation-modal-title"
          className="text-center text-lg font-semibold text-gray-900 mb-2"
        >
          Confirm Dispute
        </h2>
        <p className="text-center text-sm text-gray-600 mb-6">
          Opening a dispute will freeze the escrow funds during arbitration.
          Confirm your dispute details below.
        </p>

        <div className="rounded-xl border border-amber-100 bg-amber-50 p-4 mb-6 space-y-3">
          <div>
            <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
              Dispute Reason
            </p>
            <p className="text-sm font-medium text-gray-900 mt-1">
              {reasonLabel}
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
              Description
            </p>
            <p className="text-sm text-gray-700 mt-1 break-words">
              {description}
            </p>
          </div>
        </div>

        <div className="rounded-lg border border-red-200 bg-red-50 p-4 mb-6">
          <p className="text-sm text-red-800">
            <strong>⚠️ Important:</strong> Your funds will be locked in escrow
            during arbitration. You will not be able to withdraw them until the
            dispute is resolved.
          </p>
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="flex-1 px-4 py-2 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isSubmitting}
            className="flex-1 px-4 py-2 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Submitting...
              </>
            ) : (
              'Confirm Dispute'
            )}
          </button>
        </div>
        </div>
      </ModalFocusTrap>
    </>
  );
}

/**
 * Success View - displayed after successful dispute submission
 */
function SuccessView({
  disputeId,
  transactionHash,
}: {
  disputeId?: string;
  transactionHash?: string;
}): ReactElement {
  return (
    <div className="text-center py-12">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100 mx-auto mb-4">
        <CheckCircle2 className="h-8 w-8 text-green-600" />
      </div>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">
        Dispute Submitted
      </h2>
      <p className="text-gray-600 mb-6">
        Your dispute has been successfully opened. The escrow funds are now
        frozen.
      </p>
      {disputeId && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
          <p className="text-sm text-blue-900">
            <strong>Dispute ID:</strong>{' '}
            <code className="font-mono">{disputeId}</code>
          </p>
        </div>
      )}
      {transactionHash && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <p className="text-sm text-gray-700 break-all">
            <strong>Transaction:</strong>{' '}
            <code className="font-mono text-xs">{transactionHash}</code>
          </p>
        </div>
      )}
    </div>
  );
}

/**
 * DisputeForm Component - Multi-step form for opening a delivery dispute
 *
 * Flow:
 * 1. Select dispute reason
 * 2. Upload evidence files
 * 3. Confirmation dialog (warns about frozen funds)
 * 4. Success screen
 */
export default function DisputeForm({
  deliveryId,
  walletAddress,
  onSuccess,
}: DisputeFormProps): ReactElement | null {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    watch,
    setValue,
    reset,
    submitDispute,
  } = useDisputeForm();

  const [currentStep, setCurrentStep] = useState<FormStep>('dispute_reason');
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [successData, setSuccessData] = useState<OpenDisputeResponse | null>(
    null
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectedReason = watch('reason');
  const description = watch('description');
  const transactionId = watch('transactionId');

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const totalFiles = uploadedFiles.length + files.length;

    if (totalFiles > 5) {
      toast.error('Maximum 5 files allowed');
      return;
    }

    const validFiles = files.filter((file) => {
      if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
        toast.error(
          `${file.name} is not a supported format. Use images or PDF.`
        );
        return false;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`${file.name} exceeds 10MB size limit`);
        return false;
      }
      return true;
    });

    setUploadedFiles([...uploadedFiles, ...validFiles]);
    setValue('evidenceFiles', [...uploadedFiles, ...validFiles]);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeFile = (index: number) => {
    const newFiles = uploadedFiles.filter((_, i) => i !== index);
    setUploadedFiles(newFiles);
    setValue('evidenceFiles', newFiles);
  };

  const onSubmit = handleSubmit(async (formData: DisputeFormData) => {
    if (currentStep === 'dispute_reason') {
      setCurrentStep('evidence');
    } else if (currentStep === 'evidence') {
      setCurrentStep('confirmation');
    }
  });

  const handleConfirmDispute = async () => {
    const formData: DisputeFormData = {
      transactionId,
      reason: selectedReason,
      description,
      evidenceFiles: uploadedFiles,
    };

    await submitDispute(
      formData,
      deliveryId,
      walletAddress,
      (response) => {
        setSuccessData(response);
        setCurrentStep('success');
        if (onSuccess) onSuccess(response);
      },
      (error) => {
        setCurrentStep('evidence');
        toast.error(error || 'An unknown error occurred while submitting the dispute.');
      }
    );
  };

  // Step 1: Dispute Reason
  if (currentStep === 'dispute_reason') {
    return (
      <div className="w-full max-w-2xl mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Open a Dispute
          </h1>
          <p className="text-gray-600">
            Step 1 of 3: Select the reason for your dispute
          </p>
        </div>

        <form onSubmit={onSubmit} className="space-y-6">
          {/* Transaction ID */}
          <div>
            <label
              htmlFor="transactionId"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Transaction ID <span className="text-red-500">*</span>
            </label>
            <input
              id="transactionId"
              type="text"
              placeholder="Enter the transaction ID from your escrow"
              {...register('transactionId')}
              className={`w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 ${
                errors.transactionId
                  ? 'border-red-500 focus:ring-red-500'
                  : 'border-gray-300 focus:ring-blue-500'
              }`}
              aria-invalid={!!errors.transactionId}
            />
            {errors.transactionId && (
              <p className="mt-1 text-sm text-red-600" role="alert">
                {errors.transactionId.message}
              </p>
            )}
          </div>

          {/* Dispute Reason */}
          <div role="group" aria-labelledby="dispute-reason-label">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Dispute Reason <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {DISPUTE_REASONS.map((reason) => (
                <label
                  key={reason.value}
                  className={`p-4 rounded-lg border-2 cursor-pointer transition ${
                    selectedReason === reason.value
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="radio"
                    value={reason.value}
                    {...register('reason')}
                    id={`reason-${reason.value}`}
                    className="w-4 h-4 text-blue-600"
                  />
                  <div className="ml-3">
                    <p className="font-medium text-gray-900">{reason.label}</p>
                    <p className="text-sm text-gray-600">
                      {reason.description}
                    </p>
                  </div>
                </label>
              ))}
            </div>
            {errors.reason && (
              <p className="mt-2 text-sm text-red-600" role="alert">
                {errors.reason.message}
              </p>
            )}
          </div>

          {/* Description */}
          <div>
            <label
              htmlFor="description"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Description <span className="text-red-500">*</span>
            </label>
            <textarea
              id="description"
              placeholder="Describe what happened and why you believe a dispute is needed (minimum 20 characters)"
              rows={4}
              {...register('description')}
              className={`w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 ${
                errors.description
                  ? 'border-red-500 focus:ring-red-500'
                  : 'border-gray-300 focus:ring-blue-500'
              }`}
              aria-invalid={!!errors.description}
            />
            <div className="mt-2 flex justify-between">
              {errors.description && (
                <p className="text-sm text-red-600" role="alert">
                  {errors.description.message}
                </p>
              )}
              <p className="text-xs text-gray-500">
                {description?.length || 0}/500
              </p>
            </div>
          </div>

          <div className="flex gap-3 pt-6">
            <button
              type="button"
              onClick={() => reset()}
              className="flex-1 px-4 py-2 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 transition"
            >
              Continue to Evidence
            </button>
          </div>
        </form>
      </div>
    );
  }

  // Step 2: Evidence Upload
  if (currentStep === 'evidence') {
    return (
      <div className="w-full max-w-2xl mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Upload Evidence
          </h1>
          <p className="text-gray-600">
            Step 2 of 3: Attach photo evidence to support your dispute
          </p>
        </div>

        <form onSubmit={onSubmit} className="space-y-6">
          {/* File Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Evidence Files{' '}
              <span className="text-gray-500">(optional, max 5 files)</span>
            </label>

            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-500 transition">
              <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
              <p className="text-sm font-medium text-gray-900 mb-1">
                Click to upload or drag and drop
              </p>
              <p className="text-xs text-gray-500">
                Images or PDF (max 10MB per file)
              </p>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*,.pdf"
                onChange={handleFileUpload}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="mt-4 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition text-sm font-medium"
              >
                Choose Files
              </button>
            </div>

            {/* Uploaded Files List */}
            {uploadedFiles.length > 0 && (
              <div className="mt-4 space-y-2">
                <p className="text-sm font-medium text-gray-900">
                  Uploaded Files ({uploadedFiles.length})
                </p>
                {uploadedFiles.map((file, index) => (
                  <div
                    key={`${file.name}-${index}`}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {file.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFile(index)}
                      className="ml-3 p-1 text-red-500 hover:bg-red-50 rounded transition"
                      aria-label={`Remove ${file.name}`}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-6">
            <button
              type="button"
              onClick={() => setCurrentStep('dispute_reason')}
              className="flex-1 px-4 py-2 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition"
            >
              Back
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 transition"
            >
              Review & Confirm
            </button>
          </div>
        </form>
      </div>
    );
  }

  // Step 3: Confirmation
  if (currentStep === 'confirmation') {
    return (
      <ConfirmationDialog
        isOpen={currentStep === 'confirmation'}
        reason={selectedReason}
        description={description}
        onConfirm={handleConfirmDispute}
        onCancel={() => setCurrentStep('evidence')}
        isSubmitting={isSubmitting}
      />
    );
  }

  // Step 4: Success
  if (currentStep === 'success') {
    return (
      <div className="w-full max-w-2xl mx-auto p-6">
        <SuccessView
          disputeId={successData?.disputeId}
          transactionHash={successData?.transactionHash}
        />
      </div>
    );
  }

  return null;
}
