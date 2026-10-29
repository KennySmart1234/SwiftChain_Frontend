import axios from 'axios';
import { APIError, notificationService } from '@/services/notificationService';
import { apiClient } from '@/services/api';
import type { Notification } from '@/context/NotificationContext';

jest.mock('axios');
jest.mock('@/services/api', () => ({
  apiClient: {
    get: jest.fn(),
    patch: jest.fn(),
    post: jest.fn(),
  },
}));

const mockedAxios = axios as jest.Mocked<typeof axios>;
const mockedApiClient = apiClient as jest.Mocked<typeof apiClient>;

const mockNotifications: Notification[] = [
  {
    id: '1',
    title: 'Delivery Update',
    message: 'Your package is out for delivery.',
    type: 'delivery',
    read: false,
    createdAt: '2026-04-28T10:00:00Z',
  },
  {
    id: '2',
    title: 'System Alert',
    message: 'Scheduled maintenance tonight.',
    type: 'system',
    read: true,
    createdAt: '2026-04-27T09:00:00Z',
  },
];

describe('notificationService', () => {
  afterEach(() => jest.clearAllMocks());

  it('gets notification preferences for a user', async () => {
    const preferences = { email: true, push: false };
    mockedApiClient.get.mockResolvedValue({ data: preferences });

    await expect(notificationService.getPreferences('user-1')).resolves.toEqual(
      preferences,
    );
    expect(mockedApiClient.get).toHaveBeenCalledWith(
      '/users/user-1/notification-preferences',
    );
  });

  it('patches only the supplied notification preference updates', async () => {
    const updates = { email: false };
    const response = { preferences: { email: false, push: false } };
    mockedApiClient.patch.mockResolvedValue({ data: response });

    await expect(
      notificationService.updatePreferences('user-1', updates),
    ).resolves.toEqual(response);
    expect(mockedApiClient.patch).toHaveBeenCalledWith(
      '/users/user-1/notification-preferences',
      updates,
    );
  });

  it('resets notification preferences to defaults', async () => {
    const response = { preferences: { email: true, push: true } };
    mockedApiClient.post.mockResolvedValue({ data: response });

    await expect(
      notificationService.resetToDefaults('user-1'),
    ).resolves.toEqual(response);
    expect(mockedApiClient.post).toHaveBeenCalledWith(
      '/users/user-1/notification-preferences/reset',
    );
  });

  it('normalizes API errors from preference requests', async () => {
    (mockedAxios.isAxiosError as jest.Mock).mockImplementation(
      (error: unknown) =>
        Boolean((error as { isAxiosError?: boolean })?.isAxiosError),
    );
    mockedApiClient.get.mockRejectedValue({
      isAxiosError: true,
      message: 'Request failed',
      code: 'ERR_BAD_RESPONSE',
      response: { status: 503, data: { message: 'Preferences unavailable' } },
    });

    const error = await notificationService
      .getPreferences('user-1')
      .catch((requestError: unknown) => requestError);

    expect(error).toBeInstanceOf(APIError);
    expect(error).toMatchObject({
      name: 'APIError',
      message: 'Preferences unavailable',
      status: 503,
      code: 'ERR_BAD_RESPONSE',
    });
  });

  it('should call GET /api/notifications and return data', async () => {
    mockedAxios.get = jest.fn().mockResolvedValue({ data: mockNotifications });
    const result = await notificationService.getNotifications();
    expect(mockedAxios.get).toHaveBeenCalledWith(
      expect.stringContaining('/api/notifications'),
    );
    expect(result).toEqual(mockNotifications);
  });

  it('should return an array of notification objects', async () => {
    mockedAxios.get = jest.fn().mockResolvedValue({ data: mockNotifications });
    const result = await notificationService.getNotifications();
    expect(Array.isArray(result)).toBe(true);
    expect(result[0]).toHaveProperty('id');
    expect(result[0]).toHaveProperty('read');
  });

  it('should throw when GET /api/notifications fails', async () => {
    mockedAxios.get = jest.fn().mockRejectedValue(new Error('Network Error'));
    await expect(notificationService.getNotifications()).rejects.toThrow(
      'Network Error',
    );
  });

  it('should call POST /api/notifications/read-all', async () => {
    mockedAxios.post = jest.fn().mockResolvedValue({ data: {} });
    await notificationService.markAllAsRead();
    expect(mockedAxios.post).toHaveBeenCalledWith(
      expect.stringContaining('/api/notifications/read-all'),
    );
  });

  it('should throw when POST /api/notifications/read-all fails', async () => {
    mockedAxios.post = jest.fn().mockRejectedValue(new Error('Server Error'));
    await expect(notificationService.markAllAsRead()).rejects.toThrow(
      'Server Error',
    );
  });
});