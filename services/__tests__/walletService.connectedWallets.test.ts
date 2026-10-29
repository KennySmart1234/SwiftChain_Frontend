import axios from 'axios';
import { walletService } from '@/services/walletService';
import type { ConnectedWallet } from '@/types/wallet.types';

jest.mock('axios');

const mockAxios = axios as jest.Mocked<typeof axios>;

const WALLETS: ConnectedWallet[] = [
  {
    id: 'w1',
    address: 'GABC123DEF456STELLAR',
    provider: 'freighter',
    network: 'testnet',
    isPrimary: true,
    connectedAt: '2026-01-15T10:30:00Z',
  },
  {
    id: 'w2',
    address: 'GDEF789GHI012STELLAR',
    provider: 'ledger',
    network: 'public',
    isPrimary: false,
    connectedAt: '2026-02-20T08:00:00Z',
  },
];

describe('walletService — connected wallet management', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getConnectedWallets', () => {
    it('returns the wallets from the backend response', async () => {
      mockAxios.get.mockResolvedValue({ data: { success: true, data: WALLETS } });

      const result = await walletService.getConnectedWallets();

      expect(result).toEqual(WALLETS);
      const url = mockAxios.get.mock.calls[0][0] as string;
      expect(url).toContain('/api/wallet/connected');
    });

    it('forwards the abort signal to the request', async () => {
      const controller = new AbortController();
      mockAxios.get.mockResolvedValue({ data: { success: true, data: WALLETS } });

      await walletService.getConnectedWallets(controller.signal);

      const config = mockAxios.get.mock.calls[0][1] as { signal?: AbortSignal };
      expect(config.signal).toBe(controller.signal);
    });

    it('throws the backend message when the API reports failure', async () => {
      mockAxios.get.mockResolvedValue({
        data: { success: false, message: 'Unauthorized', data: [] },
      });

      await expect(walletService.getConnectedWallets()).rejects.toThrow('Unauthorized');
    });

    it('throws a fallback message when data is not an array', async () => {
      mockAxios.get.mockResolvedValue({ data: { success: true } });

      await expect(walletService.getConnectedWallets()).rejects.toThrow(
        'Failed to fetch connected wallets'
      );
    });

    it('propagates network errors', async () => {
      mockAxios.get.mockRejectedValue(new Error('Network error'));

      await expect(walletService.getConnectedWallets()).rejects.toThrow('Network error');
    });
  });

  describe('disconnectWallet', () => {
    it('calls the wallet-specific endpoint and returns the response', async () => {
      mockAxios.delete.mockResolvedValue({
        data: { success: true, message: 'Disconnected' },
      });

      const result = await walletService.disconnectWallet('w1');

      expect(result.success).toBe(true);
      const url = mockAxios.delete.mock.calls[0][0] as string;
      expect(url).toContain('/api/wallet/connected/w1');
    });

    it('throws the backend message when unlinking fails', async () => {
      mockAxios.delete.mockResolvedValue({
        data: { success: false, message: 'Wallet not found' },
      });

      await expect(walletService.disconnectWallet('w1')).rejects.toThrow('Wallet not found');
    });

    it('propagates network errors', async () => {
      mockAxios.delete.mockRejectedValue(new Error('Network error'));

      await expect(walletService.disconnectWallet('w1')).rejects.toThrow('Network error');
    });
  });

  describe('connectWallet', () => {
    it('posts address and provider to /api/wallet/connected', async () => {
      const response = {
        success: true,
        message: 'Wallet connected successfully',
        data: WALLETS[0],
      };
      mockAxios.post.mockResolvedValue({ data: response });

      const result = await walletService.connectWallet('GABC123DEF456STELLAR', 'freighter');

      expect(result).toEqual(response);
      const [url, body] = mockAxios.post.mock.calls[0];
      expect(url).toContain('/api/wallet/connected');
      expect(body).toEqual({
        address: 'GABC123DEF456STELLAR',
        provider: 'freighter',
        walletType: 'freighter',
      });
    });

    it('throws backend error message on failure', async () => {
      mockAxios.post.mockResolvedValue({
        data: { success: false, message: 'Wallet already registered' },
      });

      await expect(
        walletService.connectWallet('GABC123DEF456STELLAR', 'freighter')
      ).rejects.toThrow('Wallet already registered');
    });

    it('propagates network errors', async () => {
      mockAxios.post.mockRejectedValue(new Error('Network error'));

      await expect(
        walletService.connectWallet('GABC123DEF456STELLAR', 'freighter')
      ).rejects.toThrow('Network error');
    });
  });

  describe('setPrimaryWallet', () => {
    it('sends PUT to /api/wallet/connected/:walletId/primary', async () => {
      const response = {
        success: true,
        message: 'Primary wallet set successfully',
        data: WALLETS[1],
      };
      mockAxios.put.mockResolvedValue({ data: response });

      const result = await walletService.setPrimaryWallet('w2');

      expect(result).toEqual(response);
      const url = mockAxios.put.mock.calls[0][0] as string;
      expect(url).toContain('/api/wallet/connected/w2/primary');
    });

    it('throws error when setting primary fails', async () => {
      mockAxios.put.mockResolvedValue({
        data: { success: false, message: 'Wallet not found' },
      });

      await expect(walletService.setPrimaryWallet('invalid-id')).rejects.toThrow(
        'Wallet not found'
      );
    });

    it('propagates network errors', async () => {
      mockAxios.put.mockRejectedValue(new Error('Network error'));

      await expect(walletService.setPrimaryWallet('w2')).rejects.toThrow('Network error');
    });
  });
});
