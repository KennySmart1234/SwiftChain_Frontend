import { renderHook, act, waitFor } from '@testing-library/react';
import {
  useMultiSigApprovals,
  assessOperationRisk,
  DEFAULT_HIGH_VALUE_THRESHOLD_XLM,
} from '@/hooks/useMultiSigApprovals';
import * as walletServiceModule from '@/services/walletService';
import * as freighterServiceModule from '@/services/freighterService';

// Mock the services
jest.mock('@/services/walletService');
jest.mock('@/services/freighterService');

// Mock sonner
jest.mock('sonner', () => ({
  toast: {
    error: jest.fn(),
    success: jest.fn(),
  },
}));

const mockWalletService = walletServiceModule.walletService as jest.Mocked<
  typeof walletServiceModule.walletService
>;

const mockFreighterService = freighterServiceModule.freighterService as jest.Mocked<
  typeof freighterServiceModule.freighterService
>;

const MOCK_OPERATION = {
  operationId: 'op-001',
  transactionEnvelope: 'AAAAAgAAAABa+Cd7L3r0w....',
  description: 'Test transaction',
  signaturesRequired: 2,
  currentSignatures: 1,
  signers: [
    { publicKey: 'GACV3JHPXU7CKKYIRSTNLPFVFWGCAYDGBVNFNFJDG5BFCPJV7ZRKJSGN', weight: 1, approved: true },
    { publicKey: 'GBUQWP3BOUZX34ULNQG23RQ6F4BVWCIRUUOKLVFEFK4QB26WVJDBKFEA', weight: 1, approved: false },
  ],
  createdAt: '2026-06-01T10:00:00Z',
  status: 'pending' as const,
  expiresAt: '2026-06-08T10:00:00Z',
};

