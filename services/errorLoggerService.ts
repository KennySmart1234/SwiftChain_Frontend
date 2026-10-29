import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? '';

export interface ErrorLogPayload {
  message: string;
  stack?: string;
  componentStack?: string;
  timestamp: string;
  userAgent: string;
  userId?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  source: 'react' | 'javascript' | 'network' | 'unknown';
  url: string;
  additionalData?: Record<string, unknown>;
}

export interface ErrorLogResponse {
  success: boolean;
  errorId?: string;
  message: string;
}

class ErrorLoggerService {
  /**
   * Log an error to the backend API
   */
  async logError(payload: ErrorLogPayload): Promise<ErrorLogResponse> {
    try {
      const { data } = await axios.post<ErrorLogResponse>(
        `${API_BASE_URL}/api/errors/log`,
        payload,
        {
          timeout: 5000, // 5 second timeout to avoid blocking the app
        }
      );
      return data;
    } catch (error) {
      // Silently fail if logging fails - don't create infinite loop
      console.error('Failed to log error to backend:', error);
      return {
        success: false,
        message: 'Failed to log error',
      };
    }
  }

  /**
   * Log a React error boundary error
   */
  async logReactError(
    error: Error,
    errorInfo: { componentStack?: string },
    additionalData?: Record<string, unknown>
  ): Promise<ErrorLogResponse> {
    const payload: ErrorLogPayload = {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo?.componentStack,
      timestamp: new Date().toISOString(),
      userAgent: typeof window !== 'undefined' ? navigator.userAgent : 'unknown',
      severity: 'high',
      source: 'react',
      url: typeof window !== 'undefined' ? window.location.href : 'unknown',
      additionalData,
    };

    return this.logError(payload);
  }

  /**
   * Log a JavaScript error
   */
  async logJSError(
    error: unknown,
    additionalData?: Record<string, unknown>
  ): Promise<ErrorLogResponse> {
    const errorObj = error instanceof Error ? error : new Error(String(error));

    const payload: ErrorLogPayload = {
      message: errorObj.message || 'Unknown JavaScript error',
      stack: errorObj.stack,
      timestamp: new Date().toISOString(),
      userAgent: typeof window !== 'undefined' ? navigator.userAgent : 'unknown',
      severity: 'medium',
      source: 'javascript',
      url: typeof window !== 'undefined' ? window.location.href : 'unknown',
      additionalData,
    };

    return this.logError(payload);
  }

  /**
   * Log a network error
   */
  async logNetworkError(
    error: unknown,
    endpoint?: string,
    additionalData?: Record<string, unknown>
  ): Promise<ErrorLogResponse> {
    const errorObj = error instanceof Error ? error : new Error(String(error));

    const payload: ErrorLogPayload = {
      message: `Network error: ${errorObj.message}`,
      stack: errorObj.stack,
      timestamp: new Date().toISOString(),
      userAgent: typeof window !== 'undefined' ? navigator.userAgent : 'unknown',
      severity: 'medium',
      source: 'network',
      url: typeof window !== 'undefined' ? window.location.href : 'unknown',
      additionalData: {
        ...additionalData,
        endpoint,
      },
    };

    return this.logError(payload);
  }

  /**
   * Get error logs for a specific user (admin endpoint)
   */
  async getErrorLogs(userId?: string): Promise<ErrorLogPayload[]> {
    try {
      const params = userId ? { userId } : {};
      const { data } = await axios.get<ErrorLogPayload[]>(
        `${API_BASE_URL}/api/errors/logs`,
        { params }
      );
      return data;
    } catch (error) {
      console.error('Failed to fetch error logs:', error);
      return [];
    }
  }

  /**
   * Clear error logs (admin endpoint)
   */
  async clearErrorLogs(olderThanDays?: number): Promise<ErrorLogResponse> {
    try {
      const params = olderThanDays ? { olderThanDays } : {};
      const { data } = await axios.delete<ErrorLogResponse>(
        `${API_BASE_URL}/api/errors/logs`,
        { params }
      );
      return data;
    } catch (error) {
      console.error('Failed to clear error logs:', error);
      return {
        success: false,
        message: 'Failed to clear error logs',
      };
    }
  }
}

export const errorLoggerService = new ErrorLoggerService();
