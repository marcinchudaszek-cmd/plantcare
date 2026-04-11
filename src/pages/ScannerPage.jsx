import { useRef, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useT } from '../lib/i18n.js';
import { useSettingsStore } from '../store/useSettingsStore.js';
import { useAppStore } from '../store/useAppStore.js';
import { recognizePlant, fileToBase64 } from '../lib/gemini.js';
import plantsDB from '../data/plants.json';
import LightMeter from '../components/LightMeter.jsx';

const MAX_DIM = 1280;       // limit największego boku przed wysłaniem do API
const THUMB_DIM = 200;      // miniaturka do historii

export default function ScannerPage() {
  const t = useT();
  const apiKey = useSettingsStore((s) => s.apiKey);
  const scanHistory = useSettingsStore((s) => s.scanHistory);
  const addScanToHistory = useSettingsStore((s) => s.addScanToHistory);
  const addPlantFromEncyc = useAppStore((s) => s.addPlantFromEncyc);
  const navigate = useNavigate();

  const fileRef = useRef(null);
  const camRef = useRef(null);

  const [previewUrl, setPreviewUrl] = useState(null);
  const [previewBlob, setPreviewBlob] = useState(null);
  const [thumb, setThumb] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState('plant'); // 'plant' | 'light'

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setResult(null);

    try {
      // Skompresuj do max 1280px (oszczędność transferu i tokenów)
      const { blob, dataUrl } = await resizeImage(file, MAX_DIM);
      const { dataUrl: thumbUrl } = await resizeImage(file, THUMB_DIM);
      setPreviewUrl(dataUrl);
      setPreviewBlob(blob);
      setThumb(thumbUrl);
    } catch (err) {
      setError('Nie udało się przygotować zdjęcia: ' + err.message);
    }

    // Reset inputa, żeby ten sam plik dało się wybrać ponownie
    e.target.value = '';
  };

  const handleScan = async () => {
    if (!previewBlob) return;
    if (!apiKey) {
      setError('Najpierw dodaj klucz API w ustawieniach.');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const b64 = await fileToBase64(previewBlob);
      const r = await recognizePlant(apiKey, b64, previewBlob.type || 'image/jpeg');

      // Dopasuj do bazy roślin (po nazwie polskiej lub łacińskiej, fuzzy)
      const match = findInDB(r.name, r.species);

      const enriched = { ...r, match };
      setResult(enriched);

      // Dodaj do historii (z miniaturką)
      addScanToHistory({
        name: r.name,
        species: r.species,
        confidence: r.confidence,
        health: r.health,
        healthNote: r.healthNote,
        thumb,
        matchId: match?.id || null
      });
    } catch (err) {
      setError(err.message || 'Nie udało się rozpoznać rośliny.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCollection = () => {
    if (!result?.match) return;
    const newPlant = addPlantFromEncyc(result.match);
    navigate(`/plants/${newPlant.id}`);
  };

  const handleReset = () => {
    setPreviewUrl(null);
    setPreviewBlob(null);
    setThumb(null);
    setResult(null);
    setError(null);
  };

  return (
    <div className="px-5 pt-6">
      <h1 className="text-2xl text-primary mb-2">{t('scanner.title')}</h1>
      <p className="text-xs text-muted mb-4">{t('scanner.subtitle')}</p>

      {/* Tab switcher */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setTab('plant')}
          className={`pill flex-1 justify-center py-2 ${tab === 'plant' ? 'pill-on' : ''}`}
        >
          🌱 Roślina
        </button>
        <button
          onClick={() => setTab('light')}
          className={`pill flex-1 justify-center py-2 ${tab === 'light' ? 'pill-on' : ''}`}
        >
          ☀️ Światło
        </button>
      </div>

      {tab === 'light' ? (
        <LightMeter />
      ) : (
        <PlantScanner
          apiKey={apiKey}
          loading={loading}
          previewUrl={previewUrl}
          previewBlob={previewBlob}
          result={result}
          error={error}
          fileRef={fileRef}
          camRef={camRef}
          handleFile={handleFile}
          handleScan={handleScan}
          handleAddToCollection={handleAddToCollection}
          handleReset={handleReset}
          scanHistory={scanHistory}
          t={t}
        />
      )}
    </div>
  );
}

function PlantScanner({ apiKey, loading, previewUrl, previewBlob, result, error, fileRef, camRef, handleFile, handleScan, handleAddToCollection, handleReset, scanHistory, t }) {
  return (
    <>
      {/* Brak klucza API → ostrzeżenie */}
      {!apiKey && (
        <div className="card mb-4">
          <p className="text-sm text-primary m-0 mb-2">⚠️ {t('scanner.noKey')}</p>
          <p className="text-xs text-muted m-0 mb-3">
            {t('scanner.noKeyHint')}
          </p>
          <Link to="/settings" className="btn btn-primary w-full">
            Przejdź do ustawień
          </Link>
        </div>
      )}

      {/* Preview */}
      <div className="card mb-3">
        <div className="aspect-square rounded-md bg-deep mb-3 flex items-center justify-center overflow-hidden border border-soft">
          {previewUrl ? (
            <img src={previewUrl} alt="Podgląd" className="w-full h-full object-cover" />
          ) : (
            <div className="text-center text-muted">
              <div className="text-4xl mb-2">📷</div>
              <p className="text-xs m-0">Wybierz lub zrób zdjęcie</p>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => fileRef.current?.click()}
            className="btn btn-secondary"
          >
            🖼️ Galeria
          </button>
          <button
            onClick={() => camRef.current?.click()}
            className="btn btn-secondary"
          >
            📸 Aparat
          </button>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          onChange={handleFile}
          className="hidden"
        />
        <input
          ref={camRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFile}
          className="hidden"
        />
      </div>

      {/* Akcja: rozpoznaj */}
      {previewUrl && !result && (
        <div className="flex gap-2 mb-3">
          <button onClick={handleReset} className="btn btn-secondary flex-1">
            Anuluj
          </button>
          <button
            onClick={handleScan}
            disabled={loading || !apiKey}
            className="btn btn-primary flex-[2] disabled:opacity-50"
          >
            {loading ? '⏳ Rozpoznaję…' : '✨ Rozpoznaj'}
          </button>
        </div>
      )}

      {/* Błąd */}
      {error && (
        <div className="card mb-3">
          <p className="text-xs text-danger m-0">{error}</p>
        </div>
      )}

      {/* Wynik */}
      {result && (
        <ResultCard
          result={result}
          onAdd={handleAddToCollection}
          onReset={handleReset}
        />
      )}

      {/* Wskazówki */}
      {!previewUrl && (
        <div className="card mb-3">
          <h2 className="text-sm text-primary font-medium m-0 mb-2">💡 {t('scanner.tipsTitle')}</h2>
          <ul className="text-xs text-secondary leading-relaxed m-0 pl-4 space-y-1">
            <li>Zrób wyraźne zdjęcie całej rośliny lub liścia</li>
            <li>Dobre oświetlenie pomaga w rozpoznaniu</li>
            <li>AI sprawdzi też czy roślina wygląda na zdrową</li>
            <li>Jeśli rozpozna gatunek z bazy, dodasz go jednym kliknięciem</li>
          </ul>
        </div>
      )}

      {/* Historia */}
      {scanHistory.length > 0 && (
        <div className="card">
          <h2 className="text-sm text-primary font-medium m-0 mb-3">🕐 {t('scanner.history')}</h2>
          <div className="space-y-2">
            {scanHistory.map((s) => <HistoryRow key={s.id} item={s} />)}
          </div>
        </div>
      )}
    </>
  );
}

// === Helpers ===

function findInDB(name, species) {
  if (!name && !species) return null;
  const norm = (s) => (s || '').toLowerCase().trim();
  const n = norm(name);
  const sp = norm(species);

  // 1. Match po łacinie (najpewniejsze)
  if (sp) {
    const found = plantsDB.find((p) => norm(p.species) === sp);
    if (found) return found;
  }
  // 2. Match po polskiej nazwie (dokładny)
  if (n) {
    const found = plantsDB.find((p) => norm(p.name) === n);
    if (found) return found;
  }
  // 3. Match częściowy po nazwie polskiej
  if (n) {
    const found = plantsDB.find((p) => norm(p.name).includes(n) || n.includes(norm(p.name)));
    if (found) return found;
  }
  // 4. Match częściowy po łacinie
  if (sp) {
    const spGenus = sp.split(' ')[0];
    const found = plantsDB.find((p) => norm(p.species).startsWith(spGenus));
    if (found) return found;
  }
  return null;
}

/**
 * Skaluje obraz do max wymiaru, zwraca {blob, dataUrl}.
 * Odciąża API i zmniejsza rozmiar przesyłki.
 */
function resizeImage(file, maxDim) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const ratio = Math.min(maxDim / img.width, maxDim / img.height, 1);
      const w = Math.round(img.width * ratio);
      const h = Math.round(img.height * ratio);
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, w, h);
      canvas.toBlob(
        (blob) => {
          if (!blob) return reject(new Error('Konwersja nie powiodła się'));
          const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
          resolve({ blob, dataUrl });
        },
        'image/jpeg',
        0.85
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Niepoprawne zdjęcie'));
    };
    img.src = url;
  });
}

