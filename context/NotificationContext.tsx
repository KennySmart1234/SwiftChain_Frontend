'use client';

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from 'react';

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'delivery' | 'system' | 'alert';
  read: boolean;
  createdAt: string;
}

interface NotificationContextValue {
  notifications: Notification[];
  unreadCount: number;
  setNotifications: (notifications: Notification[]) => void;
  addNotification: (notification: Notification) => void;
  markAllAsRead: () => void;
}

const NotificationContext = createContext<NotificationContextValue | null>(
  null
);

const sortNotificationsByNewestFirst = (items: Notification[]) =>
  [...items].sort((a, b) => {
    const timeA = new Date(a.createdAt).getTime();
    const timeB = new Date(b.createdAt).getTime();

    if (Number.isNaN(timeA) && Number.isNaN(timeB)) return 0;
    if (Number.isNaN(timeA)) return 1;
    if (Number.isNaN(timeB)) return -1;

    return timeB - timeA;
  });

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotificationsState] = useState<Notification[]>([]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const setNotifications = useCallback((items: Notification[]) => {
    setNotificationsState(sortNotificationsByNewestFirst(items));
  }, []);

  // Called directly by the WebSocket handler — updates badge immediately
  const addNotification = useCallback((notification: Notification) => {
    setNotificationsState((prev) =>
      sortNotificationsByNewestFirst([notification, ...prev])
    );
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotificationsState((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        setNotifications,
        addNotification,
        markAllAsRead,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotificationContext(): NotificationContextValue {
  const ctx = useContext(NotificationContext);
  if (!ctx) {
    throw new Error(
      'useNotificationContext must be used within NotificationProvider'
    );
  }
  return ctx;
}
