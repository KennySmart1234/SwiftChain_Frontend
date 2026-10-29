import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PushNotificationButton } from '@/components/layout/PushNotificationButton';
import { pushNotificationService } from '@/services/pushNotificationService';

jest.mock('@/services/pushNotificationService', () => ({
  pushNotificationService: {
    registerServiceWorker: jest.fn(),
    requestPermission: jest.fn(),
    subscribe: jest.fn(),
    saveSubscription: jest.fn(),
  },
}));

const mockedService = jest.mocked(pushNotificationService);

const registration = {} as ServiceWorkerRegistration;
const subscription = {} as PushSubscription;

describe('usePushNotifications', () => {
  beforeAll(() => {
    Object.defineProperty(window, 'PushManager', {
      configurable: true,
      value: class PushManager {},
    });
    Object.defineProperty(window, 'Notification', {
      configurable: true,
      value: { permission: 'default' },
    });
    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      value: {},
    });
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockedService.registerServiceWorker.mockResolvedValue(registration);
    mockedService.requestPermission.mockResolvedValue('granted');
    mockedService.subscribe.mockResolvedValue(subscription);
    mockedService.saveSubscription.mockResolvedValue();
  });

  it('registers the worker and requests native permission from a user click', async () => {
    const user = userEvent.setup();
    render(<PushNotificationButton />);

    const button = await screen.findByRole('button', {
      name: 'Enable shipment notifications',
    });
    await waitFor(() =>
      expect(mockedService.registerServiceWorker).toHaveBeenCalledTimes(1),
    );
    await user.click(button);

    expect(mockedService.requestPermission).toHaveBeenCalledTimes(1);
    expect(mockedService.subscribe).toHaveBeenCalledWith(registration);
    expect(mockedService.saveSubscription).toHaveBeenCalledWith(subscription);
    expect(
      await screen.findByRole('button', {
        name: 'Shipment notifications enabled',
      }),
    ).toHaveAttribute('aria-pressed', 'true');
  });

  it('does not create a subscription when permission is denied', async () => {
    mockedService.requestPermission.mockResolvedValue('denied');
    const user = userEvent.setup();
    render(<PushNotificationButton />);

    await user.click(
      await screen.findByRole('button', {
        name: 'Enable shipment notifications',
      }),
    );

    await waitFor(() => expect(mockedService.requestPermission).toHaveBeenCalled());
    expect(mockedService.subscribe).not.toHaveBeenCalled();
    expect(
      screen.getByRole('button', { name: 'Enable shipment notifications' }),
    ).toHaveAttribute('title', 'Notification permission was not granted');
  });
});
