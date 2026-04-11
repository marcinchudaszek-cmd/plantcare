// Metadane kategorii roślin — używane do filtrów w Encyklopedii,
// pillów na kartach i etykiet w UI. Trzymane osobno od plants.json,
// żeby zmiana nazwy "Tropikalne" nie wymagała ruszania bazy.

export const CATEGORIES = {
  popular:    { label: 'Popularne',  emoji: '🌟', order: 1 },
  easy:       { label: 'Łatwe',      emoji: '👶', order: 2 },
  tropical:   { label: 'Tropikalne', emoji: '🌴', order: 3 },
  succulents: { label: 'Sukulenty',  emoji: '🌵', order: 4 },
  flowering:  { label: 'Kwitnące',   emoji: '🌸', order: 5 },
  herbs:      { label: 'Zioła',      emoji: '🌿', order: 6 },
  special:    { label: 'Specjalne',  emoji: '✨', order: 7 }
};

export const DIFFICULTY = {
  easy:   { label: 'Łatwa',  color: 'leaf' },
  medium: { label: 'Średnia', color: 'cream' },
  hard:   { label: 'Trudna', color: 'coral' }
};

// Pomocnik — sortowana lista do renderowania filtrów
export const CATEGORY_LIST = Object.entries(CATEGORIES)
  .map(([key, meta]) => ({ key, ...meta }))
  .sort((a, b) => a.order - b.order);
