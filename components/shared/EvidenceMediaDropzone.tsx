'use client';

import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, AlertCircle, Loader, X, FileVideo } from 'lucide-react';
import { useEvidenceUpload, type FilePreview } from '@/hooks/useEvidenceUpload';
import { MAX_EVIDENCE_FILE_SIZE } from '@/services/evidenceUploadService';

interface EvidenceMediaDropzoneProps {
  disputeId: string;
}

const STATUS_LABEL: Record<FilePreview['status'], string> = {
  compressing: 'Compressing…',
  uploading: 'Uploading…',
  completed: 'Uploaded',
  failed: 'Failed',
  cancelled: 'Cancelled',
};

function FilePreviewCard({
  file,
  onRemove,
  onCancel,
}: {
  file: FilePreview;
  onRemove: (id: string) => void;
  onCancel: (id: string) => void;
}) {
  const isImage = file.mimeType.startsWith('image/');
  const isBusy = file.status === 'compressing' || file.status === 'uploading';

  return (
    <div
      data-testid="evidence-file-preview"
      className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-800"
    >
      <div className="h-14 w-14 shrink-0 overflow-hidden rounded-md bg-gray-100 dark:bg-gray-700">
        {isImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={file.previewUrl}
            alt={file.filename}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <FileVideo className="h-6 w-6 text-gray-400" />
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-gray-900 dark:text-white">{file.filename}</p>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {(file.fileSize / 1024).toFixed(0)} KB
          {file.isCompressed && ` (compressed from ${(file.originalSize / 1024).toFixed(0)} KB)`}
        </p>

        {isBusy && (
          <div className="mt-1.5">
            <div className="flex items-center gap-2">
              <Loader className="h-3 w-3 animate-spin text-blue-500" />
              <span className="text-xs text-blue-600 dark:text-blue-400">
                {STATUS_LABEL[file.status]}
                {file.status === 'uploading' && ` ${file.uploadProgress}%`}
              </span>
            </div>
            {file.status === 'uploading' && (
              <div className="mt-1 h-1.5 w-full rounded-full bg-blue-100 dark:bg-blue-900/40">
                <div
                  className="h-1.5 rounded-full bg-blue-600 transition-all duration-300"
                  style={{ width: `${file.uploadProgress}%` }}
                />
              </div>
            )}
          </div>
        )}

        {file.status === 'completed' && (
          <span className="mt-1 inline-block text-xs font-medium text-green-600 dark:text-green-400">
            Uploaded
          </span>
        )}
        {file.status === 'failed' && (
          <span className="mt-1 inline-block text-xs font-medium text-red-600 dark:text-red-400">
            Upload failed
          </span>
        )}
        {file.status === 'cancelled' && (
          <span className="mt-1 inline-block text-xs font-medium text-gray-500">Cancelled</span>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-1">
        {file.status === 'uploading' && (
          <button
            type="button"
            onClick={() => onCancel(file.id)}
            aria-label={`Cancel upload of ${file.filename}`}
            className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700"
          >
            <X className="h-4 w-4" />
          </button>
        )}
        <button
          type="button"
          onClick={() => onRemove(file.id)}
          aria-label={`Remove ${file.filename}`}
          className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-red-600 dark:hover:bg-gray-700"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

/**
 * EvidenceMediaDropzone — drag-and-drop / click-to-upload zone for dispute
 * evidence photos and videos. Consumes `useEvidenceUpload` for validation,
 * compression, progress tracking, and cancellation.
 *
 * Follows the Strict Layered Architecture: Component -> Hook -> Service.
 */
export function EvidenceMediaDropzone({ disputeId }: EvidenceMediaDropzoneProps) {
  const { files, evidenceErrors, addFiles, removeFile, cancelUpload } = useEvidenceUpload({
    disputeId,
  });

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      addFiles(acceptedFiles);
    },
    [addFiles],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'video/mp4': ['.mp4'],
      'video/quicktime': ['.mov'],
    },
    maxSize: MAX_EVIDENCE_FILE_SIZE,
  });

  return (
    <div className="w-full">
      <div
        {...getRootProps()}
        className={`
          cursor-pointer rounded-lg border-2 border-dashed p-8 text-center
          transition duration-200 ease-in-out
          ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 bg-gray-50 hover:border-gray-400'}
        `}
      >
        <input {...getInputProps()} aria-label="Upload evidence photo or video" />

        <div className="flex flex-col items-center justify-center">
          <Upload className="mb-3 h-10 w-10 text-gray-400" />
          <p className="mb-1 text-sm font-semibold text-gray-700">
            {isDragActive ? 'Drop files here' : 'Drag and drop photos or videos here'}
          </p>
          <p className="mb-2 text-sm text-gray-600">or click to select from your device</p>
          <p className="text-xs text-gray-500">
            Supported formats: JPG, PNG, MP4, MOV (Max 10MB)
          </p>
        </div>
      </div>

      {evidenceErrors.length > 0 && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4" role="alert">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
            <div>
              <h3 className="mb-2 font-semibold text-red-900">Upload failed</h3>
              <ul className="space-y-1">
                {evidenceErrors.map((error, index) => (
                  <li key={index} className="text-sm text-red-700">
                    • {error}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {files.length > 0 && (
        <div className="mt-4 space-y-2">
          {files.map((file) => (
            <FilePreviewCard key={file.id} file={file} onRemove={removeFile} onCancel={cancelUpload} />
          ))}
        </div>
      )}
    </div>
  );
}
