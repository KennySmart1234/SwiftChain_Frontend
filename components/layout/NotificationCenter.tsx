'use client';

import { useMemo } from 'react';
import { Popover, PopoverButton, PopoverPanel } from '@headlessui/react';
import { useNotifications } from '@/hooks/useNotifications';

function BellIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}

function NotificationItem({
  title,
  message,
  type,
  read,
  createdAt,
}: {
  title: string;
  message: string;
  type: string;
  read: boolean;
  createdAt: string;
}) {
  const typeColors: Record<string, string> = {
    delivery: '#3b82f6',
    system: '#8b5cf6',
    alert: '#ef4444',
  };

  return (
    <div
      style={{
        padding: '0.75rem 1rem',
        borderBottom: '1px solid #f3f4f6',
        background: read ? 'transparent' : '#eff6ff',
        display: 'flex',
        gap: '0.75rem',
        alignItems: 'flex-start',
      }}
    >
      <div
        style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          background: read ? 'transparent' : (typeColors[type] ?? '#6b7280'),
          marginTop: '6px',
          flexShrink: 0,
        }}
        aria-hidden="true"
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <p
          style={{
            fontWeight: read ? 400 : 600,
            fontSize: '0.875rem',
            color: '#111827',
            marginBottom: '2px',
          }}
        >
          {title}
        </p>
        <p
          style={{
            fontSize: '0.8rem',
            color: '#6b7280',
            marginBottom: '4px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {message}
        </p>
        <p style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
          {new Date(createdAt).toLocaleString()}
        </p>
      </div>
    </div>
  );
}

/**
 * NotificationCenter — bell icon with unread badge + dropdown panel.
 * Consumes useNotifications hook. Renders in the app layout header.
 */
export function NotificationCenter() {
  const { notifications, unreadCount, isLoading, markAllAsRead } =
    useNotifications();

  const orderedNotifications = useMemo(
    () =>
      [...notifications].sort((a, b) => {
        const timeA = new Date(a.createdAt).getTime();
        const timeB = new Date(b.createdAt).getTime();

        if (Number.isNaN(timeA) && Number.isNaN(timeB)) return 0;
        if (Number.isNaN(timeA)) return 1;
        if (Number.isNaN(timeB)) return -1;

        return timeB - timeA;
      }),
    [notifications]
  );

  return (
    <Popover style={{ position: 'relative' }}>
      {/* Bell trigger button */}
      <PopoverButton
        style={{
          position: 'relative',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: '0.5rem',
          borderRadius: '8px',
          color: '#374151',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
      >
        <BellIcon />
        {unreadCount > 0 && (
          <span
            data-testid="unread-badge"
            style={{
              position: 'absolute',
              top: '2px',
              right: '2px',
              background: '#ef4444',
              color: 'white',
              fontSize: '0.65rem',
              fontWeight: 700,
              borderRadius: '9999px',
              minWidth: '16px',
              height: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0 3px',
            }}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </PopoverButton>

      {/* Dropdown panel */}
      <PopoverPanel
        style={{
          position: 'absolute',
          right: 0,
          top: 'calc(100% + 8px)',
          width: '360px',
          background: 'white',
          borderRadius: '12px',
          boxShadow: '0 10px 40px rgba(0,0,0,0.12)',
          border: '1px solid #e5e7eb',
          zIndex: 50,
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '1rem',
            borderBottom: '1px solid #e5e7eb',
          }}
        >
          <h3
            style={{ fontWeight: 700, fontSize: '0.95rem', color: '#111827' }}
          >
            Notifications
            {unreadCount > 0 && (
              <span
                style={{
                  marginLeft: '8px',
                  background: '#eff6ff',
                  color: '#3b82f6',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  padding: '1px 6px',
                  borderRadius: '9999px',
                }}
              >
                {unreadCount} new
              </span>
            )}
          </h3>
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              type="button"
              style={{
                background: 'none',
                border: 'none',
                color: '#3b82f6',
                fontSize: '0.8rem',
                fontWeight: 500,
                cursor: 'pointer',
                padding: '2px 0',
              }}
            >
              Mark all as read
            </button>
          )}
        </div>

        {/* Body */}
        <div style={{ maxHeight: '360px', overflowY: 'auto' }}>
          {isLoading && (
            <p
              style={{
                padding: '2rem',
                textAlign: 'center',
                color: '#6b7280',
                fontSize: '0.875rem',
              }}
            >
              Loading notifications…
            </p>
          )}
          {!isLoading && notifications.length === 0 && (
            <p
              style={{
                padding: '2rem',
                textAlign: 'center',
                color: '#6b7280',
                fontSize: '0.875rem',
              }}
            >
              You&apos;re all caught up!
            </p>
          )}
          {orderedNotifications.map((n) => (
            <NotificationItem
              key={n.id}
              title={n.title}
              message={n.message}
              type={n.type}
              read={n.read}
              createdAt={n.createdAt}
            />
          ))}
        </div>
      </PopoverPanel>
    </Popover>
  );
}
