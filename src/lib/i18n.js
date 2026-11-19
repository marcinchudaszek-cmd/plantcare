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

function makeT(lang) {
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

/** Hook zwracający funkcję t(key, vars?) */
export function useT() {
  const lang = useSettingsStore((s) => s.language);
  return makeT(lang);
}

/** Tłumaczenie poza komponentami (powiadomienia, błędy w lib/) — bierze bieżący język */
export function translate(key, vars) {
  return makeT(useSettingsStore.getState().language)(key, vars);
}

const LOCALES = { pl: 'pl-PL', en: 'en-GB', de: 'de-DE' };

/** Locale do formatowania dat i liczb (toLocaleDateString itp.) */
export function locale() {
  return LOCALES[useSettingsStore.getState().language] || LOCALES.pl;
}

/** Bieżący kod języka poza komponentami */
export function currentLang() {
  return useSettingsStore.getState().language || FALLBACK_LANG;
}

export const SUPPORTED_LANGUAGES = [
  { code: 'pl', label: 'Polski',   flag: '🇵🇱' },
  { code: 'en', label: 'English',  flag: '🇬🇧' },
  { code: 'de', label: 'Deutsch',  flag: '🇩🇪' }
];
