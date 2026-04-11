// Pomocnicze funkcje do liczenia stanu roślin.
// Czyste, bez side-effectów — łatwo testowalne, łatwo używać wszędzie.

const DAY_MS = 1000 * 60 * 60 * 24;

/** Domyślny interwał podlewania (dni) na bazie pola care.water z encyklopedii */
export function defaultIntervalDays(care) {
  if (!care?.water) return 7;
  const txt = care.water.toLowerCase();
  if (txt.includes('codziennie')) return 1;
  if (txt.includes('2–3 dni') || txt.includes('2-3 dni')) return 3;
  if (txt.includes('co 3 dni')) return 3;
  if (txt.includes('5–7') || txt.includes('5-7')) return 6;
  if (txt.includes('7–10') || txt.includes('7-10')) return 8;
  if (txt.includes('7–14') || txt.includes('7-14')) return 10;
  if (txt.includes('co tygodniu') || txt.includes('co tydzień')) return 7;
  if (txt.includes('2 tygodnie') || txt.includes('2 tyg')) return 14;
  if (txt.includes('2–4 tyg') || txt.includes('2-4 tyg')) return 21;
  if (txt.includes('miesi')) return 30;
  if (txt.includes('rzadko')) return 21;
  return 7;
}

/** Ile dni minęło od ostatniego podlania (Infinity jeśli nigdy) */
export function daysSinceWatered(plant) {
  if (!plant.lastWatered) return Infinity;
  return Math.floor((Date.now() - new Date(plant.lastWatered).getTime()) / DAY_MS);
}

/** Czy roślinę trzeba podlać (lub już spóźnione) */
export function needsWater(plant) {
  return daysSinceWatered(plant) >= (plant.interval || 7);
}

/** Stan urgentcy: 'late' | 'now' | 'wait' — używane do kolorów akcji */
export function waterState(plant) {
  const d = daysSinceWatered(plant);
  const interval = plant.interval || 7;
  if (d > interval) return 'late';
  if (d >= interval) return 'now';
  return 'wait';
}

/** Człowieczy opis: "Za 2 dni" / "Dziś" / "Spóźnione 3 dni" / "Nigdy nie podlana" */
export function waterStatusLabel(plant) {
  if (!plant.lastWatered) return 'Nigdy nie podlana';
  const d = daysSinceWatered(plant);
  const interval = plant.interval || 7;
  const diff = interval - d;
  if (diff > 1) return `Za ${diff} dni`;
  if (diff === 1) return 'Jutro';
  if (diff === 0) return 'Dziś';
  if (diff === -1) return 'Spóźnione 1 dzień';
  return `Spóźnione ${Math.abs(diff)} dni`;
}

/** Tworzy nową roślinę użytkownika na bazie wpisu z encyklopedii */
export function createUserPlant({ encycPlant, nickname, location, tags = [] }) {
  return {
    id: `plant_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    encycId: encycPlant.id,           // referencja do plants.json
    name: nickname || encycPlant.name, // własna nazwa np. "Stefan"
    species: encycPlant.species,
    emoji: encycPlant.emoji,
    location: location || '',          // np. "salon", "okno kuchenne"
    tags,                              // lista stringów
    interval: defaultIntervalDays(encycPlant.care),
    lastWatered: null,
    addedAt: new Date().toISOString(),
    journal: [],                       // wpisy dziennika [{ date, text, photoId? }]
    photos: []                         // ID zdjęć w storage.PHOTOS
  };
}
