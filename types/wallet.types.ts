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

export interface WalletTransaction {
  id: string;
  amount: number;
  type: 'send' | 'receive' | 'swap';
  status: 'pending' | 'completed' | 'failed';
  timestamp: string;
  hash?: string;
}

export interface ApiResponse<T> {
  status: 'success' | 'error';
  data?: T;
  message?: string;
  error?: string;
}

/**
 * A Web3 wallet linked to the authenticated account.
 * Returned by the backend so the client never invents wallet state locally.
 */
export interface ConnectedWallet {
  id: string;
  address: string;
  /** Wallet vendor, e.g. "freighter", "ledger", "walletconnect". */
  provider: string;
  network: 'public' | 'testnet';
  /** True for the wallet the backend considers the account's default. */
  isPrimary: boolean;
  connectedAt: string;
  /** Optional user-defined nickname for the wallet. */
  label?: string;
}

export interface ConnectedWalletsResponse {
  success: boolean;
  message?: string;
  data: ConnectedWallet[];
}

export interface SetPrimaryWalletResponse {
  success: boolean;
  message: string;
  data?: ConnectedWallet;
}

export interface ConnectWalletResponse {
  success: boolean;
  message: string;
  data?: ConnectedWallet;
  wallet?: ConnectedWallet;
}