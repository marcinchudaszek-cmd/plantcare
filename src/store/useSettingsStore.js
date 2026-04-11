// Drugi store — tylko ustawienia i metadata.
// Trzymane osobno od user data żeby reset kolekcji nie psuł klucza API.

import { create } from 'zustand';
import { loadKey, saveKey, KEYS } from '../lib/storage.js';

const INITIAL = {
  apiKey: '',
  theme: 'dark',                  // 'dark' | 'light'
  language: 'pl',                 // 'pl' | 'en' | 'de'
  notificationsEnabled: false,    // czy user włączył push
  scanHistory: [],                // [{ id, date, name, species, confidence, health, healthNote, thumb, matchId }]
  encycPhotoOverrides: {},        // { [encycId]: photoId } — własne zdjęcia gatunków z encyklopedii
  loaded: false
};

const MAX_HISTORY = 10;

export const useSettingsStore = create((set, get) => ({
  ...INITIAL,

  hydrate: async () => {
    const data = await loadKey(KEYS.SETTINGS, INITIAL);
    set({ ...data, loaded: true });
  },

  _save: () => {
    const { apiKey, theme, language, notificationsEnabled, scanHistory, encycPhotoOverrides } = get();
    saveKey(KEYS.SETTINGS, { apiKey, theme, language, notificationsEnabled, scanHistory, encycPhotoOverrides });
  },

  setApiKey: (key) => {
    set({ apiKey: key });
    get()._save();
  },

  setTheme: (theme) => {
    set({ theme });
    get()._save();
  },

  setLanguage: (language) => {
    set({ language });
    get()._save();
  },

  setNotificationsEnabled: (enabled) => {
    set({ notificationsEnabled: enabled });
    get()._save();
  },

  addScanToHistory: (scan) => {
    const entry = {
      id: Date.now(),
      date: new Date().toISOString(),
      ...scan
    };
    set((s) => ({
      scanHistory: [entry, ...s.scanHistory].slice(0, MAX_HISTORY)
    }));
    get()._save();
    return entry;
  },

  clearScanHistory: () => {
    set({ scanHistory: [] });
    get()._save();
  },

  // ===== ENCYC PHOTO OVERRIDES =====
  setEncycPhotoOverride: (encycId, photoId) => {
    set((s) => ({
      encycPhotoOverrides: { ...s.encycPhotoOverrides, [encycId]: photoId }
    }));
    get()._save();
  },

  removeEncycPhotoOverride: (encycId) => {
    set((s) => {
      const next = { ...s.encycPhotoOverrides };
      delete next[encycId];
      return { encycPhotoOverrides: next };
    });
    get()._save();
  }
}));
