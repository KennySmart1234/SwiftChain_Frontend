import axios from 'axios';
import type { Notification } from '@/context/NotificationContext';
import { apiClient } from './api';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? '';

export type { Notification };

export type NotificationPreferences = Record<string, boolean>;

export interface UpdateResponse {
  preferences: NotificationPreferences;
}

export interface ResetResponse {
  preferences: NotificationPreferences;
}

export class APIError extends Error {
  readonly status?: number;
  readonly code?: string;

  constructor(
    message: string,
    status?: number,
    code?: string,
  ) {
    super(message);
    this.name = 'APIError';
    this.status = status;
    this.code = code;
  }
}

interface ApiErrorResponse {
  message?: unknown;
  error?: unknown;
}

function normalizeApiError(error: unknown): APIError {
  if (axios.isAxiosError<ApiErrorResponse>(error)) {
    const responseData = error.response?.data;
    const message =
      (typeof responseData?.message === 'string' && responseData.message) ||
      (typeof responseData?.error === 'string' && responseData.error) ||
      error.message ||
      'Request failed';

    return new APIError(message, error.response?.status, error.code);
  }

  return new APIError(
    error instanceof Error ? error.message : 'An unexpected error occurred',
  );
}

async function request<T>(operation: () => Promise<{ data: T }>): Promise<T> {
  try {
    const { data } = await operation();
    return data;
  } catch (error) {
    throw normalizeApiError(error);
  }
}

function preferencesPath(userId: string): string {
  return `/users/${encodeURIComponent(userId)}/notification-preferences`;
}

export const notificationService = {
  async getPreferences(userId: string): Promise<NotificationPreferences> {
    return request(() =>
      apiClient.get<NotificationPreferences>(preferencesPath(userId)),
    );
  },

  async updatePreferences(
    userId: string,
    updates: Partial<NotificationPreferences>,
  ): Promise<UpdateResponse> {
    return request(() =>
      apiClient.patch<UpdateResponse>(preferencesPath(userId), updates),
    );
  },

  async resetToDefaults(userId: string): Promise<ResetResponse> {
    return request(() =>
      apiClient.post<ResetResponse>(`${preferencesPath(userId)}/reset`),
    );
  },

  async getNotifications(): Promise<Notification[]> {
    const { data } = await axios.get<Notification[]>(
      `${API_BASE_URL}/api/notifications`,
    );
    return data;
  },

  async markAllAsRead(): Promise<void> {
    await axios.post(`${API_BASE_URL}/api/notifications/read-all`);
  },
};