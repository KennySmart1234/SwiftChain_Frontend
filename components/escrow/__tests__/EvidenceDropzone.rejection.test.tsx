import { render } from '@testing-library/react';
import { useDropzone } from 'react-dropzone';
import { EvidenceDropzone } from '@/components/escrow/EvidenceDropzone';

// jsdom's native <input accept> filtering swallows a mismatched-type file
// before userEvent.upload can even fire a change event, so react-dropzone's
// own onDrop(accepted, fileRejections) rejection path never runs under
// simulated file selection (see EvidenceDropzone.test.tsx for the happy-path
// upload/preview/remove coverage using the real hook). Mocking useDropzone
// here drives that onDrop callback directly instead.
jest.mock('react-dropzone', () => ({
  useDropzone: jest.fn(),
}));

const mockUseDropzone = useDropzone as jest.Mock;

describe('EvidenceDropzone rejection handling', () => {
  it('calls onRejected with a reason for each rejected file', () => {
    let capturedOnDrop!: (accepted: File[], fileRejections: unknown[]) => void;
    mockUseDropzone.mockImplementation(({ onDrop }) => {
      capturedOnDrop = onDrop;
      return { getRootProps: () => ({}), getInputProps: () => ({}), isDragActive: false };
    });

    const onRejected = jest.fn();
    render(
      <EvidenceDropzone files={[]} onFilesAdded={jest.fn()} onRemoveFile={jest.fn()} onRejected={onRejected} />
    );

    const file = new File(['data'], 'doc.pdf', { type: 'application/pdf' });
    capturedOnDrop([], [
      { file, errors: [{ message: 'File type must be image or video' }] },
    ]);

    expect(onRejected).toHaveBeenCalledWith(['doc.pdf: File type must be image or video']);
  });

  it('calls onFilesAdded for the accepted files from onDrop', () => {
    let capturedOnDrop!: (accepted: File[], fileRejections: unknown[]) => void;
    mockUseDropzone.mockImplementation(({ onDrop }) => {
      capturedOnDrop = onDrop;
      return { getRootProps: () => ({}), getInputProps: () => ({}), isDragActive: false };
    });

    const onFilesAdded = jest.fn();
    render(
      <EvidenceDropzone files={[]} onFilesAdded={onFilesAdded} onRemoveFile={jest.fn()} onRejected={jest.fn()} />
    );

    const file = new File(['data'], 'photo.jpg', { type: 'image/jpeg' });
    capturedOnDrop([file], []);

    expect(onFilesAdded).toHaveBeenCalledWith([file]);
  });

  it('applies drag-active styling when isDragActive is true', () => {
    mockUseDropzone.mockReturnValue({
      getRootProps: () => ({}),
      getInputProps: () => ({}),
      isDragActive: true,
    });

    const { getByTestId } = render(
      <EvidenceDropzone files={[]} onFilesAdded={jest.fn()} onRemoveFile={jest.fn()} onRejected={jest.fn()} />
    );

    expect(getByTestId('evidence-dropzone').className).toContain('border-blue-500');
  });
});
