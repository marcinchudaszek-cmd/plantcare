import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import plantsDB from '../data/plants.json';
import {
  openCameraStream,
  stopCameraStream,
  calculateLuminance,
  luminanceToLux,
  classifyLight
} from '../lib/lightMeter.js';

const SAMPLE_INTERVAL = 300; // ms

export default function LightMeter() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const intervalRef = useRef(null);

  const [active, setActive] = useState(false);
  const [error, setError] = useState(null);
  const [lux, setLux] = useState(0);
  const [lum, setLum] = useState(0);
  const [paused, setPaused] = useState(false);
  const [streamReady, setStreamReady] = useState(false);

  // === START / STOP ===
  const handleStart = async () => {
    setError(null);
    try {
      const stream = await openCameraStream();
      streamRef.current = stream;
      setActive(true); // dopiero teraz wyrenderuje się <video>
    } catch (e) {
      setError(e.message);
    }
  };

  const handleStop = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    stopCameraStream(streamRef.current);
    streamRef.current = null;
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setActive(false);
    setStreamReady(false);
    setPaused(false);
  };

  // === ATTACH STREAM po wyrenderowaniu video ===
  useEffect(() => {
    if (!active) return;
    const video = videoRef.current;
    const stream = streamRef.current;
    if (!video || !stream) return;

    video.srcObject = stream;

    const onLoaded = () => {
      video.play().then(() => {
        setStreamReady(true);
      }).catch((e) => {
        setError('Nie udało się uruchomić podglądu: ' + e.message);
      });
    };

    if (video.readyState >= 2) {
      onLoaded();
    } else {
      video.addEventListener('loadedmetadata', onLoaded, { once: true });
    }

    return () => {
      video.removeEventListener('loadedmetadata', onLoaded);
    };
  }, [active]);

  // === SAMPLING ===
  useEffect(() => {
    if (!active || !streamReady || paused) return;

    const tick = () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas) return;
      if (video.videoWidth === 0 || video.videoHeight === 0) return;

      const w = 80;
      const h = 60;
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      try {
        ctx.drawImage(video, 0, 0, w, h);
        const data = ctx.getImageData(0, 0, w, h);
        const l = calculateLuminance(data);
        setLum(l);
        setLux(luminanceToLux(l));
      } catch (e) {
        // SecurityError — ignoruj, kolejna klatka spróbuje
      }
    };

    tick(); // pierwszy pomiar od razu
    intervalRef.current = setInterval(tick, SAMPLE_INTERVAL);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [active, streamReady, paused]);

  // === CLEANUP przy unmount ===
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      stopCameraStream(streamRef.current);
    };
  }, []);

  const classification = active && streamReady ? classifyLight(lux) : null;
  const colorMap = {
    danger: 'var(--danger)',
    warning: 'var(--warning)',
    accent: 'var(--accent)'
  };

  const recommendedPlants = classification
    ? plantsDB
        .filter((p) => p.category.some((c) => classification.categories.includes(c)))
        .slice(0, 3)
    : [];

  // === RENDER: ekran startowy ===
  if (!active) {
    return (
      <div>
        <div className="card mb-3 text-center py-10">
          <div className="text-5xl mb-3">☀️</div>
          <h2 className="text-base text-primary m-0 mb-2">Miernik światła</h2>
          <p className="text-xs text-muted mb-4 max-w-xs mx-auto">
            Skieruj kamerę na miejsce gdzie chcesz postawić roślinę. Aplikacja zmierzy
            jasność i podpowie jakie gatunki się tam sprawdzą.
          </p>
          <button onClick={handleStart} className="btn btn-primary">
            📷 Włącz kamerę
          </button>
          {error && <p className="text-xs text-danger mt-3">{error}</p>}
        </div>

        <div className="card">
          <h3 className="text-sm text-primary font-medium m-0 mb-2">💡 Jak używać</h3>
          <ul className="text-xs text-secondary leading-relaxed m-0 pl-4 space-y-1">
            <li>Skieruj telefon w stronę miejsca jakby ustawiał roślinę</li>
            <li>Trzymaj nieruchomo przez 2-3 sekundy</li>
            <li>Nie kieruj prosto w słońce — uszkodzisz pomiar i kamerę</li>
            <li>Pomiar jest przybliżony — kamera sama dostosowuje ekspozycję</li>
          </ul>
        </div>
      </div>
    );
  }

  // === RENDER: kamera aktywna ===
  return (
    <div>
      <div className="card mb-3 !p-0 overflow-hidden relative">
        {/* WAŻNE: video musi być ZAWSZE w DOM gdy active=true,
            żeby ref był dostępny dla useEffect */}
        <video
          ref={videoRef}
          playsInline
          muted
          autoPlay
          className="w-full aspect-[4/3] object-cover bg-deep block"
        />
        <canvas ref={canvasRef} className="hidden" />

        {!streamReady && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-muted text-sm">Uruchamiam kamerę…</span>
          </div>
        )}

        {paused && streamReady && (
          <div className="absolute inset-0 bg-app/80 flex items-center justify-center">
            <span className="text-primary text-sm">⏸ Pauza</span>
          </div>
        )}

        {streamReady && (
          <div className="absolute bottom-0 left-0 right-0 bg-app/85 backdrop-blur p-3">
            <div className="flex items-baseline justify-between mb-2">
              <span className="text-xs text-muted">Pomiar światła</span>
              <span className="text-xs text-muted">~{Math.round(lum)} luminancji</span>
            </div>
            <div className="text-2xl font-medium text-primary leading-none mb-1">
              ~{lux.toLocaleString('pl-PL')} lx
            </div>
            {classification && (
              <div className="flex items-center gap-2 text-sm" style={{ color: colorMap[classification.color] }}>
                <span>{classification.icon}</span>
                <span>{classification.label}</span>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2 mb-3">
        <button
          onClick={() => setPaused((v) => !v)}
          disabled={!streamReady}
          className="btn btn-secondary disabled:opacity-50"
        >
          {paused ? '▶ Wznów' : '⏸ Pauza'}
        </button>
        <button onClick={handleStop} className="btn btn-secondary">
          ✕ Wyłącz
        </button>
      </div>

      {classification && (
        <div className="card mb-3">
          <h3 className="text-sm text-primary font-medium m-0 mb-2">Rekomendacja</h3>
          <p className="text-sm text-secondary leading-relaxed m-0 mb-3">
            {classification.recommendation}
          </p>

          {recommendedPlants.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-muted m-0">Pasujące gatunki z bazy:</p>
              {recommendedPlants.map((p) => (
                <Link
                  key={p.id}
                  to={`/encyclopedia/${p.id}`}
                  className="flex items-center gap-3 bg-deep rounded-md p-2"
                >
                  <span className="text-xl">{p.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-serif text-sm text-primary m-0 truncate">{p.name}</p>
                    <p className="text-xs text-muted italic m-0 truncate">{p.species}</p>
                  </div>
                  <span className="text-xs text-accent">→</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
