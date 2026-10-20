'use client';

import type { ActivityAlert, AlertSeverity } from '@/types/activityCenter';

// ---------------------------------------------------------------------------
// Per-severity style tokens (light mode)
// ---------------------------------------------------------------------------

const SEVERITY_STYLES: Record<
  AlertSeverity,
  { wrapper: string; icon: string; actionBtn: string }
> = {
  info: {
    wrapper: 'bg-blue-50 border-blue-200 text-blue-800',
    icon:    'text-blue-500',
    actionBtn: 'text-blue-700 hover:text-blue-900 font-semibold underline',
  },
  success: {
    wrapper: 'bg-green-50 border-green-200 text-green-800',
    icon:    'text-green-500',
    actionBtn: 'text-green-700 hover:text-green-900 font-semibold underline',
  },
  warning: {
    wrapper: 'bg-amber-50 border-amber-200 text-amber-800',
    icon:    'text-amber-500',
    actionBtn: 'text-amber-700 hover:text-amber-900 font-semibold underline',
  },
  error: {
    wrapper: 'bg-red-50 border-red-200 text-red-800',
    icon:    'text-red-500',
    actionBtn: 'text-red-700 hover:text-red-900 font-semibold underline',
  },
};

// ---------------------------------------------------------------------------
// Severity icon
// ---------------------------------------------------------------------------

function SeverityIcon({ severity }: { severity: AlertSeverity }) {
  switch (severity) {
    case 'success':
      return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
          <polyline points="22 4 12 14.01 9 11.01" />
        </svg>
      );
    case 'warning':
      return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
      );
    case 'error':
      return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      );
    default:
      return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      );
  }
}

// ---------------------------------------------------------------------------
// Single alert row
// ---------------------------------------------------------------------------

interface AlertRowProps {
  alert: ActivityAlert;
  onDismiss: (id: string) => void;
}

function AlertRow({ alert, onDismiss }: AlertRowProps) {
  const styles = SEVERITY_STYLES[alert.severity];

  return (
    <div
      role="alert"
      className={`flex items-start justify-between gap-3 rounded-lg border px-4 py-3 text-sm ${styles.wrapper}`}
    >
      {/* Left: icon + message */}
      <div className="flex items-start gap-2">
        <span className={`mt-0.5 shrink-0 ${styles.icon}`}>
          <SeverityIcon severity={alert.severity} />
        </span>
        <p className="leading-relaxed">{alert.message}</p>
      </div>

      {/* Right: optional action + dismiss */}
      <div className="flex shrink-0 items-center gap-3">
        {alert.actionLabel && alert.actionHref && (
          <a
            href={alert.actionHref}
            className={`whitespace-nowrap text-xs ${styles.actionBtn}`}
          >
            {alert.actionLabel}
          </a>
        )}
        <button
          type="button"
          onClick={() => onDismiss(alert.id)}
          className="rounded p-0.5 opacity-60 hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-current"
          aria-label={`Dismiss alert: ${alert.message}`}
        >
          {/* X icon */}
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Public component
// ---------------------------------------------------------------------------

interface AlertsBannerProps {
  alerts: ActivityAlert[];
  onDismiss: (id: string) => void;
}

/**
 * AlertsBanner
 *
 * Renders a stacked list of active alerts at the top of the Activity Center
 * page. Each row is colour-coded by severity and includes an optional CTA
 * link and a dismiss button.
 *
 * Renders nothing when there are no active (non-dismissed) alerts.
 */
export function AlertsBanner({ alerts, onDismiss }: AlertsBannerProps) {
  const active = alerts.filter((a) => !a.dismissed);
  if (active.length === 0) return null;

  return (
    <section aria-label="Active delivery alerts" className="flex flex-col gap-2">
      {active.map((alert) => (
        <AlertRow key={alert.id} alert={alert} onDismiss={onDismiss} />
      ))}
    </section>
  );
}
