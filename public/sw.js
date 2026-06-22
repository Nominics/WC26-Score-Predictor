
self.addEventListener("push", function (event) {
  let payload = {
    title: "WC26 Predictor",
    body: "You have a new update.",
    url: "/dashboard",
  };

  if (event.data) {
    try {
      payload = event.data.json();
    } catch {
      payload.body = event.data.text();
    }
  }

  event.waitUntil(
    self.registration.showNotification(payload.title || "WC26 Predictor", {
      body: payload.body,
      icon: "/logo.png",
      badge: "/logo.png",
      data: {
        url: payload.url || "/dashboard",
      },
    })
  );
});

self.addEventListener("notificationclick", function (event) {
  event.notification.close();

  const url = event.notification.data?.url || "/dashboard";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ("focus" in client) {
          client.focus();
          client.navigate(url);
          return;
        }
      }

      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});
