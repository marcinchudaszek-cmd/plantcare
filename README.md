# PlantCare 2.0

Nowa, modułowa wersja PlantCare. **Vite + React + Tailwind + Zustand + PWA.**

## Szybki start

```powershell
# Wejdź do katalogu projektu
cd plantcare

# Zainstaluj zależności
npm install

# Odpal dev server (otworzy się http://localhost:5173/plantcare/)
npm run dev
```

## Co już działa (faza 1)

- ✅ Vite + React + Tailwind skonfigurowane
- ✅ Design system "Forest & Cream" w Tailwind config
- ✅ HashRouter + 5 stron (Home, Plants, Scanner, Encyclopedia, Settings)
- ✅ Bottom nav z aktywnym stanem
- ✅ Strona główna ze wstępnym layoutem (placeholder data)
- ✅ Pozostałe 4 strony jako placeholdery
- ✅ vite-plugin-pwa z manifestem (ikony, theme, scope)
- ✅ Ikony i favicon przeniesione z poprzedniej wersji

## Następne fazy

2. Wyciągnięcie 75 roślin z monolitu do `src/data/plants.json`
3. Store (Zustand) + IndexedDB (idb-keyval)
4. Strony Home/Plants/Encyclopedia podłączone do prawdziwych danych
5. Modal szczegółów rośliny + dziennik + tagi
6. Skaner Gemini (modular SDK, retry, błędy)
7. Firebase v10 modular sync
8. Push notifications + i18n + tryb jasny
9. Build + TWA do Google Play

## Uwagi

**Base path:** Domyślnie projekt buduje się dla `https://marcinchudaszek-cmd.github.io/plantcare/`.
Jeśli chcesz przetestować inny path, ustaw zmienną w `.env.local`:
```
VITE_BASE=/
```

**HashRouter zamiast BrowserRouter** — celowo, żeby działało na GitHub Pages bez konfiguracji 404.html.

**Service Worker w dev:** wyłączony (HMR psułby cache). Włącza się automatycznie po `npm run build`.
