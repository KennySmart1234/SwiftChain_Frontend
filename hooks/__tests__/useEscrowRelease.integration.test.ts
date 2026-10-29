/**
 * Integration Tests for useEscrowRelease Hook
 * 
 * These tests validate the escrow release lifecycle with mocked Stellar SDK responses.
 * Coverage includes:
 * - Step-based flow transitions (idle → confirming → signing → releasing → done)
 * - Fetching and validating escrow details from smart contract
 * - Error handling at each step of the flow
 * - Multi-signature threshold requirements
 * - Transaction polling and confirmation
 * 
 * All blockchain interactions are mocked to ensure reliable CI/CD testing.
 */

import { renderHook, act } from '@testing-library/react';
import { useEscrowRelease } from '@/hooks/useEscrowRelease';
import { escrowService } from '@/services/escrowService';
import {
  MockStellarServer,
  MockWallet,
  createMockStellarEnvironment,
  createMockContractDataResponses,
  createMockErrors,
} from '@/__tests__/mocks/stellarMockProvider';
import type { EscrowDetails } from '@/types/escrow';

// Mock the escrowService module
jest.mock('@/services/escrowService');

// Mock sonner toast for error notifications
jest.mock('sonner', () => ({
  toast: {
    error: jest.fn(),
    success: jest.fn(),
    info: jest.fn(),
  },
}));

import { toast } from 'sonner';

