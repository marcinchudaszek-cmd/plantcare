import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useT } from '../lib/i18n.js';
import plantsDB from '../data/plants.json';
import { useAppStore } from '../store/useAppStore.js';
import { defaultIntervalDays } from '../lib/plantUtils.js';
import { CATEGORIES } from '../data/categories.js';
import Sheet from '../components/Sheet.jsx';
import PlantImage from '../components/PlantImage.jsx';
import PhotoUploader from '../components/PhotoUploader.jsx';
import { useSettingsStore } from '../store/useSettingsStore.js';
import { savePhoto, deletePhoto, newPhotoId, compressImage } from '../lib/photoStore.js';
import { invalidatePhotoUrl } from '../hooks/usePhoto.js';

export default function EncyclopediaDetailPage() {
  const t = useT();
  const { id } = useParams();
  const navigate = useNavigate();
  const plant = plantsDB.find((p) => p.id === id);

  const userPlants = useAppStore((s) => s.plants);
  const addPlantFromEncyc = useAppStore((s) => s.addPlantFromEncyc);
  const overrides = useSettingsStore((s) => s.encycPhotoOverrides);
  const setOverride = useSettingsStore((s) => s.setEncycPhotoOverride);
  const removeOverride = useSettingsStore((s) => s.removeEncycPhotoOverride);

  const [sheetOpen, setSheetOpen] = useState(false);
  const [nickname, setNickname] = useState('');
  const [location, setLocation] = useState('');
  const [tagsInput, setTagsInput] = useState('');

  if (!plant) {
    return (
      <div className="px-5 pt-6">
        <p className="text-sm text-muted mb-4">Nie znaleziono rośliny o id „{id}".</p>
        <Link to="/encyclopedia" className="btn btn-secondary inline-flex">← Wróć do bazy</Link>
      </div>
    );
  }

  // Ile razy ten gatunek mam już w kolekcji?
  const ownedCount = userPlants.filter((p) => p.encycId === plant.id).length;

  const handleAdd = () => {
    const tags = tagsInput
      .split(',')
      .map((t) => t.trim().replace(/^#/, '').toLowerCase())
      .filter(Boolean);
    const newPlant = addPlantFromEncyc(plant, {
      nickname: nickname.trim() || null,
      location: location.trim(),
      tags
    });
    setSheetOpen(false);
    navigate(`/plants/${newPlant.id}`);
  };

  // Podmiana zdjęcia gatunku w encyklopedii — własne zamiast Wikimedia
  const handleEncycPhotoUpload = async (file) => {
    const blob = await compressImage(file, 1600);
    const photoId = newPhotoId('encyc');
    await savePhoto(photoId, blob);
    // Usuń stare jeśli było
    const oldId = overrides[plant.id];
    if (oldId) {
      await deletePhoto(oldId);
      invalidatePhotoUrl(oldId);
    }
    setOverride(plant.id, photoId);
  };

  const handleResetEncycPhoto = async () => {
    const oldId = overrides[plant.id];
    if (oldId) {
      await deletePhoto(oldId);
      invalidatePhotoUrl(oldId);
    }
    removeOverride(plant.id);
  };

  const diffLabel = { easy: 'Łatwa', medium: 'Średnia', hard: 'Trudna' }[plant.difficulty];
  const diffColor = { easy: 'text-accent', medium: 'text-warning', hard: 'text-danger' }[plant.difficulty];
  const intervalDays = defaultIntervalDays(plant.care);

  return (
    <div className="px-5 pt-6 pb-4">
      {/* Header */}
      <header className="flex items-center justify-between mb-4">
        <button
          onClick={() => navigate(-1)}
          className="w-9 h-9 rounded-full bg-surface flex items-center justify-center"
          aria-label="Wróć"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f0e5c8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </button>
        {ownedCount > 0 && (
          <span className="pill pill-on text-xs">
            ✓ Masz w kolekcji ({ownedCount})
          </span>
        )}
      </header>

      {/* Cover */}
      <div className="relative mb-4">
        <PlantImage
          encycOverrideId={overrides[plant.id]}
          src={plant.image}
          emoji={plant.emoji}
          alt={plant.name}
          className="h-48 rounded-xl"
          emojiSize="text-7xl"
        />
        <div className="absolute bottom-2 right-2 flex gap-2">
          <PhotoUploader
            onUpload={handleEncycPhotoUpload}
            label={overrides[plant.id] ? '🔁 Zmień' : '📷 Własne zdjęcie'}
            variant="secondary"
            className="text-xs px-3 py-2"
          />
          {overrides[plant.id] && (
            <button
              type="button"
              onClick={handleResetEncycPhoto}
              className="btn btn-secondary text-xs px-3 py-2"
              title="Przywróć domyślne zdjęcie"
            >
              ↺
            </button>
          )}
        </div>
      </div>

      {/* Nazwa */}
      <h1 className="text-2xl m-0 leading-tight" style={{ color: 'var(--text-primary)' }}>{plant.name}</h1>
      <p className="text-xs text-muted italic mt-1 mb-3">{plant.species}</p>

      {/* Pills (kategorie + difficulty) */}
      <div className="flex flex-wrap gap-2 mb-4">
        <span className={`pill pill-on ${diffColor}`}>{diffLabel}</span>
        {plant.category.map((c) => {
          const meta = CATEGORIES[c];
          if (!meta) return null;
          return (
            <span key={c} className="pill">
              {meta.emoji} {meta.label}
            </span>
          );
        })}
      </div>

      {/* CTA Dodaj */}
      <button
        onClick={() => setSheetOpen(true)}
        className="w-full bg-accent rounded-lg p-4 flex items-center justify-between mb-5 active:scale-[0.99] transition-transform"
      >
        <div className="text-left">
          <p className="text-base font-medium m-0">{t('encyclopedia.addToCollection')}</p>
          <p className="text-xs text-muted m-0 mt-0.5">
            {ownedCount > 0 ? `Masz już ${ownedCount} — dodaj kolejną` : 'Zacznij dbać o tę roślinę'}
          </p>
        </div>
        <div className="w-10 h-10 rounded-full bg-deep flex items-center justify-center text-xl">+</div>
      </button>

      {/* Opis */}
      <Section title={t('encyclopedia.about')}>
        <p className="text-sm text-secondary leading-relaxed m-0">{plant.description}</p>
      </Section>

      {/* Warunki uprawy */}
      <Section title={t('encyclopedia.care')}>
        <div className="grid grid-cols-2 gap-2">
          <CareCard icon="💧" label={t('encyclopedia.watering')} value={plant.care?.water} />
          <CareCard icon="☀️" label={t('encyclopedia.light')} value={plant.care?.light} />
          <CareCard icon="🌡️" label={t('encyclopedia.temperature')} value={plant.care?.temperature} />
          <CareCard icon="💨" label={t('encyclopedia.humidity')} value={plant.care?.humidity} />
        </div>
      </Section>

      {/* Info dodatkowe */}
      <Section title={t('encyclopedia.info')}>
        <InfoRow label={t('encyclopedia.origin')} value={plant.origin} />
        <InfoRow label={t('encyclopedia.maxHeight')} value={plant.maxHeight} />
        <InfoRow label={t('encyclopedia.toxic')} value={plant.toxic} />
      </Section>

      {/* Fun facts */}
      {plant.funFacts?.length > 0 && (
        <Section title={t('encyclopedia.facts')}>
          <ul className="space-y-2 m-0 list-none p-0">
            {plant.funFacts.map((f, i) => (
              <li key={i} className="text-sm text-secondary leading-relaxed flex gap-2">
                <span className="text-accent flex-shrink-0">•</span>
                <span>{f}</span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* Choroby */}
      {plant.diseases?.length > 0 && (
        <Section title={t('encyclopedia.diseases')}>
          <ul className="space-y-2 m-0 list-none p-0">
            {plant.diseases.map((d, i) => (
              <li key={i} className="text-sm text-secondary leading-relaxed flex gap-2">
                <span className="text-danger flex-shrink-0">⚠</span>
                <span>{d}</span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* Rozmnażanie */}
      {plant.propagation && (
        <Section title={t('encyclopedia.propagation')}>
          <p className="text-sm text-secondary leading-relaxed m-0">{plant.propagation}</p>
        </Section>
      )}

      {/* === Sheet: Dodaj do kolekcji === */}
      <Sheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title={`Dodaj: ${plant.name}`}
      >
        <div className="space-y-4">
          <div>
            <label className="text-xs text-muted mb-1.5 block">Własna nazwa (opcjonalnie)</label>
            <input
              type="text"
              className="input"
              placeholder={`np. „Stefan", „Monstera w salonie"`}
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
            />
            <p className="text-xs text-muted mt-1">
              Pusto = użyje „{plant.name}"
            </p>
          </div>

          <div>
            <label className="text-xs text-muted mb-1.5 block">Lokalizacja</label>
            <input
              type="text"
              className="input"
              placeholder="np. salon, sypialnia, parapet kuchenny"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </div>

          <div>
            <label className="text-xs text-muted mb-1.5 block">Tagi (oddziel przecinkami)</label>
            <input
              type="text"
              className="input"
              placeholder="np. salon, prezent, rzadko podlewane"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
            />
          </div>

          <div className="card">
            <p className="text-xs text-muted m-0 mb-1">Domyślny interwał podlewania</p>
            <p className="text-base text-accent font-medium m-0">co {intervalDays} dni</p>
            <p className="text-xs text-muted m-0 mt-1">Zmienisz później na ekranie szczegółów</p>
          </div>

          <button onClick={handleAdd} className="btn btn-primary w-full">
            Dodaj do kolekcji
          </button>
        </div>
      </Sheet>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <section className="card mb-3">
      <h2 className="text-sm text-primary font-medium m-0 mb-3">{title}</h2>
      {children}
    </section>
  );
}

function CareCard({ icon, label, value }) {
  if (!value) return null;
  return (
    <div className="bg-deep rounded-md p-3 border border-soft">
      <div className="text-lg mb-1">{icon}</div>
      <p className="text-xs text-muted m-0 mb-1">{label}</p>
      <p className="text-xs text-primary leading-snug m-0">{value}</p>
    </div>
  );
}

function InfoRow({ label, value }) {
  if (!value) return null;
  return (
    <div className="flex justify-between gap-3 py-2 border-t border-soft first:border-t-0 first:pt-0">
      <span className="text-xs text-muted flex-shrink-0">{label}</span>
      <span className="text-xs text-primary text-right">{value}</span>
    </div>
  );
}
