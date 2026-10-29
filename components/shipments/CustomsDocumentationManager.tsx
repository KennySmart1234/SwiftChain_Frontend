'use client';

/**
 * CustomsDocumentationManager — presentation layer only.
 *
 * Architecture: Component → useCustomsDocs (Hook) → customsDocsService → Backend
 * All data access and expiry math is delegated to the hook; this component
 * renders state and wires up user intent.
 */

import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import {
  AlertTriangle,
  FileText,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Upload,
} from 'lucide-react';
import { useCustomsDocs } from '@/hooks/useCustomsDocs';
import {
  CUSTOMS_DOC_TYPES,
  CUSTOMS_DOC_TYPE_LABELS,
  type CustomsDocument,
  type CustomsDocStatus,
  type CustomsDocType,
  type ExpiryUrgency,
} from '@/types/customsDocumentation';

const MAX_FILE_SIZE_MB = 10;

const URGENCY_STYLES: Record<ExpiryUrgency, string> = {
  expired: 'bg-red-100 text-red-800 border-red-300',
  critical: 'bg-orange-100 text-orange-800 border-orange-300',
  warning: 'bg-amber-100 text-amber-800 border-amber-300',
  valid: 'bg-emerald-50 text-emerald-800 border-emerald-200',
};

const STATUS_STYLES: Record<CustomsDocStatus, string> = {
  verified: 'bg-green-100 text-green-800',
  pending: 'bg-blue-100 text-blue-800',
  rejected: 'bg-red-100 text-red-800',
  expired: 'bg-gray-200 text-gray-700',
};

function expiryLabel(document: CustomsDocument, days: number | null): string {
  if (days === null) return 'Does not expire';
  if (days < 0) return `Expired ${Math.abs(days)} day(s) ago`;
  if (days === 0) return 'Expires today';
  if (days === 1) return 'Expires in 1 day';
  return `Expires in ${days} days`;
}

interface CustomsDocumentationManagerProps {
  shipmentId?: string;
}

