import axios from 'axios';
import { customsDocsService } from '@/services/customsDocsService';
import type { CustomsDocument } from '@/types/customsDocumentation';

jest.mock('axios');

const mockedAxios = axios as jest.Mocked<typeof axios>;

function makeDocument(overrides: Partial<CustomsDocument> = {}): CustomsDocument {
  return {
    id: 'doc_1',
    shipmentId: 'SW-1042',
    type: 'commercial_invoice',
    filename: 'commercial-invoice.pdf',
    fileSize: 204_800,
    mimeType: 'application/pdf',
    status: 'verified',
    issuedAt: '2026-01-01T00:00:00.000Z',
    expiresAt: '2026-09-01T00:00:00.000Z',
    uploadedAt: '2026-02-01T00:00:00.000Z',
    ...overrides,
  };
}

const INVOICE = makeDocument();

describe('customsDocsService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('listDocuments', () => {
    it('returns the document array from a successful response', async () => {
      mockedAxios.get.mockResolvedValue({
        data: { success: true, message: 'ok', data: [INVOICE] },
      });

      const result = await customsDocsService.listDocuments();

      expect(result).toEqual([INVOICE]);
      expect(mockedAxios.get).toHaveBeenCalledWith(
        '/api/shipments/customs-documents',
        { params: undefined, signal: undefined }
      );
    });

    it('scopes the request to a shipment id when provided', async () => {
      mockedAxios.get.mockResolvedValue({
        data: { success: true, message: 'ok', data: [] },
      });

      await customsDocsService.listDocuments({ shipmentId: 'SW-1042' });

      expect(mockedAxios.get).toHaveBeenCalledWith(
        '/api/shipments/customs-documents',
        { params: { shipmentId: 'SW-1042' }, signal: undefined }
      );
    });

    it('throws the API message when the response is not successful', async () => {
      mockedAxios.get.mockResolvedValue({
        data: { success: false, message: 'Shipment not found' },
      });

      await expect(customsDocsService.listDocuments()).rejects.toThrow(
        'Shipment not found'
      );
    });

    it('throws a default message when the API omits one', async () => {
      mockedAxios.get.mockResolvedValue({ data: { success: false } });

      await expect(customsDocsService.listDocuments()).rejects.toThrow(
        'Failed to load documents'
      );
    });

    it('propagates network errors', async () => {
      mockedAxios.get.mockRejectedValue(new Error('Network down'));

      await expect(customsDocsService.listDocuments()).rejects.toThrow(
        'Network down'
      );
    });
  });

  describe('uploadDocument', () => {
    it('sends multipart form data and returns the created document', async () => {
      mockedAxios.post.mockResolvedValue({
        data: { success: true, message: 'ok', data: INVOICE },
      });

      const formData = new FormData();
      formData.append('document', new File(['x'], 'x.pdf'));
      formData.append('documentType', 'commercial_invoice');

      const onProgress = jest.fn();
      const result = await customsDocsService.uploadDocument(
        formData,
        onProgress
      );

      expect(result).toEqual(INVOICE);
      expect(mockedAxios.post).toHaveBeenCalledWith(
        '/api/shipments/customs-documents',
        formData,
        {
          headers: { 'Content-Type': 'multipart/form-data' },
          onUploadProgress: onProgress,
        }
      );
    });

    it('throws the API message when the upload is rejected', async () => {
      mockedAxios.post.mockResolvedValue({
        data: { success: false, message: 'Unsupported file type' },
      });

      await expect(
        customsDocsService.uploadDocument(new FormData())
      ).rejects.toThrow('Unsupported file type');
    });

    it('throws a default message when the upload omits one', async () => {
      mockedAxios.post.mockResolvedValue({ data: { success: false } });

      await expect(
        customsDocsService.uploadDocument(new FormData())
      ).rejects.toThrow('Upload failed');
    });
  });

  describe('deleteDocument', () => {
    it('calls the delete endpoint for the given id', async () => {
      mockedAxios.delete.mockResolvedValue({ data: {} });

      await customsDocsService.deleteDocument('doc_1');

      expect(mockedAxios.delete).toHaveBeenCalledWith(
        '/api/shipments/customs-documents/doc_1'
      );
    });

    it('propagates delete failures', async () => {
      mockedAxios.delete.mockRejectedValue(new Error('Forbidden'));

      await expect(customsDocsService.deleteDocument('doc_1')).rejects.toThrow(
        'Forbidden'
      );
    });
  });
});
