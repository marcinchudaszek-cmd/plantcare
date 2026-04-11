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

/** Format dni → ludzki tekst */
export function formatDays(days) {
  if (days < 1) return 'mniej niż dzień';
  if (days === 1) return '1 dzień';
  if (days < 30) return `${days} dni`;
  if (days < 60) return '~1 miesiąc';
  if (days < 365) return `~${Math.round(days / 30)} miesięcy`;
  const years = Math.floor(days / 365);
  const remMonths = Math.round((days % 365) / 30);
  if (remMonths === 0) return years === 1 ? '1 rok' : `${years} lat`;
  return `${years} ${years === 1 ? 'rok' : 'lat'} ${remMonths} mies.`;
}
