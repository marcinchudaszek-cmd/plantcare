import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useT } from '../lib/i18n.js';
import { useAppStore } from '../store/useAppStore.js';
import {
  daysSinceWatered,
  waterStatusLabel,
  waterState,
  effectiveInterval
} from '../lib/plantUtils.js';
import plantsDB from '../data/plants.json';
import PlantImage from '../components/PlantImage.jsx';
import PhotoUploader from '../components/PhotoUploader.jsx';
import { usePhoto } from '../hooks/usePhoto.js';
import { useSettingsStore } from '../store/useSettingsStore.js';

export default function PlantDetailPage() {
  const t = useT();
  const { id } = useParams();
  const navigate = useNavigate();

  const plant = useAppStore((s) => s.plants.find((p) => p.id === id));
  const waterPlant = useAppStore((s) => s.waterPlant);
  const removePlant = useAppStore((s) => s.removePlant);
  const addJournalEntry = useAppStore((s) => s.addJournalEntry);
  const removeJournalEntry = useAppStore((s) => s.removeJournalEntry);
  const setPlantTags = useAppStore((s) => s.setPlantTags);
  const updatePlant = useAppStore((s) => s.updatePlant);
  const addPlantPhoto = useAppStore((s) => s.addPlantPhoto);
  const removePlantPhoto = useAppStore((s) => s.removePlantPhoto);
  const setPlantCover = useAppStore((s) => s.setPlantCover);
  const overrides = useSettingsStore((s) => s.encycPhotoOverrides);

  const [journalText, setJournalText] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [showDelete, setShowDelete] = useState(false);

  if (!plant) {
    return (
      <div className="px-5 pt-6">
        <p className="text-sm text-muted mb-4">{t('plantDetail.notFound')}</p>
        <Link to="/plants" className="btn btn-secondary inline-flex">← Wróć</Link>
      </div>
    );
  }

  // Wpis z encyklopedii (dla opisu, fun-factów, chorób)
  const encyc = plantsDB.find((p) => p.id === plant.encycId);

  const state = waterState(plant);
  const daysSince = daysSinceWatered(plant);

  const handleAddJournal = () => {
    if (!journalText.trim()) return;
    addJournalEntry(plant.id, journalText.trim());
    setJournalText('');
  };

  const handleAddTag = () => {
    const t = tagInput.trim().replace(/^#/, '').toLowerCase();
    if (!t) return;
    if ((plant.tags || []).includes(t)) {
      setTagInput('');
      return;
    }
    setPlantTags(plant.id, [...(plant.tags || []), t]);
    setTagInput('');
  };

  const handleRemoveTag = (t) => {
    setPlantTags(plant.id, (plant.tags || []).filter((x) => x !== t));
  };

  const handleDelete = () => {
    removePlant(plant.id);
    navigate('/plants');
  };

  return (
    <div className="px-5 pt-6">
      {/* Header z back */}
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
        <button
          onClick={() => setShowDelete((v) => !v)}
          className="w-9 h-9 rounded-full bg-surface flex items-center justify-center text-muted"
          aria-label="Więcej"
        >
          ⋯
        </button>
      </header>

      {/* Cover */}
      <PlantImage
        userPhotoId={plant.coverPhotoId}
        encycOverrideId={overrides[plant.encycId]}
        src={encyc?.image}
        emoji={plant.emoji}
        alt={plant.name}
        className="h-40 rounded-xl mb-3"
        emojiSize="text-6xl"
      />

      {/* Nazwa */}
      <h1 className="text-2xl text-primary m-0 leading-tight">{plant.name}</h1>
      <p className="text-xs text-muted italic mt-1 mb-3">{plant.species}</p>

      {/* Pills (kategorie z encyklopedii + tagi użytkownika) */}
      <div className="flex flex-wrap gap-2 mb-4">
        {encyc?.difficulty && (
          <span className="pill pill-on">
            {encyc.difficulty === 'easy' ? 'Łatwa' : encyc.difficulty === 'medium' ? 'Średnia' : 'Trudna'}
          </span>
        )}
        {encyc?.care?.light && (
          <span className="pill">{encyc.care.light.split(',')[0]}</span>
        )}
        {encyc?.care?.temperature && (
          <span className="pill">{encyc.care.temperature}</span>
        )}
        {(plant.tags || []).map((t) => (
          <button
            key={t}
            onClick={() => handleRemoveTag(t)}
            className="pill pill-on"
            title="Kliknij żeby usunąć"
          >
            #{t} ✕
          </button>
        ))}
      </div>

      {/* CTA Podlej */}
      <button
        onClick={() => waterPlant(plant.id)}
        className="w-full bg-accent rounded-lg p-4 flex items-center justify-between mb-4 active:scale-[0.99] transition-transform"
      >
        <div className="text-left">
          <p className="text-base font-medium m-0">{t('plantDetail.waterNow')}</p>
          <p className="text-xs text-muted m-0 mt-0.5">{waterStatusLabel(plant)}</p>
        </div>
        <div className="w-10 h-10 rounded-full bg-deep flex items-center justify-center">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="#7dd66f">
            <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
          </svg>
        </div>
      </button>

      {/* Mini-staty */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        <MiniStat label={t('plantDetail.lastWatered')} value={plant.lastWatered ? `${daysSince} dni temu` : 'Nigdy'} />
        <MiniStat label={t('plantDetail.cycle')} value={`Co ${plant.interval} dni`} />
        <MiniStat label={t('plantDetail.entries')} value={(plant.journal || []).length} />
        <MiniStat label={t('plantDetail.location')} value={plant.location || '—'} />
      </div>

      {/* Galeria zdjęć */}
      <div className="card mb-4">
        <div className="flex items-baseline justify-between mb-3">
          <h2 className="text-sm text-primary font-medium m-0">📸 Galeria</h2>
          <span className="text-xs text-muted">{(plant.photos || []).length}</span>
        </div>

        {(plant.photos || []).length === 0 ? (
          <p className="text-xs text-muted text-center mb-3">Brak własnych zdjęć</p>
        ) : (
          <div className="grid grid-cols-3 gap-2 mb-3">
            {plant.photos.map((photoId) => (
              <GalleryThumb
                key={photoId}
                photoId={photoId}
                isCover={plant.coverPhotoId === photoId}
                onSetCover={() => setPlantCover(plant.id, photoId)}
                onRemove={() => removePlantPhoto(plant.id, photoId)}
              />
            ))}
          </div>
        )}

        <PhotoUploader
          onUpload={(file) => addPlantPhoto(plant.id, file)}
          label="📷 Dodaj zdjęcie"
          variant="secondary"
          className="w-full"
        />
      </div>

      {/* Edycja interwału */}
      <div className="card mb-4">
        <p className="text-xs text-muted mb-2">{t('plantDetail.intervalSlider')}</p>
        <input
          type="range"
          min="1"
          max="30"
          step="1"
          value={plant.interval}
          onChange={(e) => updatePlant(plant.id, { interval: Number(e.target.value) })}
          className="w-full accent-accent"
        />
        <p className="text-xs text-primary m-0 text-center mt-1">co {plant.interval} {plant.interval === 1 ? 'dzień' : 'dni'}</p>

        <div className="border-t border-soft mt-3 pt-3">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={!!plant.smartInterval}
              onChange={(e) => updatePlant(plant.id, { smartInterval: e.target.checked })}
              className="mt-0.5 accent-accent"
            />
            <span className="flex-1 min-w-0">
              <span className="text-sm text-primary block">Smart-interwał</span>
              <span className="text-xs text-muted block">Aplikacja sama dostosuje częstość do sezonu (zima rzadziej, lato częściej)</span>
            </span>
          </label>
          {plant.smartInterval && encyc && (
            <p className="text-xs text-accent mt-2 m-0">
              Obecnie: co {effectiveInterval(plant, encyc)} {effectiveInterval(plant, encyc) === 1 ? 'dzień' : 'dni'}
            </p>
          )}
        </div>
      </div>

      {/* Tagi — input */}
      <div className="card mb-4">
        <p className="text-xs text-muted mb-2">{t('plantDetail.addTag')}</p>
        <div className="flex gap-2">
          <input
            type="text"
            className="input flex-1"
            placeholder={t('plantDetail.tagPlaceholder')}
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
          />
          <button onClick={handleAddTag} className="btn btn-secondary">+</button>
        </div>
      </div>

      {/* Dziennik */}
      <div className="card mb-4">
        <div className="flex items-baseline justify-between mb-3">
          <h2 className="text-sm text-primary font-medium m-0">{t('plantDetail.journal')}</h2>
          <span className="text-xs text-muted">{(plant.journal || []).length}</span>
        </div>

        <textarea
          className="input mb-2"
          rows="2"
          placeholder={t('plantDetail.journalPlaceholder')}
          value={journalText}
          onChange={(e) => setJournalText(e.target.value)}
        />
        <button onClick={handleAddJournal} className="btn btn-primary w-full mb-4" disabled={!journalText.trim()}>
          Dodaj wpis
        </button>

        {(plant.journal || []).length === 0 ? (
          <p className="text-xs text-muted text-center m-0">{t('plantDetail.noEntries')}</p>
        ) : (
          <div className="space-y-2">
            {(plant.journal || []).map((entry) => (
              <JournalEntry
                key={entry.id}
                entry={entry}
                onDelete={() => removeJournalEntry(plant.id, entry.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Opis z encyklopedii */}
      {encyc?.description && (
        <div className="card mb-4">
          <h2 className="text-sm text-primary font-medium m-0 mb-2">{t('plantDetail.about')}</h2>
          <p className="text-sm text-secondary leading-relaxed m-0">{encyc.description}</p>
        </div>
      )}

      {/* Akcja niebezpieczna */}
      {showDelete && (
        <div className="card mb-4">
          <p className="text-sm text-primary mb-3">{t('plantDetail.deleteConfirm')}</p>
          <div className="flex gap-2">
            <button onClick={() => setShowDelete(false)} className="btn btn-secondary flex-1">{t('common.cancel')}</button>
            <button onClick={handleDelete} className="btn flex-1">{t('common.delete')}</button>
          </div>
        </div>
      )}
    </div>
  );
}

function GalleryThumb({ photoId, isCover, onSetCover, onRemove }) {
  const url = usePhoto(photoId);
  const [confirming, setConfirming] = useState(false);

  return (
    <div className="relative aspect-square rounded-md overflow-hidden bg-deep group">
      {url ? (
        <img src={url} alt="" className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-muted text-xs">…</div>
      )}

      {isCover && (
        <span className="absolute top-1 left-1 bg-accent text-xs px-1.5 py-0.5 rounded" style={{ color: 'var(--accent-text)' }}>
          ★
        </span>
      )}

      <div className="absolute bottom-1 right-1 flex gap-1">
        {!isCover && (
          <button
            type="button"
            onClick={onSetCover}
            className="w-6 h-6 rounded-full bg-app/80 text-xs flex items-center justify-center"
            title="Ustaw jako główne"
          >
            ★
          </button>
        )}
        <button
          type="button"
          onClick={() => confirming ? onRemove() : setConfirming(true)}
          onBlur={() => setConfirming(false)}
          className="w-6 h-6 rounded-full bg-app/80 text-xs flex items-center justify-center"
          title={confirming ? 'Kliknij ponownie żeby potwierdzić' : 'Usuń'}
          style={confirming ? { backgroundColor: 'var(--danger)', color: 'var(--accent-text)' } : undefined}
        >
          ✕
        </button>
      </div>
    </div>
  );
}

function MiniStat({ label, value }) {
  return (
    <div className="bg-surface border border-soft rounded-md p-3">
      <p className="text-xs text-muted m-0 mb-1">{label}</p>
      <p className="text-sm text-primary font-medium m-0 truncate">{value}</p>
    </div>
  );
}

function JournalEntry({ entry, onDelete }) {
  const date = new Date(entry.date);
  const dateStr = date.toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' });

  return (
    <div className="flex gap-3 py-2 border-t border-soft">
      <span className="text-xs text-muted min-w-[44px] pt-0.5">{dateStr}</span>
      <p className="text-xs text-primary leading-relaxed m-0 flex-1">{entry.text}</p>
      <button
        onClick={onDelete}
        className="text-muted hover:text-danger text-xs"
        aria-label="Usuń wpis"
      >
        ✕
      </button>
    </div>
  );
}
