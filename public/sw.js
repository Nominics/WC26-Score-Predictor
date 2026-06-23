
/**
 * Arena WC26 Service Worker
 * Handles background push notifications and deep linking
 */

self.addEventListener('push', function (event) {
  if (event.data) {
    try {
      const data = event.data.json();
      const options = {
        body: data.body,
        icon: '/logo.png',
        badge: '/logo.png',
        vibrate: [100, 50, 100],
        data: {
          url: data.url || '/dashboard'
        },
        actions: [
          { action: 'open', title: 'View Arena' }
        ]
      };

      event.waitUntil(
        self.registration.showNotification(data.title, options)
      );
    } catch (e) {
      console.error('Error parsing push data:', e);
    }
  }
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();

  // URL to navigate to
  const urlToOpen = event.notification.data && event.notification.data.url 
    ? event.notification.data.url 
    : '/dashboard';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clientList) {
      // 1. If a window is already open, focus it and navigate
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          if (urlToOpen) client.navigate(urlToOpen);
          return client.focus();
        }
      }
      // 2. If no window is open, open a new one
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
