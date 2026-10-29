'use client';

import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import { pushNotificationService } from '@/services/pushNotificationService';

const subscribeToBrowserCapability = () => () => undefined;
const getServerCapability = () => false;
const getBrowserCapability = () =>
  'serviceWorker' in navigator &&
  'PushManager' in window &&
  'Notification' in window;

export function usePushNotifications() {
  const isSupported = useSyncExternalStore(
    subscribeToBrowserCapability,
    getBrowserCapability,
    getServerCapability,
  );
  const [permission, setPermission] =
    useState<NotificationPermission>('default');
  const [registration, setRegistration] =
    useState<ServiceWorkerRegistration | null>(null);
  const [isEnabling, setIsEnabling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isSupported) return;

    let active = true;
    void pushNotificationService
      .registerServiceWorker()
      .then((registeredWorker) => {
        if (!active) return;
        setRegistration(registeredWorker);
        setPermission(Notification.permission);
      })
      .catch((registrationError: unknown) => {
        if (active) {
          setError(
            registrationError instanceof Error
              ? registrationError.message
              : 'Unable to register notifications',
          );
        }
      });

    return () => {
      active = false;
    };
  }, [isSupported]);

  const enable = useCallback(async () => {
    if (!isSupported) return;
    setIsEnabling(true);
    setError(null);

    try {
      const nextPermission = await pushNotificationService.requestPermission();
      setPermission(nextPermission);
      if (nextPermission !== 'granted') {
        throw new Error('Notification permission was not granted');
      }

      const activeRegistration =
        registration ??
        (await pushNotificationService.registerServiceWorker());
      setRegistration(activeRegistration);
      const subscription = await pushNotificationService.subscribe(
        activeRegistration,
      );
      await pushNotificationService.saveSubscription(subscription);
    } catch (enableError) {
      setError(
        enableError instanceof Error
          ? enableError.message
          : 'Unable to enable notifications',
      );
    } finally {
      setIsEnabling(false);
    }
  }, [isSupported, registration]);

  return {
    isSupported,
    permission,
    isEnabling,
    error,
    enable,
  };
}
