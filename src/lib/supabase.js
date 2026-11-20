// Klient Supabase — ładowany leniwie, żeby osoby bez konta nie pobierały ~50 kB biblioteki.
// Klucze publiczne (anon) — bezpieczne w kliencie. Ustaw w .env (poza gitem):
//   VITE_SUPABASE_URL=https://twojprojekt.supabase.co
//   VITE_SUPABASE_ANON_KEY=...   (klucz „anon public” / „publishable” z Supabase → Settings → API)
// Bez nich aplikacja działa jak dotąd — lokalnie, bez kont.

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const cloudEnabled = Boolean(url && anonKey);

let clientPromise = null;

/** Zwraca klienta Supabase (albo null, gdy chmura nie jest skonfigurowana) */
export function getSupabase() {
  if (!cloudEnabled) return Promise.resolve(null);
  if (!clientPromise) {
    clientPromise = import('@supabase/supabase-js').then(({ createClient }) =>
      createClient(url, anonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          // Powrót z logowania Google: ?code=… w adresie (PKCE), HashRouter używa #/…
          detectSessionInUrl: true,
          flowType: 'pkce'
        }
      })
    );
  }
  return clientPromise;
}
