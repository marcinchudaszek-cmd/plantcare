// Lekka warstwa nad Notification API.
// PWA push (z Workerem) zostawiamy na fazę po publikacji TWA — tam działa
// inaczej i wymaga endpointa serwerowego. Tu używamy lokalnych notyfikacji,
// które działają gdy aplikacja jest otwarta lub w tle (PWA installed).

export function isSupported() {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export function getPermission() {
  if (!isSupported()) return 'unsupported';
  return Notification.permission; // 'granted' | 'denied' | 'default'
}

export async function requestPermission() {
  if (!isSupported()) return 'unsupported';
  if (Notification.permission === 'granted') return 'granted';
  if (Notification.permission === 'denied') return 'denied';
  try {
    const result = await Notification.requestPermission();
    return result;
  } catch {
    return 'denied';
  }
}

/**
 * Pokaż natychmiastowe powiadomienie.
 * Działa gdy zakładka jest otwarta lub PWA jest zainstalowane.
 */
export function notify(title, body, opts = {}) {
  if (!isSupported() || Notification.permission !== 'granted') return false;
  try {
    new Notification(title, {
      body,
      icon: '/plantcare/icons/icon-192x192.png',
      badge: '/plantcare/icons/icon-96x96.png',
      tag: opts.tag || 'plantcare',
      ...opts
    });
    return true;
  } catch (e) {
    console.warn('[notifications] notify failed', e);
    return false;
  }
}

/**
 * Sprawdza ile roślin wymaga podlewania i wysyła powiadomienie.
 * Wywoływane periodycznie przez useWateringReminders.
 */
export function notifyAboutWatering(plants, t) {
  const dueCount = plants.filter((p) => {
    if (!p.lastWatered) return true;
    const days = Math.floor((Date.now() - new Date(p.lastWatered).getTime()) / 86400000);
    return days >= (p.interval || 7);
  }).length;

  if (dueCount === 0) return false;

  const title = '🌿 PlantCare';
  const body = dueCount === 1
    ? (t ? t('notifications.one') : 'Jedna roślina czeka na podlanie')
    : (t ? t('notifications.many', { n: dueCount }) : `${dueCount} roślin czeka na podlanie`);

  return notify(title, body, { tag: 'watering-reminder' });
}
