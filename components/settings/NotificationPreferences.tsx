'use client';

import { useEffect } from 'react';
import type { ReactElement } from 'react';
import {
  Bell,
  Package,
  Lock,
  Megaphone,
  Server,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { useNotificationPreferences } from '@/hooks/useNotificationPreferences';
import type { NotificationCategory } from '@/services/notificationPreferencesService';

const CATEGORY_META: Record<
  NotificationCategory,
  { label: string; description: string; icon: ReactElement }
> = {
  deliveries: {
    label: 'Deliveries',
    description:
      'Status updates for your shipments from creation to delivery.',
    icon: <Package className="h-5 w-5" />,
  },
  escrow: {
    label: 'Escrow',
    description: 'Payment protection actions on your transactions.',
    icon: <Lock className="h-5 w-5" />,
  },
  marketing: {
    label: 'Marketing',
    description: 'Product updates, promotions, and newsletter.',
    icon: <Megaphone className="h-5 w-5" />,
  },
  system: {
    label: 'System',
    description: 'Security alerts, account, and platform announcements.',
    icon: <Server className="h-5 w-5" />,
  },
};

/**
 * Switch — accessible toggle button (role="switch", aria-checked).
 */
function Switch({
  checked,
  onChange,
  label,
  disabled = false,
}: {
  checked: boolean;
  onChange: (_checked: boolean) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 ${
        checked ? 'bg-indigo-600' : 'bg-gray-200'
      } ${disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
          checked ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  );
}

/**
 * NotificationPreferences — settings page for managing which events trigger
 * in-app and email notifications.
 *
 * Layered Architecture:
 *   NotificationPreferences (Component)
 *     -> useNotificationPreferences (Hook)
 *       -> notificationPreferencesService (Service)
 *
 * Categories: deliveries, escrow, marketing, system.
 * Changes persist to the backend on save; a confirmation toast is shown.
 * Mobile layout stacks categories vertically.
 */
export function NotificationPreferences(): ReactElement {
  const {
    preferences,
    isLoading,
    isSaving,
    error,
    togglePreference,
    savePreferences,
    resetPreferences,
    retry,
  } = useNotificationPreferences();

  // Surface load/save errors as toasts, matching repo toast conventions
  useEffect(() => {
    if (error) {
      toast.error(error);
    }
  }, [error]);

  const handleSave = async () => {
    const ok = await savePreferences();
    if (ok) {
      toast.success('Notification preferences saved');
    }
  };

  if (isLoading) {
    return (
      <div
        className="flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white p-10 text-sm text-gray-600"
        data-testid="notification-preferences-loading"
      >
        <Loader2 className="h-5 w-5 animate-spin text-indigo-600" />
        Loading notification preferences...
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="rounded-lg border border-red-200 bg-red-50 p-5 text-red-800"
        role="alert"
      >
        <div className="flex items-center gap-2 font-medium">
          <AlertCircle className="h-5 w-5" />
          {error}
        </div>
        <button
          type="button"
          onClick={() => void retry()}
          className="mt-4 rounded-md border border-red-300 bg-white px-4 py-2 text-sm font-semibold"
        >
          Retry
        </button>
      </div>
    );
  }

  const categories = (
    Object.keys(CATEGORY_META) as NotificationCategory[]
  ).map((category) => ({ category, ...CATEGORY_META[category] }));
  const hasPreferences = categories.some(
    ({ category }) => (preferences[category] ?? []).length > 0,
  );

  return (
    <section
      aria-labelledby="notification-preferences-heading"
      className="rounded-xl border border-gray-200 bg-white p-6"
      data-testid="notification-preferences"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
          <Bell className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <h2
            id="notification-preferences-heading"
            className="text-lg font-semibold text-gray-900"
          >
            Notification Preferences
          </h2>
          <p className="mt-1 text-sm text-gray-600">
            Choose which events trigger in-app and email notifications.
          </p>
        </div>
      </div>

      {/* Categories stack vertically on mobile */}
      {!hasPreferences ? (
        <p className="mt-6 rounded-md border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500">
          No notification preferences available.
        </p>
      ) : <div className="mt-6 flex flex-col gap-6">
        {categories.map(({ category, label, description, icon }) => {
          const items = preferences[category] ?? [];

          return (
            <div
              key={category}
              className="rounded-lg border border-gray-200 p-4"
              data-testid={`category-${category}`}
            >
              <div className="flex items-center gap-3">
                <span className="text-indigo-600">{icon}</span>
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-gray-900">
                    {label}
                  </h3>
                  <p className="text-xs text-gray-600">{description}</p>
                </div>
              </div>

              {items.length === 0 ? (
                <p className="mt-3 text-xs text-gray-500">
                  No notification options available.
                </p>
              ) : (
                <ul className="mt-4 flex flex-col gap-3">
                  {items.map((pref) => (
                    <li
                      key={pref.key}
                      className="flex items-start justify-between gap-4"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900">
                          {pref.label}
                        </p>
                        {pref.description && (
                          <p className="text-xs text-gray-600">
                            {pref.description}
                          </p>
                        )}
                      </div>
                      <Switch
                        checked={pref.enabled}
                        onChange={(checked) =>
                          togglePreference(pref.key, checked)
                        }
                        label={`${pref.label} notification`}
                      />
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>}

      <div className="mt-6 flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={resetPreferences}
          disabled={isSaving || !hasPreferences}
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Reset to defaults
        </button>
        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={isSaving || !hasPreferences}
          data-testid="save-preferences"
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSaving && (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          )}
          {isSaving ? 'Saving...' : 'Save Preferences'}
        </button>
      </div>
    </section>
  );
}
