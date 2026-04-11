import { useState } from 'react';
import { usePhoto } from '../hooks/usePhoto.js';

/**
 * Wyswietla pozioma os czasu z miniaturkami zdjec rosliny.
 * Klik w miniature otwiera modal z duzym zdjeciem.
 *
 * Props:
 *   plant — { photos: [photoId], photoMeta: { [photoId]: { addedAt } } }
 */
export default function GrowthTimeline({ plant }) {
  const [openPhotoId, setOpenPhotoId] = useState(null);

  const photos = plant.photos || [];
  const meta = plant.photoMeta || {};

  if (photos.length === 0) {
    return null;
  }

  // Sortuj po dacie dodania (najstarsze pierwsze).
  // Stare zdjecia bez photoMeta dostaja date 0 - czyli na poczatku.
  const sorted = [...photos].sort((a, b) => {
    const aTime = meta[a]?.addedAt ? new Date(meta[a].addedAt).getTime() : 0;
    const bTime = meta[b]?.addedAt ? new Date(meta[b].addedAt).getTime() : 0;
    return aTime - bTime;
  });

  return (
    <div className="card mb-4">
      <div className="flex items-baseline justify-between mb-3">
        <h2 className="text-sm text-primary font-medium m-0">📈 Wzrost w czasie</h2>
        <span className="text-xs text-muted">{photos.length} {photos.length === 1 ? 'zdjęcie' : 'zdjęć'}</span>
      </div>

      <div className="overflow-x-auto -mx-4 px-4 pb-2">
        <div className="flex gap-3" style={{ minWidth: 'max-content' }}>
          {sorted.map((photoId, idx) => (
            <TimelineItem
              key={photoId}
              photoId={photoId}
              addedAt={meta[photoId]?.addedAt}
              index={idx}
              isLast={idx === sorted.length - 1}
              onClick={() => setOpenPhotoId(photoId)}
            />
          ))}
        </div>
      </div>

      {openPhotoId && (
        <PhotoModal photoId={openPhotoId} addedAt={meta[openPhotoId]?.addedAt} onClose={() => setOpenPhotoId(null)} />
      )}
    </div>
  );
}

function TimelineItem({ photoId, addedAt, index, isLast, onClick }) {
  const url = usePhoto(photoId);

  const dateLabel = addedAt
    ? new Date(addedAt).toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' })
    : '—';
  const yearLabel = addedAt
    ? new Date(addedAt).toLocaleDateString('pl-PL', { year: 'numeric' })
    : '';

  return (
    <button onClick={onClick} className="flex flex-col items-center gap-1 flex-shrink-0">
      <div className="w-20 h-20 rounded-md overflow-hidden bg-deep">
        {url ? (
          <img src={url} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted text-xs">…</div>
        )}
      </div>
      <span className="text-xs text-primary leading-tight">{dateLabel}</span>
      <span className="text-xs text-muted leading-tight">{yearLabel}</span>
    </button>
  );
}

function PhotoModal({ photoId, addedAt, onClose }) {
  const url = usePhoto(photoId);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center p-4 animate-fadeIn"
      onClick={onClose}
    >
      {url && (
        <img
          src={url}
          alt=""
          className="max-w-full max-h-[80vh] object-contain rounded-md"
          onClick={(e) => e.stopPropagation()}
        />
      )}
      {addedAt && (
        <p className="text-white text-sm mt-3 m-0">
          {new Date(addedAt).toLocaleDateString('pl-PL', { day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      )}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/20 text-white text-xl flex items-center justify-center"
        aria-label="Zamknij"
      >
        ✕
      </button>
    </div>
  );
}
