'use client';

import React, { useCallback, useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Globe2,
  Loader2,
  RotateCw,
  ShieldAlert,
  X,
  XCircle,
} from 'lucide-react';
import { useHighValueCargoApproval, formatCountdown } from '@/hooks/useHighValueCargoApproval';
import { SignatureProgressBar } from '@/components/escrow/SignatureProgressBar';
import type {
  CargoRiskLevel,
  HighValueSigner,
  SignerApprovalStatus,
  SubmitHighValueApprovalResponse,
} from '@/types/highValueCargo';

interface HighValueCargoMultiSigModalProps {
  shipmentId: string;
  isOpen: boolean;
  onClose: () => void;
  onSubmitted?: (_response: SubmitHighValueApprovalResponse) => void;
}

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

const RISK_STYLES: Record<CargoRiskLevel, { label: string; className: string }> = {
  medium: { label: 'Medium risk', className: 'bg-yellow-100 text-yellow-800 ring-yellow-200' },
  high: { label: 'High risk', className: 'bg-orange-100 text-orange-800 ring-orange-200' },
  critical: { label: 'Critical risk', className: 'bg-red-100 text-red-800 ring-red-200' },
};

const SIGNER_STATUS: Record<
  SignerApprovalStatus,
  { label: string; className: string; Icon: typeof CheckCircle2 }
> = {
  approved: { label: 'Approved', className: 'bg-emerald-50 text-emerald-700', Icon: CheckCircle2 },
  pending: { label: 'Pending', className: 'bg-gray-100 text-gray-600', Icon: Clock },
  rejected: { label: 'Rejected', className: 'bg-red-50 text-red-700', Icon: XCircle },
};

function formatValue(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
}

function shortenKey(key: string): string {
  return key.length > 12 ? `${key.slice(0, 6)}…${key.slice(-6)}` : key;
}

