'use client';

import { useState, useEffect, useCallback } from 'react';
import type {
  ActivityFeedItem,
  ActivityAlert,
  ActivitySummary,
  ActivityFilter,
  ActivityCenterState,
} from '@/types/activityCenter';
import {
  fetchActivityFeed,
  fetchActivityAlerts,
  computeActivitySummary,
  markAllFeedRead,
  dismissActivityAlert,
} from '@/services/activityCenterService';

const DEFAULT_FILTER: ActivityFilter = {
  type: 'all',
  onlyUnread: false,
};

/**
 * useActivityCenter
 *
 * Central hook for the Activity Center page.
 * Manages the feed, alerts, filter state, and summary counters.
 * All data is derived from the activityCenterService (mock until backend ready).
 */
export function useActivityCenter(): ActivityCenterState {
  const [feed, setFeed] = useState<ActivityFeedItem[]>([]);
  const [alerts, setAlerts] = useState<ActivityAlert[]>([]);
  const [summary, setSummary] = useState<ActivitySummary>({
    totalEvents: 0,
    unreadCount: 0,
    activeAlerts: 0,
    pendingDeliveries: 0,
  });
  const [filter, setFilterState] = useState<ActivityFilter>(DEFAULT_FILTER);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ---------------------------------------------------------------------------
  // Data fetching
  // ---------------------------------------------------------------------------

  const loadData = useCallback(
    async (activeFilter: ActivityFilter) => {
      setIsLoading(true);
      setError(null);
      try {
        const [feedData, alertsData] = await Promise.all([
          fetchActivityFeed(activeFilter),
          fetchActivityAlerts(),
        ]);
        setFeed(feedData);
        setAlerts(alertsData);
        setSummary(computeActivitySummary(feedData, alertsData));
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : 'Failed to load activity data. Please try again.'
        );
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadData(filter);
  }, [filter, loadData]);

  // ---------------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------------

  const setFilter = useCallback((partial: Partial<ActivityFilter>) => {
    setFilterState((prev) => ({ ...prev, ...partial }));
  }, []);

  const markAllRead = useCallback(() => {
    setFeed((prev) => {
      const updated = markAllFeedRead(prev);
      setSummary((s) => ({ ...s, unreadCount: 0 }));
      return updated;
    });
  }, []);

  const dismissAlert = useCallback((id: string) => {
    setAlerts((prev) => {
      const updated = dismissActivityAlert(prev, id);
      setSummary((s) => ({
        ...s,
        activeAlerts: updated.filter((a) => !a.dismissed).length,
      }));
      return updated;
    });
  }, []);

  const refetch = useCallback(() => {
    void loadData(filter);
  }, [filter, loadData]);

  // ---------------------------------------------------------------------------

  return {
    feed,
    alerts,
    summary,
    filter,
    isLoading,
    error,
    setFilter,
    markAllRead,
    dismissAlert,
    refetch,
  };
}
