# Publikacja PlantCare 2.0 — od buildu do Google Play

Ten dokument prowadzi przez wszystkie kroki publikacji aplikacji.
**Trzymaj go obok siebie.** Każdy krok ma jasny "co robisz" i "jak sprawdzić że zadziałało".

---

## Etap 1: Production build (lokalnie)

**Cel:** sprawdzić że aplikacja buduje się bez błędów i działa w wersji produkcyjnej.

### Krok 1.1 — Build

W PowerShellu, w folderze projektu:

```powershell
npm run build
```

Vite zbuduje aplikację do folderu `dist/`. Trwa 10–30 sekund.

**Co powinno się pokazać:**
```
vite v5.4.x building for production...
✓ 234 modules transformed.
dist/index.html                   0.85 kB
dist/assets/index-XXXXXX.css      32.45 kB │ gzip:  6.21 kB
dist/assets/index-XXXXXX.js     289.34 kB │ gzip: 91.55 kB
✓ built in 4.32s

PWA v0.20.1
mode      generateSW
precache  18 entries (412.30 KiB)
```

**Co sprawdzić:**
- Brak czerwonych błędów
- Folder `dist/` istnieje (`ls dist`)
- Bundle JS pod 300 kB gzipped — jeśli więcej, coś niepotrzebnie wleciało

### Krok 1.2 — Preview production builda

```powershell
npm run preview
```

Otworzy serwer na `http://localhost:5174/plantcare/`. **To NIE jest dev server** — to twoja prawdziwa produkcja, dokładnie taka jaka pójdzie w świat.

**Co przetestować:**
- Wszystkie zakładki działają
- Skaner Gemini działa (klucz API się zachował z dev sesji)
- Motyw się przełącza
- F5 zachowuje stan
- Service Worker rejestruje się (F12 → Application → Service Workers → powinien być aktywny)
- Powiadomienia działają

Zatrzymaj `Ctrl+C` jak skończysz.

---

## Etap 2: Deploy na GitHub Pages

**Cel:** wystawić aplikację pod publicznym URL żeby Android mógł ją załadować.

### Krok 2.1 — Repo na GitHubie

Masz już repo `marcinchudaszek-cmd/plantcare` od starej wersji. Mamy dwie opcje:

**Opcja A — czysta historia (zalecane):**
1. Wejdź na https://github.com/marcinchudaszek-cmd/plantcare
2. Settings → Danger Zone → Delete this repository (potwierdź wpisując nazwę)
3. New repository → nazwa `plantcare`, public, **bez README** (mamy już swój)

**Opcja B — zachowaj historię:**
Nie usuwaj. Po prostu wepchniesz nowe pliki na main.

### Krok 2.2 — Pierwszy push

W PowerShellu, w folderze projektu (jeśli jeszcze nie ma `.git`):

```powershell
git init
git branch -M main
git add .
git commit -m "v2.0.0 — kompletna przebudowa na Vite + React + Tailwind"
git remote add origin https://github.com/marcinchudaszek-cmd/plantcare.git
git push -u origin main --force
```

`--force` jest tylko jeśli wybrałeś Opcję B (nadpisuje stare).

**Co sprawdzić:** wejdź na https://github.com/marcinchudaszek-cmd/plantcare — powinieneś zobaczyć folder `src`, `public`, `package.json` itd.

### Krok 2.3 — Włącz GitHub Pages

1. Repo → Settings → Pages
2. Source: **Deploy from a branch**
3. Branch: **gh-pages** / **/ (root)** — branch jeszcze nie istnieje, to OK
4. Save

### Krok 2.4 — Deploy

```powershell
npm run deploy
```

Co się dzieje pod spodem: `predeploy` robi build, potem `gh-pages` wypycha zawartość `dist/` na branch `gh-pages` w Twoim repo. Trwa 30–60 sekund.

**Co sprawdzić:**
1. W repo na GitHubie powinien pojawić się drugi branch `gh-pages` (Code → przełącznik branch)
2. Wejdź na **https://marcinchudaszek-cmd.github.io/plantcare/** — pierwsza wizyta może zająć 1–2 minuty (GitHub buduje stronę)
3. Powinieneś zobaczyć działającą aplikację, identyczną jak w `npm run preview`

**Jeśli widzisz 404:** poczekaj 2 minuty i spróbuj jeszcze raz, GitHub potrzebuje chwili na pierwszy build.

