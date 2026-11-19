import { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSettingsStore } from '../store/useSettingsStore.js';
import { diagnosePlantHealth, fileToBase64, aiAvailable, AiError } from '../lib/gemini.js';
import { useT } from '../lib/i18n.js';

const MAX_DIM = 1280;

export default function DiagnosePage() {
  const navigate = useNavigate();
  const apiKey = useSettingsStore((s) => s.apiKey);
  const t = useT();
  const canUseAi = aiAvailable(apiKey);

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
      setError(t('ai.err.image'));
    }
    e.target.value = '';
  };

  const handleDiagnose = async () => {
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
      const r = await diagnosePlantHealth(apiKey, b64, previewBlob.type || 'image/jpeg');
      setResult(r);
    } catch (err) {
      setError(err.message || t('ai.err.empty'));
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
          aria-label={t('common.back')}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-2xl text-primary m-0">{t('diagnose.title')}</h1>
      </header>

      {!canUseAi ? (
        <div className="card">
          <p className="text-sm text-primary m-0 mb-2">{t('ai.noKeyTitle')}</p>
          <p className="text-xs text-muted m-0 mb-3">
            {t('diagnose.noKeyHint')}
          </p>
          <Link to="/settings" className="btn btn-primary w-full">
            {t('ai.goSettings')}
          </Link>
        </div>
      ) : (
        <>
          <div className="card mb-3">
            <div className="aspect-square rounded-md bg-deep mb-3 flex items-center justify-center overflow-hidden border border-soft">
              {previewUrl ? (
                <img src={previewUrl} alt={t('diagnose.preview')} className="w-full h-full object-cover" />
              ) : (
                <div className="text-center text-muted">
                  <div className="text-4xl mb-2">+</div>
                  <p className="text-xs m-0">{t('diagnose.photoPrompt')}</p>
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => fileRef.current && fileRef.current.click()} className="btn btn-secondary">
                {t('scanner.gallery')}
              </button>
              <button onClick={() => camRef.current && camRef.current.click()} className="btn btn-secondary">
                {t('scanner.camera')}
              </button>
            </div>
            <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />
            <input ref={camRef} type="file" accept="image/*" capture="environment" onChange={handleFile} className="hidden" />
          </div>

          {previewUrl && !result && (
            <div className="flex gap-2 mb-3">
              <button onClick={handleReset} className="btn btn-secondary flex-1">{t('common.cancel')}</button>
              <button
                onClick={handleDiagnose}
                disabled={loading}
                className="btn btn-primary flex-[2] disabled:opacity-50"
              >
                {loading ? t('diagnose.analyzing') : t('diagnose.diagnose')}
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
              <h2 className="text-sm text-primary font-medium m-0 mb-2">{t('diagnose.howTitle')}</h2>
              <ul className="text-xs text-secondary leading-relaxed m-0 pl-4 space-y-1">
                <li>{t('diagnose.how1')}</li>
                <li>{t('diagnose.how2')}</li>
                <li>{t('diagnose.how3')}</li>
                <li>{t('diagnose.how4')}</li>
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
          if (!blob) return reject(new AiError('image'));
          resolve({ blob, dataUrl: canvas.toDataURL('image/jpeg', 0.85) });
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

function DiagnosisCard({ result, onReset }) {
  const t = useT();
  const severityMap = {
    ok:       { color: 'var(--accent)',     label: t('diagnose.sevOk') },
    minor:    { color: 'var(--accent)',     label: t('diagnose.sevMinor') },
    moderate: { color: 'var(--warning)',    label: t('diagnose.sevModerate') },
    severe:   { color: 'var(--danger)',     label: t('diagnose.sevSevere') },
    critical: { color: 'var(--danger)',     label: t('diagnose.sevCritical') },
    unknown:  { color: 'var(--text-muted)', label: t('diagnose.sevUnknown') }
  };
  const sev = severityMap[result.severity] || severityMap.unknown;

  return (
    <div className="space-y-3 mb-3">
      <div className="card" style={{ borderLeftWidth: 4, borderLeftStyle: 'solid', borderLeftColor: sev.color }}>
        <div className="flex items-baseline justify-between mb-1">
          <span className="text-xs text-muted">{t('diagnose.result')}</span>
          {result.urgent && (
            <span className="text-xs" style={{ color: 'var(--danger)' }}>{t('diagnose.urgent')}</span>
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
          <h3 className="text-sm text-primary font-medium m-0 mb-2">{t('diagnose.causes')}</h3>
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
          <h3 className="text-sm text-primary font-medium m-0 mb-3">{t('diagnose.treatment')}</h3>
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
          <h3 className="text-sm text-primary font-medium m-0 mb-2">{t('diagnose.prevention')}</h3>
          <p className="text-sm text-secondary leading-relaxed m-0">{result.prevention}</p>
        </div>
      )}

      <button onClick={onReset} className="btn btn-secondary w-full">
        {t('diagnose.newDiagnosis')}
      </button>
    </div>
  );
}
