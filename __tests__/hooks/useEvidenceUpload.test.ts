import { renderHook, act } from '@testing-library/react';
import { useEvidenceUpload } from '@/hooks/useEvidenceUpload';
import { disputeResolutionService } from '@/services/disputeResolutionService';
import { imageCompressionService } from '@/services/imageCompressionService';

jest.mock('@/services/disputeResolutionService', () => ({
  disputeResolutionService: {
    uploadEvidence: jest.fn(),
  },
}));

jest.mock('@/services/imageCompressionService', () => ({
  imageCompressionService: {
    compressImage: jest.fn(),
  },
}));

function pngFile(name = 'proof.png') {
  return new File(['raw-bytes'], name, { type: 'image/png' });
}

describe('useEvidenceUpload', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (imageCompressionService.compressImage as jest.Mock).mockResolvedValue(
      new File(['compressed-bytes'], 'proof.png', { type: 'image/png' })
    );
    (disputeResolutionService.uploadEvidence as jest.Mock).mockResolvedValue({
      fileId: 'file-abc',
    });
  });

  it('adds a valid image file to the queue', () => {
    const { result } = renderHook(() => useEvidenceUpload());

    act(() => {
      result.current.addFiles([pngFile()]);
    });

    expect(result.current.files).toHaveLength(1);
    expect(result.current.files[0].status).toBe('pending');
  });

  it('rejects a file with an unsupported type', () => {
    const { result } = renderHook(() => useEvidenceUpload());

    let outcome: { accepted: number; rejected: string[] } | undefined;
    act(() => {
      outcome = result.current.addFiles([
        new File(['x'], 'malware.exe', { type: 'application/x-msdownload' }),
      ]);
    });

    expect(outcome?.accepted).toBe(0);
    expect(outcome?.rejected[0]).toContain('unsupported file type');
    expect(result.current.files).toHaveLength(0);
  });

  it('rejects a file exceeding the size limit', () => {
    const { result } = renderHook(() => useEvidenceUpload());
    const oversized = new File([new Uint8Array(11 * 1024 * 1024)], 'huge.png', {
      type: 'image/png',
    });

    let outcome: { accepted: number; rejected: string[] } | undefined;
    act(() => {
      outcome = result.current.addFiles([oversized]);
    });

    expect(outcome?.accepted).toBe(0);
    expect(outcome?.rejected[0]).toContain('exceeds');
  });

  it('caps the queue at the maximum number of evidence files', () => {
    const { result } = renderHook(() => useEvidenceUpload());
    const files = Array.from({ length: 6 }, (_, i) => pngFile(`proof-${i}.png`));

    act(() => {
      result.current.addFiles(files);
    });

    expect(result.current.files).toHaveLength(5);
    expect(result.current.canAddMore).toBe(false);
  });

  it('removes a file from the queue', () => {
    const { result } = renderHook(() => useEvidenceUpload());

    act(() => {
      result.current.addFiles([pngFile()]);
    });
    const id = result.current.files[0].id;

    act(() => {
      result.current.removeFile(id);
    });

    expect(result.current.files).toHaveLength(0);
  });

  it('compresses image files before uploading them', async () => {
    const { result } = renderHook(() => useEvidenceUpload());

    act(() => {
      result.current.addFiles([pngFile()]);
    });

    await act(async () => {
      await result.current.uploadAll();
    });

    expect(imageCompressionService.compressImage).toHaveBeenCalledTimes(1);
    expect(disputeResolutionService.uploadEvidence).toHaveBeenCalledTimes(1);
  });

  it('does not attempt to compress a non-image file (e.g. PDF)', async () => {
    const { result } = renderHook(() => useEvidenceUpload());
    const pdf = new File(['%PDF-1.4'], 'evidence.pdf', { type: 'application/pdf' });

    act(() => {
      result.current.addFiles([pdf]);
    });

    await act(async () => {
      await result.current.uploadAll();
    });

    expect(imageCompressionService.compressImage).not.toHaveBeenCalled();
    expect(disputeResolutionService.uploadEvidence).toHaveBeenCalledWith(pdf);
  });

  it('falls back to the original file when compression fails', async () => {
    (imageCompressionService.compressImage as jest.Mock).mockRejectedValue(
      new Error('compression failed')
    );
    const { result } = renderHook(() => useEvidenceUpload());
    const original = pngFile();

    act(() => {
      result.current.addFiles([original]);
    });

    await act(async () => {
      await result.current.uploadAll();
    });

    expect(disputeResolutionService.uploadEvidence).toHaveBeenCalledWith(original);
  });

  it('returns the server-assigned file ids from uploadAll', async () => {
    const { result } = renderHook(() => useEvidenceUpload());

    act(() => {
      result.current.addFiles([pngFile()]);
    });

    let fileIds: string[] = [];
    await act(async () => {
      fileIds = await result.current.uploadAll();
    });

    expect(fileIds).toEqual(['file-abc']);
  });

  it('marks a file as errored when its upload fails', async () => {
    (disputeResolutionService.uploadEvidence as jest.Mock).mockRejectedValue(
      new Error('network down')
    );
    const { result } = renderHook(() => useEvidenceUpload());

    act(() => {
      result.current.addFiles([pngFile()]);
    });

    await act(async () => {
      await result.current.uploadAll().catch(() => undefined);
    });

    expect(result.current.files[0].status).toBe('error');
    expect(result.current.files[0].errorMessage).toBe('network down');
  });
});
