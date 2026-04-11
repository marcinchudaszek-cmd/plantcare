// Warstwa komunikacji z Gemini API.
// Wszystko co dotyczy formatów, retry, błędów — w jednym miejscu.

const ENDPOINT =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent';

const PROMPT = `Przeanalizuj zdjęcie rośliny doniczkowej i odpowiedz WYŁĄCZNIE poprawnym JSON-em (bez markdownu, bez \`\`\`).

Format:
{
  "name": "polska nazwa rośliny",
  "species": "nazwa łacińska",
  "confidence": 0.0-1.0,
  "category": "tropical|succulents|flowering|herbs|special|popular",
  "difficulty": "easy|medium|hard",
  "health": "good|warning|bad",
  "healthNote": "krótki opis stanu w języku polskim, max 2 zdania",
  "description": "krótki opis rośliny w języku polskim, 1-2 zdania"
}

Jeśli na zdjęciu nie ma rośliny lub nie jesteś w stanie jej rozpoznać, ustaw confidence na 0 i name na "Nie rozpoznano".`;

/** Konwertuje plik na base64 (bez prefixu data:image/...) */
export function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      const comma = result.indexOf(',');
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.onerror = () => reject(new Error('Nie udało się odczytać pliku'));
    reader.readAsDataURL(file);
  });
}

/** Sprawdza poprawność klucza (lekko, tylko format) */
export function isValidApiKeyFormat(key) {
  return typeof key === 'string' && key.startsWith('AIza') && key.length > 30;
}

/**
 * Wywołuje Gemini Vision API z obrazem.
 * Zwraca obiekt rozpoznania albo rzuca błąd z czytelnym message.
 *
 * Opcje: { signal, timeout, maxRetries }
 */
export async function recognizePlant(apiKey, imageBase64, mimeType = 'image/jpeg', opts = {}) {
  const { timeout = 30000, maxRetries = 2 } = opts;

  if (!apiKey) throw new Error('Brak klucza API. Dodaj go w ustawieniach.');
  if (!isValidApiKeyFormat(apiKey)) throw new Error('Klucz API ma nieprawidłowy format.');

  const body = {
    contents: [{
      parts: [
        { text: PROMPT },
        { inline_data: { mime_type: mimeType, data: imageBase64 } }
      ]
    }],
    generationConfig: {
      temperature: 0.2,
      topK: 32,
      topP: 1,
      maxOutputTokens: 1024,
      responseMimeType: 'application/json'
    }
  };

  let lastError = null;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const ctrl = new AbortController();
    const tid = setTimeout(() => ctrl.abort(), timeout);

    try {
      const res = await fetch(`${ENDPOINT}?key=${encodeURIComponent(apiKey)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: ctrl.signal
      });
      clearTimeout(tid);

      // Błędy autoryzacji — nie ma sensu retry
      if (res.status === 401 || res.status === 403) {
        throw new Error('Klucz API odrzucony przez Google. Sprawdź czy jest aktywny.');
      }
      if (res.status === 400) {
        const txt = await res.text().catch(() => '');
        throw new Error(`Błąd zapytania (400). ${txt.slice(0, 200)}`);
      }

      // Rate limit / przeciążenie — warto spróbować ponownie
      if (res.status === 429 || res.status >= 500) {
        lastError = new Error(`Serwer Gemini odpowiedział ${res.status} — ponawiam…`);
        if (attempt < maxRetries) {
          await sleep(1000 * (attempt + 1));
          continue;
        }
        throw lastError;
      }

      if (!res.ok) {
        throw new Error(`Nieoczekiwany błąd: ${res.status}`);
      }

      const data = await res.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) throw new Error('Pusta odpowiedź z Gemini.');

      // Czasem mimo responseMimeType json, model wciska markdown
      const cleaned = text.replace(/^```(?:json)?\n?|\n?```$/g, '').trim();
      try {
        return JSON.parse(cleaned);
      } catch {
        throw new Error('Gemini zwrócił odpowiedź której nie można sparsować.');
      }
    } catch (err) {
      clearTimeout(tid);
      if (err.name === 'AbortError') {
        lastError = new Error('Przekroczono czas oczekiwania (30 s).');
      } else {
        lastError = err;
      }
      if (attempt >= maxRetries) throw lastError;
      await sleep(1000 * (attempt + 1));
    }
  }
  throw lastError || new Error('Nie udało się rozpoznać rośliny.');
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}