export default function CustomsDocumentationManager({
  shipmentId,
}: CustomsDocumentationManagerProps) {
  const {
    documents,
    filteredDocuments,
    isLoading,
    isError,
    errorMessage,
    typeFilter,
    setTypeFilter,
    isUploading,
    uploadError,
    daysUntilExpiry,
    getExpiryUrgency,
    uploadDocument,
    refetch,
  } = useCustomsDocs(shipmentId);

  const [uploadType, setUploadType] = useState<CustomsDocType>(
    'commercial_invoice'
  );

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      acceptedFiles.forEach((file) => {
        void uploadDocument(file, uploadType);
      });
    },
    [uploadDocument, uploadType]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
    },
    maxSize: MAX_FILE_SIZE_MB * 1024 * 1024,
    disabled: isUploading,
    multiple: true,
  });

  if (isLoading) {
    return (
      <section
        aria-label="Customs documentation"
        aria-busy="true"
        className="rounded-xl border border-slate-200 bg-white p-6"
      >
        <div
          data-testid="customs-docs-loading"
          className="space-y-3"
          role="status"
          aria-label="Loading customs documents"
        >
          <div className="h-6 w-56 animate-pulse rounded bg-slate-200" />
          <div className="h-24 animate-pulse rounded-lg bg-slate-100" />
          <div className="h-24 animate-pulse rounded-lg bg-slate-100" />
        </div>
      </section>
    );
  }

  if (isError) {
    return (
      <section
        aria-label="Customs documentation"
        className="rounded-xl border border-red-200 bg-red-50 p-6"
      >
        <div role="alert" className="flex items-start gap-3">
          <AlertTriangle
            className="h-5 w-5 flex-shrink-0 text-red-500"
            aria-hidden="true"
          />
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-red-900">
              Failed to load customs documents
            </h2>
            <p className="mt-1 text-sm text-red-700">
              {errorMessage ?? 'Something went wrong. Please try again.'}
            </p>
            <button
              type="button"
              onClick={refetch}
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
            >
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
              Retry
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section
      aria-label="Customs documentation"
      className="rounded-xl border border-slate-200 bg-white p-6"
    >
      <header className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900">
            Customs Documentation
          </h2>
          <p className="text-sm text-slate-600">
            {documents.length} document{documents.length === 1 ? '' : 's'} on
            file
          </p>
        </div>

        <div className="flex items-center gap-2">
          <label
            htmlFor="customs-doc-type-filter"
            className="text-sm font-medium text-slate-700"
          >
            Filter by type
          </label>
          <select
            id="customs-doc-type-filter"
            value={typeFilter}
            onChange={(event) =>
              setTypeFilter(event.target.value as typeof typeFilter)
            }
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
          >
            <option value="all">All documents</option>
            {CUSTOMS_DOC_TYPES.map((type) => (
              <option key={type} value={type}>
                {CUSTOMS_DOC_TYPE_LABELS[type]}
              </option>
            ))}
          </select>
        </div>
      </header>

      {/* Upload dropzone */}
      <div className="mb-6">
        <label
          htmlFor="customs-doc-upload-type"
          className="mb-1 block text-sm font-medium text-slate-700"
        >
          Upload as
        </label>
        <select
          id="customs-doc-upload-type"
          value={uploadType}
          onChange={(event) =>
            setUploadType(event.target.value as CustomsDocType)
          }
          className="mb-3 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 sm:w-64"
        >
          {CUSTOMS_DOC_TYPES.map((type) => (
            <option key={type} value={type}>
              {CUSTOMS_DOC_TYPE_LABELS[type]}
            </option>
          ))}
        </select>

        <div
          {...getRootProps()}
          data-testid="customs-docs-dropzone"
          className={`cursor-pointer rounded-xl border-2 border-dashed p-6 text-center transition ${
            isDragActive
              ? 'border-blue-500 bg-blue-50'
              : 'border-slate-300 bg-slate-50 hover:border-slate-400'
          } ${isUploading ? 'cursor-not-allowed opacity-60' : ''}`}
        >
          <input
            {...getInputProps()}
            aria-label="Upload customs document"
            disabled={isUploading}
          />
          {isUploading ? (
            <p className="flex items-center justify-center gap-2 text-sm font-medium text-blue-700">
              <Loader2
                className="h-4 w-4 animate-spin"
                aria-hidden="true"
              />
              Uploading document…
            </p>
          ) : (
            <>
              <Upload
                className="mx-auto mb-2 h-6 w-6 text-slate-400"
                aria-hidden="true"
              />
              <p className="text-sm font-semibold text-slate-800">
                {isDragActive
                  ? 'Drop files here'
                  : 'Drag and drop customs documents here'}
              </p>
              <p className="text-xs text-slate-500">
                or click to browse — PDF, JPG or PNG (max {MAX_FILE_SIZE_MB}MB)
              </p>
            </>
          )}
        </div>

        {uploadError && (
          <p
            role="alert"
            className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
          >
            {uploadError}
          </p>
        )}
      </div>

      {/* Document list */}
      {filteredDocuments.length === 0 ? (
        <div
          data-testid="customs-docs-empty"
          className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center"
        >
          <FileText
            className="mx-auto mb-3 h-8 w-8 text-slate-400"
            aria-hidden="true"
          />
          <h3 className="text-base font-semibold text-slate-800">
            {documents.length === 0
              ? 'No customs documents yet'
              : 'No documents match this filter'}
          </h3>
          <p className="mt-1 text-sm text-slate-600">
            {documents.length === 0
              ? 'Upload a commercial invoice, packing list or bill of lading to get started.'
              : 'Try selecting a different document type.'}
          </p>
        </div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {filteredDocuments.map((document) => {
            const days = daysUntilExpiry(document);
            const urgency = getExpiryUrgency(document);

            return (
              <li
                key={document.id}
                data-testid={`customs-doc-card-${document.id}`}
                className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-900">
                      {document.filename}
                    </p>
                    <p className="text-xs text-slate-500">
                      {CUSTOMS_DOC_TYPE_LABELS[document.type]}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${STATUS_STYLES[document.status]}`}
                  >
                    {document.status}
                  </span>
                </div>

                <div className="mt-3 flex items-center justify-between gap-2">
                  <span
                    data-testid={`customs-doc-expiry-${document.id}`}
                    data-urgency={urgency}
                    className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${URGENCY_STYLES[urgency]}`}
                  >
                    {urgency === 'valid' ? (
                      <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                    ) : (
                      <AlertTriangle
                        className="h-3.5 w-3.5"
                        aria-hidden="true"
                      />
                    )}
                    {expiryLabel(document, days)}
                  </span>
                  <span className="text-xs text-slate-500">
                    {(document.fileSize / 1024).toFixed(1)} KB
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
