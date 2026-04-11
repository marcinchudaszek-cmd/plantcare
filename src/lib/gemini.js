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

// === DIAGNOSTYKA CHORÓB ===

const DIAGNOSIS_PROMPT = `Jestes doswiadczonym ogrodnikiem-diagnostykiem. Przeanalizuj zdjecie chorej lub zaniepokojonej rosliny doniczkowej i odpowiedz WYLACZNIE poprawnym JSON-em (bez markdownu, bez backticks).

Format:
{
  "plantName": "polska nazwa rosliny jesli rozpoznasz, inaczej null",
  "severity": "ok|minor|moderate|severe|critical",
  "severityLabel": "krotki opis powagi po polsku, np. 'Stan dobry', 'Lekkie objawy', 'Wymaga uwagi', 'Powazny problem', 'Pilnie ratuj'",
  "primaryIssue": "glowny problem w 3-5 slowach po polsku, np. 'Przelanie korzeni', 'Niedobor swiatla'",
  "diagnosis": "szczegolowa diagnoza w jezyku polskim, 2-4 zdania, co widzisz i dlaczego do tego doszlo",
  "causes": ["lista 2-4 mozliwych przyczyn po polsku"],
  "treatment": ["lista 3-6 krokow ratunkowych po polsku, w kolejnosci od najwazniejszego"],
  "prevention": "krotka rada profilaktyczna na przyszlosc po polsku, 1-2 zdania",
  "urgent": true/false
}

Jesli na zdjeciu NIE ma rosliny lub jakosc zdjecia uniemozliwia diagnoze, zwroc:
{ "severity": "unknown", "severityLabel": "Nie udalo sie ocenic", "diagnosis": "powod po polsku", "causes": [], "treatment": [], "prevention": "", "urgent": false }`;

export async function diagnosePlantHealth(apiKey, imageBase64, mimeType = 'image/jpeg', opts = {}) {
  const { timeout = 30000, maxRetries = 2 } = opts;

  if (!apiKey) throw new Error('Brak klucza API. Dodaj go w ustawieniach.');
  if (!isValidApiKeyFormat(apiKey)) throw new Error('Klucz API ma nieprawidlowy format.');

  const body = {
    contents: [{
      parts: [
        { text: DIAGNOSIS_PROMPT },
        { inline_data: { mime_type: mimeType, data: imageBase64 } }
      ]
    }],
    generationConfig: {
      temperature: 0.3,
      topK: 32,
      topP: 1,
      maxOutputTokens: 2048,
      responseMimeType: 'application/json'
    }
  };

  let lastError = null;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const ctrl = new AbortController();
    const tid = setTimeout(() => ctrl.abort(), timeout);

    try {
      const res = await fetch(ENDPOINT + '?key=' + encodeURIComponent(apiKey), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: ctrl.signal
      });
      clearTimeout(tid);

      if (res.status === 401 || res.status === 403) {
        throw new Error('Klucz API odrzucony przez Google. Sprawdz czy jest aktywny.');
      }
      if (res.status === 400) {
        const txt = await res.text().catch(() => '');
        throw new Error('Blad zapytania (400). ' + txt.slice(0, 200));
      }
      if (res.status === 429 || res.status >= 500) {
        lastError = new Error('Serwer Gemini odpowiedzial ' + res.status + ' - ponawiam...');
        if (attempt < maxRetries) {
          await sleep(1000 * (attempt + 1));
          continue;
        }
        throw lastError;
      }
      if (!res.ok) {
        throw new Error('Nieoczekiwany blad: ' + res.status);
      }

      const data = await res.json();
      const text = data && data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts[0] && data.candidates[0].content.parts[0].text;
      if (!text) throw new Error('Pusta odpowiedz z Gemini.');

      const cleaned = text.replace(/^```(?:json)?\n?|\n?```$/g, '').trim();
      try {
        return JSON.parse(cleaned);
      } catch {
        throw new Error('Gemini zwrocil odpowiedz ktorej nie mozna sparsowac.');
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
  throw lastError || new Error('Nie udalo sie zdiagnozowac rosliny.');
}

// === ASYSTENT CZATU ===

const CHAT_SYSTEM = `Jestes doswiadczonym ogrodnikiem-konsultantem specjalizujacym sie w roslinach doniczkowych. Odpowiadasz w jezyku polskim, krotko i konkretnie (2-5 zdan zwykle). Jesli pytanie jest niejasne, dopytaj. Pomagasz uzytkownikowi zadbac o jego rosliny, doradz w wyborze nowych, diagnozujesz problemy. Nie udzielaj porad medycznych ani prawnych. Bazujesz na sprawdzonej wiedzy ogrodniczej.`;

/**
 * Wysyla wiadomosc do Gemini z opcjonalnym kontekstem o roslinach uzytkownika.
 *
 * @param {string} apiKey
 * @param {Array<{role: 'user'|'model', text: string}>} history - historia konwersacji
 * @param {string} userMessage - nowa wiadomosc usera
 * @param {Array} userPlants - opcjonalna lista nazw roslin uzytkownika do kontekstu
 */
export async function chatGemini(apiKey, history, userMessage, userPlants = [], opts = {}) {
  const { timeout = 30000 } = opts;

  if (!apiKey) throw new Error('Brak klucza API. Dodaj go w ustawieniach.');
  if (!isValidApiKeyFormat(apiKey)) throw new Error('Klucz API ma nieprawidlowy format.');

  // Buduj kontekst systemowy
  let systemContext = CHAT_SYSTEM;
  if (userPlants.length > 0) {
    const plantList = userPlants.slice(0, 30).map((p) => '- ' + p.name + ' (' + p.species + ')').join('\n');
    systemContext += '\n\nKolekcja uzytkownika (' + userPlants.length + ' roslin):\n' + plantList;
  }

  // Format konwersacji dla Gemini API
  const contents = [];
  // Pierwszy turn z systemContext
  if (history.length === 0) {
    contents.push({
      role: 'user',
      parts: [{ text: systemContext + '\n\nUzytkownik pyta: ' + userMessage }]
    });
  } else {
    contents.push({
      role: 'user',
      parts: [{ text: systemContext }]
    });
    contents.push({
      role: 'model',
      parts: [{ text: 'Jasne, jestem do dyspozycji. W czym moge pomoc?' }]
    });
    for (const msg of history) {
      contents.push({
        role: msg.role,
        parts: [{ text: msg.text }]
      });
    }
    contents.push({
      role: 'user',
      parts: [{ text: userMessage }]
    });
  }

  const body = {
    contents,
    generationConfig: {
      temperature: 0.7,
      topK: 32,
      topP: 1,
      maxOutputTokens: 1024
    }
  };

  const ctrl = new AbortController();
  const tid = setTimeout(() => ctrl.abort(), timeout);

  try {
    const res = await fetch(ENDPOINT + '?key=' + encodeURIComponent(apiKey), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: ctrl.signal
    });
    clearTimeout(tid);

    if (res.status === 401 || res.status === 403) {
      throw new Error('Klucz API odrzucony przez Google.');
    }
    if (res.status === 429) {
      throw new Error('Za duzo zapytan. Poczekaj chwile.');
    }
    if (!res.ok) {
      throw new Error('Blad serwera Gemini: ' + res.status);
    }

    const data = await res.json();
    const text = data && data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts[0] && data.candidates[0].content.parts[0].text;
    if (!text) throw new Error('Pusta odpowiedz z Gemini.');

    return text.trim();
  } catch (err) {
    clearTimeout(tid);
    if (err.name === 'AbortError') {
      throw new Error('Przekroczono czas oczekiwania.');
    }
    throw err;
  }
}
