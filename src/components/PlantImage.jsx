import { useState } from 'react';
import { usePhoto } from '../hooks/usePhoto.js';

/**
 * Wyświetla zdjęcie rośliny ze źródeł w kolejności priorytetu:
 *   1. userPhotoId  — zdjęcie usera (z PhotoStore, najwyższy priorytet)
 *   2. encycOverrideId — własne zdjęcie gatunku (z PhotoStore)
 *   3. src — URL z bazy plants.json (Wikimedia)
 *   4. emoji — fallback końcowy
 *
 * Każde źródło może zawieść (404, brak), wtedy spada do następnego.
 *
 * Użycie:
 *   <PlantImage
 *     userPhotoId={plant.coverPhotoId}
 *     encycOverrideId={overrides[plant.encycId]}
 *     src={encyc?.image}
 *     emoji={plant.emoji}
 *     className="w-12 h-12 rounded-md"
 *   />
 */
export default function PlantImage({
  userPhotoId,
  encycOverrideId,
  src,
  emoji,
  alt,
  className = '',
  emojiSize = 'text-2xl'
}) {
  // Załaduj oba własne zdjęcia (nawet jeśli niepotrzebne — hooks musi być stabilne)
  const userUrl = usePhoto(userPhotoId);
  const overrideUrl = usePhoto(encycOverrideId);

  // Wybierz źródło z najwyższym priorytetem
  const finalSrc = userUrl || overrideUrl || src || null;

  const [imgError, setImgError] = useState(false);

  // Brak źródła lub error → emoji
  if (!finalSrc || imgError) {
    return (
      <div className={`bg-deep flex items-center justify-center ${emojiSize} ${className}`}>
        {emoji || '🌿'}
      </div>
    );
  }

  return (
    <div className={`bg-deep relative overflow-hidden ${className}`}>
      <div className={`absolute inset-0 flex items-center justify-center ${emojiSize} opacity-20`}>
        {emoji || '🌿'}
      </div>
      <img
        key={finalSrc}
        src={finalSrc}
        alt={alt || ''}
        loading="lazy"
        decoding="async"
        onError={() => setImgError(true)}
        className="relative w-full h-full object-cover"
      />
    </div>
  );
}
