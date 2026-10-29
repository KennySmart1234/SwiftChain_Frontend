'use client';

import { Loader2 } from 'lucide-react';
import { useEscrowPayout } from '@/hooks/useEscrowPayout';
import { SignatureProgressBar } from './SignatureProgressBar';
import { SignerList } from './SignerList';
import { PayoutFeeBreakdown } from './PayoutFeeBreakdown';


interface PayoutUIProps {
  escrowId: string;
}

export function PayoutUI({ escrowId }: PayoutUIProps) {
  const {
    isLoading,
    error,
    requiredSignatures,
    currentSignatures,
    signers,
    canRelease,
    releaseFunds,
    feeBreakdown,
    isFeeBreakdownLoading,
    feeBreakdownError,
  } = useEscrowPayout(escrowId);

  if (isLoading) {
    return (
      <div className="p-4 border rounded-md flex items-center justify-center h-48" aria-label="Loading payout UI">
        <div className="flex flex-col items-center gap-2 text-gray-500">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span className="text-sm">Loading Escrow Details...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div role="alert" className="p-4 border rounded-md border-red-200 bg-red-50 text-red-700">
        <h3 className="font-semibold">Error Loading Payout Information</h3>
        <p className="text-sm mt-1">{error}</p>
      </div>
    );
  }

  return (
    <div className="p-6 border rounded-lg shadow-sm bg-white dark:bg-gray-900 dark:border-gray-700">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Escrow Payout</h2>
      <SignatureProgressBar
        current={currentSignatures}
        required={requiredSignatures}
      />
      <SignerList signers={signers} requiredSignatures={requiredSignatures} />
      <PayoutFeeBreakdown
        breakdown={feeBreakdown}
        isLoading={isFeeBreakdownLoading}
        error={feeBreakdownError}
      />
      <button
        onClick={() => void releaseFunds()}
        disabled={!canRelease || isLoading}
        className={[
          'mt-6 w-full px-4 py-2.5 rounded-lg font-semibold text-white transition-all duration-150 flex items-center justify-center gap-2',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-900',
          !canRelease || isLoading
            ? 'bg-gray-400 cursor-not-allowed dark:bg-gray-600'
            : 'bg-blue-600 hover:bg-blue-700 active:scale-[0.99]',
        ].join(' ')}
      >
        {isLoading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Processing...
          </>
        ) : (
          'Release Funds'
        )}
      </button>
    </div>
  );
}
