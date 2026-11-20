// Synchronizacja kolekcji z Supabase.
//
// Model danych (SUPABASE_SETUP.md):
//  - tabela `plants`: jeden wiersz na roślinę (user_id, plant_id, data jsonb, deleted, updated_at),
//  - bucket `plant-photos`: pliki `<user_id>/<photoId>.jpg`.
// Scalanie: dla każdej rośliny wygrywa nowsza wersja (`updatedAt` w danych, `updated_at` dla usunięć).
// Dane lokalne zostają źródłem pracy offline — chmura to kopia i most między urządzeniami.

import { create } from 'zustand';
import { cloudEnabled, getSupabase } from './supabase.js';
import { useAppStore } from '../store/useAppStore.js';
import { loadPhoto, savePhoto, listPhotoIds } from './photoStore.js';
import { invalidatePhotoUrl } from '../hooks/usePhoto.js';

const BUCKET = 'plant-photos';
const UPLOADED_KEY = 'plantcare-cloud-uploaded'; // zdjęcia już wysłane (per użytkownik)
const SYNC_DEBOUNCE_MS = 4000;

export const useCloudStore = create(() => ({
  enabled: cloudEnabled,
  ready: !cloudEnabled,   // czy sprawdzono sesję
  user: null,             // { id, email }
  syncing: false,
  lastSync: null,         // ISO
  error: null             // kod błędu do przetłumaczenia (account.err.*)
}));

const setCloud = (patch) => useCloudStore.setState(patch);

// ===== Pomocnicze =====

const time = (iso) => (iso ? new Date(iso).getTime() : 0);

function readUploaded(userId) {
  try { return new Set(JSON.parse(localStorage.getItem(`${UPLOADED_KEY}:${userId}`) || '[]')); }
  catch { return new Set(); }
}
function writeUploaded(userId, set) {
  try { localStorage.setItem(`${UPLOADED_KEY}:${userId}`, JSON.stringify([...set])); } catch { /* brak miejsca */ }
}

function errorCode(e) {
  const msg = String(e?.message || e || '');
  if (/Invalid login credentials/i.test(msg)) return 'badCredentials';
  if (/already registered|already been registered/i.test(msg)) return 'exists';
  if (/Email not confirmed/i.test(msg)) return 'notConfirmed';
  if (/Password should be|password.*characters/i.test(msg)) return 'weakPassword';
  if (/rate limit|too many/i.test(msg)) return 'rateLimit';
  if (/Failed to fetch|NetworkError|network/i.test(msg)) return 'network';
  return 'generic';
}

// ===== Logowanie =====

export async function signInWithEmail(email, password) {
  const sb = await getSupabase();
  const { error } = await sb.auth.signInWithPassword({ email: email.trim(), password });
  if (error) throw Object.assign(new Error(error.message), { code: errorCode(error) });
}

/** Zakłada konto. Zwraca true, gdy Supabase wymaga potwierdzenia e-mailem. */
export async function signUpWithEmail(email, password) {
  const sb = await getSupabase();
  const { data, error } = await sb.auth.signUp({
    email: email.trim(),
    password,
    options: { emailRedirectTo: redirectUrl() }
  });
  if (error) throw Object.assign(new Error(error.message), { code: errorCode(error) });
  return !data.session;
}

export async function signInWithGoogle() {
  const sb = await getSupabase();
  const { error } = await sb.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: redirectUrl() } });
  if (error) throw Object.assign(new Error(error.message), { code: errorCode(error) });
}

export async function sendPasswordReset(email) {
  const sb = await getSupabase();
  const { error } = await sb.auth.resetPasswordForEmail(email.trim(), { redirectTo: redirectUrl() });
  if (error) throw Object.assign(new Error(error.message), { code: errorCode(error) });
}

export async function signOut() {
  const sb = await getSupabase();
  await sb.auth.signOut();
  setCloud({ user: null, lastSync: null, error: null });
}

