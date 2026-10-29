const DEFAULT_NOTIFICATION = {
  title: 'SwiftChain shipment update',
  body: 'A shipment you follow has a new status.',
  url: '/',
};

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  let payload = DEFAULT_NOTIFICATION;

  if (event.data) {
    try {
      payload = { ...DEFAULT_NOTIFICATION, ...event.data.json() };
    } catch {
      payload = { ...DEFAULT_NOTIFICATION, body: event.data.text() };
    }
  }

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      badge: payload.badge,
      icon: payload.icon,
      tag: payload.tag || 'swiftchain-shipment-update',
      data: { url: payload.url },
      renotify: Boolean(payload.renotify),
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = new URL(event.notification.data?.url || '/', self.location.origin).href;

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      const matchingClient = clients.find((client) => client.url === targetUrl);
      if (matchingClient) {
        return matchingClient.focus();
      }
      return self.clients.openWindow(targetUrl);
    }),
  );
});
