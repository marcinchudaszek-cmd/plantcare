// Quiz "Rozpoznaj rosline".
// Bierze losowa rosline z bazy, generuje 4 odpowiedzi (1 prawidlowa + 3 dystraktory).
// Dystraktory dobiera z tej samej kategorii zeby bylo trudniej.

/** Tasuje tablice (Fisher-Yates) */
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Generuje pojedyncze pytanie quizowe.
 * Zwraca: { plant, options: [4 plants], correctIndex }
 */
export function generateQuestion(plantsDB, excludeIds = []) {
  const pool = plantsDB.filter((p) => !excludeIds.includes(p.id) && p.image);
  if (pool.length < 4) return null;

  // Losuj rosline-cel
  const target = pool[Math.floor(Math.random() * pool.length)];

  // Dystraktory z tej samej kategorii (jesli mozliwe)
  const targetCategories = target.category || [];
  const sameCategory = pool.filter(
    (p) => p.id !== target.id && p.category?.some((c) => targetCategories.includes(c))
  );

  let distractors;
  if (sameCategory.length >= 3) {
    distractors = shuffle(sameCategory).slice(0, 3);
  } else {
    // Fallback: losowi spoza kategorii
    const others = pool.filter((p) => p.id !== target.id);
    distractors = shuffle(others).slice(0, 3);
  }

  const options = shuffle([target, ...distractors]);
  const correctIndex = options.findIndex((p) => p.id === target.id);

  return {
    plant: target,
    options,
    correctIndex
  };
}

/** Generuje cala sesje quizu (n pytan) */
export function generateQuiz(plantsDB, count = 10) {
  const questions = [];
  const usedIds = [];
  for (let i = 0; i < count; i++) {
    const q = generateQuestion(plantsDB, usedIds);
    if (!q) break;
    questions.push(q);
    usedIds.push(q.plant.id);
  }
  return questions;
}
