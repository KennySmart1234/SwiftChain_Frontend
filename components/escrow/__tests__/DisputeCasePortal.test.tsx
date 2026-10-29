import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DisputeCasePortal } from '@/components/escrow/DisputeCasePortal';
import { useToast } from '@/hooks/useToast';

const mockSuccess = jest.fn();
const mockError = jest.fn();
jest.mock('@/hooks/useToast', () => ({
  useToast: jest.fn(),
}));

const mockFileDispute = jest.fn();
const mockFreezeEscrow = jest.fn();
const mockUploadEvidence = jest.fn();
jest.mock('@/services/disputeService', () => ({
  disputeService: {
    fileDispute: (...args: unknown[]) => mockFileDispute(...args),
    freezeEscrow: (...args: unknown[]) => mockFreezeEscrow(...args),
    uploadEvidence: (...args: unknown[]) => mockUploadEvidence(...args),
  },
}));

// jsdom has no createObjectURL/revokeObjectURL implementation.
beforeAll(() => {
  global.URL.createObjectURL = jest.fn(() => 'blob:mock-url');
  global.URL.revokeObjectURL = jest.fn();
});

const fillIssueStep = async () => {
  fireEvent.click(screen.getByLabelText('Items Damaged'));
  await userEvent.type(
    screen.getByLabelText('Description'),
    'The package arrived completely crushed and unusable.'
  );
  fireEvent.click(screen.getByRole('button', { name: 'Continue to Evidence' }));
};

