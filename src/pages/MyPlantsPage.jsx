import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore.js';
import { daysSinceWatered, needsWater } from '../lib/plantUtils.js';
import { useT } from '../lib/i18n.js';
import PlantCard from '../components/PlantCard.jsx';

const SORT_KEYS = ['urgency', 'name', 'added'];

export default function MyPlantsPage() {
  const t = useT();
  const SORT_OPTIONS = [
    { key: 'urgency', label: t('myPlants.sortUrgency') },
    { key: 'name',    label: t('myPlants.sortName') },
    { key: 'added',   label: t('myPlants.sortAdded') }
  ];
  const plants = useAppStore((s) => s.plants);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('urgency');
  const [tagFilter, setTagFilter] = useState(null);

  // Wszystkie unikalne tagi z roślin
  const allTags = useMemo(() => {
    const set = new Set();
    plants.forEach((p) => (p.tags || []).forEach((t) => set.add(t)));
    return Array.from(set).sort();
  }, [plants]);

  // Filtr + sort
  const filtered = useMemo(() => {
    let list = plants;

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.species.toLowerCase().includes(q) ||
          (p.location || '').toLowerCase().includes(q)
      );
    }

    if (tagFilter) {
      list = list.filter((p) => (p.tags || []).includes(tagFilter));
    }

    const sorted = [...list];
    if (sort === 'urgency') {
      sorted.sort((a, b) => daysSinceWatered(b) - daysSinceWatered(a));
    } else if (sort === 'name') {
      sorted.sort((a, b) => a.name.localeCompare(b.name, 'pl'));
    } else if (sort === 'added') {
      sorted.sort((a, b) => new Date(b.addedAt) - new Date(a.addedAt));
    }
    return sorted;
  }, [plants, search, sort, tagFilter]);

  // Pusty stan
  if (plants.length === 0) {
    return (
      <div className="px-5 pt-6">
        <h1 className="text-2xl text-primary mb-2">{t('myPlants.title')}</h1>
        <div className="card text-center py-12 mt-6">
          <div className="text-4xl mb-3">🌱</div>
          <p className="text-sm text-muted m-0 mb-4">
            {t('myPlants.empty')}
          </p>
          <Link to="/encyclopedia" className="btn btn-primary inline-flex">
            📚 {t('myPlants.pickFromDB')}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="px-5 pt-6">
      <div className="flex items-baseline justify-between mb-4">
        <h1 className="text-2xl text-primary m-0">{t('myPlants.title')}</h1>
        <span className="text-xs text-muted">{plants.length}</span>
      </div>

      {/* Wyszukiwarka */}
      <input
        type="text"
        className="input mb-3"
        placeholder={t('myPlants.search')}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {/* Sortowanie */}
      <div className="flex gap-2 mb-3">
        {SORT_OPTIONS.map((opt) => (
          <button
            key={opt.key}
            onClick={() => setSort(opt.key)}
            className={`pill ${sort === opt.key ? 'pill-on' : ''}`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Tagi (jeśli są) */}
      {allTags.length > 0 && (
        <div className="flex gap-2 mb-4 flex-wrap">
          <button
            onClick={() => setTagFilter(null)}
            className={`pill ${tagFilter === null ? 'pill-on' : ''}`}
          >
            {t('myPlants.all')}
          </button>
          {allTags.map((t) => (
            <button
              key={t}
              onClick={() => setTagFilter(t)}
              className={`pill ${tagFilter === t ? 'pill-on' : ''}`}
            >
              #{t}
            </button>
          ))}
        </div>
      )}

      {/* Siatka */}
      {filtered.length === 0 ? (
        <p className="text-sm text-muted text-center py-8">
          {t('myPlants.noMatch')}
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {filtered.map((p) => (
            <PlantCard key={p.id} plant={p} />
          ))}
        </div>
      )}
    </div>
  );
}
