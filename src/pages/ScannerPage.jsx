import { useRef, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useT, locale, currentLang } from '../lib/i18n.js';
import { useSettingsStore } from '../store/useSettingsStore.js';
import { useAppStore } from '../store/useAppStore.js';
import { recognizePlant, fileToBase64, aiAvailable, AiError } from '../lib/gemini.js';
import plantsDB from '../data/plants.json';
import { localizePlant, plantNameVariants } from '../lib/plantsI18n.js';
import LightMeter from '../components/LightMeter.jsx';
import CameraCapture from '../components/CameraCapture.jsx';

const MAX_DIM = 1280;       // limit największego boku przed wysłaniem do API
const THUMB_DIM = 200;      // miniaturka do historii

export default function ScannerPage() {
  const t = useT();
  const apiKey = useSettingsStore((s) => s.apiKey);
  const canUseAi = aiAvailable(apiKey);
  const scanHistory = useSettingsStore((s) => s.scanHistory);
  const addScanToHistory = useSettingsStore((s) => s.addScanToHistory);
  const addPlantFromEncyc = useAppStore((s) => s.addPlantFromEncyc);
  const addCustomPlant = useAppStore((s) => s.addCustomPlant);
  const addPlantPhoto = useAppStore((s) => s.addPlantPhoto);
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
  const [camOpen, setCamOpen] = useState(false);

  // Wspólny pipeline: przygotuj zdjęcie (z galerii, aparatu lub kamery na żywo)
  const ingestFile = async (file) => {
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
      setError(t('ai.err.image'));
    }
  };

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // reset, by ten sam plik dało się wybrać ponownie
    await ingestFile(file);
  };

  const handleCameraCapture = async (file) => {
    setCamOpen(false);
    await ingestFile(file);
  };

  const handleScan = async () => {
    if (!previewBlob) return;
    if (!canUseAi) {
      setError(t('ai.err.noKey'));
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
      setError(err.message || t('ai.err.empty'));
    } finally {
      setLoading(false);
    }
  };

  // Dodaje zeskanowane zdjęcie jako okładkę nowej rośliny (jeśli jest)
  const attachScanPhoto = async (plantId) => {
    if (!previewBlob) return;
    try {
      const file = new File([previewBlob], `skan_${Date.now()}.jpg`, { type: previewBlob.type || 'image/jpeg' });
      await addPlantPhoto(plantId, file);
    } catch { /* zdjęcie opcjonalne — pomiń błąd */ }
  };

  // Roślina rozpoznana i znaleziona w bazie
  const handleAddToCollection = async () => {
    if (!result?.match) return;
    const newPlant = addPlantFromEncyc(result.match);
    await attachScanPhoto(newPlant.id);
    navigate(`/plants/${newPlant.id}`);
  };

  // Roślina rozpoznana, ale spoza bazy — dodaj jako własną (z danymi z AI)
  const handleAddScanned = async () => {
    if (!result) return;
    const newPlant = addCustomPlant({
      name: result.name || t('scanner.myPlant'),
      species: result.species || '',
      emoji: result.match?.emoji || '🌿'
    });
    await attachScanPhoto(newPlant.id);
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
          🌱 {t('scanner.tabPlant')}
        </button>
        <button
          onClick={() => setTab('light')}
          className={`pill flex-1 justify-center py-2 ${tab === 'light' ? 'pill-on' : ''}`}
        >
          ☀️ {t('scanner.tabLight')}
        </button>
      </div>

      {tab === 'light' ? (
        <LightMeter />
      ) : (
        <PlantScanner
          canUseAi={canUseAi}
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
          handleAddScanned={handleAddScanned}
          handleReset={handleReset}
          onLiveCamera={() => setCamOpen(true)}
          scanHistory={scanHistory}
          t={t}
        />
      )}

      {camOpen && (
        <CameraCapture
          onCapture={handleCameraCapture}
          onClose={() => setCamOpen(false)}
        />
      )}
    </div>
  );
}

