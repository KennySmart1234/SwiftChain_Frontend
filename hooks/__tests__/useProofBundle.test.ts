import { act, renderHook } from '@testing-library/react';
import { useProofUpload } from '@/hooks/useProofUpload';
import { proofService } from '@/services/proofService';

jest.mock('@/services/proofService', () => ({
  proofService: {
    uploadProofBundle: jest.fn(),
    compressImage: jest.fn(),
    uploadProof: jest.fn(),
  },
}));
jest.mock('@/hooks/useToast', () => ({
  useToast: () => ({
    error: jest.fn(),
    success: jest.fn(),
    toast: jest.fn(),
  }),
}));

const uploadProofBundle = proofService.uploadProofBundle as jest.Mock;

describe('useProofUpload delivery bundle', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('keeps a signature-only proof disabled and explains the missing photo', async () => {
    const { result } = renderHook(() => useProofUpload({ deliveryId: 'delivery-1' }));
    act(() => result.current.setSignature('data:image/png;base64,signature'));

    await act(async () => {
      expect(await result.current.submitProofBundle()).toBe(false);
    });

    expect(result.current.canSubmitBundle).toBe(false);
    expect(result.current.errors).toEqual(['Add a delivery photo to submit this signature.']);
  });

  it('uploads the photo and signature in one API payload', async () => {
    uploadProofBundle.mockResolvedValue({
      success: true,
      message: 'Uploaded',
      data: {
        signatureDataUrl: 'data:image/png;base64,signature',
        photo: {
          id: 'proof-1',
          deliveryId: 'delivery-1',
          filename: 'delivery.png',
          fileSize: 5,
          originalSize: 5,
          isCompressed: false,
          uploadedAt: '2026-10-18T00:00:00.000Z',
          status: 'pending',
        },
      },
    });
    const { result } = renderHook(() => useProofUpload({ deliveryId: 'delivery-1' }));
    const photo = new File(['photo'], 'delivery.png', { type: 'image/png' });
    act(() => {
      result.current.stagePhoto(photo);
      result.current.setSignature('data:image/png;base64,signature');
    });

    await act(async () => {
      expect(await result.current.submitProofBundle()).toBe(true);
    });

    const formData = uploadProofBundle.mock.calls[0][0] as FormData;
    expect(formData.get('photo')).toBe(photo);
    expect(formData.get('signatureDataUrl')).toBe('data:image/png;base64,signature');
    expect(uploadProofBundle).toHaveBeenCalledWith(
      expect.any(FormData),
      'delivery-1',
      expect.any(Function),
    );
    expect(result.current.uploadedProofs[0].status).toBe('completed');
    expect(result.current.signatureDataUrl).toBeNull();
  });
});
