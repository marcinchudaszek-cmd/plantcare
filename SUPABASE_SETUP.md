# PlantCare — konfiguracja logowania i synchronizacji (Supabase)

Ten plik opisuje kroki, które trzeba wykonać **w panelach Supabase i Google**.
Kod aplikacji jest już przygotowany — po uzupełnieniu kluczy zacznie działać.

---

## 1. Załóż projekt Supabase
1. Wejdź na https://supabase.com → **New project** (darmowy plan wystarczy).
2. Zapisz hasło do bazy (nie będzie potrzebne w aplikacji).
3. Po utworzeniu wejdź w **Settings → API** i skopiuj:
   - **Project URL** (np. `https://abcd.supabase.co`)
   - **anon public** key (długi `eyJ...`) — to klucz **publiczny**, bezpieczny w aplikacji.

## 2. Wklej klucze do aplikacji
Dopisz do pliku `.env` w katalogu projektu (obok `package.json`, plik jest poza gitem):

```
VITE_SUPABASE_URL=https://TWOJPROJEKT.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...twoj_anon_public...
```

(`.env` jest w `.gitignore` — nie trafi do repo. Bez tych dwóch wartości karta konta się nie pokazuje, a aplikacja działa lokalnie jak dotąd.)

## 3. Tabela roślin + reguły dostępu
W Supabase → **SQL Editor** → wklej i uruchom:

```sql
create table if not exists public.plants (
  row_id     uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  plant_id   text not null,                 -- id rośliny z aplikacji
  data       jsonb not null,                -- cały obiekt rośliny
  deleted    boolean not null default false, -- usunięta (żeby usunięcie dotarło na inne urządzenia)
  updated_at timestamptz not null default now(),
  unique (user_id, plant_id)
);

alter table public.plants enable row level security;

-- Każdy widzi i edytuje TYLKO swoje rośliny
create policy "own rows - select" on public.plants
  for select using (auth.uid() = user_id);
create policy "own rows - insert" on public.plants
  for insert with check (auth.uid() = user_id);
create policy "own rows - update" on public.plants
  for update using (auth.uid() = user_id);
create policy "own rows - delete" on public.plants
  for delete using (auth.uid() = user_id);
```

## 4. Storage na zdjęcia
Supabase → **Storage** → **New bucket**:
- Nazwa: `plant-photos`
- **Prywatny** (nie public).

Potem w **SQL Editor**:

```sql
-- Pliki trzymamy w folderze o nazwie = user_id. Każdy zarządza tylko swoim folderem.
create policy "own photos - all" on storage.objects
  for all to authenticated
  using (bucket_id = 'plant-photos' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'plant-photos' and (storage.foldername(name))[1] = auth.uid()::text);
```

## 5. Logowanie e-mail + hasło
Supabase → **Authentication → Providers → Email**: włączone (domyślnie jest).
- Na start warto **wyłączyć** „Confirm email" (Authentication → Providers → Email),
  żeby konto działało od razu bez maila potwierdzającego. Można włączyć później.

## 6. Logowanie Google
1. **Google Cloud Console** → https://console.cloud.google.com → utwórz projekt.
2. **APIs & Services → OAuth consent screen** → typ **External** → uzupełnij nazwę i mail.
3. **Credentials → Create credentials → OAuth client ID** → typ **Web application**.
   - **Authorized redirect URI**:
     `https://TWOJPROJEKT.supabase.co/auth/v1/callback`
   - Skopiuj **Client ID** i **Client secret**.
4. Supabase → **Authentication → Providers → Google** → włącz, wklej Client ID + secret.

## 7. Adresy powrotu (redirect)
Supabase → **Authentication → URL Configuration**:
- **Site URL**: `https://plantcare.beagleapps.pl`
- **Redirect URLs** (dodaj oba): 
  - `https://plantcare.beagleapps.pl`
  - `http://localhost:5173` i `http://localhost:5201` (do testów lokalnych)

---

## Co przekazać, żebym dokończył
Wystarczą **dwie wartości publiczne** z kroku 1:
- **Project URL**
- **anon public** key

(NIE wysyłaj `service_role` ani Google Client secret — te zostają w panelach.)
Po ich otrzymaniu wpinam logowanie + synchronizację, testuję i wdrażam.
