import { useState, useCallback, useEffect, useRef } from 'react';
import { walletService } from '@/services/walletService';
import { freighterService } from '@/services/freighterService';
import { toast } from 'sonner';
import type {
  MultiSigOperation,
  MultiSigRiskLevel,
  PendingMultiSigOperation,
} from '@/types/multiSig';

export type {
  Signer,
  PendingMultiSigOperation,
  MultiSigOperation,
  MultiSigRiskLevel,
} from '@/types/multiSig';

/** Operations moving at least this much XLM require the high-value approval modal. */
export const DEFAULT_HIGH_VALUE_THRESHOLD_XLM = 10000;

/** Share of the threshold at which an operation is reported as medium risk. */
const MEDIUM_RISK_RATIO = 0.5;

function resolveThreshold(threshold?: number): number {
  if (threshold !== undefined && Number.isFinite(threshold) && threshold > 0) return threshold;
  const fromEnv = Number(process.env.NEXT_PUBLIC_MULTISIG_HIGH_VALUE_THRESHOLD_XLM);
  return Number.isFinite(fromEnv) && fromEnv > 0 ? fromEnv : DEFAULT_HIGH_VALUE_THRESHOLD_XLM;
}

/**
 * Annotates an operation with its risk level. Operations without a known XLM
 * amount stay on the standard signing flow.
 */
export function assessOperationRisk(
  operation: PendingMultiSigOperation,
  thresholdXlm: number = DEFAULT_HIGH_VALUE_THRESHOLD_XLM,
): MultiSigOperation {
  const amount = operation.amountXlm;
  let riskLevel: MultiSigRiskLevel = 'low';

  if (typeof amount === 'number' && Number.isFinite(amount)) {
    if (amount >= thresholdXlm) riskLevel = 'high';
    else if (amount >= thresholdXlm * MEDIUM_RISK_RATIO) riskLevel = 'medium';
  }

  return { ...operation, isHighValue: riskLevel === 'high', riskLevel };
}

export interface UseMultiSigApprovalsOptions {
  /**
   * XLM amount at which an operation is treated as high value. Defaults to
   * NEXT_PUBLIC_MULTISIG_HIGH_VALUE_THRESHOLD_XLM, then 10000 XLM.
   */
  highValueThresholdXlm?: number;
  /** Called when a high-value operation needs the dedicated approval modal. */
  onHighValueOperation?: (operation: MultiSigOperation) => void;
}

export interface UseMultiSigApprovalsState {
  operations: MultiSigOperation[];
  isLoading: boolean;
  error: string | null;
  isSigning: boolean;
  highValueThresholdXlm: number;
  /** High-value operation waiting for confirmation in the approval modal. */
  pendingHighValueOperation: MultiSigOperation | null;
}

export interface UseMultiSigApprovalsActions {
  fetchPendingOperations: (walletAddress: string) => Promise<void>;
  /**
   * Signs a standard operation. High-value operations are held for
   * confirmation instead. Resolves to `true` only when a signature was submitted.
   */
  signOperation: (operation: PendingMultiSigOperation) => Promise<boolean>;
  /** Signs the held high-value operation once the approval modal is confirmed. */
  confirmHighValueOperation: () => Promise<boolean>;
  /** Discards the held high-value operation without signing. */
  cancelHighValueOperation: () => void;
  refreshOperations: (walletAddress: string) => Promise<void>;
}

export type UseMultiSigApprovalsReturn = UseMultiSigApprovalsState & UseMultiSigApprovalsActions;

/**
 * Hook for managing multi-signature operations and approvals
 * Handles fetching pending operations and submitting signatures
 */
export function useMultiSigApprovals(
  options: UseMultiSigApprovalsOptions = {},
): UseMultiSigApprovalsReturn {
  const highValueThresholdXlm = resolveThreshold(options.highValueThresholdXlm);

  const [operations, setOperations] = useState<MultiSigOperation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSigning, setIsSigning] = useState(false);
  const [pendingHighValueOperation, setPendingHighValueOperation] =
    useState<MultiSigOperation | null>(null);

  // Keep the latest callback without re-creating signOperation on every render.
  const onHighValueOperationRef = useRef(options.onHighValueOperation);
  useEffect(() => {
    onHighValueOperationRef.current = options.onHighValueOperation;
  }, [options.onHighValueOperation]);

  const fetchPendingOperations = useCallback(async (walletAddress: string) => {
    try {
      setIsLoading(true);
      // Yield to the event loop so callers (tests) can observe the loading state synchronously
      await Promise.resolve();
      setError(null);

      const response = await walletService.getPendingMultiSigOperations(walletAddress);

      if (!response.success) {
        setError(response.message || 'Failed to fetch pending operations');
        setOperations([]);
        return;
      }

      setOperations(
        (response.operations || []).map((op) => assessOperationRisk(op, highValueThresholdXlm)),
      );
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch pending operations';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [highValueThresholdXlm]);

  const submitSignature = useCallback(async (operation: PendingMultiSigOperation) => {
    try {
      setIsSigning(true);

      // Get the signer's public key from Freighter
      const publicKey = await freighterService.getPublicKey();

      // Sign the transaction with Freighter
      const signature = await freighterService.signTransaction(operation.transactionEnvelope);

      // Submit the signature to the backend
      const response = await walletService.signMultiSigOperation({
        operationId: operation.operationId,
        signature,
        signerPublicKey: publicKey,
      });

      if (!response.success) {
        toast.error(response.message || 'Failed to submit signature');
        return false;
      }

      // Update the local operations state
      setOperations((prevOps) =>
        prevOps.map((op) => {
          if (op.operationId === operation.operationId) {
            return {
              ...op,
              currentSignatures: response.currentSignatures || op.currentSignatures,
              signers: op.signers.map((signer) =>
                signer.publicKey === publicKey ? { ...signer, approved: true } : signer
              ),
            };
          }
          return op;
        })
      );

      toast.success('Signature submitted successfully');
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to sign operation';
      toast.error(errorMessage);
      return false;
    } finally {
      setIsSigning(false);
    }
  }, []);

  const signOperation = useCallback(
    async (operation: PendingMultiSigOperation) => {
      const assessed = assessOperationRisk(operation, highValueThresholdXlm);

      if (assessed.isHighValue) {
        setPendingHighValueOperation(assessed);
        onHighValueOperationRef.current?.(assessed);
        return false;
      }

      return submitSignature(operation);
    },
    [highValueThresholdXlm, submitSignature],
  );

  const confirmHighValueOperation = useCallback(async () => {
    if (!pendingHighValueOperation) return false;
    const signed = await submitSignature(pendingHighValueOperation);
    setPendingHighValueOperation(null);
    return signed;
  }, [pendingHighValueOperation, submitSignature]);

  const cancelHighValueOperation = useCallback(() => {
    setPendingHighValueOperation(null);
  }, []);

  const refreshOperations = useCallback(async (walletAddress: string) => {
    await fetchPendingOperations(walletAddress);
  }, [fetchPendingOperations]);

  return {
    operations,
    isLoading,
    error,
    isSigning,
    highValueThresholdXlm,
    pendingHighValueOperation,
    fetchPendingOperations,
    signOperation,
    confirmHighValueOperation,
    cancelHighValueOperation,
    refreshOperations,
  };
}
