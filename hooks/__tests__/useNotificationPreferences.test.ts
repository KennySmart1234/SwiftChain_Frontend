import { renderHook, act, waitFor } from '@testing-library/react';
import { useNotificationPreferences } from '@/hooks/useNotificationPreferences';
import { notificationPreferencesService } from '@/services/notificationPreferencesService';

jest.mock('@/services/notificationPreferencesService', () => ({
  notificationPreferencesService: {
    getPreferences: jest.fn(),
    updatePreferences: jest.fn(),
  },
}));

const mockedService = jest.mocked(notificationPreferencesService);

const mockPreferences = [
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
    label: 'Delivery Delivered',
    channel: 'email' as const,
    enabled: false,
  },
  {
    key: 'escrow_locked_in_app',
    category: 'escrow' as const,
    label: 'Escrow Locked',
    channel: 'in_app' as const,
    enabled: true,
  },
  {
    key: 'marketing_enabled_in_app',
    category: 'marketing' as const,
    label: 'Marketing Updates',
    channel: 'in_app' as const,
    enabled: false,
  },
  {
    key: 'system_alerts_in_app',
    category: 'system' as const,
    label: 'System Alerts',
    channel: 'in_app' as const,
    enabled: true,
  },
];

describe('useNotificationPreferences', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedService.getPreferences.mockResolvedValue({
      success: true,
      data: mockPreferences,
    });
  });

  it('starts in loading state and groups preferences by category', async () => {
    const { result } = renderHook(() => useNotificationPreferences());

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.preferences.deliveries).toHaveLength(2);
    expect(result.current.preferences.escrow).toHaveLength(1);
    expect(result.current.preferences.marketing).toHaveLength(1);
    expect(result.current.preferences.system).toHaveLength(1);
    expect(result.current.error).toBeNull();
  });

  it('sets error state when the backend call fails', async () => {
    mockedService.getPreferences.mockRejectedValueOnce(
      new Error('Backend unavailable'),
    );

    const { result } = renderHook(() => useNotificationPreferences());

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error).toBe('Backend unavailable');
  });

  it('sets error state for unsuccessful API responses', async () => {
    mockedService.getPreferences.mockResolvedValueOnce({
      success: false,
      message: 'Not authorized',
    } as never);

    const { result } = renderHook(() => useNotificationPreferences());

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error).toBe('Not authorized');
  });

  it('toggles a preference enabled state locally', async () => {
    const { result } = renderHook(() => useNotificationPreferences());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      result.current.togglePreference('delivery_created_in_app', false);
    });

    expect(result.current.preferences.deliveries[0].enabled).toBe(false);
    expect(result.current.preferences.deliveries[1].enabled).toBe(false);
  });

  it('does not persist toggles until savePreferences is called', async () => {
    const { result } = renderHook(() => useNotificationPreferences());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      result.current.togglePreference('system_alerts_in_app', false);
    });

    expect(mockedService.updatePreferences).not.toHaveBeenCalled();
  });

  it('saves all preferences and reports success', async () => {
    mockedService.updatePreferences.mockResolvedValueOnce({
      success: true,
    });

    const { result } = renderHook(() => useNotificationPreferences());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      result.current.togglePreference('escrow_locked_in_app', false);
    });

    let saveResult: boolean | undefined;
    await act(async () => {
      saveResult = await result.current.savePreferences();
    });

    expect(saveResult).toBe(true);
    expect(mockedService.updatePreferences).toHaveBeenCalledTimes(1);

    const arg = mockedService.updatePreferences.mock.calls[0][0];
    expect(arg).toHaveLength(5);
    const escrowPref = arg.find((p) => p.key === 'escrow_locked_in_app');
    expect(escrowPref?.enabled).toBe(false);
  });

  it('reports failure and sets error when saving fails', async () => {
    mockedService.updatePreferences.mockRejectedValueOnce(
      new Error('Save failed'),
    );

    const { result } = renderHook(() => useNotificationPreferences());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    let saveResult: boolean | undefined;
    await act(async () => {
      saveResult = await result.current.savePreferences();
    });

    expect(saveResult).toBe(false);
    expect(result.current.error).toBe('Save failed');
  });

  it('clears the error message', async () => {
    mockedService.getPreferences.mockRejectedValueOnce(
      new Error('Boom'),
    );

    const { result } = renderHook(() => useNotificationPreferences());
    await waitFor(() => expect(result.current.error).toBe('Boom'));

    act(() => {
      result.current.clearError();
    });

    expect(result.current.error).toBeNull();
  });

  it('resets local changes to the latest backend values', async () => {
    const { result } = renderHook(() => useNotificationPreferences());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    act(() => result.current.togglePreference('delivery_created_in_app', false));
    expect(result.current.preferences.deliveries[0].enabled).toBe(false);

    act(() => result.current.resetPreferences());

    expect(result.current.preferences.deliveries[0].enabled).toBe(true);
  });

  it('retries loading after an error', async () => {
    mockedService.getPreferences
      .mockRejectedValueOnce(new Error('Offline'))
      .mockResolvedValueOnce({ success: true, data: mockPreferences });
    const { result } = renderHook(() => useNotificationPreferences());
    await waitFor(() => expect(result.current.error).toBe('Offline'));

    await act(async () => result.current.retry());

    expect(result.current.error).toBeNull();
    expect(result.current.preferences.system).toHaveLength(1);
  });
});
