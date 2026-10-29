/**
 * Toast Service
 * Manages toast notifications with backend API integration
 * Provides utilities for displaying different toast types
 */

import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? '';

/**
 * Toast variant types
 */
export type ToastVariant = 'success' | 'error' | 'info' | 'loading' | 'default' | 'destructive';

/**
 * Toast configuration from backend
 */
export interface ToastConfig {
  /** Short title shown in bold (alias for message when message is omitted) */
  title?: string;
  variant?: ToastVariant;
  /** Main message body */
  message?: string;
  duration?: number;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

/**
 * Toast message from API
 */
export interface ToastMessage {
  id: string;
  variant: ToastVariant;
  title: string;
  message: string;
  dismissible: boolean;
  duration?: number;
}

/**
 * API Response type
 */
export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data?: T;
}

/**
 * Toast callback function type
 */
type ToastCallback = (config: ToastConfig) => void;

/**
 * Toast Service - manages toast notifications
 * Follows the Service pattern for clean separation of concerns
 */
class ToastService {
  private listeners: Set<ToastCallback> = new Set();
  private readonly DEFAULT_DURATION = 4000; // 4 seconds
  private lastNotificationId: string | null = null;

  /**
   * Subscribe to toast events
   * @param callback - Function to call when toast should be shown
   * @returns Unsubscribe function
   */
  subscribe(callback: ToastCallback): () => void {
    this.listeners.add(callback);

    return () => {
      this.listeners.delete(callback);
    };
  }

  /**
   * Emit toast to all listeners
   * @param config - Toast configuration
   */
  private emit(config: ToastConfig): void {
    // Ensure duration is set
    const finalConfig: ToastConfig = {
      ...config,
      duration: config.duration ?? this.DEFAULT_DURATION,
    };

    this.listeners.forEach((callback) => callback(finalConfig));
  }

  /**
   * Show success toast
   * @param message - Success message
   * @param description - Optional description
   * @param duration - Optional duration (ms)
   */
  success(message: string, description?: string, duration?: number): void {
    this.emit({
      variant: 'success',
      message,
      description,
      duration: duration ?? this.DEFAULT_DURATION,
    });
  }

  /**
   * Show error toast
   * @param message - Error message
   * @param description - Optional description
   * @param duration - Optional duration (ms)
   */
  error(message: string, description?: string, duration?: number): void {
    this.emit({
      variant: 'error',
      message,
      description,
      duration: duration ?? this.DEFAULT_DURATION,
    });
  }

  /**
   * Show info toast
   * @param message - Info message
   * @param description - Optional description
   * @param duration - Optional duration (ms)
   */
  info(message: string, description?: string, duration?: number): void {
    this.emit({
      variant: 'info',
      message,
      description,
      duration: duration ?? this.DEFAULT_DURATION,
    });
  }

  /**
   * Show loading toast
   * @param message - Loading message
   * @param description - Optional description
   */
  loading(message: string, description?: string): void {
    this.emit({
      variant: 'loading',
      message,
      description,
      duration: 0, // Loading toasts don't auto-dismiss
    });
  }

  /**
   * Fetch toast messages from backend API
   * Used for notification center or system alerts
   * @returns Promise with toast messages
   */
  async fetchToastMessages(): Promise<ApiResponse<ToastMessage[]>> {
    try {
      const { data } = await axios.get<ApiResponse<ToastMessage[]>>(
        `${API_BASE_URL}/api/notifications/toasts`
      );
      return data;
    } catch (error: any) {
      console.error('Failed to fetch toast messages:', error.message);
      return {
        success: false,
        message: 'Failed to fetch notifications',
        data: [],
      };
    }
  }

  /**
   * Fetch toast configuration from backend
   * @returns Promise with toast configuration
   */
  async getToastConfig(): Promise<ApiResponse<{ duration: number; position: string }>> {
    try {
      const { data } = await axios.get(
        `${API_BASE_URL}/api/notifications/config`
      );
      return data;
    } catch (error: any) {
      console.error('Failed to fetch toast config:', error.message);
      return {
        success: false,
        message: 'Failed to fetch configuration',
        data: {
          duration: 4000,
          position: 'bottom-right',
        },
      };
    }
  }

  /**
   * Mark a toast notification as read (on backend)
   * @param notificationId - ID of the notification
   */
  async markAsRead(notificationId: string): Promise<ApiResponse<any>> {
    try {
      const { data } = await axios.patch(
        `${API_BASE_URL}/api/notifications/${notificationId}/read`
      );
      return data;
    } catch (error: any) {
      console.error('Failed to mark notification as read:', error.message);
      return {
        success: false,
        message: 'Failed to mark as read',
      };
    }
  }

  /**
   * Get last notification ID (for reference)
   */
  getLastNotificationId(): string | null {
    return this.lastNotificationId;
  }

  /**
   * Set last notification ID
   */
  setLastNotificationId(id: string): void {
    this.lastNotificationId = id;
  }
}

// Export singleton instance
export const toastService = new ToastService();
