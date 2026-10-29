import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EvidenceMediaDropzone } from '@/components/shared/EvidenceMediaDropzone';
import { useEvidenceUpload } from '@/hooks/useEvidenceUpload';

jest.mock('@/hooks/useEvidenceUpload');

// Mock react-dropzone to expose a simple, controllable file input like KycUpload's test.
jest.mock('react-dropzone', () => ({
  useDropzone: ({ onDrop }: { onDrop: (files: File[]) => void }) => ({
    getRootProps: () => ({}),
    getInputProps: () => ({
      type: 'file',
      onChange: (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files ? Array.from(event.target.files) : [];
        onDrop(files);
      },
    }),
    isDragActive: false,
  }),
}));

const mockedUseEvidenceUpload = useEvidenceUpload as jest.MockedFunction<typeof useEvidenceUpload>;

function baseHookReturn(overrides: Partial<ReturnType<typeof useEvidenceUpload>> = {}) {
  return {
    files: [],
    evidenceErrors: [],
    isUploading: false,
    addFiles: jest.fn().mockResolvedValue(undefined),
    removeFile: jest.fn(),
    cancelUpload: jest.fn(),
    clearErrors: jest.fn(),
    ...overrides,
  };
}

describe('EvidenceMediaDropzone', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the drag-and-drop upload zone', () => {
    mockedUseEvidenceUpload.mockReturnValue(baseHookReturn());

    render(<EvidenceMediaDropzone disputeId="dispute-1" />);

    expect(screen.getByText('Drag and drop photos or videos here')).toBeInTheDocument();
    expect(screen.getByText('or click to select from your device')).toBeInTheDocument();
    expect(screen.getByText('Supported formats: JPG, PNG, MP4, MOV (Max 10MB)')).toBeInTheDocument();
  });

  it('calls addFiles when a file is selected via the input', async () => {
    const user = userEvent.setup();
    const addFiles = jest.fn().mockResolvedValue(undefined);
    mockedUseEvidenceUpload.mockReturnValue(baseHookReturn({ addFiles }));

    render(<EvidenceMediaDropzone disputeId="dispute-1" />);

    const input = screen.getByLabelText('Upload evidence photo or video');
    const file = new File(['x'], 'photo.jpg', { type: 'image/jpeg' });

    await user.upload(input, file);

    expect(addFiles).toHaveBeenCalledWith([file]);
  });

  it('shows preview thumbnails for image files with upload progress', () => {
    mockedUseEvidenceUpload.mockReturnValue(
      baseHookReturn({
        files: [
          {
            id: 'file-1',
            filename: 'photo.jpg',
            fileSize: 400,
            originalSize: 900 * 1024,
            isCompressed: true,
            status: 'uploading',
            previewUrl: 'blob:preview',
            mimeType: 'image/jpeg',
            uploadProgress: 42,
          },
        ],
      }),
    );

    render(<EvidenceMediaDropzone disputeId="dispute-1" />);

    expect(screen.getByAltText('photo.jpg')).toBeInTheDocument();
    expect(screen.getByText('Uploading… 42%')).toBeInTheDocument();
    expect(screen.getByText(/compressed from 900 KB/)).toBeInTheDocument();
  });

  it('shows a video icon placeholder for video files', () => {
    mockedUseEvidenceUpload.mockReturnValue(
      baseHookReturn({
        files: [
          {
            id: 'file-2',
            filename: 'clip.mp4',
            fileSize: 8000,
            originalSize: 8000,
            isCompressed: false,
            status: 'completed',
            previewUrl: 'blob:preview-video',
            mimeType: 'video/mp4',
            uploadProgress: 100,
          },
        ],
      }),
    );

    render(<EvidenceMediaDropzone disputeId="dispute-1" />);

    expect(screen.queryByAltText('clip.mp4')).not.toBeInTheDocument();
    expect(screen.getByText('Uploaded')).toBeInTheDocument();
  });

  it('displays inline validation errors', () => {
    mockedUseEvidenceUpload.mockReturnValue(
      baseHookReturn({ evidenceErrors: ['document.pdf: Only JPG, PNG, MP4, and MOV files are allowed'] }),
    );

    render(<EvidenceMediaDropzone disputeId="dispute-1" />);

    expect(screen.getByRole('alert')).toHaveTextContent(
      'document.pdf: Only JPG, PNG, MP4, and MOV files are allowed',
    );
  });

  it('allows removing an individual file from the preview list', async () => {
    const user = userEvent.setup();
    const removeFile = jest.fn();
    mockedUseEvidenceUpload.mockReturnValue(
      baseHookReturn({
        removeFile,
        files: [
          {
            id: 'file-1',
            filename: 'photo.jpg',
            fileSize: 400,
            originalSize: 400,
            isCompressed: false,
            status: 'completed',
            previewUrl: 'blob:preview',
            mimeType: 'image/jpeg',
            uploadProgress: 100,
          },
        ],
      }),
    );

    render(<EvidenceMediaDropzone disputeId="dispute-1" />);

    await user.click(screen.getByLabelText('Remove photo.jpg'));

    expect(removeFile).toHaveBeenCalledWith('file-1');
  });

  it('allows cancelling an in-progress upload', async () => {
    const user = userEvent.setup();
    const cancelUpload = jest.fn();
    mockedUseEvidenceUpload.mockReturnValue(
      baseHookReturn({
        cancelUpload,
        files: [
          {
            id: 'file-1',
            filename: 'clip.mp4',
            fileSize: 400,
            originalSize: 400,
            isCompressed: false,
            status: 'uploading',
            previewUrl: 'blob:preview',
            mimeType: 'video/mp4',
            uploadProgress: 20,
          },
        ],
      }),
    );

    render(<EvidenceMediaDropzone disputeId="dispute-1" />);

    await user.click(screen.getByLabelText('Cancel upload of clip.mp4'));

    expect(cancelUpload).toHaveBeenCalledWith('file-1');
  });
});