**Jeśli widzisz 404 po 5 minutach:** Settings → Pages → sprawdź czy branch `gh-pages` jest zaznaczony. Jeśli jest komunikat "Your site is published at..." to URL jest dobry.

---

## Etap 3: PWA jako TWA — przygotowanie

**Cel:** Twoja PWA będzie uruchamiana z apki Android jako pełnoekranowa aplikacja, bez paska adresu Chrome.

### Krok 3.1 — Sprawdź PWA Lighthouse score

1. W Chromie wejdź na https://marcinchudaszek-cmd.github.io/plantcare/
2. F12 → Lighthouse → kategorie: **PWA** + **Performance** → Analyze page load
3. Cel: **wszystkie punkty zielone w PWA**, performance min. 90

Najczęstsze problemy:
- "Does not have a `<meta name="viewport">`" → już mamy w `index.html`
- "Service worker does not control..." → odśwież F5 i puść Lighthouse jeszcze raz
- "Missing icons" → już skopiowaliśmy

### Krok 3.2 — Bubblewrap install

[Bubblewrap](https://github.com/GoogleChromeLabs/bubblewrap) to oficjalne narzędzie Google do generowania projektu Android Studio z PWA.

**Wymaga Java JDK 17+**. Jeśli nie masz:
1. Pobierz z https://adoptium.net (Temurin 17 LTS)
2. Zainstaluj
3. W PowerShellu sprawdź: `java -version` — powinno pokazać `17.x.x` lub wyżej

Instalacja Bubblewrap:

```powershell
npm install -g @bubblewrap/cli
```

Sprawdź:
```powershell
bubblewrap --help
```

Powinno wypisać listę komend.

### Krok 3.3 — Generowanie projektu TWA

W folderze NADRZĘDNYM nad projektem (np. `C:\Users\marci\Desktop\`):

```powershell
mkdir plantcare-twa
cd plantcare-twa
bubblewrap init --manifest=https://marcinchudaszek-cmd.github.io/plantcare/manifest.webmanifest
```

Bubblewrap zada pytania:
- **Domain**: `marcinchudaszek-cmd.github.io` ✓
- **Application name**: `PlantCare`
- **Short name**: `PlantCare`
- **Application package name**: `com.beagleappsstudio.plantcare`
- **Start URL**: `/plantcare/` ✓
- **Display mode**: `standalone` ✓
- **Status bar color**: `#0b2218` ✓
- **Splash color**: `#0b2218`
- **Icon URL**: powinien sam wziąć z manifestu
- **Maskable icon URL**: zostaw default
- **Monochrome icon URL**: zostaw default
- **Shortcuts**: brak (na razie)
- **Signing key location**: zaakceptuj default (tworzy nowy keystore w `~/.android/`)
- **Signing key password**: **WAŻNE** — wpisz mocne hasło i **ZAPISZ JE w bezpiecznym miejscu**. Bez tego nie zaktualizujesz aplikacji nigdy.
- **Key alias / password**: to samo co wyżej

Po zakończeniu w folderze `plantcare-twa` znajdziesz projekt Android Studio z `app/`, `gradle/` itd.

### Krok 3.4 — SHA-256 fingerprint

Bubblewrap wyświetli SHA-256 Twojego klucza (wygląda jak `AB:CD:12:34:...`). **Skopiuj go.**

Jeśli zgubisz, wyciągnij ponownie:
```powershell
bubblewrap fingerprint
```

### Krok 3.5 — Zaktualizuj assetlinks.json

W projekcie PlantCare:

1. Otwórz `public/.well-known/assetlinks.json`
2. Zamień `REPLACE_WITH_SHA256_FROM_BUBBLEWRAP_OR_PLAY_CONSOLE` na swój SHA-256
3. Zachowaj format z dwukropkami: `"AB:CD:12:34:..."`

```powershell
npm run deploy
```

To wypchnie zaktualizowany `assetlinks.json` na produkcję.

**Sprawdź:** wejdź w przeglądarce na **https://marcinchudaszek-cmd.github.io/.well-known/assetlinks.json** — powinieneś zobaczyć swój JSON z SHA-256. Jeśli zwraca 404, to znaczy że Vite nie skopiował folderu `.well-known/` (już naprawione w `vite.config.js`, ale zweryfikuj).

### Krok 3.6 — Build APK / AAB

Wracając do folderu `plantcare-twa`:

```powershell
bubblewrap build
```

Generuje:
- `app-release-bundle.aab` — to wrzucasz do Google Play
- `app-release-signed.apk` — do testów lokalnie

Trwa 1–3 minuty (Gradle buduje).

### Krok 3.7 — Test APK na telefonie

1. Skopiuj `app-release-signed.apk` na telefon (USB, Drive, mail)
2. Otwórz na telefonie, zezwól na instalację z nieznanych źródeł
3. Zainstaluj
4. Otwórz "PlantCare" — powinna się załadować Twoja PWA bez paska Chrome

**Jeśli widzisz pasek Chrome u góry:** to znaczy że `assetlinks.json` jest źle albo SHA się nie zgadza. Sprawdź w Chrome Dev na telefonie, lub:
```powershell
bubblewrap validate
```

---

## Etap 4: Google Play Console

**Cel:** opublikować aplikację (jak Voyager / Deutsch Lernen).

### Krok 4.1 — Listing

Wszystko w https://play.google.com/console (znasz z poprzednich apek).

Potrzebujesz:
- **Tytuł:** PlantCare — opieka nad roślinami
- **Krótki opis** (80 znaków): "Inteligentny asystent pielęgnacji roślin doniczkowych z AI i bazą 88 gatunków"
- **Pełny opis:** napisz wersję marketingową, wymień: 88 gatunków, AI Gemini, dziennik, tagi, powiadomienia, tryb offline, jasny/ciemny, PL/EN/DE
- **Screenshoty:** min. 2, najlepiej 4–8. Zrób na telefonie z TWA, lub z `npm run preview` w Chrome DevTools z trybem mobilnym
- **Ikona feature graphic:** 1024×500 px
- **Kategoria:** Lifestyle / Domowe
- **Polityka prywatności:** musi być URL — zrób prostą stronę na GitHub Pages w stylu `marcinchudaszek-cmd.github.io/plantcare-privacy/`. Wzmianka o tym że klucz API i dane są lokalne, że Gemini jest wywoływane z urządzenia użytkownika

### Krok 4.2 — Internal testing → Production

Tak jak z Deutsch Lernen:
1. Najpierw **Internal testing** — minimum 12 testerów (zbierz przez Reddit, FB)
2. Po 14 dniach z aktywnymi testerami możesz aplikować o **Production**

### Krok 4.3 — Upload AAB

1. App releases → Internal testing → Create release
2. Upload `app-release-bundle.aab`
3. Fill release notes: "Pierwsza wersja"
4. Save → Review → Start rollout

---

## Etap 5: Aktualizacje w przyszłości

Cykl po wprowadzeniu zmian w kodzie:

```powershell
# 1. Test lokalnie
npm run dev

# 2. Build i deploy PWA
npm run deploy

# 3. Build TWA z nowym version code
cd ../plantcare-twa
bubblewrap update
bubblewrap build

# 4. Upload AAB do Google Play
```

**WAŻNE:** za każdym razem zwiększaj `versionCode` w `app/build.gradle` (o 1) i `versionName` (np. 1.0.0 → 1.0.1). Bubblewrap robi to automatycznie przy `update`.

---

## Lista kontrolna gotowości

Przed pierwszym uploadem do Play:

- [ ] `npm run build` przechodzi bez errorów
- [ ] `npm run preview` działa, wszystko klika
- [ ] `npm run deploy` wypchnęło na GitHub Pages
- [ ] https://marcinchudaszek-cmd.github.io/plantcare/ otwiera się
- [ ] Lighthouse PWA: wszystkie zielone
- [ ] Bubblewrap zainstalowany, JDK 17+ działa
- [ ] `bubblewrap init` przeszedł, mam keystore i hasło ZAPISANE
- [ ] SHA-256 wklejony do `assetlinks.json` i zdeployowany
- [ ] https://marcinchudaszek-cmd.github.io/.well-known/assetlinks.json zwraca JSON
- [ ] APK przetestowany na telefonie, otwiera się bez paska Chrome
- [ ] Screenshoty zrobione (min. 2)
- [ ] Polityka prywatności online (URL)
- [ ] Konto Google Play Console aktywne (znowu — masz już)
- [ ] AAB wgrany do Internal testing
- [ ] 12 testerów zebranych

---

## Pomoc

Jeśli któryś krok się sypie, **wklej dokładny komunikat błędu** — większość rzeczy daje się szybko zdiagnozować po treści errora.
