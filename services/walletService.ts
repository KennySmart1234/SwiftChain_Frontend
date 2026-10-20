export interface WalletBalance {
  available: number;
  locked: number;
  pending: number;
  total: number;
  currency: string;
}

export interface BalanceCheckResult {
  hasSufficientBalance: boolean;
  balance: WalletBalance;
  requiredAmount: number;
}

class WalletService {
  private static instance: WalletService;
  private balanceCache: WalletBalance | null = null;
  private lastFetchTime: number = 0;
  private readonly CACHE_DURATION = 30000; // 30 seconds

  private constructor() {}

  static getInstance(): WalletService {
    if (!WalletService.instance) {
      WalletService.instance = new WalletService();
    }
    return WalletService.instance;
  }

  /**
   * Fetch wallet balance from backend API
   * Uses cache to prevent unnecessary API calls
   */
  async fetchBalance(forceRefresh = false): Promise<WalletBalance> {
    // Check cache first
    if (!forceRefresh && this.isCacheValid()) {
      return this.balanceCache!;
    }

    try {
      const response = await fetch('/api/wallet/balance', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch balance: ${response.statusText}`);
      }

      const data = await response.json();
      
      // Validate response structure
      const balance: WalletBalance = {
        available: data.data.available || 0,
        locked: data.data.locked || 0,
        pending: data.data.pending || 0,
        total: data.data.total || 0,
        currency: data.data.currency || 'USD',
      };

      // Update cache
      this.balanceCache = balance;
      this.lastFetchTime = Date.now();

      return balance;
    } catch (error) {
      console.error('Error fetching wallet balance:', error);
      // Return cached balance if available, otherwise default
      if (this.balanceCache) {
        return this.balanceCache;
      }
      throw error;
    }
  }

  /**
   * Check if user has sufficient balance for a transaction
   */
  async checkSufficientBalance(requiredAmount: number): Promise<BalanceCheckResult> {
    const balance = await this.fetchBalance();
    const hasSufficient = balance.available >= requiredAmount;

    return {
      hasSufficientBalance: hasSufficient,
      balance,
      requiredAmount,
    };
  }

  /**
   * Get cached balance immediately (synchronous)
   * Used for optimistic UI updates
   */
  getCachedBalance(): WalletBalance | null {
    return this.balanceCache;
  }

  /**
   * Pre-fetch balance for future use
   */
  async prefetchBalance(): Promise<void> {
    try {
      await this.fetchBalance();
    } catch (error) {
      // Silently fail - we'll try again later
      console.debug('Balance prefetch failed:', error);
    }
  }

  private isCacheValid(): boolean {
    return (
      this.balanceCache !== null &&
      Date.now() - this.lastFetchTime < this.CACHE_DURATION
    );
  }

  /**
   * Clear the cache (useful for logout or balance updates)
   */
  clearCache(): void {
    this.balanceCache = null;
    this.lastFetchTime = 0;
  }

  /**
   * Register a connected wallet public key with the backend.
   */
  async connect(publicKey: string): Promise<{ success: boolean; message?: string; publicKey: string }> {
    try {
      const response = await fetch('/api/wallet/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ publicKey }),
      });
      const data = await response.json();
      return { success: response.ok, message: data.message, publicKey };
    } catch (error) {
      console.error('Error connecting wallet:', error);
      return { success: false, message: 'Failed to connect wallet', publicKey };
    }
  }

  /**
   * Notify the backend to invalidate the wallet session.
   */
  async disconnect(): Promise<void> {
    try {
      await fetch('/api/wallet/disconnect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${typeof localStorage !== 'undefined' ? localStorage.getItem('authToken') : ''}`,
        },
      });
    } catch (error) {
      console.debug('Disconnect API call failed (session cleared client-side):', error);
    }
  }

  /**
   * Fetch the status of a blockchain transaction by hash.
   */
  async getTransactionStatus(transactionHash: string): Promise<import('@/types/transaction').TransactionResponse> {
    const response = await fetch(`/api/wallet/transaction/${transactionHash}`, {
      headers: {
        Authorization: `Bearer ${typeof localStorage !== 'undefined' ? localStorage.getItem('authToken') : ''}`,
      },
    });
    if (!response.ok) {
      throw new Error(`Failed to fetch transaction status: ${response.statusText}`);
    }
    return response.json();
  }

  /**
   * Fetch pending multi-signature operations for a wallet address.
   */
  async getPendingMultiSigOperations(
    walletAddress: string
  ): Promise<{ success: boolean; message?: string; operations?: import('@/hooks/useMultiSigApprovals').PendingMultiSigOperation[] }> {
    try {
      const response = await fetch(`/api/wallet/multisig/pending?address=${encodeURIComponent(walletAddress)}`, {
        headers: {
          Authorization: `Bearer ${typeof localStorage !== 'undefined' ? localStorage.getItem('authToken') : ''}`,
        },
      });
      const data = await response.json();
      return { success: response.ok, operations: data.data, message: data.message };
    } catch (error) {
      console.error('Error fetching multi-sig operations:', error);
      return { success: false, message: 'Failed to fetch pending operations' };
    }
  }

  /**
   * Submit a signature for a multi-sig operation.
   */
  async signMultiSigOperation(params: {
    operationId: string;
    signature: string;
    signerPublicKey: string;
  }): Promise<{ success: boolean; message?: string; currentSignatures?: number }> {
    try {
      const response = await fetch('/api/wallet/multisig/sign', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${typeof localStorage !== 'undefined' ? localStorage.getItem('authToken') : ''}`,
        },
        body: JSON.stringify(params),
      });
      const data = await response.json();
      return { success: response.ok, message: data.message, currentSignatures: data.currentSignatures };
    } catch (error) {
      console.error('Error signing multi-sig operation:', error);
      return { success: false, message: 'Failed to sign operation' };
    }
  }

}

export const walletService = WalletService.getInstance();