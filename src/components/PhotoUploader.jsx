import { useRef, useState } from 'react';

/**
 * Reużywalny przycisk do uploadu zdjęcia.
 * onUpload otrzymuje surowy File — kompresja i zapis dzieją się
 * w storze (addPlantPhoto / setEncycPhotoOverride).
 *
 * Props:
 *   onUpload(file)  — async callback
 *   label           — tekst przycisku (default: "Dodaj zdjęcie")
 *   className       — klasy CSS przycisku
 *   variant         — 'primary' | 'secondary'
 */
export default function PhotoUploader({
  onUpload,
  label = '📷 Dodaj zdjęcie',
  className = '',
  variant = 'secondary'
}) {
  const fileRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setError(null);
    setBusy(true);
    try {
      await onUpload(file);
    } catch (err) {
      setError(err.message || 'Nie udało się dodać zdjęcia');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        disabled={busy}
        className={`btn btn-${variant} ${className} disabled:opacity-50`}
      >
        {busy ? '⏳ Zapisuję…' : label}
      </button>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        onChange={handleFile}
        className="hidden"
      />
      {error && <p className="text-xs text-danger mt-2">{error}</p>}
    </>
  );
}
