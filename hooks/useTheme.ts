'use client';

import { useCallback, useEffect } from 'react';
import { useTheme as useNextTheme } from 'next-themes';
import { themeService, type ThemePreference } from '@/services/themeService';

/**
 * useTheme — OS-aware theme hook.
 *
 * Bridges the `next-themes` runtime context with the app's theme service so
 * that preferences are persisted locally and, when a local override is
 * absent, hydrated from the backend.
 *
 * Follows the Component → Hook → Service pattern:
 *   ThemeToggle (component) → useTheme (hook) → themeService (service)
 */
export function useTheme() {
  const { theme, resolvedTheme, setTheme } = useNextTheme();

  // On load, prefer a stored local override; otherwise fall back to the
  // authoritative backend preference.
  useEffect(() => {
    const storedPreference = themeService.getStoredThemePreference();
    if (storedPreference) {
      setTheme(storedPreference);
      return;
    }

    let cancelled = false;
    themeService
      .getThemePreference()
      .then(({ theme: apiTheme }) => {
        if (!cancelled) {
          setTheme(apiTheme);
        }
      })
      .catch(() => {
        // Fall back to the system/default theme when the API is unavailable.
      });

    return () => {
      cancelled = true;
    };
  }, [setTheme]);

  const toggleTheme = useCallback(async () => {
    const nextTheme: ThemePreference =
      resolvedTheme === 'dark' ? 'light' : 'dark';

    setTheme(nextTheme);

    try {
      await themeService.saveThemePreference(nextTheme);
    } catch {
      // Persistence failures must not break the UI toggle.
    }
  }, [resolvedTheme, setTheme]);

  return { theme, resolvedTheme, setTheme, toggleTheme } as const;
}
