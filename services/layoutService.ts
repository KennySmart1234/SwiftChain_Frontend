/**
 * Layout Service
 * Handles layout configuration and navigation data from the backend API
 * Follows the Service pattern for clean separation of concerns
 */

import axios from '@/lib/httpClient';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? '';

export interface NavItem {
  id: string;
  label: string;
  href: string;
  icon?: string;
  description?: string;
  roles?: ('customer' | 'driver' | 'admin')[];
  children?: NavItem[];
}

export interface LayoutConfig {
  branding: {
    appName: string;
    logo?: string;
    logoDark?: string;
  };
  navigation: NavItem[];
  theme?: {
    primaryColor: string;
    sidebarCollapsible: boolean;
  };
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data?: T;
}

/**
 * Layout Service - fetches layout configuration and navigation from backend
 * Follows the Strict Layered Architecture: Component -> Hook -> Service
 */
export const layoutService = {
  /**
   * Fetch the layout configuration including navigation items
   * @returns Promise with layout configuration
   */
  async getLayoutConfig(): Promise<ApiResponse<LayoutConfig>> {
    try {
      const { data } = await axios.get<ApiResponse<LayoutConfig>>(
        `${API_BASE_URL}/api/layout/config`
      );
      return data;
    } catch (error: any) {
      console.error('Failed to fetch layout config:', error.message);
      // Return default config on error
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to fetch layout configuration',
        data: getDefaultLayoutConfig(),
      };
    }
  },

  /**
   * Fetch navigation items for the current user
   * @returns Promise with navigation items
   */
  async getNavigationItems(): Promise<ApiResponse<NavItem[]>> {
    try {
      const { data } = await axios.get<ApiResponse<NavItem[]>>(
        `${API_BASE_URL}/api/layout/navigation`
      );
      return data;
    } catch (error: any) {
      console.error('Failed to fetch navigation items:', error.message);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to fetch navigation items',
        data: getDefaultNavigationItems(),
      };
    }
  },

  /**
   * Fetch user-specific layout preferences (e.g., sidebar collapsed state)
   * @returns Promise with user preferences
   */
  async getUserLayoutPreferences(): Promise<
    ApiResponse<{
      sidebarCollapsed: boolean;
      theme: 'light' | 'dark';
      sidebarWidth: number;
    }>
  > {
    try {
      const { data } = await axios.get(
        `${API_BASE_URL}/api/layout/preferences`
      );
      return data;
    } catch (error: any) {
      console.error('Failed to fetch layout preferences:', error.message);
      return {
        success: false,
        message: 'Failed to fetch preferences',
        data: {
          sidebarCollapsed: false,
          theme: 'light',
          sidebarWidth: 256,
        },
      };
    }
  },

  /**
   * Save user layout preferences
   * @param preferences - User's layout preferences
   */
  async saveUserLayoutPreferences(preferences: {
    sidebarCollapsed?: boolean;
    theme?: 'light' | 'dark';
  }): Promise<ApiResponse<any>> {
    try {
      const { data } = await axios.patch(
        `${API_BASE_URL}/api/layout/preferences`,
        preferences
      );
      return data;
    } catch (error: any) {
      console.error('Failed to save layout preferences:', error.message);
      return {
        success: false,
        message: 'Failed to save preferences',
      };
    }
  },
};

/**
 * Fallback default layout configuration if API fails
 */
function getDefaultLayoutConfig(): LayoutConfig {
  return {
    branding: {
      appName: 'SwiftChain',
      logo: '/logo.svg',
      logoDark: '/logo-dark.svg',
    },
    navigation: getDefaultNavigationItems(),
    theme: {
      primaryColor: '#3b82f6',
      sidebarCollapsible: true,
    },
  };
}

/**
 * Fallback default navigation items
 */
function getDefaultNavigationItems(): NavItem[] {
  return [
    {
      id: 'dashboard',
      label: 'Dashboard',
      href: '/dashboard',
      icon: '📊',
      description: 'Overview and stats',
      roles: ['customer', 'driver', 'admin'],
    },
    {
      id: 'deliveries',
      label: 'Deliveries',
      href: '/dashboard/deliveries',
      icon: '📦',
      description: 'Manage deliveries',
      roles: ['customer', 'driver', 'admin'],
    },
    {
      id: 'driver',
      label: 'Drivers',
      href: '/dashboard/driver',
      icon: '🚗',
      description: 'Driver management',
      roles: ['admin', 'customer'],
    },
    {
      id: 'escrow',
      label: 'Escrow',
      href: '/dashboard/escrow',
      icon: '💰',
      description: 'Escrow management',
      roles: ['customer', 'admin'],
    },
    {
      id: 'settings',
      label: 'Settings',
      href: '/dashboard/settings',
      icon: '⚙️',
      description: 'Account settings',
      roles: ['customer', 'driver', 'admin'],
    },
    {
      id: 'support',
      label: 'Support',
      href: '/faq',
      icon: '❓',
      description: 'Help & FAQ',
      roles: ['customer', 'driver', 'admin'],
    },
  ];
}
