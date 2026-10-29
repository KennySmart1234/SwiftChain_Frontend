import { AxiosError, AxiosHeaders } from 'axios';
import api from '@/lib/api';
import {
  driverWalletService,
  DriverWalletServiceError,
  normalizeDriverWalletError,
} from '@/services/driverWalletService';
import type {
  EarningsSummary,
  PaginatedResponse,
  PayoutRecord,
  WithdrawalParams,
  WithdrawalResponse,
  WithdrawalStatus,
} from '@/types/driverWallet';

jest.mock('@/lib/api', () => ({
  __esModule: true,
  default: { get: jest.fn(), post: jest.fn() },
}));

const mockGet = api.get as jest.Mock;
const mockPost = api.post as jest.Mock;

const DRIVER_ID = 'driver-42';
const DESTINATION = 'GACV3JHPXU7CKKYIRSTNLPFVFWGCAYDGBVNFNFJDG5BFCPJV7ZRKJSGN';

function httpError(status: number, data?: unknown, code?: string): AxiosError {
  const config = { headers: new AxiosHeaders() };
  return new AxiosError('Request failed', code, config, {}, {
    status,
    statusText: '',
    headers: {},
    config,
    data,
  });
}

async function captureError(promise: Promise<unknown>): Promise<DriverWalletServiceError> {
  try {
    await promise;
  } catch (error) {
    return error as DriverWalletServiceError;
  }
  throw new Error('Expected the promise to reject');
}

describe('driverWalletService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getEarningsSummary', () => {
    const summary: EarningsSummary = {
      driverId: DRIVER_ID,
      currency: 'XLM',
      totalEarned: 1520.5,
      availableBalance: 820.5,
      pendingBalance: 200,
      totalWithdrawn: 500,
      completedDeliveries: 18,
      updatedAt: '2026-09-01T10:00:00.000Z',
    };

    it('reads the driver earnings endpoint and unwraps the payload', async () => {
      mockGet.mockResolvedValue({ data: { success: true, data: summary } });

      await expect(driverWalletService.getEarningsSummary(DRIVER_ID)).resolves.toEqual(summary);
      expect(mockGet).toHaveBeenCalledWith(`/drivers/${DRIVER_ID}/wallet/earnings`);
    });

    it('encodes the driver id in the URL', async () => {
      mockGet.mockResolvedValue({ data: { success: true, data: summary } });

      await driverWalletService.getEarningsSummary('driver/1');

      expect(mockGet).toHaveBeenCalledWith('/drivers/driver%2F1/wallet/earnings');
    });

    it('rejects a blank driver id without calling the API', async () => {
      const error = await captureError(driverWalletService.getEarningsSummary('  '));

      expect(error).toBeInstanceOf(DriverWalletServiceError);
      expect(error.code).toBe('VALIDATION_ERROR');
      expect(mockGet).not.toHaveBeenCalled();
    });

    it('turns an unsuccessful envelope into a typed error', async () => {
      mockGet.mockResolvedValue({ data: { success: false, message: 'Driver not onboarded' } });

      const error = await captureError(driverWalletService.getEarningsSummary(DRIVER_ID));

      expect(error.code).toBe('API_ERROR');
      expect(error.message).toBe('Driver not onboarded');
    });
  });

  describe('getPayoutHistory', () => {
    const page: PaginatedResponse<PayoutRecord> = {
      items: [
        {
          id: 'payout-1',
          deliveryId: 'delivery-1',
          amount: 120,
          currency: 'XLM',
          status: 'completed',
          transactionHash: 'abc123',
          createdAt: '2026-09-01T10:00:00.000Z',
          completedAt: '2026-09-01T10:01:00.000Z',
        },
      ],
      pagination: { page: 2, limit: 10, total: 11, totalPages: 2 },
    };

    it('passes pagination and filter options as query params', async () => {
      mockGet.mockResolvedValue({ data: { success: true, data: page } });

      const result = await driverWalletService.getPayoutHistory(DRIVER_ID, {
        page: 2,
        limit: 10,
        status: 'completed',
        from: '2026-08-01',
        to: '2026-09-01',
      });

      expect(result).toEqual(page);
      expect(mockGet).toHaveBeenCalledWith(`/drivers/${DRIVER_ID}/wallet/payouts`, {
        params: { page: 2, limit: 10, status: 'completed', from: '2026-08-01', to: '2026-09-01' },
      });
    });

    it('defaults to the first page of 20 items', async () => {
      mockGet.mockResolvedValue({ data: { success: true, data: page } });

      await driverWalletService.getPayoutHistory(DRIVER_ID);

      expect(mockGet).toHaveBeenCalledWith(`/drivers/${DRIVER_ID}/wallet/payouts`, {
        params: { page: 1, limit: 20, status: undefined, from: undefined, to: undefined },
      });
    });
  });

  describe('requestWithdrawal', () => {
    const params: WithdrawalParams = {
      amount: 250,
      currency: 'XLM',
      destinationAddress: DESTINATION,
      memo: 'payout-sept',
    };

    const response: WithdrawalResponse = {
      withdrawalId: 'wd-1',
      status: 'pending',
      amount: 250,
      currency: 'XLM',
      fee: 0.00001,
      destinationAddress: DESTINATION,
      createdAt: '2026-09-02T09:00:00.000Z',
    };

    it('posts the withdrawal request and returns the created withdrawal', async () => {
      mockPost.mockResolvedValue({ data: { success: true, data: response } });

      await expect(driverWalletService.requestWithdrawal(DRIVER_ID, params)).resolves.toEqual(
        response,
      );
      expect(mockPost).toHaveBeenCalledWith(`/drivers/${DRIVER_ID}/wallet/withdrawals`, params);
    });

    it.each([
      ['a zero amount', { amount: 0 }],
      ['a non-finite amount', { amount: Number.NaN }],
      ['a missing currency', { currency: ' ' }],
      ['an invalid Stellar address', { destinationAddress: 'not-a-key' }],
      ['a memo longer than 28 bytes', { memo: 'x'.repeat(29) }],
    ])('rejects %s before calling the API', async (_label, override) => {
      const error = await captureError(
        driverWalletService.requestWithdrawal(DRIVER_ID, { ...params, ...override }),
      );

      expect(error.code).toBe('VALIDATION_ERROR');
      expect(mockPost).not.toHaveBeenCalled();
    });

    it('surfaces an insufficient balance error code from the backend', async () => {
      mockPost.mockRejectedValue(
        httpError(422, { success: false, code: 'INSUFFICIENT_BALANCE', message: 'Not enough funds' }),
      );

      const error = await captureError(driverWalletService.requestWithdrawal(DRIVER_ID, params));

      expect(error.code).toBe('INSUFFICIENT_BALANCE');
      expect(error.status).toBe(422);
      expect(error.message).toBe('Not enough funds');
    });
  });

  describe('getWithdrawalStatus', () => {
    it('reads the withdrawal status endpoint', async () => {
      const status: WithdrawalStatus = {
        withdrawalId: 'wd-1',
        status: 'completed',
        transactionHash: 'def456',
        updatedAt: '2026-09-02T09:05:00.000Z',
      };
      mockGet.mockResolvedValue({ data: { success: true, data: status } });

      await expect(driverWalletService.getWithdrawalStatus('wd-1')).resolves.toEqual(status);
      expect(mockGet).toHaveBeenCalledWith('/wallet/withdrawals/wd-1');
    });

    it('maps a 404 to NOT_FOUND with the fallback message', async () => {
      mockGet.mockRejectedValue(httpError(404));

      const error = await captureError(driverWalletService.getWithdrawalStatus('missing'));

      expect(error.code).toBe('NOT_FOUND');
      expect(error.status).toBe(404);
      expect(error.message).toBe('Failed to load withdrawal status');
    });
  });
});

