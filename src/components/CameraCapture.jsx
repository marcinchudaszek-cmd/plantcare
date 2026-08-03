import { useEffect, useRef, useState } from 'react';

/**
 * Podgląd kamery na żywo (getUserMedia) z migawką.
 * Po zrobieniu zdjęcia woła onCapture(File). onClose zamyka widok.
 *
 * Uwaga: wymaga HTTPS (lub localhost) i zgody na aparat. W aplikacji Android
 * (TWA) system zapyta o uprawnienie do kamery przy pierwszym użyciu.
 */
export default function CameraCapture({ onCapture, onClose }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [error, setError] = useState(null);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function start() {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError('Ta przeglądarka nie udostępnia kamery na żywo. Użyj przycisku „Aparat”.');
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
          audio: false
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }
        setReady(true);
      } catch (err) {
        if (err?.name === 'NotAllowedError') {
          setError('Brak zgody na aparat. Zezwól na dostęp do kamery w ustawieniach i spróbuj ponownie.');
        } else if (err?.name === 'NotFoundError') {
          setError('Nie znaleziono kamery w tym urządzeniu.');
        } else {
          setError('Nie udało się uruchomić kamery: ' + (err?.message || err));
        }
      }
    }

    start();

    return () => {
      cancelled = true;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    };
  }, []);

  const snap = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    setBusy(true);
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    canvas.toBlob(
      (blob) => {
        setBusy(false);
        if (!blob) {
          setError('Nie udało się zrobić zdjęcia. Spróbuj ponownie.');
          return;
        }
        const file = new File([blob], `aparat_${Date.now()}.jpg`, { type: 'image/jpeg' });
        onCapture(file);
      },
      'image/jpeg',
      0.9
    );
  };

  return (
    <div className="fixed inset-0 z-[110] bg-black flex flex-col">
      <div className="flex items-center justify-between px-4 py-3">
        <span className="text-white text-sm">Kamera na żywo</span>
        <button
          onClick={onClose}
          className="w-9 h-9 rounded-full bg-white/15 text-white flex items-center justify-center"
          aria-label="Zamknij kamerę"
        >
          ✕
        </button>
      </div>

      <div className="flex-1 relative flex items-center justify-center overflow-hidden">
        {error ? (
          <div className="px-6 text-center">
            <div className="text-4xl mb-3">📷</div>
            <p className="text-white text-sm leading-relaxed">{error}</p>
            <button onClick={onClose} className="btn btn-secondary mt-4">Wróć</button>
          </div>
        ) : (
          <video
            ref={videoRef}
            playsInline
            muted
            className="w-full h-full object-cover"
          />
        )}
      </div>

      {!error && (
        <div className="flex items-center justify-center py-6">
          <button
            onClick={snap}
            disabled={!ready || busy}
            aria-label="Zrób zdjęcie"
            className="w-18 h-18 rounded-full border-4 border-white disabled:opacity-40"
            style={{ width: 72, height: 72, background: 'rgba(255,255,255,0.25)' }}
          />
        </div>
      )}
    </div>
  );
}
