import { renderHook, act } from '@testing-library/react';
import { useWallet } from '@/hooks/useWallet';
import { useWalletStore, WALLET_STORAGE_KEY } from '@/store/walletStore';
import { walletService } from '@/services/walletService';
import { freighterService } from '@/services/freighterService';
import { sessionService } from '@/services/sessionService';
import {
  mockWalletConnectResponse,
  mockWalletConnectFailureResponse,
  mockWalletDisconnectResponse,
} from './fixtures/walletApiResponses';

const mockPush = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

jest.mock('@/services/walletService', () => {
  const fixtures = jest.requireActual('./fixtures/walletApiResponses');
  return {
    walletService: {
      connect: jest.fn().mockResolvedValue(fixtures.mockWalletConnectResponse),
      disconnect: jest.fn().mockResolvedValue(fixtures.mockWalletDisconnectResponse),
    },
  };
});

jest.mock('@/services/freighterService', () => ({
  freighterService: {
    isInstalled: jest.fn().mockReturnValue(true),
    isAllowed: jest.fn().mockResolvedValue(true),
    requestAccess: jest.fn().mockResolvedValue(undefined),
    getPublicKey: jest.fn().mockResolvedValue('GABC123DEF456STELLAR'),
    isConnected: jest.fn().mockResolvedValue(true),
  },
}));

describe('useWallet — connect flow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    act(() => {
      useWalletStore.getState().clearWalletState();
    });
    localStorage.clear();
  });

  it('detects Freighter installation on mount', () => {
    const { result } = renderHook(() => useWallet());
    expect(result.current.isFreighterInstalled).toBe(true);
  });

  it('calls freighterService.getPublicKey when connect() is invoked', async () => {
    const { result } = renderHook(() => useWallet());
    await act(async () => {
      await result.current.connect();
    });
    expect(freighterService.getPublicKey).toHaveBeenCalledTimes(1);
  });

  it('calls walletService.connect with the public key returned by Freighter', async () => {
    const { result } = renderHook(() => useWallet());
    await act(async () => {
      await result.current.connect();
    });
    expect(walletService.connect).toHaveBeenCalledWith('GABC123DEF456STELLAR');
  });

  it('sets isConnected to true after a successful connect', async () => {
    const { result } = renderHook(() => useWallet());
    await act(async () => {
      await result.current.connect();
    });
    expect(result.current.isConnected).toBe(true);
    expect(result.current.address).toBe('GABC123DEF456STELLAR');
  });

  it('sets connectError when Freighter is not installed', async () => {
    (freighterService.isInstalled as jest.Mock).mockReturnValueOnce(false);
    const { result } = renderHook(() => useWallet());
    await act(async () => {
      await result.current.connect();
    });
    expect(result.current.connectError).toMatch(/not installed/i);
    expect(result.current.isConnected).toBe(false);
  });

  it('sets connectError when walletService.connect returns success: false', async () => {
    (walletService.connect as jest.Mock).mockResolvedValueOnce(
      mockWalletConnectFailureResponse
    );
    const { result } = renderHook(() => useWallet());
    await act(async () => {
      await result.current.connect();
    });
    expect(result.current.connectError).toBeTruthy();
    expect(result.current.isConnected).toBe(false);
  });

  it('sets connectError when freighterService.getPublicKey throws', async () => {
    (freighterService.getPublicKey as jest.Mock).mockRejectedValueOnce(
      new Error('User rejected')
    );
    const { result } = renderHook(() => useWallet());
    await act(async () => {
      await result.current.connect();
    });
    expect(result.current.connectError).toBe('User rejected');
    expect(result.current.isConnected).toBe(false);
  });

  it('resets isConnecting to false after connect resolves', async () => {
    const { result } = renderHook(() => useWallet());
    await act(async () => {
      await result.current.connect();
    });
    expect(result.current.isConnecting).toBe(false);
  });

  it('resets isConnecting to false even when connect throws', async () => {
    (freighterService.getPublicKey as jest.Mock).mockRejectedValueOnce(
      new Error('Extension error')
    );
    const { result } = renderHook(() => useWallet());
    await act(async () => {
      await result.current.connect();
    });
    expect(result.current.isConnecting).toBe(false);
  });
});

describe('useWallet — disconnect flow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    act(() => {
      useWalletStore.getState().setWallet('GABC123DEF456STELLAR', 0);
    });
    localStorage.setItem(
      WALLET_STORAGE_KEY,
      JSON.stringify({ address: 'GABC123DEF456STELLAR' })
    );
  });

  afterEach(() => {
    act(() => {
      useWalletStore.getState().clearWalletState();
    });
    localStorage.clear();
  });

  it('exposes connected wallet address and isConnected from store', () => {
    const { result } = renderHook(() => useWallet());
    expect(result.current.isConnected).toBe(true);
    expect(result.current.address).toBe('GABC123DEF456STELLAR');
  });

  it('calls walletService.disconnect once on disconnect', async () => {
    const { result } = renderHook(() => useWallet());
    const clearSessionSpy = jest.spyOn(sessionService, 'clearWalletSession');

    await act(async () => {
      await result.current.disconnect();
    });

    expect(walletService.disconnect).toHaveBeenCalledTimes(1);
    expect(clearSessionSpy).toHaveBeenCalledTimes(1);
  });

  it('clears address and isConnected from Zustand on disconnect', async () => {
    const { result } = renderHook(() => useWallet());
    await act(async () => {
      await result.current.disconnect();
    });
    expect(result.current.address).toBeNull();
    expect(result.current.isConnected).toBe(false);
  });

  it('removes wallet cache from localStorage on disconnect', async () => {
    const { result } = renderHook(() => useWallet());
    await act(async () => {
      await result.current.disconnect();
    });
    expect(localStorage.getItem(WALLET_STORAGE_KEY)).toBeNull();
  });

  it('redirects to /login after disconnect', async () => {
    const { result } = renderHook(() => useWallet());
    await act(async () => {
      await result.current.disconnect();
    });
    expect(mockPush).toHaveBeenCalledWith('/login');
  });

  it('clears state and redirects even if API call fails', async () => {
    (walletService.disconnect as jest.Mock).mockRejectedValueOnce(
      new Error('Network error')
    );
    const { result } = renderHook(() => useWallet());
    await act(async () => {
      await result.current.disconnect();
    });
    expect(result.current.address).toBeNull();
    expect(result.current.isConnected).toBe(false);
    expect(localStorage.getItem(WALLET_STORAGE_KEY)).toBeNull();
    expect(mockPush).toHaveBeenCalledWith('/login');
  });
});