describe('normalizeDriverWalletError', () => {
  const fallback = 'Something failed';

  it.each([
    [401, 'UNAUTHORIZED'],
    [403, 'FORBIDDEN'],
    [400, 'VALIDATION_ERROR'],
    [409, 'API_ERROR'],
    [503, 'SERVER_ERROR'],
  ])('maps HTTP %i to %s', (status, code) => {
    expect(normalizeDriverWalletError(httpError(status), fallback).code).toBe(code);
  });

  it('maps a request without a response to NETWORK_ERROR', () => {
    const config = { headers: new AxiosHeaders() };
    const error = new AxiosError('Network Error', 'ERR_NETWORK', config, {});

    expect(normalizeDriverWalletError(error, fallback).code).toBe('NETWORK_ERROR');
  });

  it('maps an aborted request to TIMEOUT', () => {
    const config = { headers: new AxiosHeaders() };
    const error = new AxiosError('timeout', 'ECONNABORTED', config, {});

    expect(normalizeDriverWalletError(error, fallback).code).toBe('TIMEOUT');
  });

  it('keeps the message of a plain Error', () => {
    const normalized = normalizeDriverWalletError(new Error('boom'), fallback);

    expect(normalized.code).toBe('UNKNOWN_ERROR');
    expect(normalized.message).toBe('boom');
  });

  it('falls back to the default message for non-Error values', () => {
    const normalized = normalizeDriverWalletError('boom', fallback);

    expect(normalized.code).toBe('UNKNOWN_ERROR');
    expect(normalized.message).toBe(fallback);
  });

  it('returns an already-normalized error unchanged', () => {
    const original = new DriverWalletServiceError('x', 'TIMEOUT');

    expect(normalizeDriverWalletError(original, fallback)).toBe(original);
  });
});
