'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { walletService } from '@/services/walletService';
import { freighterService } from '@/services/freighterService';
import { useWalletStore } from '@/store/walletStore';
import type {
  ConnectedWallet,
  SetPrimaryWalletResponse,
} from '@/types/wallet.types';

export const CONNECTED_WALLETS_QUERY_KEY = ['wallet', 'connected'] as const;

export interface UseWalletManagementResult {
  /** Every wallet linked to the account, as reported by the backend. */
  wallets: ConnectedWallet[];
  /** The connected wallet matching the wallet context (Zustand) address, if any. */
  activeWallet: ConnectedWallet | null;
  activeAddress: string | null;
  isConnected: boolean;
  isLoading: boolean;
  isConnecting: boolean;
  isDisconnecting: boolean;
  isSettingPrimary: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  /** Connect a new wallet via Freighter or other provider. */
  connectWallet: (_walletType?: string) => Promise<ConnectedWallet | null>;
  /** Set a wallet as primary on the backend. Returns confirmation. */
  setPrimaryWallet: (_walletId: string) => Promise<SetPrimaryWalletResponse>;
  /** Unlink a wallet. Accepts wallet instance or wallet ID. Returns true on success. */
  disconnectWallet: (_wallet: ConnectedWallet | string) => Promise<boolean>;
  /** Promote a wallet to the active session in the shared wallet context. */
  setActiveWallet: (_wallet: ConnectedWallet) => void;
}

/**
 * useWalletManagement — data layer for Connected Wallet CRUD Operations.
 *
 * Layered Architecture:
 *   ConnectedWallets (Component) → useWalletManagement (Hook) → walletService & freighterService (Services)
 *
 * Responsibilities:
 *   - Fetch connected wallets from /api/wallet/connected endpoint using TanStack React Query.
 *   - Connect new wallets via Freighter API and registers them with the backend.
 *   - Set primary wallet and return confirmation.
 *   - Disconnect wallet and clear it from backend.
 *   - Keep the shared wallet context (`useWalletStore`) in sync with backend state.
 */
