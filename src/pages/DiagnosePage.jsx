import { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSettingsStore } from '../store/useSettingsStore.js';
import { diagnosePlantHealth, fileToBase64 } from '../lib/gemini.js';

const MAX_DIM = 1280;

export default function DiagnosePage() {
  const navigate = useNavigate();
  const apiKey = useSettingsStore((s) => s.apiKey);

  const fileRef = useRef(null);
  const camRef = useRef(null);

  const [previewUrl, setPreviewUrl] = useState(null);
  const [previewBlob, setPreviewBlob] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleFile = async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    setError(null);
    setResult(null);

    try {
      const out = await resizeImage(file, MAX_DIM);
      setPreviewUrl(out.dataUrl);
      setPreviewBlob(out.blob);
    } catch (err) {
      setError('Nie udalo sie przygotowac zdjecia: ' + err.message);
    }
    e.target.value = '';
  };

  const handleDiagnose = async () => {
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
      const r = await diagnosePlantHealth(apiKey, b64, previewBlob.type || 'image/jpeg');
      setResult(r);
    } catch (err) {
      setError(err.message || 'Nie udalo sie zdiagnozowac rosliny.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setPreviewUrl(null);
    setPreviewBlob(null);
    setResult(null);
    setError(null);
  };

  return (
    <div className="px-5 pt-6">
      <header className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate(-1)}
          className="w-9 h-9 rounded-full bg-surface flex items-center justify-center"
          aria-label="Wroc"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-2xl text-primary m-0">Diagnoza chorob</h1>
      </header>

      {!apiKey ? (
        <div className="card">
          <p className="text-sm text-primary m-0 mb-2">Brak klucza API</p>
          <p className="text-xs text-muted m-0 mb-3">
            Aby diagnozowac rosliny, dodaj darmowy klucz API Gemini w ustawieniach.
          </p>
          <Link to="/settings" className="btn btn-primary w-full">
            Przejdz do ustawien
          </Link>
        </div>
      ) : (
        <>
          <div className="card mb-3">
            <div className="aspect-square rounded-md bg-deep mb-3 flex items-center justify-center overflow-hidden border border-soft">
              {previewUrl ? (
                <img src={previewUrl} alt="Podglad" className="w-full h-full object-cover" />
              ) : (
                <div className="text-center text-muted">
                  <div className="text-4xl mb-2">+</div>
                  <p className="text-xs m-0">Sfotografuj chora rosline</p>
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => fileRef.current && fileRef.current.click()} className="btn btn-secondary">
                Galeria
              </button>
              <button onClick={() => camRef.current && camRef.current.click()} className="btn btn-secondary">
                Aparat
              </button>
            </div>
            <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />
            <input ref={camRef} type="file" accept="image/*" capture="environment" onChange={handleFile} className="hidden" />
          </div>

          {previewUrl && !result && (
            <div className="flex gap-2 mb-3">
              <button onClick={handleReset} className="btn btn-secondary flex-1">Anuluj</button>
              <button
                onClick={handleDiagnose}
                disabled={loading}
                className="btn btn-primary flex-[2] disabled:opacity-50"
              >
                {loading ? 'Analizuje...' : 'Diagnozuj'}
              </button>
            </div>
          )}

          {error && (
            <div className="card mb-3">
              <p className="text-xs text-danger m-0">{error}</p>
            </div>
          )}

          {result && <DiagnosisCard result={result} onReset={handleReset} />}

          {!previewUrl && !result && (
            <div className="card">
              <h2 className="text-sm text-primary font-medium m-0 mb-2">Jak fotografowac</h2>
              <ul className="text-xs text-secondary leading-relaxed m-0 pl-4 space-y-1">
                <li>Sfotografuj problematyczna czesc (chory lisc, lodyga, korzenie)</li>
                <li>Z bliska, ostre, w dobrym swietle</li>
                <li>Lepiej zrobic zdjecie spodu liscia jesli widzisz tam cos niepokojacego</li>
                <li>AI zaproponuje diagnoze - to nie zastapi konsultacji z fachowcem przy powaznych problemach</li>
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  );
}

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
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      canvas.toBlob(
        (blob) => {
          if (!blob) return reject(new Error('Konwersja nie powiodla sie'));
          resolve({ blob, dataUrl: canvas.toDataURL('image/jpeg', 0.85) });
        },
        'image/jpeg',
        0.85
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Niepoprawne zdjecie'));
    };
    img.src = url;
  });
}

function DiagnosisCard({ result, onReset }) {
  const severityMap = {
    ok:       { color: 'var(--accent)',     label: 'Stan dobry' },
    minor:    { color: 'var(--accent)',     label: 'Lekkie objawy' },
    moderate: { color: 'var(--warning)',    label: 'Wymaga uwagi' },
    severe:   { color: 'var(--danger)',     label: 'Powazny problem' },
    critical: { color: 'var(--danger)',     label: 'Pilnie ratuj' },
    unknown:  { color: 'var(--text-muted)', label: 'Brak diagnozy' }
  };
  const sev = severityMap[result.severity] || severityMap.unknown;

  return (
    <div className="space-y-3 mb-3">
      <div className="card" style={{ borderLeftWidth: 4, borderLeftStyle: 'solid', borderLeftColor: sev.color }}>
        <div className="flex items-baseline justify-between mb-1">
          <span className="text-xs text-muted">Diagnoza</span>
          {result.urgent && (
            <span className="text-xs" style={{ color: 'var(--danger)' }}>Pilne</span>
          )}
        </div>

        {result.plantName && (
          <p className="text-xs text-muted italic m-0 mb-1">{result.plantName}</p>
        )}

        <div className="mb-2">
          <span className="text-base font-medium" style={{ color: sev.color }}>
            {result.severityLabel || sev.label}
          </span>
        </div>

        {result.primaryIssue && (
          <p className="font-serif text-lg text-primary m-0 mb-2">{result.primaryIssue}</p>
        )}

        {result.diagnosis && (
          <p className="text-sm text-secondary leading-relaxed m-0">{result.diagnosis}</p>
        )}
      </div>

      {result.causes && result.causes.length > 0 && (
        <div className="card">
          <h3 className="text-sm text-primary font-medium m-0 mb-2">Mozliwe przyczyny</h3>
          <ul className="text-sm text-secondary leading-relaxed m-0 list-none p-0 space-y-1">
            {result.causes.map((c, i) => (
              <li key={i} className="flex gap-2">
                <span className="text-muted flex-shrink-0">-</span>
                <span>{c}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {result.treatment && result.treatment.length > 0 && (
        <div className="card">
          <h3 className="text-sm text-primary font-medium m-0 mb-3">Plan ratunkowy</h3>
          <ol className="text-sm text-secondary leading-relaxed m-0 list-none p-0 space-y-2">
            {result.treatment.map((step, i) => (
              <li key={i} className="flex gap-3">
                <span
                  className="flex-shrink-0 w-5 h-5 rounded-full bg-accent text-xs font-medium flex items-center justify-center"
                  style={{ color: 'var(--accent-text)' }}
                >
                  {i + 1}
                </span>
                <span className="pt-0.5">{step}</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {result.prevention && (
        <div className="card">
          <h3 className="text-sm text-primary font-medium m-0 mb-2">Na przyszlosc</h3>
          <p className="text-sm text-secondary leading-relaxed m-0">{result.prevention}</p>
        </div>
      )}

      <button onClick={onReset} className="btn btn-secondary w-full">
        Nowa diagnoza
      </button>
    </div>
  );
}
