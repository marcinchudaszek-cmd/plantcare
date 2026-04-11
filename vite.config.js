import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// Bazowy path dla GitHub Pages: /plantcare/
// Jeśli odpalasz lokalnie i to przeszkadza, ustaw VITE_BASE=/ w .env.local
const base = process.env.VITE_BASE ?? '/plantcare/';

export default defineConfig({
  base,
  publicDir: 'public',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'icons/*.png'],
      manifest: {
        name: 'PlantCare — opieka nad roślinami',
        short_name: 'PlantCare',
        description: 'Inteligentny asystent pielęgnacji roślin',
        start_url: base,
        scope: base,
        display: 'standalone',
        background_color: '#0b2218',
        theme_color: '#0b2218',
        orientation: 'portrait-primary',
        lang: 'pl',
        categories: ['lifestyle', 'utilities'],
        icons: [
          { src: 'icons/icon-72x72.png',   sizes: '72x72',   type: 'image/png' },
          { src: 'icons/icon-96x96.png',   sizes: '96x96',   type: 'image/png' },
          { src: 'icons/icon-128x128.png', sizes: '128x128', type: 'image/png' },
          { src: 'icons/icon-144x144.png', sizes: '144x144', type: 'image/png' },
          { src: 'icons/icon-152x152.png', sizes: '152x152', type: 'image/png' },
          { src: 'icons/icon-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
          { src: 'icons/icon-384x384.png', sizes: '384x384', type: 'image/png' },
          { src: 'icons/icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' }
        ]
      },
      workbox: {
        // Pomijamy zewnętrzne API w cache (Gemini, Wikimedia)
        navigateFallbackDenylist: [/^\/api/, /googleapis/, /wikimedia/],
        runtimeCaching: [
          {
            // Zdjęcia roślin z Wikimedia Commons — cache na długi czas
            urlPattern: ({ url }) =>
              url.hostname === 'commons.wikimedia.org' ||
              url.hostname === 'upload.wikimedia.org',
            handler: 'CacheFirst',
            options: {
              cacheName: 'plantcare-wikimedia-images',
              expiration: {
                maxEntries: 200,
                maxAgeSeconds: 60 * 60 * 24 * 60 // 60 dni
              },
              cacheableResponse: { statuses: [0, 200] }
            }
          },
          {
            // Zasoby aplikacji z naszego origin
            urlPattern: ({ url }) => url.origin === self.location.origin,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'plantcare-app',
              expiration: { maxEntries: 60, maxAgeSeconds: 60 * 60 * 24 * 7 }
            }
          }
        ]
      },
      devOptions: {
        // SW włączone w dev tylko jeśli sam ustawisz — w innym wypadku wkurza przy HMR
        enabled: false
      }
    })
  ],
  server: {
    port: 5173,
    open: true
  }
});
