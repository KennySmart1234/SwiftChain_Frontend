import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProofUpload } from '@/features/deliveries/components/ProofUpload';
import { useProofUpload } from '@/hooks/useProofUpload';

jest.mock('@/hooks/useProofUpload');
jest.mock('@/components/deliveries/SignatureCanvas', () => ({
  SignatureCanvas: ({ onSave }: { onSave: (_value: string) => void }) => (
    <button type="button" onClick={() => onSave('data:image/png;base64,signature')}>
      Save test signature
    </button>
  ),
}));

const mockedUseProofUpload = useProofUpload as jest.MockedFunction<typeof useProofUpload>;

function mockHook(overrides: Partial<ReturnType<typeof useProofUpload>> = {}) {
  mockedUseProofUpload.mockReturnValue({
    uploadProgress: 0,
    compressionProgress: 0,
    isUploading: false,
    isCompressing: false,
    uploadedProofs: [],
    errors: [],
    stagedPhoto: null,
    photoPreviewUrl: null,
    signatureDataUrl: null,
    canSubmitBundle: false,
    handleFileCapture: jest.fn(),
    handleCameraCapture: jest.fn(),
    clearUploadedProofs: jest.fn(),
    removeProof: jest.fn(),
    stagePhoto: jest.fn(),
    stageCameraCapture: jest.fn(),
    setSignature: jest.fn(),
    submitProofBundle: jest.fn().mockResolvedValue(true),
    resetBundle: jest.fn(),
    ...overrides,
  });
}

describe('ProofUpload signature integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockHook();
  });

  it('provides photo and signature tabs', () => {
    render(<ProofUpload deliveryId="delivery-1" />);
    expect(screen.getByRole('tab', { name: 'Photo' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'Signature' })).toBeInTheDocument();
  });

  it('saves a captured signature through the hook', async () => {
    const setSignature = jest.fn();
    mockHook({ setSignature });
    const user = userEvent.setup();
    render(<ProofUpload deliveryId="delivery-1" />);

    await user.click(screen.getByRole('tab', { name: 'Signature' }));
    await user.click(screen.getByRole('button', { name: 'Save test signature' }));

    expect(setSignature).toHaveBeenCalledWith('data:image/png;base64,signature');
  });

  it('stages a selected delivery photo', () => {
    const stagePhoto = jest.fn();
    mockHook({ stagePhoto });
    render(<ProofUpload deliveryId="delivery-1" />);
    const photo = new File(['photo'], 'delivery.png', { type: 'image/png' });

    fireEvent.change(screen.getByLabelText('Delivery photo file'), {
      target: { files: [photo] },
    });

    expect(stagePhoto).toHaveBeenCalledWith(photo);
  });

  it('disables submission until photo and signature exist', () => {
    render(<ProofUpload deliveryId="delivery-1" />);
    expect(screen.getByRole('button', { name: 'Submit delivery proof' })).toBeDisabled();
  });

  it('renders both previews and submits the bundle', async () => {
    const submitProofBundle = jest.fn().mockResolvedValue(true);
    mockHook({
      stagedPhoto: new File(['photo'], 'delivery.png', { type: 'image/png' }),
      photoPreviewUrl: 'blob:delivery-photo',
      signatureDataUrl: 'data:image/png;base64,signature',
      canSubmitBundle: true,
      submitProofBundle,
    });
    const user = userEvent.setup();
    render(<ProofUpload deliveryId="delivery-1" />);

    expect(screen.getByAltText('Delivery proof preview')).toHaveAttribute('src', 'blob:delivery-photo');
    expect(screen.getByAltText('Recipient signature preview')).toHaveAttribute(
      'src',
      'data:image/png;base64,signature',
    );
    await user.click(screen.getByRole('button', { name: 'Submit delivery proof' }));
    expect(submitProofBundle).toHaveBeenCalledTimes(1);
  });

  it('handles a signature-only draft with a clear photo prompt', () => {
    mockHook({ signatureDataUrl: 'data:image/png;base64,signature' });
    render(<ProofUpload deliveryId="delivery-1" />);

    expect(screen.getByText('Add a photo before submitting.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Submit delivery proof' })).toBeDisabled();
  });
});