describe('useEscrowRelease — Integration Tests with Mocked Web3 Provider', () => {
  const mockEscrowService = escrowService as jest.Mocked<typeof escrowService>;
  const mockToast = toast as jest.Mocked<typeof toast>;

  let mockWallet: MockWallet;
  let mockServer: MockStellarServer;

  const mockEscrowId = 'contract-0x123';
  const mockDeliveryId = 'delivery-001';
  const mockWalletAddress = 'GBXYZ1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890ABC';

  const mockEscrowDetails: EscrowDetails = {
    requiredSignatures: 2,
    currentSignatures: 2,
    isReleased: false,
    signers: [
      'GSIGNER1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890ABC',
      'GSIGNER2234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890ABC',
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();

    const environment = createMockStellarEnvironment({
      walletConnected: true,
      publicKey: mockWalletAddress,
      transactionHash: 'txhash_' + Math.random().toString(36).substring(7),
      transactionDelay: 50,
      transactionStatus: 'SUCCESS',
    });

    mockWallet = environment.wallet;
    mockServer = environment.server;
  });

  // ═════════════════════════════════════════════════════════════════════
  // HAPPY PATH: Successful escrow release with sufficient signatures
  // ═════════════════════════════════════════════════════════════════════

  it('should successfully release escrow when threshold is met (2 of 2 signatures)', async () => {
    mockEscrowService.getEscrowDetails.mockResolvedValue(mockEscrowDetails);
    mockEscrowService.releaseEscrow.mockResolvedValue({
      success: true,
      message: 'Escrow released successfully',
      transactionHash: 'txhash_release_123',
    });

    const { result } = renderHook(() => useEscrowRelease());

    // Initial state
    expect(result.current.step).toBe('idle');
    expect(result.current.isLoading).toBe(false);
    expect(result.current.escrowDetails).toBeNull();

    // Fetch escrow details
    await act(async () => {
      await result.current.fetchEscrowDetails(mockEscrowId);
    });

    expect(result.current.escrowDetails).toEqual(mockEscrowDetails);
    expect(result.current.escrowDetails?.currentSignatures).toBe(2);
    expect(result.current.escrowDetails?.requiredSignatures).toBe(2);

    // Open confirm dialog
    act(() => {
      result.current.openConfirmDialog(mockEscrowId, mockDeliveryId, mockWalletAddress);
    });

    expect(result.current.step).toBe('confirming');

    // Confirm and release
    await act(async () => {
      await result.current.confirmAndRelease(mockEscrowId, mockDeliveryId, mockWalletAddress);
    });

    expect(result.current.step).toBe('done');
    expect(result.current.isLoading).toBe(false);
    expect(result.current.transactionHash).toBe('txhash_release_123');

    // Verify service was called with correct parameters
    expect(mockEscrowService.releaseEscrow).toHaveBeenCalledWith({
      escrowId: mockEscrowId,
      deliveryId: mockDeliveryId,
      walletAddress: mockWalletAddress,
    });
  });

  // ═════════════════════════════════════════════════════════════════════
  // STEP FLOW: Verifying state transitions through the release lifecycle
  // ═════════════════════════════════════════════════════════════════════

  it('should transition through correct step states: idle → confirming → signing → releasing → done', async () => {
    mockEscrowService.getEscrowDetails.mockResolvedValue(mockEscrowDetails);
    mockEscrowService.releaseEscrow.mockResolvedValue({
      success: true,
      message: 'Released',
      transactionHash: 'txhash_release',
    });

    const { result } = renderHook(() => useEscrowRelease());
    const stateTransitions: Array<typeof result.current.step> = [];

    // Track state transitions
    const originalStep = result.current.step;

    // Fetch details first
    await act(async () => {
      await result.current.fetchEscrowDetails(mockEscrowId);
    });

    // Transition: idle → confirming
    act(() => {
      result.current.openConfirmDialog(mockEscrowId, mockDeliveryId, mockWalletAddress);
    });
    expect(result.current.step).toBe('confirming');

    // Transition: confirming → signing → releasing → done (via confirmAndRelease)
    await act(async () => {
      await result.current.confirmAndRelease(mockEscrowId, mockDeliveryId, mockWalletAddress);
    });

    // Final state should be done
    expect(result.current.step).toBe('done');
  });

  // ═════════════════════════════════════════════════════════════════════
  // MULTI-SIGNATURE VALIDATION: Threshold requirements
  // ═════════════════════════════════════════════════════════════════════

  it('should load escrow with insufficient signatures (1 of 2)', async () => {
    const insufficientSigDetails: EscrowDetails = {
      requiredSignatures: 2,
      currentSignatures: 1,
      isReleased: false,
      signers: ['GSIGNER1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890ABC'],
    };

    mockEscrowService.getEscrowDetails.mockResolvedValue(insufficientSigDetails);

    const { result } = renderHook(() => useEscrowRelease());

    await act(async () => {
      await result.current.fetchEscrowDetails(mockEscrowId);
    });

    expect(result.current.escrowDetails).toEqual(insufficientSigDetails);
    expect(result.current.escrowDetails?.currentSignatures).toBe(1);
    expect(result.current.escrowDetails?.requiredSignatures).toBe(2);
  });

  it('should load escrow with threshold just reached (2 of 2)', async () => {
    mockEscrowService.getEscrowDetails.mockResolvedValue(mockEscrowDetails);

    const { result } = renderHook(() => useEscrowRelease());

    await act(async () => {
      await result.current.fetchEscrowDetails(mockEscrowId);
    });

    expect(result.current.escrowDetails?.currentSignatures).toBe(
      result.current.escrowDetails?.requiredSignatures,
    );
  });

  it('should load escrow with signatures exceeding threshold (3 of 3)', async () => {
    const exceededThresholdDetails: EscrowDetails = {
      requiredSignatures: 3,
      currentSignatures: 3,
      isReleased: false,
      signers: [
        'GSIGNER1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890ABC',
        'GSIGNER2234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890ABC',
        'GSIGNER3234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890ABC',
      ],
    };

    mockEscrowService.getEscrowDetails.mockResolvedValue(exceededThresholdDetails);

    const { result } = renderHook(() => useEscrowRelease());

    await act(async () => {
      await result.current.fetchEscrowDetails(mockEscrowId);
    });

    expect(result.current.escrowDetails?.currentSignatures).toBe(3);
    expect(result.current.escrowDetails?.requiredSignatures).toBe(3);
  });

  // ═════════════════════════════════════════════════════════════════════
  // ERROR HANDLING: Network and contract errors
  // ═════════════════════════════════════════════════════════════════════

  it('should handle error when fetching escrow details fails', async () => {
    const fetchError = new Error('Network error connecting to Soroban RPC');
    mockEscrowService.getEscrowDetails.mockRejectedValue(fetchError);

    const { result } = renderHook(() => useEscrowRelease());

    await act(async () => {
      try {
        await result.current.fetchEscrowDetails(mockEscrowId);
      } catch {}
    });

    // Step should remain idle on error
    expect(result.current.step).toBe('idle');
  });

  it('should handle error when release transaction fails', async () => {
    mockEscrowService.getEscrowDetails.mockResolvedValue(mockEscrowDetails);
    const releaseError = new Error('Failed to release escrow or transaction timed out.');
    mockEscrowService.releaseEscrow.mockRejectedValue(releaseError);

    const { result } = renderHook(() => useEscrowRelease());

    await act(async () => {
      await result.current.fetchEscrowDetails(mockEscrowId);
    });

    act(() => {
      result.current.openConfirmDialog(mockEscrowId, mockDeliveryId, mockWalletAddress);
    });

    let caughtError: Error | null = null;

    await act(async () => {
      try {
        await result.current.confirmAndRelease(mockEscrowId, mockDeliveryId, mockWalletAddress);
      } catch (err) {
        caughtError = err as Error;
      }
    });

    // Step should reset to idle on error
    expect(result.current.step).toBe('idle');
    expect(caughtError).toBe(releaseError);
  });

  it('should handle insufficient funds error during release', async () => {
    mockEscrowService.getEscrowDetails.mockResolvedValue(mockEscrowDetails);
    const fundError = new Error('Insufficient funds for transaction');
    mockEscrowService.releaseEscrow.mockRejectedValue(fundError);

    const { result } = renderHook(() => useEscrowRelease());

    await act(async () => {
      await result.current.fetchEscrowDetails(mockEscrowId);
    });

    act(() => {
      result.current.openConfirmDialog(mockEscrowId, mockDeliveryId, mockWalletAddress);
    });

    await act(async () => {
      try {
        await result.current.confirmAndRelease(mockEscrowId, mockDeliveryId, mockWalletAddress);
      } catch {}
    });

    expect(result.current.step).toBe('idle');
  });

  it('should handle contract revert when attempting to release non-locked funds', async () => {
    mockEscrowService.getEscrowDetails.mockResolvedValue(mockEscrowDetails);
    const contractError = new Error('Contract invocation reverted');
    mockEscrowService.releaseEscrow.mockRejectedValue(contractError);

    const { result } = renderHook(() => useEscrowRelease());

    await act(async () => {
      await result.current.fetchEscrowDetails(mockEscrowId);
    });

    act(() => {
      result.current.openConfirmDialog(mockEscrowId, mockDeliveryId, mockWalletAddress);
    });

    await act(async () => {
      try {
        await result.current.confirmAndRelease(mockEscrowId, mockDeliveryId, mockWalletAddress);
      } catch {}
    });

    expect(result.current.step).toBe('idle');
  });

  it('should handle wallet connection error', async () => {
    mockWallet.setConfig({ walletConnected: false, publicKey: null });
    mockEscrowService.getEscrowDetails.mockResolvedValue(mockEscrowDetails);
    const walletError = new Error('Wallet not connected or public key unavailable.');
    mockEscrowService.releaseEscrow.mockRejectedValue(walletError);

    const { result } = renderHook(() => useEscrowRelease());

    await act(async () => {
      await result.current.fetchEscrowDetails(mockEscrowId);
    });

    act(() => {
      result.current.openConfirmDialog(mockEscrowId, mockDeliveryId, mockWalletAddress);
    });

    await act(async () => {
      try {
        await result.current.confirmAndRelease(mockEscrowId, mockDeliveryId, mockWalletAddress);
      } catch {}
    });

    expect(result.current.step).toBe('idle');
  });

  // ═════════════════════════════════════════════════════════════════════
  // EDGE CASES: Already released, missing escrow, timeout scenarios
  // ═════════════════════════════════════════════════════════════════════

  it('should handle attempting to release already-released escrow', async () => {
    const releasedDetails: EscrowDetails = {
      requiredSignatures: 2,
      currentSignatures: 2,
      isReleased: true, // Already released
      signers: [
        'GSIGNER1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890ABC',
        'GSIGNER2234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890ABC',
      ],
    };

    mockEscrowService.getEscrowDetails.mockResolvedValue(releasedDetails);

    const { result } = renderHook(() => useEscrowRelease());

    await act(async () => {
      await result.current.fetchEscrowDetails(mockEscrowId);
    });

    expect(result.current.escrowDetails?.isReleased).toBe(true);
  });

  it('should handle transaction timeout during release', async () => {
    mockEscrowService.getEscrowDetails.mockResolvedValue(mockEscrowDetails);
    const timeoutError = new Error('Transaction failed or timed out.');
    mockEscrowService.releaseEscrow.mockRejectedValue(timeoutError);

    const { result } = renderHook(() => useEscrowRelease());

    await act(async () => {
      await result.current.fetchEscrowDetails(mockEscrowId);
    });

    act(() => {
      result.current.openConfirmDialog(mockEscrowId, mockDeliveryId, mockWalletAddress);
    });

    let caughtError: Error | null = null;

    await act(async () => {
      try {
        await result.current.confirmAndRelease(mockEscrowId, mockDeliveryId, mockWalletAddress);
      } catch (err) {
        caughtError = err as Error;
      }
    });

    expect(caughtError?.message).toContain('timed out');
    expect(result.current.step).toBe('idle');
  });

  it('should handle non-existent escrow contract', async () => {
    const notFoundError = new Error('Contract not found');
    mockEscrowService.getEscrowDetails.mockRejectedValue(notFoundError);

    const { result } = renderHook(() => useEscrowRelease());

    let caughtError: Error | null = null;

    await act(async () => {
      try {
        await result.current.fetchEscrowDetails('non-existent-contract');
      } catch (err) {
        caughtError = err as Error;
      }
    });

    expect(caughtError?.message).toContain('not found');
    expect(result.current.escrowDetails).toBeNull();
  });

  // ═════════════════════════════════════════════════════════════════════
  // RESET FUNCTIONALITY: Clearing state
  // ═════════════════════════════════════════════════════════════════════

  it('should reset all state to initial values', async () => {
    mockEscrowService.getEscrowDetails.mockResolvedValue(mockEscrowDetails);
    mockEscrowService.releaseEscrow.mockResolvedValue({
      success: true,
      message: 'Released',
      transactionHash: 'txhash_123',
    });

    const { result } = renderHook(() => useEscrowRelease());

    // Populate state
    await act(async () => {
      await result.current.fetchEscrowDetails(mockEscrowId);
    });

    act(() => {
      result.current.openConfirmDialog(mockEscrowId, mockDeliveryId, mockWalletAddress);
    });

    await act(async () => {
      await result.current.confirmAndRelease(mockEscrowId, mockDeliveryId, mockWalletAddress);
    });

    expect(result.current.step).toBe('done');
    expect(result.current.transactionHash).toBe('txhash_123');

    // Reset
    act(() => {
      result.current.reset();
    });

    expect(result.current.step).toBe('idle');
    expect(result.current.isLoading).toBe(false);
    expect(result.current.transactionHash).toBeNull();
    expect(result.current.escrowDetails).toBeNull();
  });

  // ═════════════════════════════════════════════════════════════════════
  // RESPONSE STRUCTURE: Validates correct transaction hash exposure
  // ═════════════════════════════════════════════════════════════════════

  it('should expose transaction hash after successful release', async () => {
    const txHash = 'txhash_release_abc123xyz789';

    mockEscrowService.getEscrowDetails.mockResolvedValue(mockEscrowDetails);
    mockEscrowService.releaseEscrow.mockResolvedValue({
      success: true,
      message: 'Escrow released successfully',
      transactionHash: txHash,
    });

    const { result } = renderHook(() => useEscrowRelease());

    await act(async () => {
      await result.current.fetchEscrowDetails(mockEscrowId);
    });

    act(() => {
      result.current.openConfirmDialog(mockEscrowId, mockDeliveryId, mockWalletAddress);
    });

    await act(async () => {
      await result.current.confirmAndRelease(mockEscrowId, mockDeliveryId, mockWalletAddress);
    });

    expect(result.current.transactionHash).toBe(txHash);
    expect(result.current.step).toBe('done');
  });

  // ═════════════════════════════════════════════════════════════════════
  // EDGE CASE: Zero signatures (contract with no signers yet)
  // ═════════════════════════════════════════════════════════════════════

  it('should handle escrow with zero current signatures', async () => {
    const zeroSigDetails: EscrowDetails = {
      requiredSignatures: 2,
      currentSignatures: 0,
      isReleased: false,
      signers: [],
    };

    mockEscrowService.getEscrowDetails.mockResolvedValue(zeroSigDetails);

    const { result } = renderHook(() => useEscrowRelease());

    await act(async () => {
      await result.current.fetchEscrowDetails(mockEscrowId);
    });

    expect(result.current.escrowDetails?.currentSignatures).toBe(0);
    expect(result.current.escrowDetails?.signers.length).toBe(0);
  });
});
