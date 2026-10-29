import axios from 'axios';
import { disputeService } from '@/services/disputeService';
import type {
  DisputeCaseResponse,
  EvidenceUploadResponse,
  FreezeResponse,
  DisputeStatusResponse,
  ResolutionResponse,
} from '@/types/dispute';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('disputeService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedAxios.isAxiosError = jest.fn().mockReturnValue(false) as unknown as typeof axios.isAxiosError;
  });

  describe('fileDispute', () => {
    it('posts the dispute params and returns the typed case response', async () => {
      const response: DisputeCaseResponse = {
        caseId: 'case-1',
        deliveryId: 'delivery-1',
        status: 'open',
        escrowFrozen: true,
        createdAt: '2026-01-01T00:00:00.000Z',
      };
      mockedAxios.post.mockResolvedValue({ data: response });

      const result = await disputeService.fileDispute({
        deliveryId: 'delivery-1',
        reason: 'damaged_items',
        description: 'Package arrived crushed',
      });

      expect(result).toEqual(response);
      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.stringContaining('/api/escrow/disputes'),
        {
          deliveryId: 'delivery-1',
          reason: 'damaged_items',
          description: 'Package arrived crushed',
        }
      );
    });

    it('rejects with a normalized APIError on failure', async () => {
      mockedAxios.isAxiosError = jest.fn().mockReturnValue(true) as unknown as typeof axios.isAxiosError;
      mockedAxios.post.mockRejectedValue({
        isAxiosError: true,
        response: { status: 422, data: { message: 'Delivery not eligible for dispute' } },
        message: 'Request failed',
      });

      await expect(
        disputeService.fileDispute({
          deliveryId: 'delivery-1',
          reason: 'other',
          description: 'x',
        })
      ).rejects.toEqual({
        message: 'Delivery not eligible for dispute',
        statusCode: 422,
        code: null,
      });
    });
  });

  describe('uploadEvidence', () => {
    it('uploads files as FormData and returns typed responses', async () => {
      const response: EvidenceUploadResponse[] = [
        {
          fileId: 'file-1',
          filename: 'photo.jpg',
          fileSize: 1024,
          contentType: 'image/jpeg',
          uploadedAt: '2026-01-01T00:00:00.000Z',
        },
      ];
      mockedAxios.post.mockResolvedValue({ data: response });

      const file = new File(['data'], 'photo.jpg', { type: 'image/jpeg' });
      const result = await disputeService.uploadEvidence('case-1', [file]);

      expect(result).toEqual(response);
      const [url, body, config] = mockedAxios.post.mock.calls[0];
      expect(url).toContain('/api/escrow/disputes/case-1/evidence');
      expect(body).toBeInstanceOf(FormData);
      expect(config?.headers?.['Content-Type']).toBe('multipart/form-data');
    });

    it('reports upload progress as a 0-100 percentage', async () => {
      mockedAxios.post.mockImplementation(async (_url, _body, config) => {
        config?.onUploadProgress?.({ loaded: 50, total: 200 } as never);
        return { data: [] };
      });

      const onProgress = jest.fn();
      const file = new File(['data'], 'photo.jpg', { type: 'image/jpeg' });
      await disputeService.uploadEvidence('case-1', [file], onProgress);

      expect(onProgress).toHaveBeenCalledWith(25);
    });

    it('does not call onUploadProgress when total is unknown', async () => {
      mockedAxios.post.mockImplementation(async (_url, _body, config) => {
        config?.onUploadProgress?.({ loaded: 50, total: 0 } as never);
        return { data: [] };
      });

      const onProgress = jest.fn();
      const file = new File(['data'], 'photo.jpg', { type: 'image/jpeg' });
      await disputeService.uploadEvidence('case-1', [file], onProgress);

      expect(onProgress).not.toHaveBeenCalled();
    });

    it('rejects with a normalized APIError on failure', async () => {
      mockedAxios.isAxiosError = jest.fn().mockReturnValue(true) as unknown as typeof axios.isAxiosError;
      mockedAxios.post.mockRejectedValue({
        isAxiosError: true,
        response: { status: 413, data: { message: 'File too large' } },
        message: 'Request failed',
      });

      const file = new File(['data'], 'photo.jpg', { type: 'image/jpeg' });
      await expect(disputeService.uploadEvidence('case-1', [file])).rejects.toEqual({
        message: 'File too large',
        statusCode: 413,
        code: null,
      });
    });
  });

  describe('freezeEscrow', () => {
    it('posts to the freeze endpoint and returns immediate confirmation', async () => {
      const response: FreezeResponse = {
        deliveryId: 'delivery-1',
        frozen: true,
        frozenAt: '2026-01-01T00:00:00.000Z',
      };
      mockedAxios.post.mockResolvedValue({ data: response });

      const result = await disputeService.freezeEscrow('delivery-1');

      expect(result).toEqual(response);
      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.stringContaining('/api/escrow/deliveries/delivery-1/freeze')
      );
    });

    it('rejects with a normalized APIError on failure', async () => {
      mockedAxios.isAxiosError = jest.fn().mockReturnValue(true) as unknown as typeof axios.isAxiosError;
      mockedAxios.post.mockRejectedValue({
        isAxiosError: true,
        response: { status: 409, data: { message: 'Escrow already frozen' } },
        message: 'Request failed',
      });

      await expect(disputeService.freezeEscrow('delivery-1')).rejects.toEqual({
        message: 'Escrow already frozen',
        statusCode: 409,
        code: null,
      });
    });
  });

  describe('getDisputeStatus', () => {
    it('fetches and returns the typed dispute status', async () => {
      const response: DisputeStatusResponse = {
        caseId: 'case-1',
        status: 'under_review',
        escrowFrozen: true,
        evidenceCount: 2,
        updatedAt: '2026-01-01T00:00:00.000Z',
      };
      mockedAxios.get.mockResolvedValue({ data: response });

      const result = await disputeService.getDisputeStatus('case-1');

      expect(result).toEqual(response);
      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.stringContaining('/api/escrow/disputes/case-1')
      );
    });

    it('rejects with a normalized APIError when the case does not exist', async () => {
      mockedAxios.isAxiosError = jest.fn().mockReturnValue(true) as unknown as typeof axios.isAxiosError;
      mockedAxios.get.mockRejectedValue({
        isAxiosError: true,
        response: { status: 404, data: { message: 'Case not found' } },
        message: 'Request failed',
      });

      await expect(disputeService.getDisputeStatus('missing')).rejects.toEqual({
        message: 'Case not found',
        statusCode: 404,
        code: null,
      });
    });
  });

  describe('resolveDispute', () => {
    it('posts to the resolve endpoint and returns the typed resolution', async () => {
      const response: ResolutionResponse = {
        caseId: 'case-1',
        status: 'resolved',
        resolutionNotes: 'Refund issued',
        resolvedAt: '2026-01-01T00:00:00.000Z',
      };
      mockedAxios.post.mockResolvedValue({ data: response });

      const result = await disputeService.resolveDispute('case-1');

      expect(result).toEqual(response);
      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.stringContaining('/api/escrow/disputes/case-1/resolve')
      );
    });

    it('falls back to a generic message when the error has no response body', async () => {
      mockedAxios.isAxiosError = jest.fn().mockReturnValue(true) as unknown as typeof axios.isAxiosError;
      mockedAxios.post.mockRejectedValue({
        isAxiosError: true,
        message: 'Network Error',
      });

      await expect(disputeService.resolveDispute('case-1')).rejects.toEqual({
        message: 'Network Error',
        statusCode: null,
        code: null,
      });
    });

    it('normalizes a non-axios error thrown during the request', async () => {
      mockedAxios.post.mockRejectedValue(new Error('boom'));

      await expect(disputeService.resolveDispute('case-1')).rejects.toEqual({
        message: 'boom',
        statusCode: null,
        code: null,
      });
    });
  });
});
