// Warstwa persystencji — IndexedDB przez idb-keyval.
// Używamy jednej "bazy" (plantcare-store) i kilku kluczy.
// IndexedDB nie ma limitu localStorage (~5 MB) — bezpiecznie trzyma zdjęcia.

import { createStore, get, set, del, keys } from 'idb-keyval';

const store = createStore('plantcare-db', 'plantcare-store');

export const KEYS = {
  USER_DATA: 'user-data',     // { plants, journal, tags, ... }
  SETTINGS:  'settings',      // { theme, language, ... }
  PHOTOS:    'photos'         // mapa photoId -> base64 (osobno, większe blobby)
};

export async function loadKey(key, fallback = null) {
  try {
    const v = await get(key, store);
    return v ?? fallback;
  } catch (e) {
    console.warn('[storage] load failed', key, e);
    return fallback;
  }
}

export async function saveKey(key, value) {
  try {
    await set(key, value, store);
    return true;
  } catch (e) {
    console.error('[storage] save failed', key, e);
    return false;
  }
}

export async function deleteKey(key) {
  try {
    await del(key, store);
    return true;
  } catch (e) {
    console.error('[storage] delete failed', key, e);
    return false;
  }
}

export async function listKeys() {
  try { return await keys(store); }
  catch { return []; }
}