describe('useMultiSigApprovals Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should return initial state', () => {
    const { result } = renderHook(() => useMultiSigApprovals());

    expect(result.current.operations).toEqual([]);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.isSigning).toBe(false);
    expect(typeof result.current.fetchPendingOperations).toBe('function');
    expect(typeof result.current.signOperation).toBe('function');
    expect(typeof result.current.refreshOperations).toBe('function');
  });

  test('should successfully fetch pending operations', async () => {
    mockWalletService.getPendingMultiSigOperations.mockResolvedValueOnce({
      success: true,
      message: 'Operations fetched',
      operations: [MOCK_OPERATION],
    });

    const { result } = renderHook(() => useMultiSigApprovals());

    await act(async () => {
      await result.current.fetchPendingOperations('0xTest');
    });

    await waitFor(() => {
      expect(result.current.operations).toEqual([
        { ...MOCK_OPERATION, isHighValue: false, riskLevel: 'low' },
      ]);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });
  });

  test('should handle failed operation fetch', async () => {
    mockWalletService.getPendingMultiSigOperations.mockResolvedValueOnce({
      success: false,
      message: 'Failed to fetch operations',
    });

    const { result } = renderHook(() => useMultiSigApprovals());

    await act(async () => {
      await result.current.fetchPendingOperations('0xTest');
    });

    await waitFor(() => {
      expect(result.current.error).toBe('Failed to fetch operations');
      expect(result.current.operations).toEqual([]);
    });
  });

  test('should handle error during operation fetch', async () => {
    mockWalletService.getPendingMultiSigOperations.mockRejectedValueOnce(
      new Error('Network error')
    );

    const { result } = renderHook(() => useMultiSigApprovals());

    await act(async () => {
      await result.current.fetchPendingOperations('0xTest');
    });

    await waitFor(() => {
      expect(result.current.error).toBe('Network error');
      expect(result.current.isLoading).toBe(false);
    });
  });

  test('should sign an operation successfully', async () => {
    mockWalletService.getPendingMultiSigOperations.mockResolvedValueOnce({
      success: true,
      message: 'Operations fetched',
      operations: [MOCK_OPERATION],
    });

    mockFreighterService.getPublicKey.mockResolvedValueOnce(
      'GACV3JHPXU7CKKYIRSTNLPFVFWGCAYDGBVNFNFJDG5BFCPJV7ZRKJSGN'
    );

    mockFreighterService.signTransaction.mockResolvedValueOnce('signature123');

    mockWalletService.signMultiSigOperation.mockResolvedValueOnce({
      success: true,
      message: 'Signature submitted',
      operationId: 'op-001',
      currentSignatures: 2,
    });

    const { result } = renderHook(() => useMultiSigApprovals());

    // First fetch operations
    await act(async () => {
      await result.current.fetchPendingOperations('0xTest');
    });

    // Then sign an operation
    await act(async () => {
      await result.current.signOperation(MOCK_OPERATION);
    });

    await waitFor(() => {
      expect(result.current.isSigning).toBe(false);
      expect(mockFreighterService.getPublicKey).toHaveBeenCalled();
      expect(mockFreighterService.signTransaction).toHaveBeenCalledWith(
        MOCK_OPERATION.transactionEnvelope
      );
      expect(mockWalletService.signMultiSigOperation).toHaveBeenCalled();
    });
  });

  test('should update operation state after successful signing', async () => {
    mockWalletService.getPendingMultiSigOperations.mockResolvedValueOnce({
      success: true,
      message: 'Operations fetched',
      operations: [MOCK_OPERATION],
    });

    mockFreighterService.getPublicKey.mockResolvedValueOnce(
      'GBUQWP3BOUZX34ULNQG23RQ6F4BVWCIRUUOKLVFEFK4QB26WVJDBKFEA'
    );

    mockFreighterService.signTransaction.mockResolvedValueOnce('signature456');

    mockWalletService.signMultiSigOperation.mockResolvedValueOnce({
      success: true,
      message: 'Signature submitted',
      operationId: 'op-001',
      currentSignatures: 2,
    });

    const { result } = renderHook(() => useMultiSigApprovals());

    // Fetch operations first
    await act(async () => {
      await result.current.fetchPendingOperations('0xTest');
    });

    // Sign the operation
    await act(async () => {
      await result.current.signOperation(MOCK_OPERATION);
    });

    await waitFor(() => {
      // Verify that the operation's signature count was updated
      const updatedOp = result.current.operations[0];
      expect(updatedOp.currentSignatures).toBe(2);
      // Verify that the signer's approval status was updated
      const updatedSigner = updatedOp.signers.find(
        (s) => s.publicKey === 'GBUQWP3BOUZX34ULNQG23RQ6F4BVWCIRUUOKLVFEFK4QB26WVJDBKFEA'
      );
      expect(updatedSigner?.approved).toBe(true);
    });
  });

  test('should handle failed signature submission', async () => {
    mockWalletService.getPendingMultiSigOperations.mockResolvedValueOnce({
      success: true,
      message: 'Operations fetched',
      operations: [MOCK_OPERATION],
    });

    mockFreighterService.getPublicKey.mockResolvedValueOnce(
      'GACV3JHPXU7CKKYIRSTNLPFVFWGCAYDGBVNFNFJDG5BFCPJV7ZRKJSGN'
    );

    mockFreighterService.signTransaction.mockResolvedValueOnce('signature789');

    mockWalletService.signMultiSigOperation.mockResolvedValueOnce({
      success: false,
      message: 'Invalid signature',
    });

    const { result } = renderHook(() => useMultiSigApprovals());

    await act(async () => {
      await result.current.fetchPendingOperations('0xTest');
    });

    await act(async () => {
      await result.current.signOperation(MOCK_OPERATION);
    });

    await waitFor(() => {
      expect(result.current.isSigning).toBe(false);
    });
  });

  test('should handle Freighter signature error', async () => {
    mockWalletService.getPendingMultiSigOperations.mockResolvedValueOnce({
      success: true,
      message: 'Operations fetched',
      operations: [MOCK_OPERATION],
    });

    mockFreighterService.getPublicKey.mockResolvedValueOnce(
      'GACV3JHPXU7CKKYIRSTNLPFVFWGCAYDGBVNFNFJDG5BFCPJV7ZRKJSGN'
    );

    mockFreighterService.signTransaction.mockRejectedValueOnce(
      new Error('User rejected signature')
    );

    const { result } = renderHook(() => useMultiSigApprovals());

    await act(async () => {
      await result.current.fetchPendingOperations('0xTest');
    });

    await act(async () => {
      await result.current.signOperation(MOCK_OPERATION);
    });

    await waitFor(() => {
      expect(result.current.isSigning).toBe(false);
    });
  });

  test('should refresh operations', async () => {
    mockWalletService.getPendingMultiSigOperations.mockResolvedValueOnce({
      success: true,
      message: 'Operations fetched',
      operations: [MOCK_OPERATION],
    });

    const { result } = renderHook(() => useMultiSigApprovals());

    await act(async () => {
      await result.current.refreshOperations('0xTest');
    });

    expect(mockWalletService.getPendingMultiSigOperations).toHaveBeenCalledWith('0xTest');
  });

  test('should handle loading state during fetch', async () => {
    const delayedPromise = new Promise((resolve) =>
      setTimeout(() => resolve({
        success: true,
        message: 'Operations fetched',
        operations: [MOCK_OPERATION],
      }), 100)
    );

    mockWalletService.getPendingMultiSigOperations.mockReturnValueOnce(
      delayedPromise as any
    );

    const { result } = renderHook(() => useMultiSigApprovals());

    expect(result.current.isLoading).toBe(false);

    await act(async () => {
      result.current.fetchPendingOperations('0xTest');
    });

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
  });

  test('should handle multiple operations', async () => {
    const operation2 = {
      ...MOCK_OPERATION,
      operationId: 'op-002',
      description: 'Another transaction',
    };

    mockWalletService.getPendingMultiSigOperations.mockResolvedValueOnce({
      success: true,
      message: 'Operations fetched',
      operations: [MOCK_OPERATION, operation2],
    });

    const { result } = renderHook(() => useMultiSigApprovals());

    await act(async () => {
      await result.current.fetchPendingOperations('0xTest');
    });

    await waitFor(() => {
      expect(result.current.operations).toHaveLength(2);
      expect(result.current.operations[0].operationId).toBe('op-001');
      expect(result.current.operations[1].operationId).toBe('op-002');
    });
  });

  test('should pass correct parameters to sign service', async () => {
    mockWalletService.getPendingMultiSigOperations.mockResolvedValueOnce({
      success: true,
      message: 'Operations fetched',
      operations: [MOCK_OPERATION],
    });

    mockFreighterService.getPublicKey.mockResolvedValueOnce(
      'GACV3JHPXU7CKKYIRSTNLPFVFWGCAYDGBVNFNFJDG5BFCPJV7ZRKJSGN'
    );

    mockFreighterService.signTransaction.mockResolvedValueOnce('sig_123');

    mockWalletService.signMultiSigOperation.mockResolvedValueOnce({
      success: true,
      message: 'Signature submitted',
      currentSignatures: 2,
    });

    const { result } = renderHook(() => useMultiSigApprovals());

    await act(async () => {
      await result.current.fetchPendingOperations('0xTest');
    });

    await act(async () => {
      await result.current.signOperation(MOCK_OPERATION);
    });

    await waitFor(() => {
      expect(mockWalletService.signMultiSigOperation).toHaveBeenCalledWith({
        operationId: 'op-001',
        signature: 'sig_123',
        signerPublicKey: 'GACV3JHPXU7CKKYIRSTNLPFVFWGCAYDGBVNFNFJDG5BFCPJV7ZRKJSGN',
      });
    });
  });

  describe('high-value threshold detection', () => {
    const HIGH_VALUE_OPERATION = {
      ...MOCK_OPERATION,
      operationId: 'op-high',
      description: 'Release cargo escrow',
      amountXlm: 15000,
    };

    function mockSuccessfulSignature() {
      mockFreighterService.getPublicKey.mockResolvedValueOnce(
        'GBUQWP3BOUZX34ULNQG23RQ6F4BVWCIRUUOKLVFEFK4QB26WVJDBKFEA'
      );
      mockFreighterService.signTransaction.mockResolvedValueOnce('sig_high');
      mockWalletService.signMultiSigOperation.mockResolvedValueOnce({
        success: true,
        message: 'Signature submitted',
        currentSignatures: 2,
      });
    }

    test('uses 10000 XLM as the default threshold', () => {
      const { result } = renderHook(() => useMultiSigApprovals());

      expect(DEFAULT_HIGH_VALUE_THRESHOLD_XLM).toBe(10000);
      expect(result.current.highValueThresholdXlm).toBe(10000);
      expect(result.current.pendingHighValueOperation).toBeNull();
    });

    test.each([
      [undefined, 'low', false],
      [4999.99, 'low', false],
      [5000, 'medium', false],
      [9999.99, 'medium', false],
      [10000, 'high', true],
      [250000, 'high', true],
    ])('classifies %p XLM as %s risk', (amountXlm, riskLevel, isHighValue) => {
      expect(assessOperationRisk({ ...MOCK_OPERATION, amountXlm })).toMatchObject({
        riskLevel,
        isHighValue,
      });
    });

    test('flags fetched operations with isHighValue and riskLevel', async () => {
      mockWalletService.getPendingMultiSigOperations.mockResolvedValueOnce({
        success: true,
        message: 'Operations fetched',
        operations: [MOCK_OPERATION, HIGH_VALUE_OPERATION],
      });

      const { result } = renderHook(() => useMultiSigApprovals());

      await act(async () => {
        await result.current.fetchPendingOperations('0xTest');
      });

      expect(
        result.current.operations.map((op) => [op.operationId, op.isHighValue, op.riskLevel])
      ).toEqual([
        ['op-001', false, 'low'],
        ['op-high', true, 'high'],
      ]);
    });

    test('respects a custom threshold', async () => {
      mockWalletService.getPendingMultiSigOperations.mockResolvedValueOnce({
        success: true,
        message: 'Operations fetched',
        operations: [{ ...MOCK_OPERATION, amountXlm: 600 }],
      });

      const { result } = renderHook(() => useMultiSigApprovals({ highValueThresholdXlm: 500 }));

      await act(async () => {
        await result.current.fetchPendingOperations('0xTest');
      });

      expect(result.current.highValueThresholdXlm).toBe(500);
      expect(result.current.operations[0].isHighValue).toBe(true);
    });

    test('reads the threshold from the environment when no option is given', () => {
      const original = process.env.NEXT_PUBLIC_MULTISIG_HIGH_VALUE_THRESHOLD_XLM;
      process.env.NEXT_PUBLIC_MULTISIG_HIGH_VALUE_THRESHOLD_XLM = '2500';

      try {
        const { result } = renderHook(() => useMultiSigApprovals());
        expect(result.current.highValueThresholdXlm).toBe(2500);
      } finally {
        if (original === undefined) delete process.env.NEXT_PUBLIC_MULTISIG_HIGH_VALUE_THRESHOLD_XLM;
        else process.env.NEXT_PUBLIC_MULTISIG_HIGH_VALUE_THRESHOLD_XLM = original;
      }
    });

    test('holds a high-value operation and emits the modal event instead of signing', async () => {
      const onHighValueOperation = jest.fn();
      const { result } = renderHook(() => useMultiSigApprovals({ onHighValueOperation }));

      let signed: boolean | undefined;
      await act(async () => {
        signed = await result.current.signOperation(HIGH_VALUE_OPERATION);
      });

      expect(signed).toBe(false);
      expect(mockFreighterService.signTransaction).not.toHaveBeenCalled();
      expect(mockWalletService.signMultiSigOperation).not.toHaveBeenCalled();
      expect(onHighValueOperation).toHaveBeenCalledWith(
        expect.objectContaining({ operationId: 'op-high', isHighValue: true, riskLevel: 'high' })
      );
      expect(result.current.pendingHighValueOperation?.operationId).toBe('op-high');
    });

    test('signs the held operation once the high-value modal is confirmed', async () => {
      mockWalletService.getPendingMultiSigOperations.mockResolvedValueOnce({
        success: true,
        message: 'Operations fetched',
        operations: [HIGH_VALUE_OPERATION],
      });
      mockSuccessfulSignature();
      const { result } = renderHook(() => useMultiSigApprovals());

      await act(async () => {
        await result.current.fetchPendingOperations('0xTest');
      });
      await act(async () => {
        await result.current.signOperation(result.current.operations[0]);
      });

      let signed: boolean | undefined;
      await act(async () => {
        signed = await result.current.confirmHighValueOperation();
      });

      expect(signed).toBe(true);
      expect(mockWalletService.signMultiSigOperation).toHaveBeenCalledWith({
        operationId: 'op-high',
        signature: 'sig_high',
        signerPublicKey: 'GBUQWP3BOUZX34ULNQG23RQ6F4BVWCIRUUOKLVFEFK4QB26WVJDBKFEA',
      });
      expect(result.current.pendingHighValueOperation).toBeNull();
      expect(result.current.operations[0].currentSignatures).toBe(2);
    });

    test('cancelling the high-value modal clears the held operation without signing', async () => {
      const { result } = renderHook(() => useMultiSigApprovals());

      await act(async () => {
        await result.current.signOperation(HIGH_VALUE_OPERATION);
      });
      act(() => {
        result.current.cancelHighValueOperation();
      });

      expect(result.current.pendingHighValueOperation).toBeNull();
      let signed: boolean | undefined;
      await act(async () => {
        signed = await result.current.confirmHighValueOperation();
      });
      expect(signed).toBe(false);
      expect(mockWalletService.signMultiSigOperation).not.toHaveBeenCalled();
    });

    test('signs standard operations directly without emitting the modal event', async () => {
      const onHighValueOperation = jest.fn();
      mockSuccessfulSignature();
      const { result } = renderHook(() => useMultiSigApprovals({ onHighValueOperation }));

      let signed: boolean | undefined;
      await act(async () => {
        signed = await result.current.signOperation({ ...MOCK_OPERATION, amountXlm: 9999 });
      });

      expect(signed).toBe(true);
      expect(onHighValueOperation).not.toHaveBeenCalled();
      expect(mockWalletService.signMultiSigOperation).toHaveBeenCalledTimes(1);
      expect(result.current.pendingHighValueOperation).toBeNull();
    });
  });
});
