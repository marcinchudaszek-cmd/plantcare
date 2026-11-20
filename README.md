# PlantCare

Asystent pielęgnacji roślin — PWA (Vite + React + Tailwind + Zustand), opublikowana pod
**https://plantcare.beagleapps.pl** i jako aplikacja Android (TWA) `com.beagleappsstudio.plantcare`.

## Co jest w aplikacji

- Moje rośliny: kolekcja, dziennik zdjęć, tagi, podlewanie, oś wzrostu, karta do udostępnienia
- Skaner: rozpoznawanie rośliny ze zdjęcia (kamera na żywo albo galeria) — Gemini 2.5 Flash
- Diagnoza chorób ze zdjęcia, asystent ogrodniczy (czat) — Gemini
- Encyklopedia 113 roślin (`src/data/plants.json`, zdjęcia lokalnie w `public/plants/`)
- Kalendarz podlewania, przypomnienia, statystyki, quiz, porady sezonowe, miernik światła
- Kopia zapasowa do pliku JSON (ze zdjęciami), język PL / EN / DE, motyw jasny / ciemny

Dane leżą w IndexedDB na urządzeniu.

## AI (Gemini)

- Własny klucz użytkownika (Ustawienia) → zapytania idą prosto do Google.
- Bez klucza → worker `plantcare-ai` (`worker/`, https://plantcare-ai.atlas-grzybow.workers.dev) z kluczem
  Beagle Apps i dziennym limitem (KV). Działa tylko wtedy, gdy build ma `VITE_AI_TOKEN` w `.env` (poza gitem,
  wartość = sekret `APP_TOKEN` workera, kopia w `worker/app-token.txt`). Bez tokenu AI wymaga własnego klucza.
- Wdrożenie workera: `npm.cmd run worker:deploy`; sekrety opisane w `worker/wrangler.toml`.

## Konto i synchronizacja (Supabase)

Opcjonalne konto (e-mail + hasło; Google po dodaniu klienta OAuth) — projekt Supabase `plantcare`
(organizacja Beagle Apps, Frankfurt, `iqqhxafnpeyleptjqqeu`). Rośliny w tabeli `plants` (jsonb, RLS),
zdjęcia w prywatnym buckecie `plant-photos`. Kod: `src/lib/cloudSync.js`, `src/components/AccountCard.jsx`.
Klucze publiczne w `.env` (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) — bez nich karta konta się nie pokazuje.
Konfiguracja panelu: `SUPABASE_SETUP.md`.

## Praca lokalna

```powershell
npm.cmd install
npm.cmd run dev      # http://localhost:5173/
npm.cmd run build    # produkcja do dist/
npm.cmd run deploy   # build + publikacja na gałąź gh-pages (domena z public/CNAME)
```

## Android (TWA)

Projekt Bubblewrap leży poza repo: `Desktop\Projekty\pliki-z-aplikacji\plantcare\twa-plantcare`
(klucz `android.keystore`, kopia w `klucze i hasla\PlantCare-klucz`). Plik powiązań
`/.well-known/assetlinks.json` jest na gałęzi gh-pages — musi zawierać odcisk klucza wysyłania
i klucza podpisywania z Play Console.

Szczegóły publikacji: `DEPLOYMENT.md`.
