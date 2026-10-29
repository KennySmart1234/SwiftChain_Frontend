/**
 * Integration Tests for useEscrowLock Hook
 * 
 * These tests validate the complete hook lifecycle using mocked Stellar SDK responses.
 * Each test scenario covers:
 * - State transitions through isLoading → success/error
 * - Exact parameters passed to escrowService
 * - Error handling and recovery
 * - Edge cases and boundary conditions
 * 
 * All Web3 interactions are fully mocked to prevent real blockchain calls.
 */

import { renderHook, act } from '@testing-library/react';
import { useEscrowLock } from '@/hooks/useEscrowLock';
import { escrowService, LockEscrowParams } from '@/services/escrowService';
import {
  MockStellarServer,
  MockWallet,
  createMockStellarEnvironment,
  createMockContractDataResponses,
  createMockErrors,
} from '@/__tests__/mocks/stellarMockProvider';

// Mock the escrowService module
jest.mock('@/services/escrowService');

describe('useEscrowLock — Integration Tests with Mocked Web3 Provider', () => {
  const mockEscrowService = escrowService as jest.Mocked<typeof escrowService>;

  let mockWallet: MockWallet;
  let mockServer: MockStellarServer;

  beforeEach(() => {
    jest.clearAllMocks();

    // Set up mock Stellar environment
    const environment = createMockStellarEnvironment({
      walletConnected: true,
      publicKey: 'GBXYZ1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890ABC',
      transactionHash: 'txhash_' + Math.random().toString(36).substring(7),
      transactionDelay: 50, // 50ms delay for NOT_FOUND → SUCCESS transition
      transactionStatus: 'SUCCESS',
    });

    mockWallet = environment.wallet;
    mockServer = environment.server;

    // Configure getWallet mock
    mockGetWallet.mockReturnValue(mockWallet as any);
  });

  // ═════════════════════════════════════════════════════════════════════
  // HAPPY PATH: Successful escrow lock with valid parameters
  // ═════════════════════════════════════════════════════════════════════

  it('should lock escrow successfully with valid parameters and transition through correct states', async () => {
    const params: LockEscrowParams = {
      deliveryId: 'delivery-001',
      amount: 100.5,
      currency: 'USDC',
      walletAddress: 'GBXYZ1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890ABC',
    };

    const expectedResponse = {
      success: true,
      message: 'Escrow locked successfully',
      escrowId: 'contract-0x123abc',
      transactionHash: 'txhash_abc123',
      lockedAmount: '100.5',
    };

    mockEscrowService.lockEscrow.mockResolvedValue(expectedResponse);

    const { result } = renderHook(() => useEscrowLock());

    // Initial state should be idle
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.escrowId).toBeNull();
    expect(result.current.transactionHash).toBeNull();

    // Call lockEscrow
    let response: any;
    await act(async () => {
      response = await result.current.lockEscrow(params);
    });

    // Verify hook state after successful lock
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.escrowId).toBe('contract-0x123abc');
    expect(result.current.transactionHash).toBe('txhash_abc123');

    // Verify service was called with exact parameters
    expect(mockEscrowService.lockEscrow).toHaveBeenCalledWith(params);
    expect(mockEscrowService.lockEscrow).toHaveBeenCalledTimes(1);

    // Verify response is returned to caller
    expect(response).toEqual(expectedResponse);
  });

  // ═════════════════════════════════════════════════════════════════════
  // STATE TRANSITIONS: Loading state during async operation
  // ═════════════════════════════════════════════════════════════════════

  it('should set isLoading to true immediately when lockEscrow is called', async () => {
    const params: LockEscrowParams = {
      deliveryId: 'delivery-001',
      amount: 50,
      currency: 'USDC',
      walletAddress: 'GBXYZ1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890ABC',
    };

    let loadingDuringCall = false;

    mockEscrowService.lockEscrow.mockImplementation(async () => {
      // Capture loading state during async operation
      loadingDuringCall = true; // This would be checked via act() in real scenario
      return {
        success: true,
        message: 'Locked',
        escrowId: 'contract-123',
        transactionHash: 'txhash-123',
        lockedAmount: '50',
      };
    });

    const { result } = renderHook(() => useEscrowLock());

    await act(async () => {
      const promise = result.current.lockEscrow(params);
      // Check loading state synchronously after call
      expect(result.current.isLoading).toBe(true);
      expect(result.current.error).toBeNull();
      await promise;
    });

    // After successful resolution, loading should be false
    expect(result.current.isLoading).toBe(false);
  });

  // ═════════════════════════════════════════════════════════════════════
  // ERROR HANDLING: Contract-level failures
  // ═════════════════════════════════════════════════════════════════════

  it('should handle insufficient funds error from smart contract', async () => {
    const params: LockEscrowParams = {
      deliveryId: 'delivery-001',
      amount: 1000000, // Large amount
      currency: 'USDC',
      walletAddress: 'GBXYZ1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890ABC',
    };

    const contractError = new Error('Insufficient funds for transaction');
    mockEscrowService.lockEscrow.mockRejectedValue(contractError);

    const { result } = renderHook(() => useEscrowLock());

    let caughtError: Error | null = null;

    await act(async () => {
      try {
        await result.current.lockEscrow(params);
      } catch (err) {
        caughtError = err as Error;
      }
    });

    // Verify error is propagated and state is updated
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBe('Insufficient funds for transaction');
    expect(result.current.escrowId).toBeNull();
    expect(result.current.transactionHash).toBeNull();
    expect(caughtError).toBe(contractError);
  });

  it('should handle wallet rejection (user cancels transaction)', async () => {
    const params: LockEscrowParams = {
      deliveryId: 'delivery-001',
      amount: 100,
      currency: 'USDC',
      walletAddress: 'GBXYZ1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890ABC',
    };

    const walletError = new Error('User rejected transaction in wallet');
    mockEscrowService.lockEscrow.mockRejectedValue(walletError);

    const { result } = renderHook(() => useEscrowLock());

    await act(async () => {
      try {
        await result.current.lockEscrow(params);
      } catch {}
    });

    expect(result.current.error).toBe('User rejected transaction in wallet');
    expect(result.current.escrowId).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });

  it('should handle network errors gracefully', async () => {
    const params: LockEscrowParams = {
      deliveryId: 'delivery-001',
      amount: 100,
      currency: 'USDC',
      walletAddress: 'GBXYZ1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890ABC',
    };

    const networkError = new Error('Network error connecting to Soroban RPC');
    mockEscrowService.lockEscrow.mockRejectedValue(networkError);

    const { result } = renderHook(() => useEscrowLock());

    await act(async () => {
      try {
        await result.current.lockEscrow(params);
      } catch {}
    });

    expect(result.current.error).toBe('Network error connecting to Soroban RPC');
    expect(result.current.isLoading).toBe(false);
  });

  it('should handle transaction timeout', async () => {
    const params: LockEscrowParams = {
      deliveryId: 'delivery-001',
      amount: 100,
      currency: 'USDC',
      walletAddress: 'GBXYZ1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890ABC',
    };

    const timeoutError = new Error('Transaction failed or timed out.');
    mockEscrowService.lockEscrow.mockRejectedValue(timeoutError);

    const { result } = renderHook(() => useEscrowLock());

    await act(async () => {
      try {
        await result.current.lockEscrow(params);
      } catch {}
    });

    expect(result.current.error).toBe('Transaction failed or timed out.');
    expect(result.current.escrowId).toBeNull();
  });

  it('should handle non-Error exceptions and provide fallback message', async () => {
    const params: LockEscrowParams = {
      deliveryId: 'delivery-001',
      amount: 100,
      currency: 'USDC',
      walletAddress: 'GBXYZ1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890ABC',
    };

    mockEscrowService.lockEscrow.mockRejectedValue('Unknown error thrown as string');

    const { result } = renderHook(() => useEscrowLock());

    await act(async () => {
      try {
        await result.current.lockEscrow(params);
      } catch {}
    });

    expect(result.current.error).toBe('Failed to lock escrow');
    expect(result.current.isLoading).toBe(false);
  });

  // ═════════════════════════════════════════════════════════════════════
  // EDGE CASES: Parameter validation and boundary conditions
  // ═════════════════════════════════════════════════════════════════════

  it('should reject lock with zero amount', async () => {
    const params: LockEscrowParams = {
      deliveryId: 'delivery-001',
      amount: 0,
      currency: 'USDC',
      walletAddress: 'GBXYZ1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890ABC',
    };

    const validationError = new Error(
      'Invalid lock parameters: all fields are required and amount must be positive.',
    );
    mockEscrowService.lockEscrow.mockRejectedValue(validationError);

    const { result } = renderHook(() => useEscrowLock());

    await act(async () => {
      try {
        await result.current.lockEscrow(params);
      } catch {}
    });

    expect(result.current.error).toContain('Invalid lock parameters');
    expect(mockEscrowService.lockEscrow).toHaveBeenCalledWith(params);
  });

  it('should reject lock with negative amount', async () => {
    const params: LockEscrowParams = {
      deliveryId: 'delivery-001',
      amount: -100,
      currency: 'USDC',
      walletAddress: 'GBXYZ1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890ABC',
    };

    const validationError = new Error(
      'Invalid lock parameters: all fields are required and amount must be positive.',
    );
    mockEscrowService.lockEscrow.mockRejectedValue(validationError);

    const { result } = renderHook(() => useEscrowLock());

    await act(async () => {
      try {
        await result.current.lockEscrow(params);
      } catch {}
    });

    expect(result.current.error).toContain('Invalid lock parameters');
  });

  it('should reject lock with missing deliveryId', async () => {
    const params = {
      deliveryId: '',
      amount: 100,
      currency: 'USDC',
      walletAddress: 'GBXYZ1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890ABC',
    } as LockEscrowParams;

    const validationError = new Error(
      'Invalid lock parameters: all fields are required and amount must be positive.',
    );
    mockEscrowService.lockEscrow.mockRejectedValue(validationError);

    const { result } = renderHook(() => useEscrowLock());

    await act(async () => {
      try {
        await result.current.lockEscrow(params);
      } catch {}
    });

    expect(result.current.error).toContain('Invalid lock parameters');
  });

  it('should reject lock with missing currency', async () => {
    const params = {
      deliveryId: 'delivery-001',
      amount: 100,
      currency: '',
      walletAddress: 'GBXYZ1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890ABC',
    } as LockEscrowParams;

    const validationError = new Error(
      'Invalid lock parameters: all fields are required and amount must be positive.',
    );
    mockEscrowService.lockEscrow.mockRejectedValue(validationError);

    const { result } = renderHook(() => useEscrowLock());

    await act(async () => {
      try {
        await result.current.lockEscrow(params);
      } catch {}
    });

    expect(result.current.error).toContain('Invalid lock parameters');
  });

  it('should handle very large amounts without overflow', async () => {
    const params: LockEscrowParams = {
      deliveryId: 'delivery-001',
      amount: 999999999.99,
      currency: 'USDC',
      walletAddress: 'GBXYZ1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890ABC',
    };

    const expectedResponse = {
      success: true,
      message: 'Escrow locked successfully',
      escrowId: 'contract-0x999',
      transactionHash: 'txhash_999',
      lockedAmount: '999999999.99',
    };

    mockEscrowService.lockEscrow.mockResolvedValue(expectedResponse);

    const { result } = renderHook(() => useEscrowLock());

    await act(async () => {
      await result.current.lockEscrow(params);
    });

    expect(result.current.escrowId).toBe('contract-0x999');
    expect(result.current.error).toBeNull();
    expect(mockEscrowService.lockEscrow).toHaveBeenCalledWith(params);
  });

  // ═════════════════════════════════════════════════════════════════════
  // RESET FUNCTIONALITY: Clearing state after lock
  // ═════════════════════════════════════════════════════════════════════

  it('should reset all state to initial values on reset()', async () => {
    const params: LockEscrowParams = {
      deliveryId: 'delivery-001',
      amount: 100,
      currency: 'USDC',
      walletAddress: 'GBXYZ1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890ABC',
    };

    mockEscrowService.lockEscrow.mockResolvedValue({
      success: true,
      message: 'Locked',
      escrowId: 'contract-123',
      transactionHash: 'txhash-123',
      lockedAmount: '100',
    });

    const { result } = renderHook(() => useEscrowLock());

    // Lock escrow first
    await act(async () => {
      await result.current.lockEscrow(params);
    });

    expect(result.current.escrowId).toBe('contract-123');
    expect(result.current.transactionHash).toBe('txhash-123');

    // Reset
    act(() => {
      result.current.reset();
    });

    // Verify all state is cleared
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.escrowId).toBeNull();
    expect(result.current.transactionHash).toBeNull();
  });

  it('should clear previous error state on successful retry', async () => {
    const params: LockEscrowParams = {
      deliveryId: 'delivery-001',
      amount: 100,
      currency: 'USDC',
      walletAddress: 'GBXYZ1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890ABC',
    };

    const { result } = renderHook(() => useEscrowLock());

    // First attempt - fails
    mockEscrowService.lockEscrow.mockRejectedValueOnce(new Error('Network error'));

    await act(async () => {
      try {
        await result.current.lockEscrow(params);
      } catch {}
    });

    expect(result.current.error).toBe('Network error');

    // Second attempt - succeeds
    mockEscrowService.lockEscrow.mockResolvedValueOnce({
      success: true,
      message: 'Locked',
      escrowId: 'contract-123',
      transactionHash: 'txhash-123',
      lockedAmount: '100',
    });

    await act(async () => {
      await result.current.lockEscrow(params);
    });

    // Error should be cleared on successful retry
    expect(result.current.error).toBeNull();
    expect(result.current.escrowId).toBe('contract-123');
  });

  // ═════════════════════════════════════════════════════════════════════
  // WALLET INTEGRATION: Wallet connection and signing
  // ═════════════════════════════════════════════════════════════════════

  it('should handle wallet not connected scenario', async () => {
    mockWallet.setConfig({ walletConnected: false, publicKey: null });

    const params: LockEscrowParams = {
      deliveryId: 'delivery-001',
      amount: 100,
      currency: 'USDC',
      walletAddress: 'GBXYZ1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890ABC',
    };

    const walletError = new Error('Wallet not connected or public key unavailable.');
    mockEscrowService.lockEscrow.mockRejectedValue(walletError);

    const { result } = renderHook(() => useEscrowLock());

    await act(async () => {
      try {
        await result.current.lockEscrow(params);
      } catch {}
    });

    expect(result.current.error).toContain('Wallet not connected');
    expect(result.current.escrowId).toBeNull();
  });

  // ═════════════════════════════════════════════════════════════════════
  // CONCURRENT OPERATIONS: Multiple locks should not interfere
  // ═════════════════════════════════════════════════════════════════════

  it('should handle sequential lock attempts correctly', async () => {
    const params1: LockEscrowParams = {
      deliveryId: 'delivery-001',
      amount: 100,
      currency: 'USDC',
      walletAddress: 'GBXYZ1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890ABC',
    };

    const params2: LockEscrowParams = {
      deliveryId: 'delivery-002',
      amount: 200,
      currency: 'USDC',
      walletAddress: 'GBXYZ1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890ABC',
    };

    const response1 = {
      success: true,
      message: 'Locked',
      escrowId: 'contract-001',
      transactionHash: 'txhash-001',
      lockedAmount: '100',
    };

    const response2 = {
      success: true,
      message: 'Locked',
      escrowId: 'contract-002',
      transactionHash: 'txhash-002',
      lockedAmount: '200',
    };

    mockEscrowService.lockEscrow
      .mockResolvedValueOnce(response1)
      .mockResolvedValueOnce(response2);

    const { result } = renderHook(() => useEscrowLock());

    // First lock
    await act(async () => {
      await result.current.lockEscrow(params1);
    });

    expect(result.current.escrowId).toBe('contract-001');
    expect(result.current.transactionHash).toBe('txhash-001');

    // Second lock overwrites previous state
    await act(async () => {
      await result.current.lockEscrow(params2);
    });

    expect(result.current.escrowId).toBe('contract-002');
    expect(result.current.transactionHash).toBe('txhash-002');
    expect(mockEscrowService.lockEscrow).toHaveBeenCalledTimes(2);
  });

  // ═════════════════════════════════════════════════════════════════════
  // RESPONSE STRUCTURE: Validates hook returns exact service response
  // ═════════════════════════════════════════════════════════════════════

  it('should return complete service response to caller with all fields', async () => {
    const params: LockEscrowParams = {
      deliveryId: 'delivery-001',
      amount: 100.5,
      currency: 'USDC',
      walletAddress: 'GBXYZ1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890ABC',
    };

    const expectedResponse = {
      success: true,
      message: 'Escrow locked successfully',
      escrowId: 'contract-0xabc123',
      transactionHash: 'txhash_xyz789',
      lockedAmount: '100.5',
    };

    mockEscrowService.lockEscrow.mockResolvedValue(expectedResponse);

    const { result } = renderHook(() => useEscrowLock());

    let returnedResponse: any;

    await act(async () => {
      returnedResponse = await result.current.lockEscrow(params);
    });

    // Verify complete response structure
    expect(returnedResponse).toEqual(expectedResponse);
    expect(returnedResponse.success).toBe(true);
    expect(returnedResponse.escrowId).toBe('contract-0xabc123');
    expect(returnedResponse.transactionHash).toBe('txhash_xyz789');
    expect(returnedResponse.lockedAmount).toBe('100.5');
  });
});
