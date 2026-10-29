import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EvidenceDropzone } from '@/components/escrow/EvidenceDropzone';
import type { EvidenceFile } from '@/hooks/useDisputeCase';

beforeAll(() => {
  global.URL.createObjectURL = jest.fn(() => 'blob:mock-url');
});

describe('EvidenceDropzone', () => {
  it('calls onFilesAdded when a valid file is chosen via the input', async () => {
    const onFilesAdded = jest.fn();
    render(
      <EvidenceDropzone
        files={[]}
        onFilesAdded={onFilesAdded}
        onRemoveFile={jest.fn()}
        onRejected={jest.fn()}
      />
    );

    const file = new File(['data'], 'photo.jpg', { type: 'image/jpeg' });
    await userEvent.upload(screen.getByLabelText('Upload evidence'), file);

    expect(onFilesAdded).toHaveBeenCalledWith([file]);
  });

  it('renders an image preview and calls onRemoveFile when its remove button is clicked', () => {
    const onRemoveFile = jest.fn();
    const evidenceFile: EvidenceFile = {
      id: 'file-1',
      file: new File(['data'], 'photo.jpg', { type: 'image/jpeg' }),
      previewUrl: 'blob:mock-url',
      kind: 'image',
    };

    render(
      <EvidenceDropzone
        files={[evidenceFile]}
        onFilesAdded={jest.fn()}
        onRemoveFile={onRemoveFile}
        onRejected={jest.fn()}
      />
    );

    expect(screen.getByAltText('photo.jpg')).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText('Remove photo.jpg'));
    expect(onRemoveFile).toHaveBeenCalledWith('file-1');
  });

  it('renders a video preview for video evidence', () => {
    const evidenceFile: EvidenceFile = {
      id: 'file-2',
      file: new File(['data'], 'clip.mp4', { type: 'video/mp4' }),
      previewUrl: 'blob:mock-url',
      kind: 'video',
    };

    render(
      <EvidenceDropzone
        files={[evidenceFile]}
        onFilesAdded={jest.fn()}
        onRemoveFile={jest.fn()}
        onRejected={jest.fn()}
      />
    );

    expect(screen.getByLabelText('Remove clip.mp4')).toBeInTheDocument();
    expect(document.querySelector('video')).toHaveAttribute('src', 'blob:mock-url');
  });

  it('shows empty state styling with no queued files', () => {
    render(
      <EvidenceDropzone
        files={[]}
        onFilesAdded={jest.fn()}
        onRemoveFile={jest.fn()}
        onRejected={jest.fn()}
      />
    );

    expect(screen.getByText(/Drag and drop photos or videos/i)).toBeInTheDocument();
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
  });
});
