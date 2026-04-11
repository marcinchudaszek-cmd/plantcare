// Predykcja podlewan w danym miesiacu.
// Algorytm: dla kazdej rosliny licz "nastepne podlanie" = lastWatered + interval.
// Jesli ta data wpada w obecny miesiac, dodaj. Potem licz nastepne (wcześniejsze)
// rotacje az do konca miesiaca - bo np. roslina podlewana co 3 dni ma kilka
// podlewan w jednym miesiacu.

import { effectiveInterval, daysSinceWatered } from './plantUtils.js';

const DAY_MS = 1000 * 60 * 60 * 24;

/**
 * Zwraca tablice 31 dni dla miesiaca, kazdy element to lista roslin do podlania w tym dniu.
 * { day: 1..31, plants: [...] }
 *
 * Dla roslin nigdy nie podlanych dodajemy je do dzisiaj (jesli dzisiaj jest w tym miesiacu).
 */
export function getMonthSchedule(year, month, plants, plantsDB) {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const schedule = [];
  for (let d = 1; d <= daysInMonth; d++) {
    schedule.push({ day: d, plants: [] });
  }

  const monthStart = new Date(year, month, 1);
  const monthEnd = new Date(year, month, daysInMonth, 23, 59, 59);
  const today = new Date();
  const todayInThisMonth = today.getFullYear() === year && today.getMonth() === month;

  for (const plant of plants) {
    const encyc = plantsDB.find((p) => p.id === plant.encycId);
    const interval = effectiveInterval(plant, encyc);

    if (!plant.lastWatered) {
      // Nigdy nie podlewana - dzisiaj
      if (todayInThisMonth) {
        schedule[today.getDate() - 1].plants.push(plant);
      }
      continue;
    }

    let next = new Date(plant.lastWatered).getTime() + interval * DAY_MS;
    // Cofnij next zeby trafic w monthStart lub przed
    while (next > monthStart.getTime()) {
      next -= interval * DAY_MS;
    }
    // Teraz idz do przodu, dodaj wszystkie ktore wpadly w miesiac
    while (next <= monthEnd.getTime()) {
      if (next >= monthStart.getTime()) {
        const date = new Date(next);
        schedule[date.getDate() - 1].plants.push(plant);
      }
      next += interval * DAY_MS;
    }
  }

  return schedule;
}

/** Nazwa miesiaca po polsku */
export function monthName(month) {
  return [
    'styczeń', 'luty', 'marzec', 'kwiecień', 'maj', 'czerwiec',
    'lipiec', 'sierpień', 'wrzesień', 'październik', 'listopad', 'grudzień'
  ][month] || '';
}

/** Skrót dnia tygodnia (PN, WT, ...) — getDay() zwraca 0=niedziela */
export function dayOfWeekShort(date) {
  return ['Nd', 'Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'So'][date.getDay()];
}

/** Czy data to dzisiaj */
export function isToday(year, month, day) {
  const today = new Date();
  return today.getFullYear() === year && today.getMonth() === month && today.getDate() === day;
}
