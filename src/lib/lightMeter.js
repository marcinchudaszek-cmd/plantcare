// Miernik światła — analiza klatki z kamery.
// Liczymy średnią luminancję pikseli i mapujemy na pseudo-luksy.
// To NIE jest prawdziwy luksometr — kamera ma auto-ekspozycję,
// więc wartości są przybliżone. Wystarczy żeby rozróżnić cień / półcień / jasne.

/**
 * Liczy średnią luminancję perceptualną (Rec. 709) z ImageData.
 * Zwraca wartość 0-255.
 */
export function calculateLuminance(imageData) {
  const { data, width, height } = imageData;
  const total = width * height;
  let sum = 0;

  // Próbkujemy co 4ty piksel — szybciej, dokładność i tak wystarcza
  const step = 4 * 4;
  let count = 0;
  for (let i = 0; i < data.length; i += step) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    // Rec. 709 luma
    sum += 0.2126 * r + 0.7152 * g + 0.0722 * b;
    count++;
  }
  return sum / count;
}

/**
 * Mapuje luminancję 0-255 na pseudo-luksy.
 * Funkcja nieliniowa — w niskim świetle różnice są ważniejsze.
 *
 * Bazuje na heurystyce:
 *   0-30   → 0-50 lx     (głęboki cień, noc)
 *   30-80  → 50-500 lx   (półcień, kąt pokoju)
 *   80-150 → 500-2000 lx (jasny pokój, blisko okna)
 *   150-200 → 2000-10000 lx (bardzo jasno, parapet)
 *   200-255 → 10000-50000 lx (pełne słońce)
 */
export function luminanceToLux(lum) {
  if (lum < 30) return Math.round(lum * 1.7);
  if (lum < 80) return Math.round(50 + (lum - 30) * 9);
  if (lum < 150) return Math.round(500 + (lum - 80) * 21.5);
  if (lum < 200) return Math.round(2000 + (lum - 150) * 160);
  return Math.round(10000 + (lum - 200) * 727);
}

/**
 * Klasyfikacja na 5 poziomów.
 * Zwraca { level, label, color, recommendation }
 */
export function classifyLight(lux) {
  if (lux < 100) {
    return {
      level: 'very_low',
      label: 'Bardzo ciemno',
      color: 'danger',
      icon: '🌑',
      recommendation: 'Tylko najbardziej cieniolubne — Sansewieria, Zamiokulkas, Pothos.',
      categories: ['easy']
    };
  }
  if (lux < 500) {
    return {
      level: 'low',
      label: 'Cień / półcień',
      color: 'warning',
      icon: '🌘',
      recommendation: 'Rośliny tolerujące mało światła — Skrzydłokwiat, Filodendron, paprocie.',
      categories: ['easy']
    };
  }
  if (lux < 2000) {
    return {
      level: 'medium',
      label: 'Jasne rozproszone',
      color: 'accent',
      icon: '🌗',
      recommendation: 'Idealne dla większości roślin doniczkowych — Monstera, Calathea, Dracena.',
      categories: ['popular', 'tropical']
    };
  }
  if (lux < 10000) {
    return {
      level: 'high',
      label: 'Bardzo jasno',
      color: 'accent',
      icon: '🌖',
      recommendation: 'Świetne dla roślin lubiących światło — Fikus, Bananowiec, Kaktusy w półcieniu.',
      categories: ['tropical', 'flowering']
    };
  }
  return {
    level: 'sun',
    label: 'Pełne słońce',
    color: 'warning',
    icon: '☀️',
    recommendation: 'Dla sukulentów, kaktusów, ziół — Aloes, Lawenda, Bazylia, Rozmaryn.',
    categories: ['succulents', 'herbs']
  };
}

/**
 * Otwiera strumień z tylnej kamery (lub frontowej jako fallback).
 * Zwraca MediaStream — pamiętaj o stop() przy unmount.
 */
export async function openCameraStream() {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error('Twoja przeglądarka nie obsługuje kamery.');
  }
  try {
    return await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: { ideal: 'environment' },
        width: { ideal: 640 },
        height: { ideal: 480 }
      },
      audio: false
    });
  } catch (e) {
    if (e.name === 'NotAllowedError') {
      throw new Error('Brak zgody na dostęp do kamery.');
    }
    if (e.name === 'NotFoundError') {
      throw new Error('Nie znaleziono kamery.');
    }
    throw new Error('Nie udało się uruchomić kamery: ' + e.message);
  }
}

/** Zatrzymuje wszystkie tracki strumienia */
export function stopCameraStream(stream) {
  if (!stream) return;
  stream.getTracks().forEach((t) => t.stop());
}
