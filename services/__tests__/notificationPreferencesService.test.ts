import { notificationPreferencesService } from '@/services/notificationPreferencesService';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

const mockPreferences = [
  {
    key: 'delivery_created_in_app',
    category: 'deliveries' as const,
    label: 'Delivery Created',
    channel: 'in_app' as const,
    enabled: true,
  },
  {
    key: 'escrow_locked_email',
    category: 'escrow' as const,
    label: 'Escrow Locked',
    channel: 'email' as const,
    enabled: false,
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

describe('notificationPreferencesService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getPreferences', () => {
    it('fetches preferences from the backend API', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: { success: true, data: mockPreferences },
      });

      const response =
        await notificationPreferencesService.getPreferences();

      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.stringContaining('/api/notifications/preferences'),
      );
      expect(response.success).toBe(true);
      expect(response.data).toEqual(mockPreferences);
    });

    it('propagates network errors', async () => {
      mockedAxios.get.mockRejectedValueOnce(new Error('Network error'));

      await expect(
        notificationPreferencesService.getPreferences(),
      ).rejects.toThrow('Network error');
    });
  });

  describe('updatePreferences', () => {
    it('PUTs preferences to the backend API', async () => {
      mockedAxios.put.mockResolvedValueOnce({
        data: { success: true, data: mockPreferences },
      });

      const response =
        await notificationPreferencesService.updatePreferences(
          mockPreferences,
        );

      expect(mockedAxios.put).toHaveBeenCalledWith(
        expect.stringContaining('/api/notifications/preferences'),
        { preferences: mockPreferences },
      );
      expect(response.success).toBe(true);
    });

    it('propagates save errors', async () => {
      mockedAxios.put.mockRejectedValueOnce(new Error('Save failed'));

      await expect(
        notificationPreferencesService.updatePreferences(mockPreferences),
      ).rejects.toThrow('Save failed');
    });
  });
});
