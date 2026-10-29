/**
 * driverEarningsService — Service layer for the driver earnings wallet.
 *
 * Responsibilities:
 * - Fetches balance summary and payout history from the backend API.
 * - Submits Stellar wallet withdrawal requests.
 * - Validates withdrawals before they reach the network.
 * - Wraps the socket.io "earnings updated" event so hooks never touch the socket directly.
 *
 * Architecture: DriverEarningsDashboard → useDriverEarnings → driverEarningsService → Backend
 */

import api from '@/lib/api';
import { socketService } from '@/lib/websocket';
import type {
  DriverEarningsSummary,
  DriverPayout,
  DriverPayoutsResponse,
  WithdrawalRequest,
  WithdrawalResponse,
  WithdrawalValidation,
} from '@/types/driverEarnings';

export const EARNINGS_UPDATED_EVENT = 'driver:earnings:updated';

/** Stellar ed25519 public keys are "G" followed by 55 base32 characters. */
const STELLAR_PUBLIC_KEY_PATTERN = /^G[A-Z2-7]{55}$/;

export function isValidStellarAddress(address: string): boolean {
  return STELLAR_PUBLIC_KEY_PATTERN.test(address.trim());
}

/**
 * Formats an XLM amount for display, e.g. 1234.5 → "1,234.50 XLM".
 */
export function formatXlm(amount: number): string {
  return `${amount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 7,
  })} XLM`;
}

export const driverEarningsService = {
  async getSummary(): Promise<DriverEarningsSummary> {
    const { data } = await api.get<DriverEarningsSummary>('/driver/earnings/summary');
    return data;
  },

  async getPayouts(limit = 10): Promise<DriverPayout[]> {
    const { data } = await api.get<DriverPayoutsResponse>('/driver/earnings/payouts', {
      params: { limit },
    });
    return data.payouts;
  },

  async requestWithdrawal(request: WithdrawalRequest): Promise<DriverPayout> {
    const { data } = await api.post<WithdrawalResponse>('/driver/earnings/withdrawals', {
      amountXlm: request.amountXlm,
      destination: request.destination.trim(),
    });
    return data.payout;
  },

  /**
   * Validates a withdrawal against the currently available balance.
   * The backend re-validates; this exists to give the driver instant feedback.
   */
  validateWithdrawal(
    amountXlm: number,
    availableXlm: number,
    destination: string,
  ): WithdrawalValidation {
    if (!Number.isFinite(amountXlm) || amountXlm <= 0) {
      return { isValid: false, error: 'Enter an amount greater than 0.' };
    }
    if (amountXlm > availableXlm) {
      return {
        isValid: false,
        error: `Insufficient balance. You can withdraw up to ${formatXlm(availableXlm)}.`,
      };
    }
    if (!isValidStellarAddress(destination)) {
      return { isValid: false, error: 'Enter a valid Stellar public key (starts with G).' };
    }
    return { isValid: true, error: null };
  },

  /**
   * Subscribes to real-time earnings updates pushed by the backend.
   * Returns an unsubscribe function; a no-op when no socket is connected.
   */
  subscribeToUpdates(onUpdate: () => void): () => void {
    const socket = socketService.socket;
    if (!socket) return () => {};

    socket.on(EARNINGS_UPDATED_EVENT, onUpdate);
    return () => {
      socket.off(EARNINGS_UPDATED_EVENT, onUpdate);
    };
  },
};
