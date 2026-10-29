import { renderHook, act } from '@testing-library/react';
import { useDisputeCase } from '@/hooks/useDisputeCase';
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

beforeAll(() => {
  global.URL.createObjectURL = jest.fn(() => 'blob:mock-url');
  global.URL.revokeObjectURL = jest.fn();
});

describe('useDisputeCase', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useToast as jest.Mock).mockReturnValue({ success: mockSuccess, error: mockError });
  });

  it('accepts a valid image file', () => {
    const { result } = renderHook(() => useDisputeCase('delivery-1'));
    const file = new File(['data'], 'photo.jpg', { type: 'image/jpeg' });

    act(() => {
      const outcome = result.current.addFiles([file]);
      expect(outcome).toEqual({ accepted: 1, rejected: [] });
    });

    expect(result.current.files).toHaveLength(1);
    expect(result.current.files[0].kind).toBe('image');
  });

  it('accepts a valid video file', () => {
    const { result } = renderHook(() => useDisputeCase('delivery-1'));
    const file = new File(['data'], 'clip.mp4', { type: 'video/mp4' });

    act(() => {
      result.current.addFiles([file]);
    });

    expect(result.current.files[0].kind).toBe('video');
  });

  it('rejects an unsupported file type', () => {
    const { result } = renderHook(() => useDisputeCase('delivery-1'));
    const file = new File(['data'], 'doc.pdf', { type: 'application/pdf' });

    let outcome: { accepted: number; rejected: string[] } | undefined;
    act(() => {
      outcome = result.current.addFiles([file]);
    });

    expect(outcome).toEqual({ accepted: 0, rejected: ['doc.pdf: unsupported file type'] });
    expect(result.current.files).toHaveLength(0);
  });

  it('rejects a file over the 10MB limit', () => {
    const { result } = renderHook(() => useDisputeCase('delivery-1'));
    const oversized = new File([new Uint8Array(11 * 1024 * 1024)], 'big.jpg', {
      type: 'image/jpeg',
    });

    let outcome: { accepted: number; rejected: string[] } | undefined;
    act(() => {
      outcome = result.current.addFiles([oversized]);
    });

    expect(outcome?.rejected).toEqual(['big.jpg: exceeds 10MB limit']);
  });

  it('removes a file and revokes its object URL', () => {
    const { result } = renderHook(() => useDisputeCase('delivery-1'));
    const file = new File(['data'], 'photo.jpg', { type: 'image/jpeg' });

    act(() => {
      result.current.addFiles([file]);
    });
    const id = result.current.files[0].id;

    act(() => {
      result.current.removeFile(id);
    });

    expect(result.current.files).toHaveLength(0);
    expect(global.URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-url');
  });

  it('files a dispute, freezes escrow, and does not attempt an upload when no files are queued', async () => {
    mockFileDispute.mockResolvedValue({
      caseId: 'CASE-1',
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

    const { result } = renderHook(() => useDisputeCase('delivery-1'));

    let response;
    await act(async () => {
      response = await result.current.submitCase('non_delivery', 'Never arrived at all.');
    });

    expect(response).toEqual({
      caseId: 'CASE-1',
      deliveryId: 'delivery-1',
      status: 'open',
      escrowFrozen: true,
      createdAt: '2026-01-01T00:00:00.000Z',
    });
    expect(mockUploadEvidence).not.toHaveBeenCalled();
    expect(mockSuccess).toHaveBeenCalled();
  });

  it('uploads queued files after filing and freezing succeed', async () => {
    mockFileDispute.mockResolvedValue({
      caseId: 'CASE-2',
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
    mockUploadEvidence.mockResolvedValue([]);

    const { result } = renderHook(() => useDisputeCase('delivery-1'));
    const file = new File(['data'], 'photo.jpg', { type: 'image/jpeg' });
    act(() => {
      result.current.addFiles([file]);
    });

    await act(async () => {
      await result.current.submitCase('damaged_items', 'Arrived broken in the box.');
    });

    expect(mockUploadEvidence).toHaveBeenCalledWith('CASE-2', [file], expect.any(Function));
  });

  it('surfaces an error toast and rethrows when filing fails', async () => {
    mockFileDispute.mockRejectedValue(new Error('Delivery not eligible'));

    const { result } = renderHook(() => useDisputeCase('delivery-1'));

    await expect(
      act(async () => {
        await result.current.submitCase('other', 'Something went wrong here.');
      })
    ).rejects.toThrow('Delivery not eligible');

    expect(mockError).toHaveBeenCalledWith('Unable to file dispute', 'Delivery not eligible');
    expect(result.current.isSubmitting).toBe(false);
  });
});
