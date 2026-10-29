import api from '@/lib/api';
import { escrowPayoutService } from '@/services/escrowPayoutService';

jest.mock('@/lib/api', () => ({
  __esModule: true,
  default: { get: jest.fn() },
}));

const mockGet = api.get as jest.Mock;

describe('escrowPayoutService.getPayoutFeeQuote', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('reads the payout quote endpoint and returns the quote', async () => {
    const quote = {
      escrowAmount: 1000,
      currency: 'XLM',
      platformFeePercent: 2.5,
      estimatedGasFee: 0.5,
    };
    mockGet.mockResolvedValue({ data: { success: true, data: quote } });

    await expect(escrowPayoutService.getPayoutFeeQuote('C123/abc')).resolves.toEqual(quote);
    expect(mockGet).toHaveBeenCalledWith('/escrow/C123%2Fabc/payout-quote');
  });

  it('throws the backend message for an unsuccessful response', async () => {
    mockGet.mockResolvedValue({ data: { success: false, message: 'Escrow not found' } });

    await expect(escrowPayoutService.getPayoutFeeQuote('C123')).rejects.toThrow('Escrow not found');
  });

  it('throws a default message when the response has no data', async () => {
    mockGet.mockResolvedValue({ data: { success: true } });

    await expect(escrowPayoutService.getPayoutFeeQuote('C123')).rejects.toThrow(
      'Failed to load payout fees',
    );
  });

  it('propagates transport errors', async () => {
    mockGet.mockRejectedValue(new Error('Network Error'));

    await expect(escrowPayoutService.getPayoutFeeQuote('C123')).rejects.toThrow('Network Error');
  });
});
