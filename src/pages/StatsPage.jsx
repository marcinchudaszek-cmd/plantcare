import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore.js';
import plantsDB from '../data/plants.json';
import { CATEGORIES } from '../data/categories.js';
import { calculateStats, formatDays } from '../lib/stats.js';

export default function StatsPage() {
  const navigate = useNavigate();
  const plants = useAppStore((s) => s.plants);
  const stats = calculateStats(plants, plantsDB);

  return (
    <div className="px-5 pt-6">
      {/* Header */}
      <header className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate(-1)}
          className="w-9 h-9 rounded-full bg-surface flex items-center justify-center"
          aria-label="Wróć"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-2xl text-primary m-0">Statystyki</h1>
      </header>

      {plants.length === 0 ? (
        <div className="card text-center py-12">
          <div className="text-4xl mb-3">📊</div>
          <p className="text-sm text-muted m-0">
            Dodaj rośliny żeby zobaczyć statystyki swojej kolekcji.
          </p>
        </div>
      ) : (
        <>
          {/* Główne liczby */}
          <div className="grid grid-cols-2 gap-2 mb-3">
            <BigStat icon="🌿" value={stats.total} label="roślin" />
            <BigStat icon="📓" value={stats.totalEntries} label="wpisów dziennika" />
            <BigStat icon="📷" value={stats.totalPhotos} label="zdjęć" />
            <BigStat icon="🏷️" value={stats.totalTags} label="tagów" />
          </div>

          {/* Najstarsza roślina */}
          {stats.oldest && (
            <div className="card mb-3">
              <p className="text-xs text-muted m-0 mb-1">Najdłużej w kolekcji</p>
              <p className="font-serif text-lg text-primary m-0 mb-1">{stats.oldest.name}</p>
              <p className="text-xs text-muted italic m-0 mb-2">{stats.oldest.species}</p>
              <p className="text-sm text-accent m-0">{formatDays(stats.oldestDays)}</p>
            </div>
          )}

          {/* Najwięcej wpisów */}
          {stats.mostJournaled && (stats.mostJournaled.journal?.length || 0) > 0 && (
            <div className="card mb-3">
              <p className="text-xs text-muted m-0 mb-1">Najwięcej wpisów</p>
              <p className="font-serif text-lg text-primary m-0 mb-1">{stats.mostJournaled.name}</p>
              <p className="text-sm text-accent m-0">
                {stats.mostJournaled.journal.length} wpisów
              </p>
            </div>
          )}

          {/* Kategorie */}
          {Object.keys(stats.byCategory).length > 0 && (
            <div className="card mb-3">
              <h2 className="text-sm text-primary font-medium m-0 mb-3">Według kategorii</h2>
              <div className="space-y-2">
                {Object.entries(stats.byCategory)
                  .sort((a, b) => b[1] - a[1])
                  .map(([cat, count]) => {
                    const meta = CATEGORIES[cat];
                    if (!meta) return null;
                    const pct = Math.round((count / stats.total) * 100);
                    return (
                      <div key={cat}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-secondary">
                            {meta.emoji} {meta.label}
                          </span>
                          <span className="text-xs text-muted">{count} ({pct}%)</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-deep overflow-hidden">
                          <div
                            className="h-full bg-accent"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {/* Średnie */}
          <div className="card mb-3">
            <h2 className="text-sm text-primary font-medium m-0 mb-3">Średnie</h2>
            <div className="space-y-2">
              <Row label="Wpisów na roślinę" value={(stats.totalEntries / stats.total).toFixed(1)} />
              <Row label="Zdjęć na roślinę" value={(stats.totalPhotos / stats.total).toFixed(1)} />
              <Row label="Tagów na roślinę" value={(stats.totalTags / stats.total).toFixed(1)} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function BigStat({ icon, value, label }) {
  return (
    <div className="card text-center">
      <div className="text-2xl mb-1">{icon}</div>
      <p className="text-2xl text-primary font-medium m-0 leading-none">{value}</p>
      <p className="text-xs text-muted mt-1 m-0">{label}</p>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between items-center py-1 border-t border-soft first:border-t-0 first:pt-0">
      <span className="text-xs text-muted">{label}</span>
      <span className="text-sm text-primary font-medium">{value}</span>
    </div>
  );
}
