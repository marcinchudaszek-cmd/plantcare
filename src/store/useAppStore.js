// Globalny store aplikacji.
// Zustand + ręczna persystencja do IndexedDB (idb-keyval).
//
// Pod synchronizację w chmurze (lib/cloudSync.js):
//  - każda zmiana rośliny ustawia `updatedAt` — przy scalaniu wygrywa nowsza wersja,
//  - usunięte rośliny i zdjęcia trafiają do `deleted` / `deletedPhotos` (z datą),
//    żeby usunięcie na jednym urządzeniu dotarło do pozostałych.

import { create } from 'zustand';
import { loadKey, saveKey, KEYS } from '../lib/storage.js';
import { createUserPlant, createCustomPlant } from '../lib/plantUtils.js';
import { savePhoto, deletePhoto, newPhotoId, compressImage } from '../lib/photoStore.js';
import { invalidatePhotoUrl } from '../hooks/usePhoto.js';

const INITIAL = {
  plants: [],          // lista roślin użytkownika
  tags: [],            // wszystkie unikalne tagi (cache do podpowiedzi)
  deleted: {},         // { [plantId]: isoDate } — usunięte rośliny do przekazania do chmury
  deletedPhotos: [],   // id zdjęć usuniętych lokalnie, jeszcze nieusuniętych w chmurze
  loaded: false        // czy dane już wczytane z IndexedDB
};

const now = () => new Date().toISOString();
const stamp = (p) => ({ ...p, updatedAt: now() });
const allTags = (plants) => Array.from(new Set(plants.flatMap((p) => p.tags || [])));

export const useAppStore = create((set, get) => {
  /** Zmienia jedną roślinę i oznacza ją jako zmienioną */
  const patchPlant = (id, fn) => {
    set((s) => ({ plants: s.plants.map((p) => (p.id === id ? stamp(fn(p)) : p)) }));
    get()._save();
  };

  return {
    ...INITIAL,

    hydrate: async () => {
      const data = await loadKey(KEYS.USER_DATA, INITIAL);
      set({ ...INITIAL, ...data, loaded: true });
    },

    _save: () => {
      const { plants, tags, deleted, deletedPhotos } = get();
      saveKey(KEYS.USER_DATA, { plants, tags, deleted, deletedPhotos });
    },

    // ===== ROŚLINY =====
    addPlantFromEncyc: (encycPlant, opts = {}) => {
      const newPlant = stamp(createUserPlant({ encycPlant, ...opts }));
      set((s) => ({ plants: [...s.plants, newPlant] }));
      get()._save();
      return newPlant;
    },

    // Dodaje własną roślinę (spoza encyklopedii — ręcznie lub ze skanu AI)
    addCustomPlant: (fields = {}) => {
      const newPlant = stamp(createCustomPlant(fields));
      set((s) => ({ plants: [...s.plants, newPlant] }));
      get()._save();
      return newPlant;
    },

    removePlant: async (id) => {
      const plant = get().plants.find((p) => p.id === id);
      const photoIds = plant?.photos || [];
      for (const photoId of photoIds) {
        await deletePhoto(photoId);
        invalidatePhotoUrl(photoId);
      }
      set((s) => ({
        plants: s.plants.filter((p) => p.id !== id),
        deleted: { ...s.deleted, [id]: now() },
        deletedPhotos: [...s.deletedPhotos, ...photoIds]
      }));
      get()._save();
    },

    updatePlant: (id, patch) => patchPlant(id, (p) => ({ ...p, ...patch })),

    waterPlant: (id) => patchPlant(id, (p) => ({ ...p, lastWatered: now() })),

    // ===== GALERIA ZDJĘĆ ROŚLINY =====
    /** Dodaje zdjęcie do galerii rośliny (kompresuje, zapisuje Blob, ustawia jako cover jeśli brak) */
    addPlantPhoto: async (plantId, file) => {
      const blob = await compressImage(file, 1600);
      const photoId = newPhotoId('plant');
      await savePhoto(photoId, blob);
      const addedAt = now();
      patchPlant(plantId, (p) => ({
        ...p,
        photos: [...(p.photos || []), photoId],
        coverPhotoId: p.coverPhotoId || photoId, // pierwsze zdjęcie staje się okładką
        photoMeta: { ...(p.photoMeta || {}), [photoId]: { addedAt } }
      }));
      return photoId;
    },

    removePlantPhoto: async (plantId, photoId) => {
      await deletePhoto(photoId);
      invalidatePhotoUrl(photoId);
      set((s) => ({ deletedPhotos: [...s.deletedPhotos, photoId] }));
      patchPlant(plantId, (p) => {
        const photos = (p.photos || []).filter((id) => id !== photoId);
        const photoMeta = { ...(p.photoMeta || {}) };
        delete photoMeta[photoId];
        return {
          ...p,
          photos,
          coverPhotoId: p.coverPhotoId === photoId ? (photos[0] || null) : p.coverPhotoId,
          photoMeta
        };
      });
    },

    setPlantCover: (plantId, photoId) => patchPlant(plantId, (p) => ({ ...p, coverPhotoId: photoId })),

    // ===== DZIENNIK =====
    addJournalEntry: (plantId, text) => {
      const entry = { id: Date.now(), date: now(), text };
      patchPlant(plantId, (p) => ({ ...p, journal: [entry, ...(p.journal || [])] }));
    },

    removeJournalEntry: (plantId, entryId) =>
      patchPlant(plantId, (p) => ({ ...p, journal: (p.journal || []).filter((e) => e.id !== entryId) })),

    // ===== TAGI =====
    setPlantTags: (plantId, tags) => {
      patchPlant(plantId, (p) => ({ ...p, tags }));
      set((s) => ({ tags: allTags(s.plants) }));
      get()._save();
    },

    // ===== SYNCHRONIZACJA =====
    /**
     * Wynik scalenia z chmurą: nowa lista roślin, usunięcia i lista zdjęć,
     * które chmura już skasowała. Nie stempluje — daty pochodzą ze scalenia.
     */
    applySynced: ({ plants, deleted, clearedPhotos = [] }) => {
      set((s) => ({
        plants,
        tags: allTags(plants),
        deleted,
        deletedPhotos: s.deletedPhotos.filter((id) => !clearedPhotos.includes(id))
      }));
      get()._save();
    },

    // ===== DEV / RESET =====
    resetAll: async () => {
      await saveKey(KEYS.USER_DATA, INITIAL);
      set({ ...INITIAL, loaded: true });
    }
  };
});
