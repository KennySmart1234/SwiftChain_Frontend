/**
 * Stellar withdrawal types for the driver wallet.
 * Asset amounts are whole units of {@link WithdrawalQuote.assetCode} (not stroops).
 */

export type StellarNetwork = 'public' | 'testnet';

/**
 * Pricing for a withdrawal on one network, returned by
 * GET /api/wallet/withdrawals/quote?network=...
 */
export interface WithdrawalQuote {
  /** Identifier the backend uses to honour the quoted fee and rate. */
  quoteId: string;
  network: StellarNetwork;
  /** Asset being withdrawn, e.g. "XLM". */
  assetCode: string;
  /** Balance that can be withdrawn, before fees. */
  availableBalance: number;
  /** Estimated network fee, charged on top of the withdrawal amount. */
  networkFee: number;
  /** Smallest amount the backend accepts for a withdrawal. */
  minimumWithdrawal: number;
  /** ISO 4217 code of the fiat display currency, e.g. "USD". */
  fiatCurrency: string;
  /** Fiat value of one unit of {@link assetCode}. */
  fiatRate: number;
  /** ISO 8601 time the quote was produced. */
  quotedAt: string;
}

export interface WithdrawalRequest {
  quoteId: string;
  network: StellarNetwork;
  destination: string;
  amount: number;
}

export type WithdrawalStatus = 'pending' | 'submitted' | 'completed' | 'failed';

export interface WithdrawalReceipt {
  id: string;
  amount: number;
  fee: number;
  assetCode: string;
  destination: string;
  network: StellarNetwork;
  status: WithdrawalStatus;
  /** Stellar transaction hash, present once submitted to the network. */
  txHash?: string;
  createdAt: string;
}

export interface WithdrawalApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
}
