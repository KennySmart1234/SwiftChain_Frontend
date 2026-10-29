// @ts-nocheck
'use client';

import clsx from 'clsx';
import { useEffect, useRef } from 'react';
import { useEscrowRelease, ReleaseStep } from '@/hooks/useEscrowRelease';
import { useWalletStore } from '@/store/walletStore';
import { ModalFocusTrap } from '@/components/shared/ModalFocusTrap';

// ─── Props ────────────────────────────────────────────────────────────────────

interface EscrowReleaseProps {
  escrowId: string;
  deliveryId: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STEP_LABEL: Record<ReleaseStep, string> = {
  idle: 'Confirm Delivery & Release Payment',
  confirming: 'Confirm Delivery & Release Payment',
  signing: 'Waiting for wallet approval…',
  releasing: 'Releasing payment…',
  done: 'Payment Released ✓',
};

const STEP_DESCRIPTION: Record<ReleaseStep, string> = {
  idle: 'Releasing payment will transfer the locked escrow funds to the driver. This action cannot be undone.',
  confirming: 'Are you sure you want to confirm delivery and release the escrowed payment to the driver?',
  signing: 'Your wallet is requesting your approval. Please check your wallet and approve the transaction.',
  releasing: 'Transaction submitted — waiting for blockchain confirmation…',
  done: 'The escrowed funds have been successfully released to the driver.',
};

function StatusIcon({ step }: { step: ReleaseStep }) {
  if (step === 'done') {
    return (
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100 mx-auto mb-4">
        <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </div>
    );
  }
  if (step === 'signing' || step === 'releasing') {
    return (
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-50 mx-auto mb-4">
        <svg className="h-8 w-8 text-blue-500 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
        </svg>
      </div>
    );
  }
  return (
    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 mx-auto mb-4">
      <svg className="h-8 w-8 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m0 0v2m0-2h2m-2 0H10m2-6V7m0 0V5m0 2h2m-2 0H10M4.93 4.93l14.14 14.14" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4" />
      </svg>
    </div>
  );
}

// ─── Confirmation Modal ───────────────────────────────────────────────────────

interface ConfirmModalProps {
  isOpen: boolean;
  escrowId: string;
  deliveryId: string;
  walletAddress: string;
  amount?: string;
  currency?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * ConfirmModal — WCAG 2.1 compliant confirmation dialog for escrow release
 * Uses ModalFocusTrap for keyboard accessibility:
 * - Tab cycles only within the modal
 * - Escape key closes the modal
 * - Proper ARIA attributes applied
 */
function ConfirmModal({
  isOpen,
  amount,
  currency,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);

  return (
    <>
      {/* Backdrop overlay - outside ModalFocusTrap for click detection */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) onCancel();
          }}
        />
      )}

      {/* Focus trap wrapper with WCAG-compliant keyboard handling */}
      <ModalFocusTrap
        ref={modalRef}
        id="escrow-confirm-modal"
        isOpen={isOpen}
        onClose={onCancel}
        ariaLabelledBy="escrow-modal-title"
        className="fixed inset-0 z-50 flex items-center justify-center px-4"
      >
        <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 mx-auto mb-4">
          <svg className="h-7 w-7 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          </svg>
        </div>

        <h2 id="escrow-modal-title" className="text-center text-lg font-semibold text-gray-900 mb-1">
          Confirm Delivery & Release Payment
        </h2>
        <p className="text-center text-sm text-gray-500 mb-5">
          This will release{' '}
          <span className="font-medium text-gray-900">
            {amount && currency ? `${amount} ${currency}` : 'the escrowed funds'}
          </span>{' '}
          to the driver. This action cannot be undone.
        </p>

        <div className="rounded-xl border border-gray-100 bg-gray-50 p-4 mb-5 space-y-1 text-sm">
          <div className="flex justify-between text-gray-600">
            <span>Action</span>
            <span className="font-medium text-gray-900">Release escrow</span>
          </div>
          {amount && currency && (
            <div className="flex justify-between text-gray-600">
              <span>Amount</span>
              <span className="font-medium text-gray-900">{amount} {currency}</span>
            </div>
          )}
          <div className="flex justify-between text-gray-600">
            <span>Recipient</span>
            <span className="font-medium text-gray-900">Driver</span>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 rounded-xl border border-gray-200 bg-white py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-300"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 rounded-xl bg-green-600 py-2.5 text-sm font-medium text-white transition hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
          >
            Yes, Release Payment
          </button>
        </div>
        </div>
      </ModalFocusTrap>
    </>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

/**
 * EscrowRelease — allows a recipient to confirm delivery and release the
 * escrowed payment to the driver.
 *
 * Follows the strict Component → Hook → Service layered architecture.
 */
