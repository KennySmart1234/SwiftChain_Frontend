'use client';

import { useCallback, useRef, useState, type DragEvent, type ChangeEvent } from 'react';
import { toast } from 'sonner';
import type { EvidenceFile } from '@/types/disputeResolution';
import { ACCEPTED_EVIDENCE_TYPES, MAX_EVIDENCE_FILE_SIZE_MB } from '@/types/disputeResolution';

interface EvidenceMediaDropzoneProps {
  files: EvidenceFile[];
  onFilesAdded: (files: File[]) => { accepted: number; rejected: string[] };
  onRemoveFile: (id: string) => void;
  canAddMore: boolean;
}

const ACCEPT_ATTR = ACCEPTED_EVIDENCE_TYPES.join(',');

/**
 * EvidenceMediaDropzone — drag-and-drop (or click-to-browse) file input for
 * dispute evidence. Delegates validation to the caller's onFilesAdded and
 * only renders the result.
 */
export function EvidenceMediaDropzone({
  files,
  onFilesAdded,
  onRemoveFile,
  canAddMore,
}: EvidenceMediaDropzoneProps) {
  const [isDragActive, setIsDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(
    (fileList: FileList | null) => {
      if (!fileList || fileList.length === 0) return;
      const { rejected } = onFilesAdded(Array.from(fileList));
      for (const reason of rejected) {
        toast.error(reason);
      }
    },
    [onFilesAdded]
  );

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragActive(false);
    handleFiles(event.dataTransfer.files);
  };

  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragActive(true);
  };

  const handleDragLeave = () => setIsDragActive(false);

  const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    handleFiles(event.target.files);
    event.target.value = '';
  };

  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        aria-label="Evidence dropzone"
        data-testid="evidence-dropzone"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => canAddMore && inputRef.current?.click()}
        onKeyDown={(e) => {
          if ((e.key === 'Enter' || e.key === ' ') && canAddMore) {
            inputRef.current?.click();
          }
        }}
        className={`rounded-lg border-2 border-dashed p-6 text-center transition-colors ${
          !canAddMore
            ? 'cursor-not-allowed border-gray-200 bg-gray-50 opacity-60'
            : isDragActive
              ? 'cursor-pointer border-blue-500 bg-blue-50'
              : 'cursor-pointer border-gray-300 hover:border-blue-400'
        }`}
      >
        <p className="text-sm font-medium text-gray-900">
          {canAddMore
            ? 'Drag and drop evidence here, or click to browse'
            : 'Maximum evidence files reached'}
        </p>
        <p className="mt-1 text-xs text-gray-500">
          Images or PDF, up to {MAX_EVIDENCE_FILE_SIZE_MB}MB each
        </p>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ACCEPT_ATTR}
          onChange={handleInputChange}
          disabled={!canAddMore}
          className="hidden"
          aria-label="Choose evidence files"
        />
      </div>

      {files.length > 0 && (
        <ul role="list" className="mt-4 space-y-2">
          {files.map((evidenceFile) => (
            <li
              key={evidenceFile.id}
              className="flex items-center justify-between rounded-md border border-gray-200 bg-white px-3 py-2"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-gray-900">
                  {evidenceFile.file.name}
                </p>
                <p className="text-xs text-gray-500">
                  {evidenceFile.status === 'compressing' && 'Compressing…'}
                  {evidenceFile.status === 'ready' &&
                    (evidenceFile.compressedSizeKB
                      ? `Ready · ${evidenceFile.compressedSizeKB}KB`
                      : 'Ready')}
                  {evidenceFile.status === 'pending' && 'Queued'}
                  {evidenceFile.status === 'error' &&
                    (evidenceFile.errorMessage ?? 'Upload failed')}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onRemoveFile(evidenceFile.id)}
                aria-label={`Remove ${evidenceFile.file.name}`}
                className="ml-3 shrink-0 text-xs font-medium text-red-600 hover:text-red-700"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
