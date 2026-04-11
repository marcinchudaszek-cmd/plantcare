import { Link } from 'react-router-dom';
import { waterState, waterStatusLabel } from '../lib/plantUtils.js';
import PlantImage from './PlantImage.jsx';
import plantsDB from '../data/plants.json';
import { useSettingsStore } from '../store/useSettingsStore.js';

export default function PlantCard({ plant }) {
  const state = waterState(plant);
  const overrides = useSettingsStore((s) => s.encycPhotoOverrides);

  const dotColors = {
    now:  'var(--accent)',
    late: 'var(--danger)',
    wait: 'var(--text-muted)'
  };

  const encyc = plantsDB.find((p) => p.id === plant.encycId);

  return (
    <Link to={`/plants/${plant.id}`} className="card flex flex-col gap-2 transition-colors !p-0 overflow-hidden relative">
      <span
        className="absolute top-2 right-2 z-10 w-3 h-3 rounded-full"
        style={{ backgroundColor: dotColors[state] }}
        title={waterStatusLabel(plant)}
      />

      <PlantImage
        userPhotoId={plant.coverPhotoId}
        encycOverrideId={overrides[plant.encycId]}
        src={encyc?.image}
        emoji={plant.emoji}
        alt={plant.name}
        className="w-full aspect-square"
        emojiSize="text-5xl"
      />

      <div className="px-3 pt-1 pb-3">
        <p className="font-serif text-base text-primary m-0 truncate">{plant.name}</p>
        <p className="text-xs text-muted italic m-0 truncate">{plant.species}</p>

        {plant.tags && plant.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {plant.tags.slice(0, 2).map((t) => (
              <span key={t} className="text-xs text-secondary">#{t}</span>
            ))}
          </div>
        )}

        <div className="text-xs text-muted mt-2">{waterStatusLabel(plant)}</div>
      </div>
    </Link>
  );
}
