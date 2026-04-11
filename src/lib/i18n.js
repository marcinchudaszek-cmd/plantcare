// Mini i18n bez zależności.
// Klucze hierarchiczne ('home.greet'), fallback do polskiego, fallback do klucza.

import { useSettingsStore } from '../store/useSettingsStore.js';
import pl from '../data/i18n/pl.json';
import en from '../data/i18n/en.json';
import de from '../data/i18n/de.json';

const DICTIONARIES = { pl, en, de };
const FALLBACK_LANG = 'pl';

/** Pobiera wartość po ścieżce 'a.b.c' z obiektu */
function getByPath(obj, path) {
  return path.split('.').reduce((acc, key) => (acc && acc[key] !== undefined ? acc[key] : undefined), obj);
}

/** Hook zwracający funkcję t(key, vars?) */
export function useT() {
  const lang = useSettingsStore((s) => s.language);
  const dict = DICTIONARIES[lang] || DICTIONARIES[FALLBACK_LANG];

  return (key, vars) => {
    let value = getByPath(dict, key);
    if (value === undefined) {
      // Fallback do polskiego
      value = getByPath(DICTIONARIES[FALLBACK_LANG], key);
    }
    if (value === undefined) {
      // Ostateczność: zwróć klucz, żeby było widać który brakuje
      return key;
    }
    if (vars) {
      Object.entries(vars).forEach(([k, v]) => {
        value = value.replace(new RegExp(`{${k}}`, 'g'), v);
      });
    }
    return value;
  };
}

export const SUPPORTED_LANGUAGES = [
  { code: 'pl', label: 'Polski',   flag: '🇵🇱' },
  { code: 'en', label: 'English',  flag: '🇬🇧' },
  { code: 'de', label: 'Deutsch',  flag: '🇩🇪' }
];
