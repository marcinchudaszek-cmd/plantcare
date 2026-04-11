// Osobna baza IndexedDB tylko na zdjęcia (Bloby).
// Trzymanie ich osobno od user-data ma kilka zalet:
// 1. user-data jest mały (kB) i może być często serializowany do JSON
// 2. zdjęcia są duże (MB) i nie powinny być w głównym objekcie
// 3. backup może je obsłużyć osobno (Blob → base64 dopiero przy eksporcie)

import { createStore, get, set, del, keys, clear } from 'idb-keyval';

const photoDb = createStore('plantcare-photos', 'blobs');

export async function savePhoto(id, blob) {
  await set(id, blob, photoDb);
}

export async function loadPhoto(id) {
  return await get(id, photoDb);
}

export async function deletePhoto(id) {
  await del(id, photoDb);
}

export async function listPhotoIds() {
  return await keys(photoDb);
}

export async function clearAllPhotos() {
  await clear(photoDb);
}

/** Generuje unikalny ID dla nowego zdjęcia */
export function newPhotoId(prefix = 'photo') {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Skaluje obraz do max wymiaru przed zapisem.
 * Zwraca Blob (image/jpeg, jakość 0.85).
 */
export function compressImage(file, maxDim = 1600) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const ratio = Math.min(maxDim / img.width, maxDim / img.height, 1);
      const w = Math.round(img.width * ratio);
      const h = Math.round(img.height * ratio);
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error('Konwersja nie powiodła się'))),
        'image/jpeg',
        0.85
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Niepoprawne zdjęcie'));
    };
    img.src = url;
  });
}
