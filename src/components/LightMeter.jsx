import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import plantsDB from '../data/plants.json';
import { CATEGORIES } from '../data/categories.js';
import {
  openCameraStream,
  stopCameraStream,
  calculateLuminance,
  luminanceToLux,
  classifyLight
} from '../lib/lightMeter.js';

const SAMPLE_INTERVAL = 300; // ms — częstotliwość pomiaru

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

  const start = async () => {
    setError(null);
    try {
      const stream = await openCameraStream();
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setActive(true);
      setPaused(false);
    } catch (e) {
      setError(e.message);
    }
  };

  const stop = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    stopCameraStream(streamRef.current);
    streamRef.current = null;
    setActive(false);
    setPaused(false);
  };

  // Próbkowanie klatek
  useEffect(() => {
    if (!active || paused) return;

    const tick = () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas || video.readyState < 2) return;

      // Małe canvas wystarczy — nie potrzebujemy pełnej rozdzielczości
      const w = 80;
      const h = 60;
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      ctx.drawImage(video, 0, 0, w, h);
      try {
        const data = ctx.getImageData(0, 0, w, h);
        const l = calculateLuminance(data);
        setLum(l);
        setLux(luminanceToLux(l));
      } catch (e) {
        // Czasem getImageData rzuca SecurityError, ignoruj
      }
    };

    intervalRef.current = setInterval(tick, SAMPLE_INTERVAL);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [active, paused]);

  // Cleanup przy unmount
  useEffect(() => () => stop(), []);

  const classification = active ? classifyLight(lux) : null;
  const colorMap = {
    danger: 'var(--danger)',
    warning: 'var(--warning)',
    accent: 'var(--accent)'
  };

  // Polecane rośliny pasujące do bieżącego światła (top 3 z bazy)
  const recommendedPlants = classification
    ? plantsDB
        .filter((p) => p.category.some((c) => classification.categories.includes(c)))
        .slice(0, 3)
    : [];

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
          <button onClick={start} className="btn btn-primary">
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

  return (
    <div>
      {/* Wideo + nakładka */}
      <div className="card mb-3 !p-0 overflow-hidden relative">
        <video
          ref={videoRef}
          playsInline
          muted
          className="w-full aspect-[4/3] object-cover bg-deep"
        />
        <canvas ref={canvasRef} className="hidden" />

        {paused && (
          <div className="absolute inset-0 bg-app/80 flex items-center justify-center">
            <span className="text-primary text-sm">⏸ Pauza</span>
          </div>
        )}

        {/* Pasek z wartością na dole */}
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
      </div>

      {/* Akcje */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        <button onClick={() => setPaused((v) => !v)} className="btn btn-secondary">
          {paused ? '▶ Wznów' : '⏸ Pauza'}
        </button>
        <button onClick={stop} className="btn btn-secondary">
          ✕ Wyłącz
        </button>
      </div>

      {/* Rekomendacja */}
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
