'use client';

import React, { useEffect, useState } from 'react';
import { useMultiSigApprovals, type MultiSigOperation } from '@/hooks/useMultiSigApprovals';
import { useWalletStore } from '@/store/walletStore';
import { toast } from 'sonner';
import { CheckCircle, AlertCircle, Clock, Loader, RotateCw, ShieldAlert } from 'lucide-react';

interface SignerRowProps {
  publicKey: string;
  weight: number;
  approved: boolean;
}

const SignerRow: React.FC<SignerRowProps> = ({ publicKey, weight, approved }) => {
  const shortKey = `${publicKey.slice(0, 8)}...${publicKey.slice(-8)}`;

  return (
    <div className="flex items-center justify-between py-2 border-b last:border-b-0">
      <span className="text-sm font-mono text-gray-600">{shortKey}</span>
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-500">Weight: {weight}</span>
        {approved && <CheckCircle className="w-4 h-4 text-green-500" />}
      </div>
    </div>
  );
};

interface SignatureProgressBarProps {
  current: number;
  required: number;
}

const SignatureProgressBar: React.FC<SignatureProgressBarProps> = ({ current, required }) => {
  const percentage = Math.min((current / required) * 100, 100);
  const isComplete = current >= required;

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-700">Signatures: {current} / {required}</span>
        <span className={`text-sm font-semibold ${isComplete ? 'text-green-600' : 'text-blue-600'}`}>
          {Math.round(percentage)}%
        </span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
        <div
          className={`h-full transition-all duration-300 ${isComplete ? 'bg-green-500' : 'bg-blue-500'}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};

interface OperationStatusBadgeProps {
  status: string;
  expiresAt?: string;
}

const OperationStatusBadge: React.FC<OperationStatusBadgeProps> = ({ status, expiresAt }) => {
  const statusConfig = {
    pending: { color: 'bg-yellow-100 text-yellow-800', icon: Clock },
    signed: { color: 'bg-green-100 text-green-800', icon: CheckCircle },
    expired: { color: 'bg-red-100 text-red-800', icon: AlertCircle },
    rejected: { color: 'bg-red-100 text-red-800', icon: AlertCircle },
  };

  const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
  const Icon = config.icon;

  const label = status.charAt(0).toUpperCase() + status.slice(1);

  return (
    <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
      <Icon className="w-3 h-3" />
      {label}
    </div>
  );
};

interface OperationCardProps {
  operationId: string;
  description: string;
  signaturesRequired: number;
  currentSignatures: number;
  signers: Array<{ publicKey: string; weight: number; approved: boolean }>;
  status: string;
  expiresAt: string;
  isSigning: boolean;
  onSign: () => void;
  canSign: boolean;
  isHighValue: boolean;
}

const OperationCard: React.FC<OperationCardProps> = ({
  operationId,
  description,
  signaturesRequired,
  currentSignatures,
  signers,
  status,
  expiresAt,
  isSigning,
  onSign,
  canSign,
  isHighValue,
}) => {
   
  const daysUntilExpiry = Math.ceil(
    // eslint-disable-next-line react-hooks/purity
    (new Date(expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );

  const isExpiringSoon = daysUntilExpiry <= 2 && daysUntilExpiry > 0;
  const isExpired = daysUntilExpiry <= 0;

  const getButtonLabel = () => {
    if (isSigning) return 'Signing...';
    if (currentSignatures >= signaturesRequired) return 'All signatures collected';
    if (status === 'expired') return 'Cannot sign (expired)';
    if (!canSign && status === 'pending') return 'You have signed this';
    return 'Sign Operation';
  };

  const getButtonStyle = () => {
    if (currentSignatures >= signaturesRequired)
      return 'bg-green-500 text-white cursor-default';
    if (status === 'expired') return 'bg-gray-400 text-gray-200 cursor-not-allowed';
    if (!canSign) return 'bg-blue-100 text-blue-700 cursor-default';
    return 'bg-blue-500 text-white hover:bg-blue-600';
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 mb-4 shadow-sm">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900">{description}</h3>
          {isHighValue && (
            <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800">
              <ShieldAlert className="h-3 w-3" aria-hidden="true" />
              High value
            </span>
          )}
          <p className="text-sm text-gray-500 font-mono mt-1">{operationId}</p>
        </div>
        <OperationStatusBadge status={status} expiresAt={expiresAt} />
      </div>

      <div className="mb-4">
        <SignatureProgressBar current={currentSignatures} required={signaturesRequired} />
      </div>

      <div className="mb-4 p-3 bg-gray-50 rounded-lg">
        <h4 className="text-sm font-medium text-gray-700 mb-2">Signers</h4>
        <div className="space-y-1">
          {signers.map((signer) => (
            <SignerRow
              key={signer.publicKey}
              publicKey={signer.publicKey}
              weight={signer.weight}
              approved={signer.approved}
            />
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-600">
          {isExpired ? (
            <span className="text-red-600 font-medium">Expired</span>
          ) : isExpiringSoon ? (
            <span className="text-orange-600 font-medium">
              Expires in {daysUntilExpiry} day{daysUntilExpiry !== 1 ? 's' : ''}
            </span>
          ) : (
            <span>Expires in {daysUntilExpiry} days</span>
          )}
        </div>
        <button
          onClick={onSign}
          disabled={!canSign || isSigning || isExpired || currentSignatures >= signaturesRequired}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${getButtonStyle()}`}
        >
          {isSigning && <Loader className="inline mr-2 w-4 h-4 animate-spin" />}
          {getButtonLabel()}
        </button>
      </div>
    </div>
  );
};

