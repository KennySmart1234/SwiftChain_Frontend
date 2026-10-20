/**
 * networkService — responsible for monitoring network connectivity status.
 * This follows the Strict Layered Architecture (Service layer).
 */
export const networkService = {
  /**
   * Returns the current online status.
   */
  getIsOnline: (): boolean => {
    if (typeof window === 'undefined') return true;
    return navigator.onLine;
  },

  /**
   * Subscribes to online/offline events.
   * Returns a cleanup function.
   */
  subscribe: (callback: (isOnline: boolean) => void) => {
    if (typeof window === 'undefined') return () => {};

    const handleOnline = () => callback(true);
    const handleOffline = () => callback(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  },

  /**
   * Fetches the network information for a connected wallet address from the backend.
   * Used by useNetworkCheck to verify the wallet is on the expected Stellar network.
   */
  getWalletNetwork: async (
    address: string
  ): Promise<{
    success: boolean;
    message?: string;
    data?: { network: string; chainId?: number | null };
  }> => {
    try {
      const response = await fetch(
        `/api/wallet/network?address=${encodeURIComponent(address)}`
      );
      const data = await response.json();
      return { success: response.ok, data: data.data, message: data.message };
    } catch {
      return { success: false, message: 'Failed to check wallet network' };
    }
  },
};