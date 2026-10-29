import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import MultiSigApprovals from '@/components/wallet/MultiSigApprovals';
import * as useMultiSigApprovalsModule from '@/hooks/useMultiSigApprovals';
import { useWalletStore } from '@/store/walletStore';

// Mock the useMultiSigApprovals hook
jest.mock('@/hooks/useMultiSigApprovals');

// Mock the wallet store
jest.mock('@/store/walletStore', () => ({
  useWalletStore: jest.fn(),
}));

// Mock sonner
jest.mock('sonner', () => ({
  toast: {
    error: jest.fn(),
    success: jest.fn(),
  },
}));

const mockUseMultiSigApprovals = useMultiSigApprovalsModule.useMultiSigApprovals as jest.MockedFunction<
  typeof useMultiSigApprovalsModule.useMultiSigApprovals
>;

const mockUseWalletStore = useWalletStore as jest.MockedFunction<typeof useWalletStore>;

const MOCK_OPERATION = {
  operationId: 'op-001-abcdef123456',
  transactionEnvelope: 'AAAAAgAAAABa+Cd7L3r0w....',
  description: 'Transfer 1000 XLM to recipient',
  signaturesRequired: 2,
  currentSignatures: 1,
  signers: [
    {
      publicKey: 'GACV3JHPXU7CKKYIRSTNLPFVFWGCAYDGBVNFNFJDG5BFCPJV7ZRKJSGN',
      weight: 1,
      approved: true,
    },
    {
      publicKey: 'GBUQWP3BOUZX34ULNQG23RQ6F4BVWCIRUUOKLVFEFK4QB26WVJDBKFEA',
      weight: 1,
      approved: false,
    },
  ],
  createdAt: '2026-06-01T10:00:00Z',
  status: 'pending' as const,
  // Relative to now so the operation stays signable whenever the suite runs
  expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  isHighValue: false,
  riskLevel: 'low' as const,
};

const HIGH_VALUE_DEFAULTS = {
  highValueThresholdXlm: 10000,
  pendingHighValueOperation: null,
  confirmHighValueOperation: jest.fn(),
  cancelHighValueOperation: jest.fn(),
};

