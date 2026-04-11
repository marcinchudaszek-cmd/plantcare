import { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore.js';
import plantsDB from '../data/plants.json';
import { getMonthSchedule, monthName, isToday } from '../lib/calendar.js';
import Sheet from '../components/Sheet.jsx';

export default function CalendarPage() {
  const navigate = useNavigate();
  const plants = useAppStore((s) => s.plants);

  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selectedDay, setSelectedDay] = useState(null);

  const schedule = useMemo(
    () => getMonthSchedule(year, month, plants, plantsDB),
    [year, month, plants]
  );

  // Pierwszy dzień miesiąca — dzień tygodnia (poniedziałek = 0)
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const offset = (firstDayOfMonth + 6) % 7; // przesunięcie tak żeby Pn=0

  const goPrev = () => {
    if (month === 0) {
      setMonth(11);
      setYear(year - 1);
    } else {
      setMonth(month - 1);
    }
  };
  const goNext = () => {
    if (month === 11) {
      setMonth(0);
      setYear(year + 1);
    } else {
      setMonth(month + 1);
    }
  };
  const goToday = () => {
    setYear(today.getFullYear());
    setMonth(today.getMonth());
  };

  const selectedSchedule = selectedDay !== null ? schedule[selectedDay - 1] : null;

  return (
    <div className="px-5 pt-6">
      <header className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate(-1)}
          className="w-9 h-9 rounded-full bg-surface flex items-center justify-center"
          aria-label="Wroc"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-2xl text-primary m-0">Kalendarz</h1>
      </header>

      {plants.length === 0 ? (
        <div className="card text-center py-12">
          <div className="text-4xl mb-3">📅</div>
          <p className="text-sm text-muted m-0">
            Dodaj rośliny żeby zobaczyć kalendarz podlewania.
          </p>
        </div>
      ) : (
        <>
          {/* Nagłówek miesiąca */}
          <div className="card mb-3 flex items-center justify-between">
            <button onClick={goPrev} className="w-9 h-9 rounded-full bg-deep flex items-center justify-center text-primary">
              ‹
            </button>
            <div className="text-center">
              <p className="font-serif text-lg text-primary m-0 capitalize">{monthName(month)}</p>
              <p className="text-xs text-muted m-0">{year}</p>
            </div>
            <button onClick={goNext} className="w-9 h-9 rounded-full bg-deep flex items-center justify-center text-primary">
              ›
            </button>
          </div>

          {/* Siatka */}
          <div className="card mb-3">
            {/* Dni tygodnia */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {['Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'So', 'Nd'].map((d) => (
                <div key={d} className="text-center text-xs text-muted">
                  {d}
                </div>
              ))}
            </div>

            {/* Dni miesiąca */}
            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: offset }).map((_, i) => (
                <div key={`empty-${i}`} />
              ))}
              {schedule.map(({ day, plants: dayPlants }) => {
                const isCurrentDay = isToday(year, month, day);
                const hasPlants = dayPlants.length > 0;

                return (
                  <button
                    key={day}
                    onClick={() => setSelectedDay(day)}
                    className={`aspect-square rounded-md flex flex-col items-center justify-center text-xs transition-colors ${
                      isCurrentDay
                        ? 'bg-accent text-white font-medium'
                        : hasPlants
                          ? 'bg-deep text-primary'
                          : 'text-muted hover:bg-deep'
                    }`}
                    style={isCurrentDay ? { color: 'var(--accent-text)' } : undefined}
                  >
                    <span>{day}</span>
                    {hasPlants && (
                      <span
                        className="w-1 h-1 rounded-full mt-0.5"
                        style={{
                          backgroundColor: isCurrentDay ? 'var(--accent-text)' : 'var(--accent)'
                        }}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Przycisk "dzisiaj" */}
          <button onClick={goToday} className="btn btn-secondary w-full mb-3">
            Skocz do dziś
          </button>

          {/* Legenda */}
          <div className="card">
            <p className="text-xs text-muted m-0 mb-2">Legenda</p>
            <div className="space-y-1.5 text-xs text-secondary">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-md bg-accent" />
                <span>Dzisiaj</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-md bg-deep flex items-center justify-center">
                  <span className="w-1 h-1 rounded-full" style={{ backgroundColor: 'var(--accent)' }} />
                </div>
                <span>Dzień z planowanymi podlewaniami</span>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Bottom sheet — szczegóły dnia */}
      <Sheet
        open={selectedDay !== null}
        onClose={() => setSelectedDay(null)}
        title={selectedDay ? `${selectedDay} ${monthName(month)}` : ''}
      >
        {selectedSchedule && selectedSchedule.plants.length === 0 ? (
          <div className="text-center py-6">
            <div className="text-3xl mb-2">💧</div>
            <p className="text-sm text-muted m-0">Tego dnia nic do podlania</p>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-xs text-muted m-0 mb-2">
              Roślin do podlania: {selectedSchedule?.plants.length}
            </p>
            {selectedSchedule?.plants.map((plant) => (
              <Link
                key={plant.id}
                to={`/plants/${plant.id}`}
                onClick={() => setSelectedDay(null)}
                className="flex items-center gap-3 bg-deep rounded-md p-3"
              >
                <span className="text-2xl">{plant.emoji}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-serif text-sm text-primary m-0 truncate">{plant.name}</p>
                  <p className="text-xs text-muted italic m-0 truncate">{plant.species}</p>
                </div>
                <span className="text-accent">→</span>
              </Link>
            ))}
          </div>
        )}
      </Sheet>
    </div>
  );
}
