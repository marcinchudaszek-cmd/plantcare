import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useT } from '../lib/i18n.js';
import PlantImage from '../components/PlantImage.jsx';
import { useSettingsStore } from '../store/useSettingsStore.js';
import plants from '../data/plants.json';
import { CATEGORY_LIST } from '../data/categories.js';
import { useAppStore } from '../store/useAppStore.js';

export default function EncyclopediaPage() {
  const t = useT();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const userPlants = useAppStore((s) => s.plants);

  // Mapa: ile każdego gatunku mam w kolekcji
  const ownedMap = useMemo(() => {
    const m = {};
    userPlants.forEach((p) => {
      if (p.encycId) m[p.encycId] = (m[p.encycId] || 0) + 1;
    });
    return m;
  }, [userPlants]);

  const filtered = useMemo(() => {
    let list = plants;
    if (filter !== 'all') {
      list = list.filter((p) => p.category.includes(filter));
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (p) => p.name.toLowerCase().includes(q) || p.species.toLowerCase().includes(q)
      );
    }
    return list;
  }, [search, filter]);

  return (
    <div className="px-5 pt-6">
      <h1 className="text-2xl text-primary mb-2">{t('encyclopedia.title')}</h1>
      <p className="text-xs text-muted mb-4">{t('encyclopedia.speciesCount', { n: plants.length })}</p>

      <input
        type="text"
        className="input mb-3"
        placeholder={t('encyclopedia.search')}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {/* Filtry */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-3 -mx-5 px-5 scrollbar-hide">
        <button
          onClick={() => setFilter('all')}
          className={`pill flex-shrink-0 ${filter === 'all' ? 'pill-on' : ''}`}
        >
          Wszystkie
        </button>
        {CATEGORY_LIST.map((c) => (
          <button
            key={c.key}
            onClick={() => setFilter(c.key)}
            className={`pill flex-shrink-0 ${filter === c.key ? 'pill-on' : ''}`}
          >
            {c.emoji} {c.label}
          </button>
        ))}
      </div>

      <p className="text-xs text-muted mb-3">{t('encyclopedia.results', { n: filtered.length })}</p>

      {/* Siatka kafelków */}
      {filtered.length === 0 ? (
        <p className="text-sm text-muted text-center py-10">
          {t('myPlants.noMatch')}
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {filtered.map((p) => (
            <EncycCard key={p.id} plant={p} owned={ownedMap[p.id] || 0} />
          ))}
        </div>
      )}
    </div>
  );
}

function EncycCard({ plant, owned }) {
  const diffLabel = { easy: 'Łatwa', medium: 'Średnia', hard: 'Trudna' }[plant.difficulty] || '';
  const diffColor = { easy: 'text-accent', medium: 'text-warning', hard: 'text-danger' }[plant.difficulty];
  const overrides = useSettingsStore((s) => s.encycPhotoOverrides);

  return (
    <Link
      to={`/encyclopedia/${plant.id}`}
      className="card flex flex-col gap-2 transition-colors relative !p-0 overflow-hidden"
    >
      {owned > 0 && (
        <span className="absolute top-2 right-2 z-10 w-6 h-6 rounded-full bg-accent text-xs font-medium flex items-center justify-center" style={{ color: 'var(--accent-text)' }}>
          {owned}
        </span>
      )}
      <PlantImage
        encycOverrideId={overrides[plant.id]}
        src={plant.image}
        emoji={plant.emoji}
        alt={plant.name}
        className="w-full aspect-square"
        emojiSize="text-5xl"
      />
      <div className="px-3 pt-1 pb-3">
        <p className="font-serif text-sm text-primary m-0 truncate">{plant.name}</p>
        <p className="text-xs text-muted italic m-0 truncate">{plant.species}</p>
        <p className={`text-xs m-0 mt-1 ${diffColor}`}>{diffLabel}</p>
      </div>
    </Link>
  );
}
