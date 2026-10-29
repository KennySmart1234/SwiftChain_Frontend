import axios from 'axios';

/**
 * notificationPreferencesService — data access layer for notification
 * preferences.
 *
 * Layered Architecture: NotificationPreferences (component)
 *   -> useNotificationPreferences (hook) -> this service.
 *
 * All data is retrieved from the backend API — no inline mock objects.
 */

export type NotificationCategory =
  | 'deliveries'
  | 'escrow'
  | 'marketing'
  | 'system';

export type DeliveryStatusEvent =
  | 'created'
  | 'accepted'
  | 'in_transit'
  | 'delivered'
  | 'delayed';

export type EscrowActionEvent =
  | 'locked'
  | 'released'
  | 'disputed'
  | 'refunded';

export type NotificationChannel = 'in_app' | 'email';

export interface NotificationPreference {
  /** Stable identifier, e.g. "delivery_created_in_app" */
  key: string;
  category: NotificationCategory;
  label: string;
  description?: string;
  channel: NotificationChannel;
  enabled: boolean;
}

export interface NotificationPreferencesResponse {
  success: boolean;
  data?: NotificationPreference[];
  message?: string;
}

const PREFERENCES_ENDPOINT = '/api/notifications/preferences';

export const notificationPreferencesService = {
  /** Fetch the current user's notification preferences from the backend. */
  async getPreferences(): Promise<NotificationPreferencesResponse> {
    const response = await axios.get<NotificationPreferencesResponse>(
      PREFERENCES_ENDPOINT,
    );
    return response.data;
  },

  /** Persist preference changes to the backend. */
  async updatePreferences(
    preferences: NotificationPreference[],
  ): Promise<NotificationPreferencesResponse> {
    const response = await axios.put<NotificationPreferencesResponse>(
      PREFERENCES_ENDPOINT,
      { preferences },
    );
    return response.data;
  },
};
