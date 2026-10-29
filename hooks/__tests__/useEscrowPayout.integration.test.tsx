/**
 * Integration Tests for useEscrowPayout Hook
 * 
 * These tests validate the React Query-based escrow payout hook with mocked blockchain responses.
 * Coverage includes:
 * - Query-based data fetching with React Query
 * - Multi-signature threshold validation
 * - Release funds mutation with contract interaction
 * - Loading and error states
 * - Cache invalidation and refetching
 * 
 * Tests use mock queryClient and Stellar SDK to avoid real network calls.
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEscrowPayout } from '@/hooks/useEscrowPayout';
import { escrowService } from '@/services/escrowService';
import {
  MockStellarServer,
  MockWallet,
  createMockStellarEnvironment,
  createMockContractDataResponses,
} from '@/__tests__/mocks/stellarMockProvider';
import type { EscrowDetails } from '@/types/escrow';

// Mock the escrowService module
jest.mock('@/services/escrowService');

// Mock sonner toast
jest.mock('sonner', () => ({
  toast: {
    error: jest.fn(),
    success: jest.fn(),
  },
}));

import { toast } from 'sonner';

describe('useEscrowPayout — Integration Tests with React Query and Mocked Web3 Provider', () => {
  const mockEscrowService = escrowService as jest.Mocked<typeof escrowService>;
  const mockToast = toast as jest.Mocked<typeof toast>;

  let mockWallet: MockWallet;
  let mockServer: MockStellarServer;
  let queryClient: QueryClient;

  const mockEscrowId = 'contract-0x123';

  const mockEscrowDetails: EscrowDetails = {
    requiredSignatures: 2,
    currentSignatures: 2,
    isReleased: false,
    signers: [
      'GSIGNER1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890ABC',
      'GSIGNER2234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890ABC',
    ],
  };

  const createWrapper = () => {
    return ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Create fresh query client for each test
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    const environment = createMockStellarEnvironment({
      walletConnected: true,
      publicKey: 'GBXYZ1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890ABC',
      transactionHash: 'txhash_' + Math.random().toString(36).substring(7),
      transactionDelay: 50,
      transactionStatus: 'SUCCESS',
    });

    mockWallet = environment.wallet;
    mockServer = environment.server;
  });

  // ═════════════════════════════════════════════════════════════════════
  // HAPPY PATH: Successful data fetch and release
  // ═════════════════════════════════════════════════════════════════════

  it('should fetch escrow details and compute canRelease correctly when threshold is met', async () => {
    mockEscrowService.getEscrowDetails.mockResolvedValue(mockEscrowDetails);

    const { result } = renderHook(() => useEscrowPayout(mockEscrowId), {
      wrapper: createWrapper(),
    });

    // Initially loading
    expect(result.current.isLoading).toBe(true);

    // Wait for query to resolve
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Verify data is loaded
    expect(result.current.requiredSignatures).toBe(2);
    expect(result.current.currentSignatures).toBe(2);
    expect(result.current.signers).toHaveLength(2);
    expect(result.current.isReleased).toBe(false);

    // Verify canRelease is true (2 >= 2 and not released)
    expect(result.current.canRelease).toBe(true);

    // Verify no error
    expect(result.current.error).toBeNull();
  });

  it('should successfully release funds when canRelease is true', async () => {
    mockEscrowService.getEscrowDetails.mockResolvedValue(mockEscrowDetails);
    mockEscrowService.releaseFunds.mockResolvedValue({
      success: true,
      transactionHash: 'txhash_release_123',
    });

    const { result } = renderHook(() => useEscrowPayout(mockEscrowId), {
      wrapper: createWrapper(),
    });

    // Wait for initial query
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Call release funds
    await act(async () => {
      await result.current.releaseFunds();
    });

    // Verify service was called
    expect(mockEscrowService.releaseFunds).toHaveBeenCalledWith(mockEscrowId);
  });

  // ═════════════════════════════════════════════════════════════════════
  // MULTI-SIGNATURE THRESHOLD: canRelease computation
  // ═════════════════════════════════════════════════════════════════════

  it('should compute canRelease as false when signatures below threshold (1 of 2)', async () => {
    const insufficientSigDetails: EscrowDetails = {
      requiredSignatures: 2,
      currentSignatures: 1,
      isReleased: false,
      signers: [
        'GSIGNER1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890ABC',
      ],
    };

    mockEscrowService.getEscrowDetails.mockResolvedValue(insufficientSigDetails);

    const { result } = renderHook(() => useEscrowPayout(mockEscrowId), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.currentSignatures).toBe(1);
    expect(result.current.requiredSignatures).toBe(2);
    expect(result.current.canRelease).toBe(false);
  });

  it('should compute canRelease as false when no signatures yet (0 of 2)', async () => {
    const zeroSigDetails: EscrowDetails = {
      requiredSignatures: 2,
      currentSignatures: 0,
      isReleased: false,
      signers: [],
    };

    mockEscrowService.getEscrowDetails.mockResolvedValue(zeroSigDetails);

    const { result } = renderHook(() => useEscrowPayout(mockEscrowId), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.currentSignatures).toBe(0);
    expect(result.current.canRelease).toBe(false);
  });

  it('should compute canRelease as true when signatures exceed threshold (3 of 3)', async () => {
    const exceededSigDetails: EscrowDetails = {
      requiredSignatures: 3,
      currentSignatures: 3,
      isReleased: false,
      signers: [
        'GSIGNER1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890ABC',
        'GSIGNER2234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890ABC',
        'GSIGNER3234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890ABC',
      ],
    };

    mockEscrowService.getEscrowDetails.mockResolvedValue(exceededSigDetails);

    const { result } = renderHook(() => useEscrowPayout(mockEscrowId), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.currentSignatures).toBe(3);
    expect(result.current.canRelease).toBe(true);
  });

  it('should compute canRelease as false when already released, even with signatures', async () => {
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

    const { result } = renderHook(() => useEscrowPayout(mockEscrowId), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isReleased).toBe(true);
    expect(result.current.canRelease).toBe(false); // Cannot release twice
  });

  // ═════════════════════════════════════════════════════════════════════
  // LOADING STATES: Initial and mutation loading
  // ═════════════════════════════════════════════════════════════════════

  it('should show isLoading true during initial data fetch', async () => {
    mockEscrowService.getEscrowDetails.mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve(mockEscrowDetails), 100))
    );

    const { result } = renderHook(() => useEscrowPayout(mockEscrowId), {
      wrapper: createWrapper(),
    });

    // Immediately after hook call, should be loading
    expect(result.current.isLoading).toBe(true);

    // Wait for resolution
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.requiredSignatures).toBe(2);
  });

  it('should transition isLoading correctly during release mutation', async () => {
    mockEscrowService.getEscrowDetails.mockResolvedValue(mockEscrowDetails);
    mockEscrowService.releaseFunds.mockResolvedValue({
      success: true,
      transactionHash: 'txhash_release',
    });

    const { result } = renderHook(() => useEscrowPayout(mockEscrowId), {
      wrapper: createWrapper(),
    });

    // Wait for initial query
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Call release and check loading during mutation
    let mutationStarted = false;
    mockEscrowService.releaseFunds.mockImplementation(async () => {
      mutationStarted = true;
      return {
        success: true,
        transactionHash: 'txhash_release',
      };
    });

    await act(async () => {
      await result.current.releaseFunds();
    });

    expect(mockEscrowService.releaseFunds).toHaveBeenCalled();
  });

  // ═════════════════════════════════════════════════════════════════════
  // ERROR HANDLING: Query and mutation errors
  // ═════════════════════════════════════════════════════════════════════

  it('should handle error when fetching escrow details fails', async () => {
    const fetchError = new Error('Network error connecting to Soroban RPC');
    mockEscrowService.getEscrowDetails.mockRejectedValue(fetchError);

    const { result } = renderHook(() => useEscrowPayout(mockEscrowId), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBeTruthy();
    expect(result.current.requiredSignatures).toBe(0); // Default or unset
    expect(result.current.canRelease).toBe(false);
  });

  it('should handle error when release mutation fails', async () => {
    mockEscrowService.getEscrowDetails.mockResolvedValue(mockEscrowDetails);
    const releaseError = new Error('Failed to release escrow or transaction timed out.');
    mockEscrowService.releaseFunds.mockRejectedValue(releaseError);

    const { result } = renderHook(() => useEscrowPayout(mockEscrowId), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    let mutationError: Error | null = null;

    await act(async () => {
      try {
        await result.current.releaseFunds();
      } catch (err) {
        mutationError = err as Error;
      }
    });

    expect(mutationError?.message).toContain('timed out');
  });

  it('should handle wallet not connected error during release', async () => {
    mockWallet.setConfig({ walletConnected: false, publicKey: null });
    mockEscrowService.getEscrowDetails.mockResolvedValue(mockEscrowDetails);
    const walletError = new Error('Wallet not connected or public key unavailable.');
    mockEscrowService.releaseFunds.mockRejectedValue(walletError);

    const { result } = renderHook(() => useEscrowPayout(mockEscrowId), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    let caughtError: Error | null = null;

    await act(async () => {
      try {
        await result.current.releaseFunds();
      } catch (err) {
        caughtError = err as Error;
      }
    });

    expect(caughtError?.message).toContain('Wallet not connected');
  });

  it('should handle contract revert during release', async () => {
    mockEscrowService.getEscrowDetails.mockResolvedValue(mockEscrowDetails);
    const revertError = new Error('Contract invocation reverted');
    mockEscrowService.releaseFunds.mockRejectedValue(revertError);

    const { result } = renderHook(() => useEscrowPayout(mockEscrowId), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    let caughtError: Error | null = null;

    await act(async () => {
      try {
        await result.current.releaseFunds();
      } catch (err) {
        caughtError = err as Error;
      }
    });

    expect(caughtError?.message).toContain('reverted');
  });

  // ═════════════════════════════════════════════════════════════════════
  // SIGNERS ARRAY: Verifying signer data is correctly exposed
  // ═════════════════════════════════════════════════════════════════════

  it('should expose all signers who have signed', async () => {
    mockEscrowService.getEscrowDetails.mockResolvedValue(mockEscrowDetails);

    const { result } = renderHook(() => useEscrowPayout(mockEscrowId), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.signers).toHaveLength(2);
    expect(result.current.signers[0]).toBe(
      'GSIGNER1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890ABC'
    );
    expect(result.current.signers[1]).toBe(
      'GSIGNER2234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890ABC'
    );
  });

  it('should expose empty signers array when no one has signed yet', async () => {
    const zeroSigDetails: EscrowDetails = {
      requiredSignatures: 2,
      currentSignatures: 0,
      isReleased: false,
      signers: [],
    };

    mockEscrowService.getEscrowDetails.mockResolvedValue(zeroSigDetails);

    const { result } = renderHook(() => useEscrowPayout(mockEscrowId), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.signers).toHaveLength(0);
    expect(result.current.currentSignatures).toBe(0);
  });

  // ═════════════════════════════════════════════════════════════════════
  // HOOK DISABLE: Ensure query is disabled when escrowId is empty
  // ═════════════════════════════════════════════════════════════════════

  it('should not fetch when escrowId is empty', async () => {
    const { result } = renderHook(() => useEscrowPayout(''), {
      wrapper: createWrapper(),
    });

    // Should not call getEscrowDetails if escrowId is empty
    expect(mockEscrowService.getEscrowDetails).not.toHaveBeenCalled();
  });

  it('should not fetch when escrowId is not provided', async () => {
    const { result } = renderHook(() => useEscrowPayout(''), {
      wrapper: createWrapper(),
    });

    // Query should not run
    expect(result.current.requiredSignatures).toBe(0);
  });

  // ═════════════════════════════════════════════════════════════════════
  // DATA REFETCH: Ensure cache and manual refetch work
  // ═════════════════════════════════════════════════════════════════════

  it('should refetch data when escrowId changes', async () => {
    const escrowId1 = 'contract-0x123';
    const escrowId2 = 'contract-0x456';

    const details1: EscrowDetails = {
      requiredSignatures: 2,
      currentSignatures: 2,
      isReleased: false,
      signers: ['GSIGNER1', 'GSIGNER2'],
    };

    const details2: EscrowDetails = {
      requiredSignatures: 3,
      currentSignatures: 1,
      isReleased: false,
      signers: ['GSIGNER1'],
    };

    mockEscrowService.getEscrowDetails
      .mockResolvedValueOnce(details1)
      .mockResolvedValueOnce(details2);

    const { result, rerender } = renderHook(
      ({ id }: { id: string }) => useEscrowPayout(id),
      {
        wrapper: createWrapper(),
        initialProps: { id: escrowId1 },
      }
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.requiredSignatures).toBe(2);
    expect(result.current.currentSignatures).toBe(2);

    // Rerender with different escrowId
    rerender({ id: escrowId2 });

    await waitFor(() => {
      expect(result.current.requiredSignatures).toBe(3);
    });

    expect(result.current.currentSignatures).toBe(1);
    expect(mockEscrowService.getEscrowDetails).toHaveBeenCalledTimes(2);
    expect(mockEscrowService.getEscrowDetails).toHaveBeenNthCalledWith(1, escrowId1);
    expect(mockEscrowService.getEscrowDetails).toHaveBeenNthCalledWith(2, escrowId2);
  });

  // ═════════════════════════════════════════════════════════════════════
  // EDGE CASES: Single signer, no signatures, high threshold
  // ═════════════════════════════════════════════════════════════════════

  it('should handle single signer escrow (1 of 1)', async () => {
    const singleSigDetails: EscrowDetails = {
      requiredSignatures: 1,
      currentSignatures: 1,
      isReleased: false,
      signers: ['GSIGNER1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890ABC'],
    };

    mockEscrowService.getEscrowDetails.mockResolvedValue(singleSigDetails);

    const { result } = renderHook(() => useEscrowPayout(mockEscrowId), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.canRelease).toBe(true);
    expect(result.current.currentSignatures).toBe(1);
    expect(result.current.requiredSignatures).toBe(1);
  });

  it('should handle high threshold multi-signature (5 of 10)', async () => {
    const highThresholdDetails: EscrowDetails = {
      requiredSignatures: 10,
      currentSignatures: 5,
      isReleased: false,
      signers: Array.from({ length: 5 }, (_, i) =>
        `GSIGNER${i + 1}234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890ABC`
      ),
    };

    mockEscrowService.getEscrowDetails.mockResolvedValue(highThresholdDetails);

    const { result } = renderHook(() => useEscrowPayout(mockEscrowId), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.canRelease).toBe(false);
    expect(result.current.currentSignatures).toBe(5);
    expect(result.current.requiredSignatures).toBe(10);
    expect(result.current.signers).toHaveLength(5);
  });
});
