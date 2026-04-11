import { useEffect } from 'react';
import { useSettingsStore } from '../store/useSettingsStore.js';

/** Hook synchronizujący wartość theme ze store na klasę html.light */
export function useTheme() {
  const theme = useSettingsStore((s) => s.theme);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'light') {
      root.classList.add('light');
    } else {
      root.classList.remove('light');
    }
    // Aktualizuj też kolor pod systemowy bar (np. PWA na mobile)
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
      meta.setAttribute('content', theme === 'light' ? '#f6f1e4' : '#0b2218');
    }
  }, [theme]);
}
