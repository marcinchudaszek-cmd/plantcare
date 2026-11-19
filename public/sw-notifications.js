// Dołączany do service workera (workbox importScripts).
// Kliknięcie w przypomnienie otwiera aplikację (albo przełącza na otwarte okno).
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || self.registration.scope;
  event.waitUntil((async () => {
    const all = await clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const c of all) {
      if ('focus' in c) {
        try { await c.navigate(target); } catch (e) { /* inny origin albo brak navigate */ }
        return c.focus();
      }
    }
    return clients.openWindow(target);
  })());
});
