import api from '@/lib/api';
import { socketService } from '@/lib/websocket';
import {
  driverEarningsService,
  EARNINGS_UPDATED_EVENT,
  formatXlm,
  isValidStellarAddress,
} from '@/services/driverEarningsService';

jest.mock('@/lib/api', () => ({
  __esModule: true,
  default: { get: jest.fn(), post: jest.fn() },
}));

jest.mock('@/lib/websocket', () => ({
  socketService: { socket: null },
}));

const mockedApi = api as jest.Mocked<typeof api>;
const VALID_ADDRESS = `G${'A'.repeat(55)}`;

describe('driverEarningsService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    socketService.socket = null;
  });

  it('GETs the earnings summary', async () => {
    const summary = {
      availableXlm: 120,
      pendingEscrowXlm: 40,
      lifetimeEarningsXlm: 900,
      pendingEscrowCount: 2,
      updatedAt: '2026-09-29T10:00:00Z',
    };
    mockedApi.get.mockResolvedValueOnce({ data: summary });

    await expect(driverEarningsService.getSummary()).resolves.toEqual(summary);
    expect(mockedApi.get).toHaveBeenCalledWith('/driver/earnings/summary');
  });

  it('GETs payouts with a limit and unwraps the list', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: { payouts: [] } });

    await expect(driverEarningsService.getPayouts(5)).resolves.toEqual([]);
    expect(mockedApi.get).toHaveBeenCalledWith('/driver/earnings/payouts', { params: { limit: 5 } });
  });

  it('POSTs a withdrawal with a trimmed destination', async () => {
    const payout = { id: 'p1', amountXlm: 10, destination: VALID_ADDRESS, status: 'pending', createdAt: '' };
    mockedApi.post.mockResolvedValueOnce({ data: { payout } });

    await expect(
      driverEarningsService.requestWithdrawal({ amountXlm: 10, destination: `  ${VALID_ADDRESS} ` }),
    ).resolves.toEqual(payout);
    expect(mockedApi.post).toHaveBeenCalledWith('/driver/earnings/withdrawals', {
      amountXlm: 10,
      destination: VALID_ADDRESS,
    });
  });

  it('propagates API errors', async () => {
    mockedApi.get.mockRejectedValueOnce(new Error('Network Error'));
    await expect(driverEarningsService.getSummary()).rejects.toThrow('Network Error');
  });

  describe('validateWithdrawal', () => {
    it.each([0, -5, NaN])('rejects a non-positive amount (%p)', (amount) => {
      expect(driverEarningsService.validateWithdrawal(amount, 100, VALID_ADDRESS)).toEqual({
        isValid: false,
        error: 'Enter an amount greater than 0.',
      });
    });

    it('rejects an amount above the available balance', () => {
      const result = driverEarningsService.validateWithdrawal(100.5, 100, VALID_ADDRESS);
      expect(result.isValid).toBe(false);
      expect(result.error).toMatch(/Insufficient balance/);
    });

    it('rejects an invalid Stellar address', () => {
      const result = driverEarningsService.validateWithdrawal(10, 100, 'not-an-address');
      expect(result.isValid).toBe(false);
      expect(result.error).toMatch(/Stellar public key/);
    });

    it('accepts a withdrawal of the full available balance', () => {
      expect(driverEarningsService.validateWithdrawal(100, 100, VALID_ADDRESS)).toEqual({
        isValid: true,
        error: null,
      });
    });
  });

  describe('subscribeToUpdates', () => {
    it('is a no-op without a connected socket', () => {
      const unsubscribe = driverEarningsService.subscribeToUpdates(jest.fn());
      expect(() => unsubscribe()).not.toThrow();
    });

    it('registers and removes the earnings listener', () => {
      const socket = { on: jest.fn(), off: jest.fn() };
      socketService.socket = socket as unknown as typeof socketService.socket;
      const handler = jest.fn();

      const unsubscribe = driverEarningsService.subscribeToUpdates(handler);
      expect(socket.on).toHaveBeenCalledWith(EARNINGS_UPDATED_EVENT, handler);

      unsubscribe();
      expect(socket.off).toHaveBeenCalledWith(EARNINGS_UPDATED_EVENT, handler);
    });
  });

  it('isValidStellarAddress checks the G-prefixed base32 format', () => {
    expect(isValidStellarAddress(VALID_ADDRESS)).toBe(true);
    expect(isValidStellarAddress(`S${'A'.repeat(55)}`)).toBe(false);
    expect(isValidStellarAddress(`G${'A'.repeat(54)}`)).toBe(false);
  });

  it('formatXlm renders at least two decimals', () => {
    expect(formatXlm(1234.5)).toBe('1,234.50 XLM');
  });
});
