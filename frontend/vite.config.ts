/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'уДачный сад',
        short_name: 'уДачный сад',
        description:
          'План участка и дневник декоративного сада: что где растёт и что с ним происходило.',
        lang: 'ru',
        display: 'standalone',
        start_url: '/',
        theme_color: '#2e6b34',
        background_color: '#f6f4ec',
        icons: [
          { src: '/pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/pwa-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/pwa-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        navigateFallback: '/index.html',
        // Фото из PocketBase кэшируем на месяц — журнал листается и без сети.
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/pb\.kdnfx\.space\/api\/files\//,
            handler: 'CacheFirst',
            options: {
              cacheName: 'pb-files',
              expiration: { maxEntries: 300, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
        ],
      },
    }),
  ],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
