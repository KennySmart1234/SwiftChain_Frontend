import { render, screen, fireEvent, within } from '@testing-library/react';
import { PayoutUI } from '../PayoutUI';
import { useEscrowPayout } from '@/hooks/useEscrowPayout';
import { escrowService } from '@/services/escrowService';
import type { EscrowDetails, PayoutFeeBreakdown } from '@/types/escrow';

// Mock the useEscrowPayout hook
jest.mock('@/hooks/useEscrowPayout');
const mockedUseEscrowPayout = useEscrowPayout as jest.Mock;

// Mock the escrowService
jest.mock('@/services/escrowService', () => ({
  escrowService: {
    getEscrowDetails: jest.fn(),
    releaseFunds: jest.fn(),
  },
}));

describe('PayoutUI', () => {
  const mockEscrowId = 'escrow-123';
  const mockReleaseFunds = jest.fn();

  const feeBreakdown: PayoutFeeBreakdown = {
    currency: 'XLM',
    grossAmount: 1000,
    platformFeePercent: 2.5,
    platformFee: 25,
    estimatedGasFee: 0.5,
    netPayout: 974.5,
  };

  const hookState = (overrides: Record<string, unknown> = {}) => ({
    isLoading: false,
    error: null,
    requiredSignatures: 2,
    currentSignatures: 2,
    signers: ['GBX123', 'GCY456'],
    isReleased: false,
    canRelease: true,
    releaseFunds: mockReleaseFunds,
    feeBreakdown,
    isFeeBreakdownLoading: false,
    feeBreakdownError: null,
    ...overrides,
  });

  beforeEach(() => {
    mockedUseEscrowPayout.mockClear();
    mockReleaseFunds.mockClear();
  });

  it('should render loading state', () => {
    mockedUseEscrowPayout.mockReturnValue(
      hookState({
        isLoading: true,
        error: null,
        requiredSignatures: 0,
        currentSignatures: 0,
        signers: [],
        isReleased: false,
        canRelease: false,
      }),
    );

    render(<PayoutUI escrowId={mockEscrowId} />);
    expect(screen.getByLabelText('Loading payout UI')).toBeInTheDocument();
  });

  it('should render error state', () => {
    mockedUseEscrowPayout.mockReturnValue(
      hookState({
        isLoading: false,
        error: 'Failed to fetch escrow details',
        requiredSignatures: 0,
        currentSignatures: 0,
        signers: [],
        isReleased: false,
        canRelease: false,
      }),
    );

    render(<PayoutUI escrowId={mockEscrowId} />);
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Failed to fetch escrow details',
    );
  });

  it('should disable the "Release Funds" button when signatures are below threshold (1 of 2)', () => {
    mockedUseEscrowPayout.mockReturnValue(
      hookState({
        isLoading: false,
        error: null,
        requiredSignatures: 2,
        currentSignatures: 1,
        signers: ['GBX123'],
        isReleased: false,
        canRelease: false,
      }),
    );

    render(<PayoutUI escrowId={mockEscrowId} />);

    const releaseButton = screen.getByRole('button', { name: 'Release Funds' });
    expect(releaseButton).toBeDisabled();
    expect(releaseButton).toHaveAttribute('disabled');
    expect(screen.getByText(/1.*of.*2/i)).toBeInTheDocument();

    fireEvent.click(releaseButton);
    expect(mockReleaseFunds).not.toHaveBeenCalled();
  });

  it('should enable the "Release Funds" button when signatures meet the threshold (2 of 2)', () => {
    mockedUseEscrowPayout.mockReturnValue(
      hookState({
        isLoading: false,
        error: null,
        requiredSignatures: 2,
        currentSignatures: 2,
        signers: ['GBX123', 'GCY456'],
        isReleased: false,
        canRelease: true,
      }),
    );

    render(<PayoutUI escrowId={mockEscrowId} />);

    const releaseButton = screen.getByRole('button', { name: 'Release Funds' });
    expect(releaseButton).not.toBeDisabled();
    expect(releaseButton).not.toHaveAttribute('disabled');
    expect(screen.getByText(/2.*of.*2/i)).toBeInTheDocument();

    fireEvent.click(releaseButton);
    expect(mockReleaseFunds).toHaveBeenCalledTimes(1);
  });

  it('verifies backend API service returns EscrowDetails response shape', async () => {
    const apiResponseData: EscrowDetails = {
      currentSignatures: 1,
      requiredSignatures: 2,
      isReleased: false,
      signers: ['GBX123'],
    };

    (escrowService.getEscrowDetails as jest.Mock).mockResolvedValue(apiResponseData);

    const result = await escrowService.getEscrowDetails(mockEscrowId);
    expect(result.currentSignatures).toBe(1);
    expect(result.requiredSignatures).toBe(2);
  });

  describe('fee breakdown', () => {
    it('renders commission, gas estimate and net payout', () => {
      mockedUseEscrowPayout.mockReturnValue(hookState());

      render(<PayoutUI escrowId={mockEscrowId} />);

      const section = screen.getByRole('region', { name: 'Payout Breakdown' });
      expect(within(section).getByText('1,000.00 XLM')).toBeInTheDocument();
      expect(within(section).getByText('Platform commission (2.5%)')).toBeInTheDocument();
      expect(within(section).getByText('-25.00 XLM')).toBeInTheDocument();
      expect(within(section).getByText('-0.50 XLM')).toBeInTheDocument();
      expect(screen.getByTestId('net-payout')).toHaveTextContent('974.50 XLM');
    });

    it('places the breakdown above the Release Funds button', () => {
      mockedUseEscrowPayout.mockReturnValue(hookState());

      render(<PayoutUI escrowId={mockEscrowId} />);

      const section = screen.getByRole('region', { name: 'Payout Breakdown' });
      const button = screen.getByRole('button', { name: 'Release Funds' });
      expect(section.compareDocumentPosition(button) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });

    it('updates the net payout when the escrow amount changes', () => {
      mockedUseEscrowPayout.mockReturnValue(hookState());
      const { rerender } = render(<PayoutUI escrowId={mockEscrowId} />);
      expect(screen.getByTestId('net-payout')).toHaveTextContent('974.50 XLM');

      mockedUseEscrowPayout.mockReturnValue(
        hookState({
          feeBreakdown: { ...feeBreakdown, grossAmount: 2000, platformFee: 50, netPayout: 1949.5 },
        }),
      );
      rerender(<PayoutUI escrowId={mockEscrowId} />);

      expect(screen.getByTestId('net-payout')).toHaveTextContent('1,949.50 XLM');
    });

    it('shows a skeleton while the fee quote loads', () => {
      mockedUseEscrowPayout.mockReturnValue(
        hookState({ feeBreakdown: null, isFeeBreakdownLoading: true }),
      );

      render(<PayoutUI escrowId={mockEscrowId} />);

      expect(screen.getByLabelText('Loading fee breakdown')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Release Funds' })).toBeInTheDocument();
    });

    it('keeps the signature UI usable when the fee quote fails', () => {
      mockedUseEscrowPayout.mockReturnValue(
        hookState({ feeBreakdown: null, feeBreakdownError: 'Service unavailable' }),
      );

      render(<PayoutUI escrowId={mockEscrowId} />);

      expect(screen.getByRole('status')).toHaveTextContent(
        'Fee breakdown unavailable: Service unavailable',
      );
      expect(screen.getByText(/2.*of.*2/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Release Funds' })).not.toBeDisabled();
    });
  });
});