describe('MultiSigApprovals Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseWalletStore.mockReturnValue({
      address: '0xGACTEST123456789',
      isConnected: true,
      setWallet: jest.fn(),
      clearWalletState: jest.fn(),
    } as any);
  });

  test('should render loading state initially', () => {
    mockUseMultiSigApprovals.mockReturnValue({
      ...HIGH_VALUE_DEFAULTS,
      operations: [],
      isLoading: true,
      error: null,
      isSigning: false,
      fetchPendingOperations: jest.fn(),
      signOperation: jest.fn(),
      refreshOperations: jest.fn(),
    });

    render(<MultiSigApprovals />);

    expect(screen.getByText(/Loading pending approvals/i)).toBeInTheDocument();
  });

  test('should display empty state when no operations exist', async () => {
    mockUseMultiSigApprovals.mockReturnValue({
      ...HIGH_VALUE_DEFAULTS,
      operations: [],
      isLoading: false,
      error: null,
      isSigning: false,
      fetchPendingOperations: jest.fn(),
      signOperation: jest.fn(),
      refreshOperations: jest.fn(),
    });

    render(<MultiSigApprovals />);

    await waitFor(() => {
      expect(screen.getByText(/No Pending Approvals/i)).toBeInTheDocument();
      expect(screen.getByText(/All multi-signature operations are up to date/i)).toBeInTheDocument();
    });
  });

  test('should display error state with retry button', async () => {
    const mockRefresh = jest.fn();
    mockUseMultiSigApprovals.mockReturnValue({
      ...HIGH_VALUE_DEFAULTS,
      operations: [],
      isLoading: false,
      error: 'Failed to fetch operations from the backend',
      isSigning: false,
      fetchPendingOperations: jest.fn(),
      signOperation: jest.fn(),
      refreshOperations: mockRefresh,
    });

    render(<MultiSigApprovals />);

    await waitFor(() => {
      expect(screen.getByText(/Failed to load operations/i)).toBeInTheDocument();
      expect(screen.getByText(/Failed to fetch operations from the backend/i)).toBeInTheDocument();
    });

    const retryButton = screen.getByRole('button', { name: /Retry/i });
    expect(retryButton).toBeInTheDocument();

    fireEvent.click(retryButton);
    expect(mockRefresh).toHaveBeenCalled();
  });

  test('should render list of pending operations', async () => {
    mockUseMultiSigApprovals.mockReturnValue({
      ...HIGH_VALUE_DEFAULTS,
      operations: [MOCK_OPERATION],
      isLoading: false,
      error: null,
      isSigning: false,
      fetchPendingOperations: jest.fn(),
      signOperation: jest.fn(),
      refreshOperations: jest.fn(),
    });

    render(<MultiSigApprovals />);

    await waitFor(() => {
      expect(screen.getByText(/Transfer 1000 XLM to recipient/i)).toBeInTheDocument();
      expect(screen.getByText(/Pending Approvals.*1/)).toBeInTheDocument();
    });
  });

  test('should display operation details including signatures count', async () => {
    mockUseMultiSigApprovals.mockReturnValue({
      ...HIGH_VALUE_DEFAULTS,
      operations: [MOCK_OPERATION],
      isLoading: false,
      error: null,
      isSigning: false,
      fetchPendingOperations: jest.fn(),
      signOperation: jest.fn(),
      refreshOperations: jest.fn(),
    });

    render(<MultiSigApprovals />);

    await waitFor(() => {
      expect(screen.getByText(/Signatures: 1 \/ 2/)).toBeInTheDocument();
    });
  });

  test('should display progress bar for signature collection', async () => {
    mockUseMultiSigApprovals.mockReturnValue({
      ...HIGH_VALUE_DEFAULTS,
      operations: [MOCK_OPERATION],
      isLoading: false,
      error: null,
      isSigning: false,
      fetchPendingOperations: jest.fn(),
      signOperation: jest.fn(),
      refreshOperations: jest.fn(),
    });

    render(<MultiSigApprovals />);

    await waitFor(() => {
      expect(screen.getByText(/50%/)).toBeInTheDocument();
    });
  });

  test('should display operation status badge', async () => {
    mockUseMultiSigApprovals.mockReturnValue({
      ...HIGH_VALUE_DEFAULTS,
      operations: [MOCK_OPERATION],
      isLoading: false,
      error: null,
      isSigning: false,
      fetchPendingOperations: jest.fn(),
      signOperation: jest.fn(),
      refreshOperations: jest.fn(),
    });

    render(<MultiSigApprovals />);

    await waitFor(() => {
      const matches = screen.getAllByText(/Pending/);
      expect(matches.length).toBeGreaterThan(0);
    });
  });

  test('should display signers list with approval status', async () => {
    mockUseMultiSigApprovals.mockReturnValue({
      ...HIGH_VALUE_DEFAULTS,
      operations: [MOCK_OPERATION],
      isLoading: false,
      error: null,
      isSigning: false,
      fetchPendingOperations: jest.fn(),
      signOperation: jest.fn(),
      refreshOperations: jest.fn(),
    });

    render(<MultiSigApprovals />);

    await waitFor(() => {
      expect(screen.getByText(/Signers/i)).toBeInTheDocument();
      const weights = screen.getAllByText(/Weight: 1/);
      expect(weights.length).toBeGreaterThan(0);
    });
  });

  test('should display Sign Operation button for unsigned operations', async () => {
    mockUseMultiSigApprovals.mockReturnValue({
      ...HIGH_VALUE_DEFAULTS,
      operations: [MOCK_OPERATION],
      isLoading: false,
      error: null,
      isSigning: false,
      fetchPendingOperations: jest.fn(),
      signOperation: jest.fn(),
      refreshOperations: jest.fn(),
    });

    render(<MultiSigApprovals />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Sign Operation/i })).toBeInTheDocument();
    });
  });

  test('should display signed status when user has already signed', async () => {
    const signedOperation = {
      ...MOCK_OPERATION,
      signers: MOCK_OPERATION.signers.map((s) => ({
        ...s,
        approved: s.publicKey === 'GACV3JHPXU7CKKYIRSTNLPFVFWGCAYDGBVNFNFJDG5BFCPJV7ZRKJSGN',
      })),
    };

    mockUseMultiSigApprovals.mockReturnValue({
      ...HIGH_VALUE_DEFAULTS,
      operations: [signedOperation],
      isLoading: false,
      error: null,
      isSigning: false,
      fetchPendingOperations: jest.fn(),
      signOperation: jest.fn(),
      refreshOperations: jest.fn(),
    });

    // Simulate that the wallet address matches the signer's public key
    mockUseWalletStore.mockReturnValue({
      address: 'GACV3JHPXU7CKKYIRSTNLPFVFWGCAYDGBVNFNFJDG5BFCPJV7ZRKJSGN',
      isConnected: true,
      setWallet: jest.fn(),
      clearWalletState: jest.fn(),
    } as any);

    render(<MultiSigApprovals />);

    await waitFor(() => {
      expect(screen.getByText(/You have signed this/)).toBeInTheDocument();
    });
  });

  test('should display complete status when all signatures collected', async () => {
    const completeOperation = {
      ...MOCK_OPERATION,
      currentSignatures: 2,
      signers: MOCK_OPERATION.signers.map((s) => ({
        ...s,
        approved: true,
      })),
    };

    mockUseMultiSigApprovals.mockReturnValue({
      ...HIGH_VALUE_DEFAULTS,
      operations: [completeOperation],
      isLoading: false,
      error: null,
      isSigning: false,
      fetchPendingOperations: jest.fn(),
      signOperation: jest.fn(),
      refreshOperations: jest.fn(),
    });

    render(<MultiSigApprovals />);

    await waitFor(() => {
      expect(screen.getByText(/All signatures collected/)).toBeInTheDocument();
    });
  });

  test('should call signOperation when Sign button is clicked', async () => {
    const mockSign = jest.fn();
    mockUseMultiSigApprovals.mockReturnValue({
      ...HIGH_VALUE_DEFAULTS,
      operations: [MOCK_OPERATION],
      isLoading: false,
      error: null,
      isSigning: false,
      fetchPendingOperations: jest.fn(),
      signOperation: mockSign,
      refreshOperations: jest.fn(),
    });

    render(<MultiSigApprovals />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Sign Operation/i })).toBeInTheDocument();
    });

    const signButton = screen.getByRole('button', { name: /Sign Operation/i });
    fireEvent.click(signButton);

    expect(mockSign).toHaveBeenCalledWith(MOCK_OPERATION);
  });

  test('should call onSignSuccess callback after signing', async () => {
    const mockOnSuccess = jest.fn();
    const mockSign = jest.fn(() => Promise.resolve(true));
    
    mockUseMultiSigApprovals.mockReturnValue({
      ...HIGH_VALUE_DEFAULTS,
      operations: [MOCK_OPERATION],
      isLoading: false,
      error: null,
      isSigning: false,
      fetchPendingOperations: jest.fn(),
      signOperation: mockSign,
      refreshOperations: jest.fn(),
    });

    render(<MultiSigApprovals onSignSuccess={mockOnSuccess} />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Sign Operation/i })).toBeInTheDocument();
    });

    const signButton = screen.getByRole('button', { name: /Sign Operation/i });
    fireEvent.click(signButton);

    await waitFor(() => {
      expect(mockOnSuccess).toHaveBeenCalledWith(MOCK_OPERATION.operationId);
    });
  });

  test('should disable sign button while signing', async () => {
    mockUseMultiSigApprovals.mockReturnValue({
      ...HIGH_VALUE_DEFAULTS,
      operations: [MOCK_OPERATION],
      isLoading: false,
      error: null,
      isSigning: true,
      fetchPendingOperations: jest.fn(),
      signOperation: jest.fn(),
      refreshOperations: jest.fn(),
    });

    render(<MultiSigApprovals />);

    await waitFor(() => {
      const signButton = screen.getByRole('button', { name: /Signing/i });
      expect(signButton).toBeDisabled();
    });
  });

  test('should display expiration warning for operations expiring soon', async () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    const expiringOperation = {
      ...MOCK_OPERATION,
      expiresAt: tomorrow.toISOString(),
    };

    mockUseMultiSigApprovals.mockReturnValue({
      ...HIGH_VALUE_DEFAULTS,
      operations: [expiringOperation],
      isLoading: false,
      error: null,
      isSigning: false,
      fetchPendingOperations: jest.fn(),
      signOperation: jest.fn(),
      refreshOperations: jest.fn(),
    });

    render(<MultiSigApprovals />);

    await waitFor(() => {
      expect(screen.getByText(/Expires in 1 day/)).toBeInTheDocument();
    });
  });

  test('should display expired operation as non-signable', async () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const expiredOperation = {
      ...MOCK_OPERATION,
      expiresAt: yesterday.toISOString(),
      status: 'expired' as const,
    };

    mockUseMultiSigApprovals.mockReturnValue({
      ...HIGH_VALUE_DEFAULTS,
      operations: [expiredOperation],
      isLoading: false,
      error: null,
      isSigning: false,
      fetchPendingOperations: jest.fn(),
      signOperation: jest.fn(),
      refreshOperations: jest.fn(),
    });

    render(<MultiSigApprovals />);

    await waitFor(() => {
      expect(screen.getByText(/Cannot sign/)).toBeInTheDocument();
    });
  });

  test('should have refresh button to reload operations', async () => {
    const mockRefresh = jest.fn();
    mockUseMultiSigApprovals.mockReturnValue({
      ...HIGH_VALUE_DEFAULTS,
      operations: [MOCK_OPERATION],
      isLoading: false,
      error: null,
      isSigning: false,
      fetchPendingOperations: jest.fn(),
      signOperation: jest.fn(),
      refreshOperations: mockRefresh,
    });

    render(<MultiSigApprovals />);

    const refreshButton = screen.getByRole('button', { name: /Refresh/i });
    expect(refreshButton).toBeInTheDocument();

    fireEvent.click(refreshButton);
    expect(mockRefresh).toHaveBeenCalled();
  });

  test('should fetch operations when wallet address changes', () => {
    const mockFetch = jest.fn();
    mockUseMultiSigApprovals.mockReturnValue({
      ...HIGH_VALUE_DEFAULTS,
      operations: [],
      isLoading: false,
      error: null,
      isSigning: false,
      fetchPendingOperations: mockFetch,
      signOperation: jest.fn(),
      refreshOperations: jest.fn(),
    });

    render(<MultiSigApprovals />);

    expect(mockFetch).toHaveBeenCalledWith('0xGACTEST123456789');
  });

  test('should display multiple operations in list', async () => {
    const operation2 = {
      ...MOCK_OPERATION,
      operationId: 'op-002-abcdef789012',
      description: 'Transfer 500 XLM to another recipient',
    };

    mockUseMultiSigApprovals.mockReturnValue({
      ...HIGH_VALUE_DEFAULTS,
      operations: [MOCK_OPERATION, operation2],
      isLoading: false,
      error: null,
      isSigning: false,
      fetchPendingOperations: jest.fn(),
      signOperation: jest.fn(),
      refreshOperations: jest.fn(),
    });

    render(<MultiSigApprovals />);

    await waitFor(() => {
      expect(screen.getByText(/Transfer 1000 XLM to recipient/)).toBeInTheDocument();
      expect(screen.getByText(/Transfer 500 XLM to another recipient/)).toBeInTheDocument();
      expect(screen.getByText(/Pending Approvals.*2/)).toBeInTheDocument();
    });
  });

  test('should show a high value badge only on high-value operations', async () => {
    const highValueOperation = {
      ...MOCK_OPERATION,
      operationId: 'op-002-highvalue',
      description: 'Release 25000 XLM cargo escrow',
      amountXlm: 25000,
      isHighValue: true,
      riskLevel: 'high' as const,
    };

    mockUseMultiSigApprovals.mockReturnValue({
      ...HIGH_VALUE_DEFAULTS,
      operations: [MOCK_OPERATION, highValueOperation],
      isLoading: false,
      error: null,
      isSigning: false,
      fetchPendingOperations: jest.fn(),
      signOperation: jest.fn(),
      refreshOperations: jest.fn(),
    });

    render(<MultiSigApprovals />);

    expect(screen.getAllByText('High value')).toHaveLength(1);
    const card = screen.getByText('Release 25000 XLM cargo escrow').closest('div');
    expect(card).toHaveTextContent('High value');
  });

  test('should pass the high-value callback through to the hook', () => {
    const onHighValueOperation = jest.fn();
    mockUseMultiSigApprovals.mockReturnValue({
      ...HIGH_VALUE_DEFAULTS,
      operations: [],
      isLoading: false,
      error: null,
      isSigning: false,
      fetchPendingOperations: jest.fn(),
      signOperation: jest.fn(),
      refreshOperations: jest.fn(),
    });

    render(<MultiSigApprovals onHighValueOperation={onHighValueOperation} />);

    expect(mockUseMultiSigApprovals).toHaveBeenCalledWith({ onHighValueOperation });
  });

  test('should not call onSignSuccess when signing is deferred to the high-value modal', async () => {
    const mockOnSuccess = jest.fn();
    const mockSign = jest.fn(() => Promise.resolve(false));
    mockUseMultiSigApprovals.mockReturnValue({
      ...HIGH_VALUE_DEFAULTS,
      operations: [{ ...MOCK_OPERATION, amountXlm: 50000, isHighValue: true, riskLevel: 'high' }],
      isLoading: false,
      error: null,
      isSigning: false,
      fetchPendingOperations: jest.fn(),
      signOperation: mockSign,
      refreshOperations: jest.fn(),
    });

    render(<MultiSigApprovals onSignSuccess={mockOnSuccess} />);

    fireEvent.click(screen.getByRole('button', { name: /Sign Operation/i }));

    await waitFor(() => expect(mockSign).toHaveBeenCalled());
    expect(mockOnSuccess).not.toHaveBeenCalled();
  });
});
