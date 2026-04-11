import { useEffect, useState, useRef } from 'react';
import { loadPhoto } from '../lib/photoStore.js';

// Cache wszystkich załadowanych URLi w pamięci sesji.
// Klucz = photoId, wartość = blob URL.
// Dzięki temu jak komponent się remontuje, nie ładujemy ponownie.
const urlCache = new Map();

/** Hook ładujący zdjęcie z photoStore i zwracający blob URL */
export function usePhoto(photoId) {
  const [url, setUrl] = useState(() => (photoId ? urlCache.get(photoId) || null : null));
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  useEffect(() => {
    if (!photoId) {
      setUrl(null);
      return;
    }
    // Już w cache?
    const cached = urlCache.get(photoId);
    if (cached) {
      setUrl(cached);
      return;
    }
    // Ładuj z IndexedDB
    let cancelled = false;
    loadPhoto(photoId).then((blob) => {
      if (cancelled || !mounted.current) return;
      if (!blob) {
        setUrl(null);
        return;
      }
      const objectUrl = URL.createObjectURL(blob);
      urlCache.set(photoId, objectUrl);
      setUrl(objectUrl);
    }).catch(() => {
      if (!cancelled && mounted.current) setUrl(null);
    });
    return () => { cancelled = true; };
  }, [photoId]);

  return url;
}

/** Wyrzuca cache (np. po imporcie backupu) */
export function clearPhotoUrlCache() {
  urlCache.forEach((url) => URL.revokeObjectURL(url));
  urlCache.clear();
}

/** Inwaliduje pojedyncze zdjęcie z cache (np. po podmianie) */
export function invalidatePhotoUrl(photoId) {
  const url = urlCache.get(photoId);
  if (url) {
    URL.revokeObjectURL(url);
    urlCache.delete(photoId);
  }
}
