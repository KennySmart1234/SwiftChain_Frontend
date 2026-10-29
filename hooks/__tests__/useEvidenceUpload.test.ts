import { renderHook, act, waitFor } from '@testing-library/react';
import { useEvidenceUpload } from '@/hooks/useEvidenceUpload';
import { evidenceUploadService } from '@/services/evidenceUploadService';
import { imageCompressionService } from '@/services/imageCompressionService';

jest.mock('@/services/evidenceUploadService', () => {
  const actual = jest.requireActual('@/services/evidenceUploadService');
  return {
    ...actual,
    evidenceUploadService: {
      validateFile: jest.fn(),
      uploadEvidence: jest.fn(),
      generatePreview: jest.fn(() => 'blob:preview-url'),
      revokePreview: jest.fn(),
    },
  };
});
jest.mock('@/services/imageCompressionService', () => ({
  imageCompressionService: {
    compressImage: jest.fn(),
  },
}));

const mockedValidateFile = evidenceUploadService.validateFile as jest.Mock;
const mockedUploadEvidence = evidenceUploadService.uploadEvidence as jest.Mock;
const mockedCompressImage = imageCompressionService.compressImage as jest.Mock;

function imageFile(name = 'photo.jpg', size = 1024): File {
  const file = new File([new Uint8Array(size)], name, { type: 'image/jpeg' });
  return file;
}

function videoFile(name = 'clip.mp4', size = 1024): File {
  return new File([new Uint8Array(size)], name, { type: 'video/mp4' });
}

describe('useEvidenceUpload', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedValidateFile.mockReturnValue([]);
    mockedCompressImage.mockImplementation(async (file: File) => file);
    mockedUploadEvidence.mockResolvedValue({
      success: true,
      data: {
        fileId: 'file-1',
        fileName: 'photo.jpg',
        fileSize: 500,
        mimeType: 'image/jpeg',
        url: 'https://cdn.example.com/photo.jpg',
        uploadedAt: '2026-01-01T00:00:00.000Z',
      },
    });
  });

  it('initializes with empty state', () => {
    const { result } = renderHook(() => useEvidenceUpload({ disputeId: 'dispute-1' }));

    expect(result.current.files).toEqual([]);
    expect(result.current.evidenceErrors).toEqual([]);
    expect(result.current.isUploading).toBe(false);
  });

  it('rejects a file that fails validation and does not upload it', async () => {
    mockedValidateFile.mockReturnValue([{ field: 'type', message: 'Only JPG, PNG, MP4, and MOV files are allowed' }]);

    const { result } = renderHook(() => useEvidenceUpload({ disputeId: 'dispute-1' }));

    await act(async () => {
      await result.current.addFiles([new File(['x'], 'doc.pdf', { type: 'application/pdf' })]);
    });

    expect(result.current.evidenceErrors[0]).toContain('Only JPG, PNG, MP4, and MOV files are allowed');
    expect(result.current.files).toHaveLength(0);
    expect(mockedUploadEvidence).not.toHaveBeenCalled();
  });

  it('compresses image files before uploading', async () => {
    const original = imageFile();
    const compressed = new File([new Uint8Array(200)], 'photo.jpg', { type: 'image/jpeg' });
    mockedCompressImage.mockResolvedValue(compressed);

    const { result } = renderHook(() => useEvidenceUpload({ disputeId: 'dispute-1' }));

    await act(async () => {
      await result.current.addFiles([original]);
    });

    expect(mockedCompressImage).toHaveBeenCalledWith(original, 500);
    expect(mockedUploadEvidence).toHaveBeenCalledWith(
      compressed,
      'dispute-1',
      expect.any(Function),
      expect.any(Object),
    );
    expect(result.current.files[0].isCompressed).toBe(true);
  });

  it('does not compress video files', async () => {
    const { result } = renderHook(() => useEvidenceUpload({ disputeId: 'dispute-1' }));

    await act(async () => {
      await result.current.addFiles([videoFile()]);
    });

    expect(mockedCompressImage).not.toHaveBeenCalled();
  });

  it('tracks per-file upload progress', async () => {
    let capturedOnProgress: ((e: { loaded: number; total?: number }) => void) | undefined;
    mockedUploadEvidence.mockImplementation(async (_file, _disputeId, onProgress) => {
      capturedOnProgress = onProgress;
      onProgress?.({ loaded: 50, total: 100 });
      return {
        success: true,
        data: {
          fileId: 'file-1',
          fileName: 'photo.jpg',
          fileSize: 500,
          mimeType: 'image/jpeg',
          url: 'https://cdn.example.com/photo.jpg',
          uploadedAt: '2026-01-01T00:00:00.000Z',
        },
      };
    });

    const { result } = renderHook(() => useEvidenceUpload({ disputeId: 'dispute-1' }));

    await act(async () => {
      await result.current.addFiles([imageFile()]);
    });

    expect(capturedOnProgress).toBeDefined();
    expect(result.current.files[0].status).toBe('completed');
    expect(result.current.files[0].uploadProgress).toBe(100);
  });

  it('returns uploaded files with URLs and metadata', async () => {
    const { result } = renderHook(() => useEvidenceUpload({ disputeId: 'dispute-1' }));

    await act(async () => {
      await result.current.addFiles([imageFile()]);
    });

    expect(result.current.files[0]).toMatchObject({
      filename: 'photo.jpg',
      status: 'completed',
      uploadedUrl: 'https://cdn.example.com/photo.jpg',
    });
  });

  it('collects upload errors in evidenceErrors', async () => {
    mockedUploadEvidence.mockResolvedValue({ success: false, message: 'Server rejected file' });

    const { result } = renderHook(() => useEvidenceUpload({ disputeId: 'dispute-1' }));

    await act(async () => {
      await result.current.addFiles([imageFile()]);
    });

    expect(result.current.evidenceErrors).toContain('Server rejected file');
    expect(result.current.files[0].status).toBe('failed');
  });

  it('removes a file from the list and revokes its preview', async () => {
    const { result } = renderHook(() => useEvidenceUpload({ disputeId: 'dispute-1' }));

    await act(async () => {
      await result.current.addFiles([imageFile()]);
    });

    const id = result.current.files[0].id;

    act(() => {
      result.current.removeFile(id);
    });

    expect(result.current.files).toHaveLength(0);
    expect(evidenceUploadService.revokePreview).toHaveBeenCalledWith('blob:preview-url');
  });

  it('cancels an in-flight upload via AbortController', async () => {
    let rejectUpload: ((reason?: unknown) => void) | undefined;
    let capturedSignal: AbortSignal | undefined;

    mockedUploadEvidence.mockImplementation(
      (_file, _disputeId, _onProgress, signal: AbortSignal) =>
        new Promise((_resolve, reject) => {
          capturedSignal = signal;
          rejectUpload = () => {
            const err = new Error('aborted');
            reject(err);
          };
        }),
    );

    const { result } = renderHook(() => useEvidenceUpload({ disputeId: 'dispute-1' }));

    let addFilesPromise!: Promise<void>;
    act(() => {
      addFilesPromise = result.current.addFiles([imageFile()]);
    });

    await waitFor(() => expect(result.current.files).toHaveLength(1));

    const id = result.current.files[0].id;

    act(() => {
      result.current.cancelUpload(id);
    });

    expect(capturedSignal?.aborted).toBe(true);

    act(() => {
      rejectUpload?.();
    });

    await act(async () => {
      await addFilesPromise;
    });

    expect(result.current.files[0].status).toBe('cancelled');
  });
});
