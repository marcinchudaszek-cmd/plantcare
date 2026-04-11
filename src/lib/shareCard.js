// Generuje obrazek udostepnieniowy 1080x1080 (kwadrat na Insta).
// Zawiera nazwe, gatunek, cover photo, statystyki (dni w kolekcji, podlewania, wpisy).

import { loadPhoto } from './photoStore.js';

const W = 1080;
const H = 1080;

/**
 * Tworzy Canvas z obrazkiem rosliny i zwraca Blob (PNG).
 * Jesli plant nie ma cover photo, uzywa emoji + tla.
 */
export async function generateShareCard(plant, encyc) {
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');

  // === TLO: gradient leśny ===
  const gradient = ctx.createLinearGradient(0, 0, 0, H);
  gradient.addColorStop(0, '#0b2218');
  gradient.addColorStop(1, '#143324');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, W, H);

  // === COVER (jesli istnieje) ===
  let coverDrawn = false;
  if (plant.coverPhotoId) {
    try {
      const blob = await loadPhoto(plant.coverPhotoId);
      if (blob) {
        const img = await blobToImage(blob);
        // Cover na gornej polowie, z lekkim cieniem
        ctx.save();
        roundRect(ctx, 80, 80, W - 160, 540, 24);
        ctx.clip();
        // Center crop
        const ratio = Math.max((W - 160) / img.width, 540 / img.height);
        const dw = img.width * ratio;
        const dh = img.height * ratio;
        const dx = 80 + ((W - 160) - dw) / 2;
        const dy = 80 + (540 - dh) / 2;
        ctx.drawImage(img, dx, dy, dw, dh);
        ctx.restore();
        coverDrawn = true;
      }
    } catch (e) {
      // ignoruj, narysujemy emoji
    }
  }

  if (!coverDrawn) {
    // Fallback: emoji w centrum
    ctx.save();
    ctx.fillStyle = '#1c4634';
    roundRect(ctx, 80, 80, W - 160, 540, 24);
    ctx.fill();
    ctx.font = '320px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(plant.emoji || '🌿', W / 2, 80 + 270);
    ctx.restore();
  }

  // === NAZWA ROSLINY ===
  ctx.fillStyle = '#f0e5c8';
  ctx.textAlign = 'center';
  ctx.font = '600 64px serif';
  ctx.fillText(plant.name, W / 2, 720);

  // === GATUNEK (lacina) ===
  ctx.fillStyle = '#a8b5a0';
  ctx.font = 'italic 32px serif';
  ctx.fillText(plant.species, W / 2, 770);

  // === STATYSTYKI ===
  const stats = calculateStats(plant);

  const statY = 870;
  const statSpacing = W / 4;
  const startX = statSpacing / 2;

  drawStat(ctx, startX,                  statY, stats.daysInCollection, 'dni z nami');
  drawStat(ctx, startX + statSpacing,    statY, stats.journalEntries,    'wpisów');
  drawStat(ctx, startX + statSpacing * 2, statY, stats.photoCount,       'zdjęć');
  drawStat(ctx, startX + statSpacing * 3, statY, stats.tagCount,         'tagów');

  // === STOPKA ===
  ctx.fillStyle = '#7dd66f';
  ctx.font = '600 28px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('🌿 PlantCare', W / 2, 1020);

  return canvasToBlob(canvas);
}

function calculateStats(plant) {
  const daysInCollection = plant.addedAt
    ? Math.floor((Date.now() - new Date(plant.addedAt).getTime()) / (1000 * 60 * 60 * 24))
    : 0;
  return {
    daysInCollection,
    journalEntries: (plant.journal || []).length,
    photoCount: (plant.photos || []).length,
    tagCount: (plant.tags || []).length
  };
}

function drawStat(ctx, x, y, value, label) {
  ctx.fillStyle = '#7dd66f';
  ctx.font = '600 56px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(String(value), x, y);

  ctx.fillStyle = '#a8b5a0';
  ctx.font = '24px sans-serif';
  ctx.fillText(label, x, y + 38);
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function blobToImage(blob) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };
    img.src = url;
  });
}

function canvasToBlob(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Canvas to blob failed'))),
      'image/png',
      0.92
    );
  });
}

/**
 * Probuje udostepnic blob przez Web Share API.
 * Jesli nie wspierane, fallback do download.
 */
export async function shareOrDownload(blob, filename) {
  // Web Share API z plikami (mobile)
  if (navigator.canShare && navigator.share) {
    const file = new File([blob], filename, { type: 'image/png' });
    if (navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: 'Moja roślina z PlantCare' });
        return 'shared';
      } catch (e) {
        if (e.name !== 'AbortError') throw e;
        return 'cancelled';
      }
    }
  }

  // Fallback: download
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  return 'downloaded';
}
