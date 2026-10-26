/**
 * useToast Hook
 * Custom hook for managing toast notifications
 * Integrates with toastService for dispatching notifications
 */

'use client';

import { useCallback, useEffect, useState } from 'react';
import { toastService, ToastConfig, ToastMessage } from '@/lib/toast';

export interface UseToastReturn {
  success: (_message: string, _description?: string, _duration?: number) => void;
  error: (_message: string, _description?: string, _duration?: number) => void;
  info: (_message: string, _description?: string, _duration?: number) => void;
  loading: (_message: string, _description?: string) => void;
  toast: (_config: ToastConfig) => void;
  isLoading: boolean;
  notifications: ToastMessage[];
  fetchNotifications: () => Promise<void>;
}

/**
 * Hook that provides toast notification functions
 * Manages notification fetching from backend API
 */
export function useToast(): UseToastReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [notifications, setNotifications] = useState<ToastMessage[]>([]);

  /**
   * Fetch notifications from backend API
   */
  const fetchNotifications = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await toastService.fetchToastMessages();

      if (response.success && response.data) {
        setNotifications(response.data);

        // Auto-show urgent notifications
        response.data.forEach((notif) => {
          if (notif.variant === 'error' || notif.variant === 'loading') {
            toastService[notif.variant](
              notif.title,
              notif.message,
              notif.duration
            );
          }
        });
      }
    } catch {
      setNotifications([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Fetch notifications on mount
   */
  useEffect(() => {
    // Optionally fetch notifications on mount
    // Commented out for now as it might be called elsewhere
    // fetchNotifications();
  }, [fetchNotifications]);

  /**
   * Show success notification
   */
  const showSuccess = useCallback(
    (message: string, description?: string, duration?: number) => {
      toastService.success(message, description, duration);
    },
    []
  );

  /**
   * Show error notification
   */
  const showError = useCallback(
    (message: string, description?: string, duration?: number) => {
      toastService.error(message, description, duration);
    },
    []
  );

  /**
   * Show info notification
   */
  const showInfo = useCallback(
    (message: string, description?: string, duration?: number) => {
      toastService.info(message, description, duration);
    },
    []
  );

  /**
   * Show loading notification
   */
  const showLoading = useCallback((message: string, description?: string) => {
    toastService.loading(message, description);
  }, []);

  const showToast = useCallback((config: ToastConfig) => {
    const { message, description, variant, duration } = config;
    switch (variant) {
      case 'error':
        toastService.error(message, description, duration);
        break;
      case 'loading':
        toastService.loading(message, description);
        break;
      case 'success':
        toastService.success(message, description, duration);
        break;
      case 'info':
      default:
        toastService.info(message, description, duration);
        break;
    }
  }, []);

  return {
    success: showSuccess,
    error: showError,
    info: showInfo,
    loading: showLoading,
    toast: showToast,
    isLoading,
    notifications,
    fetchNotifications,
  };
}