// === Subcomponents ===

function ResultCard({ result, onAdd, onReset }) {
  const conf = Math.round((result.confidence || 0) * 100);
  const confColor =
    conf >= 80 ? 'text-accent' : conf >= 50 ? 'text-warning' : 'text-danger';

  const healthMeta = {
    good:    { label: 'Wygląda zdrowo', color: 'text-accent', icon: '✓' },
    warning: { label: 'Wymaga uwagi',    color: 'text-warning', icon: '⚠' },
    bad:     { label: 'Problemy',        color: 'text-danger', icon: '✗' }
  }[result.health] || { label: '—', color: 'text-muted', icon: '?' };

  return (
    <div className="card mb-3">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <p className="text-xs text-muted m-0 mb-1">Rozpoznano:</p>
          <h2 className="font-serif text-lg text-primary m-0">{result.name}</h2>
          <p className="text-xs text-muted italic m-0">{result.species}</p>
        </div>
        <div className="text-right ml-3 flex-shrink-0">
          <p className="text-xs text-muted m-0">Pewność</p>
          <p className={`text-xl font-medium m-0 ${confColor}`}>{conf}%</p>
        </div>
      </div>

      {result.description && (
        <p className="text-sm text-secondary leading-relaxed m-0 mb-3">{result.description}</p>
      )}

      <div className="bg-deep rounded-md p-3 mb-3 border border-soft">
        <p className={`text-sm font-medium m-0 ${healthMeta.color}`}>
          {healthMeta.icon} {healthMeta.label}
        </p>
        {result.healthNote && (
          <p className="text-xs text-secondary m-0 mt-1 leading-relaxed">{result.healthNote}</p>
        )}
      </div>

      {result.match ? (
        <>
          <div className="flex items-center gap-2 text-xs text-accent mb-2">
            <span>✓</span>
            <span>Znaleziono w bazie roślin</span>
          </div>
          <div className="flex gap-2">
            <button onClick={onReset} className="btn btn-secondary flex-1">
              Nowy skan
            </button>
            <button onClick={onAdd} className="btn btn-primary flex-[2]">
              + Dodaj do kolekcji
            </button>
          </div>
        </>
      ) : (
        <>
          <p className="text-xs text-muted m-0 mb-2">
            Tej rośliny nie ma jeszcze w naszej bazie.
          </p>
          <button onClick={onReset} className="btn btn-secondary w-full">
            Nowy skan
          </button>
        </>
      )}
    </div>
  );
}

function HistoryRow({ item }) {
  const date = new Date(item.date).toLocaleString('pl-PL', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  });
  const conf = Math.round((item.confidence || 0) * 100);

  return (
    <div className="flex items-center gap-3">
      <div className="w-12 h-12 rounded-md bg-deep overflow-hidden flex-shrink-0">
        {item.thumb ? (
          <img src={item.thumb} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted text-xl">
            🌿
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-serif text-sm text-primary m-0 truncate">{item.name}</p>
        <p className="text-xs text-muted m-0 truncate">{date} · {conf}%</p>
      </div>
      {item.matchId && (
        <span className="text-xs text-accent flex-shrink-0">✓</span>
      )}
    </div>
  );
}
