// Warstwa komunikacji z Gemini.
// Dwie drogi:
//  1. własny klucz użytkownika (Ustawienia) — zapytanie idzie prosto do Google,
//  2. worker PlantCare (klucz Beagle Apps, dzienny limit) — gdy użytkownik nie ma klucza,
//     a build ma VITE_AI_TOKEN. Bez tokenu w buildzie AI wymaga własnego klucza.
// Błędy rzucamy jako AiError z kodem — komunikat jest tłumaczony na język interfejsu.

import { translate, currentLang } from './i18n.js';

const MODEL = 'gemini-2.5-flash';
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;
const WORKER_URL = import.meta.env.VITE_AI_WORKER || 'https://plantcare-ai.atlas-grzybow.workers.dev';
const APP_TOKEN = import.meta.env.VITE_AI_TOKEN || '';

export class AiError extends Error {
  constructor(code, detail = '') {
    super(translate(`ai.err.${code}`, { detail }));
    this.code = code;
  }
}

/** Czy AI jest dostępne: własny klucz albo worker wkompilowany w build */
export function aiAvailable(apiKey) {
  return !!apiKey || workerAvailable();
}

export function workerAvailable() {
  return !!APP_TOKEN;
}

const LANG_NAMES = { pl: 'Polish', en: 'English', de: 'German' };
function langName() {
  return LANG_NAMES[currentLang()] || 'Polish';
}

/** Konwertuje plik na base64 (bez prefixu data:image/...) */
export function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      const comma = result.indexOf(',');
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.onerror = () => reject(new AiError('read'));
    reader.readAsDataURL(file);
  });
}

/** Sprawdza poprawność klucza (lekko, tylko format). Google wydaje klucze „AIza…” i nowsze „AQ.…” */
export function isValidApiKeyFormat(key) {
  return typeof key === 'string' && /^(AIza|AQ\.)/.test(key) && key.length > 30;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function extractText(data) {
  return data?.candidates?.[0]?.content?.parts?.map((p) => p.text || '').join('') || '';
}

function parseJson(text) {
  const cleaned = text.replace(/^```(?:json)?\n?|\n?```$/g, '').trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    // Model czasem dopisuje zdanie przed/po JSON-ie — wyciągamy pierwszy obiekt
    const m = cleaned.match(/\{[\s\S]*\}/);
    if (m) {
      try { return JSON.parse(m[0]); } catch { /* niżej */ }
    }
    throw new AiError('parse');
  }
}

/**
 * Jedno wywołanie generateContent — własnym kluczem albo przez worker.
 * Ponawia przy 429/5xx i przekroczeniu czasu.
 */
