'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { adminRefundService, type RefundTimelineEvent } from '@/services/adminRefundService';

export interface UseRefundTimelineResult {
  /** Events ordered oldest to newest */
  events: RefundTimelineEvent[];
  isLoading: boolean;
  error: string | null;
  /** Copies text to the clipboard; returns true on success */
  copy: (value: string) => Promise<boolean>;
  /** The most recently copied value, cleared after a short delay */
  copiedValue: string | null;
}

/**
 * useRefundTimeline — loads the chronological refund timeline for a shipment
 * and exposes click-to-copy support for identifiers.
 */
export function useRefundTimeline(refundId: string | null): UseRefundTimelineResult {
  const [events, setEvents] = useState<RefundTimelineEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedValue, setCopiedValue] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!refundId) return;
    let cancelled = false;
    Promise.resolve().then(() => {
      if (cancelled) return;
      setIsLoading(true);
      setError(null);
    });
    adminRefundService
      .getRefundTimeline(refundId)
      .then((data) => {
        if (cancelled) return;
        setEvents(
          [...data].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
        );
      })
      .catch((err) => {
        if (!cancelled) {
          setEvents([]);
          setError(err instanceof Error ? err.message : 'An error occurred');
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [refundId]);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    []
  );

  const copy = useCallback(async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedValue(value);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopiedValue(null), 1500);
      return true;
    } catch {
      return false;
    }
  }, []);

  return { events: refundId ? events : [], isLoading, error, copy, copiedValue };
}
