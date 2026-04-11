import { useEffect } from 'react';
import { useAppStore } from '../store/useAppStore.js';
import { useSettingsStore } from '../store/useSettingsStore.js';
import { notifyAboutWatering, getPermission } from '../lib/notifications.js';

const CHECK_INTERVAL_MS = 1000 * 60 * 60 * 4; // co 4 godziny gdy aplikacja otwarta
const FIRST_CHECK_DELAY_MS = 1000 * 30;        // 30 sekund po starcie (nie od razu)

/** Hook uruchamiający periodyczny check podlewania */
export function useWateringReminders() {
  const plants = useAppStore((s) => s.plants);
  const notificationsEnabled = useSettingsStore((s) => s.notificationsEnabled);

  useEffect(() => {
    if (!notificationsEnabled) return;
    if (getPermission() !== 'granted') return;

    let intervalId;
    const firstTimer = setTimeout(() => {
      notifyAboutWatering(plants);
      intervalId = setInterval(() => {
        // Pobierz świeży stan ze store w momencie wykonania
        const currentPlants = useAppStore.getState().plants;
        notifyAboutWatering(currentPlants);
      }, CHECK_INTERVAL_MS);
    }, FIRST_CHECK_DELAY_MS);

    return () => {
      clearTimeout(firstTimer);
      if (intervalId) clearInterval(intervalId);
    };
  }, [notificationsEnabled, plants.length]);
  // ^ celowo plants.length, nie plants — żeby nie restartować timera przy każdym updacie
}
