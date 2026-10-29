import api from '@/lib/api';
import Papa from 'papaparse';

export interface BulkUploadError {
  field: 'size' | 'type' | 'parse' | 'general';
  message: string;
}

export interface ParsedRow {
  [key: string]: string | number | null;
}

export interface FilePreview {
  fileName: string;
  rowCount: number;
  columnCount: number;
  columnNames: string[];
  previewRows: ParsedRow[];
}

export interface BulkUploadResponse {
  success: boolean;
  message?: string;
  data?: {
    uploadId: string;
    processedCount: number;
    failedCount: number;
    uploadedAt: string;
  };
}

const ALLOWED_MIME_TYPES = [
  'text/csv',
  'application/csv',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
];

const ALLOWED_EXTENSIONS = ['.csv', '.xlsx'];
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB for bulk uploads
const MAX_ROWS_PREVIEW = 3;

/**
 * bulkUploadService — handles CSV/XLSX file validation and parsing.
 * Provides preview generation and file upload to backend.
 *
 * Follows the Component → Hook → Service pattern:
 *   BulkUploadZone (component) → useBulkUploadZone (hook) → bulkUploadService (service)
 */
export const bulkUploadService = {
  /**
   * Validates a file against size and type constraints.
   * @returns BulkUploadError[] - Empty array if valid, error array otherwise
   */
  validateFile(file: File): BulkUploadError[] {
    const errors: BulkUploadError[] = [];

    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      errors.push({
        field: 'size',
        message: `File size exceeds 50MB limit (${(file.size / 1024 / 1024).toFixed(2)}MB)`,
      });
    }

    // Check file extension
    const fileName = file.name.toLowerCase();
    const hasValidExtension = ALLOWED_EXTENSIONS.some((ext) => fileName.endsWith(ext));
    if (!hasValidExtension) {
      errors.push({
        field: 'type',
        message: 'Only CSV and XLSX files are allowed',
      });
    }

    // Check MIME type (secondary validation)
    if (!ALLOWED_MIME_TYPES.includes(file.type) && file.type !== '') {
      // Allow empty MIME type for some systems, but warn about invalid types
      if (
        !fileName.endsWith('.csv') &&
        !fileName.endsWith('.xlsx') &&
        !file.type.includes('spreadsheet')
      ) {
        errors.push({
          field: 'type',
          message: 'Invalid file type. Please upload a CSV or XLSX file',
        });
      }
    }

    return errors;
  },

  /**
   * Parses a CSV/XLSX file and generates a preview.
   * For XLSX files, converts to JSON using Papa Parse after reading as text.
   * @param file - CSV or XLSX file to parse
   * @returns FilePreview with column info and first N rows
   */
  async generatePreview(file: File): Promise<FilePreview> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (event) => {
        try {
          const text = event.target?.result as string;

          // Parse CSV using Papa Parse
          Papa.parse(text, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
              const rows = (results.data as ParsedRow[]) || [];
              const columnNames = results.meta.fields || [];

              if (rows.length === 0) {
                reject(new Error('File appears to be empty or has no valid data rows'));
                return;
              }

              const previewRows = rows.slice(0, MAX_ROWS_PREVIEW);

              resolve({
                fileName: file.name,
                rowCount: rows.length,
                columnCount: columnNames.length,
                columnNames,
                previewRows,
              });
            },
            error: (error) => {
              reject(new Error(`CSV parsing error: ${error.message}`));
            },
          });
        } catch (error) {
          reject(
            new Error(
              `File parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
            ),
          );
        }
      };

      reader.onerror = () => {
        reject(new Error('Failed to read file'));
      };

      reader.readAsText(file);
    });
  },

  /**
   * Uploads a bulk CSV/XLSX file to the backend for processing.
   * @param file - CSV or XLSX file to upload
   * @param fileType - Category: 'shipments' | 'deliveries' etc.
   */
  async uploadBulkFile(
    file: File,
    fileType: 'shipments' | 'deliveries' | 'orders',
  ): Promise<BulkUploadResponse> {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('fileType', fileType);

      const { data } = await api.post<BulkUploadResponse>('/api/upload/bulk-csv', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      return data;
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Bulk file upload failed',
      };
    }
  },
};
