import { AxiosError, AxiosHeaders } from 'axios';
import { apiClient } from '@/services/api';
import {
  escrowSettlementService,
  SettlementServiceError,
} from '@/services/escrowSettlementService';
import {
  ESCROW_ID,
  confirmedSettlementResponse,
} from '@/hooks/__tests__/fixtures/settlementApiResponses';

jest.mock('@/services/api', () => ({
  apiClient: { get: jest.fn() },
}));

const mockGet = apiClient.get as jest.MockedFunction<typeof apiClient.get>;

function axiosErrorWith(status: number, data?: unknown): AxiosError {
  const headers = new AxiosHeaders();
  return new AxiosError('Request failed', 'ERR_BAD_RESPONSE', { headers }, null, {
    status,
    statusText: '',
    headers: {},
    config: { headers },
    data,
  });
}

describe('escrowSettlementService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getSettlement', () => {
    it('requests the settlement endpoint for the escrow', async () => {
      mockGet.mockResolvedValue({ data: confirmedSettlementResponse });
      const controller = new AbortController();

      const result = await escrowSettlementService.getSettlement(ESCROW_ID, controller.signal);

      expect(mockGet).toHaveBeenCalledWith(`/escrow/${ESCROW_ID}/settlement`, {
        signal: controller.signal,
      });
      expect(result).toEqual(confirmedSettlementResponse);
    });

    it('encodes the escrow id in the path', async () => {
      mockGet.mockResolvedValue({ data: confirmedSettlementResponse });

      await escrowSettlementService.getSettlement('esc/1 2');

      expect(mockGet).toHaveBeenCalledWith('/escrow/esc%2F1%202/settlement', {
        signal: undefined,
      });
    });

    it('uses the backend error message when provided', async () => {
      mockGet.mockRejectedValue(axiosErrorWith(422, { message: 'Escrow not yet released' }));

      await expect(escrowSettlementService.getSettlement(ESCROW_ID)).rejects.toEqual(
        expect.objectContaining({ message: 'Escrow not yet released', status: 422 }),
      );
    });

    it('maps 404 responses to a not-found error', async () => {
      mockGet.mockRejectedValue(axiosErrorWith(404));

      const error = await escrowSettlementService.getSettlement(ESCROW_ID).catch((e) => e);

      expect(error).toBeInstanceOf(SettlementServiceError);
      expect(error.message).toBe('Settlement not found for this escrow.');
      expect(error.status).toBe(404);
    });

    it('maps other failures to a generic error', async () => {
      mockGet.mockRejectedValue(axiosErrorWith(500));

      await expect(escrowSettlementService.getSettlement(ESCROW_ID)).rejects.toEqual(
        expect.objectContaining({
          message: 'Unable to load settlement details. Please try again.',
          status: 500,
        }),
      );
    });

    it('wraps non-axios errors', async () => {
      mockGet.mockRejectedValue(new Error('Network down'));

      await expect(escrowSettlementService.getSettlement(ESCROW_ID)).rejects.toEqual(
        expect.objectContaining({ message: 'Network down', status: null }),
      );
    });
  });

  describe('isTerminalStatus', () => {
    it.each([
      ['confirmed', true],
      ['failed', true],
      ['pending', false],
      ['finalizing', false],
    ] as const)('treats %s as terminal=%s', (status, expected) => {
      expect(escrowSettlementService.isTerminalStatus(status)).toBe(expected);
    });
  });
});
