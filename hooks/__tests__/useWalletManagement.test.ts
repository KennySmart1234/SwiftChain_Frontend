import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useWalletManagement } from '@/hooks/useWalletManagement';
import { walletService } from '@/services/walletService';
import { freighterService } from '@/services/freighterService';
import { useWalletStore } from '@/store/walletStore';
import type { ConnectedWallet } from '@/types/wallet.types';

jest.mock('@/services/walletService', () => ({
  walletService: {
    getConnectedWallets: jest.fn(),
    connectWallet: jest.fn(),
    setPrimaryWallet: jest.fn(),
    disconnectWallet: jest.fn(),
  },
}));

jest.mock('@/services/freighterService', () => ({
  freighterService: {
    isInstalled: jest.fn(),
    getPublicKey: jest.fn(),
    isAllowed: jest.fn(),
    requestAccess: jest.fn(),
    isConnected: jest.fn(),
  },
}));

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

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: queryClient }, children);
  };
};

describe('useWalletManagement', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    act(() => {
      useWalletStore.getState().clearWalletState();
    });
    localStorage.clear();
    (freighterService.isInstalled as jest.Mock).mockReturnValue(true);
  });

  describe('fetching connected wallets', () => {
    it('loads connected wallets from the service', async () => {
      (walletService.getConnectedWallets as jest.Mock).mockResolvedValueOnce(WALLETS);

      const { result } = renderHook(() => useWalletManagement(), {
        wrapper: createWrapper(),
      });

      expect(result.current.isLoading).toBe(true);
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(walletService.getConnectedWallets).toHaveBeenCalledTimes(1);
      expect(result.current.wallets).toEqual(WALLETS);
      expect(result.current.error).toBeNull();
    });

    it('surfaces the service error message when loading fails', async () => {
      (walletService.getConnectedWallets as jest.Mock).mockRejectedValueOnce(
        new Error('Backend unavailable')
      );

      const { result } = renderHook(() => useWalletManagement(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.error).toBe('Backend unavailable');
      expect(result.current.wallets).toEqual([]);
    });

    it('exposes the active wallet matching the wallet context address', async () => {
      act(() => {
        useWalletStore.getState().setWallet('GABC123DEF456STELLAR', 0);
      });
      (walletService.getConnectedWallets as jest.Mock).mockResolvedValueOnce(WALLETS);

      const { result } = renderHook(() => useWalletManagement(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.activeWallet?.id).toBe('w1');
      expect(result.current.activeAddress).toBe('GABC123DEF456STELLAR');
      expect(result.current.isConnected).toBe(true);
    });

    it('clears a stale wallet session that is no longer linked on the backend', async () => {
      act(() => {
        useWalletStore.getState().setWallet('GSTALESTALE0000000000', 0);
      });
      (walletService.getConnectedWallets as jest.Mock).mockResolvedValueOnce(WALLETS);

      const { result } = renderHook(() => useWalletManagement(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isLoading).toBe(false));
      await waitFor(() => expect(result.current.activeAddress).toBeNull());
      expect(result.current.isConnected).toBe(false);
    });

    it('refetch requests a fresh list from the service', async () => {
      (walletService.getConnectedWallets as jest.Mock).mockResolvedValue(WALLETS);

      const { result } = renderHook(() => useWalletManagement(), {
        wrapper: createWrapper(),
      });
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await act(async () => {
        await result.current.refetch();
      });

      await waitFor(() =>
        expect(walletService.getConnectedWallets).toHaveBeenCalledTimes(2)
      );
    });
  });

  describe('setActiveWallet', () => {
    it('syncs the selected wallet into the wallet context', async () => {
      (walletService.getConnectedWallets as jest.Mock).mockResolvedValueOnce(WALLETS);

      const { result } = renderHook(() => useWalletManagement(), {
        wrapper: createWrapper(),
      });
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      act(() => {
        result.current.setActiveWallet(WALLETS[1]);
      });

      expect(result.current.activeAddress).toBe('GDEF789GHI012STELLAR');
      expect(result.current.activeWallet?.id).toBe('w2');
    });
  });

  describe('disconnectWallet', () => {
    it('removes the wallet by object and clears the context when it was active', async () => {
      act(() => {
        useWalletStore.getState().setWallet('GABC123DEF456STELLAR', 0);
      });
      (walletService.getConnectedWallets as jest.Mock).mockResolvedValueOnce(WALLETS);
      (walletService.disconnectWallet as jest.Mock).mockResolvedValueOnce({
        success: true,
        message: 'Disconnected',
      });

      const { result } = renderHook(() => useWalletManagement(), {
        wrapper: createWrapper(),
      });
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      let ok = false;
      await act(async () => {
        ok = await result.current.disconnectWallet(WALLETS[0]);
      });

      expect(ok).toBe(true);
      expect(walletService.disconnectWallet).toHaveBeenCalledWith('w1');
      expect(result.current.wallets.map((wallet) => wallet.id)).toEqual(['w2']);
      expect(result.current.activeAddress).toBeNull();
    });

    it('removes the wallet by string ID', async () => {
      (walletService.getConnectedWallets as jest.Mock).mockResolvedValueOnce(WALLETS);
      (walletService.disconnectWallet as jest.Mock).mockResolvedValueOnce({
        success: true,
        message: 'Disconnected',
      });

      const { result } = renderHook(() => useWalletManagement(), {
        wrapper: createWrapper(),
      });
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      let ok = false;
      await act(async () => {
        ok = await result.current.disconnectWallet('w1');
      });

      expect(ok).toBe(true);
      expect(walletService.disconnectWallet).toHaveBeenCalledWith('w1');
      expect(result.current.wallets.map((wallet) => wallet.id)).toEqual(['w2']);
    });

    it('keeps other wallets and the active context when disconnecting a non-active wallet', async () => {
      act(() => {
        useWalletStore.getState().setWallet('GABC123DEF456STELLAR', 0);
      });
      (walletService.getConnectedWallets as jest.Mock).mockResolvedValueOnce(WALLETS);
      (walletService.disconnectWallet as jest.Mock).mockResolvedValueOnce({
        success: true,
        message: 'Disconnected',
      });

      const { result } = renderHook(() => useWalletManagement(), {
        wrapper: createWrapper(),
      });
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await act(async () => {
        await result.current.disconnectWallet(WALLETS[1]);
      });

      expect(result.current.activeAddress).toBe('GABC123DEF456STELLAR');
      expect(result.current.wallets.map((wallet) => wallet.id)).toEqual(['w1']);
    });

    it('reports an error and keeps the wallet when disconnect fails', async () => {
      (walletService.getConnectedWallets as jest.Mock).mockResolvedValueOnce(WALLETS);
      (walletService.disconnectWallet as jest.Mock).mockRejectedValueOnce(
        new Error('Could not unlink wallet')
      );

      const { result } = renderHook(() => useWalletManagement(), {
        wrapper: createWrapper(),
      });
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      let ok = true;
      await act(async () => {
        ok = await result.current.disconnectWallet(WALLETS[0]);
      });

      expect(ok).toBe(false);
      expect(result.current.error).toBe('Could not unlink wallet');
      expect(result.current.wallets).toHaveLength(2);
    });
  });

  describe('connectWallet', () => {
    it('uses Freighter API and connects new wallet via backend', async () => {
      const newWallet: ConnectedWallet = {
        id: 'w3',
        address: 'GNEWWALLET789XYZSTELLAR',
        provider: 'freighter',
        network: 'testnet',
        isPrimary: false,
        connectedAt: '2026-03-01T12:00:00Z',
      };

      (walletService.getConnectedWallets as jest.Mock).mockResolvedValueOnce(WALLETS);
      (freighterService.getPublicKey as jest.Mock).mockResolvedValueOnce(
        'GNEWWALLET789XYZSTELLAR'
      );
      (walletService.connectWallet as jest.Mock).mockResolvedValueOnce({
        success: true,
        message: 'Wallet connected',
        data: newWallet,
      });

      const { result } = renderHook(() => useWalletManagement(), {
        wrapper: createWrapper(),
      });
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      let connected: ConnectedWallet | null = null;
      await act(async () => {
        connected = await result.current.connectWallet('freighter');
      });

      expect(freighterService.getPublicKey).toHaveBeenCalledTimes(1);
      expect(walletService.connectWallet).toHaveBeenCalledWith(
        'GNEWWALLET789XYZSTELLAR',
        'freighter'
      );
      expect(connected?.address).toBe('GNEWWALLET789XYZSTELLAR');
      expect(useWalletStore.getState().address).toBe('GNEWWALLET789XYZSTELLAR');
      expect(result.current.error).toBeNull();
    });

    it('surfaces error when Freighter is not installed', async () => {
      (walletService.getConnectedWallets as jest.Mock).mockResolvedValueOnce(WALLETS);
      (freighterService.isInstalled as jest.Mock).mockReturnValueOnce(false);

      const { result } = renderHook(() => useWalletManagement(), {
        wrapper: createWrapper(),
      });
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      let connected: ConnectedWallet | null = null;
      await act(async () => {
        connected = await result.current.connectWallet('freighter');
      });

      expect(connected).toBeNull();
      expect(result.current.error).toBe(
        'Freighter wallet is not installed. Please install the extension.'
      );
      expect(freighterService.getPublicKey).not.toHaveBeenCalled();
    });

    it('surfaces error when Freighter getPublicKey fails', async () => {
      (walletService.getConnectedWallets as jest.Mock).mockResolvedValueOnce(WALLETS);
      (freighterService.getPublicKey as jest.Mock).mockRejectedValueOnce(
        new Error('User declined access')
      );

      const { result } = renderHook(() => useWalletManagement(), {
        wrapper: createWrapper(),
      });
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      let connected: ConnectedWallet | null = null;
      await act(async () => {
        connected = await result.current.connectWallet('freighter');
      });

      expect(connected).toBeNull();
      expect(result.current.error).toBe('User declined access');
      expect(walletService.connectWallet).not.toHaveBeenCalled();
    });

    it('surfaces error when backend connectWallet fails', async () => {
      (walletService.getConnectedWallets as jest.Mock).mockResolvedValueOnce(WALLETS);
      (freighterService.getPublicKey as jest.Mock).mockResolvedValueOnce(
        'GNEWWALLET789XYZSTELLAR'
      );
      (walletService.connectWallet as jest.Mock).mockRejectedValueOnce(
        new Error('Wallet already registered to another account')
      );

      const { result } = renderHook(() => useWalletManagement(), {
        wrapper: createWrapper(),
      });
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      let connected: ConnectedWallet | null = null;
      await act(async () => {
        connected = await result.current.connectWallet('freighter');
      });

      expect(connected).toBeNull();
      expect(result.current.error).toBe(
        'Wallet already registered to another account'
      );
    });

    it('surfaces error for unsupported wallet type', async () => {
      (walletService.getConnectedWallets as jest.Mock).mockResolvedValueOnce(WALLETS);

      const { result } = renderHook(() => useWalletManagement(), {
        wrapper: createWrapper(),
      });
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      let connected: ConnectedWallet | null = null;
      await act(async () => {
        connected = await result.current.connectWallet('unknown_wallet');
      });

      expect(connected).toBeNull();
      expect(result.current.error).toBe('Unsupported wallet provider: unknown_wallet');
    });
  });

  describe('setPrimaryWallet', () => {
    it('sets primary wallet and returns confirmation', async () => {
      (walletService.getConnectedWallets as jest.Mock).mockResolvedValueOnce(WALLETS);
      (walletService.setPrimaryWallet as jest.Mock).mockResolvedValueOnce({
        success: true,
        message: 'Primary wallet set successfully',
        data: { ...WALLETS[1], isPrimary: true },
      });

      const { result } = renderHook(() => useWalletManagement(), {
        wrapper: createWrapper(),
      });
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      let confirmation;
      await act(async () => {
        confirmation = await result.current.setPrimaryWallet('w2');
      });

      expect(walletService.setPrimaryWallet).toHaveBeenCalledWith('w2');
      expect(confirmation).toEqual({
        success: true,
        message: 'Primary wallet set successfully',
        data: { ...WALLETS[1], isPrimary: true },
      });

      const primaryWallet = result.current.wallets.find((w) => w.id === 'w2');
      expect(primaryWallet?.isPrimary).toBe(true);
      const oldPrimaryWallet = result.current.wallets.find((w) => w.id === 'w1');
      expect(oldPrimaryWallet?.isPrimary).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('surfaces error when setPrimaryWallet fails', async () => {
      (walletService.getConnectedWallets as jest.Mock).mockResolvedValueOnce(WALLETS);
      (walletService.setPrimaryWallet as jest.Mock).mockRejectedValueOnce(
        new Error('Failed to update primary wallet')
      );

      const { result } = renderHook(() => useWalletManagement(), {
        wrapper: createWrapper(),
      });
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      let confirmation;
      await act(async () => {
        confirmation = await result.current.setPrimaryWallet('w2');
      });

      expect(confirmation).toEqual({
        success: false,
        message: 'Failed to update primary wallet',
      });
      expect(result.current.error).toBe('Failed to update primary wallet');
    });
  });
});
