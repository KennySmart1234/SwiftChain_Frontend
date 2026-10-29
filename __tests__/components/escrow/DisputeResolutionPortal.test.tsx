import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DisputeResolutionPortal } from '@/components/escrow/DisputeResolutionPortal';
import { EvidenceMediaDropzone } from '@/components/escrow/EvidenceMediaDropzone';
import { useEvidenceUpload } from '@/hooks/useEvidenceUpload';
import { disputeResolutionService } from '@/services/disputeResolutionService';
import { imageCompressionService } from '@/services/imageCompressionService';
import type { EvidenceFile } from '@/types/disputeResolution';

jest.mock('sonner', () => ({
  toast: { error: jest.fn(), success: jest.fn() },
}));

jest.mock('@/hooks/useEvidenceUpload');
const mockedUseEvidenceUpload = useEvidenceUpload as jest.Mock;

jest.mock('@/services/disputeResolutionService', () => ({
  disputeResolutionService: {
    uploadEvidence: jest.fn(),
    submitCase: jest.fn(),
  },
}));

function makeEvidenceFile(overrides: Partial<EvidenceFile> = {}): EvidenceFile {
  return {
    id: 'evidence-1',
    file: new File(['contents'], 'proof.png', { type: 'image/png' }),
    previewUrl: 'blob:mock-url',
    status: 'ready',
    ...overrides,
  };
}

function defaultEvidenceUploadReturn(overrides = {}) {
  return {
    files: [],
    addFiles: jest.fn().mockReturnValue({ accepted: 0, rejected: [] }),
    removeFile: jest.fn(),
    uploadAll: jest.fn().mockResolvedValue([]),
    isUploading: false,
    canAddMore: true,
    ...overrides,
  };
}

