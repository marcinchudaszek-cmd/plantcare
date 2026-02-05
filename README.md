# 🌿 PlantCare - Twój Inteligentny Ogrodnik

![PlantCare Logo](icons/icon-192x192.png)

**PlantCare** to nowoczesna aplikacja PWA (Progressive Web App) do pielęgnacji roślin doniczkowych z eleganckimi funkcjami i pięknym interfejsem w stylu "Botanical Dark".

[![PWA](https://img.shields.io/badge/PWA-Ready-green.svg)](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Made with Love](https://img.shields.io/badge/Made%20with-❤️-red.svg)](https://github.com)

---

## ✨ Funkcje

### 🌱 Zarządzanie Roślinami
- **59 gatunków roślin** w kompleksowej bazie danych
- Dodawanie własnych roślin do kolekcji
- Szczegółowe karty informacyjne dla każdej rośliny
- Śledzenie historii podlewania

### 📸 Galeria Zdjęć
- Dodawanie własnych zdjęć roślin
- Obsługa plików do 5MB
- Przechowywanie w localStorage

### 💧 Przypomnienia o Podlewaniu
- Automatyczne powiadomienia
- Śledzenie ostatniego podlania
- Licznik dni do następnego podlewania

### 🎨 Nowoczesny Design
- Motyw "Botanical Dark" z efektem glassmorphism
- Responsywny interfejs (desktop + mobile)
- Eleganckie animacje i przejścia
- Ciemne tło z subtelnymi gradientami

### 📱 Funkcje PWA
- **Offline First** - działa bez internetu
- Instalacja na urządzeniu
- Push notifications
- Background sync
- Service Worker z inteligentnym cache

### 💾 Import/Export
- Eksport danych do pliku JSON
- Import kopii zapasowej
- Bezpieczne przechowywanie w localStorage

---

## 🚀 Instalacja

### Wymagania
- Przeglądarka wspierająca PWA (Chrome, Edge, Safari, Firefox)
- Włączona obsługa JavaScript
- ~2MB miejsca na dane (localStorage)

### Metoda 1: GitHub Pages (Zalecana)

1. **Fork tego repozytorium**
   ```bash
   git clone https://github.com/marcinchudaszek-cmd/plantcare.git
   cd plantcare
   ```

2. **Włącz GitHub Pages**
   - Idź do: Settings → Pages
   - Source: `main` branch
   - Folder: `/ (root)`
   - Save

3. **Odwiedź swoją stronę**
   ```
   https://marcinchudaszek-cmd.github.io/plantcare/
   ```

### Metoda 2: Lokalna instalacja

1. **Pobierz pliki**
   ```bash
   git clone https://github.com/marcinchudaszek-cmd/plantcare.git
   cd plantcare
   ```

2. **Otwórz w przeglądarce**
   - Dwukrotnie kliknij na `index.html`
   - LUB uruchom lokalny serwer:
   ```bash
   # Python 3
   python -m http.server 8000
   
   # Node.js
   npx serve
   ```

3. **Gotowe!**
   - Otwórz: `http://localhost:8000`

### Metoda 3: Netlify / Vercel

**Netlify:**
```bash
netlify deploy --prod
```

**Vercel:**
```bash
vercel --prod
```

---

## 📱 Instalacja jako PWA

### Na telefonie (Android/iOS):

1. Otwórz aplikację w przeglądarce
2. **Android (Chrome):**
   - Menu (⋮) → "Dodaj do ekranu głównego"
3. **iOS (Safari):**
   - Przycisk "Udostępnij" → "Dodaj do ekranu głównego"

### Na komputerze:

1. Otwórz w Chrome/Edge
2. Kliknij ikonę "+" w pasku adresu
3. "Zainstaluj PlantCare"

---

## 🎮 Jak Używać

### Dodawanie Rośliny

1. Kliknij **📚 Baza** (menu na dole)
2. Wybierz gatunek rośliny (np. Monstera)
3. Przejrzyj informacje
4. Kliknij **➕ Dodaj do moich roślin**
5. Gotowe! Roślina w Twojej kolekcji

### Dodawanie Zdjęcia

1. Kliknij **🌿 Moje** (menu na dole)
2. Wybierz roślinę
3. Kliknij **📷 Kliknij aby dodać zdjęcie**
4. Wybierz plik (max 5MB)
5. Zdjęcie zostanie zapisane!

### Podlewanie

1. **🏠 Start** → znajdź roślinę do podlania
2. Kliknij na roślinę
3. Kliknij **💧 Podlej teraz**
4. Data zostanie zapisana automatycznie

### Backup Danych

**Eksport:**
1. **⚙️ Ustawienia** (ikona koła zębatego)
2. **📤 Eksportuj dane**
3. Zapisz plik `.json`

**Import:**
1. **⚙️ Ustawienia**
2. **📥 Importuj dane**
3. Wybierz plik backup
4. Dane zostaną przywrócone

---

## 🛠️ Technologie

### Frontend
- **HTML5** - semantyczny markup
- **CSS3** - moderne style z glassmorphism
- **Vanilla JavaScript** - bez frameworków!

### PWA
- **Service Worker** - offline support
- **Web App Manifest** - instalacja na urządzeniu
- **Cache API** - inteligentne cachowanie
- **localStorage** - przechowywanie danych

### Design
- **Google Fonts:**
  - Playfair Display (nagłówki)
  - DM Sans (tekst)
- **Emoji** jako ikony
- **CSS Grid & Flexbox** - responsywny layout
- **CSS Custom Properties** - dynamiczne motywy

---

## 📂 Struktura Projektu

```
plantcare/
│
├── index.html              # Główny plik aplikacji
├── manifest.json           # PWA manifest
├── sw.js                   # Service Worker
├── favicon.ico             # Favicon
│
├── icons/                  # Ikony aplikacji
│   ├── icon-72x72.png
│   ├── icon-96x96.png
│   ├── icon-128x128.png
│   ├── icon-144x144.png
│   ├── icon-152x152.png
│   ├── icon-192x192.png    # Główna ikona
│   ├── icon-384x384.png
│   ├── icon-512x512.png    # Główna ikona
│   ├── icon.png
│   └── icon.svg
│
├── README.md               # Ten plik
└── INSTALACJA-KROK-PO-KROKU.md  # Instrukcja instalacji
```

---

## 🌿 Baza Roślin

Aplikacja zawiera **59 gatunków roślin** z kompletnymi informacjami:

### Kategorie:
- 🌵 **Sukulenty** (Aloes, Sansevieria, itd.)
- 🌴 **Tropikalne** (Monstera, Filodendron, itd.)
- 🌸 **Kwitnące** (Orchidea, Anthurium, itd.)
- 🌿 **Zioła** (Bazylia, Mięta, itd.)
- 🌾 **Paprocie** (Nerka, Boston, itd.)

### Dla każdej rośliny:
- 💧 Częstotliwość podlewania
- ☀️ Wymagania świetlne
- 🌡️ Temperatura
- 💨 Wilgotność
- 🌱 Poziom trudności
- 📝 Dodatkowe wskazówki

---

## 📊 Funkcje w Wersji Beta

- ✅ Podstawowe zarządzanie roślinami
- ✅ Baza 59 gatunków
- ✅ Upload zdjęć
- ✅ Przypomnienia o podlewaniu
- ✅ Import/Export danych
- ✅ PWA offline support
- ⏳ AI-powered skanowanie roślin (planowane)
- ⏳ Społeczność użytkowników (planowane)
- ⏳ Porady sezonowe (planowane)

---

## 🤝 Kontrybucje

Chcesz pomóc w rozwoju PlantCare? Świetnie! 

### Jak dodać nową roślinę:

1. Fork repozytorium
2. Znajdź w `index.html` sekcję `const plantDatabase = [`
3. Dodaj nowy obiekt rośliny:
```javascript
{
    id: 60,
    name: "Nazwa Rośliny",
    scientificName: "Nazwa łacińska",
    category: "Kategoria",
    difficulty: "łatwa/średnia/trudna",
    watering: "codziennie/co 3 dni/co tydzień/itd.",
    light: "pełne słońce/jasne/półcień/cień",
    temperature: "18-24°C",
    humidity: "normalna/wysoka/niska",
    description: "Opis rośliny...",
    tips: "Wskazówki..."
}
```
4. Commit i Pull Request!

### Zgłaszanie błędów:

Otwórz **Issue** z opisem:
- Co się stało?
- Jakie kroki prowadzą do błędu?
- Screenshot (jeśli możliwe)
- Przeglądarka i system

---

## 📄 Licencja

Ten projekt jest dostępny na licencji **MIT**. Możesz go swobodnie używać, modyfikować i dystrybuować.

```
MIT License

Copyright (c) 2025 PlantCare

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction...
```

---

## 👨‍💻 Autor

**Marcin** - Passionate developer & plant enthusiast 🌱

- GitHub: [@marcinchudaszek-cmd](https://github.com/marcinchudaszek-cmd)
- Projekt: [PlantCare](https://github.com/marcinchudaszek-cmd/plantcare)

---

## 🙏 Podziękowania

- **Google Fonts** - za piękne czcionki
- **PWA Community** - za wsparcie techniczne
- **Społeczność miłośników roślin** - za inspirację

---

## 📮 Kontakt

Masz pytania? Pomysły na nowe funkcje?

- 📧 Email: marcinchudaszek.cmd@gmail.com
- 💬 Issues: [GitHub Issues](https://github.com/marcinchudaszek-cmd/plantcare/issues)
- ⭐ Star this repo jeśli Ci się podoba!

---

## 📸 Screenshots

<!-- Dodaj tutaj screenshoty aplikacji -->

### Strona Główna
![Home](screenshots/home.png)

### Baza Roślin
![Database](screenshots/database.png)

### Szczegóły Rośliny
![Details](screenshots/details.png)

---

<div align="center">

**Made with ❤️ and 🌿**

[⬆ Powrót na górę](#-plantcare---twój-inteligentny-ogrodnik)

</div>
