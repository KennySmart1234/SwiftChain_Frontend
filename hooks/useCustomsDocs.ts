'use client';

/**
 * useCustomsDocs — Hook layer for customs documentation management.
 *
 * Architecture: Component → useCustomsDocs (Hook) → customsDocsService → Backend
 *
 * Owns: fetching, type filtering, expiry math, and multipart upload.
 * The component layer only renders what this hook returns.
 */

import { useCallback, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { customsDocsService } from '@/services/customsDocsService';
import type {
  CustomsDocument,
  CustomsDocType,
  ExpiryUrgency,
} from '@/types/customsDocumentation';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** A document at or under this many days to expiry is "critical". */
export const CRITICAL_EXPIRY_DAYS = 7;

/** A document at or under this many days to expiry raises a warning. */
export const WARNING_EXPIRY_DAYS = 30;

/**
 * Whole days from `now` until `expiresAt`.
 *
 * - Returns null when the document has no expiry date.
 * - Returns 0 on the expiry day itself.
 * - Returns a negative number once the document has lapsed.
 *
 * Compares calendar days in UTC so timezone offsets and DST shifts cannot
 * produce an off-by-one.
 */
export function daysUntilExpiry(
  expiresAt: string | null,
  now: Date = new Date()
): number | null {
  if (!expiresAt) return null;

  const expiry = new Date(expiresAt);
  if (Number.isNaN(expiry.getTime())) return null;

  const startOfExpiryDay = Date.UTC(
    expiry.getUTCFullYear(),
    expiry.getUTCMonth(),
    expiry.getUTCDate()
  );
  const startOfToday = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate()
  );

  return Math.round((startOfExpiryDay - startOfToday) / MS_PER_DAY);
}

/**
 * Bucket a document by how urgently it needs attention.
 */
export function getExpiryUrgency(
  document: CustomsDocument,
  now: Date = new Date()
): ExpiryUrgency {
  const days = daysUntilExpiry(document.expiresAt, now);

  if (document.status === 'expired') return 'expired';
  if (days === null) return 'valid';
  if (days <= 0) return 'expired';
  if (days <= CRITICAL_EXPIRY_DAYS) return 'critical';
  if (days <= WARNING_EXPIRY_DAYS) return 'warning';
  return 'valid';
}

export type CustomsDocTypeFilter = CustomsDocType | 'all';

export interface UseCustomsDocsResult {
  documents: CustomsDocument[];
  filteredDocuments: CustomsDocument[];
  isLoading: boolean;
  isError: boolean;
  errorMessage: string | null;
  typeFilter: CustomsDocTypeFilter;
  setTypeFilter: (filter: CustomsDocTypeFilter) => void;
  isUploading: boolean;
  uploadError: string | null;
  daysUntilExpiry: (document: CustomsDocument) => number | null;
  getExpiryUrgency: (document: CustomsDocument) => ExpiryUrgency;
  uploadDocument: (file: File, type: CustomsDocType) => Promise<void>;
  refetch: () => void;
  clearUploadError: () => void;
}

export function useCustomsDocs(shipmentId?: string): UseCustomsDocsResult {
  const queryClient = useQueryClient();
  const [typeFilter, setTypeFilter] =
    useState<CustomsDocTypeFilter>('all');

  const query = useQuery({
    queryKey: ['customs-docs', shipmentId ?? 'all'],
    queryFn: ({ signal }) =>
      customsDocsService.listDocuments({ shipmentId, signal }),
    retry: false,
  });

  const documents = useMemo<CustomsDocument[]>(
    () => query.data ?? [],
    [query.data]
  );

  const filteredDocuments = useMemo<CustomsDocument[]>(() => {
    if (typeFilter === 'all') return documents;
    return documents.filter((doc) => doc.type === typeFilter);
  }, [documents, typeFilter]);

  const uploadMutation = useMutation({
    mutationFn: async ({ file, type }: { file: File; type: CustomsDocType }) => {
      const formData = new FormData();
      formData.append('document', file);
      formData.append('documentType', type);
      if (shipmentId) formData.append('shipmentId', shipmentId);

      return customsDocsService.uploadDocument(formData);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ['customs-docs'],
      });
    },
  });

  const uploadDocument = useCallback(
    async (file: File, type: CustomsDocType) => {
      await uploadMutation.mutateAsync({ file, type });
    },
    [uploadMutation]
  );

  const errorMessage = query.error
    ? (query.error as Error)?.message || 'Failed to load documents'
    : null;

  const uploadError = uploadMutation.error
    ? (uploadMutation.error as Error)?.message || 'Upload failed'
    : null;

  const clearUploadError = useCallback(() => {
    uploadMutation.reset();
  }, [uploadMutation]);

  return {
    documents,
    filteredDocuments,
    isLoading: query.isLoading,
    isError: query.isError,
    errorMessage,
    typeFilter,
    setTypeFilter,
    isUploading: uploadMutation.isPending,
    uploadError,
    daysUntilExpiry: (document) =>
      daysUntilExpiry(document.expiresAt, new Date()),
    getExpiryUrgency: (document) => getExpiryUrgency(document, new Date()),
    uploadDocument,
    refetch: () => void query.refetch(),
    clearUploadError,
  };
}
