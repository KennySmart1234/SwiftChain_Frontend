import { AxiosError, AxiosHeaders } from 'axios';
import api from '@/lib/api';
import { auditTrailService } from '@/services/auditTrailService';
import { auditTrailEventsFixture } from '@/hooks/__tests__/fixtures/auditTrailApiResponses';

jest.mock('@/lib/api', () => ({
  __esModule: true,
  default: { get: jest.fn() },
}));

const mockGet = api.get as jest.Mock;

describe('auditTrailService.getDeliveryEvents', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('reads the delivery events endpoint and returns the events', async () => {
    mockGet.mockResolvedValue({
      data: { success: true, data: { deliveryId: 'del-42', events: auditTrailEventsFixture } },
    });

    await expect(auditTrailService.getDeliveryEvents('del-42')).resolves.toEqual(
      auditTrailEventsFixture,
    );
    expect(mockGet).toHaveBeenCalledWith('/audit/delivery/del-42/events', { signal: undefined });
  });

  it('encodes the delivery id', async () => {
    mockGet.mockResolvedValue({ data: { success: true, data: { deliveryId: 'x', events: [] } } });

    await auditTrailService.getDeliveryEvents('a/b');

    expect(mockGet).toHaveBeenCalledWith('/audit/delivery/a%2Fb/events', { signal: undefined });
  });

  it('throws the API message for an unsuccessful response', async () => {
    mockGet.mockResolvedValue({ data: { success: false, message: 'Delivery not found' } });

    await expect(auditTrailService.getDeliveryEvents('missing')).rejects.toThrow(
      'Delivery not found',
    );
  });

  it('uses the server error message from an HTTP failure', async () => {
    const headers = new AxiosHeaders();
    mockGet.mockRejectedValue(
      new AxiosError('Request failed', 'ERR_BAD_RESPONSE', { headers }, null, {
        status: 502,
        statusText: 'Bad Gateway',
        headers,
        config: { headers },
        data: { message: 'Indexer unavailable' },
      }),
    );

    await expect(auditTrailService.getDeliveryEvents('del-42')).rejects.toThrow(
      'Indexer unavailable',
    );
  });

  it('falls back to a readable message when the error has no detail', async () => {
    const headers = new AxiosHeaders();
    mockGet.mockRejectedValue(new AxiosError('timeout', 'ECONNABORTED', { headers }));

    await expect(auditTrailService.getDeliveryEvents('del-42')).rejects.toThrow(
      'Unable to load the audit trail. Please try again.',
    );
  });
});
