# 🤝 Jak Wnieść Wkład w PlantCare

Dziękujemy za zainteresowanie projektem PlantCare! ❤️

## 🌱 Jak Zacząć

1. **Fork repozytorium**
2. **Sklonuj swój fork**
   ```bash
   git clone https://github.com/TWOJA-NAZWA/plantcare.git
   cd plantcare
   ```
3. **Stwórz nowy branch**
   ```bash
   git checkout -b feature/nazwa-funkcji
   ```

## 📝 Co Możesz Dodać

### 🌿 Nowe Rośliny
Najbardziej potrzebne! Dodaj nowe gatunki do bazy.

**Gdzie:** `index.html` → sekcja `const plantDatabase = [`

**Szablon:**
```javascript
{
    id: 60, // następny numer
    name: "Nazwa Polska",
    scientificName: "Nazwa Łacińska",
    category: "tropikalne/sukulenty/zioła/paprocie/kwitnące",
    difficulty: "łatwa/średnia/trudna",
    watering: "codziennie/co 3 dni/co tydzień/co 2 tygodnie/rzadko",
    light: "pełne słońce/jasne/półcień/cień",
    temperature: "18-24°C",
    humidity: "normalna/wysoka/niska",
    description: "Szczegółowy opis rośliny, jej pochodzenie, wygląd...",
    tips: "Praktyczne wskazówki pielęgnacyjne..."
}
```

### 🐛 Poprawki Błędów
Znalazłeś bug? Super!

1. Sprawdź czy nie ma już issue
2. Jeśli nie - stwórz nowy issue
3. Fork → Fix → Pull Request

### ✨ Nowe Funkcje
Masz pomysł na nową funkcję?

1. Najpierw stwórz **Issue** z opisem
2. Poczekaj na feedback
3. Implementuj
4. Pull Request!

## 📋 Zasady

### Code Style
- **JavaScript:** Vanilla JS (bez frameworków)
- **CSS:** BEM notation preferowana
- **Komentarze:** Po polsku w kodzie
- **Indentacja:** 4 spacje

### Commity
```bash
# Dobre:
git commit -m "feat: Dodano nowy gatunek - Begonia"
git commit -m "fix: Naprawiono błąd w podlewaniu"
git commit -m "docs: Aktualizacja README"

# Złe:
git commit -m "zmiany"
git commit -m "asdf"
```

**Prefixes:**
- `feat:` - nowa funkcja
- `fix:` - naprawa błędu
- `docs:` - dokumentacja
- `style:` - formatowanie
- `refactor:` - refaktoryzacja
- `test:` - testy
- `chore:` - inne

### Pull Request
1. Opisz co zmieniłeś
2. Dlaczego to ważne
3. Jak przetestowałeś
4. Screenshoty (jeśli UI)

**Szablon:**
```markdown
## Opis
[Co zostało zmienione]

## Typ zmiany
- [ ] Nowa funkcja
- [ ] Poprawka błędu
- [ ] Dokumentacja
- [ ] Refaktoryzacja

## Testy
- [ ] Testowane na Chrome (Android)
- [ ] Testowane na Safari (iOS)
- [ ] Testowane offline
- [ ] Service Worker działa

## Screenshoty
[Jeśli dotyczy UI]
```

## 🧪 Testowanie

Przed PR upewnij się że:

```bash
# 1. Aplikacja działa lokalnie
# Otwórz index.html w przeglądarce

# 2. Brak błędów w Console (F12)

# 3. Service Worker działa
# F12 → Application → Service Workers

# 4. Manifest OK
# F12 → Application → Manifest

# 5. Lighthouse score > 80
# F12 → Lighthouse → Analyze
```

## ❓ Pytania

Masz pytania? Nie wiesz jak zacząć?

- 💬 Otwórz **Discussion**
- 📧 Wyślij email
- 💭 Napisz komentarz w Issue

## 🎉 Podziękowania

Każdy wkład jest ważny! Od literówki po nową funkcję. 

**Dzięki za pomoc w rozwoju PlantCare!** 🌿

---

## 📜 Licencja

Wszystkie wkłady są licencjonowane na MIT License.