function SignerRow({ signer }: { signer: HighValueSigner }) {
  const { label, className, Icon } = SIGNER_STATUS[signer.status];
  return (
    <li className="flex items-center justify-between gap-3 py-2.5">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-gray-900">{signer.name}</p>
        <p className="truncate text-xs text-gray-500">
          {signer.role} · <span className="font-mono" title={signer.publicKey}>{shortenKey(signer.publicKey)}</span>
        </p>
      </div>
      <span
        className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${className}`}
      >
        <Icon className="h-3.5 w-3.5" aria-hidden="true" />
        {label}
      </span>
    </li>
  );
}

/**
 * Modal requiring every authorized co-signer to approve a high-value
 * shipment before escrow funds are released or cross-border transit is
 * approved. Traps focus, closes on Escape and blocks submission until all
 * signatures are collected and the high-risk status is acknowledged.
 */
export function HighValueCargoMultiSigModal({
  shipmentId,
  isOpen,
  onClose,
  onSubmitted,
}: HighValueCargoMultiSigModalProps) {
  const titleId = useId();
  const descriptionId = useId();
  const acknowledgeId = useId();
  const submitHintId = useId();
  const panelRef = useRef<HTMLDivElement>(null);

  const {
    approval,
    isLoading,
    error,
    refetch,
    approvedCount,
    requiredSignatures,
    allSignaturesCollected,
    remainingMs,
    isExpired,
    acknowledged,
    setAcknowledged,
    canSubmit,
    isSubmitting,
    submitError,
    submit,
  } = useHighValueCargoApproval(shipmentId, { enabled: isOpen, onSubmitted });

  const requestClose = useCallback(() => {
    if (!isSubmitting) onClose();
  }, [isSubmitting, onClose]);

  // Move focus into the dialog on open and restore it on close.
  useEffect(() => {
    if (!isOpen) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    panelRef.current?.focus();
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = overflow;
      previouslyFocused?.focus?.();
    };
  }, [isOpen]);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.stopPropagation();
      requestClose();
      return;
    }
    if (event.key !== 'Tab' || !panelRef.current) return;

    const focusable = Array.from(
      panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
    );
    if (focusable.length === 0) {
      event.preventDefault();
      return;
    }
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const active = document.activeElement;

    if (event.shiftKey && (active === first || active === panelRef.current)) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
  };

  if (!isOpen || typeof document === 'undefined') return null;

  const submitBlockedReason = !approval
    ? null
    : isExpired
      ? 'The approval window has expired.'
      : !allSignaturesCollected
        ? `Waiting for ${requiredSignatures - approvedCount} more signature${
            requiredSignatures - approvedCount === 1 ? '' : 's'
          }.`
        : !acknowledged
          ? 'Acknowledge the high-risk status to continue.'
          : null;

  const risk = approval ? RISK_STYLES[approval.riskLevel] : null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <div
        className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm"
        aria-hidden="true"
        data-testid="multisig-modal-backdrop"
        onClick={requestClose}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        tabIndex={-1}
        onKeyDown={handleKeyDown}
        className="relative flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl focus:outline-none sm:max-w-lg sm:rounded-2xl"
      >
        <header className="flex items-start gap-3 border-b border-gray-200 px-5 py-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100">
            <ShieldAlert className="h-5 w-5 text-amber-700" aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 id={titleId} className="text-lg font-semibold text-gray-900">
              High-value cargo approval
            </h2>
            <p id={descriptionId} className="text-sm text-gray-600">
              {approval
                ? `Shipment ${approval.trackingNumber} requires ${requiredSignatures} signatures before release.`
                : 'Multiple authorized signatures are required before release.'}
            </p>
          </div>
          <button
            type="button"
            onClick={requestClose}
            disabled={isSubmitting}
            aria-label="Close approval modal"
            className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-50"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </header>

        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5">
          {isLoading && (
            <div
              className="flex flex-col items-center gap-2 py-10 text-gray-500"
              aria-busy="true"
              data-testid="multisig-modal-loading"
            >
              <Loader2 className="h-6 w-6 animate-spin" aria-hidden="true" />
              <span className="text-sm">Loading approval details…</span>
            </div>
          )}

          {!isLoading && !approval && (
            <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" aria-hidden="true" />
                <div>
                  <p className="font-medium text-red-900">Unable to load approval</p>
                  <p className="mt-1 text-sm text-red-700">{error ?? 'Approval details are unavailable.'}</p>
                  <button
                    type="button"
                    onClick={refetch}
                    className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-red-700 underline hover:text-red-800"
                  >
                    <RotateCw className="h-4 w-4" aria-hidden="true" />
                    Retry
                  </button>
                </div>
              </div>
            </div>
          )}

          {approval && risk && (
            <>
              {approval.isCrossBorder && (
                <div
                  role="note"
                  aria-label="Cross-border risk warning"
                  className="flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 p-3"
                >
                  <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" aria-hidden="true" />
                  <div className="text-sm text-amber-900">
                    <p className="font-semibold">Cross-border shipment</p>
                    <p className="mt-0.5">
                      {approval.originCountry} → {approval.destinationCountry}. Customs, currency and
                      compliance checks apply before funds can be released.
                    </p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="rounded-lg border border-gray-200 p-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Shipment value</p>
                  <p className="mt-1 text-xl font-bold tabular-nums text-gray-900">
                    {formatValue(approval.declaredValue, approval.currency)}
                  </p>
                </div>
                <div className="rounded-lg border border-gray-200 p-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Risk classification</p>
                  <span
                    className={`mt-1.5 inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-sm font-semibold ring-1 ring-inset ${risk.className}`}
                  >
                    {risk.label}
                  </span>
                </div>
              </div>

              {approval.riskFactors.length > 0 && (
                <ul className="flex flex-wrap gap-2" aria-label="Risk factors">
                  {approval.riskFactors.map((factor) => (
                    <li
                      key={factor}
                      className="inline-flex items-center gap-1 rounded-md bg-gray-100 px-2 py-1 text-xs text-gray-700"
                    >
                      <Globe2 className="h-3 w-3" aria-hidden="true" />
                      {factor}
                    </li>
                  ))}
                </ul>
              )}

              <div
                className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm ${
                  isExpired ? 'bg-red-50 text-red-800' : 'bg-blue-50 text-blue-900'
                }`}
              >
                <span className="flex items-center gap-2 font-medium">
                  <Clock className="h-4 w-4" aria-hidden="true" />
                  {isExpired ? 'Approval window expired' : 'Time remaining'}
                </span>
                {!isExpired && (
                  <span role="timer" aria-live="off" className="font-mono font-semibold tabular-nums">
                    {formatCountdown(remainingMs)}
                  </span>
                )}
              </div>

              <div>
                <SignatureProgressBar current={approvedCount} required={requiredSignatures} />
                <ul className="mt-3 divide-y divide-gray-100" aria-label="Required signers">
                  {approval.signers.map((signer) => (
                    <SignerRow key={signer.publicKey} signer={signer} />
                  ))}
                </ul>
              </div>

              <div className="flex items-start gap-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
                <input
                  id={acknowledgeId}
                  type="checkbox"
                  checked={acknowledged}
                  onChange={(e) => setAcknowledged(e.target.checked)}
                  disabled={isSubmitting}
                  className="mt-0.5 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor={acknowledgeId} className="text-sm text-gray-700">
                  I acknowledge this shipment is classified as{' '}
                  <strong className="font-semibold">{risk.label.toLowerCase()}</strong> and that releasing
                  funds is irreversible once submitted on-chain.
                </label>
              </div>

              {submitError && (
                <p role="alert" className="text-sm text-red-700">
                  {submitError}
                </p>
              )}
            </>
          )}
        </div>

        <footer className="flex flex-col-reverse gap-2 border-t border-gray-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-end">
          {submitBlockedReason && (
            <p id={submitHintId} className="text-xs text-gray-500 sm:mr-auto">
              {submitBlockedReason}
            </p>
          )}
          <button
            type="button"
            onClick={requestClose}
            disabled={isSubmitting}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={!canSubmit}
            aria-describedby={submitBlockedReason ? submitHintId : undefined}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-600"
          >
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
            {isSubmitting ? 'Submitting…' : 'Approve release'}
          </button>
        </footer>
      </div>
    </div>,
    document.body,
  );
}

export default HighValueCargoMultiSigModal;