interface EmptyStateProps {
  message: string;
}

const EmptyState: React.FC<EmptyStateProps> = ({ message }) => (
  <div className="text-center py-12">
    <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
    <h3 className="text-lg font-semibold text-gray-900 mb-2">No Pending Approvals</h3>
    <p className="text-gray-600 font-medium">All multi-signature operations are up to date</p>
  </div>
);

interface ErrorStateProps {
  error: string;
  onRetry: () => void;
}

const ErrorState: React.FC<ErrorStateProps> = ({ error, onRetry }) => (
  <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
    <div className="flex items-start gap-3">
      <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
      <div className="flex-1">
        <h4 className="font-medium text-red-900">Failed to load operations</h4>
        <p className="text-sm text-red-700 mt-1">{error}</p>
        <button
          onClick={onRetry}
          className="mt-2 text-sm font-medium text-red-600 hover:text-red-700 underline"
        >
          Retry
        </button>
      </div>
    </div>
  </div>
);

interface MultiSigApprovalsProps {
  // Fix applied here: Allow onSignSuccess to accept an operationId parameter
  onSignSuccess?: (operationId: string) => void;
  /** Called when a high-value operation must go through the high-value approval modal. */
  onHighValueOperation?: (operation: MultiSigOperation) => void;
}

const MultiSigApprovals: React.FC<MultiSigApprovalsProps> = ({ onSignSuccess, onHighValueOperation }) => {
  const wallet = useWalletStore();
  const walletAddress = wallet?.address;
  const { operations, isLoading, error, isSigning, fetchPendingOperations, signOperation, refreshOperations } =
    useMultiSigApprovals({ onHighValueOperation });

  const [userPublicKey, setUserPublicKey] = useState<string | null>(null);

  useEffect(() => {
    // Load user's public key from Freighter if connected
    const loadPublicKey = async () => {
      try {
        // This would come from the Freighter wallet integration
        // For now, we'll rely on operations data to determine if user can sign
      } catch (err) {
        console.log('Could not load public key');
      }
    };

    if (walletAddress) {
      loadPublicKey();
      fetchPendingOperations(walletAddress);
    }
  }, [walletAddress, fetchPendingOperations]);

  if (!walletAddress) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-blue-900 font-medium">Connect your wallet to view pending approvals</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Loader className="w-6 h-6 text-blue-500 animate-spin mb-3" />
        <div className="text-sm font-medium text-gray-700">Loading pending approvals</div>
      </div>
    );
  }

  if (error) {
    return (
      <ErrorState
        error={error}
        onRetry={() => walletAddress && (typeof refreshOperations === 'function' ? refreshOperations(walletAddress) : fetchPendingOperations(walletAddress))}
      />
    );
  }

  if (operations.length === 0) {
    return <EmptyState message="No pending approvals" />;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-gray-900">Pending Approvals ({operations.length})</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => walletAddress && refreshOperations(walletAddress)}
            className="px-3 py-1 rounded-md text-sm bg-gray-100 hover:bg-gray-200"
          >
            Refresh
          </button>
        </div>
      </div>
      <div className="space-y-4">
        {operations.map((operation) => {
          // Check if current user has already signed (match by public key)
          const userHasSigned = operation.signers.some((s) => s.publicKey === walletAddress && s.approved);
          const canSign = !userHasSigned && operation.status === 'pending';

          return (
            <OperationCard
              key={operation.operationId}
              operationId={operation.operationId}
              description={operation.description}
              signaturesRequired={operation.signaturesRequired}
              currentSignatures={operation.currentSignatures}
              signers={operation.signers}
              status={operation.status}
              expiresAt={operation.expiresAt}
              isSigning={isSigning}
              onSign={async () => {
                const signed = await signOperation(operation);
                if (signed) onSignSuccess?.(operation.operationId);
              }}
              canSign={canSign}
              isHighValue={operation.isHighValue}
            />
          );
        })}
      </div>
    </div>
  );
};

export default MultiSigApprovals;