// Zlokalizowana encyklopedia roślin.
// plants.json to polski oryginał (źródło prawdy dla id, zdjęć, kategorii, trudności).
// plants.en.json / plants.de.json to mapy { [id]: { pola tekstowe } } nakładane na oryginał.
// Uwaga: defaultIntervalDays() parsuje POLSKI tekst care.water — dlatego każda
// zlokalizowana roślina ma też pole `carePl` z oryginalnym opisem pielęgnacji.

import plantsDB from '../data/plants.json';
import en from '../data/plants.en.json';
import de from '../data/plants.de.json';
import { useSettingsStore } from '../store/useSettingsStore.js';
import { currentLang } from './i18n.js';

const TRANSLATIONS = { en, de };
const cache = {};

/** Nakłada tłumaczenie na wpis z encyklopedii (polski = oryginał bez zmian poza carePl) */
export function localizePlant(plant, lang) {
  if (!plant) return plant;
  const tr = TRANSLATIONS[lang]?.[plant.id];
  if (!tr) return { ...plant, carePl: plant.care };
  return {
    ...plant,
    ...tr,
    care: { ...plant.care, ...(tr.care || {}) },
    carePl: plant.care,
    namePl: plant.name
  };
}

/** Cała zlokalizowana lista (cache na język) */
export function localizedPlants(lang = currentLang()) {
  const key = TRANSLATIONS[lang] ? lang : 'pl';
  if (!cache[key]) cache[key] = plantsDB.map((p) => localizePlant(p, key));
  return cache[key];
}

/** Hook: zlokalizowana lista roślin, przelicza się przy zmianie języka */
export function usePlantsDB() {
  const lang = useSettingsStore((s) => s.language);
  return localizedPlants(lang);
}

/** Pojedyncza roślina po id w danym języku */
export function findPlant(id, lang = currentLang()) {
  if (!id) return undefined;
  return localizedPlants(lang).find((p) => p.id === id);
}

/**
 * Wszystkie warianty nazwy rośliny we wszystkich językach (małymi literami).
 * "Bogenhanf (Sansevieria)" → ["bogenhanf (sansevieria)", "bogenhanf", "sansevieria"]
 */
export function plantNameVariants(plantId) {
  const base = plantsDB.find((p) => p.id === plantId);
  if (!base) return [];
  const names = [base.name, en[plantId]?.name, de[plantId]?.name].filter(Boolean);
  const out = new Set();
  for (const n of names) {
    const low = n.toLowerCase().trim();
    out.add(low);
    const outside = low.replace(/\s*\([^)]*\)\s*/g, ' ').trim();
    if (outside) out.add(outside);
    for (const m of low.matchAll(/\(([^)]+)\)/g)) out.add(m[1].trim());
  }
  return [...out].filter((s) => s.length >= 3);
}
