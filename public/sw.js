// Service Worker para Push Notifications
self.addEventListener('push', (event) => {
  console.log('Push notification received:', event);
  
  if (!event.data) {
    return;
  }

  const data = event.data.json();
  const options = {
    body: data.message || data.body || 'Nueva notificación',
    icon: '/pantera-logo.png',
    badge: '/pantera-logo.png',
    vibrate: [200, 100, 200],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: data.id || '1'
    },
    actions: [
      {
        action: 'open',
        title: 'Ver',
        icon: '/pantera-logo.png'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'Pantera CrossTraining', options)
  );
});

self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event);
  event.notification.close();

  event.waitUntil(
    clients.openWindow('/')
  );
});

self.addEventListener('install', (event) => {
  console.log('Service Worker installing.');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('Service Worker activating.');
  event.waitUntil(clients.claim());
});
