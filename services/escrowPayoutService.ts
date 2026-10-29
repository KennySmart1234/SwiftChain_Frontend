import api from '@/lib/api';
import type { PayoutFeeQuote } from '@/types/escrow';

interface PayoutFeeQuoteResponse {
  success: boolean;
  data?: PayoutFeeQuote;
  message?: string;
}

/**
 * escrowPayoutService — reads the fee inputs for an escrow payout from the
 * backend. The hook calls this; components never call this directly.
 */
export const escrowPayoutService = {
  /**
   * Fetch the current escrow amount, platform commission and gas estimate
   * for releasing the given escrow.
   */
  async getPayoutFeeQuote(escrowId: string): Promise<PayoutFeeQuote> {
    const { data } = await api.get<PayoutFeeQuoteResponse>(
      `/escrow/${encodeURIComponent(escrowId)}/payout-quote`,
    );
    if (!data.success || !data.data) {
      throw new Error(data.message || 'Failed to load payout fees');
    }
    return data.data;
  },
};