/** Trwale usuwa dane z chmury (wiersze i zdjęcia) i wylogowuje. Dane na tym urządzeniu zostają. */
export async function deleteCloudData() {
  const sb = await getSupabase();
  const user = useCloudStore.getState().user;
  if (!sb || !user) return;
  const { data: files } = await sb.storage.from(BUCKET).list(user.id, { limit: 1000 });
  if (files?.length) await sb.storage.from(BUCKET).remove(files.map((f) => `${user.id}/${f.name}`));
  await sb.from('plants').delete().eq('user_id', user.id);
  try { localStorage.removeItem(`${UPLOADED_KEY}:${user.id}`); } catch { /* ignoruj */ }
  await signOut();
}

function redirectUrl() {
  return `${window.location.origin}${window.location.pathname}`;
}

// ===== Synchronizacja =====

let running = null;
let pending = false;
let applying = false; // zmiana stanu pochodzi z samej synchronizacji

/** Pełna synchronizacja: pobierz, scal, wyślij, dociągnij zdjęcia. Bezpieczna do wołania wielokrotnie. */
export function syncNow() {
  if (running) { pending = true; return running; }
  running = doSync().finally(() => {
    running = null;
    if (pending) { pending = false; syncNow(); }
  });
  return running;
}

async function doSync() {
  const sb = await getSupabase();
  const user = useCloudStore.getState().user;
  if (!sb || !user || !useAppStore.getState().loaded) return;
  setCloud({ syncing: true, error: null });
  try {
    // 1. Stan z chmury
    const { data: rows, error } = await sb.from('plants').select('plant_id, data, deleted, updated_at').eq('user_id', user.id);
    if (error) throw error;
    const remote = new Map(rows.map((r) => [r.plant_id, r]));

    // 2. Scalanie
    const { plants: localPlants, deleted: localDeleted, deletedPhotos } = useAppStore.getState();
    const local = new Map(localPlants.map((p) => [p.id, p]));
    const merged = new Map();
    const deleted = { ...localDeleted };
    const upserts = [];

    const ids = new Set([...local.keys(), ...remote.keys(), ...Object.keys(localDeleted)]);
    for (const id of ids) {
      const lp = local.get(id);
      const rr = remote.get(id);
      const lTime = lp ? time(lp.updatedAt || lp.addedAt) : time(localDeleted[id]);
      const rTime = rr ? (rr.deleted ? time(rr.updated_at) : time(rr.data?.updatedAt || rr.updated_at)) : -1;

      if (rTime > lTime) {
        // Chmura nowsza
        if (rr.deleted) { deleted[id] = rr.updated_at; }
        else { merged.set(id, rr.data); delete deleted[id]; }
      } else if (lp) {
        merged.set(id, lp);
        delete deleted[id];
        if (!rr || rTime < lTime || rr.deleted) upserts.push({ plant_id: id, data: lp, deleted: false, updated_at: lp.updatedAt || lp.addedAt || new Date().toISOString() });
      } else if (localDeleted[id]) {
        // Usunięta lokalnie (i nowsza od chmury)
        if (rr && !rr.deleted) upserts.push({ plant_id: id, data: rr.data, deleted: true, updated_at: localDeleted[id] });
      }
    }

    // 3. Wysyłka zmian
    if (upserts.length) {
      const { error: upErr } = await sb.from('plants').upsert(
        upserts.map((u) => ({ ...u, user_id: user.id })),
        { onConflict: 'user_id,plant_id' }
      );
      if (upErr) throw upErr;
    }

    // Zmiany zrobione w trakcie synchronizacji nie mogą przepaść — zostają i pójdą następnym razem
    const current = useAppStore.getState();
    for (const p of current.plants) {
      const snap = local.get(p.id);
      if (!snap || time(p.updatedAt) > time(snap.updatedAt)) { merged.set(p.id, p); delete deleted[p.id]; pending = true; }
    }
    for (const [id, iso] of Object.entries(current.deleted)) {
      if (!localDeleted[id]) { merged.delete(id); deleted[id] = iso; pending = true; }
    }

    // 4. Zdjęcia
    const plants = [...merged.values()];
    const cleared = await syncPhotos(sb, user, plants, deletedPhotos);

    // Usunięcia, które chmura już zna, nie muszą wisieć lokalnie wiecznie (zostawiamy 60 dni)
    const cutoff = Date.now() - 60 * 86400000;
    for (const [id, iso] of Object.entries(deleted)) if (time(iso) < cutoff) delete deleted[id];

    applying = true;
    try { useAppStore.getState().applySynced({ plants, deleted, clearedPhotos: cleared }); }
    finally { applying = false; }
    setCloud({ syncing: false, lastSync: new Date().toISOString() });
  } catch (e) {
    console.warn('[cloudSync]', e);
    setCloud({ syncing: false, error: errorCode(e) });
  }
}

