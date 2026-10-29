'use client';

import { useDropzone } from 'react-dropzone';
import type { EvidenceFile } from '@/hooks/useDisputeCase';

interface EvidenceDropzoneProps {
  files: EvidenceFile[];
  onFilesAdded: (files: File[]) => void;
  onRemoveFile: (id: string) => void;
  onRejected: (reasons: string[]) => void;
}

export function EvidenceDropzone({
  files,
  onFilesAdded,
  onRemoveFile,
  onRejected,
}: EvidenceDropzoneProps) {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'image/webp': ['.webp'],
      'video/mp4': ['.mp4'],
      'video/webm': ['.webm'],
    },
    maxSize: 10 * 1024 * 1024,
    onDrop: (accepted, fileRejections) => {
      if (accepted.length > 0) onFilesAdded(accepted);
      if (fileRejections.length > 0) {
        onRejected(
          fileRejections.map(
            (r) => `${r.file.name}: ${r.errors.map((e) => e.message).join(', ')}`
          )
        );
      }
    },
  });

  return (
    <div>
      <div
        {...getRootProps()}
        data-testid="evidence-dropzone"
        className={`cursor-pointer rounded-md border-2 border-dashed p-8 text-center transition-colors ${
          isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 bg-gray-50'
        }`}
      >
        <input {...getInputProps()} aria-label="Upload evidence" />
        <p className="text-sm text-gray-600">
          Drag and drop photos or videos here, or click to browse
        </p>
        <p className="mt-1 text-xs text-gray-400">Images and video up to 10MB</p>
      </div>

      {files.length > 0 && (
        <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {files.map((evidenceFile) => (
            <li
              key={evidenceFile.id}
              className="relative overflow-hidden rounded-md border border-gray-200"
            >
              {evidenceFile.kind === 'image' ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={evidenceFile.previewUrl}
                  alt={evidenceFile.file.name}
                  className="h-24 w-full object-cover"
                />
              ) : (
                <video
                  src={evidenceFile.previewUrl}
                  className="h-24 w-full object-cover"
                  muted
                />
              )}
              <button
                type="button"
                onClick={() => onRemoveFile(evidenceFile.id)}
                aria-label={`Remove ${evidenceFile.file.name}`}
                className="absolute right-1 top-1 rounded-full bg-black/60 px-1.5 py-0.5 text-xs text-white hover:bg-black/80"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
