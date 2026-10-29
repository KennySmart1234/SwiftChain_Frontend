'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertCircle, CheckCircle, Info, Loader, X } from 'lucide-react';
import {
  toastService,
  type ToastConfig,
  type ToastMessage,
  type ToastVariant,
} from '@/lib/toast';

export interface QueuedToast {
  id: string;
  variant: ToastVariant;
  message: string;
  description?: string;
  duration: number;
  createdAt: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export interface ToastContextValue {
  visibleToasts: QueuedToast[];
  queuedToasts: QueuedToast[];
  maxVisible: number;
  defaultDuration: number;
  isLoading: boolean;
  backendMessages: ToastMessage[];
  success: (
    _message: string,
    _description?: string,
    _duration?: number,
  ) => string;
  error: (
    _message: string,
    _description?: string,
    _duration?: number,
  ) => string;
  info: (
    _message: string,
    _description?: string,
    _duration?: number,
  ) => string;
  addToast: (_config: ToastConfig & { id?: string }) => string;
  dismissToast: (_id: string) => void;
  clearAll: () => void;
  syncFromBackend: () => Promise<ToastMessage[]>;
}

export interface ToastQueueProviderProps {
  children: ReactNode;
  maxVisible?: number;
  defaultDuration?: number;
  autoSyncBackend?: boolean;
}

const DEFAULT_MAX_VISIBLE = 3;
const DEFAULT_TOAST_DURATION = 4000;

const ToastContext = createContext<ToastContextValue | null>(null);

let toastSequence = 0;

function createToastId(): string {
  toastSequence += 1;
  return `toast-${Date.now()}-${toastSequence}`;
}

function getVariantStyles(variant: ToastVariant): {
  container: string;
  icon: React.ReactElement;
} {
  switch (variant) {
    case 'success':
      return {
        container:
          'border-emerald-200 bg-white text-slate-900 dark:border-emerald-800 dark:bg-slate-900 dark:text-slate-100',
        icon: (
          <CheckCircle
            className="h-5 w-5 flex-shrink-0 text-emerald-600 dark:text-emerald-400"
            aria-hidden="true"
          />
        ),
      };
    case 'error':
      return {
        container:
          'border-red-200 bg-white text-slate-900 dark:border-red-800 dark:bg-slate-900 dark:text-slate-100',
        icon: (
          <AlertCircle
            className="h-5 w-5 flex-shrink-0 text-red-600 dark:text-red-400"
            aria-hidden="true"
          />
        ),
      };
    case 'loading':
      return {
        container:
          'border-slate-200 bg-white text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100',
        icon: (
          <Loader
            className="h-5 w-5 flex-shrink-0 animate-spin text-sky-600 dark:text-sky-400"
            aria-hidden="true"
          />
        ),
      };
    case 'info':
    default:
      return {
        container:
          'border-sky-200 bg-white text-slate-900 dark:border-sky-800 dark:bg-slate-900 dark:text-slate-100',
        icon: (
          <Info
            className="h-5 w-5 flex-shrink-0 text-sky-600 dark:text-sky-400"
            aria-hidden="true"
          />
        ),
      };
  }
}

export function ToastProvider({
  children,
  maxVisible = DEFAULT_MAX_VISIBLE,
  defaultDuration = DEFAULT_TOAST_DURATION,
  autoSyncBackend = false,
}: ToastQueueProviderProps): React.ReactElement {
  const [allToasts, setAllToasts] = useState<QueuedToast[]>([]);
  const [backendDuration, setBackendDuration] = useState<number | null>(null);
  const [backendMessages, setBackendMessages] = useState<ToastMessage[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(
    new Map(),
  );

  const configuredDuration = backendDuration ?? defaultDuration;
  const effectiveMaxVisible = Math.max(1, maxVisible);

  const visibleToasts = useMemo(
    () => allToasts.slice(0, effectiveMaxVisible),
    [allToasts, effectiveMaxVisible],
  );

  const queuedToasts = useMemo(
    () => allToasts.slice(effectiveMaxVisible),
    [allToasts, effectiveMaxVisible],
  );

  const dismissToast = useCallback((id: string) => {
    const activeTimer = timersRef.current.get(id);
    if (activeTimer) {
      clearTimeout(activeTimer);
      timersRef.current.delete(id);
    }
    setAllToasts((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    timersRef.current.forEach((timer) => clearTimeout(timer));
    timersRef.current.clear();
    setAllToasts([]);
  }, []);

  const addToast = useCallback(
    (config: ToastConfig & { id?: string }): string => {
      const id = config.id ?? createToastId();
      const resolvedDuration =
        config.variant === 'loading'
          ? (config.duration ?? 0)
          : (config.duration ?? configuredDuration);

      const nextToast: QueuedToast = {
        id,
        variant: config.variant,
        message: config.message,
        description: config.description,
        duration: resolvedDuration,
        createdAt: Date.now(),
        action: config.action,
      };

      setAllToasts((prev) => [...prev, nextToast]);
      toastService.setLastNotificationId(id);
      return id;
    },
    [configuredDuration],
  );

  const success = useCallback(
    (message: string, description?: string, duration?: number): string =>
      addToast({ variant: 'success', message, description, duration }),
    [addToast],
  );

  const error = useCallback(
    (message: string, description?: string, duration?: number): string =>
      addToast({ variant: 'error', message, description, duration }),
    [addToast],
  );

  const info = useCallback(
    (message: string, description?: string, duration?: number): string =>
      addToast({ variant: 'info', message, description, duration }),
    [addToast],
  );

  const syncFromBackend = useCallback(async (): Promise<ToastMessage[]> => {
    setIsLoading(true);
    try {
      const [configRes, messagesRes] = await Promise.all([
        toastService.getToastConfig(),
        toastService.fetchToastMessages(),
      ]);

      if (configRes.success && configRes.data?.duration) {
        setBackendDuration(configRes.data.duration);
      }

      const items =
        messagesRes.success && messagesRes.data ? messagesRes.data : [];
      setBackendMessages(items);

      items.forEach((item) => {
        addToast({
          id: item.id,
          variant: item.variant,
          message: item.title,
          description: item.message,
          duration: item.duration,
        });
      });

      return items;
    } finally {
      setIsLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    const unsubscribe = toastService.subscribe((config: ToastConfig) => {
      addToast(config);
    });
    return () => {
      unsubscribe();
    };
  }, [addToast]);

  useEffect(() => {
    if (!autoSyncBackend) return undefined;
    const syncTimer = window.setTimeout(() => {
      void syncFromBackend();
    }, 0);
    return () => window.clearTimeout(syncTimer);
  }, [autoSyncBackend, syncFromBackend]);

  useEffect(() => {
    const visibleIds = new Set(visibleToasts.map((t) => t.id));

    timersRef.current.forEach((timer, id) => {
      if (!visibleIds.has(id)) {
        clearTimeout(timer);
        timersRef.current.delete(id);
      }
    });

    visibleToasts.forEach((toastItem) => {
      if (toastItem.duration > 0 && !timersRef.current.has(toastItem.id)) {
        const timer = setTimeout(() => {
          timersRef.current.delete(toastItem.id);
          dismissToast(toastItem.id);
        }, toastItem.duration);
        timersRef.current.set(toastItem.id, timer);
      }
    });
  }, [visibleToasts, dismissToast]);

  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      timers.forEach((timer) => clearTimeout(timer));
      timers.clear();
    };
  }, []);

  const contextValue = useMemo<ToastContextValue>(
    () => ({
      visibleToasts,
      queuedToasts,
      maxVisible: effectiveMaxVisible,
      defaultDuration: configuredDuration,
      isLoading,
      backendMessages,
      success,
      error,
      info,
      addToast,
      dismissToast,
      clearAll,
      syncFromBackend,
    }),
    [
      visibleToasts,
      queuedToasts,
      effectiveMaxVisible,
      configuredDuration,
      isLoading,
      backendMessages,
      success,
      error,
      info,
      addToast,
      dismissToast,
      clearAll,
      syncFromBackend,
    ],
  );

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      <div
        role="region"
        aria-label="Notifications"
        aria-live="polite"
        data-testid="toast-queue-viewport"
        className="pointer-events-none fixed bottom-4 right-4 z-50 flex w-full max-w-sm flex-col gap-2"
      >
        <AnimatePresence mode="popLayout" initial={false}>
          {visibleToasts.map((toastItem) => {
            const { container, icon } = getVariantStyles(toastItem.variant);
            return (
              <motion.div
                key={toastItem.id}
                layout
                initial={{ opacity: 0, y: 16, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -12, scale: 0.95 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                role="alert"
                data-testid="toast-item"
                data-toast-id={toastItem.id}
                data-toast-variant={toastItem.variant}
                className={`pointer-events-auto flex items-start gap-3 rounded-lg border p-4 shadow-lg ${container}`}
              >
                {icon}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">{toastItem.message}</p>
                  {toastItem.description && (
                    <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                      {toastItem.description}
                    </p>
                  )}
                  {toastItem.action && (
                    <button
                      type="button"
                      onClick={toastItem.action.onClick}
                      className="mt-2 inline-flex items-center rounded bg-sky-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-sky-700"
                    >
                      {toastItem.action.label}
                    </button>
                  )}
                </div>
                <button
                  type="button"
                  aria-label={`Dismiss ${toastItem.message}`}
                  onClick={() => dismissToast(toastItem.id)}
                  className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
                >
                  <X className="h-4 w-4" />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {queuedToasts.length > 0 && (
          <div
            data-testid="toast-queue-indicator"
            className="pointer-events-auto self-end rounded-full bg-slate-900/85 px-3 py-1 text-xs font-medium text-white shadow"
          >
            +{queuedToasts.length} more in queue
          </div>
        )}
      </div>
    </ToastContext.Provider>
  );
}

export function useToastContext(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToastContext must be used within a ToastProvider');
  }
  return ctx;
}

export const useToastQueue = useToastContext;

export default ToastProvider;
