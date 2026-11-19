/**
 * PlantCare AI — pośrednik do Gemini z kluczem Beagle Apps.
 *
 * POST /generate  { contents, systemInstruction?, generationConfig? }  →  odpowiedź Gemini 1:1
 * Nagłówek X-App-Token musi się zgadzać z sekretem APP_TOKEN.
 *
 * Aplikacja buduje prompty sama (rozpoznawanie, diagnoza, czat); worker pilnuje, żeby:
 *  - szły tylko na dozwolone modele i z rozsądnym limitem tokenów,
 *  - nie przekroczyć dziennego limitu (KV LIMITS): na urządzenie (skrót IP) i łącznie,
 *  - przy wyczerpaniu darmowego progu jednego modelu spróbować kolejnego.
 *
 * Sekrety (nie w repo):  GEMINI_API_KEY, APP_TOKEN  →  npx wrangler secret put … --config worker/wrangler.toml
 * Błędy: { error: { code } } — code: unauthorized | bad-request | too-large | limit | no-key | upstream
 */

const ALLOWED_ORIGINS = new Set([
  'https://plantcare.beagleapps.pl',
  'https://beagleapps.pl',
  'https://localhost'
]);

const MAX_BODY_BYTES = 12 * 1024 * 1024; // zdjęcie 1280 px w base64 to ~0,5 MB — zapas na czat i kilka zdjęć
const MAX_OUTPUT_TOKENS = 4096;

function corsHeaders(origin) {
  const allowed = origin && (ALLOWED_ORIGINS.has(origin) || /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin));
  return {
    'Access-Control-Allow-Origin': allowed ? origin : 'https://plantcare.beagleapps.pl',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-App-Token',
    'Access-Control-Expose-Headers': 'X-Limit-Remaining',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin'
  };
}

async function sha256(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].slice(0, 12).map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Dzienny limit — token jest w publicznej stronie, więc bez tego ktoś mógłby wyczerpać wspólny darmowy próg. */
async function takeQuota(env, ip) {
  if (!env.LIMITS) return { ok: true, remaining: -1 };
  const day = new Date().toISOString().slice(0, 10);
  const perIp = Number(env.DAILY_LIMIT_PER_IP) || 25;
  const total = Number(env.DAILY_LIMIT_TOTAL) || 300;
  const ipKey = `ip:${day}:${await sha256(ip)}`;
  const totalKey = `total:${day}`;
  const [ipUsed, totalUsed] = (await Promise.all([env.LIMITS.get(ipKey), env.LIMITS.get(totalKey)])).map((x) => Number(x) || 0);
  if (ipUsed >= perIp || totalUsed >= total) return { ok: false, remaining: 0 };
  const ttl = { expirationTtl: 60 * 60 * 48 };
  await Promise.all([env.LIMITS.put(ipKey, String(ipUsed + 1), ttl), env.LIMITS.put(totalKey, String(totalUsed + 1), ttl)]);
  return { ok: true, remaining: perIp - ipUsed - 1 };
}

/** Przepuszczamy tylko pola potrzebne aplikacji — reszta (np. tools) odpada. */
function sanitize(body) {
  if (!body || !Array.isArray(body.contents) || body.contents.length === 0 || body.contents.length > 40) return null;
  const gc = body.generationConfig || {};
  const out = {
    contents: body.contents,
    generationConfig: {
      temperature: typeof gc.temperature === 'number' ? Math.min(Math.max(gc.temperature, 0), 1.5) : 0.4,
      maxOutputTokens: Math.min(Number(gc.maxOutputTokens) || 1024, MAX_OUTPUT_TOKENS),
      thinkingConfig: { thinkingBudget: 0 }
    }
  };
  if (gc.responseMimeType === 'application/json') out.generationConfig.responseMimeType = 'application/json';
  if (body.systemInstruction?.parts) out.systemInstruction = { parts: body.systemInstruction.parts.slice(0, 4) };
  return out;
}

async function callGemini(env, body) {
  const models = (env.GEMINI_MODELS || 'gemini-2.5-flash').split(',').map((m) => m.trim()).filter(Boolean);
  let last = null;
  for (const model of models) {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': env.GEMINI_API_KEY },
      body: JSON.stringify(body)
    });
    if (res.ok) return { status: 200, text: await res.text() };
    const raw = await res.text();
    last = { status: res.status, raw };
    // Wyczerpany próg albo przeciążenie tego modelu → następny model; inne błędy od razu do klienta
    if (!(res.status === 429 || res.status >= 500 || /RESOURCE_EXHAUSTED|quota/i.test(raw))) break;
  }
  return { status: last?.status || 502, raw: last?.raw || '' };
}

export default {
  async fetch(request, env) {
    const cors = corsHeaders(request.headers.get('Origin'));
    const json = (body, status = 200, extra = {}) =>
      new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json; charset=utf-8', ...extra } });
    const fail = (code, status) => json({ error: { code } }, status);

    if (request.method === 'OPTIONS') return new Response(null, { headers: cors });
    const url = new URL(request.url);
    if (request.method === 'GET' && url.pathname === '/') return json({ ok: true, service: 'plantcare-ai', ready: Boolean(env.GEMINI_API_KEY) });
    if (request.method !== 'POST' || url.pathname !== '/generate') return fail('bad-request', 404);

    if (!env.APP_TOKEN || request.headers.get('X-App-Token') !== env.APP_TOKEN) return fail('unauthorized', 401);
    if (!env.GEMINI_API_KEY) return fail('no-key', 503);

    const length = Number(request.headers.get('Content-Length') || 0);
    if (length > MAX_BODY_BYTES) return fail('too-large', 413);
    let body;
    try {
      const text = await request.text();
      if (text.length > MAX_BODY_BYTES) return fail('too-large', 413);
      body = sanitize(JSON.parse(text));
    } catch {
      body = null;
    }
    if (!body) return fail('bad-request', 400);

    const quota = await takeQuota(env, request.headers.get('CF-Connecting-IP') || 'unknown');
    if (!quota.ok) return fail('limit', 429);

    const result = await callGemini(env, body);
    const extra = quota.remaining >= 0 ? { 'X-Limit-Remaining': String(quota.remaining) } : {};
    if (result.status === 200) return new Response(result.text, { status: 200, headers: { ...cors, 'Content-Type': 'application/json; charset=utf-8', ...extra } });
    if (result.status === 429 || /RESOURCE_EXHAUSTED|quota/i.test(result.raw)) return fail('limit', 429);
    if (result.status === 400 && /API key/i.test(result.raw)) return fail('no-key', 503);
    return json({ error: { code: 'upstream', status: result.status } }, result.status >= 500 ? 502 : 400, extra);
  }
};