async function syncPhotos(sb, user, plants, deletedPhotos) {
  const uploaded = readUploaded(user.id);
  const localIds = new Set(await listPhotoIds());
  const path = (id) => `${user.id}/${id}.jpg`;

  // Wyślij brakujące w chmurze
  for (const p of plants) {
    for (const id of p.photos || []) {
      if (uploaded.has(id) || !localIds.has(id)) continue;
      const blob = await loadPhoto(id);
      if (!blob) continue;
      const { error } = await sb.storage.from(BUCKET).upload(path(id), blob, { upsert: true, contentType: blob.type || 'image/jpeg' });
      if (!error) uploaded.add(id);
    }
  }

  // Dociągnij brakujące lokalnie
  for (const p of plants) {
    for (const id of p.photos || []) {
      if (localIds.has(id)) continue;
      const { data, error } = await sb.storage.from(BUCKET).download(path(id));
      if (!error && data) {
        await savePhoto(id, data);
        invalidatePhotoUrl(id);
        uploaded.add(id);
      }
    }
  }

  // Usuń w chmurze zdjęcia skasowane lokalnie
  let cleared = [];
  if (deletedPhotos.length) {
    const { error } = await sb.storage.from(BUCKET).remove(deletedPhotos.map(path));
    if (!error) {
      cleared = [...deletedPhotos];
      cleared.forEach((id) => uploaded.delete(id));
    }
  }

  writeUploaded(user.id, uploaded);
  return cleared;
}

// ===== Start =====

let started = false;

/** Wywołaj raz po starcie aplikacji. Bez konfiguracji nic nie robi. */
export async function startCloud() {
  if (!cloudEnabled || started) return;
  started = true;
  const sb = await getSupabase();

  const onSession = (session) => {
    const user = session?.user ? { id: session.user.id, email: session.user.email } : null;
    const prev = useCloudStore.getState().user;
    setCloud({ user, ready: true });
    if (user && user.id !== prev?.id) syncNow();
  };

  const { data } = await sb.auth.getSession();
  onSession(data.session);
  sb.auth.onAuthStateChange((_event, session) => onSession(session));

  // Sprzątnij ?code=… z adresu po powrocie z logowania Google
  if (/[?&]code=/.test(window.location.search)) {
    window.history.replaceState(null, '', `${window.location.pathname}${window.location.hash || '#/'}`);
  }

  // Każda zmiana kolekcji → synchronizacja po chwili ciszy
  let timer = null;
  useAppStore.subscribe((state, prevState) => {
    if (!useCloudStore.getState().user) return;
    if (state.plants === prevState.plants && state.deleted === prevState.deleted) return;
    if (applying) return;
    clearTimeout(timer);
    timer = setTimeout(syncNow, SYNC_DEBOUNCE_MS);
  });

  // Powrót do aplikacji → pobierz zmiany z innych urządzeń
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && useCloudStore.getState().user) syncNow();
  });
  window.addEventListener('online', () => { if (useCloudStore.getState().user) syncNow(); });
}