export function EscrowRelease({ escrowId, deliveryId }: EscrowReleaseProps) {
  const address = useWalletStore((s) => s.address);
  const isConnected = useWalletStore((s) => s.isConnected);

  const {
    escrowDetails,
    step,
    isLoading,
    transactionHash,
    fetchEscrowDetails,
    openConfirmDialog,
    confirmAndRelease,
    reset,
  } = useEscrowRelease();

  useEffect(() => {
    fetchEscrowDetails(escrowId);
  }, [escrowId, fetchEscrowDetails]);

  const isActionDisabled =
    !isConnected ||
    !address ||
    step !== 'idle' ||
    escrowDetails?.status !== 'locked';

  const handleMainButtonClick = () => {
    openConfirmDialog(escrowId, deliveryId, address ?? '');
  };

  const handleConfirm = () => {
    confirmAndRelease(escrowId, deliveryId, address ?? '');
  };

  const handleCancel = () => {
    reset();
  };

  // ── Loading state ──────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="animate-pulse space-y-3">
          <div className="h-4 w-1/3 rounded bg-gray-100" />
          <div className="h-3 w-2/3 rounded bg-gray-100" />
          <div className="h-10 w-full rounded-xl bg-gray-100" />
        </div>
      </div>
    );
  }

  // ── Not connected ──────────────────────────────────────────────────────────
  if (!isConnected) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-center">
        <p className="text-sm font-medium text-amber-800">
          Connect your wallet to release the escrow payment.
        </p>
      </div>
    );
  }

  // ── Already released ───────────────────────────────────────────────────────
  if (escrowDetails?.status === 'released') {
    return (
      <div className="rounded-2xl border border-green-200 bg-green-50 p-6 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100 mx-auto mb-3">
          <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <p className="text-sm font-semibold text-green-800">Payment Already Released</p>
        <p className="mt-1 text-xs text-green-600">The escrowed funds have been sent to the driver.</p>
      </div>
    );
  }

  // ── Main UI ────────────────────────────────────────────────────────────────
  return (
    <>
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm space-y-5">
        {/* Header */}
        <div>
          <h3 className="text-base font-semibold text-gray-900">Release Escrow Payment</h3>
          <p className="mt-1 text-sm text-gray-500">
            Confirm the delivery was received to release payment to the driver.
          </p>
        </div>

        {/* Escrow summary */}
        {escrowDetails && (
          <div className="rounded-xl border border-gray-100 bg-gray-50 p-4 space-y-2 text-sm">
            <div className="flex justify-between text-gray-600">
              <span>Escrow ID</span>
              <span className="font-mono font-medium text-gray-900 text-xs">
                {escrowDetails.id.slice(0, 12)}…
              </span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Amount</span>
              <span className="font-semibold text-gray-900">
                {escrowDetails.amount} {escrowDetails.currency}
              </span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Status</span>
              <span className={clsx(
                'rounded-full px-2 py-0.5 text-xs font-medium',
                {
                  'bg-blue-100 text-blue-700': escrowDetails.status === 'locked',
                  'bg-green-100 text-green-700': escrowDetails.status === 'released',
                  'bg-red-100 text-red-700': escrowDetails.status !== 'locked' && escrowDetails.status !== 'released',
                }
              )}>
                {escrowDetails.status.charAt(0).toUpperCase() + escrowDetails.status.slice(1)}
              </span>
            </div>
          </div>
        )}

        {/* In-progress status */}
        {(step === 'signing' || step === 'releasing') && (
          <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 text-center">
            <StatusIcon step={step} />
            <p className="text-sm font-medium text-blue-800">{STEP_LABEL[step]}</p>
            <p className="mt-1 text-xs text-blue-600">{STEP_DESCRIPTION[step]}</p>
          </div>
        )}

        {/* Done state */}
        {step === 'done' && (
          <div className="rounded-xl border border-green-100 bg-green-50 p-4 text-center">
            <StatusIcon step="done" />
            <p className="text-sm font-semibold text-green-800">Payment Released!</p>
            {transactionHash && (
              <p className="mt-1 text-xs text-green-600 font-mono break-all">
                Tx: {transactionHash}
              </p>
            )}
          </div>
        )}

        {/* Main action button */}
        <button
          onClick={handleMainButtonClick}
          disabled={isActionDisabled}
          aria-busy={step === 'signing' || step === 'releasing'}
          className={clsx(
            'w-full rounded-xl py-3 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-offset-2',
            {
              'bg-green-100 text-green-700 cursor-not-allowed': step === 'done',
              'bg-gray-100 text-gray-400 cursor-not-allowed': isActionDisabled && step !== 'done',
              'bg-green-600 text-white hover:bg-green-700 focus:ring-green-500 active:scale-[0.98]': !isActionDisabled && step !== 'done',
            }
          )}
        >
          {STEP_LABEL[step]}
        </button>

        {/* Wallet address display */}
        {address && (
          <p className="text-center text-xs text-gray-400">
            Wallet:{' '}
            <span className="font-mono">
              {address.slice(0, 6)}…{address.slice(-4)}
            </span>
          </p>
        )}
      </div>

      {/* Confirmation modal — rendered when step === 'confirming' */}
      <ConfirmModal
        isOpen={step === 'confirming'}
        escrowId={escrowId}
        deliveryId={deliveryId}
        walletAddress={address ?? ''}
        amount={escrowDetails?.amount}
        currency={escrowDetails?.currency}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    </>
  );
}