'use client';

import { useCallback } from 'react';
import { errorLoggerService } from '@/services/errorLoggerService';

export interface ErrorHandlerOptions {
  silent?: boolean; // Don't log to console if true
  notify?: boolean; // Show toast notification if true
  throwError?: boolean; // Re-throw the error after handling if true
  additionalData?: Record<string, unknown>;
}

export function useErrorHandler() {
  /**
   * Handle and log a React error from an error boundary
   */
  const handleReactError = useCallback(
    async (error: Error, errorInfo: { componentStack?: string }, options: ErrorHandlerOptions = {}) => {
      const { silent = false, notify = false, throwError = false, additionalData } = options;

      if (!silent) {
        console.error('React Error:', error);
        console.error('Component Stack:', errorInfo?.componentStack);
      }

      // Log error to backend
      await errorLoggerService.logReactError(error, errorInfo, additionalData);

      if (notify) {
        // Toast notification could be added here
        console.warn('Error occurred - user should be notified');
      }

      if (throwError) {
        throw error;
      }
    },
    []
  );

  /**
   * Handle and log a JavaScript error
   */
  const handleJSError = useCallback(
    async (error: unknown, options: ErrorHandlerOptions = {}) => {
      const { silent = false, notify = false, throwError = false, additionalData } = options;

      if (!silent) {
        console.error('JS Error:', error);
      }

      // Log error to backend
      await errorLoggerService.logJSError(error, additionalData);

      if (notify) {
        console.warn('Error occurred - user should be notified');
      }

      if (throwError && error instanceof Error) {
        throw error;
      }
    },
    []
  );

  /**
   * Handle and log a network error
   */
  const handleNetworkError = useCallback(
    async (error: unknown, endpoint?: string, options: ErrorHandlerOptions = {}) => {
      const { silent = false, notify = false, throwError = false, additionalData } = options;

      if (!silent) {
        console.error('Network Error:', error);
      }

      // Log error to backend
      await errorLoggerService.logNetworkError(error, endpoint, additionalData);

      if (notify) {
        console.warn('Network error occurred - user should be notified');
      }

      if (throwError && error instanceof Error) {
        throw error;
      }
    },
    []
  );

  /**
   * Handle generic error with automatic detection
   */
  const handleError = useCallback(
    async (error: unknown, options: ErrorHandlerOptions = {}) => {
      const { silent = false, notify = false, throwError = false, additionalData } = options;

      if (!silent) {
        console.error('Error:', error);
      }

      // Log error to backend
      await errorLoggerService.logJSError(error, additionalData);

      if (notify) {
        console.warn('Error occurred - user should be notified');
      }

      if (throwError && error instanceof Error) {
        throw error;
      }
    },
    []
  );

  return {
    handleReactError,
    handleJSError,
    handleNetworkError,
    handleError,
  };
}
