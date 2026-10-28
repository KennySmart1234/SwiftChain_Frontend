/**
 * NotificationPreferences Component Tests
 *
 * Tests that verify:
 * - Loading state renders while preferences are fetched
 * - All four categories render (deliveries, escrow, marketing, system)
 * - Toggles render per preference with correct aria state
 * - Toggling flips the switch state locally
 * - Save button persists via the hook and shows a success toast
 * - Error toast appears when saving fails
 * - Mobile layout: categories stack vertically (single-column flex)
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const mockTogglePreference = jest.fn();
const mockSavePreferences = jest.fn();
const mockClearError = jest.fn();
const mockResetPreferences = jest.fn();
const mockRetry = jest.fn();

const mockHook = {
  preferences: {
    deliveries: [
      {
        key: 'delivery_created_in_app',
        category: 'deliveries' as const,
        label: 'Delivery Created',
        channel: 'in_app' as const,
        enabled: true,
      },
      {
        key: 'delivery_delivered_email',
        category: 'deliveries' as const,
        label: 'Delivered',
        channel: 'email' as const,
        enabled: false,
      },
    ],
    escrow: [
      {
        key: 'escrow_locked_in_app',
        category: 'escrow' as const,
        label: 'Escrow Locked',
        channel: 'in_app' as const,
        enabled: true,
      },
    ],
    marketing: [
      {
        key: 'marketing_enabled_in_app',
        category: 'marketing' as const,
        label: 'Marketing Updates',
        channel: 'in_app' as const,
        enabled: false,
      },
    ],
    system: [
      {
        key: 'system_alerts_in_app',
        category: 'system' as const,
        label: 'System Alerts',
        channel: 'in_app' as const,
        enabled: true,
      },
    ],
  },
  isLoading: false,
  isSaving: false,
  error: null as string | null,
  togglePreference: mockTogglePreference,
  savePreferences: mockSavePreferences,
  clearError: mockClearError,
  resetPreferences: mockResetPreferences,
  retry: mockRetry,
};

jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    loading: jest.fn(),
  },
}));

jest.mock('@/hooks/useNotificationPreferences', () => ({
  useNotificationPreferences: jest.fn(() => mockHook),
}));

import { NotificationPreferences } from '@/components/settings/NotificationPreferences';
import { toast } from 'sonner';
import { useNotificationPreferences } from '@/hooks/useNotificationPreferences';

const mockedUseNotificationPreferences = jest.mocked(
  useNotificationPreferences,
);

describe('NotificationPreferences Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedUseNotificationPreferences.mockReturnValue(mockHook);
  });

  describe('Rendering', () => {
    it('renders the section with heading', () => {
      render(<NotificationPreferences />);

      expect(
        screen.getByRole('heading', {
          name: /notification preferences/i,
        }),
      ).toBeInTheDocument();
    });

    it('renders all four categories', () => {
      render(<NotificationPreferences />);

      expect(screen.getByTestId('category-deliveries')).toBeInTheDocument();
      expect(screen.getByTestId('category-escrow')).toBeInTheDocument();
      expect(screen.getByTestId('category-marketing')).toBeInTheDocument();
      expect(screen.getByTestId('category-system')).toBeInTheDocument();
    });

    it('renders a switch for each preference', () => {
      render(<NotificationPreferences />);

      expect(
        screen.getByRole('switch', { name: /delivery created notification/i }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole('switch', { name: /delivered notification/i }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole('switch', { name: /escrow locked notification/i }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole('switch', { name: /marketing updates notification/i }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole('switch', { name: /system alerts notification/i }),
      ).toBeInTheDocument();
    });

    it('reflects enabled state in aria-checked', () => {
      render(<NotificationPreferences />);

      const enabledSwitch = screen.getByRole('switch', {
        name: /delivery created notification/i,
      });
      const disabledSwitch = screen.getByRole('switch', {
        name: /delivered notification/i,
      });

      expect(enabledSwitch).toHaveAttribute('aria-checked', 'true');
      expect(disabledSwitch).toHaveAttribute('aria-checked', 'false');
    });

    it('stacks categories vertically (flex-col) for mobile layout', () => {
      render(<NotificationPreferences />);

      const deliveries = screen.getByTestId('category-deliveries');
      const stack = deliveries.parentElement;

      expect(stack).toHaveClass('flex-col');
      expect(stack).not.toHaveClass('flex-row');
    });
  });

  describe('Loading state', () => {
    it('renders loading indicator instead of categories', () => {
      mockedUseNotificationPreferences.mockReturnValue({
        ...mockHook,
        isLoading: true,
      });

      render(<NotificationPreferences />);

      expect(
        screen.getByTestId('notification-preferences-loading'),
      ).toBeInTheDocument();
      expect(screen.queryByTestId('category-deliveries')).not.toBeInTheDocument();
    });
  });

  describe('Interactions', () => {
    it('calls togglePreference with key and new value when a switch is clicked', async () => {
      const user = userEvent.setup();
      render(<NotificationPreferences />);

      const sw = screen.getByRole('switch', {
        name: /marketing updates notification/i,
      });

      await user.click(sw);

      expect(mockTogglePreference).toHaveBeenCalledWith(
        'marketing_enabled_in_app',
        true,
      );
    });

    it('saves preferences and shows success toast', async () => {
      mockSavePreferences.mockResolvedValueOnce(true);
      const user = userEvent.setup();
      render(<NotificationPreferences />);

      const saveButton = screen.getByTestId('save-preferences');
      await user.click(saveButton);

      await waitFor(() => {
        expect(mockSavePreferences).toHaveBeenCalledTimes(1);
      });
      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith(
          'Notification preferences saved',
        );
      });
    });

    it('does not show success toast when saving fails', async () => {
      mockSavePreferences.mockResolvedValueOnce(false);
      const user = userEvent.setup();
      render(<NotificationPreferences />);

      await user.click(screen.getByTestId('save-preferences'));

      await waitFor(() => {
        expect(mockSavePreferences).toHaveBeenCalledTimes(1);
      });
      expect(toast.success).not.toHaveBeenCalled();
    });

    it('shows error toast when an error is surfaced by the hook', async () => {
      mockedUseNotificationPreferences.mockReturnValue({
        ...mockHook,
        error: 'Backend unavailable',
      });

      render(<NotificationPreferences />);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Backend unavailable');
      });
      expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
    });
  });
});
