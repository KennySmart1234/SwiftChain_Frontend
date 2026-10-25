import {
  OFFLINE_HANDOFF_STORAGE_KEY,
  offlineHandoffService,
} from '@/services/offlineHandoffService';
import { shipmentHandoffService } from '@/services/shipmentHandoffService';

jest.mock('@/services/shipmentHandoffService', () => ({
  shipmentHandoffService: { verifyHandoffQR: jest.fn() },
}));

const verifyHandoff = shipmentHandoffService.verifyHandoffQR as jest.Mock;

describe('offlineHandoffService', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
  });

  it('persists an offline scan in localStorage', () => {
    offlineHandoffService.enqueue('delivery-1', 'token-1');

    const stored = JSON.parse(localStorage.getItem(OFFLINE_HANDOFF_STORAGE_KEY) ?? '[]');
    expect(stored).toEqual([
      expect.objectContaining({ deliveryId: 'delivery-1', token: 'token-1', attempts: 0 }),
    ]);
  });

  it('removes scans after a successful reconnect sync', async () => {
    offlineHandoffService.enqueue('delivery-1', 'token-1');
    verifyHandoff.mockResolvedValue({ id: 'handoff-1' });

    const result = await offlineHandoffService.syncPending(1000);

    expect(result).toEqual({ synced: 1, failed: 0, pending: 0, nextRetryAt: null });
    expect(offlineHandoffService.getQueue()).toEqual([]);
  });

  it('retains failed scans with exponential backoff metadata', async () => {
    offlineHandoffService.enqueue('delivery-1', 'token-1');
    verifyHandoff.mockRejectedValue(new Error('Temporary outage'));

    const first = await offlineHandoffService.syncPending(1000);
    expect(first.nextRetryAt).toBe(2000);
    expect(offlineHandoffService.getQueue()[0]).toEqual(
      expect.objectContaining({ attempts: 1, nextAttemptAt: 2000 }),
    );

    await offlineHandoffService.syncPending(2000);
    expect(offlineHandoffService.getQueue()[0]).toEqual(
      expect.objectContaining({ attempts: 2, nextAttemptAt: 4000 }),
    );
  });

  it('does not retry an item before its next attempt time', async () => {
    offlineHandoffService.enqueue('delivery-1', 'token-1');
    verifyHandoff.mockRejectedValue(new Error('Temporary outage'));
    await offlineHandoffService.syncPending(1000);
    verifyHandoff.mockClear();

    const result = await offlineHandoffService.syncPending(1500);

    expect(verifyHandoff).not.toHaveBeenCalled();
    expect(result.pending).toBe(1);
  });
});
