import { AxiosError, AxiosHeaders } from 'axios';
import api from '@/lib/api';
import { earningsService, EarningsServiceError } from '@/services/earningsService';
import {
  earningsSummaryFixture,
  payoutPageOneFixture,
} from '@/hooks/__tests__/fixtures/earningsApiResponses';

jest.mock('@/lib/api', () => ({
  __esModule: true,
  default: { get: jest.fn() },
}));

const mockGet = api.get as jest.Mock;

function axiosErrorWith(status: number, message: string): AxiosError {
  const headers = new AxiosHeaders();
  return new AxiosError('Request failed', 'ERR_BAD_RESPONSE', { headers }, null, {
    status,
    statusText: 'Error',
    headers,
    config: { headers },
    data: { message },
  });
}

describe('earningsService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getEarningsSummary', () => {
    it('reads the wallet earnings endpoint and unwraps the envelope', async () => {
      mockGet.mockResolvedValue({ data: { success: true, data: earningsSummaryFixture } });

      await expect(earningsService.getEarningsSummary()).resolves.toEqual(earningsSummaryFixture);
      expect(mockGet).toHaveBeenCalledWith('/wallet/earnings', { signal: undefined });
    });

    it('throws the API message when the response is unsuccessful', async () => {
      mockGet.mockResolvedValue({ data: { success: false, message: 'Wallet not linked' } });

      await expect(earningsService.getEarningsSummary()).rejects.toThrow('Wallet not linked');
    });

    it('maps transport errors to EarningsServiceError with the HTTP status', async () => {
      mockGet.mockRejectedValue(axiosErrorWith(503, 'Wallet API unavailable'));

      const error = await earningsService.getEarningsSummary().catch((e: unknown) => e);

      expect(error).toBeInstanceOf(EarningsServiceError);
      expect(error).toMatchObject({ message: 'Wallet API unavailable', status: 503 });
    });
  });

  describe('getPayoutHistory', () => {
    it('requests the first page without a cursor', async () => {
      mockGet.mockResolvedValue({ data: { success: true, data: payoutPageOneFixture } });

      await expect(earningsService.getPayoutHistory()).resolves.toEqual(payoutPageOneFixture);
      expect(mockGet).toHaveBeenCalledWith('/wallet/earnings/payouts', {
        params: { limit: 10 },
        signal: undefined,
      });
    });

    it('forwards the cursor and page size for later pages', async () => {
      mockGet.mockResolvedValue({ data: { success: true, data: payoutPageOneFixture } });

      await earningsService.getPayoutHistory({ cursor: 'cursor-page-2', limit: 25 });

      expect(mockGet).toHaveBeenCalledWith('/wallet/earnings/payouts', {
        params: { cursor: 'cursor-page-2', limit: 25 },
        signal: undefined,
      });
    });

    it('normalises a page with missing fields', async () => {
      mockGet.mockResolvedValue({ data: { success: true, data: {} } });

      await expect(earningsService.getPayoutHistory()).resolves.toEqual({
        items: [],
        nextCursor: null,
      });
    });

    it('falls back to a readable message on network failure', async () => {
      mockGet.mockRejectedValue(new Error('Network Error'));

      await expect(earningsService.getPayoutHistory()).rejects.toThrow('Network Error');
    });
  });
});
