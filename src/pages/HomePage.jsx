import { Link } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore.js';
import { needsWater, waterState, waterStatusLabel, daysSinceWatered } from '../lib/plantUtils.js';
import { useT } from '../lib/i18n.js';
import PlantImage from '../components/PlantImage.jsx';
import plantsDB from '../data/plants.json';
import { useSettingsStore } from '../store/useSettingsStore.js';

export default function HomePage() {
  const t = useT();
  const plants = useAppStore((s) => s.plants);
  const waterPlant = useAppStore((s) => s.waterPlant);

  const stats = {
    total: plants.length,
    toWater: plants.filter(needsWater).length,
    journal: plants.reduce((sum, p) => sum + (p.journal?.length || 0), 0)
  };

  const sorted = [...plants].sort((a, b) => daysSinceWatered(b) - daysSinceWatered(a));
  const today = sorted.slice(0, 5);

  // Hero text z accentem
  const heroText = () => {
    if (stats.total === 0) {
      const accent = <span className="text-accent">{t('home.addFirst')}</span>;
      return <>Twoja kolekcja jest pusta. {accent}.</>;
    }
    if (stats.toWater === 0) {
      const accent = <span className="text-accent">{t('home.goodJob')}</span>;
      return <>{t('home.allDone').replace('{accent}.', '').trim()} {accent}.</>;
    }
    const count = stats.toWater === 1
      ? t('home.onePlant')
      : t('home.manyPlants', { n: stats.toWater });
    const accent = <span className="text-accent">{count}</span>;
    return <>Podlej {accent} i&nbsp;zaktualizuj dziennik.</>;
  };

  return (
    <div className="px-5 pt-6">
      {/* Header */}
      <header className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-elevated flex items-center justify-center text-primary font-medium">
            M
          </div>
          <div>
            <p className="text-xs text-muted mb-0.5">{t('home.greet')}</p>
            <h1 className="text-lg text-primary m-0">Marcin</h1>
          </div>
        </div>
        <Link to="/settings" className="w-9 h-9 rounded-full bg-surface flex items-center justify-center">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </Link>
      </header>

      {/* Hero card */}
      <section className="card mb-4">
        <p className="text-xs text-muted mb-1.5">{t('home.today')}</p>
        <p className="font-serif text-lg text-primary leading-snug m-0">{heroText()}</p>
      </section>

      {/* Stats */}
      <section className="grid grid-cols-3 gap-2 mb-6">
        <div className="stat">
          <p className="text-xl text-primary font-medium m-0">{stats.total}</p>
          <p className="text-xs text-muted mt-1 m-0">{t('home.plants')}</p>
        </div>
        <div className="stat">
          <p className={`text-xl font-medium m-0 ${stats.toWater > 0 ? 'text-danger' : 'text-primary'}`}>{stats.toWater}</p>
          <p className="text-xs text-muted mt-1 m-0">{t('home.toWater')}</p>
        </div>
        <div className="stat">
          <p className="text-xl text-primary font-medium m-0">{stats.journal}</p>
          <p className="text-xs text-muted mt-1 m-0">{t('home.entries')}</p>
        </div>
      </section>

      {/* Lista */}
      <section>
        <div className="flex items-baseline justify-between mb-3">
          <h2 className="text-sm text-primary font-medium m-0">{t('home.yourPlants')}</h2>
          {plants.length > 5 && (
            <Link to="/plants" className="text-xs text-accent">{t('home.showAll')}</Link>
          )}
        </div>

        {plants.length === 0 ? (
          <div className="card text-center py-10">
            <div className="text-3xl mb-2">🌱</div>
            <p className="text-sm text-muted m-0 mb-4">{t('home.nothingHere')}</p>
            <Link to="/encyclopedia" className="btn btn-primary inline-flex">
              📚 {t('home.pickFromDB')}
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {today.map((p) => (
              <PlantRow key={p.id} plant={p} onWater={() => waterPlant(p.id)} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function PlantRow({ plant, onWater }) {
  const state = waterState(plant);
  const label = waterStatusLabel(plant);
  const encyc = plantsDB.find((p) => p.id === plant.encycId);
  const overrides = useSettingsStore((s) => s.encycPhotoOverrides);

  // Inline kolory używające zmiennych motywu (różnie wyglądają w light/dark)
  const styles = {
    now:  { backgroundColor: 'var(--accent)',   color: 'var(--accent-text)' },
    late: { backgroundColor: 'var(--danger)',   color: 'var(--accent-text)' },
    wait: { backgroundColor: 'var(--bg-elevated)', color: 'var(--text-muted)' }
  };

  return (
    <div className="flex items-center gap-3 card p-3">
      <Link to={`/plants/${plant.id}`} className="flex items-center gap-3 flex-1 min-w-0">
        <PlantImage
          userPhotoId={plant.coverPhotoId}
          encycOverrideId={overrides[plant.encycId]}
          src={encyc?.image}
          emoji={plant.emoji}
          alt={plant.name}
          className="w-12 h-12 rounded-md flex-shrink-0"
          emojiSize="text-xl"
        />
        <div className="flex-1 min-w-0">
          <p className="font-serif text-sm text-primary m-0 truncate">{plant.name}</p>
          <p className="text-xs text-muted m-0 truncate">{label}</p>
        </div>
      </Link>
      <button
        onClick={(e) => { e.stopPropagation(); onWater(); }}
        className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-transform active:scale-90"
        style={styles[state]}
        aria-label="Podlej"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
        </svg>
      </button>
    </div>
  );
}
