import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore.js';
import { daysSinceWatered, needsWater } from '../lib/plantUtils.js';
import { useT } from '../lib/i18n.js';
import PlantCard from '../components/PlantCard.jsx';
import Sheet from '../components/Sheet.jsx';

const SORT_KEYS = ['urgency', 'name', 'added'];
const EMOJI_CHOICES = ['🌿', '🪴', '🌱', '🌵', '🌸', '🌺', '🌴', '🍀', '🌻', '🌹'];

export default function MyPlantsPage() {
  const t = useT();
  const navigate = useNavigate();
  const SORT_OPTIONS = [
    { key: 'urgency', label: t('myPlants.sortUrgency') },
    { key: 'name',    label: t('myPlants.sortName') },
    { key: 'added',   label: t('myPlants.sortAdded') }
  ];
  const plants = useAppStore((s) => s.plants);
  const addCustomPlant = useAppStore((s) => s.addCustomPlant);
  const addPlantPhoto = useAppStore((s) => s.addPlantPhoto);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('urgency');
  const [tagFilter, setTagFilter] = useState(null);
  const [formOpen, setFormOpen] = useState(false);

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

  const handleCreate = async (fields, photoFile) => {
    const newPlant = addCustomPlant(fields);
    if (photoFile) {
      try { await addPlantPhoto(newPlant.id, photoFile); } catch { /* zdjęcie opcjonalne */ }
    }
    setFormOpen(false);
    navigate(`/plants/${newPlant.id}`);
  };

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
          <div className="flex flex-col gap-2 items-center">
            <Link to="/encyclopedia" className="btn btn-primary inline-flex">
              📚 {t('myPlants.pickFromDB')}
            </Link>
            <button onClick={() => setFormOpen(true)} className="btn btn-secondary inline-flex">
              ➕ Dodaj własną roślinę
            </button>
          </div>
        </div>

        <AddPlantSheet open={formOpen} onClose={() => setFormOpen(false)} onCreate={handleCreate} />
      </div>
    );
  }

  return (
    <div className="px-5 pt-6">
      <div className="flex items-baseline justify-between mb-4">
        <h1 className="text-2xl text-primary m-0">{t('myPlants.title')}</h1>
        <span className="text-xs text-muted">{plants.length}</span>
      </div>

      {/* Akcje dodawania */}
      <div className="flex gap-2 mb-3">
        <Link to="/encyclopedia" className="btn btn-secondary flex-1 justify-center">
          📚 Z bazy
        </Link>
        <button onClick={() => setFormOpen(true)} className="btn btn-primary flex-1 justify-center">
          ➕ Własna
        </button>
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

      <AddPlantSheet open={formOpen} onClose={() => setFormOpen(false)} onCreate={handleCreate} />
    </div>
  );
}

// === Formularz dodawania własnej rośliny ===
function AddPlantSheet({ open, onClose, onCreate }) {
  const [name, setName] = useState('');
  const [species, setSpecies] = useState('');
  const [emoji, setEmoji] = useState('🌿');
  const [location, setLocation] = useState('');
  const [interval, setInterval] = useState(7);
  const [photoFile, setPhotoFile] = useState(null);
  const [photoUrl, setPhotoUrl] = useState(null);
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setName(''); setSpecies(''); setEmoji('🌿'); setLocation('');
    setInterval(7); setPhotoFile(null);
    if (photoUrl) URL.revokeObjectURL(photoUrl);
    setPhotoUrl(null); setSaving(false);
  };

  const handleClose = () => { reset(); onClose(); };

  const handlePhoto = (e) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    if (photoUrl) URL.revokeObjectURL(photoUrl);
    setPhotoFile(f);
    setPhotoUrl(URL.createObjectURL(f));
  };

  const handleSubmit = async () => {
    if (saving) return;
    setSaving(true);
    await onCreate(
      { name, species, emoji, location, interval: Number(interval) || 7 },
      photoFile
    );
    reset();
  };

  return (
    <Sheet open={open} onClose={handleClose} title="Dodaj własną roślinę">
      <div className="space-y-4">
        {/* Zdjęcie (opcjonalne) */}
        <div>
          <label className="block text-xs text-muted mb-1">Zdjęcie (opcjonalne)</label>
          <div className="flex items-center gap-3">
            <div className="w-16 h-16 rounded-md bg-deep border border-soft overflow-hidden flex items-center justify-center text-2xl flex-shrink-0">
              {photoUrl ? (
                <img src={photoUrl} alt="" className="w-full h-full object-cover" />
              ) : (emoji || '🌿')}
            </div>
            <label className="btn btn-secondary cursor-pointer">
              🖼️ Wybierz zdjęcie
              <input type="file" accept="image/*" onChange={handlePhoto} className="hidden" />
            </label>
          </div>
        </div>

        {/* Nazwa */}
        <div>
          <label className="block text-xs text-muted mb-1">Nazwa *</label>
          <input
            type="text"
            className="input"
            placeholder="np. Stefan, Monstera z salonu"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        {/* Gatunek */}
        <div>
          <label className="block text-xs text-muted mb-1">Gatunek (opcjonalnie)</label>
          <input
            type="text"
            className="input"
            placeholder="np. Monstera deliciosa"
            value={species}
            onChange={(e) => setSpecies(e.target.value)}
          />
        </div>

        {/* Emoji */}
        <div>
          <label className="block text-xs text-muted mb-1">Ikona</label>
          <div className="flex flex-wrap gap-2">
            {EMOJI_CHOICES.map((em) => (
              <button
                key={em}
                type="button"
                onClick={() => setEmoji(em)}
                className={`w-9 h-9 rounded-md text-xl flex items-center justify-center border ${emoji === em ? 'border-strong bg-deep' : 'border-soft'}`}
              >
                {em}
              </button>
            ))}
          </div>
        </div>

        {/* Lokalizacja */}
        <div>
          <label className="block text-xs text-muted mb-1">Lokalizacja (opcjonalnie)</label>
          <input
            type="text"
            className="input"
            placeholder="np. salon, parapet kuchenny"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          />
        </div>

        {/* Interwał podlewania */}
        <div>
          <label className="block text-xs text-muted mb-1">Podlewanie co ile dni</label>
          <input
            type="number"
            min="1"
            max="120"
            className="input"
            value={interval}
            onChange={(e) => setInterval(e.target.value)}
          />
        </div>

        <button onClick={handleSubmit} disabled={saving} className="btn btn-primary w-full disabled:opacity-50">
          {saving ? '⏳ Zapisuję…' : 'Dodaj roślinę'}
        </button>
      </div>
    </Sheet>
  );
}
