// Lekka warstwa nad powiadomieniami.
// Na Androidzie (Chrome i aplikacja z Play/TWA) konstruktor `new Notification()` rzuca
// „Illegal constructor” — tam działa tylko ServiceWorkerRegistration.showNotification().
// Dlatego najpierw próbujemy przez service worker, a `new Notification()` zostaje
// jako zapas dla przeglądarek bez SW (np. tryb deweloperski).

import { translate } from './i18n.js';

const BASE = import.meta.env.BASE_URL || '/';
const ICON = `${BASE}icons/icon-192x192.png`;
const BADGE = `${BASE}icons/icon-96x96.png`;
const LAST_REMINDER_KEY = 'plantcare-last-watering-reminder';

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
    return await Notification.requestPermission();
  } catch {
    return 'denied';
  }
}

async function getRegistration() {
  if (!('serviceWorker' in navigator)) return null;
  try {
    const existing = await navigator.serviceWorker.getRegistration();
    if (existing) return existing;
    // SW mógł się jeszcze nie zarejestrować — czekamy chwilę na gotowość
    return await Promise.race([
      navigator.serviceWorker.ready,
      new Promise((r) => setTimeout(() => r(null), 3000))
    ]);
  } catch {
    return null;
  }
}

/**
 * Pokaż powiadomienie. Zwraca Promise<boolean> — czy udało się je wyświetlić.
 */
export async function notify(title, body, opts = {}) {
  if (!isSupported() || Notification.permission !== 'granted') return false;
  const options = { body, icon: ICON, badge: BADGE, tag: opts.tag || 'plantcare', ...opts };

  const reg = await getRegistration();
  if (reg?.showNotification) {
    try {
      await reg.showNotification(title, options);
      return true;
    } catch (e) {
      console.warn('[notifications] showNotification failed', e);
    }
  }
  try {
    new Notification(title, options);
    return true;
  } catch (e) {
    console.warn('[notifications] notify failed', e);
    return false;
  }
}

/** Ile roślin wymaga podlania */
export function countDue(plants) {
  return plants.filter((p) => {
    if (!p.lastWatered) return true;
    const days = Math.floor((Date.now() - new Date(p.lastWatered).getTime()) / 86400000);
    return days >= (p.interval || 7);
  }).length;
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Sprawdza ile roślin wymaga podlewania i wysyła powiadomienie — najwyżej raz dziennie,
 * żeby każde otwarcie aplikacji nie kończyło się tym samym przypomnieniem.
 */
export async function notifyAboutWatering(plants, { force = false } = {}) {
  const dueCount = countDue(plants);
  if (dueCount === 0) return false;

  if (!force) {
    try {
      if (localStorage.getItem(LAST_REMINDER_KEY) === todayKey()) return false;
    } catch { /* brak localStorage — trudno, przypomnimy */ }
  }

  const body = dueCount === 1
    ? translate('notifications.one')
    : translate('notifications.many', { n: dueCount });

  const ok = await notify('🌿 PlantCare', body, { tag: 'watering-reminder', data: { url: `${BASE}#/plants` } });
  if (ok) {
    try { localStorage.setItem(LAST_REMINDER_KEY, todayKey()); } catch { /* ignoruj */ }
  }
  return ok;
}
