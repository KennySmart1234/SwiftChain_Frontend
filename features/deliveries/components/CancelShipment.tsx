'use client';

import { useState, useRef } from 'react';
import { useCancelShipment } from '@/hooks/useCancelShipment';
import { ModalFocusTrap } from '@/components/shared/ModalFocusTrap';

interface CancelShipmentProps {
  shipmentId: string;
}

/**
 * CancelShipment
 *
 * Renders a "Cancel Request" button for senders, but ONLY when:
 *   1. The shipment is still in `pending` status, AND
 *   2. No driver has been assigned to it yet.
 *
 * Clicking the button opens a confirmation modal that warns the user
 * about escrow refund timing before the cancellation is dispatched.
 *
 * This component is purely presentational; all data fetching, rule
 * evaluation, and mutation work lives in `useCancelShipment` and
 * ultimately in `shipmentService`.
 */
export function CancelShipment({ shipmentId }: CancelShipmentProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const {
    canCancel,
    isLoadingShipment,
    isShipmentError,
    isCancelling,
    cancel,
  } = useCancelShipment(shipmentId);

  if (isLoadingShipment) {
    return (
      <p className="text-sm text-secondary" role="status">
        Loading shipment...
      </p>
    );
  }

  if (isShipmentError) {
    return (
      <p
        className="text-sm text-red-600 dark:text-red-400"
        role="alert"
      >
        Unable to load shipment details.
      </p>
    );
  }

  // Acceptance criterion: button must NOT render if a driver is already
  // assigned (or the shipment is no longer pending).
  if (!canCancel) {
    return null;
  }

  const handleConfirm = () => {
    cancel();
    setIsModalOpen(false);
  };

  const modalRef = useRef<HTMLDivElement>(null);

  return (
    <div className="mt-4">
      <button
        type="button"
        onClick={() => setIsModalOpen(true)}
        disabled={isCancelling}
        data-testid="cancel-request-button"
        className="px-4 py-2 rounded-md bg-red-600 text-white text-sm font-medium hover:bg-red-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
      >
        {isCancelling ? 'Cancelling...' : 'Cancel Request'}
      </button>

      {/* Backdrop overlay */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/50"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsModalOpen(false);
          }}
        />
      )}

      {/* Modal with focus trap */}
      <ModalFocusTrap
        ref={modalRef}
        id="cancel-shipment-modal"
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        ariaLabelledBy="cancel-shipment-title"
        ariaDescribedBy="cancel-shipment-description"
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
      >
        <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl dark:bg-neutral-900">
            <h2
              id="cancel-shipment-title"
              className="text-lg font-semibold text-neutral-900 dark:text-neutral-50"
            >
              Cancel this shipment?
            </h2>

            <p
              id="cancel-shipment-description"
              className="mt-3 text-sm text-neutral-700 dark:text-neutral-300"
            >
              You&apos;re about to cancel an unassigned shipment.
              <br />
              <strong>Escrow refund timing:</strong> your locked funds will
              be released back to your wallet automatically, but the on-chain
              refund can take{' '}
              <strong>a few minutes to complete</strong> depending on
              Stellar network conditions. This action cannot be undone.
            </p>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                disabled={isCancelling}
                data-testid="cancel-modal-dismiss"
                className="px-4 py-2 rounded-md border border-neutral-300 text-sm font-medium text-neutral-700 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-800"
              >
                Keep shipment
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={isCancelling}
                data-testid="cancel-modal-confirm"
                className="px-4 py-2 rounded-md bg-red-600 text-white text-sm font-medium hover:bg-red-700 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isCancelling ? 'Cancelling...' : 'Yes, cancel'}
              </button>
            </div>
          </div>
        </ModalFocusTrap>
    </div>
  );
}
