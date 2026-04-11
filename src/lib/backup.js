// Eksport / import całego state aplikacji do pliku JSON.
// Wersja 3 — z obsługą galerii zdjęć (Blob → base64).

import { loadKey, saveKey, KEYS } from './storage.js';
import { listPhotoIds, loadPhoto, savePhoto, clearAllPhotos } from './photoStore.js';
import { clearPhotoUrlCache } from '../hooks/usePhoto.js';

const FORMAT_VERSION = 3;

/** Konwertuje Blob na base64 string */
function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      // FileReader zwraca data URL, wycinamy prefix
      const comma = result.indexOf(',');
      resolve({
        type: blob.type,
        data: comma >= 0 ? result.slice(comma + 1) : result
      });
    };
    reader.onerror = () => reject(new Error('Nie udało się odczytać Bloba'));
    reader.readAsDataURL(blob);
  });
}

/** Konwertuje base64 z powrotem na Blob */
function base64ToBlob({ type, data }) {
  const binary = atob(data);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: type || 'image/jpeg' });
}

/** Zbiera wszystkie dane do jednego obiektu eksportu */
export async function exportAll() {
  const userData = await loadKey(KEYS.USER_DATA, { plants: [], tags: [] });
  const settings = await loadKey(KEYS.SETTINGS, {});

  // Klucz API NIE jest częścią backupu — bezpieczeństwo
  const settingsClean = { ...settings };
  delete settingsClean.apiKey;

  // Zbierz wszystkie zdjęcia
  const photoIds = await listPhotoIds();
  const photos = {};
  for (const id of photoIds) {
    const blob = await loadPhoto(id);
    if (blob) {
      try {
        photos[id] = await blobToBase64(blob);
      } catch (e) {
        console.warn('Skip photo', id, e);
      }
    }
  }

  return {
    format: 'plantcare-backup',
    version: FORMAT_VERSION,
    exportedAt: new Date().toISOString(),
    userData,
    settings: settingsClean,
    photos
  };
}

/** Pobiera plik z eksportem */
export async function downloadBackup() {
  const data = await exportAll();
  const json = JSON.stringify(data);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  const date = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `plantcare-backup-${date}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/** Wczytuje backup z pliku — zwraca obiekt do walidacji przed apply */
export function readBackupFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result);
        if (parsed.format !== 'plantcare-backup') {
          return reject(new Error('To nie jest plik backupu PlantCare.'));
        }
        if (!parsed.userData) {
          return reject(new Error('Plik nie zawiera danych roślin.'));
        }
        resolve(parsed);
      } catch (e) {
        reject(new Error('Niepoprawny format JSON.'));
      }
    };
    reader.onerror = () => reject(new Error('Nie udało się odczytać pliku.'));
    reader.readAsText(file);
  });
}

/** Stosuje zwalidowany backup — zastępuje obecne dane (i zdjęcia) */
export async function applyBackup(backup) {
  // 1. Wyczyść stare zdjęcia z photoStore
  await clearAllPhotos();
  clearPhotoUrlCache();

  // 2. Wgraj nowe zdjęcia (jeśli są w backupie)
  if (backup.photos) {
    for (const [id, encoded] of Object.entries(backup.photos)) {
      try {
        const blob = base64ToBlob(encoded);
        await savePhoto(id, blob);
      } catch (e) {
        console.warn('Skip photo on import', id, e);
      }
    }
  }

  // 3. Zapisz user data
  await saveKey(KEYS.USER_DATA, backup.userData);

  // 4. Zapisz ustawienia (zachowując obecny klucz API)
  if (backup.settings) {
    const currentSettings = await loadKey(KEYS.SETTINGS, {});
    await saveKey(KEYS.SETTINGS, {
      ...backup.settings,
      apiKey: currentSettings.apiKey || ''
    });
  }
}
