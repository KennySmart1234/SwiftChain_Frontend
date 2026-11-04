import axios from '@/lib/httpClient';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? '';
const THEME_STORAGE_KEY = 'theme';
const COLOR_SCHEME_QUERY = '(prefers-color-scheme: dark)';

export type ThemePreference = 'light' | 'dark' | 'system';

interface ThemePreferenceResponse {
  theme: ThemePreference;
}

function isThemePreference(value: string | null): value is ThemePreference {
  return value === 'light' || value === 'dark' || value === 'system';
}

function getSystemTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return 'light';
  }

  return window.matchMedia(COLOR_SCHEME_QUERY).matches ? 'dark' : 'light';
}

function applyThemeClass(theme: 'light' | 'dark') {
  if (typeof document === 'undefined') {
    return;
  }

  const root = document.documentElement;
  root.classList.toggle('dark', theme === 'dark');
  root.style.colorScheme = theme;
  root.setAttribute('data-theme', theme);
}

/**
 * Handles theme preference API communication.
 * Hooks consume this service; UI components do not.
 */
export const themeService = {
  getStoredThemePreference(): ThemePreference | null {
    if (typeof window === 'undefined') {
      return null;
    }

    const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
    return isThemePreference(storedTheme) ? storedTheme : null;
  },

  setStoredThemePreference(theme: ThemePreference) {
    if (typeof window === 'undefined') {
      return;
    }

    if (theme === 'system') {
      window.localStorage.removeItem(THEME_STORAGE_KEY);
      return;
    }

    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  },

  getInitialTheme(): 'light' | 'dark' {
    const storedTheme = this.getStoredThemePreference();
    if (storedTheme === 'light' || storedTheme === 'dark') {
      return storedTheme;
    }

    return getSystemTheme();
  },

  getThemeScript(): string {
    return `
      (function() {
        const storageKey = '${THEME_STORAGE_KEY}';
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        const storedTheme = window.localStorage.getItem(storageKey);
        const isDark = storedTheme === 'dark' || (!storedTheme && mediaQuery.matches);
        const root = document.documentElement;
        root.classList.toggle('dark', isDark);
        root.style.colorScheme = isDark ? 'dark' : 'light';
        root.setAttribute('data-theme', isDark ? 'dark' : 'light');
      })();
    `;
  },

  applyTheme(theme: ThemePreference | 'light' | 'dark') {
    if (theme === 'system') {
      applyThemeClass(getSystemTheme());
      return;
    }

    applyThemeClass(theme);
  },

  async getThemePreference(): Promise<ThemePreferenceResponse> {
    const { data } = await axios.get<ThemePreferenceResponse>(
      `${API_BASE_URL}/api/user/preferences/theme`
    );
    return data;
  },

  async saveThemePreference(
    theme: ThemePreference
  ): Promise<ThemePreferenceResponse> {
    this.setStoredThemePreference(theme);

    const { data } = await axios.post<ThemePreferenceResponse>(
      `${API_BASE_URL}/api/user/preferences/theme`,
      { theme }
    );
    return data;
  },
};
