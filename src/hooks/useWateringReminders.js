import { useEffect } from 'react';
import { useAppStore } from '../store/useAppStore.js';
import { useSettingsStore } from '../store/useSettingsStore.js';
import { notifyAboutWatering, getPermission } from '../lib/notifications.js';

const CHECK_INTERVAL_MS = 1000 * 60 * 60; // co godzinę, gdy aplikacja jest otwarta
const FIRST_CHECK_DELAY_MS = 1000 * 30;    // 30 sekund po starcie (nie od razu)

/**
 * Przypomnienia o podlewaniu. Działają, gdy aplikacja jest otwarta albo wraca na ekran
 * (zdarzenie visibilitychange). notifyAboutWatering pilnuje limitu „raz dziennie”.
 */
export function useWateringReminders() {
  const notificationsEnabled = useSettingsStore((s) => s.notificationsEnabled);
  const loaded = useAppStore((s) => s.loaded);

  useEffect(() => {
    if (!notificationsEnabled || !loaded) return;
    if (getPermission() !== 'granted') return;

    const check = () => notifyAboutWatering(useAppStore.getState().plants);
    const onVisible = () => { if (document.visibilityState === 'visible') check(); };

    const firstTimer = setTimeout(check, FIRST_CHECK_DELAY_MS);
    const intervalId = setInterval(check, CHECK_INTERVAL_MS);
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      clearTimeout(firstTimer);
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [notificationsEnabled, loaded]);
}
