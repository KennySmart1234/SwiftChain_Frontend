import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProofUpload } from '@/features/deliveries/components/ProofUpload';
import { useProofUpload } from '@/hooks/useProofUpload';

jest.mock('@/hooks/useProofUpload');

const mockedUseProofUpload = useProofUpload as jest.MockedFunction<
  typeof useProofUpload
>;

const makeHookState = (
  overrides: Partial<ReturnType<typeof useProofUpload>> = {}
) => ({
  uploadProgress: 0,
  compressionProgress: 0,
  isUploading: false,
  isCompressing: false,
  uploadedProofs: [],
  errors: [],
  handleFileCapture: jest.fn(),
  handleCameraCapture: jest.fn(),
  clearUploadedProofs: jest.fn(),
  removeProof: jest.fn(),
  ...overrides,
});

describe('ProofUpload', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the empty upload state for a delivery receipt', () => {
    mockedUseProofUpload.mockReturnValue(makeHookState());

    render(<ProofUpload deliveryId="delivery-123" />);

    expect(
      screen.getByText(/drag and drop an image or click to select/i)
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /start camera/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /select file/i })
    ).toBeInTheDocument();
  });

  it('displays validation errors returned by the proof upload API flow', () => {
    mockedUseProofUpload.mockReturnValue(
      makeHookState({
        errors: ['Please select an image file'],
      })
    );

    render(<ProofUpload deliveryId="delivery-123" />);

    expect(screen.getByText('Please select an image file')).toBeInTheDocument();
  });

  it('shows submission progress while the upload is in flight', () => {
    mockedUseProofUpload.mockReturnValue(
      makeHookState({
        isUploading: true,
        uploadProgress: 68,
      })
    );

    render(<ProofUpload deliveryId="delivery-123" />);

    expect(screen.getByText(/uploading/i)).toBeInTheDocument();
    expect(screen.getByText('68%')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /start camera/i })
    ).toBeDisabled();
    expect(screen.getByRole('button', { name: /select file/i })).toBeDisabled();
  });

  it('renders a completed proof record from the successful upload state', () => {
    mockedUseProofUpload.mockReturnValue(
      makeHookState({
        uploadedProofs: [
          {
            filename: 'proof-receipt.jpg',
            fileSize: 2048,
            originalSize: 4096,
            isCompressed: true,
            status: 'completed',
            uploadedAt: '2026-10-18T00:00:00.000Z',
            compressionProgress: 100,
          },
        ],
      })
    );

    render(<ProofUpload deliveryId="delivery-123" />);

    expect(screen.getByText('Uploaded Proofs (1)')).toBeInTheDocument();
    expect(screen.getByText('proof-receipt.jpg')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /remove/i })).toBeInTheDocument();
  });

  it('passes the selected file through the validation/upload handler', async () => {
    const user = userEvent.setup();
    const handleFileCapture = jest.fn();
    mockedUseProofUpload.mockReturnValue(
      makeHookState({
        handleFileCapture,
      })
    );

    render(<ProofUpload deliveryId="delivery-123" />);

    const fileInput = document.querySelector(
      'input[type="file"]'
    ) as HTMLInputElement;
    const file = new File(['receipt-data'], 'delivery-receipt.png', {
      type: 'image/png',
    });

    await user.upload(fileInput, file);

    expect(handleFileCapture).toHaveBeenCalledWith(file);
  });
});
