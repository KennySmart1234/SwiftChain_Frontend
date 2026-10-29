import { isAxiosError } from 'axios';
import api from '@/lib/api';
import type { AuditTrailEvent, AuditTrailResponse } from '@/types/auditTrail';

/**
 * auditTrailService — reads the immutable on-chain event log of a delivery.
 * Hooks call this; components never call this directly.
 *
 * Errors are thrown (not folded into the response) so query hooks can track
 * them as error state.
 */
export const auditTrailService = {
  async getDeliveryEvents(deliveryId: string, signal?: AbortSignal): Promise<AuditTrailEvent[]> {
    const fallback = 'Unable to load the audit trail. Please try again.';
    let response: AuditTrailResponse;
    try {
      const { data } = await api.get<AuditTrailResponse>(
        `/audit/delivery/${encodeURIComponent(deliveryId)}/events`,
        { signal },
      );
      response = data;
    } catch (error) {
      if (isAxiosError<{ message?: string }>(error)) {
        throw new Error(error.response?.data?.message ?? fallback);
      }
      throw error instanceof Error ? error : new Error(fallback);
    }

    if (!response.success || !response.data) {
      throw new Error(response.message ?? fallback);
    }
    return response.data.events ?? [];
  },
};