describe('DisputeCasePortal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useToast as jest.Mock).mockReturnValue({ success: mockSuccess, error: mockError });
  });

  it('starts on the issue step', () => {
    render(<DisputeCasePortal deliveryId="delivery-1" />);
    expect(screen.getByText('Report a Delivery Issue')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Continue to Evidence' })).toBeDisabled();
  });

  it('enables Continue only once a reason and a 20+ character description are given', async () => {
    render(<DisputeCasePortal deliveryId="delivery-1" />);
    const continueButton = screen.getByRole('button', { name: 'Continue to Evidence' });

    fireEvent.click(screen.getByLabelText('Items Damaged'));
    expect(continueButton).toBeDisabled();

    await userEvent.type(screen.getByLabelText('Description'), 'too short');
    expect(continueButton).toBeDisabled();

    await userEvent.type(screen.getByLabelText('Description'), ' but now long enough to pass');
    expect(continueButton).toBeEnabled();
  });

  it('moves to the evidence step and shows the escrow-freeze warning', async () => {
    render(<DisputeCasePortal deliveryId="delivery-1" />);
    await fillIssueStep();

    expect(screen.getByTestId('evidence-dropzone')).toBeInTheDocument();
    expect(screen.getByText(/immediately freeze/i)).toBeInTheDocument();
  });

  it('returns to the issue step on Back', async () => {
    render(<DisputeCasePortal deliveryId="delivery-1" />);
    await fillIssueStep();

    fireEvent.click(screen.getByRole('button', { name: 'Back' }));
    expect(screen.getByText('Report a Delivery Issue')).toBeInTheDocument();
    expect(screen.getByLabelText('Items Damaged')).toBeChecked();
  });

  it('files the dispute, freezes escrow, and shows the case ID with the frozen indicator', async () => {
    mockFileDispute.mockResolvedValue({
      caseId: 'CASE-42',
      deliveryId: 'delivery-1',
      status: 'open',
      escrowFrozen: false,
      createdAt: '2026-01-01T00:00:00.000Z',
    });
    mockFreezeEscrow.mockResolvedValue({
      deliveryId: 'delivery-1',
      frozen: true,
      frozenAt: '2026-01-01T00:00:01.000Z',
    });

    render(<DisputeCasePortal deliveryId="delivery-1" />);
    await fillIssueStep();

    fireEvent.click(screen.getByRole('button', { name: 'Submit Dispute' }));

    await waitFor(() => expect(screen.getByTestId('dispute-submitted')).toBeInTheDocument());
    expect(screen.getByTestId('case-id')).toHaveTextContent('CASE-42');
    expect(screen.getByTestId('escrow-frozen-indicator')).toBeInTheDocument();
    expect(mockFileDispute).toHaveBeenCalledWith({
      deliveryId: 'delivery-1',
      reason: 'damaged_items',
      description: 'The package arrived completely crushed and unusable.',
    });
    expect(mockFreezeEscrow).toHaveBeenCalledWith('delivery-1');
  });

  it('does not show the escrow-frozen indicator when freezing did not happen', async () => {
    mockFileDispute.mockResolvedValue({
      caseId: 'CASE-42',
      deliveryId: 'delivery-1',
      status: 'open',
      escrowFrozen: false,
      createdAt: '2026-01-01T00:00:00.000Z',
    });
    mockFreezeEscrow.mockRejectedValue(new Error('freeze unavailable'));

    render(<DisputeCasePortal deliveryId="delivery-1" />);
    await fillIssueStep();
    fireEvent.click(screen.getByRole('button', { name: 'Submit Dispute' }));

    await waitFor(() => expect(mockError).toHaveBeenCalled());
    expect(screen.queryByTestId('dispute-submitted')).not.toBeInTheDocument();
  });

  it('uploads queued evidence files when submitting', async () => {
    mockFileDispute.mockResolvedValue({
      caseId: 'CASE-42',
      deliveryId: 'delivery-1',
      status: 'open',
      escrowFrozen: true,
      createdAt: '2026-01-01T00:00:00.000Z',
    });
    mockFreezeEscrow.mockResolvedValue({
      deliveryId: 'delivery-1',
      frozen: true,
      frozenAt: '2026-01-01T00:00:01.000Z',
    });
    mockUploadEvidence.mockResolvedValue([]);

    render(<DisputeCasePortal deliveryId="delivery-1" />);
    await fillIssueStep();

    const file = new File(['data'], 'evidence.jpg', { type: 'image/jpeg' });
    const input = screen.getByLabelText('Upload evidence') as HTMLInputElement;
    await userEvent.upload(input, file);

    fireEvent.click(screen.getByRole('button', { name: 'Submit Dispute' }));

    await waitFor(() => expect(mockUploadEvidence).toHaveBeenCalled());
    expect(mockUploadEvidence.mock.calls[0][0]).toBe('CASE-42');
    expect(mockUploadEvidence.mock.calls[0][1]).toEqual([file]);
  });

  it('shows an error toast and stays on the evidence step when filing fails', async () => {
    mockFileDispute.mockRejectedValue(new Error('Delivery not eligible'));

    render(<DisputeCasePortal deliveryId="delivery-1" />);
    await fillIssueStep();
    fireEvent.click(screen.getByRole('button', { name: 'Submit Dispute' }));

    await waitFor(() => expect(mockError).toHaveBeenCalled());
    expect(screen.getByTestId('evidence-dropzone')).toBeInTheDocument();
  });

  it('disables Submit while a submission is in progress', async () => {
    let resolveFileDispute!: (value: unknown) => void;
    mockFileDispute.mockReturnValue(
      new Promise((resolve) => {
        resolveFileDispute = resolve;
      })
    );

    render(<DisputeCasePortal deliveryId="delivery-1" />);
    await fillIssueStep();
    fireEvent.click(screen.getByRole('button', { name: 'Submit Dispute' }));

    expect(screen.getByRole('button', { name: 'Submitting...' })).toBeDisabled();

    resolveFileDispute({
      caseId: 'CASE-1',
      deliveryId: 'delivery-1',
      status: 'open',
      escrowFrozen: true,
      createdAt: '2026-01-01T00:00:00.000Z',
    });
    mockFreezeEscrow.mockResolvedValue({
      deliveryId: 'delivery-1',
      frozen: true,
      frozenAt: '2026-01-01T00:00:01.000Z',
    });

    await waitFor(() => expect(screen.getByTestId('dispute-submitted')).toBeInTheDocument());
  });
});
