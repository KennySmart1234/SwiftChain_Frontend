/**
 * ToastProvider Component
 * Global provider that wraps the app with sonner Toaster
 * Manages toast notifications and styled variants
 */

'use client';

import React, { useEffect } from 'react';
import { Toaster, toast } from 'sonner';
import { toastService, ToastConfig } from '@/lib/toast';
import { AlertCircle, CheckCircle, Info, Loader } from 'lucide-react';

interface ToastProviderProps {
  children: React.ReactNode;
}

/**
 * Custom toast content component for success
 */
function SuccessToast({
  message,
  description,
}: {
  message: string;
  description?: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <CheckCircle className="h-5 w-5 flex-shrink-0 text-green-600" />
      <div className="flex-1">
        <p className="font-medium text-slate-900">{message}</p>
        {description && (
          <p className="mt-1 text-sm text-slate-600">{description}</p>
        )}
      </div>
    </div>
  );
}

/**
 * Custom toast content component for error
 */
function ErrorToast({
  message,
  description,
}: {
  message: string;
  description?: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <AlertCircle className="h-5 w-5 flex-shrink-0 text-red-600" />
      <div className="flex-1">
        <p className="font-medium text-slate-900">{message}</p>
        {description && (
          <p className="mt-1 text-sm text-slate-600">{description}</p>
        )}
      </div>
    </div>
  );
}

/**
 * Custom toast content component for info
 */
function InfoToast({
  message,
  description,
}: {
  message: string;
  description?: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <Info className="h-5 w-5 flex-shrink-0 text-blue-600" />
      <div className="flex-1">
        <p className="font-medium text-slate-900">{message}</p>
        {description && (
          <p className="mt-1 text-sm text-slate-600">{description}</p>
        )}
      </div>
    </div>
  );
}

/**
 * Custom toast content component for loading
 */
function LoadingToast({
  message,
  description,
}: {
  message: string;
  description?: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <Loader className="h-5 w-5 flex-shrink-0 animate-spin text-primary" />
      <div className="flex-1">
        <p className="font-medium text-slate-900">{message}</p>
        {description && (
          <p className="mt-1 text-sm text-slate-600">{description}</p>
        )}
      </div>
    </div>
  );
}

/**
 * ToastProvider component - manages all toast notifications
 */
export default function ToastProvider({
  children,
}: ToastProviderProps): React.ReactElement {
  // Initialization flag removed — not needed
  /**
   * Handle toast display based on configuration
   */
  const handleToast = (config: ToastConfig): void => {
    const { variant, description, duration, action } = config;
    const message = config.message ?? config.title ?? '';

    switch (variant) {
      case 'success':
        toast.success(
          <SuccessToast message={message} description={description} />,
          {
            duration: duration ?? 4000,
            ...(action && {
              action: { label: action.label, onClick: action.onClick },
            }),
          }
        );
        break;

      case 'error':
        toast.error(
          <ErrorToast message={message} description={description} />,
          {
            duration: duration ?? 4000,
            ...(action && {
              action: { label: action.label, onClick: action.onClick },
            }),
          }
        );
        break;

      case 'info':
        toast(<InfoToast message={message} description={description} />, {
          duration: duration ?? 4000,
          ...(action && {
            action: { label: action.label, onClick: action.onClick },
          }),
        });
        break;

      case 'loading':
        toast(<LoadingToast message={message} description={description} />, {
          duration: duration ?? 0, // Loading toasts don't auto-dismiss
          dismissible: false,
        });
        break;

      default:
        break;
    }
  };

  useEffect(() => {
    // Subscribe to toast service events
    const unsubscribe = toastService.subscribe((config: ToastConfig) => {
      handleToast(config);
    });

    // initialization completed (no state needed)

    // Cleanup
    return () => {
      unsubscribe();
    };
  }, []);

  return (
    <>
      {children}

      {/* Sonner Toaster with custom styling */}
      <Toaster
        position="bottom-right"
        theme="light"
        richColors
        expand={false}
        closeButton
        toastOptions={{
          classNames: {
            toast:
              'group toast group-[.toaster]:bg-white group-[.toaster]:text-slate-950 group-[.toaster]:border-slate-200 group-[.toaster]:shadow-lg group-[.toaster]:rounded-lg group-[.toaster]:p-4',
            description: 'group-[.toast]:text-slate-600',
            actionButton:
              'group-[.toast]:bg-primary group-[.toast]:text-white group-[.toast]:px-3 group-[.toast]:py-1 group-[.toast]:rounded group-[.toast]:hover:bg-primary/90',
            closeButton:
              'group-[.toast]:bg-transparent group-[.toast]:text-slate-600 group-[.toast]:hover:bg-slate-100',
          },
          style: {
            backgroundColor: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '0.5rem',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
            padding: '1rem',
          },
        }}
      />
    </>
  );
}
