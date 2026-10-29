import axios from 'axios';
import {
  customsService,
  APIError,
  normalizeAPIError,
  type UploadDocumentParams,
  type DocumentUploadResponse,
  type DocumentListResponse,
  type UpdateResponse,
  type ExpiringDocumentList,
} from '@/services/customsService';
import type { CustomsDocument } from '@/types/customsDocumentation';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

function makeDocument(overrides: Partial<CustomsDocument> = {}): CustomsDocument {
  return {
    id: 'doc_101',
    shipmentId: 'SH-8821',
    type: 'commercial_invoice',
    filename: 'invoice-8821.pdf',
    fileSize: 102400,
    mimeType: 'application/pdf',
    status: 'pending',
    issuedAt: '2026-03-01T10:00:00Z',
    expiresAt: '2026-09-01T10:00:00Z',
    uploadedAt: '2026-03-01T10:05:00Z',
    ...overrides,
  };
}

const MOCK_DOC = makeDocument();

describe('customsService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedAxios.isAxiosError.mockImplementation(
      (err: any): err is any => Boolean(err?.isAxiosError)
    );
  });

  describe('uploadDocument', () => {
    it('uploads a document with UploadDocumentParams and returns DocumentUploadResponse', async () => {
      const mockResponse: DocumentUploadResponse = {
        success: true,
        message: 'Document uploaded successfully',
        data: MOCK_DOC,
      };

      mockedAxios.post.mockResolvedValueOnce({
        status: 201,
        data: mockResponse,
      });

      const onProgress = jest.fn();
      const mockFile = new File(['mock content'], 'invoice-8821.pdf', {
        type: 'application/pdf',
      });

      const params: UploadDocumentParams = {
        file: mockFile,
        shipmentId: 'SH-8821',
        documentType: 'commercial_invoice',
        issuedAt: '2026-03-01T10:00:00Z',
        expiresAt: '2026-09-01T10:00:00Z',
        onUploadProgress: onProgress,
      };

      const result = await customsService.uploadDocument(params);

      expect(result).toEqual(mockResponse);
      expect(mockedAxios.post).toHaveBeenCalledTimes(1);

      const [url, formData, config] = mockedAxios.post.mock.calls[0];
      expect(url).toContain('/api/shipments/customs-documents');
      expect(formData).toBeInstanceOf(FormData);
      expect(config?.headers).toEqual({ 'Content-Type': 'multipart/form-data' });
      expect(config?.onUploadProgress).toBe(onProgress);
    });

    it('supports onUploadProgress tracking with FormData passed directly', async () => {
      const mockResponse: DocumentUploadResponse = {
        success: true,
        message: 'Uploaded',
        data: MOCK_DOC,
      };

      mockedAxios.post.mockResolvedValueOnce({
        status: 200,
        data: mockResponse,
      });

      const formData = new FormData();
      formData.append('document', new Blob(['data']));
      const onProgress = jest.fn();

      const result = await customsService.uploadDocument(formData, onProgress);

      expect(result).toEqual(mockResponse);
      const [, , config] = mockedAxios.post.mock.calls[0];
      expect(config?.onUploadProgress).toBe(onProgress);
    });

    it('forwards AbortSignal when provided in params', async () => {
      mockedAxios.post.mockResolvedValueOnce({
        status: 200,
        data: { success: true, message: 'ok', data: MOCK_DOC },
      });

      const controller = new AbortController();
      const params: UploadDocumentParams = {
        file: new File(['content'], 'test.pdf'),
        shipmentId: 'SH-8821',
        signal: controller.signal,
      };

      await customsService.uploadDocument(params);

      const [, , config] = mockedAxios.post.mock.calls[0];
      expect(config?.signal).toBe(controller.signal);
    });

    it('throws APIError if file is missing in params', async () => {
      const params = {
        shipmentId: 'SH-8821',
      } as unknown as UploadDocumentParams;

      await expect(customsService.uploadDocument(params)).rejects.toThrow(APIError);
      await expect(customsService.uploadDocument(params)).rejects.toThrow(
        'No document file provided for upload'
      );
    });

    it('throws APIError if shipmentId is missing in params', async () => {
      const params: UploadDocumentParams = {
        file: new File(['content'], 'test.pdf'),
        shipmentId: '',
      };

      await expect(customsService.uploadDocument(params)).rejects.toThrow(APIError);
      await expect(customsService.uploadDocument(params)).rejects.toThrow(
        'Shipment ID is required for document upload'
      );
    });

    it('normalizes Axios error response into APIError', async () => {
      const axiosError = {
        isAxiosError: true,
        name: 'AxiosError',
        message: 'Request failed with status code 422',
        code: 'ERR_BAD_REQUEST',
        response: {
          status: 422,
          data: {
            message: 'Invalid customs document type',
          },
        },
      };

      mockedAxios.post.mockRejectedValueOnce(axiosError);

      try {
        await customsService.uploadDocument({
          file: new File([''], 'doc.pdf'),
          shipmentId: 'SH-8821',
        });
        fail('Expected uploadDocument to throw');
      } catch (err) {
        expect(err).toBeInstanceOf(APIError);
        const apiError = err as APIError;
        expect(apiError.message).toBe('Invalid customs document type');
        expect(apiError.status).toBe(422);
        expect(apiError.code).toBe('ERR_BAD_REQUEST');
      }
    });
  });

  describe('getDocuments', () => {
    it('retrieves documents for a shipment and returns DocumentListResponse', async () => {
      const mockResponse: DocumentListResponse = {
        success: true,
        message: 'Documents retrieved successfully',
        data: [MOCK_DOC],
        total: 1,
      };

      mockedAxios.get.mockResolvedValueOnce({
        status: 200,
        data: mockResponse,
      });

      const result = await customsService.getDocuments('SH-8821');

      expect(result).toEqual(mockResponse);
      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.stringContaining('/api/shipments/customs-documents'),
        {
          params: { shipmentId: 'SH-8821' },
          signal: undefined,
        }
      );
    });

    it('forwards AbortSignal if provided', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        status: 200,
        data: { success: true, message: 'ok', data: [] },
      });

      const controller = new AbortController();
      await customsService.getDocuments('SH-8821', controller.signal);

      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ signal: controller.signal })
      );
    });

    it('throws APIError if shipmentId is not provided', async () => {
      await expect(customsService.getDocuments('')).rejects.toThrow(APIError);
      await expect(customsService.getDocuments('')).rejects.toThrow(
        'Valid shipment ID is required'
      );
    });

    it('normalizes 404 response into APIError', async () => {
      const notFoundError = {
        isAxiosError: true,
        name: 'AxiosError',
        response: {
          status: 404,
          data: {
            message: 'Shipment not found',
          },
        },
      };

      mockedAxios.get.mockRejectedValueOnce(notFoundError);

      try {
        await customsService.getDocuments('SH-9999');
        fail('Expected getDocuments to throw');
      } catch (err) {
        expect(err).toBeInstanceOf(APIError);
        const apiError = err as APIError;
        expect(apiError.message).toBe('Shipment not found');
        expect(apiError.status).toBe(404);
      }
    });
  });

  describe('updateDocumentStatus', () => {
    it('sends PATCH request to update document status and returns UpdateResponse', async () => {
      const updatedDoc: CustomsDocument = {
        ...MOCK_DOC,
        status: 'verified',
      };

      const mockResponse: UpdateResponse = {
        success: true,
        message: 'Document status updated',
        data: updatedDoc,
      };

      mockedAxios.patch.mockResolvedValueOnce({
        status: 200,
        data: mockResponse,
      });

      const result = await customsService.updateDocumentStatus('doc_101', 'verified');

      expect(result).toEqual(mockResponse);
      expect(mockedAxios.patch).toHaveBeenCalledWith(
        expect.stringContaining('/api/shipments/customs-documents/doc_101/status'),
        { status: 'verified' },
        { signal: undefined }
      );
    });

    it('throws APIError if docId or status is invalid', async () => {
      await expect(customsService.updateDocumentStatus('', 'verified')).rejects.toThrow(
        'Valid document ID is required'
      );
      await expect(customsService.updateDocumentStatus('doc_1', '')).rejects.toThrow(
        'Valid document status is required'
      );
    });

    it('normalizes error on update failure', async () => {
      mockedAxios.patch.mockRejectedValueOnce({
        isAxiosError: true,
        response: {
          status: 400,
          data: { error: 'Invalid document status transition' },
        },
      });

      try {
        await customsService.updateDocumentStatus('doc_101', 'rejected');
        fail('Expected updateDocumentStatus to throw');
      } catch (err) {
        expect(err).toBeInstanceOf(APIError);
        expect((err as APIError).message).toBe('Invalid document status transition');
        expect((err as APIError).status).toBe(400);
      }
    });
  });

  describe('getExpiringDocuments', () => {
    it('retrieves expiring documents with default threshold of 30 days', async () => {
      const mockResponse: ExpiringDocumentList = {
        success: true,
        message: 'Expiring documents retrieved',
        data: [MOCK_DOC],
        thresholdDays: 30,
        total: 1,
      };

      mockedAxios.get.mockResolvedValueOnce({
        status: 200,
        data: mockResponse,
      });

      const result = await customsService.getExpiringDocuments();

      expect(result).toEqual(mockResponse);
      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.stringContaining('/api/shipments/customs-documents/expiring'),
        {
          params: { thresholdDays: 30 },
          signal: undefined,
        }
      );
    });

    it('retrieves expiring documents with custom thresholdDays', async () => {
      const mockResponse: ExpiringDocumentList = {
        success: true,
        message: 'Expiring documents retrieved',
        data: [MOCK_DOC],
        thresholdDays: 7,
        total: 1,
      };

      mockedAxios.get.mockResolvedValueOnce({
        status: 200,
        data: mockResponse,
      });

      const result = await customsService.getExpiringDocuments(7);

      expect(result.thresholdDays).toBe(7);
      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.stringContaining('/api/shipments/customs-documents/expiring'),
        {
          params: { thresholdDays: 7 },
          signal: undefined,
        }
      );
    });

    it('normalizes network errors into APIError', async () => {
      mockedAxios.get.mockRejectedValueOnce(new Error('Network Connection Lost'));

      try {
        await customsService.getExpiringDocuments(14);
        fail('Expected getExpiringDocuments to throw');
      } catch (err) {
        expect(err).toBeInstanceOf(APIError);
        expect((err as APIError).message).toBe('Network Connection Lost');
        expect((err as APIError).status).toBe(0);
      }
    });
  });

  describe('normalizeAPIError', () => {
    it('returns an existing APIError untouched', () => {
      const original = new APIError('Existing error', 403, 'FORBIDDEN');
      const normalized = normalizeAPIError(original);

      expect(normalized).toBe(original);
      expect(normalized.status).toBe(403);
      expect(normalized.code).toBe('FORBIDDEN');
    });

    it('extracts message and status from Axios error with data.message', () => {
      const axiosError = {
        isAxiosError: true,
        message: 'Axios raw message',
        code: 'ERR_NETWORK',
        response: {
          status: 500,
          data: { message: 'Internal Server Error' },
        },
      };

      const normalized = normalizeAPIError(axiosError);
      expect(normalized).toBeInstanceOf(APIError);
      expect(normalized.message).toBe('Internal Server Error');
      expect(normalized.status).toBe(500);
      expect(normalized.code).toBe('ERR_NETWORK');
    });

    it('extracts error string from Axios error with data.error', () => {
      const axiosError = {
        isAxiosError: true,
        response: {
          status: 401,
          data: { error: 'Unauthorized token expired' },
        },
      };

      const normalized = normalizeAPIError(axiosError);
      expect(normalized.message).toBe('Unauthorized token expired');
      expect(normalized.status).toBe(401);
    });

    it('falls back to default message when error is non-Error object', () => {
      const normalized = normalizeAPIError('something went wrong', 'Fallback message');
      expect(normalized.message).toBe('Fallback message');
      expect(normalized.status).toBe(0);
    });
  });
});
