import axios from 'axios';
import api from '@/lib/api';
import type {
  DriverWalletApiEnvelope,
  DriverWalletErrorCode,
  EarningsSummary,
  PaginatedResponse,
  PayoutHistoryOptions,
  PayoutRecord,
  WithdrawalParams,
  WithdrawalResponse,
  WithdrawalStatus,
} from '@/types/driverWallet';

/** Stellar public keys are 56 characters: `G` followed by 55 base32 characters. */
const STELLAR_PUBLIC_KEY_PATTERN = /^G[A-Z2-7]{55}$/;
/** Stellar text memos are limited to 28 bytes. */
const MAX_MEMO_BYTES = 28;

/**
 * Normalized error thrown by every driverWalletService method, so hooks can
 * branch on `code` instead of inspecting axios internals.
 */
export class DriverWalletServiceError extends Error {
  readonly code: DriverWalletErrorCode;
  readonly status?: number;

  constructor(message: string, code: DriverWalletErrorCode, status?: number) {
    super(message);
    this.name = 'DriverWalletServiceError';
    this.code = code;
    this.status = status;
  }
}

function codeFromStatus(status: number): DriverWalletErrorCode {
  if (status === 401) return 'UNAUTHORIZED';
  if (status === 403) return 'FORBIDDEN';
  if (status === 404) return 'NOT_FOUND';
  if (status === 400 || status === 422) return 'VALIDATION_ERROR';
  if (status >= 500) return 'SERVER_ERROR';
  return 'API_ERROR';
}

const KNOWN_API_CODES: readonly DriverWalletErrorCode[] = [
  'VALIDATION_ERROR',
  'INSUFFICIENT_BALANCE',
  'NOT_FOUND',
  'UNAUTHORIZED',
  'FORBIDDEN',
];

function isKnownCode(code: unknown): code is DriverWalletErrorCode {
  return typeof code === 'string' && KNOWN_API_CODES.includes(code as DriverWalletErrorCode);
}

/**
 * Converts any thrown value into a DriverWalletServiceError.
 */
export function normalizeDriverWalletError(
  error: unknown,
  fallbackMessage: string,
): DriverWalletServiceError {
  if (error instanceof DriverWalletServiceError) return error;

  if (axios.isAxiosError(error)) {
    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
      return new DriverWalletServiceError('The wallet service timed out. Please try again.', 'TIMEOUT');
    }

    if (!error.response) {
      return new DriverWalletServiceError(
        'Unable to reach the wallet service. Check your connection.',
        'NETWORK_ERROR',
      );
    }

    const { status, data } = error.response;
    const body = (data ?? {}) as Partial<DriverWalletApiEnvelope<unknown>>;
    const code = isKnownCode(body.code) ? body.code : codeFromStatus(status);
    return new DriverWalletServiceError(body.message || fallbackMessage, code, status);
  }

  if (error instanceof Error) {
    return new DriverWalletServiceError(error.message || fallbackMessage, 'UNKNOWN_ERROR');
  }

  return new DriverWalletServiceError(fallbackMessage, 'UNKNOWN_ERROR');
}

/** Unwraps the backend envelope, turning `success: false` into a typed error. */
function unwrap<T>(envelope: DriverWalletApiEnvelope<T>, fallbackMessage: string): T {
  if (!envelope?.success || envelope.data === undefined) {
    const code = isKnownCode(envelope?.code) ? envelope.code : 'API_ERROR';
    throw new DriverWalletServiceError(envelope?.message || fallbackMessage, code);
  }
  return envelope.data;
}

function requireId(value: string, label: string): string {
  const trimmed = value?.trim();
  if (!trimmed) {
    throw new DriverWalletServiceError(`${label} is required.`, 'VALIDATION_ERROR');
  }
  return encodeURIComponent(trimmed);
}

function utf8ByteLength(value: string): number {
  return encodeURIComponent(value).replace(/%[0-9A-F]{2}/g, '_').length;
}

function validateWithdrawal(params: WithdrawalParams): void {
  if (!Number.isFinite(params.amount) || params.amount <= 0) {
    throw new DriverWalletServiceError('Withdrawal amount must be greater than zero.', 'VALIDATION_ERROR');
  }
  if (!params.currency?.trim()) {
    throw new DriverWalletServiceError('Withdrawal currency is required.', 'VALIDATION_ERROR');
  }
  if (!STELLAR_PUBLIC_KEY_PATTERN.test(params.destinationAddress ?? '')) {
    throw new DriverWalletServiceError(
      'Destination must be a valid Stellar public key.',
      'VALIDATION_ERROR',
    );
  }
  if (params.memo && utf8ByteLength(params.memo) > MAX_MEMO_BYTES) {
    throw new DriverWalletServiceError(
      `Memo must be at most ${MAX_MEMO_BYTES} bytes.`,
      'VALIDATION_ERROR',
    );
  }
}

/**
 * driverWalletService — driver earnings, payout history and Stellar withdrawals.
 * The hook calls this; components never call this directly.
 *
 * All requests go through the shared `api` client, which reads its base URL
 * from `NEXT_PUBLIC_API_URL` and attaches the auth token.
 */
export const driverWalletService = {
  async getEarningsSummary(driverId: string): Promise<EarningsSummary> {
    const message = 'Failed to load earnings summary';
    try {
      const id = requireId(driverId, 'Driver ID');
      const { data } = await api.get<DriverWalletApiEnvelope<EarningsSummary>>(
        `/drivers/${id}/wallet/earnings`,
      );
      return unwrap(data, message);
    } catch (error) {
      throw normalizeDriverWalletError(error, message);
    }
  },

  async getPayoutHistory(
    driverId: string,
    options: PayoutHistoryOptions = {},
  ): Promise<PaginatedResponse<PayoutRecord>> {
    const message = 'Failed to load payout history';
    try {
      const id = requireId(driverId, 'Driver ID');
      const { page = 1, limit = 20, status, from, to } = options;
      const { data } = await api.get<DriverWalletApiEnvelope<PaginatedResponse<PayoutRecord>>>(
        `/drivers/${id}/wallet/payouts`,
        { params: { page, limit, status, from, to } },
      );
      return unwrap(data, message);
    } catch (error) {
      throw normalizeDriverWalletError(error, message);
    }
  },

  async requestWithdrawal(driverId: string, params: WithdrawalParams): Promise<WithdrawalResponse> {
    const message = 'Failed to request withdrawal';
    try {
      const id = requireId(driverId, 'Driver ID');
      validateWithdrawal(params);
      const { data } = await api.post<DriverWalletApiEnvelope<WithdrawalResponse>>(
        `/drivers/${id}/wallet/withdrawals`,
        params,
      );
      return unwrap(data, message);
    } catch (error) {
      throw normalizeDriverWalletError(error, message);
    }
  },

  async getWithdrawalStatus(withdrawalId: string): Promise<WithdrawalStatus> {
    const message = 'Failed to load withdrawal status';
    try {
      const id = requireId(withdrawalId, 'Withdrawal ID');
      const { data } = await api.get<DriverWalletApiEnvelope<WithdrawalStatus>>(
        `/wallet/withdrawals/${id}`,
      );
      return unwrap(data, message);
    } catch (error) {
      throw normalizeDriverWalletError(error, message);
    }
  },
};
