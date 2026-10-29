'use client';

import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { useBulkUploadZone } from '@/hooks/useBulkUploadZone';
import { Upload, X, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import clsx from 'clsx';

export interface BulkUploadZoneProps {
  fileType?: 'shipments' | 'deliveries' | 'orders';
  onUploadComplete?: (uploadId: string) => void;
  maxFiles?: number;
}

/**
 * BulkUploadZone — interactive dropzone for importing bulk delivery orders.
 *
 * Features:
 * - Drag-and-drop file upload with visual feedback
 * - CSV/XLSX file validation (MIME type + extension)
 * - Automatic file preview (first 3 rows)
 * - Error toast notifications for invalid files
 * - Backend API integration via bulkUploadService
 *
 * Follows the Component → Hook → Service pattern.
 */
export function BulkUploadZone({
  fileType = 'shipments',
  onUploadComplete,
  maxFiles = 5,
}: BulkUploadZoneProps) {
  const { files, isUploading, validationErrors, addFiles, removeFile, uploadAll, clearAll } =
    useBulkUploadZone();

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      addFiles(acceptedFiles.slice(0, maxFiles - files.length));
    },
    [addFiles, files.length, maxFiles],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
    },
    maxFiles: maxFiles - files.length,
    disabled: files.length >= maxFiles,
  });

  const handleUploadAll = async () => {
    await uploadAll(fileType);
    if (files.every((f) => f.uploadStatus === 'success')) {
      onUploadComplete?.(files[0]?.preview?.fileName || '');
    }
  };

  const hasInvalidFiles = validationErrors.length > 0;
  const pendingFiles = files.filter((f) => f.uploadStatus === 'pending');
  const successFiles = files.filter((f) => f.uploadStatus === 'success');
  const errorFiles = files.filter((f) => f.uploadStatus === 'error');

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 p-6 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700">
      {/* Dropzone */}
      <div
        {...getRootProps()}
        className={clsx(
          'relative border-2 border-dashed rounded-lg p-8 text-center transition-all duration-200 cursor-pointer',
          isDragActive
            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
            : 'border-slate-300 dark:border-slate-600 hover:border-slate-400 dark:hover:border-slate-500',
          files.length >= maxFiles && 'opacity-50 cursor-not-allowed',
        )}
      >
        <input {...getInputProps()} />

        {isDragActive ? (
          <div className="flex flex-col items-center gap-3">
            <Upload className="w-12 h-12 text-blue-500" />
            <p className="text-lg font-semibold text-blue-600 dark:text-blue-400">
              Drop files here
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <Upload className="w-12 h-12 text-slate-400" />
            <div>
              <p className="text-lg font-semibold text-slate-900 dark:text-white">
                Drag and drop CSV or XLSX files here
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                or click to select files (max {maxFiles})
              </p>
            </div>
            <div className="mt-4 text-xs text-slate-500 dark:text-slate-400 space-y-1">
              <p>✓ Supported formats: CSV, XLSX</p>
              <p>✓ Maximum file size: 50MB</p>
              <p>✓ Preview: First 3 rows displayed</p>
            </div>
          </div>
        )}
      </div>

      {/* Validation Errors */}
      {hasInvalidFiles && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <div className="flex gap-2 items-start">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-red-900 dark:text-red-200">Invalid file</h3>
              {validationErrors.map((err, idx) => (
                <p key={idx} className="text-sm text-red-800 dark:text-red-300">
                  {err.message}
                </p>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Files List */}
      {files.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-slate-900 dark:text-white">
              Files ({files.length}/{maxFiles})
            </h3>
            {files.length > 0 && (
              <button
                onClick={clearAll}
                className="text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
              >
                Clear all
              </button>
            )}
          </div>

          {/* File Items */}
          <div className="space-y-3">
            {files.map((fileItem, idx) => (
              <div
                key={idx}
                className="border border-slate-200 dark:border-slate-700 rounded-lg p-4 space-y-3 bg-slate-50 dark:bg-slate-800/50"
              >
                {/* File Header */}
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-900 dark:text-white truncate">
                      {fileItem.file.name}
                    </p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      {(fileItem.file.size / 1024).toFixed(2)} KB
                    </p>
                  </div>

                  <div className="flex items-center gap-2 ml-4">
                    {fileItem.uploadStatus === 'success' && (
                      <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0" />
                    )}
                    {fileItem.uploadStatus === 'error' && (
                      <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" />
                    )}
                    {fileItem.uploadStatus === 'uploading' && (
                      <Loader2 className="w-5 h-5 text-blue-600 dark:text-blue-400 animate-spin flex-shrink-0" />
                    )}
                    {fileItem.uploadStatus === 'pending' && (
                      <button
                        onClick={() => removeFile(idx)}
                        disabled={isUploading}
                        className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors disabled:opacity-50"
                      >
                        <X className="w-5 h-5 text-slate-500 dark:text-slate-400" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Error Message */}
                {fileItem.error && (
                  <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-2 rounded">
                    {fileItem.error}
                  </div>
                )}

                {/* Preview Table */}
                {fileItem.preview && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wide">
                      Preview ({fileItem.preview.rowCount} rows, {fileItem.preview.columnCount}{' '}
                      columns)
                    </p>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs border-collapse">
                        <thead>
                          <tr className="bg-slate-200 dark:bg-slate-700">
                            {fileItem.preview.columnNames.map((col, colIdx) => (
                              <th
                                key={colIdx}
                                className="border border-slate-300 dark:border-slate-600 px-2 py-1 text-left font-semibold text-slate-900 dark:text-white"
                              >
                                {col}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {fileItem.preview.previewRows.map((row, rowIdx) => (
                            <tr
                              key={rowIdx}
                              className="border-b border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700"
                            >
                              {fileItem.preview.columnNames.map((col, colIdx) => (
                                <td
                                  key={colIdx}
                                  className="border border-slate-300 dark:border-slate-600 px-2 py-1 text-slate-700 dark:text-slate-300"
                                >
                                  {String(row[col] ?? '')}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Upload Progress */}
                {fileItem.uploadStatus === 'uploading' && (
                  <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                    <div
                      className="bg-blue-600 dark:bg-blue-500 h-2 rounded-full transition-all"
                      style={{ width: `${fileItem.uploadProgress}%` }}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
            {pendingFiles.length > 0 && (
              <button
                onClick={handleUploadAll}
                disabled={isUploading || pendingFiles.length === 0}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 text-white font-medium rounded-lg transition-colors disabled:cursor-not-allowed"
              >
                {isUploading ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Uploading...
                  </span>
                ) : (
                  `Upload ${pendingFiles.length} file${pendingFiles.length > 1 ? 's' : ''}`
                )}
              </button>
            )}

            {successFiles.length > 0 && (
              <div className="flex-1 px-4 py-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-green-800 dark:text-green-200 text-center font-medium">
                ✓ {successFiles.length} file{successFiles.length > 1 ? 's' : ''} uploaded
              </div>
            )}

            {errorFiles.length > 0 && (
              <div className="flex-1 px-4 py-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-800 dark:text-red-200 text-center font-medium">
                ✗ {errorFiles.length} file{errorFiles.length > 1 ? 's' : ''} failed
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
