import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NotificationPreferences } from '@/components/settings/NotificationPreferences';
import { useNotificationPreferences } from '@/hooks/useNotificationPreferences';
import { toast } from 'sonner';

jest.mock('@/hooks/useNotificationPreferences');
jest.mock('sonner', () => ({
  toast: { error: jest.fn(), success: jest.fn() },
}));

const mockedHook = useNotificationPreferences as jest.MockedFunction<
  typeof useNotificationPreferences
>;
const togglePreference = jest.fn();
const savePreferences = jest.fn().mockResolvedValue(true);
const resetPreferences = jest.fn();
const retry = jest.fn().mockResolvedValue(undefined);

const groupedPreferences = {
  deliveries: [
    {
      key: 'delivery_created_in_app',
      category: 'deliveries' as const,
      label: 'Delivery Created',
      channel: 'in_app' as const,
      enabled: true,
    },
  ],
  escrow: [
    {
      key: 'escrow_locked_in_app',
      category: 'escrow' as const,
      label: 'Escrow Locked',
      channel: 'in_app' as const,
      enabled: false,
    },
  ],
  marketing: [],
  system: [],
};

function mockHook(
  overrides: Partial<ReturnType<typeof useNotificationPreferences>> = {},
) {
  mockedHook.mockReturnValue({
    preferences: groupedPreferences,
    isLoading: false,
    isSaving: false,
    error: null,
    togglePreference,
    savePreferences,
    clearError: jest.fn(),
    resetPreferences,
    retry,
    ...overrides,
  });
}

describe('NotificationPreferences page contract', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockHook();
  });

  it('renders grouped categories and their toggles', () => {
    render(<NotificationPreferences />);
    expect(screen.getByTestId('category-deliveries')).toBeInTheDocument();
    expect(screen.getByTestId('category-escrow')).toBeInTheDocument();
    expect(screen.getByRole('switch', { name: 'Delivery Created notification' })).toBeChecked();
  });

  it('persists toggle changes when save is selected', async () => {
    const user = userEvent.setup();
    render(<NotificationPreferences />);

    await user.click(screen.getByRole('switch', { name: 'Escrow Locked notification' }));
    expect(togglePreference).toHaveBeenCalledWith('escrow_locked_in_app', true);
    await user.click(screen.getByRole('button', { name: 'Save Preferences' }));
    expect(savePreferences).toHaveBeenCalledTimes(1);
  });

  it('shows a save confirmation toast', async () => {
    const user = userEvent.setup();
    render(<NotificationPreferences />);
    await user.click(screen.getByRole('button', { name: 'Save Preferences' }));

    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith('Notification preferences saved'),
    );
  });

  it('resets preferences to the backend defaults', async () => {
    const user = userEvent.setup();
    render(<NotificationPreferences />);
    await user.click(screen.getByRole('button', { name: 'Reset to defaults' }));
    expect(resetPreferences).toHaveBeenCalledTimes(1);
  });

  it('shows one empty state when no preferences are loaded', () => {
    mockHook({
      preferences: { deliveries: [], escrow: [], marketing: [], system: [] },
    });
    render(<NotificationPreferences />);
    expect(screen.getByText('No notification preferences available.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save Preferences' })).toBeDisabled();
  });

  it('shows an error state and retries loading', async () => {
    mockHook({ error: 'Unable to load preferences' });
    const user = userEvent.setup();
    render(<NotificationPreferences />);
    expect(screen.getByRole('alert')).toHaveTextContent('Unable to load preferences');
    await user.click(screen.getByRole('button', { name: 'Retry' }));
    expect(retry).toHaveBeenCalledTimes(1);
  });
});
