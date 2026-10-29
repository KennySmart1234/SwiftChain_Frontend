'use client';

import { MapPin, Navigation, Package, TrendingUp, X } from 'lucide-react';
import { useRef } from 'react';
import { DeliveryJob } from '@/services/driverJobService';
import { ModalFocusTrap } from '@/components/shared/ModalFocusTrap';

interface AcceptJobModalProps {
  job: DeliveryJob;
  isAccepting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * AcceptJobModal — confirmation dialog before a driver accepts a delivery.
 * Shows full job details and requires an explicit confirm action.
 * 
 * Now uses ModalFocusTrap for WCAG 2.1 keyboard accessibility:
 * - Tab cycles only within the modal (never reaching background)
 * - Escape key closes the modal
 * - Proper ARIA attributes applied
 */
export function AcceptJobModal({
  job,
  isAccepting,
  onConfirm,
  onCancel,
}: AcceptJobModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const isOpen = !!job; // Modal is open if job is provided

  return (
    <>
      {/* Backdrop overlay - outside ModalFocusTrap to allow click detection */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/50"
          onClick={(e) => {
            // Only close if clicking directly on backdrop (not modal)
            if (e.target === e.currentTarget) {
              onCancel();
            }
          }}
        />
      )}
      
      {/* Focus trap wrapper with WCAG-compliant keyboard handling */}
      <ModalFocusTrap
        ref={modalRef}
        id="accept-job-modal"
        isOpen={isOpen}
        onClose={onCancel}
        ariaLabelledBy="accept-job-title"
        className="fixed inset-0 z-50 flex items-center justify-center px-4"
      >
        <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-900">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2
            id="accept-job-title"
            className="text-lg font-semibold text-gray-900 dark:text-white"
          >
            Confirm Job
          </h2>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-full p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Review the delivery details before accepting.
        </p>

        {/* Job details */}
        <div className="mt-4 space-y-3 rounded-xl bg-gray-50 p-4 dark:bg-gray-800">
          <div className="flex items-start gap-2">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" />
            <div>
              <p className="text-xs text-gray-500">Pickup</p>
              <p className="text-sm font-medium">{job.pickupAddress}</p>
            </div>
          </div>

          <div className="flex items-start gap-2">
            <Navigation className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
            <div>
              <p className="text-xs text-gray-500">Drop-off</p>
              <p className="text-sm font-medium">{job.dropoffAddress}</p>
            </div>
          </div>

          <div className="flex items-start gap-2">
            <Package className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
            <div>
              <p className="text-xs text-gray-500">Package</p>
              <p className="text-sm font-medium">{job.packageDescription}</p>
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-gray-200 pt-3 dark:border-gray-700">
            <span className="flex items-center gap-1.5 text-sm text-gray-500">
              <TrendingUp className="h-4 w-4" />
              {job.estimatedDistance} km
            </span>
            <span className="text-base font-bold text-primary">
              {job.estimatedEarnings.toFixed(2)} XLM
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-5 flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={isAccepting}
            className="flex-1 rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isAccepting}
            className="flex-1 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isAccepting ? 'Accepting…' : 'Yes, Accept Job'}
          </button>
        </div>
        </div>
      </ModalFocusTrap>
    </>
  );
}