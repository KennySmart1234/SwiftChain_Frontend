import axios from 'axios';
import api from '@/lib/api';
import type {
  SettlementBreakdown,
  SettlementBreakdownResponse,
} from '@/types/settlementConfirmation';

const STELLAR_TESTNET_EXPLORER = 'https://testnet.steexp.com/tx/';
const STELLAR_PUBLIC_EXPLORER = 'https://steexp.com/tx/';

function explorerUrlFor(transactionHash: string): string {
  const network = process.env.NEXT_PUBLIC_STELLAR_NETWORK || 'testnet';
  const base = network === 'public' ? STELLAR_PUBLIC_EXPLORER : STELLAR_TESTNET_EXPLORER;
  return `${base}${transactionHash}`;
}

/**
 * settlementConfirmationService — reads the settled fund breakdown for an escrow.
 * The hook calls this; components never call this directly.
 */
export const settlementConfirmationService = {
  /**
   * Fetch the settlement breakdown for an escrow. Resolves to `null` when the
   * escrow has not been settled yet.
   */
  async getSettlementBreakdown(escrowId: string): Promise<SettlementBreakdown | null> {
    try {
      const { data } = await api.get<SettlementBreakdownResponse>(
        `/escrow/${encodeURIComponent(escrowId)}/settlement`,
      );

      if (!data.success) {
        throw new Error(data.message || 'Failed to load settlement details');
      }
      if (!data.data) return null;

      const { transactionHash } = data.data;
      return transactionHash
        ? { ...data.data, explorerUrl: explorerUrlFor(transactionHash) }
        : data.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) return null;
      throw error;
    }
  },
};
