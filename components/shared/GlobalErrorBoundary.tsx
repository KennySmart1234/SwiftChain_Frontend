'use client';

import React, { Component, ReactNode } from 'react';
import { ErrorFallbackUI } from './ErrorFallbackUI';
import { errorLoggerService } from '@/services/errorLoggerService';

export interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  isDarkMode?: boolean;
  resetKeys?: (string | number)[];
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

/**
 * Global Error Boundary component that catches React rendering errors
 * and displays a fallback UI instead of crashing the entire application.
 *
 * Usage:
 * ```tsx
 * <GlobalErrorBoundary isDarkMode={isDark} onError={handleError}>
 *   <App />
 * </GlobalErrorBoundary>
 * ```
 */
export class GlobalErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Update state with error info
    this.setState({
      errorInfo,
    });

    // Log error to backend
    this.logErrorToBackend(error, errorInfo);

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Error caught by ErrorBoundary:', error);
      console.error('Component Stack:', errorInfo.componentStack);
    }
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps) {
    // Reset error boundary when resetKeys change
    if (this.state.hasError && this.props.resetKeys && prevProps.resetKeys) {
      const hasResetKeyChanged = this.props.resetKeys.some(
        (key, index) => key !== prevProps.resetKeys?.[index]
      );

      if (hasResetKeyChanged) {
        this.resetErrorBoundary();
      }
    }
  }

  /**
   * Log error to backend API
   */
  private logErrorToBackend = async (error: Error, errorInfo: React.ErrorInfo) => {
    try {
      await errorLoggerService.logReactError(error, errorInfo, {
        boundaryComponent: 'GlobalErrorBoundary',
        environment: process.env.NODE_ENV,
      });
    } catch (logError) {
      // Silently fail if logging fails
      if (process.env.NODE_ENV === 'development') {
        console.error('Failed to log error to backend:', logError);
      }
    }
  };

  /**
   * Reset error boundary state
   */
  resetErrorBoundary = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  /**
   * Navigate to home page
   */
  handleGoHome = () => {
    this.resetErrorBoundary();
    if (typeof window !== 'undefined') {
      window.location.href = '/';
    }
  };

  /**
   * Reload the page
   */
  handleReload = () => {
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Use default fallback UI
      return (
        <ErrorFallbackUI
          error={this.state.error}
          onReload={this.handleReload}
          onGoHome={this.handleGoHome}
          isDarkMode={this.props.isDarkMode}
        />
      );
    }

    return this.props.children;
  }
}
