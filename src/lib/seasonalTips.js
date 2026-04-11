// Sezonowe porady ogrodnicze — jedna nowa karta na Home każdego dnia.
// 12 miesięcy × 3 porady = 36 wpisów w cyklu rocznym.
// Algorytm wybiera poradę po (miesiąc, dzień % 3) — dzięki temu w danym
// miesiącu trzy różne porady się zmieniają, a powtarzają się dopiero
// po 3 dniach, więc co kilka wejść aplikacji widzisz coś nowego.

const TIPS = {
  // === ZIMA ===
  0: [ // styczeń
    {
      title: 'Mniej światła, mniej wody',
      body: 'W styczniu rośliny śpią. Podlewaj o połowę rzadziej niż latem — większość gatunków obejdzie się bez wody przez 2–3 tygodnie.',
      icon: '❄️'
    },
    {
      title: 'Suchy kaloryfer to wróg',
      body: 'Centralne ogrzewanie wysusza powietrze do 20%. Tropikalne rośliny lubią 50–60%. Postaw miskę z wodą obok kaloryfera lub spryskuj liście rano.',
      icon: '🌡️'
    },
    {
      title: 'Sprawdź czy nie marzną',
      body: 'Liście stykające się z zimną szybą przez noc mogą się przeziębić. Odsuń doniczki kilka centymetrów od okna.',
      icon: '🪟'
    }
  ],
  1: [ // luty
    {
      title: 'Najciemniejszy miesiąc kończy się',
      body: 'Dni już się wydłużają. To nadal czas spoczynku, ale pierwsze rośliny zaczynają budzić się ze snu — obserwuj nowe pąki.',
      icon: '🌱'
    },
    {
      title: 'Czyść liście wilgotną szmatką',
      body: 'Kurz na liściach blokuje fotosyntezę. Raz w miesiącu przetrzyj duże liście (Monstera, Ficus, Strelitzia) wilgotną ściereczką.',
      icon: '🍃'
    },
    {
      title: 'Czas planować przesadzanie',
      body: 'Marzec jest miesiącem przesadzania. Już teraz sprawdź które rośliny mają korzenie wystające z otworów drenażowych — to one będą priorytetem.',
      icon: '📋'
    }
  ],
  // === WIOSNA ===
  2: [ // marzec
    {
      title: 'Sezon przesadzania!',
      body: 'Marzec i kwiecień to najlepszy moment na przesadzanie. Roślina ma cały sezon wegetacyjny żeby zakorzenić się w nowej ziemi.',
      icon: '🪴'
    },
    {
      title: 'Pierwsze nawożenie',
      body: 'Po kilku miesiącach przerwy zacznij delikatnie nawozić. W marcu połowa zalecanej dawki, od kwietnia pełna.',
      icon: '💧'
    },
    {
      title: 'Wiosenne czyszczenie',
      body: 'Usuń żółte i suche liście. To nie tylko kwestia estetyki — chore liście zabierają roślinie energię.',
      icon: '✂️'
    }
  ],
  3: [ // kwiecień
    {
      title: 'Stopniowo zwiększaj podlewanie',
      body: 'Rośliny budzą się i potrzebują więcej wody. Nadal sprawdzaj wilgotność palcem przed podlaniem — nadmiar wciąż zabija.',
      icon: '💦'
    },
    {
      title: 'Uważaj na ostre słońce',
      body: 'Słońce jest mocniejsze niż się wydaje. Rośliny które stały zimą w cieniu mogą się oparzyć. Wprowadzaj na słońce stopniowo.',
      icon: '☀️'
    },
    {
      title: 'Czas na rozmnażanie',
      body: 'Kwiecień to świetny moment na sadzonki. Pothos, Filodendron, Tradescantia — wszystkie ukorzeniają się w wodzie w 1–2 tygodnie.',
      icon: '🌿'
    }
  ],
  4: [ // maj
    {
      title: 'Można wystawić na balkon',
      body: 'Jeśli temperatura w nocy nie spada poniżej 12°C, większość roślin doniczkowych z radością postoi na balkonie. Najpierw w cieniu, potem na słońcu.',
      icon: '🏡'
    },
    {
      title: 'Sezon szkodników się zaczyna',
      body: 'Sprawdzaj spody liści raz w tygodniu. Przędziorek, mszyce, tarczniki — im wcześniej zauważysz, tym łatwiej wyleczysz.',
      icon: '🐛'
    },
    {
      title: 'Kwitną storczyki domowe',
      body: 'Wiele Phalaenopsis kwitnie właśnie teraz. Po przekwitnięciu nie odcinaj pędu kwiatowego całego — może wypuścić nowe pąki.',
      icon: '🌸'
    }
  ],
  // === LATO ===
  5: [ // czerwiec
    {
      title: 'Najwyższy sezon wzrostu',
      body: 'Czerwiec, lipiec i sierpień to czas największego wzrostu. Nawożenie co 2 tygodnie, pełne dawki, nie pomijaj.',
      icon: '🌱'
    },
    {
      title: 'Uważaj na parapety południowe',
      body: 'W południe szyba może się rozgrzać do 50°C. Liście dotykające szyby palą się. Odsuń lub zasłoń firanką.',
      icon: '🔥'
    },
    {
      title: 'Wakacje? Zaplanuj z głową',
      body: 'Przed wyjazdem dobrze podlej, postaw w półcieniu, daj komuś klucz lub zainwestuj w nawadniacze knotowe. Sukulenty wytrzymają same.',
      icon: '✈️'
    }
  ],
  6: [ // lipiec
    {
      title: 'Podlewaj rano lub wieczorem',
      body: 'Podlewanie w pełnym słońcu może uszkodzić korzenie i liście. Krople wody działają jak soczewki. Najlepiej rano.',
      icon: '🌅'
    },
    {
      title: 'Spryskuj wodą deszczową',
      body: 'Kran daje twardą wodę z chlorem. Łap deszczówkę — rośliny tropikalne ją uwielbiają, a kosztuje zero.',
      icon: '🌧️'
    },
    {
      title: 'Niektóre wolą się posuszyć',
      body: 'Sukulenty, kaktusy, Sansewieria — w lecie podlewaj rzadziej niż się wydaje. Zbyt wilgotna ziemia w upale to gnicie korzeni.',
      icon: '🌵'
    }
  ],
  7: [ // sierpień
    {
      title: 'Przygotuj się do końca lata',
      body: 'Pod koniec sierpnia zacznij stopniowo zmniejszać częstość nawożenia. Roślina przygotowuje się do wolniejszego okresu.',
      icon: '🍂'
    },
    {
      title: 'Drobne zwijanie liści?',
      body: 'W upale to często naturalna obrona przed parowaniem. Jeśli wracają do formy wieczorem, wszystko OK. Jeśli nie — sprawdź wilgotność ziemi.',
      icon: '🥵'
    },
    {
      title: 'Czas zbierać nasiona ziół',
      body: 'Bazylia, kolendra, koper. Zbieraj nasiona z najsilniejszych roślin — odtworzysz je w przyszłym roku za darmo.',
      icon: '🌾'
    }
  ],
  // === JESIEŃ ===
  8: [ // wrzesień
    {
      title: 'Wnieś rośliny z balkonu',
      body: 'Zanim noce spadną poniżej 10°C, zabierz rośliny do środka. Przed wniesieniem dokładnie sprawdź na obecność szkodników.',
      icon: '🏠'
    },
    {
      title: 'Zmniejsz podlewanie',
      body: 'Krótszy dzień = wolniejsza fotosynteza = mniej wody potrzebne. Stopniowo wydłużaj odstępy.',
      icon: '💧'
    },
    {
      title: 'Ostatnie nawożenie',
      body: 'Wrzesień to ostatni miesiąc na nawożenie. Październik i dalej — koniec, roślina ma odpocząć.',
      icon: '🛑'
    }
  ],
  9: [ // październik
    {
      title: 'Sezon spoczynku zaczyna się',
      body: 'Większość roślin doniczkowych wchodzi w fazę spowolnienia. Mniej wody, mniej światła, brak nawożenia, niższa temperatura w nocy.',
      icon: '🌒'
    },
    {
      title: 'Storczyki potrzebują chłodu',
      body: 'Phalaenopsis żeby zakwitł na zimę potrzebuje 2–3 tygodni z różnicą 8°C między dniem a nocą. Postaw przy oknie.',
      icon: '🌸'
    },
    {
      title: 'Kaktusy do zimowania',
      body: 'Kaktusy zimują w 5–10°C, prawie bez wody. Zimowy spoczynek jest WARUNKIEM kwitnienia wiosną.',
      icon: '🌵'
    }
  ],
  10: [ // listopad
    {
      title: 'Krytyczny czas dla światłolubów',
      body: 'Bardzo krótki dzień. Przesuń wymagające światła rośliny (Strelitzia, Fikus, Bananowiec) najbliżej okien.',
      icon: '🪟'
    },
    {
      title: 'Suche powietrze nadchodzi',
      body: 'Włącza się ogrzewanie. Kup higrometr (~30 zł), sprawdzaj wilgotność. Poniżej 40% to alarm dla tropików.',
      icon: '💨'
    },
    {
      title: 'Sprawdź rośliny pod przelewanie',
      body: 'Listopad to miesiąc kiedy najwięcej rosin ginie z powodu nawyków letnich. Wolniejszy wzrost = mniej wody. Nie podlewaj rutynowo.',
      icon: '⚠️'
    }
  ],
  11: [ // grudzień
    {
      title: 'Gwiazdy Betlejemskie',
      body: 'Poinsecje (Euphorbia pulcherrima) lubią 18–22°C, jasne miejsce, ale BEZ przeciągów. Zwiędnięcie po tygodniu = był przeciąg.',
      icon: '🎄'
    },
    {
      title: 'Podlewaj minimalnie',
      body: 'W grudniu większość roślin możesz podlewać raz na 2–3 tygodnie. Wyjątek to kwitnące świąteczne i te w bardzo ciepłych pokojach.',
      icon: '💧'
    },
    {
      title: 'Choinka żywa? Pamiętaj o wodzie',
      body: 'Jeśli masz cięte drzewko w wodzie — sprawdzaj poziom codziennie, jodła pije zaskakująco dużo. Pusta podstawa = sucha igliwie w 2 dni.',
      icon: '🌲'
    }
  ]
};

/**
 * Zwraca poradę na dziś.
 * Algorytm: weź miesiąc, weź dzień miesiąca, wybierz poradę numer (dzień % 3).
 * Dzięki temu trzy porady danego miesiąca rotują co dzień.
 */
export function getTodayTip(date = new Date()) {
  const month = date.getMonth();
  const day = date.getDate();
  const monthTips = TIPS[month] || TIPS[0];
  return monthTips[day % monthTips.length];
}

/** Wszystkie porady danego miesiąca */
export function getMonthTips(monthIndex) {
  return TIPS[monthIndex] || [];
}
