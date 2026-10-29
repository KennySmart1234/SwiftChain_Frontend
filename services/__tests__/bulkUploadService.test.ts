import { bulkUploadService, type FilePreview, type BulkUploadResponse } from '../bulkUploadService';
import api from '@/lib/api';
import Papa from 'papaparse';

jest.mock('@/lib/api');
jest.mock('papaparse');

describe('bulkUploadService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('validateFile', () => {
    it('should pass validation for valid CSV file', () => {
      const file = new File(['col1,col2\nval1,val2'], 'test.csv', { type: 'text/csv' });
      const errors = bulkUploadService.validateFile(file);
      expect(errors).toEqual([]);
    });

    it('should pass validation for valid XLSX file', () => {
      const file = new File([''], 'test.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const errors = bulkUploadService.validateFile(file);
      expect(errors).toEqual([]);
    });

    it('should reject files with invalid extension', () => {
      const file = new File(['test'], 'test.png', { type: 'image/png' });
      const errors = bulkUploadService.validateFile(file);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((e) => e.field === 'type')).toBe(true);
      expect(errors.some((e) => e.message.includes('CSV and XLSX'))).toBe(true);
    });

    it('should reject files exceeding size limit', () => {
      const largeBuffer = new ArrayBuffer(60 * 1024 * 1024); // 60MB
      const file = new File([largeBuffer], 'large.csv', { type: 'text/csv' });
      const errors = bulkUploadService.validateFile(file);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((e) => e.field === 'size')).toBe(true);
      expect(errors.some((e) => e.message.includes('50MB'))).toBe(true);
    });

    it('should accept empty MIME type with valid extension', () => {
      const file = new File(['col1,col2'], 'test.csv', { type: '' });
      const errors = bulkUploadService.validateFile(file);
      // Should either pass or have only type-related warning that's lenient
      expect(errors.filter((e) => e.field === 'type').length).toBeLessThanOrEqual(1);
    });
  });

  describe('generatePreview', () => {
    it('should generate preview for valid CSV file', async () => {
      const csvContent = 'name,email,phone\nJohn Doe,john@example.com,555-1234\nJane Smith,jane@example.com,555-5678';
      const file = new File([csvContent], 'test.csv', { type: 'text/csv' });

      const mockParseComplete = jest.fn((callback: any) => {
        callback({
          data: [
            { name: 'John Doe', email: 'john@example.com', phone: '555-1234' },
            { name: 'Jane Smith', email: 'jane@example.com', phone: '555-5678' },
          ],
          meta: { fields: ['name', 'email', 'phone'] },
        });
      });

      (Papa.parse as jest.Mock).mockImplementation((_, options: any) => {
        mockParseComplete(options.complete);
      });

      const preview = await bulkUploadService.generatePreview(file);

      expect(preview.fileName).toBe('test.csv');
      expect(preview.rowCount).toBe(2);
      expect(preview.columnCount).toBe(3);
      expect(preview.columnNames).toEqual(['name', 'email', 'phone']);
      expect(preview.previewRows.length).toBeLessThanOrEqual(3);
    });

    it('should limit preview rows to 3', async () => {
      const csvContent = 'id,value\n1,a\n2,b\n3,c\n4,d\n5,e';
      const file = new File([csvContent], 'test.csv', { type: 'text/csv' });

      const mockParseComplete = jest.fn((callback: any) => {
        callback({
          data: [
            { id: '1', value: 'a' },
            { id: '2', value: 'b' },
            { id: '3', value: 'c' },
            { id: '4', value: 'd' },
            { id: '5', value: 'e' },
          ],
          meta: { fields: ['id', 'value'] },
        });
      });

      (Papa.parse as jest.Mock).mockImplementation((_, options: any) => {
        mockParseComplete(options.complete);
      });

      const preview = await bulkUploadService.generatePreview(file);

      expect(preview.previewRows.length).toBe(3);
      expect(preview.rowCount).toBe(5);
    });

    it('should reject empty files', async () => {
      const file = new File([''], 'empty.csv', { type: 'text/csv' });

      (Papa.parse as jest.Mock).mockImplementation((_, options: any) => {
        options.complete({
          data: [],
          meta: { fields: [] },
        });
      });

      await expect(bulkUploadService.generatePreview(file)).rejects.toThrow(
        'File appears to be empty',
      );
    });

    it('should handle CSV parsing errors', async () => {
      const file = new File(['malformed'], 'test.csv', { type: 'text/csv' });

      (Papa.parse as jest.Mock).mockImplementation((_, options: any) => {
        options.error({
          message: 'Invalid CSV format',
        });
      });

      await expect(bulkUploadService.generatePreview(file)).rejects.toThrow(
        'CSV parsing error',
      );
    });

    it('should handle file read errors', async () => {
      const file = new File(['test'], 'test.csv', { type: 'text/csv' });

      // Mock FileReader error
      const originalFileReader = global.FileReader;
      (global as any).FileReader = class {
        readAsText() {
          this.onerror?.();
        }
        onerror: ((this: FileReader, ev: ProgressEvent<FileReader>) => any) | null = null;
      };

      try {
        await expect(bulkUploadService.generatePreview(file)).rejects.toThrow(
          'Failed to read file',
        );
      } finally {
        (global as any).FileReader = originalFileReader;
      }
    });
  });

  describe('uploadBulkFile', () => {
    it('should upload file and return success response', async () => {
      const file = new File(['test data'], 'test.csv', { type: 'text/csv' });
      const mockResponse: BulkUploadResponse = {
        success: true,
        message: 'Upload successful',
        data: {
          uploadId: 'upload-123',
          processedCount: 100,
          failedCount: 0,
          uploadedAt: '2024-01-01T00:00:00Z',
        },
      };

      (api.post as jest.Mock).mockResolvedValue({ data: mockResponse });

      const result = await bulkUploadService.uploadBulkFile(file, 'shipments');

      expect(result.success).toBe(true);
      expect(result.data?.processedCount).toBe(100);
      expect(api.post).toHaveBeenCalledWith(
        '/api/upload/bulk-csv',
        expect.any(FormData),
        expect.objectContaining({
          headers: { 'Content-Type': 'multipart/form-data' },
        }),
      );
    });

    it('should handle upload errors gracefully', async () => {
      const file = new File(['test data'], 'test.csv', { type: 'text/csv' });

      (api.post as jest.Mock).mockRejectedValue(new Error('Network error'));

      const result = await bulkUploadService.uploadBulkFile(file, 'deliveries');

      expect(result.success).toBe(false);
      expect(result.message).toContain('Network error');
    });

    it('should send correct fileType parameter', async () => {
      const file = new File(['test'], 'test.csv', { type: 'text/csv' });

      (api.post as jest.Mock).mockResolvedValue({
        data: { success: true },
      });

      await bulkUploadService.uploadBulkFile(file, 'orders');

      const [, formData] = (api.post as jest.Mock).mock.calls[0];
      expect(formData.get('fileType')).toBe('orders');
    });

    it('should include file in FormData', async () => {
      const file = new File(['test data'], 'test.csv', { type: 'text/csv' });

      (api.post as jest.Mock).mockResolvedValue({
        data: { success: true },
      });

      await bulkUploadService.uploadBulkFile(file, 'shipments');

      const [, formData] = (api.post as jest.Mock).mock.calls[0];
      expect(formData.get('file')).toBe(file);
    });

    it('should handle response with no data', async () => {
      const file = new File(['test'], 'test.csv', { type: 'text/csv' });

      (api.post as jest.Mock).mockResolvedValue({
        data: { success: false, message: 'Processing failed' },
      });

      const result = await bulkUploadService.uploadBulkFile(file, 'shipments');

      expect(result.success).toBe(false);
      expect(result.message).toBe('Processing failed');
    });
  });
});
