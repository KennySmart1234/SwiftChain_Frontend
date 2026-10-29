import { AxiosError, AxiosHeaders } from 'axios';
import api from '@/lib/api';
import { withdrawalService } from '@/services/withdrawalService';
import {
  VALID_DESTINATION,
  testnetQuoteFixture,
  withdrawalReceiptFixture,
} from '@/hooks/__tests__/fixtures/withdrawalApiResponses';

jest.mock('@/lib/api', () => ({
  __esModule: true,
  default: { get: jest.fn(), post: jest.fn() },
}));

const mockGet = api.get as jest.Mock;
const mockPost = api.post as jest.Mock;

describe('withdrawalService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getQuote', () => {
    it('requests a quote for the selected network', async () => {
      mockGet.mockResolvedValue({ data: { success: true, data: testnetQuoteFixture } });

      await expect(withdrawalService.getQuote('testnet')).resolves.toEqual(testnetQuoteFixture);
      expect(mockGet).toHaveBeenCalledWith('/wallet/withdrawals/quote', {
        params: { network: 'testnet' },
        signal: undefined,
      });
    });

    it('throws the API message for an unsuccessful response', async () => {
      mockGet.mockResolvedValue({ data: { success: false, message: 'Rates unavailable' } });

      await expect(withdrawalService.getQuote('public')).rejects.toThrow('Rates unavailable');
    });
  });

  describe('submitWithdrawal', () => {
    const request = {
      quoteId: 'quote-testnet-1',
      network: 'testnet' as const,
      destination: `  ${VALID_DESTINATION} `,
      amount: 100,
    };

    it('posts the withdrawal with a trimmed destination', async () => {
      mockPost.mockResolvedValue({ data: { success: true, data: withdrawalReceiptFixture } });

      await expect(withdrawalService.submitWithdrawal(request)).resolves.toEqual(
        withdrawalReceiptFixture,
      );
      expect(mockPost).toHaveBeenCalledWith('/wallet/withdrawals', {
        ...request,
        destination: VALID_DESTINATION,
      });
    });

    it('surfaces the server error message', async () => {
      const headers = new AxiosHeaders();
      mockPost.mockRejectedValue(
        new AxiosError('Request failed', 'ERR_BAD_REQUEST', { headers }, null, {
          status: 409,
          statusText: 'Conflict',
          headers,
          config: { headers },
          data: { message: 'Quote expired, please review the new fee' },
        }),
      );

      await expect(withdrawalService.submitWithdrawal(request)).rejects.toThrow(
        'Quote expired, please review the new fee',
      );
    });

    it('falls back to a readable message', async () => {
      const headers = new AxiosHeaders();
      mockPost.mockRejectedValue(new AxiosError('timeout', 'ECONNABORTED', { headers }));

      await expect(withdrawalService.submitWithdrawal(request)).rejects.toThrow(
        'Withdrawal failed. Please try again.',
      );
    });
  });
});
