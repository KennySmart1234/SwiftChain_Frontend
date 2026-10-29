import { renderHook, act, waitFor } from '@testing-library/react';
import { useBulkUploadZone } from '../useBulkUploadZone';
import { bulkUploadService } from '@/services/bulkUploadService';
import { useToast } from '../useToast';

jest.mock('@/services/bulkUploadService');
jest.mock('../useToast');

describe('useBulkUploadZone', () => {
  const mockToast = {
    success: jest.fn(),
    error: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useToast as jest.Mock).mockReturnValue(mockToast);
  });

  describe('addFiles', () => {
    it('should add valid files to the queue', async () => {
      const { result } = renderHook(() => useBulkUploadZone());

      const file = new File(['data'], 'test.csv', { type: 'text/csv' });

      (bulkUploadService.validateFile as jest.Mock).mockReturnValue([]);
      (bulkUploadService.generatePreview as jest.Mock).mockResolvedValue({
        fileName: 'test.csv',
        rowCount: 10,
        columnCount: 3,
        columnNames: ['col1', 'col2', 'col3'],
        previewRows: [],
      });

      await act(async () => {
        await result.current.addFiles([file]);
      });

      expect(result.current.files).toHaveLength(1);
      expect(result.current.files[0].file).toBe(file);
      expect(result.current.files[0].uploadStatus).toBe('pending');
      expect(result.current.files[0].preview).toBeDefined();
    });

    it('should reject invalid files and show error toast', async () => {
      const { result } = renderHook(() => useBulkUploadZone());

      const file = new File(['data'], 'test.png', { type: 'image/png' });

      (bulkUploadService.validateFile as jest.Mock).mockReturnValue([
        {
          field: 'type',
          message: 'Only CSV and XLSX files are allowed',
        },
      ]);

      await act(async () => {
        await result.current.addFiles([file]);
      });

      expect(result.current.files).toHaveLength(0);
      expect(mockToast.error).toHaveBeenCalled();
    });

    it('should handle preview generation errors', async () => {
      const { result } = renderHook(() => useBulkUploadZone());

      const file = new File(['malformed'], 'test.csv', { type: 'text/csv' });

      (bulkUploadService.validateFile as jest.Mock).mockReturnValue([]);
      (bulkUploadService.generatePreview as jest.Mock).mockRejectedValue(
        new Error('CSV parsing failed'),
      );

      await act(async () => {
        await result.current.addFiles([file]);
      });

      expect(result.current.files).toHaveLength(0);
      expect(result.current.validationErrors).toHaveLength(1);
      expect(result.current.validationErrors[0].field).toBe('parse');
      expect(mockToast.error).toHaveBeenCalled();
    });

    it('should clear validation errors on successful add', async () => {
      const { result } = renderHook(() => useBulkUploadZone());

      const file = new File(['data'], 'test.csv', { type: 'text/csv' });

      (bulkUploadService.validateFile as jest.Mock).mockReturnValue([]);
      (bulkUploadService.generatePreview as jest.Mock).mockResolvedValue({
        fileName: 'test.csv',
        rowCount: 10,
        columnCount: 3,
        columnNames: ['col1', 'col2', 'col3'],
        previewRows: [],
      });

      await act(async () => {
        await result.current.addFiles([file]);
      });

      expect(result.current.validationErrors).toHaveLength(0);
    });

    it('should add multiple files', async () => {
      const { result } = renderHook(() => useBulkUploadZone());

      const file1 = new File(['data1'], 'test1.csv', { type: 'text/csv' });
      const file2 = new File(['data2'], 'test2.csv', { type: 'text/csv' });

      (bulkUploadService.validateFile as jest.Mock).mockReturnValue([]);
      (bulkUploadService.generatePreview as jest.Mock).mockResolvedValue({
        fileName: 'test.csv',
        rowCount: 10,
        columnCount: 3,
        columnNames: ['col1', 'col2', 'col3'],
        previewRows: [],
      });

      await act(async () => {
        await result.current.addFiles([file1, file2]);
      });

      expect(result.current.files).toHaveLength(2);
    });
  });

  describe('removeFile', () => {
    it('should remove file at specified index', async () => {
      const { result } = renderHook(() => useBulkUploadZone());

      const file1 = new File(['data1'], 'test1.csv', { type: 'text/csv' });
      const file2 = new File(['data2'], 'test2.csv', { type: 'text/csv' });

      (bulkUploadService.validateFile as jest.Mock).mockReturnValue([]);
      (bulkUploadService.generatePreview as jest.Mock).mockResolvedValue({
        fileName: 'test.csv',
        rowCount: 10,
        columnCount: 3,
        columnNames: ['col1', 'col2', 'col3'],
        previewRows: [],
      });

      await act(async () => {
        await result.current.addFiles([file1, file2]);
      });

      act(() => {
        result.current.removeFile(0);
      });

      expect(result.current.files).toHaveLength(1);
      expect(result.current.files[0].file).toBe(file2);
    });
  });

  describe('uploadFile', () => {
    it('should upload a single file successfully', async () => {
      const { result } = renderHook(() => useBulkUploadZone());

      const file = new File(['data'], 'test.csv', { type: 'text/csv' });

      (bulkUploadService.validateFile as jest.Mock).mockReturnValue([]);
      (bulkUploadService.generatePreview as jest.Mock).mockResolvedValue({
        fileName: 'test.csv',
        rowCount: 10,
        columnCount: 3,
        columnNames: ['col1', 'col2', 'col3'],
        previewRows: [],
      });

      await act(async () => {
        await result.current.addFiles([file]);
      });

      (bulkUploadService.uploadBulkFile as jest.Mock).mockResolvedValue({
        success: true,
        data: {
          uploadId: 'upload-123',
          processedCount: 10,
          failedCount: 0,
          uploadedAt: '2024-01-01T00:00:00Z',
        },
      });

      await act(async () => {
        await result.current.uploadFile(0, 'shipments');
      });

      expect(result.current.files[0].uploadStatus).toBe('success');
      expect(result.current.files[0].uploadProgress).toBe(100);
      expect(mockToast.success).toHaveBeenCalled();
    });

    it('should handle upload errors', async () => {
      const { result } = renderHook(() => useBulkUploadZone());

      const file = new File(['data'], 'test.csv', { type: 'text/csv' });

      (bulkUploadService.validateFile as jest.Mock).mockReturnValue([]);
      (bulkUploadService.generatePreview as jest.Mock).mockResolvedValue({
        fileName: 'test.csv',
        rowCount: 10,
        columnCount: 3,
        columnNames: ['col1', 'col2', 'col3'],
        previewRows: [],
      });

      await act(async () => {
        await result.current.addFiles([file]);
      });

      (bulkUploadService.uploadBulkFile as jest.Mock).mockResolvedValue({
        success: false,
        message: 'Upload failed',
      });

      await act(async () => {
        await result.current.uploadFile(0, 'shipments');
      });

      expect(result.current.files[0].uploadStatus).toBe('error');
      expect(result.current.files[0].error).toBe('Upload failed');
      expect(mockToast.error).toHaveBeenCalled();
    });

    it('should handle exception during upload', async () => {
      const { result } = renderHook(() => useBulkUploadZone());

      const file = new File(['data'], 'test.csv', { type: 'text/csv' });

      (bulkUploadService.validateFile as jest.Mock).mockReturnValue([]);
      (bulkUploadService.generatePreview as jest.Mock).mockResolvedValue({
        fileName: 'test.csv',
        rowCount: 10,
        columnCount: 3,
        columnNames: ['col1', 'col2', 'col3'],
        previewRows: [],
      });

      await act(async () => {
        await result.current.addFiles([file]);
      });

      (bulkUploadService.uploadBulkFile as jest.Mock).mockRejectedValue(
        new Error('Network error'),
      );

      await act(async () => {
        await result.current.uploadFile(0, 'shipments');
      });

      expect(result.current.files[0].uploadStatus).toBe('error');
      expect(result.current.files[0].error).toBe('Network error');
      expect(mockToast.error).toHaveBeenCalled();
    });
  });

  describe('uploadAll', () => {
    it('should upload all pending files', async () => {
      const { result } = renderHook(() => useBulkUploadZone());

      const file1 = new File(['data1'], 'test1.csv', { type: 'text/csv' });
      const file2 = new File(['data2'], 'test2.csv', { type: 'text/csv' });

      (bulkUploadService.validateFile as jest.Mock).mockReturnValue([]);
      (bulkUploadService.generatePreview as jest.Mock).mockResolvedValue({
        fileName: 'test.csv',
        rowCount: 10,
        columnCount: 3,
        columnNames: ['col1', 'col2', 'col3'],
        previewRows: [],
      });

      await act(async () => {
        await result.current.addFiles([file1, file2]);
      });

      (bulkUploadService.uploadBulkFile as jest.Mock).mockResolvedValue({
        success: true,
        data: {
          uploadId: 'upload-123',
          processedCount: 10,
          failedCount: 0,
          uploadedAt: '2024-01-01T00:00:00Z',
        },
      });

      await act(async () => {
        await result.current.uploadAll('shipments');
      });

      expect(result.current.files[0].uploadStatus).toBe('success');
      expect(result.current.files[1].uploadStatus).toBe('success');
      expect(bulkUploadService.uploadBulkFile).toHaveBeenCalledTimes(2);
    });

    it('should set isUploading flag during upload', async () => {
      const { result } = renderHook(() => useBulkUploadZone());

      const file = new File(['data'], 'test.csv', { type: 'text/csv' });

      (bulkUploadService.validateFile as jest.Mock).mockReturnValue([]);
      (bulkUploadService.generatePreview as jest.Mock).mockResolvedValue({
        fileName: 'test.csv',
        rowCount: 10,
        columnCount: 3,
        columnNames: ['col1', 'col2', 'col3'],
        previewRows: [],
      });

      await act(async () => {
        await result.current.addFiles([file]);
      });

      (bulkUploadService.uploadBulkFile as jest.Mock).mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({ success: true }), 100)),
      );

      const uploadPromise = act(async () => {
        await result.current.uploadAll('shipments');
      });

      expect(result.current.isUploading).toBe(false); // After awaiting
    });
  });

  describe('clearAll', () => {
    it('should clear all files and errors', async () => {
      const { result } = renderHook(() => useBulkUploadZone());

      const file = new File(['data'], 'test.csv', { type: 'text/csv' });

      (bulkUploadService.validateFile as jest.Mock).mockReturnValue([]);
      (bulkUploadService.generatePreview as jest.Mock).mockResolvedValue({
        fileName: 'test.csv',
        rowCount: 10,
        columnCount: 3,
        columnNames: ['col1', 'col2', 'col3'],
        previewRows: [],
      });

      await act(async () => {
        await result.current.addFiles([file]);
      });

      act(() => {
        result.current.clearAll();
      });

      expect(result.current.files).toHaveLength(0);
      expect(result.current.validationErrors).toHaveLength(0);
    });
  });
});