function PlantScanner({ canUseAi, loading, previewUrl, previewBlob, result, error, fileRef, camRef, handleFile, handleScan, handleAddToCollection, handleAddScanned, handleReset, onLiveCamera, scanHistory, t }) {
  return (
    <>
      {/* Brak klucza API → ostrzeżenie */}
      {!canUseAi && (
        <div className="card mb-4">
          <p className="text-sm text-primary m-0 mb-2">⚠️ {t('scanner.noKey')}</p>
          <p className="text-xs text-muted m-0 mb-3">
            {t('scanner.noKeyHint')}
          </p>
          <Link to="/settings" className="btn btn-primary w-full">
            {t('scanner.goSettings')}
          </Link>
        </div>
      )}

      {/* Preview */}
      <div className="card mb-3">
        <div className="aspect-square rounded-md bg-deep mb-3 flex items-center justify-center overflow-hidden border border-soft">
          {previewUrl ? (
            <img src={previewUrl} alt={t('diagnose.preview')} className="w-full h-full object-cover" />
          ) : (
            <div className="text-center text-muted">
              <div className="text-4xl mb-2">📷</div>
              <p className="text-xs m-0">{t('scanner.pickPhoto')}</p>
            </div>
          )}
        </div>

        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => fileRef.current?.click()}
            className="btn btn-secondary"
          >
            🖼️ {t('scanner.gallery')}
          </button>
          <button
            onClick={() => camRef.current?.click()}
            className="btn btn-secondary"
          >
            📸 {t('scanner.camera')}
          </button>
          <button
            onClick={onLiveCamera}
            className="btn btn-secondary"
          >
            🎥 {t('scanner.live')}
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
            {t('common.cancel')}
          </button>
          <button
            onClick={handleScan}
            disabled={loading || !canUseAi}
            className="btn btn-primary flex-[2] disabled:opacity-50"
          >
            {loading ? `⏳ ${t('scanner.recognizing')}` : `✨ ${t('scanner.recognize')}`}
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
          onAddCustom={handleAddScanned}
          onReset={handleReset}
        />
      )}

      {/* Wskazówki */}
      {!previewUrl && (
        <div className="card mb-3">
          <h2 className="text-sm text-primary font-medium m-0 mb-2">💡 {t('scanner.tipsTitle')}</h2>
          <ul className="text-xs text-secondary leading-relaxed m-0 pl-4 space-y-1">
            <li>{t('scanner.tip1')}</li>
            <li>{t('scanner.tip2')}</li>
            <li>{t('scanner.tip3')}</li>
            <li>{t('scanner.tip4')}</li>
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
  const found = findInDBRaw(name, species);
  return found ? localizePlant(found, currentLang()) : null;
}

// Dopasowanie po łacinie i po nazwie w każdym z trzech języków (PL/EN/DE)
function findInDBRaw(name, species) {
  if (!name && !species) return null;
  const norm = (s) => (s || '').toLowerCase().trim();
  const n = norm(name);
  const sp = norm(species);

  // 1. Match po łacinie (najpewniejsze)
  if (sp) {
    const found = plantsDB.find((p) => norm(p.species) === sp);
    if (found) return found;
  }
  // 2. Match po nazwie (dokładny) — PL, EN, DE, także część w nawiasie
  if (n) {
    const found = plantsDB.find((p) => plantNameVariants(p.id).includes(n));
    if (found) return found;
  }
  // 3. Match częściowy po nazwie w dowolnym języku
  if (n) {
    const found = plantsDB.find((p) =>
      plantNameVariants(p.id).some((v) => v.includes(n) || n.includes(v))
    );
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
          if (!blob) return reject(new AiError('image'));
          const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
          resolve({ blob, dataUrl });
        },
        'image/jpeg',
        0.85
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new AiError('image'));
    };
    img.src = url;
  });
}

// === Subcomponents ===

function ResultCard({ result, onAdd, onAddCustom, onReset }) {
  const t = useT();
  const conf = Math.round((result.confidence || 0) * 100);
  const confColor =
    conf >= 80 ? 'text-accent' : conf >= 50 ? 'text-warning' : 'text-danger';

  const healthMeta = {
    good:    { label: t('scanner.healthGood'), color: 'text-accent', icon: '✓' },
    warning: { label: t('scanner.healthWarning'),    color: 'text-warning', icon: '⚠' },
    bad:     { label: t('scanner.healthBad'),        color: 'text-danger', icon: '✗' }
  }[result.health] || { label: '—', color: 'text-muted', icon: '?' };

  return (
    <div className="card mb-3">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <p className="text-xs text-muted m-0 mb-1">{t('scanner.recognized')}</p>
          <h2 className="font-serif text-lg text-primary m-0">{result.name}</h2>
          <p className="text-xs text-muted italic m-0">{result.species}</p>
        </div>
        <div className="text-right ml-3 flex-shrink-0">
          <p className="text-xs text-muted m-0">{t('scanner.confidence')}</p>
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
            <span>{t('scanner.foundInDB')}</span>
          </div>
          <div className="flex gap-2">
            <button onClick={onReset} className="btn btn-secondary flex-1">
              {t('scanner.newScan')}
            </button>
            <button onClick={onAdd} className="btn btn-primary flex-[2]">
              + {t('scanner.addToCollection')}
            </button>
          </div>
        </>
      ) : (
        <>
          <p className="text-xs text-muted m-0 mb-2">
            {t('scanner.notInDBCustom')}
          </p>
          <div className="flex gap-2">
            <button onClick={onReset} className="btn btn-secondary flex-1">
              {t('scanner.newScan')}
            </button>
            <button onClick={onAddCustom} className="btn btn-primary flex-[2]">
              + {t('scanner.addToCollection')}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function HistoryRow({ item }) {
  const date = new Date(item.date).toLocaleString(locale(), {
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
