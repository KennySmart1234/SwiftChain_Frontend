/**
 * Refund-related types and interfaces for cancellation and refund tracking.
 * Defines the structure of refund status responses from the backend API.
 */

/**
 * Represents the current state of a refund process.
 * Refunds transition: pending → processing → completed (or failed)
 */
export type RefundStatus = 'pending' | 'processing' | 'completed' | 'failed';

/**
 * Timeline event representing a state change in the refund process.
 * Each event marks a transition in the refund lifecycle.
 */
export interface RefundTimelineEvent {
  id: string;
  status: RefundStatus;
  timestamp: string;
  description?: string;
}

/**
 * Represents the complete refund status and timeline for a cancelled shipment.
 * Returned by the `/api/refund/mine/{shipmentId}` endpoint.
 */
export interface RefundStatusResponse {
  shipmentId: string;
  status: RefundStatus;
  amount: number;
  currency: string;
  cancellationReason?: string;
  expectedCompletionTime?: string;
  timeline: RefundTimelineEvent[];
  failureReason?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Error response for failed refund queries or operations.
 * Provides actionable error information for UI display and retry logic.
 */
export interface RefundErrorResponse {
  success: false;
  message: string;
  errorCode?: string;
  retryable?: boolean;
}