export function useWalletManagement(): UseWalletManagementResult {
  const address = useWalletStore((state) => state.address);
  const isConnected = useWalletStore((state) => state.isConnected);
  const setWallet = useWalletStore((state) => state.setWallet);
  const clearWalletState = useWalletStore((state) => state.clearWalletState);

  const queryClient = useQueryClient();
  const [actionError, setActionError] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  const {
    data: wallets = [],
    isLoading: isQueryLoading,
    error: queryError,
    refetch: queryRefetch,
  } = useQuery<ConnectedWallet[], Error>({
    queryKey: CONNECTED_WALLETS_QUERY_KEY,
    queryFn: ({ signal }) => walletService.getConnectedWallets(signal),
    retry: false,
  });

  const connectMutation = useMutation({
    mutationFn: async ({
      address,
      walletType,
    }: {
      address: string;
      walletType: string;
    }) => {
      return walletService.connectWallet(address, walletType);
    },
  });

  const setPrimaryMutation = useMutation({
    mutationFn: async (walletId: string) => {
      return walletService.setPrimaryWallet(walletId);
    },
    onSuccess: (_, walletId) => {
      queryClient.setQueryData<ConnectedWallet[]>(
        CONNECTED_WALLETS_QUERY_KEY,
        (prev) =>
          prev
            ? prev.map((w) => ({
                ...w,
                isPrimary: w.id === walletId,
              }))
            : []
      );
    },
  });

  const disconnectMutation = useMutation({
    mutationFn: async (walletId: string) => {
      return walletService.disconnectWallet(walletId);
    },
    onSuccess: (_, walletId) => {
      queryClient.setQueryData<ConnectedWallet[]>(
        CONNECTED_WALLETS_QUERY_KEY,
        (prev) => (prev ? prev.filter((item) => item.id !== walletId) : [])
      );
    },
  });

  const error =
    actionError ?? (queryError instanceof Error ? queryError.message : null);

  const refetch = useCallback(async (): Promise<void> => {
    setActionError(null);
    await queryRefetch();
  }, [queryRefetch]);

  // Keep the wallet context in sync: drop a persisted session whose address is
  // no longer linked to the account on the backend.
  useEffect(() => {
    if (isQueryLoading || address === null) return;
    const stillLinked = wallets.some((wallet) => wallet.address === address);
    if (!stillLinked) {
      clearWalletState();
    }
  }, [wallets, address, isQueryLoading, clearWalletState]);

  const activeWallet = useMemo(
    () => wallets.find((wallet) => wallet.address === address) ?? null,
    [wallets, address]
  );

  const setActiveWallet = useCallback(
    (wallet: ConnectedWallet): void => {
      setWallet(wallet.address, 0);
    },
    [setWallet]
  );

  const connectWallet = useCallback(
    async (walletType: string = 'freighter'): Promise<ConnectedWallet | null> => {
      setActionError(null);
      setIsConnecting(true);

      try {
        let stellarAddress: string;

        if (walletType.toLowerCase() === 'freighter') {
          if (!freighterService.isInstalled()) {
            throw new Error(
              'Freighter wallet is not installed. Please install the extension.'
            );
          }
          stellarAddress = await freighterService.getPublicKey();
        } else {
          throw new Error(`Unsupported wallet provider: ${walletType}`);
        }

        const response = await connectMutation.mutateAsync({
          address: stellarAddress,
          walletType,
        });

        const newWallet: ConnectedWallet = response.data ||
          response.wallet || {
            id: `wallet-${Date.now()}`,
            address: stellarAddress,
            provider: walletType,
            network: 'testnet',
            isPrimary: false,
            connectedAt: new Date().toISOString(),
          };

        queryClient.setQueryData<ConnectedWallet[]>(
          CONNECTED_WALLETS_QUERY_KEY,
          (prev) => (prev ? [...prev, newWallet] : [newWallet])
        );

        // Sync to active Zustand wallet store
        setWallet(stellarAddress, 0);

        return newWallet;
      } catch (err: unknown) {
        const message =
          err instanceof Error && err.message
            ? err.message
            : 'Failed to connect wallet';
        setActionError(message);
        return null;
      } finally {
        setIsConnecting(false);
      }
    },
    [connectMutation, setWallet]
  );

  const setPrimaryWallet = useCallback(
    async (walletId: string): Promise<SetPrimaryWalletResponse> => {
      setActionError(null);
      try {
        const response = await setPrimaryMutation.mutateAsync(walletId);
        return response;
      } catch (err: unknown) {
        const message =
          err instanceof Error && err.message
            ? err.message
            : 'Failed to set primary wallet';
        setActionError(message);
        return {
          success: false,
          message,
        };
      }
    },
    [setPrimaryMutation]
  );

  const disconnectWallet = useCallback(
    async (walletOrId: ConnectedWallet | string): Promise<boolean> => {
      setActionError(null);
      const walletId =
        typeof walletOrId === 'string' ? walletOrId : walletOrId.id;
      const targetAddress =
        typeof walletOrId === 'object'
          ? walletOrId.address
          : wallets.find((w) => w.id === walletId)?.address;

      try {
        await disconnectMutation.mutateAsync(walletId);

        // Sync the shared wallet context when the removed wallet was active.
        if (targetAddress && targetAddress === address) {
          clearWalletState();
        } else if (!targetAddress && address) {
          const wasActive = wallets.some(
            (w) => w.id === walletId && w.address === address
          );
          if (wasActive) {
            clearWalletState();
          }
        }
        return true;
      } catch (err: unknown) {
        const message =
          err instanceof Error && err.message
            ? err.message
            : 'Failed to disconnect wallet';
        setActionError(message);
        return false;
      }
    },
    [address, clearWalletState, disconnectMutation, wallets]
  );

  return {
    wallets,
    activeWallet,
    activeAddress: address,
    isConnected,
    isLoading: isQueryLoading,
    isConnecting,
    isDisconnecting: disconnectMutation.isPending,
    isSettingPrimary: setPrimaryMutation.isPending,
    error,
    refetch,
    connectWallet,
    setPrimaryWallet,
    disconnectWallet,
    setActiveWallet,
  };
}
