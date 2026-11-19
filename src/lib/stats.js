import { translate as tr } from './i18n.js';
// Statystyki kolekcji — czyste funkcje, łatwo testowalne.

const DAY_MS = 1000 * 60 * 60 * 24;

/**
 * Oblicza wszystkie statystyki kolekcji w jednym przelocie po liście.
 * Zwraca obiekt { total, oldest, totalWaterings, totalEntries, totalPhotos,
 *                 totalTags, byCategory, mostJournaled, busyMonth }
 */
export function calculateStats(plants, plantsDB) {
  const stats = {
    total: plants.length,
    totalEntries: 0,
    totalPhotos: 0,
    totalTags: new Set(),
    oldest: null,
    oldestDays: 0,
    mostJournaled: null,
    byCategory: {},
    monthlyWaterings: {} // { '2026-01': 12, '2026-02': 8, ... }
  };

  if (plants.length === 0) return stats;

  for (const plant of plants) {
    // Wpisy dziennika
    const journalCount = (plant.journal || []).length;
    stats.totalEntries += journalCount;

    if (!stats.mostJournaled || journalCount > (stats.mostJournaled.journal?.length || 0)) {
      stats.mostJournaled = plant;
    }

    // Zdjęcia
    stats.totalPhotos += (plant.photos || []).length;

    // Tagi
    (plant.tags || []).forEach((t) => stats.totalTags.add(t));

    // Najstarsza
    if (plant.addedAt) {
      const days = Math.floor((Date.now() - new Date(plant.addedAt).getTime()) / DAY_MS);
      if (!stats.oldest || days > stats.oldestDays) {
        stats.oldest = plant;
        stats.oldestDays = days;
      }
    }

    // Kategorie z encyklopedii (po encycId)
    const encyc = plantsDB.find((p) => p.id === plant.encycId);
    if (encyc?.category) {
      encyc.category.forEach((c) => {
        stats.byCategory[c] = (stats.byCategory[c] || 0) + 1;
      });
    }

    // Podlewania per miesiąc — rekonstruujemy z dziennika? Nie, my tracimy
    // historię podlewań, mamy tylko lastWatered. Można tylko liczyć "wszystkich
    // do dziś" jako oszacowanie po addedAt + interwał, ale to niedokładne.
    // Zostawiamy puste — jak będziemy chcieli prawdziwy historiał,
    // dorobimy waterings[] w store.
  }

  // Najpopularniejsza kategoria
  let topCategory = null;
  let topCount = 0;
  for (const [cat, count] of Object.entries(stats.byCategory)) {
    if (count > topCount) {
      topCount = count;
      topCategory = cat;
    }
  }
  stats.topCategory = topCategory;
  stats.topCategoryCount = topCount;

  stats.totalTags = stats.totalTags.size;

  return stats;
}

/** Polska odmiana: 1 rok / 2–4 lata / 5+ lat (w EN/DE „Few” = „Many”) */
function plural(n, base) {
  if (n === 1) return tr(`${base}One`, { n });
  const lastTwo = n % 100, last = n % 10;
  if (last >= 2 && last <= 4 && (lastTwo < 12 || lastTwo > 14)) return tr(`${base}Few`, { n });
  return tr(`${base}Many`, { n });
}

/** Format dni → ludzki tekst */
export function formatDays(days) {
  if (days < 1) return tr('time.lessThanDay');
  if (days < 30) return plural(days, 'time.day');
  if (days < 365) return '~' + plural(Math.max(1, Math.round(days / 30)), 'time.month');
  const years = Math.floor(days / 365);
  const remMonths = Math.round((days % 365) / 30);
  if (remMonths === 0) return plural(years, 'time.year');
  return `${plural(years, 'time.year')} ${plural(remMonths, 'time.month')}`;
}
