'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useLiveDeliveryStatus } from '../../hooks/useLiveDeliveryStatus';
import { DeliveryStatus } from '../../services/deliverySocketService';

export interface LiveStatusBadgeProps {
  deliveryId: string;
  /** Optionally show a small "live" dot when the socket is connected */
  showConnectionIndicator?: boolean;
}

interface StatusConfig {
  bg: string;
  text: string;
  dot: string;
  ring: string;
  label: string;
}

/**
 * Status configuration — keyed by the canonical UPPER_SNAKE_CASE values
 * that match types/delivery.ts and the backend contract.
 */
const STATUS_CONFIG: Record<DeliveryStatus, StatusConfig> = {
  PENDING: {
    bg: 'bg-yellow-100 dark:bg-yellow-900',
    text: 'text-yellow-800 dark:text-yellow-200',
    dot: 'bg-yellow-500',
    ring: 'ring-yellow-400',
    label: 'Pending',
  },
  ACCEPTED: {
    bg: 'bg-indigo-100 dark:bg-indigo-900',
    text: 'text-indigo-800 dark:text-indigo-200',
    dot: 'bg-indigo-500',
    ring: 'ring-indigo-400',
    label: 'Accepted',
  },
  IN_TRANSIT: {
    bg: 'bg-blue-100 dark:bg-blue-900',
    text: 'text-blue-800 dark:text-blue-200',
    dot: 'bg-blue-500',
    ring: 'ring-blue-400',
    label: 'In Transit',
  },
  DELIVERED: {
    bg: 'bg-green-100 dark:bg-green-900',
    text: 'text-green-800 dark:text-green-200',
    dot: 'bg-green-500',
    ring: 'ring-green-400',
    label: 'Delivered',
  },
  CANCELLED: {
    bg: 'bg-red-100 dark:bg-red-900',
    text: 'text-red-800 dark:text-red-200',
    dot: 'bg-red-500',
    ring: 'ring-red-400',
    label: 'Cancelled',
  },
  UNKNOWN: {
    bg: 'bg-gray-100 dark:bg-gray-800',
    text: 'text-gray-700 dark:text-gray-300',
    dot: 'bg-gray-400',
    ring: 'ring-gray-400',
    label: 'Unknown',
  },
};

/**
 * LiveStatusBadge — Component layer for real-time delivery status.
 *
 * Uses `useLiveDeliveryStatus` to receive live WebSocket updates and
 * applies Tailwind animations:
 * - `animate-pulse` runs continuously while status is `IN_TRANSIT`.
 * - A brief ring flash triggers on every status transition.
 */
export const LiveStatusBadge: React.FC<LiveStatusBadgeProps> = ({
  deliveryId,
  showConnectionIndicator = true,
}) => {
  const { status, isConnected, isReconnecting } = useLiveDeliveryStatus(deliveryId);
  const [isFlashing, setIsFlashing] = useState(false);

  // Skip the flash on the very first render; only fire on subsequent changes
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    setIsFlashing(true);
    const timer = setTimeout(() => setIsFlashing(false), 1500);
    return () => clearTimeout(timer);
  }, [status]);

  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.UNKNOWN;

  // Continuous pulse while in transit; brief ring flash on any other transition
  const isInTransit = status === 'IN_TRANSIT';
  const animationClasses = [
    isInTransit ? 'animate-pulse' : '',
    isFlashing ? `ring-2 ring-offset-2 ring-opacity-60 ${config.ring}` : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <span
      role="status"
      aria-label={`Delivery status: ${config.label}`}
      aria-live="polite"
      className={[
        'inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium',
        'transition-colors duration-300 ease-in-out',
        config.bg,
        config.text,
        animationClasses,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {/* Status indicator dot */}
      <span
        aria-hidden="true"
        className={`w-2 h-2 rounded-full flex-shrink-0 ${config.dot}`}
      />

      {config.label}

      {/* Optional live connection indicator */}
      {showConnectionIndicator && (
        <span
          aria-hidden="true"
          title={isConnected ? 'Live' : isReconnecting ? 'Reconnecting…' : 'Connecting…'}
          className={[
            'w-1.5 h-1.5 rounded-full flex-shrink-0 transition-colors duration-500',
            isConnected
              ? 'bg-green-400 animate-pulse'
              : isReconnecting
                ? 'bg-amber-400 animate-pulse'
                : 'bg-gray-300',
          ].join(' ')}
        />
      )}
    </span>
  );
};