async function fillDetailsStep() {
  fireEvent.click(screen.getByLabelText('Items Damaged'));
  fireEvent.change(screen.getByLabelText('Description'), {
    target: { value: 'The package arrived with visible damage to the contents.' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Continue to Evidence' }));
}

describe('DisputeResolutionPortal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedUseEvidenceUpload.mockReturnValue(defaultEvidenceUploadReturn());
  });

  it('starts on the details step', () => {
    render(<DisputeResolutionPortal deliveryId="delivery-1" />);
    expect(screen.getByTestId('step-details')).toBeInTheDocument();
  });

  it('disables Continue until a reason and a sufficiently long description are provided', () => {
    render(<DisputeResolutionPortal deliveryId="delivery-1" />);
    const continueButton = screen.getByRole('button', { name: 'Continue to Evidence' });
    expect(continueButton).toBeDisabled();

    fireEvent.click(screen.getByLabelText('Items Damaged'));
    expect(continueButton).toBeDisabled(); // description still too short

    fireEvent.change(screen.getByLabelText('Description'), {
      target: { value: 'short' },
    });
    expect(continueButton).toBeDisabled();

    fireEvent.change(screen.getByLabelText('Description'), {
      target: { value: 'This description is now long enough to continue.' },
    });
    expect(continueButton).not.toBeDisabled();
  });

  it('transitions from the details step to the evidence step', async () => {
    render(<DisputeResolutionPortal deliveryId="delivery-1" />);
    await fillDetailsStep();
    expect(screen.getByTestId('step-evidence')).toBeInTheDocument();
  });

  it('transitions from the evidence step to the review step', async () => {
    render(<DisputeResolutionPortal deliveryId="delivery-1" />);
    await fillDetailsStep();
    fireEvent.click(screen.getByRole('button', { name: 'Review' }));
    expect(screen.getByTestId('step-review')).toBeInTheDocument();
  });

  it('the Back button on the evidence step returns to the details step', async () => {
    render(<DisputeResolutionPortal deliveryId="delivery-1" />);
    await fillDetailsStep();
    fireEvent.click(screen.getByRole('button', { name: 'Back' }));
    expect(screen.getByTestId('step-details')).toBeInTheDocument();
  });

  it('the review step summarizes the selected reason, description, and evidence count', async () => {
    mockedUseEvidenceUpload.mockReturnValue(
      defaultEvidenceUploadReturn({ files: [makeEvidenceFile(), makeEvidenceFile({ id: 'evidence-2' })] })
    );
    render(<DisputeResolutionPortal deliveryId="delivery-1" />);
    await fillDetailsStep();
    fireEvent.click(screen.getByRole('button', { name: 'Review' }));

    const review = screen.getByTestId('step-review');
    expect(within(review).getByText('Items Damaged')).toBeInTheDocument();
    expect(within(review).getByText('2 file(s) attached')).toBeInTheDocument();
  });

  it('shows the escrow freeze indicator after a dispute is filed', async () => {
    (disputeResolutionService.submitCase as jest.Mock).mockResolvedValue({
      caseId: 'CASE-001',
      status: 'open',
      escrowFrozen: true,
      createdAt: new Date().toISOString(),
    });

    render(<DisputeResolutionPortal deliveryId="delivery-1" />);
    await fillDetailsStep();
    fireEvent.click(screen.getByRole('button', { name: 'Review' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirm Dispute' }));

    await waitFor(() => {
      expect(screen.getByTestId('escrow-frozen-indicator')).toBeInTheDocument();
    });
  });

  it('does not show the escrow freeze indicator when the case is not frozen', async () => {
    (disputeResolutionService.submitCase as jest.Mock).mockResolvedValue({
      caseId: 'CASE-002',
      status: 'open',
      escrowFrozen: false,
      createdAt: new Date().toISOString(),
    });

    render(<DisputeResolutionPortal deliveryId="delivery-1" />);
    await fillDetailsStep();
    fireEvent.click(screen.getByRole('button', { name: 'Review' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirm Dispute' }));

    await waitFor(() => {
      expect(screen.getByTestId('dispute-submitted')).toBeInTheDocument();
    });
    expect(screen.queryByTestId('escrow-frozen-indicator')).not.toBeInTheDocument();
  });

  it('displays the case ID after successful submission', async () => {
    (disputeResolutionService.submitCase as jest.Mock).mockResolvedValue({
      caseId: 'CASE-42',
      status: 'open',
      escrowFrozen: true,
      createdAt: new Date().toISOString(),
    });

    render(<DisputeResolutionPortal deliveryId="delivery-1" />);
    await fillDetailsStep();
    fireEvent.click(screen.getByRole('button', { name: 'Review' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirm Dispute' }));

    await waitFor(() => {
      expect(screen.getByTestId('case-id')).toHaveTextContent('CASE-42');
    });
  });

  it('calls submitCase with the deliveryId, reason, description, and uploaded evidence file ids', async () => {
    const uploadAll = jest.fn().mockResolvedValue(['file-1', 'file-2']);
    mockedUseEvidenceUpload.mockReturnValue(defaultEvidenceUploadReturn({ uploadAll }));
    (disputeResolutionService.submitCase as jest.Mock).mockResolvedValue({
      caseId: 'CASE-99',
      status: 'open',
      escrowFrozen: true,
      createdAt: new Date().toISOString(),
    });

    render(<DisputeResolutionPortal deliveryId="delivery-77" />);
    await fillDetailsStep();
    fireEvent.click(screen.getByRole('button', { name: 'Review' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirm Dispute' }));

    await waitFor(() => {
      expect(disputeResolutionService.submitCase).toHaveBeenCalledWith({
        deliveryId: 'delivery-77',
        reason: 'damaged_items',
        description: 'The package arrived with visible damage to the contents.',
        evidenceFileIds: ['file-1', 'file-2'],
      });
    });
  });

  it('shows an error toast and stays on the review step when submission fails', async () => {
    const { toast } = jest.requireMock('sonner');
    (disputeResolutionService.submitCase as jest.Mock).mockRejectedValue(
      new Error('Network error')
    );

    render(<DisputeResolutionPortal deliveryId="delivery-1" />);
    await fillDetailsStep();
    fireEvent.click(screen.getByRole('button', { name: 'Review' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirm Dispute' }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Network error');
    });
    expect(screen.getByTestId('step-review')).toBeInTheDocument();
  });

  it('disables the Confirm and Back buttons while submitting', async () => {
    mockedUseEvidenceUpload.mockReturnValue(defaultEvidenceUploadReturn({ isUploading: true }));
    render(<DisputeResolutionPortal deliveryId="delivery-1" />);
    await fillDetailsStep();
    fireEvent.click(screen.getByRole('button', { name: 'Review' }));

    expect(screen.getByRole('button', { name: 'Submitting…' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Back' })).toBeDisabled();
  });
});

describe('EvidenceMediaDropzone', () => {
  it('renders a dropzone that accepts files via the hidden file input', () => {
    const onFilesAdded = jest.fn().mockReturnValue({ accepted: 1, rejected: [] });
    render(
      <EvidenceMediaDropzone
        files={[]}
        onFilesAdded={onFilesAdded}
        onRemoveFile={jest.fn()}
        canAddMore
      />
    );

    const input = screen.getByLabelText('Choose evidence files');
    const file = new File(['content'], 'evidence.png', { type: 'image/png' });
    fireEvent.change(input, { target: { files: [file] } });

    expect(onFilesAdded).toHaveBeenCalledWith([file]);
  });

  it('accepts a file dropped onto the dropzone', () => {
    const onFilesAdded = jest.fn().mockReturnValue({ accepted: 1, rejected: [] });
    render(
      <EvidenceMediaDropzone
        files={[]}
        onFilesAdded={onFilesAdded}
        onRemoveFile={jest.fn()}
        canAddMore
      />
    );

    const file = new File(['content'], 'evidence.png', { type: 'image/png' });
    const dropzone = screen.getByTestId('evidence-dropzone');
    fireEvent.drop(dropzone, { dataTransfer: { files: [file] } });

    expect(onFilesAdded).toHaveBeenCalledWith([file]);
  });

  it('surfaces rejection reasons as toast errors (e.g. unsupported file type)', () => {
    const { toast } = jest.requireMock('sonner');
    const onFilesAdded = jest.fn().mockReturnValue({
      accepted: 0,
      rejected: ['bad.exe: unsupported file type'],
    });
    render(
      <EvidenceMediaDropzone
        files={[]}
        onFilesAdded={onFilesAdded}
        onRemoveFile={jest.fn()}
        canAddMore
      />
    );

    const input = screen.getByLabelText('Choose evidence files');
    const file = new File(['content'], 'bad.exe', { type: 'application/x-msdownload' });
    fireEvent.change(input, { target: { files: [file] } });

    expect(toast.error).toHaveBeenCalledWith('bad.exe: unsupported file type');
  });

  it('disables the dropzone and file input once canAddMore is false', () => {
    render(
      <EvidenceMediaDropzone
        files={[makeEvidenceFile()]}
        onFilesAdded={jest.fn()}
        onRemoveFile={jest.fn()}
        canAddMore={false}
      />
    );

    expect(screen.getByLabelText('Choose evidence files')).toBeDisabled();
    expect(screen.getByText('Maximum evidence files reached')).toBeInTheDocument();
  });

  it('calls onRemoveFile when a file is removed from the list', () => {
    const onRemoveFile = jest.fn();
    render(
      <EvidenceMediaDropzone
        files={[makeEvidenceFile({ id: 'evidence-9' })]}
        onFilesAdded={jest.fn()}
        onRemoveFile={onRemoveFile}
        canAddMore
      />
    );

    fireEvent.click(screen.getByLabelText('Remove proof.png'));
    expect(onRemoveFile).toHaveBeenCalledWith('evidence-9');
  });

  it('highlights the dropzone on drag-over and un-highlights on drag-leave', () => {
    render(
      <EvidenceMediaDropzone
        files={[]}
        onFilesAdded={jest.fn()}
        onRemoveFile={jest.fn()}
        canAddMore
      />
    );

    const dropzone = screen.getByTestId('evidence-dropzone');
    fireEvent.dragOver(dropzone);
    expect(dropzone.className).toContain('border-blue-500');

    fireEvent.dragLeave(dropzone);
    expect(dropzone.className).not.toContain('border-blue-500');
  });

  it('opens the file picker on Space when focused', () => {
    render(
      <EvidenceMediaDropzone
        files={[]}
        onFilesAdded={jest.fn()}
        onRemoveFile={jest.fn()}
        canAddMore
      />
    );

    const dropzone = screen.getByTestId('evidence-dropzone');
    const input = screen.getByLabelText('Choose evidence files');
    const clickSpy = jest.spyOn(input, 'click');

    fireEvent.keyDown(dropzone, { key: ' ' });
    expect(clickSpy).toHaveBeenCalled();
  });

  it('does not open the file picker via keyboard once canAddMore is false', () => {
    render(
      <EvidenceMediaDropzone
        files={[makeEvidenceFile()]}
        onFilesAdded={jest.fn()}
        onRemoveFile={jest.fn()}
        canAddMore={false}
      />
    );

    const dropzone = screen.getByTestId('evidence-dropzone');
    const input = screen.getByLabelText('Choose evidence files');
    const clickSpy = jest.spyOn(input, 'click');

    fireEvent.keyDown(dropzone, { key: 'Enter' });
    expect(clickSpy).not.toHaveBeenCalled();
  });
});
