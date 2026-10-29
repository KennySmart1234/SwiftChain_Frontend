'use client';

import React from 'react';
import { AlertCircle, RefreshCw, Home } from 'lucide-react';

export interface ErrorFallbackUIProps {
  error?: Error | null;
  onReload?: () => void;
  onGoHome?: () => void;
  isDarkMode?: boolean;
}

/**
 * Fallback UI component displayed when an error is caught by the error boundary
 */
export function ErrorFallbackUI({
  error,
  onReload,
  onGoHome,
  isDarkMode = false,
}: ErrorFallbackUIProps) {
  const handleReload = () => {
    if (onReload) {
      onReload();
    } else {
      window.location.reload();
    }
  };

  const handleGoHome = () => {
    if (onGoHome) {
      onGoHome();
    } else {
      window.location.href = '/';
    }
  };

  const bgClass = isDarkMode ? 'bg-slate-900' : 'bg-white';
  const textClass = isDarkMode ? 'text-slate-100' : 'text-slate-900';
  const subtextClass = isDarkMode ? 'text-slate-400' : 'text-slate-600';
  const borderClass = isDarkMode ? 'border-slate-700' : 'border-slate-200';

  return (
    <div className={`${bgClass} min-h-screen flex flex-col items-center justify-center px-4 py-8`}>
      <div className={`max-w-md w-full`}>
        {/* Error Icon */}
        <div className="flex justify-center mb-6">
          <div className="relative">
            <div className="absolute inset-0 bg-red-500 rounded-full blur-lg opacity-20 animate-pulse"></div>
            <AlertCircle className="w-16 h-16 text-red-500 relative" />
          </div>
        </div>

        {/* Error Title */}
        <h1 className={`text-3xl font-bold text-center ${textClass} mb-2`}>
          Oops! Something went wrong
        </h1>

        {/* Error Description */}
        <p className={`text-center ${subtextClass} mb-6 text-sm leading-relaxed`}>
          We encountered an unexpected error. Our team has been notified and is working on a fix.
          Please try again or go back to the home page.
        </p>

        {/* Error Details (Development Mode) */}
        {error && process.env.NODE_ENV === 'development' && (
          <div
            className={`mb-6 p-4 rounded-lg border-2 ${borderClass} bg-opacity-50 ${
              isDarkMode ? 'bg-red-900' : 'bg-red-50'
            }`}
          >
            <p className={`text-xs font-mono ${isDarkMode ? 'text-red-200' : 'text-red-600'} break-words`}>
              <span className="font-bold">Error: </span>
              {error.message}
            </p>
            {error.stack && (
              <details className="mt-3">
                <summary className={`cursor-pointer text-xs font-semibold ${subtextClass} hover:underline`}>
                  Stack Trace
                </summary>
                <pre
                  className={`mt-2 text-xs overflow-auto max-h-48 p-2 rounded ${
                    isDarkMode ? 'bg-slate-800' : 'bg-slate-100'
                  } font-mono`}
                >
                  {error.stack}
                </pre>
              </details>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3 flex-col sm:flex-row">
          <button
            onClick={handleReload}
            className={`flex-1 px-6 py-3 rounded-lg font-semibold transition-all duration-200 flex items-center justify-center gap-2 ${
              isDarkMode
                ? 'bg-blue-600 hover:bg-blue-700 text-white'
                : 'bg-blue-500 hover:bg-blue-600 text-white'
            }`}
          >
            <RefreshCw className="w-4 h-4" />
            Try Again
          </button>

          <button
            onClick={handleGoHome}
            className={`flex-1 px-6 py-3 rounded-lg font-semibold transition-all duration-200 flex items-center justify-center gap-2 border-2 ${
              isDarkMode
                ? 'border-slate-600 text-slate-100 hover:bg-slate-800'
                : 'border-slate-300 text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Home className="w-4 h-4" />
            Go Home
          </button>
        </div>

        {/* Error ID (if available) */}
        <p className={`text-center text-xs ${subtextClass} mt-6`}>
          Error ID: {Date.now()}
        </p>
      </div>
    </div>
  );
}
