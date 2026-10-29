'use client';

import { Bell, BellRing, Loader2 } from 'lucide-react';
import { usePushNotifications } from '@/hooks/usePushNotifications';

export function PushNotificationButton() {
  const { isSupported, permission, isEnabling, error, enable } =
    usePushNotifications();

  if (!isSupported) return null;

  const isEnabled = permission === 'granted';
  const label = isEnabled
    ? 'Shipment notifications enabled'
    : 'Enable shipment notifications';

  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={isEnabled}
      title={error ?? label}
      disabled={isEnabling || isEnabled}
      onClick={() => void enable()}
      className={`flex h-10 w-10 items-center justify-center rounded-lg border shadow-sm transition focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
        isEnabled
          ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
          : error
            ? 'border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300'
            : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200'
      } disabled:cursor-not-allowed`}
    >
      {isEnabling ? (
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
      ) : isEnabled ? (
        <BellRing className="h-4 w-4" aria-hidden="true" />
      ) : (
        <Bell className="h-4 w-4" aria-hidden="true" />
      )}
    </button>
  );
}