async function generate(apiKey, body, { timeout = 45000, maxRetries = 2 } = {}) {
  const own = !!apiKey;
  if (!own && !workerAvailable()) throw new AiError('noKey');
  if (own && !isValidApiKeyFormat(apiKey)) throw new AiError('keyFormat');

  let lastError = null;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const ctrl = new AbortController();
    const tid = setTimeout(() => ctrl.abort(), timeout);
    try {
      const res = own
        ? await fetch(ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
            body: JSON.stringify(body),
            signal: ctrl.signal
          })
        : await fetch(`${WORKER_URL}/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-App-Token': APP_TOKEN },
            body: JSON.stringify(body),
            signal: ctrl.signal
          });
      clearTimeout(tid);

      if (!own) {
        // Worker zwraca { error: { code } } przy własnych błędach
        if (!res.ok) {
          const payload = await res.json().catch(() => ({}));
          const code = payload?.error?.code;
          if (code === 'limit') throw new AiError('limit');
          if (code === 'no-key') throw new AiError('workerOff');
          if (res.status === 429 || res.status >= 500) {
            lastError = new AiError('busy', String(res.status));
            if (attempt < maxRetries) { await sleep(1500 * (attempt + 1)); continue; }
            throw lastError;
          }
          throw new AiError('request', String(res.status));
        }
      } else {
        if (res.status === 401 || res.status === 403) throw new AiError('keyRejected');
        if (res.status === 400) {
          const txt = await res.text().catch(() => '');
          if (/API key not valid|API_KEY_INVALID/i.test(txt)) throw new AiError('keyRejected');
          throw new AiError('request', '400');
        }
        if (res.status === 429 || res.status >= 500) {
          lastError = new AiError(res.status === 429 ? 'quota' : 'busy', String(res.status));
          if (attempt < maxRetries) { await sleep(1500 * (attempt + 1)); continue; }
          throw lastError;
        }
        if (!res.ok) throw new AiError('request', String(res.status));
      }

      const data = await res.json();
      const text = extractText(data);
      if (!text) throw new AiError('empty');
      return text;
    } catch (err) {
      clearTimeout(tid);
      if (err.name === 'AbortError') lastError = new AiError('timeout');
      else if (err instanceof AiError) {
        // Błędy klucza, limitu i formatu — ponawianie nic nie da
        if (!['busy', 'quota', 'empty'].includes(err.code)) throw err;
        lastError = err;
      } else lastError = new AiError('network');
      if (attempt >= maxRetries) throw lastError;
      await sleep(1500 * (attempt + 1));
    }
  }
  throw lastError || new AiError('network');
}

// === ROZPOZNAWANIE ROŚLINY ===

function recognizePrompt() {
  const lang = langName();
  return `Analyse the photo of a plant (houseplant, balcony or garden plant) and reply ONLY with valid JSON (no markdown, no backticks).

Format:
{
  "name": "common name of the plant in ${lang}",
  "species": "Latin name",
  "confidence": 0.0-1.0,
  "category": "tropical|succulents|flowering|herbs|special|popular",
  "difficulty": "easy|medium|hard",
  "health": "good|warning|bad",
  "healthNote": "short note about its condition in ${lang}, max 2 sentences",
  "description": "short description of the plant in ${lang}, 1-2 sentences"
}

If there is no plant in the photo or you cannot identify it, set confidence to 0 and name to "?".`;
}

/** Rozpoznaje roślinę ze zdjęcia. Zwraca obiekt rozpoznania albo rzuca AiError. */
export async function recognizePlant(apiKey, imageBase64, mimeType = 'image/jpeg', opts = {}) {
  const text = await generate(apiKey, {
    contents: [{ parts: [{ text: recognizePrompt() }, { inline_data: { mime_type: mimeType, data: imageBase64 } }] }],
    generationConfig: { temperature: 0.2, thinkingConfig: { thinkingBudget: 0 }, maxOutputTokens: 1024, responseMimeType: 'application/json' }
  }, opts);
  const r = parseJson(text);
  if (r.name === '?') r.name = translate('ai.notRecognized');
  return r;
}

// === DIAGNOSTYKA CHORÓB ===

function diagnosisPrompt() {
  const lang = langName();
  return `You are an experienced plant doctor. Analyse the photo of a sick or worrying plant and reply ONLY with valid JSON (no markdown, no backticks). All texts in ${lang}.

Format:
{
  "plantName": "common name of the plant in ${lang} if you recognise it, otherwise null",
  "severity": "ok|minor|moderate|severe|critical",
  "severityLabel": "short severity label in ${lang}",
  "primaryIssue": "main problem in 3-5 words in ${lang}",
  "diagnosis": "detailed diagnosis in ${lang}, 2-4 sentences: what you see and why it happened",
  "causes": ["2-4 possible causes in ${lang}"],
  "treatment": ["3-6 rescue steps in ${lang}, most important first"],
  "prevention": "short prevention tip in ${lang}, 1-2 sentences",
  "urgent": true/false
}

If there is NO plant in the photo or the photo quality makes a diagnosis impossible, return:
{ "severity": "unknown", "severityLabel": "", "diagnosis": "reason in ${lang}", "causes": [], "treatment": [], "prevention": "", "urgent": false }`;
}

export async function diagnosePlantHealth(apiKey, imageBase64, mimeType = 'image/jpeg', opts = {}) {
  const text = await generate(apiKey, {
    contents: [{ parts: [{ text: diagnosisPrompt() }, { inline_data: { mime_type: mimeType, data: imageBase64 } }] }],
    generationConfig: { temperature: 0.3, thinkingConfig: { thinkingBudget: 0 }, maxOutputTokens: 2048, responseMimeType: 'application/json' }
  }, opts);
  return parseJson(text);
}

// === ASYSTENT CZATU ===

function chatSystem() {
  const lang = langName();
  return `You are an experienced gardening consultant specialising in houseplants, balcony and garden plants. Always answer in ${lang}, briefly and to the point (usually 2-5 sentences). If the question is unclear, ask a follow-up question. You help the user care for their plants, advise on choosing new ones and diagnose problems. Do not give medical or legal advice. Rely on proven horticultural knowledge.`;
}

/**
 * Wysyła wiadomość do Gemini z opcjonalnym kontekstem o roślinach użytkownika.
 * @param {Array<{role: 'user'|'model', text: string}>} history
 */
export async function chatGemini(apiKey, history, userMessage, userPlants = [], opts = {}) {
  let system = chatSystem();
  if (userPlants.length > 0) {
    const list = userPlants.slice(0, 30).map((p) => `- ${p.name} (${p.species || '?'})`).join('\n');
    system += `\n\nThe user's collection (${userPlants.length} plants):\n${list}`;
  }

  const contents = [
    ...history.slice(-20).map((m) => ({ role: m.role, parts: [{ text: m.text }] })),
    { role: 'user', parts: [{ text: userMessage }] }
  ];

  const text = await generate(apiKey, {
    systemInstruction: { parts: [{ text: system }] },
    contents,
    generationConfig: { temperature: 0.7, thinkingConfig: { thinkingBudget: 0 }, maxOutputTokens: 1024 }
  }, { maxRetries: 1, ...opts });
  return text.trim();
}
