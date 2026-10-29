import axios from 'axios';
import type {
  RefundStatusResponse,
  RefundErrorResponse,
} from '@/types/refund';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? '';

/**
 * refundService — owns all refund-related HTTP communication for
 * cancellation and refund tracking flows.
 * 
 * Hooks call this; components must never call it directly.
 * All responses are sourced from the live backend API.
 * No inline mock objects are used.
 */
export const refundService = {
  /**
   * Fetch the refund status and timeline for a cancelled shipment.
   * Called repeatedly by useRefundStatus hook to poll for updates.
   * 
   * @param shipmentId - The ID of the cancelled shipment
   * @returns RefundStatusResponse with current status, amount, and timeline events
   * @throws Error if the request fails or response is invalid
   */
  async getRefundStatus(shipmentId: string): Promise<RefundStatusResponse> {
    if (!shipmentId || typeof shipmentId !== 'string') {
      throw new Error('Invalid shipment ID');
    }

    try {
      const { data } = await axios.get<RefundStatusResponse>(
        `${API_BASE_URL}/api/refund/mine/${shipmentId}`
      );

      // Validate response structure
      if (
        !data ||
        typeof data.shipmentId !== 'string' ||
        typeof data.status !== 'string' ||
        typeof data.amount !== 'number' ||
        !Array.isArray(data.timeline)
      ) {
        throw new Error('Invalid refund status response structure');
      }

      return data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        // Re-throw Axios errors with context
        throw error;
      }
      throw error;
    }
  },

  /**
   * Retry a failed refund operation.
   * Called when refund is in 'failed' state and user requests retry.
   * 
   * @param shipmentId - The ID of the shipment with failed refund
   * @returns Updated RefundStatusResponse after retry attempt
   * @throws Error if the retry request fails
   */
  async retryRefund(shipmentId: string): Promise<RefundStatusResponse> {
    if (!shipmentId || typeof shipmentId !== 'string') {
      throw new Error('Invalid shipment ID');
    }

    try {
      const { data } = await axios.post<RefundStatusResponse>(
        `${API_BASE_URL}/api/refund/mine/${shipmentId}/retry`
      );

      // Validate response structure
      if (
        !data ||
        typeof data.shipmentId !== 'string' ||
        typeof data.status !== 'string'
      ) {
        throw new Error('Invalid retry refund response structure');
      }

      return data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw error;
      }
      throw error;
    }
  },
};
