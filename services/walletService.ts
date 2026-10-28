import axios from 'axios';
import api from '@/lib/api';
import type { TransactionResponse } from '@/types/transaction';
import type {
  ConnectedWallet,
  ConnectedWalletsResponse,
  SetPrimaryWalletResponse,
  ConnectWalletResponse,
} from '@/types/wallet.types';
import type {
  PendingMultiSigResponse,
  SignMultiSigParams,
  SignMultiSigResponse,
} from '@/types/multiSig';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? '';
const STELLAR_TESTNET_EXPLORER = 'https://testnet.steexp.com/tx/';
const STELLAR_PUBLIC_EXPLORER = 'https://steexp.com/tx/';

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

export interface ConnectResponse {
  success: boolean;
  message: string;
  publicKey: string;
}

export interface DisconnectResponse {
  success: boolean;
  message: string;
}

export interface BalanceResponse {
  success: boolean;
  balance: number;
  message?: string;
}

export interface Signer {
  publicKey: string;
  weight: number;
  approved: boolean;
}

export interface PendingMultiSigOperation {
  operationId: string;
  transactionEnvelope: string;
  description: string;
  signaturesRequired: number;
  currentSignatures: number;
  signers: Signer[];
  createdAt: string;
  status: 'pending' | 'signed' | 'rejected' | 'expired';
  expiresAt: string;
}

export interface PendingMultiSigResponse {
  success: boolean;
  message: string;
  operations?: PendingMultiSigOperation[];
  totalCount?: number;
}

export interface SignMultiSigParams {
  operationId: string;
  signature: string;
  signerPublicKey: string;
}

export interface SignMultiSigResponse {
  success: boolean;
  message: string;
  transactionHash?: string;
  operationId?: string;
  currentSignatures?: number;
}

/**
 * walletService — responsible for all wallet-related API communication.
 * The hook calls this; components never call this directly.
 *
 * Layered Architecture: Component -> Hook -> Service
 */
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
   * Fetch pending multi-signature operations awaiting the given wallet's approval.
   */
  async getPendingMultiSigOperations(walletAddress: string): Promise<PendingMultiSigResponse> {
    const { data } = await api.get<PendingMultiSigResponse>('/wallet/multi-sig/pending', {
      params: { walletAddress },
    });
    return data;
  }

  /**
   * Submit a signature for a multi-sig operation. The backend broadcasts the
   * transaction once all required signatures are collected.
   */
  async signMultiSigOperation(params: SignMultiSigParams): Promise<SignMultiSigResponse> {
    const { data } = await api.post<SignMultiSigResponse>('/wallet/multi-sig/sign', params);
    return data;
  }

  /**
   * Clear the cache (useful for logout or balance updates)
   */
  clearCache(): void {
    this.balanceCache = null;
    this.lastFetchTime = 0;
  }

  /**
   * Registers the Freighter wallet session with the backend.
   * The backend verifies the public key and returns a confirmed session.
   */
  async connect(publicKey: string): Promise<ConnectResponse> {
    const { data } = await axios.post<ConnectResponse>(
      `${API_BASE_URL}/api/wallet/connect`,
      { publicKey }
    );
    return data;
  }

  async disconnect(): Promise<DisconnectResponse> {
    const { data } = await axios.post<DisconnectResponse>(
      `${API_BASE_URL}/api/wallet/disconnect`
    );
    return data;
  }

  /**
   * Fetch the XLM balance for the given wallet address from the backend.
   * The backend is the single source of truth — no Stellar SDK calls in the browser.
   */
  async getBalance(address: string): Promise<BalanceResponse> {
    const { data } = await axios.get<BalanceResponse>(
      `${API_BASE_URL}/api/wallet/balance`,
      { params: { address } }
    );
    return data;
  }

  /**
   * Poll the backend for the transaction status.
   * Returns current status and Stellar explorer URL.
   * Backend queries Horizon to determine if transaction was confirmed.
   */
  async getTransactionStatus(transactionHash: string): Promise<TransactionResponse> {
    const { data } = await axios.get<TransactionResponse>(
      `${API_BASE_URL}/api/wallet/transaction/${transactionHash}`
    );

    // Append explorer URL based on network
    const network = process.env.NEXT_PUBLIC_STELLAR_NETWORK || 'testnet';
    const explorerBase = network === 'public' ? STELLAR_PUBLIC_EXPLORER : STELLAR_TESTNET_EXPLORER;

    return {
      ...data,
      stellarExplorerUrl: `${explorerBase}${transactionHash}`,
    };
  }

  /**
   * Connect a new wallet with address and provider to the backend API.
   * Data Source: Retrieved from the backend API.
   */
  async connectWallet(
    address: string,
    walletType: string = 'freighter'
  ): Promise<ConnectWalletResponse> {
    const { data } = await axios.post<ConnectWalletResponse>(
      `${API_BASE_URL}/api/wallet/connected`,
      { address, provider: walletType, walletType }
    );

    if (!data.success) {
      throw new Error(data.message || 'Failed to connect wallet');
    }

    return data;
  }

  /**
   * Set a connected wallet as primary on the backend.
   * Returns confirmation response.
   */
  async setPrimaryWallet(walletId: string): Promise<SetPrimaryWalletResponse> {
    const { data } = await axios.put<SetPrimaryWalletResponse>(
      `${API_BASE_URL}/api/wallet/connected/${walletId}/primary`
    );

    if (!data.success) {
      throw new Error(data.message || 'Failed to set primary wallet');
    }

    return data;
  }

  /**
   * Fetch every Web3 wallet linked to the authenticated account.
   * Data Source: Retrieved from /api/wallet/connected backend endpoint.
   */
  async getConnectedWallets(signal?: AbortSignal): Promise<ConnectedWallet[]> {
    const { data } = await axios.get<ConnectedWalletsResponse>(
      `${API_BASE_URL}/api/wallet/connected`,
      { signal }
    );

    if (!data.success || !Array.isArray(data.data)) {
      throw new Error(data.message || 'Failed to fetch connected wallets');
    }

    return data.data;
  }

  /**
   * Unlink a single wallet from the authenticated account.
   * Disconnect clears wallet from backend.
   */
  async disconnectWallet(walletId: string): Promise<DisconnectResponse> {
    const { data } = await axios.delete<DisconnectResponse>(
      `${API_BASE_URL}/api/wallet/connected/${walletId}`
    );

    if (!data.success) {
      throw new Error(data.message || 'Failed to disconnect wallet');
    }

    return data;
  }
}

export const walletService = WalletService.getInstance();
