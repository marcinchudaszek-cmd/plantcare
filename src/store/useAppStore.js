// Globalny store aplikacji.
// Zustand + ręczna persystencja do IndexedDB (idb-keyval).

import { create } from 'zustand';
import { loadKey, saveKey, KEYS } from '../lib/storage.js';
import { createUserPlant } from '../lib/plantUtils.js';
import { savePhoto, deletePhoto, newPhotoId, compressImage } from '../lib/photoStore.js';
import { invalidatePhotoUrl } from '../hooks/usePhoto.js';

const INITIAL = {
  plants: [],          // lista roślin użytkownika
  tags: [],            // wszystkie unikalne tagi (cache do podpowiedzi)
  loaded: false        // czy dane już wczytane z IndexedDB
};

export const useAppStore = create((set, get) => ({
  ...INITIAL,

  hydrate: async () => {
    const data = await loadKey(KEYS.USER_DATA, INITIAL);
    set({ ...data, loaded: true });
  },

  _save: () => {
    const { plants, tags } = get();
    saveKey(KEYS.USER_DATA, { plants, tags });
  },

  // ===== ROŚLINY =====
  addPlantFromEncyc: (encycPlant, opts = {}) => {
    const newPlant = createUserPlant({ encycPlant, ...opts });
    set((s) => ({ plants: [...s.plants, newPlant] }));
    get()._save();
    return newPlant;
  },

  removePlant: async (id) => {
    const plant = get().plants.find((p) => p.id === id);
    // Usuń też zdjęcia z photoStore
    if (plant?.photos?.length) {
      for (const photoId of plant.photos) {
        await deletePhoto(photoId);
        invalidatePhotoUrl(photoId);
      }
    }
    set((s) => ({ plants: s.plants.filter((p) => p.id !== id) }));
    get()._save();
  },

  updatePlant: (id, patch) => {
    set((s) => ({
      plants: s.plants.map((p) => (p.id === id ? { ...p, ...patch } : p))
    }));
    get()._save();
  },

  waterPlant: (id) => {
    set((s) => ({
      plants: s.plants.map((p) =>
        p.id === id ? { ...p, lastWatered: new Date().toISOString() } : p
      )
    }));
    get()._save();
  },

  // ===== GALERIA ZDJĘĆ ROŚLINY =====
  /** Dodaje zdjęcie do galerii rośliny (kompresuje, zapisuje Blob, ustawia jako cover jeśli brak) */
  addPlantPhoto: async (plantId, file) => {
    const blob = await compressImage(file, 1600);
    const photoId = newPhotoId('plant');
    await savePhoto(photoId, blob);
    const addedAt = new Date().toISOString();

    set((s) => ({
      plants: s.plants.map((p) => {
        if (p.id !== plantId) return p;
        const photos = [...(p.photos || []), photoId];
        // Pierwsze zdjęcie automatycznie staje się cover
        const coverPhotoId = p.coverPhotoId || photoId;
        // Backward-compat: jeśli photoMeta nie istnieje, tworzymy
        const photoMeta = { ...(p.photoMeta || {}), [photoId]: { addedAt } };
        return { ...p, photos, coverPhotoId, photoMeta };
      })
    }));
    get()._save();
    return photoId;
  },

  removePlantPhoto: async (plantId, photoId) => {
    await deletePhoto(photoId);
    invalidatePhotoUrl(photoId);

    set((s) => ({
      plants: s.plants.map((p) => {
        if (p.id !== plantId) return p;
        const photos = (p.photos || []).filter((id) => id !== photoId);
        // Jeśli usuwamy cover, ustaw kolejne (lub null)
        const coverPhotoId = p.coverPhotoId === photoId ? (photos[0] || null) : p.coverPhotoId;
        // Posprzątaj meta
        const photoMeta = { ...(p.photoMeta || {}) };
        delete photoMeta[photoId];
        return { ...p, photos, coverPhotoId, photoMeta };
      })
    }));
    get()._save();
  },

  setPlantCover: (plantId, photoId) => {
    set((s) => ({
      plants: s.plants.map((p) =>
        p.id === plantId ? { ...p, coverPhotoId: photoId } : p
      )
    }));
    get()._save();
  },

  // ===== DZIENNIK =====
  addJournalEntry: (plantId, text) => {
    const entry = { id: Date.now(), date: new Date().toISOString(), text };
    set((s) => ({
      plants: s.plants.map((p) =>
        p.id === plantId ? { ...p, journal: [entry, ...(p.journal || [])] } : p
      )
    }));
    get()._save();
  },

  removeJournalEntry: (plantId, entryId) => {
    set((s) => ({
      plants: s.plants.map((p) =>
        p.id === plantId
          ? { ...p, journal: (p.journal || []).filter((e) => e.id !== entryId) }
          : p
      )
    }));
    get()._save();
  },

  // ===== TAGI =====
  setPlantTags: (plantId, tags) => {
    set((s) => {
      const plants = s.plants.map((p) =>
        p.id === plantId ? { ...p, tags } : p
      );
      const allTags = Array.from(new Set(plants.flatMap((p) => p.tags || [])));
      return { plants, tags: allTags };
    });
    get()._save();
  },

  // ===== DEV / RESET =====
  resetAll: async () => {
    await saveKey(KEYS.USER_DATA, INITIAL);
    set({ ...INITIAL, loaded: true });
  }
}));
